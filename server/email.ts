import nodemailer from "nodemailer";

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

// Initialize SMTP Transporter
const smtpHost = process.env.SMTP_HOST || "mail.privateemail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER || "support@protaskergeek.com";
const smtpPass = process.env.SMTP_PASS || "";
const smtpSenderName = process.env.SMTP_FROM || "ProTasker.Geek Support";
const fromHeader = `"${smtpSenderName}" <${smtpUser}>`;

const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error("[EmailService] SMTP connection verification failed:", error.message);
    } else {
      console.log(`[EmailService] SMTP connected successfully via ${smtpHost}:${smtpPort} as ${smtpUser}`);
    }
  });
} else {
  console.warn("[EmailService] SMTP credentials not provided. Emails will fall back to console logging.");
}

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

      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: "Welcome to ProTaskerGeek - Specialist Onboarding",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0;">Welcome to ProTaskerGeek, ${name}!</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                We are thrilled to have you join our elite specialist network. Your account has been registered and is undergoing initial onboarding.
              </p>
              <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e293b; font-weight: 600;">Next Steps:</p>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #475569; font-size: 14px;">
                  <li>Complete your onboarding orientation.</li>
                  <li>Pass the standard grammar & skill assessments to unlock tasks.</li>
                  <li>Configure your preferred payout option in your profile.</li>
                </ul>
              </div>
              <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                If you have questions, reply directly to this email or visit our help center.
              </p>
            </div>
          `
        });
      }

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
      console.log(`🎓 [ORIENTATION COMPLETE] Notifying ${to}`);
      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: "Orientation Completed - ProTaskerGeek",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a;">Orientation Complete!</h2>
              <p style="color: #475569; font-size: 15px;">Hello ${name},</p>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                You have successfully completed your orientation benchmarks. Please proceed to complete your Grammar & Skill Assessments to begin accepting tasks.
              </p>
            </div>
          `
        });
      }
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
      console.log(`🏆 [ASSESSMENT PASSED] ${to} - ${assessmentType}`);
      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `Assessment Passed: ${assessmentType.toUpperCase()} - ProTaskerGeek`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #16a34a;">Congratulations, ${name}!</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                You passed the <strong>${assessmentType.toUpperCase()}</strong> assessment with a score of <strong>${score}/${total}</strong>.
              </p>
              ${extraDetails ? `<p style="color: #64748b; font-size: 14px;">${extraDetails}</p>` : ''}
              <p style="color: #475569; font-size: 15px;">Your platform permissions and task credentials have been updated.</p>
            </div>
          `
        });
      }
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

      console.log(`⚠️ [SECURITY ALERT] Failed login (${attemptCount}) for ${to}`);

      if (transporter) {
        const subject = isBlocked
          ? "🚨 Security Alert: Account Temporarily Locked - ProTaskerGeek"
          : `⚠️ Security Alert: Failed Login Attempt (${attemptCount}/3) - ProTaskerGeek`;

        await transporter.sendMail({
          from: fromHeader,
          to,
          subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #fffaf5;">
              <h2 style="color: #c2410c; margin-top: 0;">${isBlocked ? "Account Temporarily Locked" : "Security Alert: Failed Login Attempt"}</h2>
              <p style="color: #431407; font-size: 15px; line-height: 1.6;">
                Hello ${name}, a failed login attempt was detected for your account.
              </p>
              <div style="background: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #431407;">
                <p style="margin: 4px 0;"><strong>Time:</strong> ${timestamp}</p>
                <p style="margin: 4px 0;"><strong>IP Address:</strong> ${metadata.ip}</p>
                <p style="margin: 4px 0;"><strong>Device:</strong> ${metadata.device}</p>
                <p style="margin: 4px 0;"><strong>Consecutive Failures:</strong> ${attemptCount} / 3</p>
              </div>
              <p style="color: #7c2d12; font-size: 14px; line-height: 1.6;">
                ${isBlocked
                  ? "Your account has been temporarily locked for 15 minutes to protect against unauthorized access. If this was not you, please reset your password immediately."
                  : "If you did not attempt this login, your credentials may be compromised. Please review your account security immediately."
                }
              </p>
            </div>
          `
        });
      }

      return true;
    } catch (error) {
      console.error("[EmailService] Error sending failed login alert email:", error);
      return false;
    }
  },

  /**
   * Sends a 6-digit One-Time Security Passcode upon new device or suspicious authentication activity.
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
      console.log(`🔐 [SECURITY OTP EMAIL DISPATCH - PROTASKER GEEK]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Time: ${timestamp}`);
      console.log(`IP Address: ${metadata.ip}`);
      console.log(`Device / Client: ${metadata.device}`);
      if (metadata.reasons) console.log(`Triggers: ${metadata.reasons}`);
      console.log(`ONE-TIME AUTHENTICATION CODE: >>> ${otpCode} <<< (Expires in 5 minutes)`);
      console.log(`======================================================\n`);

      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `${otpCode} is your ProTaskerGeek security verification code`,
          text: `Hello ${name},\n\nA login attempt from an unrecognized device or location requires verification.\n\nYour 6-digit verification code: ${otpCode}\n(This code expires in 5 minutes)\n\nIP Address: ${metadata.ip}\nDevice: ${metadata.device}\n\nIf you did not initiate this login, please change your password immediately.\n\n- The ProTaskerGeek Security Team`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">ProTaskerGeek</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Device Verification & Authentication</p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                  A login attempt was initiated from an unrecognized device, browser, or network location. Please use the verification code below to authorize this session:
                </p>

                <!-- OTP Code Display Card -->
                <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">Your One-Time Code</span>
                  <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7; user-select: all;">
                    ${otpCode}
                  </div>
                  <span style="display: block; font-size: 13px; color: #94a3b8; margin-top: 8px;">Valid for 5 minutes only</span>
                </div>

                <!-- Session Metadata -->
                <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; font-size: 12px; color: #475569; margin-bottom: 24px;">
                  <p style="margin: 3px 0;"><strong>Request Time:</strong> ${timestamp}</p>
                  <p style="margin: 3px 0;"><strong>IP Address:</strong> ${metadata.ip}</p>
                  <p style="margin: 3px 0;"><strong>Browser / Device:</strong> ${metadata.device}</p>
                  ${metadata.reasons ? `<p style="margin: 3px 0;"><strong>Reason:</strong> ${metadata.reasons}</p>` : ''}
                </div>

                <p style="color: #dc2626; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
                  ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. ProTaskerGeek staff will never ask for your verification code.
                </p>
                <p style="color: #64748b; font-size: 13px; margin: 0;">
                  If this was not you, please log in and change your password immediately or contact our security department at <a href="mailto:${smtpUser}" style="color: #0284c7;">${smtpUser}</a>.
                </p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ProTaskerGeek. All rights reserved.
              </div>
            </div>
          `
        });
        console.log(`[EmailService] OTP email successfully dispatched to ${to} via SMTP`);
      }

      return true;
    } catch (error) {
      console.error("[EmailService] Error sending security OTP via SMTP:", error);
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
      console.log(`🔑 [PASSWORD RESET OTP DISPATCH - PROTASKER GEEK]`);
      console.log(`To: ${to} (${name})`);
      console.log(`Time: ${timestamp}`);
      if (metadata?.ip) console.log(`Requested IP: ${metadata.ip}`);
      if (metadata?.device) console.log(`Requested Client: ${metadata.device}`);
      console.log(`6-DIGIT RECOVERY CODE: >>> ${otpCode} <<< (Expires in 15 minutes)`);
      console.log(`======================================================\n`);

      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `${otpCode} is your ProTaskerGeek password reset code`,
          text: `Hello ${name},\n\nA password reset request was received for your ProTaskerGeek account.\n\nYour 6-digit recovery code: ${otpCode}\n(This code expires in 15 minutes)\n\nIf you did not request this, please disregard this email.\n\n- The ProTaskerGeek Team`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">ProTaskerGeek</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Password Recovery Assistance</p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                  We received a request to reset the password for your account. Use the one-time code below to proceed with setting a new password:
                </p>

                <!-- Code Card -->
                <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">Password Reset Code</span>
                  <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7; user-select: all;">
                    ${otpCode}
                  </div>
                  <span style="display: block; font-size: 13px; color: #94a3b8; margin-top: 8px;">Valid for 15 minutes</span>
                </div>

                ${metadata?.ip ? `
                <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #475569; margin-bottom: 20px;">
                  <p style="margin: 2px 0;"><strong>Requested from IP:</strong> ${metadata.ip}</p>
                  ${metadata.device ? `<p style="margin: 2px 0;"><strong>Device:</strong> ${metadata.device}</p>` : ''}
                </div>
                ` : ''}

                <p style="color: #64748b; font-size: 13px; margin: 0;">
                  If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ProTaskerGeek. All rights reserved.
              </div>
            </div>
          `
        });
        console.log(`[EmailService] Password reset OTP successfully dispatched to ${to} via SMTP`);
      }

      return true;
    } catch (error) {
      console.error("[EmailService] Error sending password reset OTP via SMTP:", error);
      return false;
    }
  },

  /**
   * Notifies user that their submitted task has been approved and reward credited.
   */
  sendTaskApprovedEmail: async (
    to: string,
    name: string,
    taskTitle: string,
    reward: number,
    qualityRating: number,
    newBalance?: string
  ): Promise<boolean> => {
    try {
      console.log(`🎉 [TASK APPROVED] Notifying ${to} for "${taskTitle}" ($${reward.toFixed(2)})`);
      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `✅ Task Approved: "${taskTitle}" - $${reward.toFixed(2)} Credited!`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 6px;">ProTaskerGeek</h1>
                <span style="display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 600; border-radius: 9999px;">
                  Task Approved & Funded
                </span>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  Great job! Your submission for <strong>${taskTitle}</strong> has been reviewed and approved by our quality moderation team.
                </p>

                <!-- Approval Details Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Reward Earned:</td>
                      <td style="padding: 6px 0; font-weight: 700; color: #16a34a; text-align: right;">+$${reward.toFixed(2)} USD</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Quality Rating:</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">⭐ ${qualityRating} / 5.0</td>
                    </tr>
                    ${newBalance ? `
                    <tr style="border-top: 1px dashed #cbd5e1;">
                      <td style="padding: 10px 0 4px; color: #64748b; font-weight: 600;">Available Balance:</td>
                      <td style="padding: 10px 0 4px; font-weight: 700; color: #0f172a; text-align: right;">$${newBalance} USD</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${process.env.PRODUCTION_URL || 'https://protaskergeek.com'}/wallet" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);">
                    View Wallet & Withdraw
                  </a>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                  Keep up the great work! Consistent high ratings unlock high-tier and hourly project tasks.
                </p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ProTaskerGeek. All rights reserved.
              </div>
            </div>
          `
        });
        console.log(`[EmailService] Task approval email dispatched to ${to}`);
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending task approval email:", error);
      return false;
    }
  },

  /**
   * Notifies user that their submitted task was rejected or requires revision.
   */
  sendTaskRejectedEmail: async (
    to: string,
    name: string,
    taskTitle: string,
    reason: string,
    qualityRating?: number
  ): Promise<boolean> => {
    try {
      console.log(`⚠️ [TASK REJECTED] Notifying ${to} for "${taskTitle}"`);
      if (transporter) {
        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `Submission Feedback: "${taskTitle}" - ProTaskerGeek`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #fed7aa; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 6px;">ProTaskerGeek</h1>
                <span style="display: inline-block; padding: 4px 12px; background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 600; border-radius: 9999px;">
                  Submission Status Update
                </span>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  Your submission for <strong>${taskTitle}</strong> could not be approved at this time.
                </p>

                <!-- Feedback Card -->
                <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                  <p style="margin: 0; color: #9a3412; font-weight: 600; font-size: 13px;">Reviewer Feedback & Reason:</p>
                  <p style="margin: 6px 0 0; color: #431407; font-size: 14px; line-height: 1.5;">${reason}</p>
                  ${typeof qualityRating === 'number' ? `<p style="margin: 8px 0 0; color: #9a3412; font-size: 12px;">Quality Score: ${qualityRating}/5</p>` : ''}
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">
                  If this was a dispute or you have additional proof, you may reach out to our WhatsApp Tasking Desk or platform support.
                </p>

                <div style="text-align: center;">
                  <a href="${process.env.PRODUCTION_URL || 'https://protaskergeek.com'}/tasks" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 10px;">
                    View Available Tasks
                  </a>
                </div>
              </div>

              <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ProTaskerGeek. All rights reserved.
              </div>
            </div>
          `
        });
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending task rejected email:", error);
      return false;
    }
  },

  /**
   * Notifies user regarding withdrawal processing or status changes.
   */
  sendWithdrawalStatusEmail: async (
    to: string,
    name: string,
    amount: string | number,
    status: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      console.log(`💳 [WITHDRAWAL ${status.toUpperCase()}] Notifying ${to} ($${amount})`);
      if (transporter) {
        const isCompleted = status === 'completed';
        const isFailed = status === 'failed' || status === 'rejected';

        await transporter.sendMail({
          from: fromHeader,
          to,
          subject: `Withdrawal ${status.toUpperCase()}: $${amount} USD - ProTaskerGeek`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 6px;">ProTaskerGeek</h1>
                <span style="display: inline-block; padding: 4px 12px; background: ${isCompleted ? '#dcfce7' : isFailed ? '#fee2e2' : '#fef9c3'}; color: ${isCompleted ? '#166534' : isFailed ? '#991b1b' : '#854d0e'}; font-size: 12px; font-weight: 600; border-radius: 9999px;">
                  Withdrawal ${status.toUpperCase()}
                </span>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  Your withdrawal request of <strong>$${amount} USD</strong> has been updated to <strong>${status}</strong>.
                </p>

                ${notes ? `
                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 13px;">Processing Note:</p>
                  <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${notes}</p>
                </div>
                ` : ''}

                <div style="text-align: center; margin-top: 24px;">
                  <a href="${process.env.PRODUCTION_URL || 'https://protaskergeek.com'}/wallet" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 10px;">
                    Check Wallet Balance
                  </a>
                </div>
              </div>

              <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ProTaskerGeek. All rights reserved.
              </div>
            </div>
          `
        });
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending withdrawal status email:", error);
      return false;
    }
  }
};