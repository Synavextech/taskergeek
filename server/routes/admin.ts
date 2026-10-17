import { Router, Request, Response } from "express";
import { storage } from "../supabase-storage";
import { insertTaskSchema, User } from "@shared/types";
import { z } from "zod";
import {
    authenticateAdmin,
    notifyAdmins,
    issueSessionCookie
} from "./common";
import { asyncHandler, sendSuccess, AppError } from "../middleware";

const router = Router();

// Apply authenticateAdmin to all routes in this router
router.use(authenticateAdmin);

// Admin seeding endpoint for testing (can be removed in production)
router.post("/seed", asyncHandler(async (req: any, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
    }

    try {
        const { data: { users }, error: listError } = await req.supabaseAdmin.auth.admin.listUsers();
        if (listError) throw new AppError("Failed to access user list", 500, "AUTH_LIST_FAILED");

        const existingAdmin = users?.find((user: any) => user.email === 'support01@protaskergeek.com');
        let authUser = existingAdmin;

        if (!existingAdmin) {
            const { data, error } = await req.supabaseAdmin.auth.admin.createUser({
                email: 'support01@protaskergeek.com',
                password: 'Menjo93458s.',
                user_metadata: { role: 'admin' },
                email_confirm: true
            });
            if (!error && data.user) authUser = data.user;
        }

        if (authUser) {
            await req.supabaseAdmin
                .from('users')
                .upsert({
                    id: authUser.id,
                    name: 'ProtaskerGeek Administrator',
                    email: 'support01@protaskergeek.com',
                    role: 'admin',
                    approval_status: 'approved',
                    skill_upgrade_tier: 'vip',
                    skill_upgrade_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    orientation_complete: true,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
        }

        sendSuccess(res, { message: "Admin user seeded successfully" });
    } catch (error) {
        throw error;
    }
}));

// User Management
router.get("/users", async (req: any, res) => {
    try {
        const users = await storage.getAllUsers(req.supabaseAdmin);
        console.log(`[ADMIN] Fetched ${users.length} users`);
        res.json(users);
    } catch (error) {
        console.error("[ADMIN] Failed to fetch users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

router.patch("/users/:id/approve", async (req: any, res) => {
    try {
        const userId = req.params.id;
        console.log(`[ADMIN] User approval request for: "${userId}" (type: ${typeof userId})`);

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        console.log(`[ADMIN] Calling storage.getUser for ${userId}...`);
        const currentUser = await storage.getUser(req.supabaseAdmin, userId);

        if (!currentUser) {
            console.warn(`[ADMIN] User ${userId} not found during approval attempt. Current storage status: ${!!storage}`);
            return res.status(404).json({ message: "User not found in database" });
        }

        console.log(`[ADMIN] Approving user: ${currentUser.email} (Current status: ${currentUser.approval_status})`);

        const updates: Partial<User> = {
            approval_status: 'approved',
            updated_at: new Date().toISOString()
        };

        // Default to member tier if not set
        if (!currentUser.skill_upgrade_tier) {
            updates.skill_upgrade_tier = 'member';
        }

        const user = await storage.updateUser(req.supabaseAdmin, userId, updates);

        if (!user) {
            throw new Error("Failed to update user status");
        }

        // Ensure wallet exists
        let wallet = await storage.getWallet(req.supabaseAdmin, userId);
        if (!wallet) {
            console.log(`[ADMIN] Creating wallet for newly approved user: ${userId}`);
            wallet = await storage.createWallet(req.supabaseAdmin, userId);
        }

        // Send notification
        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Account Approved",
            message: "Your account has been approved! You have been granted Member access.",
            type: "system",
            is_read: false
        });

        console.log(`[ADMIN] User ${currentUser.email} approved successfully`);

        // Trigger welcome email
        try {
            const { emailService } = await import("../email");
            await emailService.sendWelcomeEmail(currentUser.email, currentUser.name);
        } catch (emailError) {
            console.error("[ADMIN] Failed to trigger welcome email:", emailError);
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Approval error:", error);
        res.status(500).json({
            message: "Error approving user",
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

router.patch("/users/:id/reject", async (req: any, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;
        console.log(`[ADMIN] Rejecting user: ${userId}, reason: ${reason}`);

        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            approval_status: 'rejected',
            updated_at: new Date().toISOString()
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Account Rejected",
            message: reason || "Your account application was rejected.",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Rejection error:", error);
        res.status(500).json({ message: "Failed to reject user" });
    }
});

router.patch("/users/:id/suspend", async (req: any, res) => {
    try {
        const userId = req.params.id;
        const { duration_days, reason, is_suspended } = req.body;
        console.log(`[ADMIN] Suspension update for ${userId}: suspended=${is_suspended}`);

        // If explicitly passing is_suspended: false, we just unsuspend
        if (is_suspended === false) {
            const user = await storage.updateUser(req.supabaseAdmin, userId, {
                is_suspended: false,
                suspension_end_date: null,
                updated_at: new Date().toISOString()
            });

            if (!user) return res.status(404).json({ message: "User not found" });

            await storage.createNotification(req.supabaseAdmin, {
                user_id: userId,
                title: "Account Restored",
                message: "Your account suspension has been lifted by an administrator.",
                type: "system",
                is_read: false
            });
            return res.json({ success: true, user });
        }

        // Otherwise handle suspension
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (duration_days || 7));

        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            is_suspended: true,
            suspension_end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Account Suspended",
            message: `Your account has been suspended for ${duration_days || 7} days. Reason: ${reason || 'Violation of terms'}`,
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Suspension error:", error);
        res.status(500).json({ message: "Failed to suspend user" });
    }
});

router.patch("/users/:id/profile", async (req: any, res) => {
    try {
        const userId = req.params.id;
        console.log(`[ADMIN] Updating profile for user: ${userId}`);
        const user = await storage.updateUser(req.supabaseAdmin, userId, req.body);

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Profile update error:", error);
        res.status(500).json({ message: "Failed to update user profile" });
    }
});

router.post("/users/:id/verify-identity", async (req: any, res) => {
    try {
        const userId = req.params.id;
        console.log(`[ADMIN] Requesting identity verification for: ${userId}`);
        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            verification_status: 'requested',
            pending_verification: true,
            updated_at: new Date().toISOString()
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Identity Verification Requested",
            message: "Admin has requested identity verification. Please upload your documents.",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Identity verification error:", error);
        res.status(500).json({ message: "Failed to request verification" });
    }
});

router.patch("/users/:id/deactivate", async (req: any, res) => {
    try {
        const userId = req.params.id;
        console.log(`[ADMIN] Deactivating user: ${userId}`);
        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            is_active: false,
            updated_at: new Date().toISOString()
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Account Deactivated",
            message: "Your account has been deactivated by an administrator.",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Deactivation error:", error);
        res.status(500).json({ message: "Failed to deactivate user" });
    }
});

// Identity Verification Management
router.get("/verifications/pending", async (req: any, res) => {
    try {
        const users = await storage.getPendingVerifications(req.supabaseAdmin);
        res.json(users || []);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch pending verifications" });
    }
});

router.patch("/users/:id/verify-approve", async (req: any, res) => {
    try {
        const userId = req.params.id;
        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            verification_status: 'verified',
            pending_verification: false,
            updated_at: new Date().toISOString()
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Identity Verified",
            message: "Your identity verification has been approved. Thank you!",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: "Failed to approve verification" });
    }
});

router.patch("/users/:id/verify-reject", async (req: any, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;

        const user = await storage.updateUser(req.supabaseAdmin, userId, {
            verification_status: 'rejected',
            pending_verification: true, // Keep true so they see the upload card again
            updated_at: new Date().toISOString()
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Identity Verification Rejected",
            message: reason || "Your identity documents were rejected. Please re-upload clear photos.",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: "Failed to reject verification" });
    }
});

// Task Management
router.post("/tasks", async (req: any, res) => {
    try {
        const data = insertTaskSchema.parse(req.body);
        const task = await storage.createTask(req.supabaseAdmin, data);
        res.json(task);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
            });
        }
        console.error("Task creation error:", error);
        res.status(400).json({ success: false, message: "Invalid task data" });
    }
});

// Admin Storage Proxy - Bypasses RLS using service role
router.get("/storage/signed-url", async (req: any, res) => {
    try {
        const { bucket, path, expiresId = 60 } = req.query;

        if (!bucket || !path) {
            return res.status(400).json({ success: false, message: "Missing bucket or path" });
        }

        const { data, error } = await req.supabaseAdmin.storage
            .from(bucket as string)
            .createSignedUrl(path as string, parseInt(expiresId as string));

        if (error) {
            console.error("Signed URL generation error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        res.json({ success: true, signedUrl: data.signedUrl });
    } catch (error) {
        console.error("Signed URL unexpected error:", error);
        res.status(500).json({ success: false, message: "Internal signed URL error" });
    }
});

router.post("/storage/upload", async (req: any, res) => {
    try {
        const { file, name, bucket, contentType } = req.body;

        if (!file || !name || !bucket) {
            return res.status(400).json({ success: false, message: "Missing file data, name, or bucket" });
        }

        // Convert base64 to Buffer
        const buffer = Buffer.from(file, 'base64');

        // Upload using admin client (service role)
        const { data, error } = await req.supabaseAdmin.storage
            .from(bucket)
            .upload(name, buffer, {
                contentType: contentType || 'application/octet-stream',
                upsert: true
            });

        if (error) {
            console.error("Storage proxy upload error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        // Get public URL
        const { data: { publicUrl } } = req.supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(name);

        res.json({ success: true, url: publicUrl, path: data.path });
    } catch (error) {
        console.error("Storage proxy unexpected error:", error);
        res.status(500).json({ success: false, message: "Internal storage error" });
    }
});

router.get("/tasks", async (req: any, res) => {
    try {
        const { data } = await req.supabaseAdmin.from('tasks').select('*').order('created_at', { ascending: false });
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
});

router.patch("/tasks/:id", async (req: any, res) => {
    try {
        const task = await storage.updateTask(req.supabaseAdmin, req.params.id, req.body);
        res.json(task);
    } catch (error) {
        res.status(400).json({ message: "Failed to update task" });
    }
});

router.delete("/tasks/:id", async (req: any, res) => {
    try {
        await storage.deleteTask(req.supabaseAdmin, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ message: "Failed to delete task" });
    }
});

// User Task Review
router.get("/user-tasks/pending", async (req: any, res) => {
    try {
        const { data } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*), user:users(*)')
            .in('status', ['submitted', 'pending'])
            .order('created_at', { ascending: false });
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
});

router.patch("/user-tasks/:id/approve", async (req: any, res) => {
    try {
        const userTaskId = req.params.id;
        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select(`*, task:tasks(*)`)
            .eq('id', userTaskId)
            .single();

        if (!userTask) return res.status(404).json({ message: "User task not found" });

        const isBidApproval = userTask.status === 'pending';

        if (isBidApproval) {
            // If it's a bid, move it to 'claimed' (Active) status
            await req.supabaseAdmin
                .from('user_tasks')
                .update({
                    status: 'claimed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', userTaskId);

            await storage.createNotification(req.supabaseAdmin, {
                user_id: userTask.user_id,
                title: "Bid Accepted",
                message: `Your bid for "${userTask.task.title}" has been accepted! The task is now active in your dashboard. Please complete it and submit proof of work.`,
                type: "task",
                is_read: false
            });

            return res.json({ success: true, message: "Bid accepted and task assigned" });
        }

        // Standard submission approval logic
        const { error: updateError } = await req.supabaseAdmin
            .from('user_tasks')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', userTaskId);

        if (updateError) {
            console.error("[ADMIN] Failed to update user task:", updateError);
            throw updateError;
        }

        // Update wallet
        const wallet = await storage.getWallet(req.supabaseAdmin, userTask.user_id);
        if (wallet) {
            const reward = parseFloat(userTask.task.reward);
            const newPending = (parseFloat(wallet.pending_balance) - reward).toFixed(2);
            const newAvailable = (parseFloat(wallet.available_balance) + reward).toFixed(2);
            const newTotal = (parseFloat(wallet.total_earnings) + reward).toFixed(2);

            await storage.updateWallet(req.supabaseAdmin, userTask.user_id, {
                pending_balance: newPending,
                available_balance: newAvailable,
                total_earnings: newTotal
            });

            // Create transaction record
            try {
                await req.supabaseAdmin.from('transactions').insert({
                    user_id: userTask.user_id,
                    amount: reward.toFixed(2),
                    type: 'earning',
                    status: 'completed',
                    description: `Reward for task: ${userTask.task.title}`,
                    created_at: new Date().toISOString()
                });

                await storage.createNotification(req.supabaseAdmin, {
                    user_id: userTask.user_id,
                    title: "Task Approved",
                    message: `Your submission for "${userTask.task.title}" has been approved. $${userTask.task.reward} added to your wallet.`,
                    type: "payment",
                    is_read: false
                });
            } catch (txError) {
                console.error("[ADMIN] Failed to create transaction or notification:", txError);
            }
        }

        res.json({ success: true, message: "Task approved and payment processed" });
    } catch (error) {
        res.status(500).json({ message: "Failed to approve task" });
    }
});

router.patch("/user-tasks/:id/reject", async (req: any, res) => {
    try {
        const { reason } = req.body;
        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*)')
            .eq('id', req.params.id)
            .single();

        if (!userTask) return res.status(404).json({ message: "User task not found" });

        const { error: updateError } = await req.supabaseAdmin
            .from('user_tasks')
            .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
            .eq('id', req.params.id);

        if (updateError) {
            console.error("[ADMIN] Failed to reject user task:", updateError);
            throw updateError;
        }

        // Deduct from pending balance
        const wallet = await storage.getWallet(req.supabaseAdmin, userTask.user_id);
        if (wallet) {
            const reward = parseFloat(userTask.task.reward);
            const newPending = Math.max(0, parseFloat(wallet.pending_balance) - reward).toFixed(2);
            await storage.updateWallet(req.supabaseAdmin, userTask.user_id, { pending_balance: newPending });
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userTask.user_id,
            title: "Task Rejected",
            message: `Your submission for "${userTask.task.title}" was rejected. Reason: ${reason || 'No reason provided'}`,
            type: "task",
            is_read: false
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to reject task" });
    }
});

router.patch("/user-tasks/:id/revise", async (req: any, res) => {
    try {
        const { reason, feedback_attachments } = req.body;
        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*)')
            .eq('id', req.params.id)
            .single();

        if (!userTask) return res.status(404).json({ message: "User task not found" });

        const { error: updateError } = await req.supabaseAdmin
            .from('user_tasks')
            .update({
                status: 'revision_requested',
                rejection_reason: reason,
                feedback_attachments: feedback_attachments || [],
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id);

        if (updateError) {
            console.error("[ADMIN] Failed to request revision:", updateError);
            throw updateError;
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userTask.user_id,
            title: "Revision Requested",
            message: `Revision requested for "${userTask.task.title}". Please check feedback.`,
            type: "task",
            is_read: false
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to request revision" });
    }
});

// Withdrawal Management
router.get("/withdrawals", async (req: any, res) => {
    try {
        const { data } = await req.supabaseAdmin
            .from('withdrawals')
            .select('*, user:users(*)')
            .order('created_at', { ascending: false });
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
});

router.patch("/withdrawals/:id", async (req: any, res) => {
    try {
        const { status, adminNotes } = req.body;
        const { data: withdrawal } = await req.supabaseAdmin
            .from('withdrawals')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });

        const updateData: any = { status };
        if (adminNotes) updateData.admin_notes = adminNotes;
        if (status === 'completed') updateData.processed_at = new Date().toISOString();

        const { error: updateError } = await req.supabaseAdmin
            .from('withdrawals')
            .update(updateData)
            .eq('id', req.params.id);

        if (updateError) {
            console.error("[ADMIN] Failed to update withdrawal record:", updateError);
            throw updateError;
        }

        if (status === 'completed') {
            const wallet = await storage.getWallet(req.supabaseAdmin, withdrawal.user_id);
            if (wallet) {
                const amount = parseFloat(withdrawal.amount);
                const newAvailable = Math.max(0, parseFloat(wallet.available_balance) - amount).toFixed(2);
                const newWithdrawn = (parseFloat(wallet.total_withdrawn) + amount).toFixed(2);
                await storage.updateWallet(req.supabaseAdmin, withdrawal.user_id, {
                    available_balance: newAvailable,
                    total_withdrawn: newWithdrawn
                });

                await req.supabaseAdmin.from('transactions').insert({
                    user_id: withdrawal.user_id,
                    amount: amount.toFixed(2),
                    type: 'withdrawal',
                    status: 'completed',
                    description: `Withdrawal processed`,
                    created_at: new Date().toISOString()
                });
            }
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: withdrawal.user_id,
            title: `Withdrawal ${status.toUpperCase()}`,
            message: adminNotes || `Your withdrawal request for $${withdrawal.amount} has been ${status}.`,
            type: "payment",
            is_read: false
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to update withdrawal" });
    }
});

router.patch("/withdrawals/:id/payment-details", async (req: any, res) => {
    try {
        const { payment_details } = req.body;
        const { error } = await req.supabaseAdmin
            .from('withdrawals')
            .update({ admin_notes: payment_details })
            .eq('id', req.params.id);

        if (error) {
            console.error("[ADMIN] Failed to update payment details:", error);
            throw error;
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to update payment details" });
    }
});

// Skill Upgrade Management
router.post("/tasks/:id/recommend", authenticateAdmin, async (req: any, res) => {
    try {
        const taskId = req.params.id;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // 1. Get task details
        const { data: task, error: taskError } = await req.supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (taskError || !task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // 2. Create notification
        const { data: notification, error: notifError } = await req.supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title: "Job Recommendation",
                message: `Admin has recommended a task for you: ${task.title}. Reward: $${task.reward}`,
                type: "task_recommendation",
                data: { taskId }
            });

        if (notifError) {
            console.error("Failed to create recommendation notification:", notifError);
            return res.status(500).json({ success: false, message: "Failed to send recommendation" });
        }

        res.json({ success: true, message: "Task recommended successfully" });
    } catch (error) {
        console.error("Task recommendation error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.get("/skill-upgrades/pending", authenticateAdmin, async (req: any, res) => {
    try {
        const { data, error } = await req.supabaseAdmin
            .from("manual_subscriptions")
            .select(`
                *,
                user:users(*)
            `)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Fetch pending upgrades error:", error);
        res.status(500).json({ message: "Failed to fetch pending upgrades" });
    }
});

router.patch("/skill-upgrades/:id/approve", async (req: any, res) => {
    try {
        const requestId = req.params.id;
        console.log(`[ADMIN] Approving skill upgrade request: ${requestId}`);

        const { data: sub, error: fetchError } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !sub) {
            console.warn(`[ADMIN] Skill upgrade request ${requestId} not found:`, fetchError);
            return res.status(404).json({ message: "Request not found" });
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        // Create active subscription record (this also updates the users table)
        await storage.createSubscription(req.supabaseAdmin, {
            userId: sub.user_id,
            tier: sub.tier,
            amount: sub.amount,
            paymentMethod: sub.payment_method || 'manual',
            paymentReference: sub.payment_reference || `MANUAL_${requestId}`,
            isActive: true,
            expiresAt: expiryDate.toISOString()
        });

        // Mark request as approved ONLY if createSubscription succeeded
        const { error: updateError } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (updateError) {
            console.error("[ADMIN] Failed to update manual subscription:", updateError);
            throw updateError;
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: sub.user_id,
            title: "Upgrade Approved",
            message: `Your ${sub.tier} skill upgrade has been approved. Congratulations!`,
            type: "system",
            is_read: false
        });

        console.log(`[ADMIN] Skill upgrade request ${requestId} approved successfully`);
        res.json({ success: true });
    } catch (error) {
        console.error("[ADMIN] Upgrade approval error:", error);
        res.status(500).json({ message: "Failed to approve upgrade" });
    }
});

router.patch("/skill-upgrades/:id/reject", async (req: any, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;
        console.log(`[ADMIN] Rejecting skill upgrade request: ${requestId}, reason: ${reason}`);

        const { data: sub, error: fetchError } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !sub) {
            console.warn(`[ADMIN] Skill upgrade request ${requestId} not found:`, fetchError);
            return res.status(404).json({ message: "Request not found" });
        }

        const { error: updateError } = await req.supabaseAdmin
            .from('manual_subscriptions')
            .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (updateError) {
            console.error("[ADMIN] Failed to reject manual subscription:", updateError);
            throw updateError;
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: sub.user_id,
            title: "Upgrade Rejected",
            message: reason || "Your skill upgrade request was rejected.",
            type: "system",
            is_read: false
        });

        console.log(`[ADMIN] Skill upgrade request ${requestId} rejected successfully`);
        res.json({ success: true });
    } catch (error) {
        console.error("[ADMIN] Upgrade rejection error:", error);
        res.status(500).json({ message: "Failed to reject upgrade" });
    }
});

// Stats & Dashboard
router.get("/stats", async (req: any, res) => {
    try {
        // Get aggregate stats
        const { data: users } = await req.supabaseAdmin.from('users').select('id', { count: 'exact' });
        const { data: tasks } = await req.supabaseAdmin.from('tasks').select('id', { count: 'exact' });
        const { data: userTasks } = await req.supabaseAdmin.from('user_tasks').select('id', { count: 'exact' });
        const { data: wallets } = await req.supabaseAdmin.from('wallets').select('total_earnings');

        const totalEarnings = (wallets || []).reduce((sum: number, w: any) => sum + parseFloat(w.total_earnings), 0);

        const activity = await storage.getRecentActivity(req.supabaseAdmin);

        res.json({
            totalUsers: users?.length || 0,
            activeTasks: tasks?.length || 0,
            completedTasks: userTasks?.length || 0,
            totalEarnings: totalEarnings.toFixed(2),
            recentActivity: activity
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

// Settings
router.get("/settings", async (req: any, res) => {
    try {
        const settings = await storage.getSystemSettings(req.supabaseAdmin);
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch settings" });
    }
});

router.post("/settings", async (req: any, res) => {
    try {
        const settings = await storage.updateSystemSettings(req.supabaseAdmin, req.body);
        res.json({ success: true, settings });
    } catch (error) {
        console.error("Failed to update settings:", error);
        res.status(500).json({ message: "Failed to update settings" });
    }
});

export default router;
