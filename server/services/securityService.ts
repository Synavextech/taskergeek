import crypto from "crypto";
import { emailService } from "../email";
import { createAdminClient } from "../supabase";

export interface OTPChallenge {
  challengeToken: string;
  hashedCode: string;
  userId: string;
  email: string;
  userProfile: any;
  supabaseSession: any;
  ip: string;
  userAgent: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  lastSentAt: number;
  reasons: string[];
}

class SecurityService {
  private challenges = new Map<string, OTPChallenge>();
  private resetChallenges = new Map<string, {
    email: string;
    hashedCode: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: number;
    lastSentAt: number;
    verifiedToken?: string;
    verifiedExpiresAt?: number;
  }>();
  private supabaseAdmin = createAdminClient();

  /**
   * Generates a 6-digit secure numeric code and its SHA-256 hash.
   */
  private generateOTP(): { code: string; hashed: string } {
    const code = crypto.randomInt(100000, 999999).toString();
    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    return { code, hashed };
  }

  /**
   * Generates a high-entropy 256-bit token for tracking the challenge state.
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Creates a new OTP challenge, dispatches security email via custom SMTP, and persists to Supabase.
   */
  public async createChallenge(
    userProfile: any,
    supabaseSession: any,
    ip: string,
    userAgent: string,
    reasons: string[] = []
  ): Promise<{ challengeToken: string; email: string; expiresInSeconds: number }> {
    const { code, hashed } = this.generateOTP();
    const challengeToken = this.generateToken();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const challenge: OTPChallenge = {
      challengeToken,
      hashedCode: hashed,
      userId: userProfile.id,
      email: userProfile.email,
      userProfile,
      supabaseSession,
      ip,
      userAgent,
      attempts: 0,
      maxAttempts: 3,
      expiresAt,
      lastSentAt: Date.now(),
      reasons
    };

    // Store in-memory cache
    this.challenges.set(challengeToken, challenge);

    // Persist to Supabase auth_otp_challenges
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_otp_challenges')
          .upsert({
            challenge_token: challengeToken,
            user_id: userProfile.id,
            email: userProfile.email.toLowerCase().trim(),
            hashed_code: hashed,
            session_data: { userProfile, supabaseSession },
            ip,
            user_agent: userAgent,
            attempts: 0,
            max_attempts: 3,
            reasons,
            expires_at: new Date(expiresAt).toISOString(),
            last_sent_at: new Date().toISOString()
          }, { onConflict: 'challenge_token' });
      }
    } catch (dbErr) {
      console.warn('[SECURITY] Notice: Failed to persist challenge to DB:', dbErr);
    }

    // Clean up memory after 6 minutes
    setTimeout(() => {
      this.challenges.delete(challengeToken);
    }, 6 * 60 * 1000);

    // Send security alert email with the 6-digit code and request metadata via custom SMTP
    await emailService.sendSecurityOTP(userProfile.email, userProfile.name || "Geek", code, {
      ip,
      device: userAgent,
      reasons: reasons.join("; ")
    });

    console.log(`[SECURITY] OTP Challenge issued for user ${userProfile.email} (token: ${challengeToken.slice(0, 8)}...)`);

    return {
      challengeToken,
      email: userProfile.email,
      expiresInSeconds: 300
    };
  }

  /**
   * Retrieves an active challenge by its challenge token (checking memory then DB).
   */
  public async getChallenge(challengeToken: string): Promise<OTPChallenge | undefined> {
    const cached = this.challenges.get(challengeToken);
    if (cached) return cached;

    // Fallback to Supabase database
    try {
      if (this.supabaseAdmin) {
        const { data, error } = await this.supabaseAdmin
          .from('auth_otp_challenges')
          .select('*')
          .eq('challenge_token', challengeToken)
          .maybeSingle();

        if (!error && data) {
          const restored: OTPChallenge = {
            challengeToken: data.challenge_token,
            hashedCode: data.hashed_code,
            userId: data.user_id,
            email: data.email,
            userProfile: data.session_data?.userProfile,
            supabaseSession: data.session_data?.supabaseSession,
            ip: data.ip,
            userAgent: data.user_agent,
            attempts: data.attempts || 0,
            maxAttempts: data.max_attempts || 3,
            expiresAt: new Date(data.expires_at).getTime(),
            lastSentAt: new Date(data.last_sent_at).getTime(),
            reasons: data.reasons || []
          };
          this.challenges.set(challengeToken, restored);
          return restored;
        }
      }
    } catch (err) {
      console.warn('[SECURITY] Failed to hydrate challenge from DB:', err);
    }

    return undefined;
  }

  /**
   * Consumes and clears an active challenge from memory and database.
   */
  public async consumeChallenge(challengeToken: string): Promise<void> {
    this.challenges.delete(challengeToken);
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_otp_challenges')
          .delete()
          .eq('challenge_token', challengeToken);
      }
    } catch (err) {
      console.warn('[SECURITY] Error deleting challenge from DB:', err);
    }
  }

  /**
   * Verifies an entered candidate OTP against the stored challenge.
   */
  public async verifyChallenge(
    challengeToken: string,
    candidateCode: string
  ): Promise<{
    success: boolean;
    userProfile?: any;
    supabaseSession?: any;
    error?: string;
    attemptsRemaining?: number;
  }> {
    const challenge = await this.getChallenge(challengeToken);

    if (!challenge) {
      return {
        success: false,
        error: "Verification session expired or invalid. Please sign in again."
      };
    }

    if (Date.now() > challenge.expiresAt) {
      await this.consumeChallenge(challengeToken);
      return {
        success: false,
        error: "Verification code has expired. Please sign in again or request a new code."
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.consumeChallenge(challengeToken);
      return {
        success: false,
        error: "Maximum verification attempts exceeded. For security, please sign in again."
      };
    }

    const cleanInput = candidateCode ? candidateCode.replace(/\D/g, "").trim() : "";
    const candidateHash = crypto.createHash("sha256").update(cleanInput).digest("hex");

    if (candidateHash !== challenge.hashedCode) {
      challenge.attempts += 1;
      const remaining = challenge.maxAttempts - challenge.attempts;

      // Update attempt count in DB
      try {
        if (this.supabaseAdmin) {
          await this.supabaseAdmin
            .from('auth_otp_challenges')
            .update({ attempts: challenge.attempts })
            .eq('challenge_token', challengeToken);
        }
      } catch (err) {
        console.warn('[SECURITY] Error updating challenge attempts in DB:', err);
      }

      if (remaining <= 0) {
        await this.consumeChallenge(challengeToken);
        return {
          success: false,
          error: "Incorrect code. Maximum attempts exceeded. Challenge invalidated.",
          attemptsRemaining: 0
        };
      }

      return {
        success: false,
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        attemptsRemaining: remaining
      };
    }

    // Code matches: complete challenge and clean up
    await this.consumeChallenge(challengeToken);

    return {
      success: true,
      userProfile: challenge.userProfile,
      supabaseSession: challenge.supabaseSession
    };
  }

  /**
   * Resends a fresh OTP code for an active challenge (with 45s cooldown) via custom SMTP.
   */
  public async resendCode(challengeToken: string): Promise<{ success: boolean; error?: string }> {
    const challenge = await this.getChallenge(challengeToken);

    if (!challenge) {
      return { success: false, error: "Challenge session expired. Please sign in again." };
    }

    const elapsed = Date.now() - challenge.lastSentAt;
    if (elapsed < 45 * 1000) {
      const waitSec = Math.ceil((45 * 1000 - elapsed) / 1000);
      return { success: false, error: `Please wait ${waitSec} seconds before requesting a new code.` };
    }

    const { code, hashed } = this.generateOTP();
    challenge.hashedCode = hashed;
    challenge.attempts = 0;
    challenge.expiresAt = Date.now() + 5 * 60 * 1000;
    challenge.lastSentAt = Date.now();

    // Sync refreshed OTP to DB
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_otp_challenges')
          .update({
            hashed_code: hashed,
            attempts: 0,
            expires_at: new Date(challenge.expiresAt).toISOString(),
            last_sent_at: new Date().toISOString()
          })
          .eq('challenge_token', challengeToken);
      }
    } catch (err) {
      console.warn('[SECURITY] Failed to sync resent OTP to DB:', err);
    }

    await emailService.sendSecurityOTP(challenge.email, challenge.userProfile?.name || "Geek", code, {
      ip: challenge.ip,
      device: challenge.userAgent,
      reasons: challenge.reasons.join("; ")
    });

    console.log(`[SECURITY] Fresh OTP resent for user ${challenge.email} via SMTP`);
    return { success: true };
  }

  // ==========================================
  // PASSWORD RESET ONE-TIME PASSCODE (OTP)
  // ==========================================

  /**
   * Generates a 6-digit numeric password recovery OTP valid for 15 minutes.
   */
  public async createPasswordResetChallenge(
    email: string,
    userName: string = "User",
    ip: string = "unknown",
    userAgent: string = "unknown"
  ): Promise<{ success: boolean; expiresInMinutes: number; error?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    let existing = this.resetChallenges.get(normalizedEmail);

    if (!existing) {
      // Check DB
      try {
        if (this.supabaseAdmin) {
          const { data } = await this.supabaseAdmin
            .from('auth_password_reset_challenges')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            existing = {
              email: data.email,
              hashedCode: data.hashed_code,
              attempts: data.attempts || 0,
              maxAttempts: data.max_attempts || 5,
              expiresAt: new Date(data.expires_at).getTime(),
              lastSentAt: new Date(data.last_sent_at).getTime(),
              verifiedToken: data.verified_token,
              verifiedExpiresAt: data.verified_expires_at ? new Date(data.verified_expires_at).getTime() : undefined
            };
          }
        }
      } catch (err) {
        console.warn('[SECURITY] Failed to check reset challenge in DB:', err);
      }
    }

    if (existing && Date.now() - existing.lastSentAt < 45 * 1000) {
      const waitSec = Math.ceil((45 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
      return {
        success: false,
        expiresInMinutes: 15,
        error: `Please wait ${waitSec}s before requesting another reset code.`
      };
    }

    const { code, hashed } = this.generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const resetData = {
      email: normalizedEmail,
      hashedCode: hashed,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      lastSentAt: Date.now()
    };

    this.resetChallenges.set(normalizedEmail, resetData);

    // Persist to Supabase
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_password_reset_challenges')
          .upsert({
            email: normalizedEmail,
            hashed_code: hashed,
            attempts: 0,
            max_attempts: 5,
            expires_at: new Date(expiresAt).toISOString(),
            last_sent_at: new Date().toISOString()
          }, { onConflict: 'email' });
      }
    } catch (dbErr) {
      console.warn('[SECURITY] Failed to persist reset challenge to DB:', dbErr);
    }

    // Cleanup memory after 16 minutes
    setTimeout(() => {
      const cur = this.resetChallenges.get(normalizedEmail);
      if (cur && cur.expiresAt <= Date.now()) {
        this.resetChallenges.delete(normalizedEmail);
      }
    }, 16 * 60 * 1000);

    await emailService.sendPasswordResetOTP(normalizedEmail, userName, code, {
      ip,
      device: userAgent
    });

    console.log(`[SECURITY] Password reset OTP generated and sent to ${normalizedEmail} via SMTP (Expires in 15 mins)`);

    return {
      success: true,
      expiresInMinutes: 15
    };
  }

  /**
   * Verifies a 6-digit candidate password reset OTP and issues a single-use token.
   */
  public async verifyPasswordResetOTP(
    email: string,
    candidateCode: string
  ): Promise<{ success: boolean; resetToken?: string; error?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    let challenge = this.resetChallenges.get(normalizedEmail);

    if (!challenge) {
      try {
        if (this.supabaseAdmin) {
          const { data } = await this.supabaseAdmin
            .from('auth_password_reset_challenges')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            challenge = {
              email: data.email,
              hashedCode: data.hashed_code,
              attempts: data.attempts || 0,
              maxAttempts: data.max_attempts || 5,
              expiresAt: new Date(data.expires_at).getTime(),
              lastSentAt: new Date(data.last_sent_at).getTime(),
              verifiedToken: data.verified_token,
              verifiedExpiresAt: data.verified_expires_at ? new Date(data.verified_expires_at).getTime() : undefined
            };
            this.resetChallenges.set(normalizedEmail, challenge);
          }
        }
      } catch (err) {
        console.warn('[SECURITY] Failed to check reset challenge in DB:', err);
      }
    }

    if (!challenge) {
      return {
        success: false,
        error: "Password reset session not found or expired. Please request a new code."
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.resetChallenges.delete(normalizedEmail);
      try {
        if (this.supabaseAdmin) {
          await this.supabaseAdmin.from('auth_password_reset_challenges').delete().eq('email', normalizedEmail);
        }
      } catch (err) {}
      return {
        success: false,
        error: "Password reset code has expired (15 minute validity). Please request a new code."
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      this.resetChallenges.delete(normalizedEmail);
      try {
        if (this.supabaseAdmin) {
          await this.supabaseAdmin.from('auth_password_reset_challenges').delete().eq('email', normalizedEmail);
        }
      } catch (err) {}
      return {
        success: false,
        error: "Maximum verification attempts exceeded. Please request a new code."
      };
    }

    const cleanInput = candidateCode ? candidateCode.replace(/\D/g, "").trim() : "";
    const candidateHash = crypto.createHash("sha256").update(cleanInput).digest("hex");

    if (candidateHash !== challenge.hashedCode) {
      challenge.attempts += 1;
      const remaining = challenge.maxAttempts - challenge.attempts;

      try {
        if (this.supabaseAdmin) {
          await this.supabaseAdmin
            .from('auth_password_reset_challenges')
            .update({ attempts: challenge.attempts })
            .eq('email', normalizedEmail);
        }
      } catch (err) {}

      if (remaining <= 0) {
        this.resetChallenges.delete(normalizedEmail);
        try {
          if (this.supabaseAdmin) {
            await this.supabaseAdmin.from('auth_password_reset_challenges').delete().eq('email', normalizedEmail);
          }
        } catch (err) {}
        return {
          success: false,
          error: "Incorrect code. Maximum attempts reached. Please request a new code."
        };
      }
      return {
        success: false,
        error: `Incorrect reset code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
      };
    }

    // Code matches: issue a single-use high-entropy reset token valid for 10 minutes
    const resetToken = this.generateToken();
    challenge.verifiedToken = resetToken;
    challenge.verifiedExpiresAt = Date.now() + 10 * 60 * 1000;

    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_password_reset_challenges')
          .update({
            verified_token: resetToken,
            verified_expires_at: new Date(challenge.verifiedExpiresAt).toISOString()
          })
          .eq('email', normalizedEmail);
      }
    } catch (err) {}

    return {
      success: true,
      resetToken
    };
  }

  /**
   * Validates reset token or code and completes password reset, clearing the challenge.
   */
  public async validateAndConsumeReset(
    email: string,
    tokenOrCode: string
  ): Promise<{ success: boolean; error?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    let challenge = this.resetChallenges.get(normalizedEmail);

    if (!challenge) {
      try {
        if (this.supabaseAdmin) {
          const { data } = await this.supabaseAdmin
            .from('auth_password_reset_challenges')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            challenge = {
              email: data.email,
              hashedCode: data.hashed_code,
              attempts: data.attempts || 0,
              maxAttempts: data.max_attempts || 5,
              expiresAt: new Date(data.expires_at).getTime(),
              lastSentAt: new Date(data.last_sent_at).getTime(),
              verifiedToken: data.verified_token,
              verifiedExpiresAt: data.verified_expires_at ? new Date(data.verified_expires_at).getTime() : undefined
            };
          }
        }
      } catch (err) {}
    }

    if (!challenge) {
      return {
        success: false,
        error: "Reset session expired or invalid. Please request a new recovery code."
      };
    }

    const cleanToken = tokenOrCode?.trim();
    const isTokenMatch = challenge.verifiedToken && challenge.verifiedToken === cleanToken;
    const cleanInput = cleanToken.replace(/\D/g, "");
    const candidateHash = crypto.createHash("sha256").update(cleanInput).digest("hex");
    const isCodeMatch = candidateHash === challenge.hashedCode && Date.now() <= challenge.expiresAt;

    if (!isTokenMatch && !isCodeMatch) {
      return {
        success: false,
        error: "Invalid or expired password reset credentials."
      };
    }

    // Consume challenge
    this.resetChallenges.delete(normalizedEmail);
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('auth_password_reset_challenges')
          .delete()
          .eq('email', normalizedEmail);
      }
    } catch (err) {}

    return { success: true };
  }
}

export const securityService = new SecurityService();
