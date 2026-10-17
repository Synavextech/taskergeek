import { Router, Request, Response } from "express";
import { storage } from "../supabase-storage";
import { insertUserSchema, loginSchema, Gender, SUPPORTED_COUNTRIES, REGION_UNAVAILABLE_NOTICE, matchSupportedCountry } from "@shared/types";
import { z } from "zod";
import {
    issueSessionCookie,
    authLog,
    notifyAdmins,
    authenticateUser
} from "./common";
import {
    authRateLimit,
    accountRateLimit,
    recordAccountAuthFailure,
    clearAccountAuthFailure,
    otpRateLimit,
    sendSuccess,
    AppError,
    asyncHandler
} from "../middleware";
import { generateReferralCode } from "../utils";
import { anomalyDetector } from "../services/anomalyDetector";
import { securityService } from "../services/securityService";

import { createAnonClient } from "../supabase";

const router = Router();

// Logout endpoint
router.post("/logout", (req: any, res) => {
    authLog('logout', { userId: req.user?.id || 'unknown' });

    // Background fire-and-forget Supabase signout if client is available
    if (req.supabase?.auth?.signOut) {
        req.supabase.auth.signOut().catch((e: any) => {
            console.warn('[AUTH] Background Supabase signOut warning on logout:', e);
        });
    }

    const clearAllAuthCookies = () => {
        res.clearCookie('auth_token', { path: '/' });
        res.clearCookie('sb-auth-token', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
    };

    if (req.session) {
        req.session.destroy((err: any) => {
            if (err) {
                console.error('[AUTH] Session destruction error:', err);
            }
            clearAllAuthCookies();
            res.json({ success: true, message: "Logged out successfully" });
        });
    } else {
        clearAllAuthCookies();
        res.json({ success: true, message: "Logged out successfully" });
    }
});

// Email verification status check
router.get("/verify-email-status", async (req: any, res) => {
    try {
        const { data: authUser, error: authError } = await req.supabase.auth.getUser();

        if (authError || !authUser.user) {
            return res.status(401).json({
                success: false,
                error: { message: "Authentication required", code: "AUTH_REQUIRED" },
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            emailConfirmed: !!authUser.user.email_confirmed_at,
            email: authUser.user.email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Email verification status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Resend Signup Email Confirmation
router.post('/resend-confirmation', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email } = req.body;

    if (!email || !email.trim()) {
        throw new AppError('Email address is required', 400, 'EMAIL_REQUIRED');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : null);
    const isLocal = clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1'));
    const baseUrl = isLocal ? clientOrigin : (process.env.PRODUCTION_URL || `${req.protocol}://${req.get('host')}`);

    try {
        const { error } = await req.supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
            options: {
                emailRedirectTo: `${baseUrl}/auth/verify-email`
            }
        });

        if (error) {
            console.warn('[AUTH] Supabase resend confirmation notice:', error.message);
            throw new AppError(error.message || 'Failed to resend confirmation email', 400, 'RESEND_FAILED');
        }
    } catch (err: any) {
        throw new AppError(err?.message || 'Failed to resend confirmation email', 400, 'RESEND_FAILED');
    }

    return sendSuccess(res, { success: true }, 'Confirmation email has been dispatched.');
}));

// Verify Email Confirmation Code
router.post('/verify-email-code', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
        throw new AppError('Email and confirmation code are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = String(code).replace(/\D/g, '').trim();

    const sbAnon = createAnonClient();
    const { data: sbData, error: sbError } = await sbAnon.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanCode,
        type: 'signup'
    });

    if (sbError || !sbData?.user) {
        throw new AppError(sbError?.message || 'Invalid or expired confirmation code', 400, 'INVALID_CONFIRMATION_CODE');
    }

    authLog('email-confirmed-via-code', { userId: sbData.user.id, email: normalizedEmail });

    return sendSuccess(res, {
        confirmed: true,
        user: sbData.user
    }, 'Email confirmed successfully! You can now sign in.');
}));

