import { Router, Request, Response } from "express";
import { storage } from "../supabase-storage";
import { insertTaskSchema, insertUserTaskSchema, taskCategoryEnum } from "@shared/types";
import { z } from "zod";
import {
    authenticateUser,
    authenticateAdmin,
    notifyAdmins,
    issueSessionCookie
} from "./common";
import { asyncHandler, sendSuccess, AppError } from "../middleware";
import { getTierLimits } from "../utils";

const router = Router();

// Get tasks route with proper authentication and orientation support
router.get("/", authenticateUser, async (req: any, res) => {
    try {
        const { category, minTier, type, includeLocked } = req.query;
        const user = req.user;

        // Handle orientation tasks
        if (type === 'orientation' || req.query.is_orientation === 'true') {
            const { data: dbOrientationTasks } = await req.supabaseAdmin
                .from('tasks')
                .select('*')
                .eq('is_orientation', true)
                .eq('is_active', true);

            if (dbOrientationTasks && dbOrientationTasks.length > 0) {
                let tasks = dbOrientationTasks;

                if (category) {
                    tasks = tasks.filter((t: any) => t.category === category);
                    if (tasks.length > 2) {
                        tasks = tasks.sort(() => 0.5 - Math.random()).slice(0, 2);
                    }
                } else {
                    const categories = taskCategoryEnum;
                    let selectedTasks: any[] = [];

                    categories.forEach(cat => {
                        const catTasks = tasks.filter((t: any) => t.category === cat);
                        if (catTasks.length > 0) {
                            const randomTasks = catTasks.sort(() => 0.5 - Math.random()).slice(0, 2);
                            selectedTasks = [...selectedTasks, ...randomTasks];
                        }
                    });
                    tasks = selectedTasks;
                }
                return res.json(tasks);
            }
            return res.status(404).json({ message: 'Orientation tasks not found' });
        }

        // Handle regular tasks
        if (!user.orientation_complete) {
            return res.status(403).json({ message: "Complete orientation first to access regular tasks" });
        }

        if (user.approval_status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ message: "Account approval required to access tasks" });
        }

        const { data: tasks } = await req.supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('is_active', true)
            .eq('is_orientation', false);

        let filteredTasks = tasks || [];

        const { data: userHistory } = await req.supabaseAdmin
            .from('user_tasks')
            .select('task_id, status')
            .eq('user_id', user.id);

        const excludeTaskIds = new Set(
            userHistory?.filter((ut: any) =>
                ['approved', 'completed', 'claimed', 'submitted', 'pending', 'revision_requested'].includes(ut.status)
            ).map((ut: any) => ut.task_id) || []
        );

        filteredTasks = filteredTasks.filter((t: any) => !excludeTaskIds.has(t.id));

        if (category) {
            filteredTasks = filteredTasks.filter((t: any) => t.category === category);
        }

        const tierHierarchy = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium'];
        const userTierIndex = tierHierarchy.indexOf(user.skill_upgrade_tier || 'member');

        const { data: userStats } = await req.supabaseAdmin
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

        filteredTasks = filteredTasks.map((task: any) => {
            const isExplicitlyRecommended = task.is_recommended === true;
            let taskTierIndex = tierHierarchy.indexOf(task.min_tier || 'member');
            let isLocked = userTierIndex < taskTierIndex;
            if (isExplicitlyRecommended) isLocked = false;

            let isRecommended = isExplicitlyRecommended;
            if (!isRecommended && userStats) {
                const isHighPerformer = userStats.rating >= 80;
                const isHighReward = parseFloat(task.reward) >= 5.0;
                if (isHighPerformer && isHighReward) isRecommended = true;
            }

            if (isLocked) {
                return { ...task, url: undefined, locked: true, recommended: false };
            }
            return { ...task, locked: false, recommended: isRecommended };
        });

        if (includeLocked !== 'true') {
            filteredTasks = filteredTasks.filter((t: any) => !t.locked);
        }

        filteredTasks.sort((a: any, b: any) => {
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            return parseFloat(b.reward) - parseFloat(a.reward);
        });

        res.json(filteredTasks);
    } catch (error) {
        res.status(500).json({ message: "Error fetching tasks" });
    }
});

