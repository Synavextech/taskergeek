import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Award,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Lock,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PayPalCheckoutButton from "@/components/PayPalCheckoutButton";
import { ComponentLoader } from "@/components/LoadingSpinner";
import { apiRequest } from "@/lib/queryClient";

interface SkillPlan {
  id: string;
  name: string;
  badge: string;
  price: number;
  linksPerDay: string;
  accessLevel: string;
  disciplines: string[];
  popular?: boolean;
}

const skillUpgradePlans: SkillPlan[] = [
  {
    id: "silver",
    name: "Basic Level Tasker",
    badge: "🥈",
    price: 10,
    linksPerDay: "5 Tasks / Day",
    accessLevel: "Core Verification + Social Media Engagement",
    disciplines: ["Core Verification", "Social Media Engagement"],
    popular: false,
  },
  {
    id: "bronze",
    name: "Advanced Level Tasker",
    badge: "🥉",
    price: 25,
    linksPerDay: "10 Tasks / Day",
    accessLevel: "Core Tasks + Social Media + Mobile & App Operations",
    disciplines: ["Core Verification", "Social Media", "Application Tasks"],
    popular: false,
  },
  {
    id: "diamond",
    name: "Senior Level Tasker",
    badge: "💎",
    price: 50,
    linksPerDay: "15 Tasks / Day",
    accessLevel: "Core + Social + App Operations + Surveys & Polls",
    disciplines: ["Core Verification", "Social Media", "Application Tasks", "Surveys & Polls"],
    popular: true,
  },
  {
    id: "gold",
    name: "Golden Level Geek",
    badge: "🏅",
    price: 75,
    linksPerDay: "20 Tasks / Day",
    accessLevel: "Core + Social + App Operations + Surveys + QA App/Web Testing",
    disciplines: ["Core Tasks", "Social Media", "Application Tasks", "Surveys & Polls", "App & Web Testing"],
    popular: false,
  },
  {
    id: "vip",
    name: "VIP Frontier Specialist",
    badge: "💰",
    price: 100,
    linksPerDay: "25 Tasks / Day",
    accessLevel: "Full Access: All Disciplines + Frontier AI Model Training & Red-Teaming",
    disciplines: ["All Platform Disciplines", "Frontier AI Training", "RLHF Evaluation", "Red-Teaming"],
    popular: false,
  },
];