// Password Reset with Custom One-Time Passcode or Supabase Recovery (15 min expiry)
router.post('/forgot-password', authRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!email || !email.trim()) {
        throw new AppError('Email address is required', 400, 'EMAIL_REQUIRED');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in database to personalize email if possible
    let userName = "Tasker";
    try {
        const { data: dbUser } = await req.supabaseAdmin
            .from('users')
            .select('name')
            .eq('email', normalizedEmail)
            .maybeSingle();
        if (dbUser?.name) {
            userName = dbUser.name;
        }
    } catch {
        // Continue gracefully
    }

    // Clear any previous consecutive failure lockouts when user initiates recovery
    clearAccountAuthFailure(normalizedEmail);
    anomalyDetector.resetFailures(normalizedEmail);

    // 1. Custom backend OTP challenge (15 minute expiration)
    const challenge = await securityService.createPasswordResetChallenge(
        normalizedEmail,
        userName,
        clientIp,
        userAgent
    );

    if (!challenge.success && challenge.error) {
        throw new AppError(challenge.error, 429, 'RATE_LIMIT_COOLDOWN');
    }

    // 2. Also trigger Supabase internal auth password reset (if Supabase mail template uses code/magic link)
    try {
        const clientOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : null);
        const isLocal = clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1'));
        const baseUrl = isLocal ? clientOrigin : (process.env.PRODUCTION_URL || `${req.protocol}://${req.get('host')}`);

        await req.supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${baseUrl}/update-password`
        });
        console.log(`[AUTH] Dispatched Supabase recovery email with redirect: ${baseUrl}/update-password`);
    } catch (sbError) {
        console.warn('[AUTH] Supabase reset trigger notice:', sbError);
    }

    authLog('password-reset-otp-dispatched', { email: normalizedEmail, ip: clientIp });

    return sendSuccess(res, {
        email: normalizedEmail,
        expiresInMinutes: 15
    }, 'A password recovery code and direct link have been dispatched to your email address (valid for 15 minutes).');
}));

// Verify Reset OTP Code (supports 6 to 10 character tokens)
router.post('/verify-reset-otp', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
        throw new AppError('Email and recovery code are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = String(code).replace(/\D/g, '').trim();

    // 1. Try custom backend OTP challenge
    const verification = securityService.verifyPasswordResetOTP(normalizedEmail, cleanCode);
    if (verification.success) {
        authLog('password-reset-otp-verified', { email: normalizedEmail });
        return sendSuccess(res, {
            email: normalizedEmail,
            resetToken: verification.resetToken
        }, 'Recovery code verified successfully');
    }

    // 2. Fallback: Try Supabase Auth native OTP recovery via standalone client
    try {
        const sbAnon = createAnonClient();
        const { data: sbData, error: sbError } = await sbAnon.auth.verifyOtp({
            email: normalizedEmail,
            token: cleanCode,
            type: 'recovery'
        });

        if (!sbError && sbData?.user) {
            authLog('password-reset-supabase-otp-verified', { email: normalizedEmail });
            return sendSuccess(res, {
                email: normalizedEmail,
                resetToken: `sb_verified_${Buffer.from(normalizedEmail).toString('base64')}`
            }, 'Recovery code verified successfully');
        }
    } catch (sbErr) {
        console.warn('[AUTH] Supabase OTP verify error:', sbErr);
    }

    throw new AppError(verification.error || 'Invalid or expired recovery code', 400, 'INVALID_OTP');
}));

// Complete Password Reset
router.post('/reset-password', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email, code, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || (!code && !resetToken) || !newPassword) {
        throw new AppError('Email, verification code/token, and new password are required', 400, 'VALIDATION_ERROR');
    }

    if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400, 'PASSWORD_TOO_SHORT');
    }

    if (confirmPassword && newPassword !== confirmPassword) {
        throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code ? String(code).replace(/\D/g, '').trim() : '';

    let isVerified = false;

    // 1. Check if token was verified via Supabase OTP route
    if (resetToken && resetToken.startsWith('sb_verified_')) {
        const encoded = resetToken.replace('sb_verified_', '');
        try {
            const decodedEmail = Buffer.from(encoded, 'base64').toString('utf-8');
            if (decodedEmail.toLowerCase() === normalizedEmail) {
                isVerified = true;
            }
        } catch {
            // Ignore decoding failure
        }
    }

    // 2. Check custom securityService challenge
    if (!isVerified) {
        const verification = securityService.validateAndConsumeReset(normalizedEmail, resetToken || cleanCode);
        if (verification.success) {
            isVerified = true;
        }
    }

    // 3. Fallback: Verify code directly via Supabase Auth recovery OTP
    if (!isVerified && cleanCode) {
        try {
            const sbAnon = createAnonClient();
            const { data: sbData, error: sbError } = await sbAnon.auth.verifyOtp({
                email: normalizedEmail,
                token: cleanCode,
                type: 'recovery'
            });

            if (!sbError && sbData?.user) {
                isVerified = true;
            }
        } catch (sbErr) {
            console.warn('[AUTH] Direct Supabase verifyOtp fallback notice:', sbErr);
        }
    }

    if (!isVerified) {
        throw new AppError('Invalid or expired recovery credentials. Please enter a valid code or request a fresh one.', 400, 'INVALID_RESET_CREDENTIALS');
    }

    // Find the user in Supabase auth
    const { data: userList, error: listError } = await req.supabaseAdmin.auth.admin.listUsers();
    if (listError) {
        throw new AppError('Auth service error while updating credentials', 500, 'AUTH_LOOKUP_FAILED');
    }

    const targetUser = userList?.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
    if (!targetUser) {
        throw new AppError('Account not found for provided email address', 404, 'USER_NOT_FOUND');
    }

    // Update password in Supabase Auth Admin
    const { error: updateError } = await req.supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        password: newPassword
    });

    if (updateError) {
        console.error('[AUTH] Supabase admin updateUserById failed:', updateError);
        throw new AppError(updateError.message || 'Failed to update account password', 500, 'UPDATE_FAILED');
    }

    // Clear failed login tracking and anomaly lockouts for restored user
    clearAccountAuthFailure(normalizedEmail);
    anomalyDetector.resetFailures(normalizedEmail);

    authLog('password-reset-completed', { userId: targetUser.id, email: normalizedEmail });

    return sendSuccess(res, { success: true }, 'Password reset successfully. You can now log in with your new password.');
}));

router.post('/register', asyncHandler(async (req: any, res: Response) => {
    try {
        const { name, phone, email, password, confirmPassword, gender, country, referredBy } = req.body;
        if (password !== confirmPassword) {
            throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH');
        }

        // Region Coverage Check
        const matchedCountry = matchSupportedCountry(country);

        if (!matchedCountry) {
            authLog('registration-blocked-region', { email, country });
            throw new AppError(REGION_UNAVAILABLE_NOTICE, 403, 'REGION_NOT_COVERED');
        }

        const validatedData = insertUserSchema.parse({
            name,
            email,
            password,
            gender: gender as Gender,
            phone,
            country: matchedCountry.name,
            referredBy
        });

        // Check if user exists in Auth
        const { data: existingUsers } = await req.supabaseAdmin.auth.admin.listUsers();
        if (existingUsers?.users.some((u: any) => u.email === validatedData.email)) {
            throw new AppError('User already registered', 409, 'USER_EXISTS');
        }

        const newReferralCode = generateReferralCode();
        const { data: authData, error: authError } = await req.supabaseAdmin.auth.admin.createUser({
            email: validatedData.email,
            password: validatedData.password,
            email_confirm: false,
            user_metadata: {
                full_name: validatedData.name,
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone || null,
                gender: validatedData.gender,
                country: validatedData.country || null,
                role: 'user',
                referral_code: newReferralCode,
                referred_by: validatedData.referredBy
            }
        });

        if (authError || !authData.user) {
            throw new AppError(
                authError?.message || 'Auth signup failed',
                400,
                'AUTH_SIGNUP_FAILED'
            );
        }

        const userId = authData.user.id;

        const { data: createdProfile, error: createProfileError } = await req.supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone || null,
                gender: validatedData.gender,
                country: validatedData.country || null,
                role: 'user',
                approval_status: 'pending',
                verification_status: 'unverified',
                orientation_complete: false,
                skill_upgrade_tier: 'member',
                referral_code: newReferralCode,
                referred_by: validatedData.referredBy,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

        if (createProfileError) {
            console.error('Profile creation/update failed:', createProfileError);
            throw new AppError('Profile creation failed', 500, 'PROFILE_CREATE_FAILED');
        }

        const profile = createdProfile;

        // Dispatch initial signup confirmation email with origin-aware redirect
        const clientOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : null);
        const isLocal = clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1'));
        const baseUrl = isLocal ? clientOrigin : (process.env.PRODUCTION_URL || `${req.protocol}://${req.get('host')}`);

        try {
            await req.supabase.auth.resend({
                type: 'signup',
                email: validatedData.email,
                options: {
                    emailRedirectTo: `${baseUrl}/auth/verify-email`
                }
            });
            console.log(`[AUTH] Dispatched signup confirmation email to ${validatedData.email} (Redirect: ${baseUrl}/auth/verify-email)`);
        } catch (resendErr) {
            console.warn('[AUTH] Signup confirmation dispatch notice:', resendErr);
        }

        authLog('register-pending-confirmation', {
            userId: profile.id,
            email: profile.email
        });

        notifyAdmins(
            req.supabaseAdmin,
            "New User Registration",
            `New user ${profile.name} (${profile.email}) has registered and requires email confirmation.`,
            "user",
            { userId: profile.id }
        );

        return sendSuccess(res, {
            user: profile,
            requiresConfirmation: true,
            email: validatedData.email
        }, 'Registration successful! Please check your email to confirm your account and accept the Terms & Conditions.');
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.errors);
        }
        throw error;
    }
}));

