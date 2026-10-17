import { Router, Request, Response } from "express";
import { storage } from "../supabase-storage";
import { insertWithdrawalSchema, insertOrderSchema } from "@shared/types";
import { z } from "zod";
import {
    authenticateUser,
    authenticateAdmin,
    notifyAdmins
} from "./common";
import { asyncHandler, sendSuccess, AppError } from "../middleware";

const router = Router();

// Wallet and Transactions
router.get("/wallet/:userId", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const wallet = await storage.getWallet(req.supabaseAdmin, userId);
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch wallet" });
    }
});

router.get("/transactions/:userId", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const transactions = await storage.getUserTransactions(req.supabaseAdmin, userId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
});

// Withdrawals
router.post("/withdrawals", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { amount, payment_method, payment_details } = req.body;

        if (parseFloat(amount) < 10) return res.status(400).json({ message: "Minimum withdrawal is $10" });

        const wallet = await storage.getWallet(req.supabaseAdmin, userId);
        if (!wallet || parseFloat(wallet.available_balance) < parseFloat(amount)) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const withdrawal = await storage.createWithdrawal(req.supabaseAdmin, {
            userId,
            amount,
            status: 'pending'
        });
        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Withdrawal Requested",
            message: `Your request for $${amount} has been submitted.`,
            type: "payment",
            is_read: false
        });

        res.json(withdrawal);
    } catch (error) {
        res.status(500).json({ message: "Failed to create withdrawal" });
    }
});

router.get("/withdrawals/:userId", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const withdrawals = await storage.getWithdrawals(req.supabaseAdmin, userId);
        res.json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
});

// Skill-Upgrade (Manual)
router.post("/skill-upgrades/manual", authenticateUser, async (req: any, res) => {
    try {
        const { tier, transactionCode, amount } = req.body;
        const userId = req.user.id;

        if (!tier || !transactionCode || !amount) {
            return res.status(400).json({ message: "Tier, Transaction Code, and Amount are required" });
        }

        // Validate transaction code (alphanumeric, 10-20 chars)
        const codeRegex = /^[a-zA-Z0-9]{10,20}$/;
        if (!codeRegex.test(transactionCode)) {
            return res.status(400).json({
                message: "Invalid Transaction Code format. Must be alphanumeric and 10-20 characters long."
            });
        }

        // Check for existing pending request for this user
        const { data: existing, error: checkError } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .limit(1)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ message: "You already have a pending upgrade request. Please wait for admin approval." });
        }

        const { data: sub, error } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .insert({
                user_id: userId,
                tier,
                amount,
                status: 'pending',
                payment_method: 'manual',
                transaction_code: transactionCode,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error("[PAYMENTS] Manual upgrade record creation failed:", error);
            return res.status(500).json({ message: "Failed to create upgrade request" });
        }

        try {
            await notifyAdmins(req.supabaseAdmin, "Manual Upgrade Request", `User ${req.user.name} requested ${tier} upgrade.`, "payment", { userId });
        } catch (notifErr) {
            console.error("[PAYMENTS] Admin notification failed:", notifErr);
        }

        res.json({ success: true, message: "Request submitted for review", requestId: sub.id });
    } catch (error) {
        console.error("[PAYMENTS] Manual upgrade unexpected error:", error);
        res.status(500).json({ message: "An unexpected error occurred while submitting your request" });
    }
});

// Orders
router.get("/orders/:userId", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized access to user orders" });
        }
        const orders = await storage.getUserOrders(req.supabaseAdmin, userId);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
});

// PayPal Integration (Dynamic import to avoid circular dependencies if any)
router.get("/paypal/setup", async (req, res) => {
    const { loadPaypalDefault } = await import('../paypal');
    await loadPaypalDefault(req, res);
});

router.post("/paypal/order", authenticateUser, async (req: any, res) => {
    const { createPaypalOrder } = await import('../paypal');
    // Logic to handle tier-based pricing if needed
    await createPaypalOrder(req, res);
});

router.post("/paypal/order/:orderID/capture", authenticateUser, async (req: any, res) => {
    const { capturePaypalOrder } = await import('../paypal');

    // Intercept completion to store as pending upgrade instead of immediate update
    const originalJson = res.json;
    res.json = function (data: any) {
        if (data && data.status === 'COMPLETED') {
            const tier = (req as any).body.tier || 'member';
            const amount = data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "0";

            // Record as pending in manual_subscriptions
            Promise.resolve(req.supabaseAdmin
                .from('manual_subscriptions')
                .insert({
                    user_id: req.user.id,
                    tier,
                    amount: parseFloat(amount),
                    status: 'pending',
                    payment_method: 'paypal',
                    payment_reference: req.params.orderID,
                    created_at: new Date().toISOString()
                }))
                .then(async ({ error }) => {
                    if (error) console.error("[PAYMENTS] Failed to record PayPal upgrade:", error);
                    else await notifyAdmins(req.supabaseAdmin, "PayPal Upgrade Request", `User ${req.user.name} paid for ${tier} upgrade via PayPal.`, "payment", { userId: req.user.id });
                })
                .catch(console.error);
        }
        return originalJson.call(this, data);
    };

    await capturePaypalOrder(req, res);
});

// Payment Methods
router.post("/methods", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { email, type, isPrimary } = req.body;

        const method = await storage.createPaymentMethod(req.supabaseAdmin, {
            userId,
            email,
            type: type || 'paypal',
            isPrimary: isPrimary || false
        });

        res.json(method);
    } catch (error) {
        res.status(500).json({ message: "Failed to add payment method" });
    }
});

router.get("/user/:userId/methods", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const methods = await storage.getUserPaymentMethods(req.supabaseAdmin, userId);
        res.json(methods);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payment methods" });
    }
});

router.delete("/methods/:id", authenticateUser, async (req: any, res) => {
    try {
        const { data: method } = await req.supabaseAdmin
            .from('payment_methods')
            .select('user_id')
            .eq('id', req.params.id)
            .maybeSingle();

        if (!method) {
            return res.status(404).json({ message: "Payment method not found" });
        }

        if (req.user.id !== method.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to delete this payment method" });
        }

        const success = await storage.deletePaymentMethod(req.supabaseAdmin, req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete payment method" });
    }
});

router.patch("/user/:userId/methods/:methodId/set-primary", authenticateUser, async (req: any, res) => {
    try {
        const { userId, methodId } = req.params;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const success = await storage.setPrimaryPaymentMethod(req.supabaseAdmin, userId, methodId);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ message: "Failed to set primary payment method" });
    }
});

export default router;
