export interface SecurityEmailMetadata {
  ip: string;
  device: string;
  reasons?: string;
}

export const emailService = {
  /**
   * Sends a welcome email to the user.
   */
  sendWelcomeEmail: async (to: string, name: string): Promise<boolean> => {
    try {
      console.log(`[EmailService] Triggering Welcome Email for: ${name} (${to})`);
      return true;
    } catch (error) {
      console.error("[EmailService] Error sending welcome email:", error);
      return false;
    }
  },

  /**
   * Notifies user about orientation completion.
   */
  sendOrientationCompleteEmail: async (to: string, name: string): Promise<boolean> => {
    try {
      console.log(`[EmailService] Orientation complete email for ${name} (${to})`);
      return true;
    } catch (error) {
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

      // If an external email provider or edge function is configured:
      /*
      await fetch(process.env.EMAIL_API_URL || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          to,
          subject: 'Action Required: Security Verification Code - ProTasker Geek',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #033d26;">ProTasker Geek Security Alert</h2>
              <p>Hi ${name},</p>
              <p>We detected an unrecognized sign-in attempt to your account:</p>
              <ul>
                <li><strong>Time:</strong> ${timestamp}</li>
                <li><strong>IP Address:</strong> ${metadata.ip}</li>
                <li><strong>Device:</strong> ${metadata.device}</li>
              </ul>
              <p>To verify this was you, please enter this 6-digit verification code:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #96711d; background: #f8fafc; padding: 14px; text-align: center; border-radius: 8px;">
                ${otpCode}
              </div>
              <p style="color: #64748b; font-size: 13px; margin-top: 16px;">This code will expire in 5 minutes. If this was not you, please secure your account immediately.</p>
            </div>
          `
        })
      });
      */

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