import { createAdminClient } from "../supabase";

export interface DeviceSession {
  ip: string;
  userAgent: string;
  timestamp: number;
}

export interface UserSecurityProfile {
  trustedDevices: Set<string>;
  trustedIPs: Set<string>;
  recentSessions: DeviceSession[];
  consecutiveFailures: number;
  lastFailureTimestamp?: number;
}

class AnomalyDetector {
  // In-memory cache for fast hot-path lookups
  private profiles = new Map<string, UserSecurityProfile>();
  private ipFailedAttempts = new Map<string, { count: number; lastTime: number }>();
  private supabaseAdmin = createAdminClient();

  private getOrCreateProfile(identifier: string): UserSecurityProfile {
    const key = identifier.toLowerCase().trim();
    if (!this.profiles.has(key)) {
      this.profiles.set(key, {
        trustedDevices: new Set(),
        trustedIPs: new Set(),
        recentSessions: [],
        consecutiveFailures: 0,
      });
    }
    return this.profiles.get(key)!;
  }

  /**
   * Tracks a failed login attempt for an email/IP.
   */
  public async recordFailure(email: string, ip: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = this.getOrCreateProfile(normalizedEmail);
    profile.consecutiveFailures += 1;
    profile.lastFailureTimestamp = Date.now();

    const ipEntry = this.ipFailedAttempts.get(ip) || { count: 0, lastTime: Date.now() };
    ipEntry.count += 1;
    ipEntry.lastTime = Date.now();
    this.ipFailedAttempts.set(ip, ipEntry);

    // Persist failure to database if possible
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('user_trusted_devices')
          .update({
            consecutive_failures: profile.consecutiveFailures,
            last_failure_at: new Date().toISOString()
          })
          .eq('email', normalizedEmail);
      }
    } catch (err) {
      console.warn('[ANOMALY] Failed to sync failure count to DB:', err);
    }
  }

  /**
   * Evaluates if a login attempt displays suspicious patterns.
   * Checks both active in-memory cache and persisted Supabase devices.
   */
  public async isSuspicious(
    userId: string,
    email: string,
    ip: string,
    userAgent: string
  ): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const normalizedEmail = email.toLowerCase().trim();
    const profile = this.getOrCreateProfile(normalizedEmail);

    // 1. Check database for known devices if in-memory cache is cold
    let dbDevices: any[] = [];
    try {
      if (this.supabaseAdmin) {
        const { data, error } = await this.supabaseAdmin
          .from('user_trusted_devices')
          .select('ip, user_agent, consecutive_failures, last_failure_at')
          .eq('email', normalizedEmail);

        if (!error && data && data.length > 0) {
          dbDevices = data;
          // Hydrate memory cache with DB records
          data.forEach((row) => {
            if (row.ip) profile.trustedIPs.add(row.ip);
            if (row.user_agent) profile.trustedDevices.add(row.user_agent);
          });
        }
      }
    } catch (dbErr) {
      console.warn('[ANOMALY] Error hydrating trusted devices from DB:', dbErr);
    }

    // 2. Multiple recent failed attempts prior to this successful password
    if (profile.consecutiveFailures >= 3) {
      const timeSinceLastFailure = Date.now() - (profile.lastFailureTimestamp || 0);
      if (timeSinceLastFailure < 15 * 60 * 1000) { // within 15 mins
        reasons.push(`Multiple recent failed login attempts (${profile.consecutiveFailures} attempts).`);
      }
    }

    // 3. High-volume IP failure velocity
    const ipRecord = this.ipFailedAttempts.get(ip);
    if (ipRecord && ipRecord.count >= 5 && Date.now() - ipRecord.lastTime < 15 * 60 * 1000) {
      reasons.push("High volume of suspicious authentication attempts originating from this IP.");
    }

    // 4. New device/browser or IP check if user has existing trusted history
    const hasHistory = profile.trustedDevices.size > 0 || profile.trustedIPs.size > 0 || dbDevices.length > 0;
    if (hasHistory) {
      const isKnownDevice = profile.trustedDevices.has(userAgent);
      const isKnownIP = profile.trustedIPs.has(ip);

      if (!isKnownDevice && !isKnownIP) {
        reasons.push("Unrecognized device and network location.");
      } else if (!isKnownDevice) {
        reasons.push("Login from a new or unrecognized browser/device.");
      }
    }

    // 5. Velocity check between recent sessions (jump from differing IPs within 10 minutes)
    if (profile.recentSessions.length > 0) {
      const lastSession = profile.recentSessions[profile.recentSessions.length - 1];
      const timeDiffMinutes = (Date.now() - lastSession.timestamp) / (1000 * 60);

      if (lastSession.ip !== ip && timeDiffMinutes < 10) {
        reasons.push("Impossible travel / rapid geographic IP jump detected within 10 minutes.");
      }
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Trust device and IP upon successful authentication or OTP verification.
   * Persists record to Supabase.
   */
  public async recordSuccess(userId: string, email: string, ip: string, userAgent: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = this.getOrCreateProfile(normalizedEmail);
    profile.consecutiveFailures = 0;
    profile.trustedDevices.add(userAgent);
    profile.trustedIPs.add(ip);

    profile.recentSessions.push({
      ip,
      userAgent,
      timestamp: Date.now()
    });

    if (profile.recentSessions.length > 10) {
      profile.recentSessions.shift();
    }

    // Persist to Supabase user_trusted_devices
    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('user_trusted_devices')
          .upsert({
            user_id: userId,
            email: normalizedEmail,
            ip,
            user_agent: userAgent,
            consecutive_failures: 0,
            last_seen_at: new Date().toISOString()
          }, { onConflict: 'email,ip,user_agent' });
      }
    } catch (err) {
      console.warn('[ANOMALY] Error saving trusted device to DB:', err);
    }
  }

  /**
   * Reset consecutive failures for an email (e.g. after successful OTP verification).
   */
  public async resetFailures(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = this.getOrCreateProfile(normalizedEmail);
    profile.consecutiveFailures = 0;

    try {
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('user_trusted_devices')
          .update({ consecutive_failures: 0 })
          .eq('email', normalizedEmail);
      }
    } catch (err) {
      console.warn('[ANOMALY] Error resetting failures in DB:', err);
    }
  }
}

export const anomalyDetector = new AnomalyDetector();
