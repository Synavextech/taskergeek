import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Mail, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, Loader2, Sparkles, RefreshCw } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, supabaseUser } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize email from URL or session
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get('email');
      const urlCode = searchParams.get('code') || searchParams.get('token');

      if (urlEmail) {
        setEmail(urlEmail);
      } else if (supabaseUser?.email) {
        setEmail(supabaseUser.email);
      }

      if (urlCode) {
        setCode(urlCode.replace(/\D/g, '').trim());
      }
    } catch {
      // Ignore URL parse error
    }
  }, [supabaseUser]);

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

  // Handle entering verification code directly
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.replace(/\D/g, "").trim();
    if (!email || !email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    if (cleanCode.length < 6 || cleanCode.length > 10) {
      setError("Please enter a valid verification code (6 to 8 digits).");
      return;
    }

    setIsVerifyingCode(true);
    try {
      // 1. Try our backend API endpoint
      const response = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: cleanCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Fallback: Try client Supabase verifyOtp directly
        const { data: sbData, error: sbError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanCode,
          type: 'signup',
        });

        if (sbError || !sbData?.user) {
          throw new Error(data?.error?.message || sbError?.message || "Invalid or expired confirmation code.");
        }
      }

      toast({
        title: "Email Confirmed Successfully!",
        description: "Your account is now active. You may now sign in.",
      });

      setTimeout(() => {
        setLocation('/auth');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please check the code or request a new one.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Handle Resending Confirmation Email
  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    if (!email || !email.trim()) {
      setError("Please enter your email address to receive confirmation instructions.");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || 'Failed to resend confirmation email');
      }

      toast({
        title: "Confirmation Email Sent",
        description: "A fresh confirmation link and code have been sent to your email.",
      });
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend confirmation email. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  // Handle checking confirmation status
  const handleCheckStatus = async () => {
    setError(null);
    setIsCheckingStatus(true);
    try {
      const { data: authUser, error: authErr } = await supabase.auth.getUser();
      if (authUser?.user?.email_confirmed_at) {
        toast({
          title: "Email Confirmed!",
          description: "Your email has been verified. Directing to your workspace...",
        });
        setTimeout(() => {
          setLocation('/home');
        }, 1200);
      } else {
        toast({
          title: "Confirmation Pending",
          description: "We haven't received your confirmation yet. Please click the link in your email or enter the code above.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Status Check Error",
        description: "Unable to check confirmation status at this moment.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[380px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Verify Your Email
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Please confirm your email address to activate your account and complete your agreement to our Terms & Conditions.
          </p>
        </div>

        <CardContent className="p-0 space-y-5">
          {error && (
            <Alert variant="destructive" className="rounded-2xl text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Verification Code Form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Registered Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground">
                Enter Verification Code (From Email)
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter code"
                  className="pl-10 font-mono tracking-widest text-base font-bold rounded-xl h-11 text-center"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isVerifyingCode || !code.trim()}
              className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-xs sm:text-sm shadow-md"
            >
              {isVerifyingCode ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Code...
                </span>
              ) : (
                "Verify Code & Activate"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">or verify via link</span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleCheckStatus}
              variant="outline"
              disabled={isCheckingStatus}
              className="w-full rounded-2xl h-11 text-xs font-semibold"
            >
              {isCheckingStatus ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking Confirmation...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  I Have Clicked the Email Link
                </span>
              )}
            </Button>

            <Button
              onClick={handleResendConfirmation}
              variant="ghost"
              disabled={isResending || resendCooldown > 0}
              className="w-full rounded-xl text-xs font-semibold text-accent"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend confirmation (${resendCooldown}s)` : "Resend confirmation email"}
            </Button>
          </div>

          <div className="pt-2 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/auth")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Return to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}