// Orientation metadata routes
router.get("/orientation-metadata", asyncHandler(async (req: any, res: any) => {
    try {
        const { data: tasks } = await req.supabaseAdmin
            .from('tasks')
            .select('category')
            .eq('is_orientation', true)
            .eq('is_active', true);

        if (!tasks || tasks.length === 0) {
            return res.json({ tasks: taskCategoryEnum });
        }

        const categories = [...new Set(tasks.map((t: any) => t.category))];
        res.json({ tasks: categories });
    } catch (error) {
        res.json({ tasks: taskCategoryEnum });
    }
}));

router.get("/orientation-tasks/:category", asyncHandler(async (req: any, res: any) => {
    try {
        const { category } = req.params;
        const { data: tasks } = await req.supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('is_orientation', true)
            .eq('is_active', true)
            .eq('category', category);

        if (!tasks) {
            return res.status(404).json({ error: 'No orientation tasks found' });
        }
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load orientation tasks' });
    }
}));

// Task claim/apply logic (Consolidated)
router.post("/:id/claim", authenticateUser, async (req: any, res) => {
    try {
        const taskId = req.params.id;
        const user = req.user;
        const userId = user.id;

        if (user.approval_status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ message: "Account approval required to claim tasks." });
        }

        const { data: task } = await req.supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.is_active) return res.status(400).json({ message: "Task is not active" });

        if (!user.orientation_complete && !task.is_orientation && user.role !== 'admin') {
            return res.status(403).json({ message: "Complete orientation to claim regular tasks." });
        }

        const tiers = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium'];
        const userTierIndex = tiers.indexOf(user.skill_upgrade_tier || 'member');
        const taskTierIndex = tiers.indexOf(task.min_tier || 'member');

        if (task.is_recommended !== true && userTierIndex < taskTierIndex && user.role !== 'admin') {
            return res.status(403).json({ message: `Upgrade to ${task.min_tier} tier to claim this task.` });
        }

        // Daily Limit Check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', today.toISOString());

        const limits = getTierLimits(user.skill_upgrade_tier || 'member');
        if ((count || 0) >= limits.dailyTasks && user.role !== 'admin' && !task.is_orientation) {
            return res.status(403).json({ message: `Daily task limit reached for ${user.skill_upgrade_tier} tier.` });
        }

        const { data: existing } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('task_id', taskId)
            .single();

        if (existing) {
            return res.status(400).json({ message: "Task already claimed or completed" });
        }

        const { data: userTask, error } = await req.supabaseAdmin
            .from('user_tasks')
            .insert({
                user_id: userId,
                task_id: taskId,
                status: 'claimed',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Task Claimed",
            message: `You have claimed task: ${task.title}.`,
            type: "task",
            is_read: false
        });

        notifyAdmins(req.supabaseAdmin, "Task Claimed", `User ${user.name} claimed task: ${task.title}`, "task_claim", { userId, taskId: task.id });

        res.json(userTask);
    } catch (error) {
        res.status(500).json({ message: "Failed to claim task" });
    }
});

// Bid application logic
router.post("/bid", authenticateUser, async (req: any, res) => {
    try {
        const { taskId } = req.body;
        const user = req.user;
        const userId = user.id;

        if (user.approval_status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ message: "Account approval required to bid on tasks." });
        }

        const { data: task } = await req.supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.is_active) return res.status(400).json({ message: "Task is not active" });

        const tiers = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium'];
        const userTierIndex = tiers.indexOf(user.skill_upgrade_tier || 'member');
        const taskTierIndex = tiers.indexOf(task.min_tier || 'member');

        if (task.is_recommended !== true && userTierIndex < taskTierIndex && user.role !== 'admin') {
            return res.status(403).json({ message: `Upgrade to ${task.min_tier} tier to bid on this task.` });
        }

        const { data: existing } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('task_id', taskId)
            .single();

        if (existing) {
            return res.status(400).json({ message: "Already bid on or completed this task" });
        }

        const { data: userTask, error } = await req.supabaseAdmin
            .from('user_tasks')
            .insert({
                user_id: userId,
                task_id: taskId,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Bid Placed",
            message: `You have placed a bid on task: ${task.title}.`,
            type: "task",
            is_read: false
        });

        notifyAdmins(req.supabaseAdmin, "Bid Placed", `User ${user.name} placed a bid on task: ${task.title}`, "task_bid", { userId, taskId: task.id });

        res.json(userTask);
    } catch (error) {
        res.status(500).json({ message: "Failed to place bid" });
    }
});

