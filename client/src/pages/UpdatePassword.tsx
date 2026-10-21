import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Lock, Loader2, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sessionLoading, setSessionLoading] = useState(true);
  const [recoverySession, setRecoverySession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeRecoverySession = async () => {
      try {
        // 1. Check for error description in hash or query parameters
        const urlParams = new URLSearchParams(window.location.search);
        let hashParams: URLSearchParams | null = null;
        if (window.location.hash) {
          hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        }

        const errorDesc = hashParams?.get('error_description') || urlParams.get('error_description');
        if (errorDesc) {
          setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
          setSessionLoading(false);
          return;
        }

        // 2. Check for PKCE code in query parameters and exchange for session
        const code = urlParams.get('code');
        if (code) {
          console.log('[PASSWORD_RESET] Exchanging PKCE code for recovery session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[PASSWORD_RESET] Code exchange error:', exchangeError);
            if (isMounted) {
              setError(exchangeError.message || "Failed to validate reset code. Please request a fresh link.");
              setSessionLoading(false);
            }
            return;
          }

          if (data?.session && isMounted) {
            console.log('[PASSWORD_RESET] PKCE code exchange succeeded for:', data.session.user.email);
            setRecoverySession(true);
            setSessionLoading(false);
            setError(null);
            return;
          }
        }

        // 3. Check existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session && isMounted) {
          console.log('[PASSWORD_RESET] Recovery session active for:', session.user.email);
          setRecoverySession(true);
          setSessionLoading(false);
          return;
        }

        console.log('[PASSWORD_RESET] Waiting for Supabase auth recovery event...');
      } catch (err) {
        console.error('[PASSWORD_RESET] Session check error:', err);
        if (isMounted) {
          setError("Failed to initialize recovery session. Please try requesting a new link or using a 6-digit code.");
          setSessionLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('[PASSWORD_RESET] Auth event:', event);

      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        console.log('[PASSWORD_RESET] Recovery session established for:', session.user.email);
        setRecoverySession(true);
        setSessionLoading(false);
        setError(null);
      } else if (!session && event === 'SIGNED_OUT') {
        console.warn('[PASSWORD_RESET] Session lost during recovery');
      }
    });

    initializeRecoverySession();

    const timeout = setTimeout(() => {
      if (isMounted && !recoverySession && sessionLoading) {
        console.warn('[PASSWORD_RESET] Session timeout - no recovery session established');
        setError("Your password reset link is invalid or has expired. Please request a new link.");
        setSessionLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [recoverySession, sessionLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        toast({
          title: "Password Updated",
          description: "Your new password is now active. Directing to your workspace...",
        });
        setTimeout(() => {
          setLocation('/home');
        }, 1800);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Validating Recovery Link</h2>
            <p className="text-xs text-muted-foreground">Please wait while your security credentials are authenticated...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-success/15 text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-foreground">Password Successfully Updated</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your security credentials have been updated and your active session is primed. Launching dashboard...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Set New Password
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Enter and verify your new account password to restore full access.
          </p>
        </div>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-2xl text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="rounded-xl h-11 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  className="rounded-xl h-11 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-xs sm:text-sm shadow-md"
              disabled={isLoading || !recoverySession}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                'Save New Password & Continue'
              )}
            </Button>

            {!recoverySession && !isLoading && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={() => setLocation('/reset-password')}
              >
                Reset via 6-Digit Verification Code
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-xs font-semibold"
              onClick={() => setLocation('/auth')}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Return to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
