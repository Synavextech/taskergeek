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
            let tasks: any[] = [];
            const { data: dbOrientationTasks } = await req.supabaseAdmin
                .from('tasks')
                .select('*')
                .eq('is_orientation', true)
                .eq('is_active', true);

            if (dbOrientationTasks && dbOrientationTasks.length > 0) {
                tasks = dbOrientationTasks;
            } else {
                // Fallback to local tasks.json if database has not been seeded yet
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const tasksPath = path.resolve(process.cwd(), 'server', 'data', 'tasks.json');
                    if (fs.existsSync(tasksPath)) {
                        const fileData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
                        tasks = fileData.filter((t: any) => t.is_orientation === true);
                    }
                } catch (readErr) {
                    console.warn("[TASKS] Failed to load local tasks fallback:", readErr);
                }
            }

            if (tasks.length > 0) {
                if (category && category !== 'all') {
                    tasks = tasks.filter((t: any) => t.category === category);
                } else {
                    // Group cleanly by category to ensure both standard and project tasks are preserved
                    const categories = taskCategoryEnum;
                    let selectedTasks: any[] = [];

                    categories.forEach(cat => {
                        const catTasks = tasks.filter((t: any) => t.category === cat);
                        // Take up to 3 tasks per category so standard and project tasks are preserved
                        selectedTasks = [...selectedTasks, ...catTasks.slice(0, 3)];
                    });
                    tasks = selectedTasks.length > 0 ? selectedTasks : tasks;
                }
                return res.json(tasks);
            }
            return res.status(404).json({ message: 'Orientation tasks not found' });
        }

        // Handle regular tasks
        if ((!user.orientation_complete || !user.grammar_test_passed) && user.role !== 'admin') {
            return res.status(403).json({ message: "Complete orientation and grammar test first to access regular tasks" });
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

        // Exclude project-based tasks that have reached participant capacity
        filteredTasks = filteredTasks.filter((t: any) => {
            if (t.task_type === 'project') {
                const max = t.max_participants || 1;
                const current = t.current_participants || 0;
                return current < max;
            }
            return true;
        });

        // Filter by explicit taskType query or user's registered task_preference
        const requestedType = req.query.taskType;
        if (requestedType && ['standard', 'project'].includes(requestedType)) {
            filteredTasks = filteredTasks.filter((t: any) => (t.task_type || 'standard') === requestedType);
        } else if (user.task_preference && user.task_preference !== 'all') {
            filteredTasks = filteredTasks.filter((t: any) => (t.task_type || 'standard') === user.task_preference);
        }

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

        if (category && category !== 'all') {
            filteredTasks = filteredTasks.filter((t: any) => t.category === category);
        }

        const tierHierarchy = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'universal', 'premium'];
        const userTierIndex = tierHierarchy.indexOf(user.skill_upgrade_tier || 'member');

        const { data: userStats } = await req.supabaseAdmin
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const hasProjectAccess = user.has_project_access === true || user.role === 'admin' || user.skill_upgrade_tier === 'universal' || user.skill_upgrade_tier === 'premium';

        filteredTasks = filteredTasks.map((task: any) => {
            const isExplicitlyRecommended = task.is_recommended === true;
            let taskTierIndex = tierHierarchy.indexOf(task.min_tier || 'member');
            let isLocked = userTierIndex < taskTierIndex;
            if (isExplicitlyRecommended) isLocked = false;

            // Enforce skill-based access for project tasks
            let lockReason: string | undefined;
            if (task.task_type === 'project' && !hasProjectAccess) {
                isLocked = true;
                lockReason = 'project_access_required';
            } else if (isLocked) {
                lockReason = 'tier_required';
            }

            let isRecommended = isExplicitlyRecommended;
            if (!isRecommended && userStats) {
                const isHighPerformer = (userStats.completion_rate ?? userStats.rating ?? 100) >= 80;
                const isHighReward = parseFloat(task.reward || task.hourly_rate || 0) >= 5.0;
                if (isHighPerformer && isHighReward) isRecommended = true;
            }

            const spotsRemaining = task.task_type === 'project'
                ? Math.max(0, (task.max_participants || 1) - (task.current_participants || 0))
                : undefined;

            if (isLocked) {
                return {
                    ...task,
                    url: undefined,
                    locked: true,
                    lockReason,
                    recommended: false,
                    spotsRemaining
                };
            }
            return {
                ...task,
                locked: false,
                recommended: isRecommended,
                spotsRemaining
            };
        });

        if (includeLocked !== 'true') {
            filteredTasks = filteredTasks.filter((t: any) => !t.locked);
        }

        filteredTasks.sort((a: any, b: any) => {
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            const aVal = parseFloat(a.task_type === 'project' ? a.hourly_rate : a.reward) || 0;
            const bVal = parseFloat(b.task_type === 'project' ? b.hourly_rate : b.reward) || 0;
            return bVal - aVal;
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
        if (!task.is_active) return res.status(400).json({ message: "Task is not active or has reached full participant capacity" });

        if ((!user.orientation_complete || !user.grammar_test_passed) && !task.is_orientation && user.role !== 'admin') {
            return res.status(403).json({ message: "Complete orientation and grammar test to claim regular tasks." });
        }

        // Project-based task checks
        if (task.task_type === 'project') {
            const hasProjectAccess = user.has_project_access === true || user.role === 'admin' || user.skill_upgrade_tier === 'universal' || user.skill_upgrade_tier === 'premium';
            if (!hasProjectAccess) {
                return res.status(403).json({ message: "Skill upgrade to UniversalGeek or Hourly Qualification required to access project-based hourly tasks." });
            }

            const currentParticipants = task.current_participants || 0;
            const maxParticipants = task.max_participants || 1;
            if (currentParticipants >= maxParticipants) {
                return res.status(400).json({ message: "This project has reached maximum participant capacity." });
            }

            // Increment participant countdown tracker
            const nextCount = currentParticipants + 1;
            await req.supabaseAdmin
                .from('tasks')
                .update({
                    current_participants: nextCount,
                    is_active: nextCount < maxParticipants
                })
                .eq('id', taskId);
        }

        const tiers = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'universal', 'premium'];
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
                hourly_rate: task.hourly_rate || 0,
                time_spent_seconds: 0,
                accrued_earnings: 0,
                project_responses: {},
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        await storage.createNotification(req.supabaseAdmin, {
            user_id: userId,
            title: "Task Claimed",
            message: `You have claimed ${task.task_type === 'project' ? 'project' : 'task'}: ${task.title}.`,
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

        const tiers = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'universal', 'premium'];
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
        const { description, proof_attachments, time_spent_seconds, project_responses } = req.body;

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

        const isProject = userTask.task?.task_type === 'project';
        let accruedEarnings = parseFloat(userTask.task?.reward || 0);
        let timeSpent = userTask.time_spent_seconds || 0;

        if (typeof time_spent_seconds === 'number') {
            timeSpent = Math.max(0, time_spent_seconds);
        }

        if (isProject) {
            const hourlyRate = parseFloat(userTask.hourly_rate || userTask.task?.hourly_rate || 0);
            if (hourlyRate > 0 && timeSpent > 0) {
                accruedEarnings = parseFloat(((timeSpent / 3600) * hourlyRate).toFixed(2));
            }
        }

        const updates: any = {
            status: 'submitted',
            submission_description: description || userTask.submission_description,
            proof_attachments: proof_attachments || userTask.proof_attachments || [],
            time_spent_seconds: timeSpent,
            accrued_earnings: accruedEarnings,
            updated_at: new Date().toISOString()
        };

        if (project_responses) {
            updates.project_responses = {
                ...(userTask.project_responses || {}),
                ...project_responses
            };
        }

        const { data: updated, error } = await req.supabaseAdmin
            .from('user_tasks')
            .update(updates)
            .eq('id', userTaskId)
            .select()
            .single();

        if (error) throw error;

        if (userTask.status === 'claimed') {
            const wallet = await storage.getWallet(req.supabaseAdmin, userId);
            if (wallet) {
                const pendingAddition = isProject ? accruedEarnings : parseFloat(userTask.task.reward || 0);
                const newPending = (parseFloat(wallet.pending_balance) + pendingAddition).toFixed(2);
                await storage.updateWallet(req.supabaseAdmin, userId, { pending_balance: newPending });
            }
        }

        notifyAdmins(req.supabaseAdmin, "Task Submitted", `User ${req.user.name} submitted ${isProject ? 'project' : 'task'}: ${userTask.task.title}`, "task_submission", { userId, userTaskId, taskId: userTask.task.id });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Failed to submit task" });
    }
});

