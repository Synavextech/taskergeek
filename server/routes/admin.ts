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
import { emailService } from "../email";

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

router.patch("/users/:id/verify-phone", async (req: any, res) => {
    try {
        const userId = req.params.id;
        const { verified, phone } = req.body;
        const isVerified = verified !== undefined ? Boolean(verified) : true;

        const updateData: any = {
            phone_verified: isVerified,
            updated_at: new Date().toISOString()
        };
        if (phone && typeof phone === 'string') {
            updateData.phone = phone.trim();
        }
        if (isVerified) {
            updateData.phone_verification_code = null;
            updateData.phone_verification_expiry = null;
        }

        const user = await storage.updateUser(req.supabaseAdmin, userId, updateData);
        if (!user) return res.status(404).json({ message: "User not found" });

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: isVerified ? "Phone Number Verified" : "Phone Verification Revoked",
            message: isVerified
                ? "Your phone number has been verified by platform administrators."
                : "Your phone number verification status has been reset by administrators.",
            type: "system",
            is_read: false
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error("[ADMIN] Phone verification toggle error:", error);
        res.status(500).json({ message: "Failed to update phone verification status" });
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
        const body = req.body;
        const updates: any = {};

        if (body.title !== undefined) updates.title = body.title;
        if (body.description !== undefined) updates.description = body.description;
        if (body.category !== undefined) updates.category = body.category;
        if (body.taskType !== undefined) updates.task_type = body.taskType;
        if (body.task_type !== undefined) updates.task_type = body.task_type;
        if (body.url !== undefined) updates.url = body.url ? body.url.trim() : null;
        if (body.reward !== undefined) updates.reward = String(body.reward);
        if (body.hourlyRate !== undefined) updates.hourly_rate = parseFloat(body.hourlyRate) || 0;
        if (body.hourly_rate !== undefined) updates.hourly_rate = parseFloat(body.hourly_rate) || 0;
        if (body.minTier !== undefined) updates.min_tier = body.minTier;
        if (body.min_tier !== undefined) updates.min_tier = body.min_tier;
        if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);
        if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
        if (body.isOrientation !== undefined) updates.is_orientation = Boolean(body.isOrientation);
        if (body.is_orientation !== undefined) updates.is_orientation = Boolean(body.is_orientation);
        if (body.attachments !== undefined) updates.attachments = body.attachments;
        if (body.instructions !== undefined) updates.instructions = body.instructions;
        if (body.maxParticipants !== undefined) updates.max_participants = parseInt(body.maxParticipants, 10) || 1;
        if (body.max_participants !== undefined) updates.max_participants = parseInt(body.max_participants, 10) || 1;
        if (body.estimatedDurationMinutes !== undefined) updates.estimated_duration_minutes = parseInt(body.estimatedDurationMinutes, 10) || 30;
        if (body.estimated_duration_minutes !== undefined) updates.estimated_duration_minutes = parseInt(body.estimated_duration_minutes, 10) || 30;
        if (body.projectStructure !== undefined) updates.project_structure = body.projectStructure;
        if (body.project_structure !== undefined) updates.project_structure = body.project_structure;

        // If max_participants is increased beyond current_participants, reactivate project
        if (typeof updates.max_participants === 'number') {
            const { data: existing } = await req.supabaseAdmin.from('tasks').select('current_participants').eq('id', req.params.id).single();
            if (existing && updates.max_participants > (existing.current_participants || 0)) {
                updates.is_active = true;
            }
        }
        const task = await storage.updateTask(req.supabaseAdmin, req.params.id, updates);
        if (!task) {
            return res.status(404).json({ message: "Task not found or update failed" });
        }
        res.json(task);
    } catch (error) {
        console.error("Task update error:", error);
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
        const { quality_rating } = req.body;
        const qualityScore = typeof quality_rating === 'number' ? Math.max(0, Math.min(5, quality_rating)) : 5.0;

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

        // Determine reward: fixed reward for standard tasks vs working-time hourly earnings for project tasks
        let reward = parseFloat(userTask.task.reward || 0);
        if (userTask.task?.task_type === 'project') {
            const rate = parseFloat(userTask.hourly_rate || userTask.task.hourly_rate || 0);
            const seconds = userTask.time_spent_seconds || 0;
            if (rate > 0 && seconds > 0) {
                reward = parseFloat(((seconds / 3600) * rate).toFixed(2));
            }
        }

        // Standard submission approval logic
        const { error: updateError } = await req.supabaseAdmin
            .from('user_tasks')
            .update({
                status: 'approved',
                quality_rating: qualityScore,
                accrued_earnings: reward,
                updated_at: new Date().toISOString()
            })
            .eq('id', userTaskId);

        if (updateError) {
            console.error("[ADMIN] Failed to update user task:", updateError);
            throw updateError;
        }

        // Update user stats (completion rate & quality rating)
        await storage.updateUserStats(req.supabaseAdmin, userTask.user_id);

        // Update wallet
        const wallet = await storage.getWallet(req.supabaseAdmin, userTask.user_id);
        if (wallet) {
            const newPending = Math.max(0, parseFloat(wallet.pending_balance) - reward).toFixed(2);
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
                    description: `Reward for ${userTask.task.task_type === 'project' ? 'project' : 'task'}: ${userTask.task.title}`,
                    created_at: new Date().toISOString()
                });

                await storage.createNotification(req.supabaseAdmin, {
                    user_id: userTask.user_id,
                    title: "Task Approved",
                    message: `Your submission for "${userTask.task.title}" has been approved with a ${qualityScore}/5 quality rating. $${reward.toFixed(2)} added to your wallet.`,
                    type: "payment",
                    is_read: false
                });

                // Send email notification to user
                const userObj = userTask.user || (await storage.getUser(req.supabaseAdmin, userTask.user_id));
                if (userObj?.email) {
                    emailService.sendTaskApprovedEmail(
                        userObj.email,
                        userObj.name || "Tasker",
                        userTask.task?.title || "Task",
                        reward,
                        qualityScore,
                        newAvailable
                    ).catch(emailErr => console.error("[ADMIN] Failed to send task approval email:", emailErr));
                }
            } catch (txError) {
                console.error("[ADMIN] Failed to create transaction or notification:", txError);
            }
        }

        res.json({ success: true, message: `Task approved (${qualityScore}/5 stars) and payment processed` });
    } catch (error) {
        console.error("Task approval error:", error);
        res.status(500).json({ message: "Failed to approve task" });
    }
});

