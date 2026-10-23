export interface SecurityEmailMetadata {
  ip: string;
  device: string;
  reasons?: string;
}

export interface PayoutOptionDetails {
  name: string;
  id: 'paypal' | 'payoneer' | 'airtm' | 'bank_transfer';
  identifierLabel: string;
  payoutFrequency: string;
  notes: string;
}

export const SUPPORTED_PAYOUT_OPTIONS: PayoutOptionDetails[] = [
  {
    name: "PayPal",
    id: "paypal",
    identifierLabel: "PayPal Account Email",
    payoutFrequency: "Biweekly automated batch cashout / Instant disbursement",
    notes: "Requires active and verified PayPal account email address."
  },
  {
    name: "Payoneer",
    id: "payoneer",
    identifierLabel: "Payoneer Registration Email",
    payoutFrequency: "Biweekly automated direct transfer",
    notes: "Suitable for global bank account disbursement and multicurrency balances."
  },
  {
    name: "AirTM",
    id: "airtm",
    identifierLabel: "AirTM User Account Email",
    payoutFrequency: "Biweekly automated wallet transfer",
    notes: "Fast digital dollar wallet for cross-border taskers."
  },
  {
    name: "Direct Bank Wire / Transfer",
    id: "bank_transfer",
    identifierLabel: "Beneficiary Account / Wire Reference",
    payoutFrequency: "Biweekly automated clearing house / international wire",
    notes: "Direct bank wire to verified domestic or international accounts."
  }
];

export const emailService = {
  /**
   * Sends a welcome email with payment configuration options attachment.
   */
  sendWelcomeEmail: async (to: string, name: string): Promise<boolean> => {
    try {
      console.log(`\n======================================================`);
      console.log(`📬 [WELCOME EMAIL - PROTASKER GEEK]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Subject: Welcome to ProTaskerGeek - Specialist Onboarding & Payout Configuration`);
      console.log(`\nATTACHMENT: [Payout-Options-Configuration.pdf / HTML Manifest]`);
      console.log(`Available Integrated Payout Options for User to Submit Account Email:`);
      SUPPORTED_PAYOUT_OPTIONS.forEach((opt, idx) => {
        console.log(`  ${idx + 1}. [${opt.name}] - Identifier: ${opt.identifierLabel} (${opt.payoutFrequency})`);
      });
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending welcome email:", error);
      return false;
    }
  },

  /**
   * Notifies user about orientation completion and next steps.
   */
  sendOrientationCompleteEmail: async (to: string, name: string): Promise<boolean> => {
    try {
      console.log(`\n======================================================`);
      console.log(`🎓 [ORIENTATION COMPLETE NOTIFICATION]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Message: Orientation benchmarks successfully achieved. Please complete your Grammar & Skill Assessments.`);
      console.log(`Supported Payout Methods: PayPal, Payoneer, AirTM, Direct Bank Wire.`);
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending orientation complete email:", error);
      return false;
    }
  },

  /**
   * Notifies user when an assessment has been successfully passed.
   */
  sendAssessmentPassedEmail: async (
    to: string,
    name: string,
    assessmentType: "grammar" | "hourly" | "discipline" | "skill_upgrade",
    score: number,
    total: number,
    extraDetails?: string
  ): Promise<boolean> => {
    try {
      console.log(`\n======================================================`);
      console.log(`🏆 [ASSESSMENT PASSED NOTIFICATION - PROTASKER GEEK]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Assessment: ${assessmentType.toUpperCase()}`);
      console.log(`Score: ${score}/${total} (PASSED)`);
      if (extraDetails) console.log(`Details: ${extraDetails}`);
      console.log(`Status: Platform permissions and credentialing updated successfully.`);
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending assessment passed email:", error);
      return false;
    }
  },

  /**
   * Dispatches failed login attempt alert or 3-attempt account blockage warning.
   */
  sendFailedLoginAlertEmail: async (
    to: string,
    name: string,
    attemptCount: number,
    metadata: SecurityEmailMetadata
  ): Promise<boolean> => {
    try {
      const timestamp = new Date().toUTCString();
      const isBlocked = attemptCount >= 3;

      console.log(`\n======================================================`);
      console.log(isBlocked ? `🚨 [ACCOUNT TEMPORARILY LOCKED - 3 FAILED ATTEMPTS]` : `⚠️ [SECURITY ALERT - FAILED LOGIN ATTEMPT ${attemptCount}]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Time: ${timestamp}`);
      console.log(`IP Address: ${metadata.ip}`);
      console.log(`Client Device: ${metadata.device}`);
      console.log(`Consecutive Failures: ${attemptCount}`);
      if (isBlocked) {
        console.log(`Action: Account temporarily locked for 15 minutes to prevent unauthorized access.`);
        console.log(`Instruction: If this wasn't you, reset your password or contact support.`);
      } else {
        console.log(`Warning: Failed password entry detected. Account will be temporarily locked after 3 failed attempts.`);
      }
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending failed login alert email:", error);
      return false;
    }
  },

  /**
   * Sends a 6-digit One-Time Security Passcode upon suspicious authentication activity.
   */
  sendSecurityOTP: async (
    to: string,
    name: string,
    otpCode: string,
    metadata: SecurityEmailMetadata
  ): Promise<boolean> => {
    try {
      const timestamp = new Date().toUTCString();
      console.log(`\n======================================================`);
      console.log(`🔐 [SECURITY ALERT - PROTASKER GEEK]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Time: ${timestamp}`);
      console.log(`IP Address: ${metadata.ip}`);
      console.log(`Device / Client: ${metadata.device}`);
      if (metadata.reasons) console.log(`Triggers: ${metadata.reasons}`);
      console.log(`ONE-TIME AUTHENTICATION CODE: >>> ${otpCode} <<< (Expires in 5 minutes)`);
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending security OTP:", error);
      return false;
    }
  },

  /**
   * Sends a 6-digit One-Time Passcode for password recovery.
   * Valid for 15 minutes.
   */
  sendPasswordResetOTP: async (
    to: string,
    name: string,
    otpCode: string,
    metadata?: SecurityEmailMetadata
  ): Promise<boolean> => {
    try {
      const timestamp = new Date().toUTCString();
      console.log(`\n======================================================`);
      console.log(`🔑 [PASSWORD RESET - ONE-TIME PASSCODE (OTP)]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Time: ${timestamp}`);
      if (metadata?.ip) console.log(`Requested IP: ${metadata.ip}`);
      if (metadata?.device) console.log(`Requested Client: ${metadata.device}`);
      console.log(`6-DIGIT RECOVERY CODE: >>> ${otpCode} <<< (Expires in 15 minutes)`);
      console.log(`======================================================\n`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending password reset OTP:", error);
      return false;
    }
  }
};