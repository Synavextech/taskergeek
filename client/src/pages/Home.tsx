import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Clock,
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Users,
  Star,
  Copy,
  Sparkles,
  ShieldCheck,
  Award,
} from "lucide-react";

interface Wallet {
  totalEarnings: string;
  available_balance?: string;
  total_earnings?: string;
}

interface Notification {
  is_read: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: wallet } = useQuery<Wallet>({
    queryKey: [`/api/payments/wallet/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const { data: referralData } = useQuery<{ count: number }>({
    queryKey: [`/api/users/${user?.id}/referrals/count`],
    enabled: !!user?.id && !!user?.referral_code,
  });

  const { data: userStats } = useQuery<{ rating: number; tasks_completed: number }>({
    queryKey: [`/api/auth/stats/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: userTasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks/user-tasks'],
    enabled: !!user?.id,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;
  const activeTasksCount = userTasks.filter((t: any) => ['claimed', 'revision_requested'].includes(t.status)).length || 0;
  const needsOrientation = user && !user.orientation_complete;

  const copyReferralLink = () => {
    if (user?.referral_code) {
      const referralLink = `${window.location.origin}/auth?ref=${user.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Referral Link Copied! 📋",
        description: "Share your unique referral link to earn rewards when new geeks join.",
      });
    } else {
      toast({
        title: "Error",
        description: "Referral code not found.",
        variant: "destructive",
      });
    }
  };

  const tierEmoji: Record<string, string> = {
    member: "👤",
    silver: "🥈",
    bronze: "🥉",
    diamond: "💎",
    gold: "🏅",
    vip: "💰",
    premium: "👑",
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Specialist Account
              </span>

              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                {tierEmoji[user?.skill_upgrade_tier || 'member'] || '👤'} {user?.skill_upgrade_tier || 'Member'}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Welcome back, {user?.name?.split(" ")[0] || "Tasker"} 👋
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              Your workstation is primed for tasking. Deliver precise, high-accuracy data to maintain high quality ratings and maximize weekly payout potential.
            </p>
          </div>

          {/* Quick Jump Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              onClick={() => setLocation('/tasks')}
              size="lg"
              className="w-full sm:w-auto font-bold rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-6 shadow-md hover:scale-105 transition-all"
            >
              <Zap className="w-5 h-5 mr-2" />
              Open Task Marketplace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Verification Notice if pending */}
      {user?.pending_verification && (
        <Alert className="border-accent/40 bg-accent/5 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent font-bold">Identity Verification Pending</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1">
            Your verification documents are currently under review by platform compliance. You can still access standard training tasks.
          </AlertDescription>
        </Alert>
      )}

      {/* Orientation Banner for New/In-Progress Users */}
      <Card className={`rounded-3xl border transition-all ${
        needsOrientation
          ? 'border-accent bg-accent/5'
          : 'border-border/60 bg-card/60'
      }`}>
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              {needsOrientation ? "Required Orientation Program" : "Orientation Modules Completed"}
            </CardTitle>
            <Badge variant={needsOrientation ? "default" : "secondary"} className="text-xs">
              {needsOrientation ? "Action Required" : "100% Complete"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            {needsOrientation
              ? "Orientation ensures you understand our strict evaluation standards, grading guidelines, and deliverable formats before handling paid client tasks."
              : "You have successfully finished the platform onboarding modules. You may revisit orientation guidelines at any time as a quality refresher."}
          </p>
          <Button
            onClick={() => setLocation("/orientation")}
            variant={needsOrientation ? "default" : "outline"}
            className="rounded-xl text-xs font-semibold"
          >
            {needsOrientation ? "Complete Orientation Modules" : "Review Training Standards"}
          </Button>
        </CardContent>
      </Card>

      {/* Performance KPIs & Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-3xl border-border/60 p-5 bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Earnings</span>
              <span className="text-lg">💵</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-success">
              ${parseFloat(wallet?.totalEarnings || wallet?.total_earnings || "0").toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground">Credited & pending payouts</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 p-5 bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Tasks Done</span>
              <span className="text-lg"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-accent">
              {userStats?.tasks_completed || 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Approved deliverables</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 p-5 bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Rating Score</span>
              <span className="text-lg"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500">
              {userStats?.rating ?? user?.rating ?? 100}%
            </div>
            <p className="text-[11px] text-muted-foreground">Quality acceptance rate</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 p-5 bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Referral Squad</span>
              <span className="text-lg"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {referralData?.count || 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Active invited members</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Categories & Disciplines Overview */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Task Categories & Disciplines
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Available tasking pipelines across our human-in-the-loop verification network.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/tasks')}
            className="rounded-xl text-xs font-semibold self-start sm:self-auto"
          >
            Browse All Tasks <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              id: "main",
              title: "Core Verification",
              minTier: "member",
              payout: "$0.25 - $2.50",
              badgeClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
              description: "Foundational data purification, format validation, and platform benchmark assignments."
            },
            {
              id: "social",
              title: "Social Engagement",
              minTier: "silver",
              payout: "$0.30 - $3.50",
              badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
              description: "Social sentiment verification, community management, and discussion quality auditing."
            },
            {
              id: "app",
              title: "Application Operations",
              minTier: "bronze",
              payout: "$0.35 - $5.00",
              badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
              description: "Mobile app workflows, app installation tests, onboarding checks, and responsive UI reviews."
            },
            {
              id: "surveys",
              title: "Surveys & Polls",
              minTier: "diamond",
              payout: "$5.00 - $18.00",
              badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
              description: "Demographic intelligence, consumer opinion collection, and product viability evaluations."
            },
            {
              id: "testing",
              title: "App & Web Testing",
              minTier: "gold",
              payout: "$15.00 - $50.00",
              badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
              description: "Quality assurance, functional regression, UX exploration, and cross-browser bug hunts."
            },
            {
              id: "ai",
              title: "AI Training & Alignment",
              minTier: "vip",
              payout: "$25.00 - $75.00",
              badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
              description: "Frontier LLM reasoning validation, RLHF feedback, prompt-response ranking, and red-teaming."
            }
          ].map((cat) => (
            <Card
              key={cat.id}
              className="rounded-3xl border-border/60 bg-card p-5 hover:border-accent/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cat.icon}</span>
                </div>
                <h3 className="font-bold text-base text-foreground">{cat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Est. Payout: <strong className="text-foreground">{cat.payout}</strong></span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation('/tasks')}
                  className="rounded-xl text-xs font-semibold text-accent hover:text-accent hover:bg-accent/10 px-2.5 h-8"
                >
                  View Tasks <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Account Activity & Referral Action */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Referral Card */}
        <Card className="rounded-3xl border-border/60 p-6 bg-card flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Refer a Fellow Geek
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                Earn Bonuses
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Earn ongoing referral commissions when members you invite register and complete tasks on the platform.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={copyReferralLink}
              className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground text-xs h-11"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Personal Referral Link
            </Button>
          </div>
        </Card>

        {/* Quality Guidelines Card */}
        <Card className="rounded-3xl border-border/60 p-6 bg-card flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                Tasker Quality Standard
              </span>
              <Badge className="bg-success/15 text-success border-success/30 text-xs">
                Active Protocol
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Maintain an accuracy rating above 80% to retain access to high-tier AI training tasks. Low ratings or abandoned claimed tasks may result in automated queue cooldowns.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs border-t border-border/40 text-muted-foreground">
            <span>Minimum Accuracy: <strong>80%</strong></span>
            <span>Submission Window: <strong>24 Hours</strong></span>
          </div>
        </Card>
      </div>
    </div>
  );
}