router.patch("/user-tasks/:id/reject", async (req: any, res) => {
    try {
        const { reason, quality_rating } = req.body;
        const qualityScore = typeof quality_rating === 'number' ? Math.max(0, Math.min(5, quality_rating)) : 0;

        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*)')
            .eq('id', req.params.id)
            .single();

        if (!userTask) return res.status(404).json({ message: "User task not found" });

        const { error: updateError } = await req.supabaseAdmin
            .from('user_tasks')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                quality_rating: qualityScore,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id);

        if (updateError) {
            console.error("[ADMIN] Failed to reject user task:", updateError);
            throw updateError;
        }

        // Recalculate user stats (completion rate drops, quality rating updates)
        await storage.updateUserStats(req.supabaseAdmin, userTask.user_id);

        // Deduct from pending balance
        const wallet = await storage.getWallet(req.supabaseAdmin, userTask.user_id);
        if (wallet) {
            const reward = parseFloat(userTask.task.reward || 0);
            const newPending = Math.max(0, parseFloat(wallet.pending_balance) - reward).toFixed(2);
            await storage.updateWallet(req.supabaseAdmin, userTask.user_id, { pending_balance: newPending });
        }

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userTask.user_id,
            title: "Task Rejected",
            message: `Your submission for "${userTask.task.title}" was rejected (Quality: ${qualityScore}/5). Reason: ${reason || 'No reason provided'}`,
            type: "task",
            is_read: false
        });

        // Send task rejection email to user
        const targetUser = userTask.user || (await storage.getUser(req.supabaseAdmin, userTask.user_id));
        if (targetUser?.email) {
            emailService.sendTaskRejectedEmail(
                targetUser.email,
                targetUser.name || "Tasker",
                userTask.task?.title || "Task",
                reason || "Submission did not meet quality benchmarks",
                qualityScore
            ).catch(emailErr => console.error("[ADMIN] Failed to send task rejection email:", emailErr));
        }

        res.json({ success: true, message: "Task rejected and ratings updated" });
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

        // Send email notification for withdrawal status
        const withdrawalUser = await storage.getUser(req.supabaseAdmin, withdrawal.user_id);
        if (withdrawalUser?.email) {
            emailService.sendWithdrawalStatusEmail(
                withdrawalUser.email,
                withdrawalUser.name || "Tasker",
                withdrawal.amount,
                status,
                adminNotes
            ).catch(emailErr => console.error("[ADMIN] Failed to send withdrawal status email:", emailErr));
        }

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

        if (data && data.length > 0) {
            const userIds = [...new Set(data.map((s: any) => s.user_id))];
            const { data: assessments } = await req.supabaseAdmin
                .from('assessment_submissions')
                .select('*')
                .in('user_id', userIds)
                .order('created_at', { ascending: false });

            const enriched = data.map((sub: any) => {
                const userAssessments = assessments?.filter((a: any) => a.user_id === sub.user_id) || [];
                return {
                    ...sub,
                    payment_reference: sub.payment_reference || sub.transaction_code,
                    assessments: userAssessments
                };
            });
            return res.json(enriched);
        }

        res.json(data || []);
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
            paymentReference: sub.payment_reference || sub.transaction_code || `MANUAL_${requestId}`,
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

        // Award Referral Commission if subscriber was referred by another user
        try {
            const subscriber = await storage.getUser(req.supabaseAdmin, sub.user_id);
            if (subscriber && subscriber.referred_by) {
                const { data: referrer, error: refError } = await req.supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('referral_code', subscriber.referred_by)
                    .single();

                if (referrer && !refError) {
                    const bonusAmount = (parseFloat(String(sub.amount || '0')) * 0.10).toFixed(2);
                    if (parseFloat(bonusAmount) > 0) {
                        const referrerWallet = await storage.getWallet(req.supabaseAdmin, referrer.id);
                        if (referrerWallet) {
                            const newBalance = (parseFloat(String(referrerWallet.available_balance || '0')) + parseFloat(bonusAmount)).toFixed(2);
                            const newEarnings = (parseFloat(String(referrerWallet.total_earnings || '0')) + parseFloat(bonusAmount)).toFixed(2);

                            await storage.updateWallet(req.supabaseAdmin, referrer.id, {
                                available_balance: newBalance,
                                total_earnings: newEarnings
                            });

                            await storage.createTransaction(req.supabaseAdmin, {
                                user_id: referrer.id,
                                type: 'referral',
                                amount: bonusAmount,
                                status: 'completed',
                                description: `Referral bonus for user ${subscriber.name || subscriber.email}`,
                                metadata: {
                                    referred_user_id: subscriber.id,
                                    subscription_id: sub.id,
                                    payment_method: sub.payment_method || 'manual'
                                }
                            });

                            await storage.createNotification(req.supabaseAdmin, {
                                user_id: referrer.id,
                                title: 'Referral Bonus Earned!',
                                message: `You earned $${bonusAmount} because your referral ${subscriber.name || subscriber.email} upgraded their skill tier!`,
                                type: 'referral',
                                is_read: false,
                                metadata: {
                                    bonusAmount,
                                    referredUserId: subscriber.id
                                }
                            });
                            console.log(`[ADMIN] Referral bonus of $${bonusAmount} processed for referrer ${referrer.id}`);
                        }
                    }
                }
            }
        } catch (refBonusErr) {
            console.error("[ADMIN] Error awarding referral bonus on manual upgrade:", refBonusErr);
        }

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