router.get('/referrals/stats', authenticateUser, async (req: any, res) => {
    try {
        const userId = req.user.id;

        const { data: referrals, error: countError } = await req.supabaseAdmin
            .from('users')
            .select('id', { count: 'exact' })
            .eq('referred_by', req.user.referral_code);

        const { data: earnings, error: earnError } = await req.supabaseAdmin
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'referral_bonus');

        const referralCount = referrals?.length || 0;
        const totalEarnings = (earnings || []).reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0).toFixed(2);

        res.json({
            count: referralCount,
            earnings: totalEarnings,
            referralCode: req.user.referral_code
        });
    } catch (error) {
        console.error("[AUTH] Referral stats error:", error);
        res.status(500).json({ message: "Failed to fetch referral stats" });
    }
});

router.get('/user', async (req: any, res: Response) => {
    try {
        if (req.session?.user) {
            return sendSuccess(res, { user: req.session.user });
        }

        const { data: { user }, error } = await req.supabase.auth.getUser();
        if (user && !error) {
            const profile = await storage.getUser(req.supabaseAdmin, user.id);
            if (profile) {
                if (req.session) req.session.user = profile;
                return sendSuccess(res, { user: profile });
            }
        }

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user: bearerUser }, error: bearerError } = await req.supabaseAdmin.auth.getUser(token);
            if (bearerUser && !bearerError) {
                const profile = await storage.getUser(req.supabaseAdmin, bearerUser.id);
                if (profile) {
                    if (req.session) req.session.user = profile;
                    return sendSuccess(res, { user: profile });
                }
            }
        }
    } catch (e) {
        // Fallback to unauthenticated
    }

    return sendSuccess(res, { user: null });
});

