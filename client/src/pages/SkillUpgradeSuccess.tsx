import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
export default function SkillUpgradeSuccess() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {

    setStatus("success");
    setMessage("Payment successful! Your Skill-Upgrade is now active.");

    if (user) {

      setUser({
        ...user,
        skill_upgrade_tier: user.skill_upgrade_tier || 'member',
        skill_upgrade_expiry: user.skill_upgrade_expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    toast({
      title: "Welcome to ProMo-G!",
      description: "Your Skill-Upgrade has been activated successfully.",
    });
    setTimeout(() => {
      setLocation("/home");
    }, 3000);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === "processing" && "Processing Payment"}
            {status === "success" && "Payment Successful!"}
            {status === "error" && "Payment Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "processing" && (
            <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          )}
          {status === "success" && (
            <CheckCircle className="h-16 w-16 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
          {status === "error" && (
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/skill-upgrade")}>Try Again</Button>
              <Button variant="outline" onClick={() => setLocation("/home")}>Go Home</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}