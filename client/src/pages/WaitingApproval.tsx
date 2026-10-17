import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/types";
interface UserWithApproval extends User {
  approval_status: 'pending' | 'approved' | 'rejected';
}
import { Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function WaitingApproval() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();

  const { data: fetchResult } = useQuery<{ success: boolean; data: { user: User } }>({
    queryKey: [`/api/auth/user`],
    enabled: !!user?.id && (user.approval_status === 'pending' || !!user.has_pending_upgrade),
    refetchInterval: 5000,
  });

  const updatedUser = fetchResult?.data?.user;

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    // Redirect if BOTH approvals are sorted
    if (user.approval_status === 'approved' && !user.has_pending_upgrade) {
      setLocation("/home");
      return;
    }

    if (updatedUser) {
      // If status changed from pending to approved, or upgrade was settled
      if (updatedUser.approval_status !== user.approval_status || updatedUser.has_pending_upgrade !== user.has_pending_upgrade) {
        setUser(updatedUser);
        if (updatedUser.approval_status === 'approved' && !updatedUser.has_pending_upgrade) {
          setLocation("/home");
        }
      }
    }
  }, [user, updatedUser, setLocation, setUser]);

  if (!user) return null;

  const isUpgrade = user.approval_status === 'approved' && user.has_pending_upgrade;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-xl border-accent/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            {isUpgrade ? <CheckCircle className="w-8 h-8 text-accent" /> : <Clock className="w-8 h-8 text-warning" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {isUpgrade ? "Skill Upgrade Verification" : "Account Awaiting Approval"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              {isUpgrade
                ? "Thank you for completing your payment! Your skill upgrade application is currently under consideration. An admin representative will verify your transaction shortly."
                : "Your account application is currently under consideration. An admin representative will review your profile and orientation results shortly. Please keep checking your account for notifications."}
            </p>
            <p className="text-sm font-medium text-accent">
              Status: <span className="capitalize">{isUpgrade ? "Pending Upgrade" : "Pending Approval"}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground"> This page will automatically redirect once {isUpgrade ? "your upgrade" : "your account"} is approved. </p>
          </div>
          <div className="text-center">
            <Button onClick={() => setLocation("/")} variant="ghost" size="lg" className="text-foreground hover:bg-foreground/10 px-6 py-3 text-sm sm:text-base font-semibold transition-all rounded-xl" >
              ← Back to Main Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}