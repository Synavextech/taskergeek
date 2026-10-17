import crypto from "crypto";
import { emailService } from "../email";

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
   * Creates a new OTP challenge, dispatches security email, and tracks in memory.
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

    this.challenges.set(challengeToken, challenge);

    // Clean up expired challenge after 6 minutes
    setTimeout(() => {
      this.challenges.delete(challengeToken);
    }, 6 * 60 * 1000);

    // Send security alert email with the 6-digit code and request metadata
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
   * Verifies an entered candidate OTP against the stored challenge.
   */
  public verifyChallenge(
    challengeToken: string,
    candidateCode: string
  ): {
    success: boolean;
    userProfile?: any;
    supabaseSession?: any;
    error?: string;
    attemptsRemaining?: number;
  } {
    const challenge = this.challenges.get(challengeToken);

    if (!challenge) {
      return {
        success: false,
        error: "Verification session expired or invalid. Please sign in again."
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeToken);
      return {
        success: false,
        error: "Verification code has expired. Please sign in again or request a new code."
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      this.challenges.delete(challengeToken);
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

      if (remaining <= 0) {
        this.challenges.delete(challengeToken);
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
    this.challenges.delete(challengeToken);

    return {
      success: true,
      userProfile: challenge.userProfile,
      supabaseSession: challenge.supabaseSession
    };
  }

  /**
   * Resends a fresh OTP code for an active challenge (with 45s cooldown).
   */
  public async resendCode(challengeToken: string): Promise<{ success: boolean; error?: string }> {
    const challenge = this.challenges.get(challengeToken);

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

    await emailService.sendSecurityOTP(challenge.email, challenge.userProfile?.name || "Geek", code, {
      ip: challenge.ip,
      device: challenge.userAgent,
      reasons: challenge.reasons.join("; ")
    });

    console.log(`[SECURITY] Fresh OTP resent for user ${challenge.email}`);
    return { success: true };
  }

  // ==========================================
  // PASSWORD RESET ONE-TIME PASSCODE (OTP)
  // ==========================================
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
    const existing = this.resetChallenges.get(normalizedEmail);

    if (existing && Date.now() - existing.lastSentAt < 45 * 1000) {
      const waitSec = Math.ceil((45 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
      return {
        success: false,
        expiresInMinutes: 15,
        error: `Please wait ${waitSec}s before requesting another reset code.`
      };
    }

    const { code, hashed } = this.generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes per specification

    this.resetChallenges.set(normalizedEmail, {
      email: normalizedEmail,
      hashedCode: hashed,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      lastSentAt: Date.now()
    });

    // Cleanup after 16 minutes
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

    console.log(`[SECURITY] Password reset OTP generated for ${normalizedEmail} (Expires in 15 mins)`);

    return {
      success: true,
      expiresInMinutes: 15
    };
  }

  /**
   * Verifies a 6-digit candidate password reset OTP and issues a single-use token.
   */
  public verifyPasswordResetOTP(
    email: string,
    candidateCode: string
  ): { success: boolean; resetToken?: string; error?: string } {
    const normalizedEmail = email.toLowerCase().trim();
    const challenge = this.resetChallenges.get(normalizedEmail);

    if (!challenge) {
      return {
        success: false,
        error: "Password reset session not found or expired. Please request a new code."
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.resetChallenges.delete(normalizedEmail);
      return {
        success: false,
        error: "Password reset code has expired (15 minute validity). Please request a new code."
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      this.resetChallenges.delete(normalizedEmail);
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
      if (remaining <= 0) {
        this.resetChallenges.delete(normalizedEmail);
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

    return {
      success: true,
      resetToken
    };
  }

  /**
   * Validates reset token or code and completes password reset, clearing the challenge.
   */
  public validateAndConsumeReset(
    email: string,
    tokenOrCode: string
  ): { success: boolean; error?: string } {
    const normalizedEmail = email.toLowerCase().trim();
    const challenge = this.resetChallenges.get(normalizedEmail);

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
    return { success: true };
  }
}

export const securityService = new SecurityService();

