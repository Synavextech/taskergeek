import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, supabaseUser } = useAuth();
  const [email, setEmail] = useState(supabaseUser?.email || '');
  const [isResending, setIsResending] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Confirmation Email Sent",
          description: "Please check your email for the confirmation link.",
        });
      } else {
        throw new Error(data.error || 'Failed to resend confirmation');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to resend confirmation email.',
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };
  const handleCheckStatus = async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user?.email_confirmed_at) {
        toast({
          title: "Email Confirmed!",
          description: "Your email has been confirmed. Redirecting to home...",
        });
        setTimeout(() => {
          setLocation('/home');
        }, 1500);
      } else {
        toast({
          title: "Email Not Confirmed",
          description: "Please check your email and click the confirmation link.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check confirmation status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Verify Your Email
          </CardTitle>
          <p className="text-muted-foreground">  For security purposes, Please confirm your email address.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <Button
            onClick={handleResendConfirmation}
            disabled={isResending}
            className="w-full" >
            {isResending ? "Sending..." : "Resend Confirmation Email"}
          </Button>
          <Button onClick={handleCheckStatus} variant="outline" className="w-full"  > I have Confirmed My Email </Button> <div className="text-center">
            <Button
              variant="ghost" onClick={() => setLocation("/auth")}  className="text-accent hover:text-accent/80 hover:bg-accent/10 transition-all duration-200" >  ← Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}