router.get('/stats/:id', authenticateUser, async (req: any, res) => {
    try {
        const userId = req.params.id;
        if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        const { data: stats } = await req.supabaseAdmin
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();
        res.json(stats || { rating: 100, tasks_completed: 0, tasks_approved: 0 });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

router.patch('/profile', authenticateUser, async (req: any, res) => {
    try {
        const settings = await storage.getSystemSettings(req.supabase);
        const isEditAllowed = settings?.allow_profile_editing ?? true;

        const updates = { ...req.body };
        const isVerificationOnly = Object.keys(updates).length === 1 && updates.verification_documents;

        if (!isEditAllowed && req.user.role !== 'admin' && !isVerificationOnly) {
            return res.status(403).json({
                message: "Profile editing is currently disabled by the administrator."
            });
        }

        // Auto-set status to 'submitted' if they just uploaded verification documents
        if (updates.verification_documents && Array.isArray(updates.verification_documents) && updates.verification_documents.length > 0) {
            console.log(`[AUTH] User ${req.user.id} uploaded verification documents. Setting status to submitted.`);
            updates.verification_status = 'submitted';
            updates.pending_verification = true;
        }

        const user = await storage.updateUser(req.supabaseAdmin, req.user.id, updates);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile" });
    }
});

router.patch('/deactivate', authenticateUser, async (req: any, res) => {
    try {
        await storage.updateUser(req.supabaseAdmin, req.user.id, { is_active: false });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to deactivate account" });
    }
});

router.post('/login', authRateLimit, accountRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
        throw new AppError('Email and password required', 400, 'VALIDATION_ERROR');
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const { data: signInData, error: signInError } = await req.supabase.auth.signInWithPassword({
        email: email.trim(),
        password
    });

    if (signInError || !signInData?.user) {
        if (signInError?.message?.toLowerCase().includes('email not confirmed')) {
            throw new AppError('Please confirm your email address before logging in. A confirmation link has been sent to your inbox.', 403, 'EMAIL_NOT_CONFIRMED');
        }
        recordAccountAuthFailure(email);
        anomalyDetector.recordFailure(email, clientIp);
        throw new AppError('Invalid credentials', 401, 'AUTH_INVALID');
    }

    // Explicit check: require email confirmation before allowing login
    if (!signInData.user.email_confirmed_at) {
        throw new AppError('Please confirm your email address before logging in. A confirmation link has been sent to your inbox.', 403, 'EMAIL_NOT_CONFIRMED');
    }

    const profile = await storage.getUser(req.supabaseAdmin, signInData.user.id);

    if (!profile) {
        throw new AppError('User profile not found', 400, 'PROFILE_NOT_FOUND');
    }

    if (!profile.is_active) {
        throw new AppError('Account deactivated', 401, 'ACCOUNT_INACTIVE');
    }

    // Clear failed attempt tracking for successful credential entry
    clearAccountAuthFailure(email);

    // Evaluate for suspicious activity / anomaly
    const anomalyCheck = anomalyDetector.isSuspicious(profile.id, profile.email, clientIp, userAgent);

    if (anomalyCheck.suspicious) {
        console.warn(`[SECURITY] Suspicious login detected for ${profile.email}: ${anomalyCheck.reasons.join(", ")}`);
        const challenge = await securityService.createChallenge(
            profile,
            signInData.session,
            clientIp,
            userAgent,
            anomalyCheck.reasons
        );

        // Also trigger Supabase Auth OTP delivery so an email is dispatched to the user's inbox
        try {
            await req.supabase.auth.signInWithOtp({
                email: profile.email,
                options: { shouldCreateUser: false }
            });
            console.log(`[SECURITY] Dispatched Supabase security login OTP to ${profile.email}`);
        } catch (sbOtpErr) {
            console.warn('[SECURITY] Notice: Supabase signInWithOtp trigger:', sbOtpErr);
        }

        return res.json({
            success: true,
            status: "SUSPICIOUS_CHALLENGE_REQUIRED",
            data: {
                challengeToken: challenge.challengeToken,
                email: profile.email,
                expiresInSeconds: challenge.expiresInSeconds,
                reasons: anomalyCheck.reasons
            },
            message: "Additional verification required. We have sent a verification code to your email."
        });
    }

    // Normal safe login: record device & establish session
    anomalyDetector.recordSuccess(profile.id, profile.email, clientIp, userAgent);
    issueSessionCookie(res, profile);

    if (req.session) {
        req.session.user = profile;
        await new Promise<void>((resolve, reject) => {
            req.session.save((err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    authLog('login-success', { userId: profile.id });

    return sendSuccess(res, {
        user: profile,
        session: signInData.session
    }, 'Login successful');
}));

router.post('/verify-otp', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { challengeToken, otpCode } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!challengeToken || !otpCode) {
        throw new AppError('Challenge token and verification code are required', 400, 'VALIDATION_ERROR');
    }

    const cleanCode = String(otpCode).replace(/\D/g, '').trim();

    let verification = securityService.verifyChallenge(challengeToken, cleanCode);
    let userProfile = verification?.userProfile;
    let supabaseSession = verification?.supabaseSession;

    // Fallback: If custom verification fails, check Supabase native OTP verification
    if (!verification.success) {
        const challenge = securityService.getChallenge(challengeToken);
        if (challenge) {
            try {
                const sbAnon = createAnonClient();
                const { data: sbData, error: sbError } = await sbAnon.auth.verifyOtp({
                    email: challenge.email,
                    token: cleanCode,
                    type: 'email'
                });

                if (!sbError && sbData?.user) {
                    userProfile = challenge.userProfile;
                    supabaseSession = sbData.session || challenge.supabaseSession;
                    securityService.consumeChallenge(challengeToken);
                    verification = { success: true, userProfile, supabaseSession };
                }
            } catch (err) {
                console.warn('[AUTH] Error during fallback Supabase OTP verification:', err);
            }
        }
    }

    if (!verification.success || !userProfile) {
        throw new AppError(verification.error || 'Invalid or expired verification code', 400, 'OTP_VERIFICATION_FAILED');
    }

    // Trust new device/IP and clear failure states
    anomalyDetector.recordSuccess(userProfile.id, userProfile.email, clientIp, userAgent);
    anomalyDetector.resetFailures(userProfile.email);

    issueSessionCookie(res, userProfile);

    if (req.session) {
        req.session.user = userProfile;
        await new Promise<void>((resolve, reject) => {
            req.session.save((err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    authLog('otp-verified-success', { userId: userProfile.id });

    return sendSuccess(res, {
        user: userProfile,
        session: supabaseSession
    }, 'Authentication verified successfully');
}));

router.post('/resend-otp', otpRateLimit, asyncHandler(async (req: any, res: Response) => {
    const { challengeToken } = req.body;

    if (!challengeToken) {
        throw new AppError('Challenge token is required', 400, 'VALIDATION_ERROR');
    }

    const challenge = securityService.getChallenge(challengeToken);
    const resend = await securityService.resendCode(challengeToken);

    if (!resend.success) {
        throw new AppError(resend.error || 'Failed to resend code', 400, 'RESEND_FAILED');
    }

    if (challenge) {
        try {
            await req.supabase.auth.signInWithOtp({
                email: challenge.email,
                options: { shouldCreateUser: false }
            });
        } catch (err) {
            console.warn('[AUTH] Notice: Supabase resend signInWithOtp:', err);
        }
    }

    return sendSuccess(res, { success: true }, 'A new verification code has been sent to your email');
}));

export default router;