// Working Time & Project Progress Tracker
router.post("/:id/track-time", authenticateUser, async (req: any, res) => {
    try {
        const userTaskId = req.params.id;
        const userId = req.user.id;
        const { time_spent_seconds, project_responses } = req.body;

        const { data: userTask } = await req.supabaseAdmin
            .from('user_tasks')
            .select('*, task:tasks(*)')
            .eq('id', userTaskId)
            .single();

        if (!userTask || userTask.user_id !== userId) {
            return res.status(404).json({ message: "Task not found or unauthorized" });
        }

        if (!['claimed', 'revision_requested'].includes(userTask.status)) {
            return res.status(400).json({ message: "Cannot track time for task in current status" });
        }

        const seconds = typeof time_spent_seconds === 'number' ? Math.max(0, time_spent_seconds) : (userTask.time_spent_seconds || 0);
        const hourlyRate = parseFloat(userTask.hourly_rate || userTask.task?.hourly_rate || 0);
        const accruedEarnings = hourlyRate > 0 ? parseFloat(((seconds / 3600) * hourlyRate).toFixed(2)) : 0;

        const updates: any = {
            time_spent_seconds: seconds,
            accrued_earnings: accruedEarnings,
            updated_at: new Date().toISOString()
        };

        if (project_responses) {
            updates.project_responses = {
                ...(userTask.project_responses || {}),
                ...project_responses
            };
        }

        const { data: updated, error } = await req.supabaseAdmin
            .from('user_tasks')
            .update(updates)
            .eq('id', userTaskId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, userTask: updated });
    } catch (error) {
        console.error("Track time error:", error);
        res.status(500).json({ message: "Failed to track time" });
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
            .select('*, task:tasks(*)')
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
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', userTaskId);

        // If this was a project task, restore participant count on parent task and reactivate if full
        if (userTask.task?.task_type === 'project') {
            const current = userTask.task.current_participants || 0;
            const newCount = Math.max(0, current - 1);
            await req.supabaseAdmin
                .from('tasks')
                .update({
                    current_participants: newCount,
                    is_active: true
                })
                .eq('id', userTask.task_id);
        }

        // Recalculate user completion rate (cancellation decreases success rate)
        await storage.updateUserStats(req.supabaseAdmin, userId);

        res.json({ success: true, message: "Task cancelled and completion rate updated" });
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
