import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InternationalPhoneInput } from "@/components/ui/phone-input";
import { Eye, EyeOff, ShieldAlert, KeyRound, RefreshCw, Lock, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertUserSchema, loginSchema, type InsertUser, type LoginCredentials, type Gender, SUPPORTED_COUNTRIES, REGION_UNAVAILABLE_NOTICE, matchSupportedCountry } from "@shared/types";
import { z } from "zod";

// Extended schema for registration form with password confirmation
const registrationFormSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationFormSchema>;
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ButtonLoader } from "@/components/LoadingSpinner";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser, getLoginRedirect, handlePostLoginRedirect, completeAuthSession } = useAuth();

  // UI error states for user-friendly error messages
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Suspicious activity step-up OTP challenge state
  const [otpChallenge, setOtpChallenge] = useState<{
    challengeToken: string;
    email: string;
    expiresInSeconds: number;
    reasons: string[];
  } | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for active OTP challenge
  useEffect(() => {
    let timer: any;
    if (isOtpModalOpen && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpModalOpen, otpCountdown]);

  // Cooldown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Get referral code from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = searchParams.get("ref");

  const registerForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      gender: "geek" as const,
      country: "",
      referredBy: referralCode || undefined,
    },
  });

  // Check if user is already authenticated - let useAuth handle redirects
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // User is already authenticated - let useAuth handle the redirect
          console.log('📱 Existing session detected in Auth page, letting useAuth handle redirect');
          // Don't redirect here - useAuth will handle it properly
        }
      } catch (error) {
        console.warn('Session check warning:', error);
      }
    };

    checkExistingSession();
  }, []);

  // Common error handler for both login and register
  const handleAuthError = (error: any, type: 'login' | 'register') => {
    let errorMessage = type === 'login'
      ? "Invalid email or password. Please check your credentials and try again."
      : "Unable to create account. Please check your information and try again.";

    if (error.message) {
      if (error.message.includes('Email already registered') || error.message.includes('User already registered')) {
        errorMessage = "This email address is already registered. Please use a different email or try logging in.";
      } else if (error.message.includes('Error sending confirmation email') ||
        error.message.includes('confirmation email') ||
        error.message.includes('Email service temporarily unavailable') ||
        error.message.includes('EMAIL_SERVICE_UNAVAILABLE')) {
        errorMessage = "Email service is temporarily unavailable. Please try again in a few minutes or contact support.";
      } else if (error.message.includes('Invalid email') || error.message.includes('valid email') || error.message.includes('email')) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message.includes('Password') && error.message.includes('weak')) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.message.includes('Missing or invalid input') || error.message.includes('validation') || error.message.includes('required')) {
        errorMessage = "Please ensure all required fields are filled correctly.";
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('Database') || error.message.includes('database')) {
        errorMessage = "Database error. Please try again in a few moments.";
      } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
        errorMessage = "Server error. Please try again in a few minutes.";
      }
    }

    if (type === 'login') {
      setLoginError(errorMessage);
    } else {
      setRegisterError(errorMessage);
    }
    toast({
      title: `Unable to ${type === 'login' ? 'sign in' : 'create account'}`,
      description: errorMessage,
      variant: "destructive",
    });
  };
  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed');



      return result;
    },
    onSuccess: async (data) => {
      console.log('[LOGIN] Mutation response received');

      // Check if suspicious activity challenge was triggered
      if (data.status === "SUSPICIOUS_CHALLENGE_REQUIRED") {
        console.log('[LOGIN] Suspicious challenge triggered');
        setOtpChallenge({
          challengeToken: data.data.challengeToken,
          email: data.data.email,
          expiresInSeconds: data.data.expiresInSeconds || 300,
          reasons: data.data.reasons || [],
        });
        setOtpCountdown(data.data.expiresInSeconds || 300);
        setOtpCode("");
        setOtpError(null);
        setIsOtpModalOpen(true);

        toast({
          title: "Security Verification Required",
          description: "Unrecognized login activity detected. We've sent a 6-digit one-time code to your email.",
        });
        return;
      }

      // Get user from response
      const loginUser = data.data?.user;

      if (!loginUser) {
        console.error('[LOGIN] No user data in login response');
        toast({
          title: "Login error",
          description: "Failed to get user data, please try again",
          variant: "destructive",
        });
        return;
      }

      // Set Supabase session in the background without blocking redirect
      if (data.data?.session) {
        console.log('[LOGIN] Setting Supabase session in background');
        supabase.auth.setSession(data.data.session).catch((e) => {
          console.warn('[LOGIN] Supabase session set warning:', e);
        });
      }

      // Show success toast
      toast({
        title: loginUser.role === 'admin' ? "Admin Login successful!" : "Login successful!",
        description: loginUser.role === 'admin' ? "Welcome back, Administrator" : "Welcome back to ProtaskerGeek",
      });

      // Set user state and complete auth session without waiting on session lock
      setUser(loginUser);
      await completeAuthSession(loginUser, {
        immediate: true,
        redirect: false,
        supabaseUser: data.data?.session?.user,
      });

      // Perform redirect immediately
      handlePostLoginRedirect(loginUser, true);

      // Invalidate queries to ensure fresh data
      setTimeout(() => {
        try {
          queryClient.invalidateQueries({ queryKey: ['user'] });
        } catch (e) {
          console.warn('[LOGIN] Query invalidation error:', e);
        }
      }, 100);
    },
    onError: (error: any) => handleAuthError(error, 'login'),
  });

  // Step-up OTP Verification Mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ challengeToken, otpCode }: { challengeToken: string; otpCode: string }) => {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, otpCode }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || result.error || 'Verification failed');
      }
      return result;
    },
    onSuccess: async (data) => {
      const verifiedUser = data.data?.user;
      if (!verifiedUser) return;

      setIsOtpModalOpen(false);
      setOtpChallenge(null);
      setOtpCode("");

      if (data.data?.session) {
        supabase.auth.setSession(data.data.session).catch((e) => {
          console.warn('[OTP] Supabase session warning:', e);
        });
      }

      toast({
        title: "Device & Identity Verified",
        description: "Welcome back to ProTasker Geek",
      });

      setUser(verifiedUser);
      await completeAuthSession(verifiedUser, {
        immediate: true,
        redirect: false,
        supabaseUser: data.data?.session?.user,
      });
      handlePostLoginRedirect(verifiedUser, true);
    },
    onError: (error: any) => {
      setOtpError(error.message || "Invalid or expired verification code");
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification code",
        variant: "destructive",
      });
    }
  });

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !otpChallenge?.challengeToken) return;
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: otpChallenge.challengeToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to resend code");
      setResendCooldown(45);
      setOtpCountdown(300);
      setOtpError(null);
      toast({
        title: "New Code Dispatched",
        description: "A fresh 6-digit code has been sent to your email",
      });
    } catch (err: any) {
      toast({
        title: "Unable to Resend",
        description: err.message,
        variant: "destructive",
      });
    }
  };
  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          confirmPassword: data.password,
          phone: data.phone || '',
          gender: data.gender,
          country: data.country,
          referredBy: data.referredBy
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Registration failed');
      }
      if (result.requiresConfirmation) {
        return {
          requiresConfirmation: true,
          message: result.message
        };
      }

      return {
        user: result.data?.user,
        session: result.data?.session
      };
    },
    onSuccess: async (data) => {
      console.log('[REGISTER] Mutation successful');

      if (data.requiresConfirmation) {
        toast({
          title: "Check Your Email",
          description: "We've sent you a confirmation link. Please click it to complete your registration and continue to orientation.",
          duration: 8000,
        });
        setActiveTab("login");
        return;
      }

      // Set Supabase session in the background without blocking redirect
      if (data.session) {
        console.log('[REGISTER] Setting Supabase session in background');
        supabase.auth.setSession(data.session).catch((e) => {
          console.warn('[REGISTER] Supabase session set warning:', e);
        });
      }

      const registeredUser = data.user;
      if (registeredUser) {
        toast({
          title: "Registration successful!",
          description: "Welcome to ProTasker.Geek! Redirecting to your workspace...",
        });

        setUser(registeredUser);
        await completeAuthSession(registeredUser, {
          immediate: true,
          redirect: false,
          supabaseUser: data.session?.user
        });
        handlePostLoginRedirect(registeredUser, true);
      } else {
        toast({
          title: "Registration successful!",
          description: "Your account has been created. Please sign in to continue.",
        });
        setActiveTab("login");
      }
    },
    onError: (error: any) => handleAuthError(error, 'register'),
  });

  const onLogin = (data: LoginCredentials) => {
    setLoginError(null);
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegistrationFormData) => {
    setRegisterError(null);
    registerMutation.mutate(data);
  };

  const watchedCountry = registerForm.watch("country") || "";
  const matchedCountry = matchSupportedCountry(watchedCountry);
  const hasEnteredCountry = watchedCountry.trim().length >= 2;
  const isCountryUnavailable = hasEnteredCountry && !matchedCountry;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 my-auto relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-lg shadow-2xl border border-border/60 bg-card/95 backdrop-blur-xl rounded-3xl relative z-10 overflow-hidden">
        <CardHeader className="text-center space-y-2 pb-4 pt-6 sm:pt-8 px-6 sm:px-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md mx-auto mb-2">
            P
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            ProTasker<span className="text-accent">.Geek</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Specialist Workspace & Platform Access
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1.5 rounded-2xl bg-muted/60 border border-border/40 mb-6">
              <TabsTrigger
                value="login"
                className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Apply as Specialist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="specialist@protaskergeek.com"
                    className="rounded-xl h-11"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                      onClick={() => setLocation("/reset-password")}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="rounded-xl h-11 pr-10"
                      {...loginForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {loginError && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in">
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg transition-all"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <ButtonLoader />}
                  {loginMutation.isPending ? "Authenticating..." : "Sign In to Workspace"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="name">Legal Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Johnathan Vance"
                    className="rounded-xl h-10"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Must match your official government ID for identity verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="register-phone">Phone Number</Label>
                    <InternationalPhoneInput
                      value={registerForm.watch("phone") || ""}
                      onChange={(value) => registerForm.setValue("phone", value || "")}
                      placeholder="Phone number"
                      error={!!registerForm.formState.errors.phone}
                    />
                    {registerForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="register-email">Email Address</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="specialist@example.com"
                      className="rounded-xl h-10"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 chars"
                        autoComplete="new-password"
                        className="rounded-xl h-10 pr-9 text-xs sm:text-sm"
                        {...registerForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2.5 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="rounded-xl h-10 pr-9 text-xs sm:text-sm"
                        {...registerForm.register("confirmPassword")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2.5 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => registerForm.setValue('gender', value as Gender)} defaultValue="geek">
                      <SelectTrigger className="rounded-xl h-10">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">🙍🏻‍♂️ Male</SelectItem>
                        <SelectItem value="female">🙎‍♀️ Female</SelectItem>
                        <SelectItem value="geek">🤓 Specialist / Geek</SelectItem>
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.gender && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.gender.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="country">Country of Residence</Label>
                    <div className="relative">
                      <Input
                        id="country"
                        placeholder="Type country (e.g. United States, Germany...)"
                        className="rounded-xl h-10 pr-12 text-xs sm:text-sm"
                        {...registerForm.register("country")}
                      />
                      {matchedCountry && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                          <span className="text-sm">{matchedCountry.flag}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {registerForm.formState.errors.country && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.country.message}</p>
                    )}
                  </div>
                </div>

                {/* Country availability status messages */}
                {matchedCountry && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Service coverage active in <strong>{matchedCountry.name}</strong> {matchedCountry.flag}</span>
                  </div>
                )}

                {/* Unavailable Region Streamlined Notice */}
                {isCountryUnavailable && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-in fade-in shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>ProtaskerGeek Registration - unavailable notices</span>
                    </div>
                    <p className="leading-relaxed">Hello,</p>
                    <p className="leading-relaxed">Thank you for your interest in joining Protaskergeek.</p>
                    <p className="leading-relaxed">
                      However, we regret to inform you that at the moment, we are not able to provide service in your location. We apologize for any inconvenience this may have caused.
                    </p>
                    <p className="font-semibold pt-1">
                      Best regards,<br />
                      The ProtaskerGeek Team
                    </p>
                  </div>
                )}

                {/* Hidden referral code field */}
                {referralCode && (
                  <input type="hidden" {...registerForm.register("referredBy")} value={referralCode} />
                )}

                {registerError && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                    {registerError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg transition-all mt-2"
                  disabled={registerMutation.isPending || !matchedCountry || !registerForm.formState.isValid}
                >
                  {registerMutation.isPending && <ButtonLoader />}
                  {registerMutation.isPending ? "Creating Specialist Account..." : "Create Specialist Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-5 pt-4 border-t border-border/40 text-center">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent font-semibold transition-colors"
            >
              ← Return to Landing Page
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Suspicious Activity Step-Up OTP Modal */}
      <Dialog open={isOtpModalOpen} onOpenChange={(open) => !verifyOtpMutation.isPending && setIsOtpModalOpen(open)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 sm:p-8 bg-card border-border/70 shadow-2xl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
              Security Verification Required
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We detected an unrecognized device or unusual location. To protect your account, enter the 6-digit one-time code sent to:
              <br />
              <strong className="text-foreground font-semibold">{otpChallenge?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (otpCode.trim().length >= 6 && otpChallenge?.challengeToken) {
                verifyOtpMutation.mutate({
                  challengeToken: otpChallenge.challengeToken,
                  otpCode: otpCode.trim()
                });
              }
            }}
            className="space-y-5 mt-3"
          >
            <div>
              <Label htmlFor="otp-input" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                6-Digit Security Code
              </Label>
              <div className="relative mt-2">
                <Input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setOtpCode(clean);
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="------"
                  className="text-center font-mono text-2xl tracking-[0.5em] h-14 rounded-xl border-border/80 focus:border-accent focus:ring-accent"
                  autoFocus
                />
              </div>

              {/* Expiry countdown */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                <span>Code expires in:</span>
                <span className="font-mono font-semibold text-accent">
                  {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {otpError}
              </div>
            )}

            <Button
              type="submit"
              disabled={otpCode.length < 6 || verifyOtpMutation.isPending || otpCountdown === 0}
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 rounded-xl shadow-md transition-all"
            >
              {verifyOtpMutation.isPending ? (
                <>
                  <ButtonLoader />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  <span>Verify & Sign In</span>
                </>
              )}
            </Button>

            {/* Resend Code / Help */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-accent hover:underline font-semibold disabled:text-muted-foreground disabled:no-underline flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Security Code"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOtpModalOpen(false);
                  setOtpChallenge(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