// Submit user task
router.post("/:id/submit", authenticateUser, async (req: any, res) => {
    try {
        const userTaskId = req.params.id;
        const userId = req.user.id;
        const { description, proof_attachments } = req.body;

        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select(`*, task:tasks(*)`)
            .eq('id', userTaskId)
            .single();

        if (!userTask) return res.status(404).json({ message: "Task not found" });
        if (userTask.user_id !== userId) return res.status(403).json({ message: "Unauthorized" });

        if (!['claimed', 'revision_requested'].includes(userTask.status)) {
            return res.status(400).json({ message: "Task cannot be submitted in its current state" });
        }

        const { data: updated, error } = await req.supabaseAdmin
            .from('user_tasks')
            .update({
                status: 'submitted',
                submission_description: description || userTask.submission_description,
                proof_attachments: proof_attachments || userTask.proof_attachments || [],
                updated_at: new Date().toISOString()
            })
            .eq('id', userTaskId)
            .select()
            .single();

        if (error) throw error;

        if (userTask.status === 'claimed') {
            const wallet = await storage.getWallet(req.supabaseAdmin, userId);
            if (wallet) {
                const reward = parseFloat(userTask.task.reward);
                const newPending = (parseFloat(wallet.pending_balance) + reward).toFixed(2);
                await storage.updateWallet(req.supabaseAdmin, userId, { pending_balance: newPending });
            }
        }

        notifyAdmins(req.supabaseAdmin, "Task Submitted", `User ${req.user.name} submitted task: ${userTask.task.title}`, "task_submission", { userId, userTaskId, taskId: userTask.task.id });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Failed to submit task" });
    }
});

// Storage upload proxy for regular users (proof-submissions bucket only)
router.post("/storage/upload", authenticateUser, async (req: any, res: Response) => {
    try {
        const { file, name, bucket, contentType } = req.body;

        if (!file || !name || !bucket) {
            return res.status(400).json({ success: false, message: "Missing file data, name, or bucket" });
        }

        // Check if the bucket is allowed for regular users
        const allowedBuckets = ['proof-submissions', 'verification-docs'];
        if (!allowedBuckets.includes(bucket)) {
            return res.status(403).json({ success: false, message: "Unauthorized bucket access" });
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
            console.error("User storage proxy upload error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        // Get public URL
        const { data: { publicUrl } } = req.supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(name);

        res.json({ success: true, url: publicUrl, path: data.path });
    } catch (error) {
        console.error("User storage proxy unexpected error:", error);
        res.status(500).json({ success: false, message: "Internal storage error" });
    }
});

// Task Cancellation
router.post("/:id/cancel", authenticateUser, async (req: any, res) => {
    try {
        const userTaskId = req.params.id;
        const userId = req.user.id;

        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*')
            .eq('id', userTaskId)
            .single();

        if (!userTask || userTask.user_id !== userId) {
            return res.status(404).json({ message: "Task not found or unauthorized" });
        }

        if (!['pending', 'claimed'].includes(userTask.status)) {
            return res.status(400).json({ message: "Task cannot be cancelled in current state" });
        }

        await req.supabaseAdmin
            .from('user_tasks')
            .update({ status: 'cancelled' })
            .eq('id', userTaskId);

        // Penalize rating
        const { data: user } = await req.supabaseAdmin.from('users').select('rating').eq('id', userId).single();
        if (user) {
            await req.supabaseAdmin.from('users').update({ rating: Math.max(0, (user.rating || 100) - 2) }).eq('id', userId);
        }

        res.json({ success: true, message: "Task cancelled" });
    } catch (error) {
        res.status(500).json({ message: "Failed to cancel task" });
    }
});

// User's task history
router.get("/user-tasks", authenticateUser, async (req: any, res) => {
    try {
        const { data: history } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        res.json(history || []);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
});

// Orientation completion
router.post("/orientation-complete", authenticateUser, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { data: user, error } = await req.supabaseAdmin
            .from('users')
            .update({ orientation_complete: true, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error || !user) throw new Error("Failed to update orientation");

        if (req.session) {
            req.session.user = user;
            req.session.save();
        }
        issueSessionCookie(res, user);

        res.json({ success: true, user, redirect: '/skill-upgrade' });
    } catch (error) {
        res.status(500).json({ message: "Error completing orientation" });
    }
});

export default router;
