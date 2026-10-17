import { Request, Response, NextFunction } from "express";
import { getSupabaseClient, createAdminClient } from "../supabase";
import { storage } from "../supabase-storage";
import { sendSuccess, AppError } from "../middleware";
import { type SupabaseClient } from "@supabase/supabase-js";

export const AUTH_COOKIE_NAME = 'sb-auth-token';

export function authLog(context: string, data: Record<string, unknown>) {
    const payload = {
        timestamp: new Date().toISOString(),
        context,
        ...data,
    };
    console.log(`[AUTH] ${JSON.stringify(payload)}`);
}

export function issueSessionCookie(res: Response, user: any) {
    return "session-managed-by-express-session";
}

export function clearSessionCookie(res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME);
}

export async function notifyAdmins(adminClient: SupabaseClient, title: string, message: string, type: string, metadata: any = {}) {
    try {
        const { data: admins, error } = await adminClient
            .from('users')
            .select('id')
            .eq('role', 'admin');

        if (error) {
            console.error("Failed to fetch admins for notification:", error);
            return;
        }

        if (!admins || admins.length === 0) {
            console.warn("No admins found to notify.");
            return;
        }

        for (const admin of admins) {
            try {
                await storage.createNotification(adminClient, {
                    user_id: admin.id,
                    title,
                    message,
                    type,
                    is_read: false,
                    metadata
                });
            } catch (innerError) {
                console.error(`Failed to notify admin ${admin.id}:`, innerError);
            }
        }
    } catch (e) {
        console.error("CRITICAL: Failed to notify admins:", e);
    }
}

export const authenticateUser = async (req: any, res: any, next: NextFunction) => {
    try {
        const logPrefix = `[AUTH_MIDDLEWARE] ${req.method} ${req.path}`;

        // We use req.supabase and req.supabaseAdmin injected by supabaseMiddleware
        if (req.session?.user) {
            req.user = req.session.user;
            return next();
        }

        const { data: { user }, error } = await req.supabase.auth.getUser();

        if (error || !user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: bearerUser }, error: bearerError } = await req.supabaseAdmin.auth.getUser(token);

                if (bearerError || !bearerUser) {
                    console.warn(`${logPrefix} invalid bearer token`);
                    return res.status(401).json({
                        success: false,
                        error: { message: "Invalid authentication token", code: "AUTH_TOKEN_INVALID" },
                        timestamp: new Date().toISOString()
                    });
                }

                const profile = await storage.getUser(req.supabaseAdmin, bearerUser.id);
                if (!profile) {
                    return res.status(401).json({
                        success: false,
                        error: { message: "User profile not found", code: "USER_NOT_FOUND" },
                        timestamp: new Date().toISOString()
                    });
                }

                req.user = profile;
                if (req.session) {
                    req.session.user = profile;
                }
                return next();
            }

            console.warn(`${logPrefix} authentication failed`);
            return res.status(401).json({
                success: false,
                error: { message: "Authentication required", code: "AUTH_REQUIRED" },
                timestamp: new Date().toISOString()
            });
        }

        const profile = await storage.getUser(req.supabaseAdmin, user.id);
        if (!profile) {
            console.error(`${logPrefix} user lookup failed for ${user.id}`);
            return res.status(401).json({
                success: false,
                error: { message: "User profile not found", code: "USER_NOT_FOUND" },
                timestamp: new Date().toISOString()
            });
        }

        req.user = profile;
        if (req.session) {
            req.session.user = profile;
        }

        const fullPath = req.baseUrl + req.path;

        if (fullPath.startsWith('/api/admin') && profile.role === 'admin') {
            return next();
        }

        if (profile.approval_status === 'rejected') {
            return res.status(403).json({
                success: false,
                error: { message: "Account access denied", code: "ACCOUNT_REJECTED" },
                timestamp: new Date().toISOString()
            });
        }

        if (profile.is_suspended) {
            if (profile.suspension_end_date && new Date(profile.suspension_end_date) < new Date()) {
                console.log(`${logPrefix} suspension expired for ${profile.email}, auto-unsuspending`);
                await storage.updateUser(req.supabaseAdmin, profile.id, { is_suspended: false, suspension_end_date: null });
                profile.is_suspended = false;
                profile.suspension_end_date = null;

                await storage.createNotification(req.supabaseAdmin, {
                    user_id: profile.id,
                    title: "Account Restored",
                    message: "Your account suspension has expired and your access has been restored.",
                    type: "system",
                    is_read: false
                });
            } else if (fullPath.startsWith('/api/tasks') || fullPath.startsWith('/api/user-tasks')) {
                console.warn(`${logPrefix} suspended user attempted task access: ${profile.email}`);
                return res.status(403).json({
                    success: false,
                    error: {
                        message: `Your account is suspended ${profile.suspension_end_date ? 'until ' + new Date(profile.suspension_end_date).toLocaleDateString() : ''}. Access to tasks is restricted.`,
                        code: "ACCOUNT_SUSPENDED"
                    },
                    timestamp: new Date().toISOString()
                });
            }
        }

        next();
    } catch (error) {
        console.error(`[AUTH_MIDDLEWARE] Unexpected error`, error);
        return res.status(500).json({
            success: false,
            error: { message: "Authentication service error", code: "AUTH_SERVICE_ERROR" },
            timestamp: new Date().toISOString()
        });
    }
};

export const authenticateAdmin = async (req: any, res: any, next: NextFunction) => {
    try {
        await new Promise<void>((resolve, reject) => {
            authenticateUser(req, res, (error?: any) => {
                if (error) reject(error);
                else resolve();
            });
        });

        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: "Admin access required", code: "ADMIN_REQUIRED" },
                timestamp: new Date().toISOString()
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: { message: "Admin authentication service error", code: "ADMIN_AUTH_ERROR" },
            timestamp: new Date().toISOString()
        });
    }
};
