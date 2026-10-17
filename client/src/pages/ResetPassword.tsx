import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Steps: 'email' | 'otp' | 'success'
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 15-minute countdown timer (900 seconds)
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, secondsLeft]);

  // Auto-detect URL query parameters (e.g. ?email=...&code=...) or forward Supabase hash links
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get('email');
      const urlCode = searchParams.get('code') || searchParams.get('token');

      if (urlEmail) {
        setEmail(urlEmail);
      }
      if (urlCode) {
        const clean = urlCode.replace(/\D/g, '').trim();
        setOtpCode(clean);
        if (clean.length >= 6 && clean.length <= 10) {
          setStep('otp');
          setSecondsLeft(900);
        }
      }

      // If user landed here with Supabase recovery hash fragment, direct to /update-password
      if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token='))) {
        setLocation(`/update-password${window.location.hash}`);
      }
    } catch (err) {
      console.warn('[RESET_PASSWORD] URL param parse notice:', err);
    }
  }, [setLocation]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Step 1: Request Recovery Code / Link
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || 'Failed to send recovery code');
      }

      toast({
        title: "Recovery Instructions Dispatched",
        description: "A verification code and direct reset link have been dispatched to your email (expires in 15 mins).",
      });

      setStep('otp');
      setSecondsLeft(900); // 15 mins
      setResendCooldown(45); // 45s cooldown
    } catch (err: any) {
      console.error('[RESET_PASSWORD] Error sending OTP:', err);
      setError(err?.message || 'Failed to request password reset code. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || 'Failed to resend code');
      }

      toast({
        title: "New Code Dispatched",
        description: "A fresh 6-digit recovery code has been sent to your email.",
      });

      setSecondsLeft(900);
      setResendCooldown(45);
    } catch (err: any) {
      setError(err?.message || 'Could not resend code. Please wait a moment and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = otpCode.replace(/\D/g, '').trim();

    if (cleanCode.length < 6 || cleanCode.length > 10) {
      setError('Please enter a valid verification code (6 to 8 digits).');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit to custom backend verification endpoint
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Fallback: Try Supabase native OTP verification if backend challenge expired or direct Supabase mailer was used
        try {
          const { error: sbOtpError } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: cleanCode,
            type: 'recovery',
          });

          if (!sbOtpError) {
            const { error: sbUpdateError } = await supabase.auth.updateUser({
              password: newPassword,
            });

            if (!sbUpdateError) {
              setStep('success');
              toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
              });
              return;
            }
          }
        } catch {
          // ignore fallback error
        }

        throw new Error(data?.error?.message || data?.error || 'Verification failed. Please check the code.');
      }

      setStep('success');
      toast({
        title: "Password Updated",
        description: "Your new password is now active.",
      });
    } catch (err: any) {
      console.error('[RESET_PASSWORD] Submit error:', err);
      setError(err?.message || 'Invalid or expired verification code. Please try again or request a new code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[380px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">
            P
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {step === 'success' ? 'Password Updated' : 'Reset Password'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {step === 'email' && "Enter your registered email address to receive recovery instructions."}
            {step === 'otp' && `Enter the verification code sent to ${email} or click the direct link in your email.`}
            {step === 'success' && "Your password has been successfully updated. You may now log in to your account."}
          </p>
        </div>

        <CardContent className="p-0">
          {error && (
            <Alert variant="destructive" className="rounded-2xl text-xs mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* STEP 1: Enter Email */}
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="pl-10 rounded-xl h-11 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-xs sm:text-sm shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Recovery Instructions...
                  </span>
                ) : (
                  "Send Recovery Instructions"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={() => setLocation('/auth')}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Sign In
              </Button>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 'otp' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Timer & Expiry Notice */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>Code expires in:</span>
                </div>
                <span className={`font-mono font-bold ${secondsLeft < 120 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatTimer(secondsLeft)}
                </span>
              </div>

              {/* Recovery Code Field */}
              <div className="space-y-1.5">
                <label htmlFor="otpCode" className="text-xs font-semibold text-muted-foreground">
                  Recovery Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter code"
                    required
                    className="pl-10 font-mono tracking-widest text-base font-bold rounded-xl h-11 text-center"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-10 pr-10 rounded-xl h-11 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-10 pr-10 rounded-xl h-11 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-xs sm:text-sm shadow-md"
                disabled={isLoading || secondsLeft === 0}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>

              {/* Resend & Back controls */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('email')}
                  className="rounded-xl text-xs text-muted-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Change Email
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  className="rounded-xl text-xs text-accent font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'success' && (
            <div className="space-y-5 text-center">
              <div className="p-4 rounded-2xl bg-success/15 border border-success/30 text-success flex items-center gap-3 text-xs font-medium text-left">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Your password has been changed successfully. You can now log in with your updated credentials.</span>
              </div>

              <Button
                className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-xs sm:text-sm shadow-md"
                onClick={() => setLocation('/auth')}
              >
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}