export default function SkillUpgrade() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>("diamond");
  const [transactionCode, setTransactionCode] = useState("");
  const [paypalError, setPaypalError] = useState<string | null>(null);

  // Sync selectedPlan from URL ?tier= query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tier = params.get('tier');
    if (tier && skillUpgradePlans.some((p) => p.id === tier)) {
      setSelectedPlan(tier);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return <ComponentLoader text="Redirecting to login..." />;
  }

  const handlePayPalError = (error: any) => {
    setPaypalError("PayPal initialization failed. Please use direct verification below or contact support.");
    toast({
      title: "PayPal Notification",
      description: "Online gateway checkout encountered an issue. You may submit manual transaction verification.",
      variant: "destructive"
    });
  };

  const handleManualPayPalRedirect = () => {
    if (!selectedPlan) {
      toast({
        title: "Selection Required",
        description: "Please choose a skill level tier first.",
        variant: "destructive"
      });
      return;
    }

    const selectedPlanData = skillUpgradePlans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;
    const paypalUrl = `https://www.paypal.com/checkoutnow?token=EC-MANUAL-${selectedPlan}-${user.id}`;
    window.location.href = paypalUrl;
  };

  const selectedPlanData = skillUpgradePlans.find((p) => p.id === selectedPlan);
  const amount = selectedPlanData ? selectedPlanData.price : 0;

  if (user?.has_pending_upgrade) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-md w-full text-center rounded-3xl border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center text-3xl">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Upgrade Request Pending</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your tier upgrade verification is currently being verified by platform administration. You will be notified once active.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/home")}
            variant="outline"
            className="w-full rounded-2xl font-semibold"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
              <Award className="w-3.5 h-3.5" />
              <span>Skill Level Progression</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Elevate Your Specialist Tier
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Unlock higher daily task allocations and gain immediate qualification for high-rate categories including Mobile & App Operations, QA Testing, and Frontier AI Alignment.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setLocation("/home")}
            className="rounded-xl text-xs font-semibold self-start md:self-auto shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            Select Your Specialized Skill Tier
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            One-time credentialing fee backed by immediate task volume expansion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {skillUpgradePlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrentTier = user?.skill_upgrade_tier === plan.id;

            return (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative cursor-pointer transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between border ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/30 bg-accent/5 shadow-md"
                    : isCurrentTier
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border/60 bg-card hover:border-accent/40 hover:shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground font-bold text-[11px] shadow-sm">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{plan.badge}</span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-foreground">${plan.price}</span>
                      <span className="text-[11px] text-muted-foreground block font-medium">One-Time Fee</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent mt-1">
                      {plan.linksPerDay}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {plan.accessLevel}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-border/40">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Included Disciplines
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.disciplines.map((d, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 bg-muted rounded-md text-foreground/80"
                        >
                          ✓ {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full rounded-xl text-xs font-bold h-11 ${
                      isSelected
                        ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                        : "hover:border-accent hover:text-accent"
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Selected Tier
                      </span>
                    ) : isCurrentTier ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Current Tier
                      </span>
                    ) : (
                      "Select This Level"
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Checkout Container */}
      {selectedPlan && (
        <div className="max-w-xl mx-auto pt-4">
          <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-card to-accent/5 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-1.5">
              <Badge variant="outline" className="text-xs font-bold text-accent border-accent/30 bg-accent/10">
                Confirm Selected Tier
              </Badge>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                Complete Credentialing: ${amount}.00 USD
              </h3>
              <p className="text-xs text-muted-foreground">
                Upgrading to <strong>{selectedPlanData?.name}</strong> ({selectedPlanData?.linksPerDay})
              </p>
            </div>

            {paypalError ? (
              <div className="space-y-4">
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl font-medium text-center">
                  {paypalError}
                </div>
                <Button
                  onClick={handleManualPayPalRedirect}
                  className="w-full bg-[#0070ba] hover:bg-[#003087] text-white py-5 rounded-xl font-bold text-sm"
                >
                  Pay ${amount} with PayPal
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* PayPal Express Button */}
                <div className="pt-2">
                  <PayPalCheckoutButton
                    tier={selectedPlan}
                    amount={amount.toString()}
                    currency="USD"
                    intent="capture"
                    onError={handlePayPalError}
                  />
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or Manual Transaction Reference</span>
                  </div>
                </div>

                {/* Manual Reference Submission */}
                <div className="space-y-3">
                  <Label htmlFor="transaction-code" className="text-xs font-semibold text-muted-foreground">
                    Transaction Code / Receipt Reference
                  </Label>
                  <Input
                    id="transaction-code"
                    placeholder="e.g., 9X8293740283 or PP-104928"
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value)}
                    className="rounded-xl text-xs h-11"
                  />

                  <Button
                    onClick={() => {
                      if (!transactionCode) {
                        toast({
                          title: "Reference Required",
                          description: "Please enter your payment reference code before submitting.",
                          variant: "destructive"
                        });
                        return;
                      }

                      const codeRegex = /^[a-zA-Z0-9-]{6,30}$/;
                      if (!codeRegex.test(transactionCode)) {
                        toast({
                          title: "Invalid Code",
                          description: "Transaction code must be alphanumeric (6-30 characters).",
                          variant: "destructive"
                        });
                        return;
                      }

                      apiRequest("POST", "/api/payments/skill-upgrades/manual", {
                        tier: selectedPlan,
                        amount: amount.toString(),
                        transactionCode
                      }).then(async (res) => {
                        if (res.ok) {
                          toast({
                            title: "Verification Submitted",
                            description: "Your tier upgrade payment has been recorded and will be verified by administration."
                          });
                          setLocation("/waiting-approval");
                        } else {
                          const data = await res.json();
                          toast({
                            title: "Submission Failed",
                            description: data.message || "Failed to record verification.",
                            variant: "destructive"
                          });
                        }
                      }).catch(() => {
                        toast({
                          title: "Network Error",
                          description: "An unexpected error occurred. Please try again.",
                          variant: "destructive"
                        });
                      });
                    }}
                    className="w-full bg-success hover:bg-success/90 text-success-foreground rounded-xl font-bold text-xs sm:text-sm h-11"
                  >
                    Confirm Manual Payment
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}