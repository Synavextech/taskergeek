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
  private profiles = new Map<string, UserSecurityProfile>();
  private ipFailedAttempts = new Map<string, { count: number; lastTime: number }>();

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
  public recordFailure(email: string, ip: string) {
    const profile = this.getOrCreateProfile(email);
    profile.consecutiveFailures += 1;
    profile.lastFailureTimestamp = Date.now();

    const ipEntry = this.ipFailedAttempts.get(ip) || { count: 0, lastTime: Date.now() };
    ipEntry.count += 1;
    ipEntry.lastTime = Date.now();
    this.ipFailedAttempts.set(ip, ipEntry);
  }

  /**
   * Evaluates if a login attempt displays suspicious patterns.
   */
  public isSuspicious(
    userId: string,
    email: string,
    ip: string,
    userAgent: string
  ): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const profile = this.getOrCreateProfile(email);

    // 1. Multiple recent failed attempts prior to this successful password
    if (profile.consecutiveFailures >= 3) {
      const timeSinceLastFailure = Date.now() - (profile.lastFailureTimestamp || 0);
      if (timeSinceLastFailure < 15 * 60 * 1000) { // within 15 mins
        reasons.push(`Multiple recent failed login attempts (${profile.consecutiveFailures} attempts).`);
      }
    }

    // 2. High-volume IP failure velocity
    const ipRecord = this.ipFailedAttempts.get(ip);
    if (ipRecord && ipRecord.count >= 5 && Date.now() - ipRecord.lastTime < 15 * 60 * 1000) {
      reasons.push("High volume of suspicious authentication attempts originating from this IP.");
    }

    // 3. New device/browser or IP check if user has existing trusted history
    const hasHistory = profile.trustedDevices.size > 0 || profile.trustedIPs.size > 0;
    if (hasHistory) {
      const isKnownDevice = profile.trustedDevices.has(userAgent);
      const isKnownIP = profile.trustedIPs.has(ip);

      if (!isKnownDevice && !isKnownIP) {
        reasons.push("Unrecognized device and network location.");
      } else if (!isKnownDevice) {
        reasons.push("Login from a new or unrecognized browser/device.");
      }
    }

    // 4. Velocity check between recent sessions (jump from differing IPs within 10 minutes)
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
   */
  public recordSuccess(userId: string, email: string, ip: string, userAgent: string) {
    const profile = this.getOrCreateProfile(email);
    profile.consecutiveFailures = 0;
    profile.trustedDevices.add(userAgent);
    profile.trustedIPs.add(ip);

    profile.recentSessions.push({
      ip,
      userAgent,
      timestamp: Date.now()
    });

    // Keep session history to last 10 entries
    if (profile.recentSessions.length > 10) {
      profile.recentSessions.shift();
    }
  }

  /**
   * Reset consecutive failures for an email (e.g. after successful OTP verification).
   */
  public resetFailures(email: string) {
    const profile = this.getOrCreateProfile(email);
    profile.consecutiveFailures = 0;
  }
}

export const anomalyDetector = new AnomalyDetector();
