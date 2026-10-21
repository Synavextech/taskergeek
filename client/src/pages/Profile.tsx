import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Copy,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Phone,
  Award,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  UploadCloud,
  FileCheck,
  LogOut,
  ArrowRight,
  Sparkles,
  Briefcase,
  Layers,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FriendsManagement } from "@/components/FriendsManagement";
import { useLocation } from "wouter";

const profileSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, logout } = useAuth() as { user: any; logout: () => void };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [verificationFiles, setVerificationFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: user?.phone || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        phone: user.phone || "",
      });
    }
  }, [user, form]);

  const { data: settings } = useQuery<any>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    }
  });

  const { data: referralStats } = useQuery<any>({
    queryKey: ['/api/referrals/stats'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/referrals/stats");
      return res.json();
    }
  });

  const { data: userTasks } = useQuery<any[]>({
    queryKey: ['/api/tasks/user-tasks', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/tasks/user-tasks', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const completedOrders = (userTasks || []).filter((ut: any) =>
    ['approved', 'completed'].includes(ut.status)
  );
  const totalCompletedCount = completedOrders.length;

  const categoryMetaMap: Record<string, { name: string; icon: string; color: string }> = {
    ai: { name: "AI Training", icon: "🤖", color: "bg-purple-500" },
    testing: { name: "App & Web Testing", icon: "⚙️", color: "bg-blue-500" },
    surveys: { name: "Surveys & Polls", icon: "📊", color: "bg-emerald-500" },
    social: { name: "Social Engagement", icon: "👥", color: "bg-amber-500" },
    app: { name: "Application Tasks", icon: "📱", color: "bg-cyan-500" },
    main: { name: "Core Verification", icon: "📋", color: "bg-teal-500" },
  };

  const categoryBreakdown = Object.keys(categoryMetaMap).map((cat) => {
    const count = completedOrders.filter((ut: any) => (ut.task?.category || 'main') === cat).length;
    const percentage = totalCompletedCount > 0 ? Math.round((count / totalCompletedCount) * 100) : 0;
    return {
      cat,
      count,
      percentage,
      ...categoryMetaMap[cat],
    };
  });

  const standardOrdersCount = completedOrders.filter((ut: any) => (ut.task?.task_type || 'standard') === 'standard').length;
  const projectOrdersCount = completedOrders.filter((ut: any) => ut.task?.task_type === 'project').length;

  const referralLink = referralStats?.referralCode
    ? `${window.location.origin}/auth?ref=${referralStats.referralCode}`
    : "";

  const isEditAllowed = settings?.allow_profile_editing;

  const deactivateUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/auth/deactivate`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. You will now be logged out.",
      });
      window.location.href = '/auth';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate account",
        variant: "destructive",
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileFormValues> & { verification_documents?: string[] }) => {
      const res = await apiRequest("PATCH", `/api/auth/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your details have been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleVerificationSubmit = async () => {
    if (!verificationFiles || verificationFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < verificationFiles.length; i++) {
        const file = verificationFiles[i];

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;

        const res = await apiRequest("POST", "/api/tasks/storage/upload", {
          file: base64,
          name: `${user?.id || 'unknown'}-${Date.now()}-${file.name}`,
          bucket: 'verification-docs',
          contentType: file.type
        });

        const uploadResult = await res.json();
        if (uploadResult.success) {
          uploadedUrls.push(uploadResult.url);
        } else {
          throw new Error(uploadResult.message || "Upload failed");
        }
      }

      await updateProfileMutation.mutateAsync({
        verification_documents: uploadedUrls
      } as any);

      toast({
        title: "Documents Submitted",
        description: "Your verification documents have been received and are pending compliance review.",
      });
      setVerificationFiles(null);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral invitation link copied to clipboard.",
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
    universal: "🌐",
    premium: "👑",
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Hero Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-md shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "T"}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {user?.name || "Platform Specialist"}
                </h1>
                <Badge variant="outline" className="text-xs font-semibold capitalize">
                  {tierEmoji[user?.skill_upgrade_tier || 'member'] || '👤'} {user?.skill_upgrade_tier || 'Member'} Tier
                </Badge>
                {user?.verification_status === 'verified' ? (
                  <Badge className="bg-success/15 text-success border-success/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : user?.pending_verification ? (
                  <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Pending Verification
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Unverified
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {user?.phone}
                  </span>
                )}
                {user?.country && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {user?.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => setLocation('/skill-upgrade')}
              className="rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground text-xs sm:text-sm px-5 py-5 shadow-sm hover:scale-105 transition-all"
            >
              <Award className="w-4 h-4 mr-1.5" />
              Upgrade Tier
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-base text-foreground">Specialist Information</h3>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEditAllowed) setIsEditing(true);
                    else toast({ title: "Edits Restricted", description: "Profile editing is currently locked by system administration.", variant: "destructive" });
                  }}
                  className="rounded-xl text-xs font-semibold"
                >
                  {isEditAllowed ? "Edit Phone" : "Details Locked"}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium text-xs">Full Legal Name</span>
                <div className="p-3 bg-muted/60 rounded-xl font-semibold text-foreground">
                  {user?.name || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium text-xs">Account Email</span>
                <div className="p-3 bg-muted/60 rounded-xl font-semibold text-foreground">
                  {user?.email || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium text-xs">Platform Role</span>
                <div className="p-3 bg-muted/60 rounded-xl font-semibold capitalize text-foreground">
                  {user?.role || "user"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium text-xs">Phone Number</span>
                {isEditing ? (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      className="rounded-xl h-11 text-xs"
                      placeholder="+1234567890"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl text-xs bg-accent text-accent-foreground font-semibold"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        className="rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-muted/60 rounded-xl font-semibold text-foreground">
                    {user?.phone || "No phone recorded"}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Identity Verification & Compliance Card */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                <h3 className="font-bold text-base text-foreground">Identity Verification & Credentials</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                KYC Benchmark
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload state-issued ID, academic degrees, or professional certifications to maintain unhindered access to high-tier AI training tasks and higher daily payout limits.
            </p>

            <div className="p-4 rounded-2xl border border-dashed border-border/80 bg-muted/30 space-y-3">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Submit Verification Documentation</span>
              </div>
              <Input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => setVerificationFiles(e.target.files)}
                className="rounded-xl text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent/15 file:text-accent cursor-pointer"
              />
              <Button
                onClick={handleVerificationSubmit}
                disabled={isUploading || !verificationFiles}
                size="sm"
                className="rounded-xl text-xs font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Uploading Documents...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                    Submit for Compliance Review
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Friends & Peer Collaboration */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-base text-foreground">Peer Tasking Network</h3>
              </div>
            </div>
            <FriendsManagement />
          </Card>
        </div>

        {/* Right Column: Performance KPIs, Referral & Security */}
        <div className="space-y-6">
          {/* Dual Rating Cards: Quality Score & Completion Rate */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Quality Rating
              </span>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                {user?.quality_rating !== undefined && user?.quality_rating !== null ? Number(user.quality_rating).toFixed(1) : '5.0'} / 5.0 ★
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assessed directly by review administrators on submitted task deliverables (scale of 0–5 stars).
            </p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, ((user?.quality_rating !== undefined && user?.quality_rating !== null ? Number(user.quality_rating) : 5.0) / 5) * 100))}%` }}
              />
            </div>
          </Card>

          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completion Rate
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                {user?.completion_rate ?? user?.rating ?? 100}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Percentage of claimed tasks approved vs rejected or cancelled. Ratios above 80% maintain access to high-rate projects.
            </p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, user?.completion_rate ?? user?.rating ?? 100))}%` }}
              />
            </div>
          </Card>

          {/* Orders Completed Breakdown by Category & Type */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" />
                Orders Completed
              </span>
              <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-bold">
                {totalCompletedCount} {totalCompletedCount === 1 ? 'Order' : 'Orders'} Completed
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Distribution of verified deliverable completions based on discipline category and project type.
            </p>

            <Tabs defaultValue="category" className="w-full pt-1">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl h-9 bg-muted/60 p-0.5">
                <TabsTrigger value="category" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  By Category ({categoryBreakdown.filter(c => c.count > 0).length})
                </TabsTrigger>
                <TabsTrigger value="type" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  By Type
                </TabsTrigger>
              </TabsList>

              <TabsContent value="category" className="pt-3 space-y-2.5">
                {categoryBreakdown.map((item) => (
                  <div key={item.cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {item.count} <span className="text-[10px] text-muted-foreground/70 font-normal">({item.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`${item.color} h-1.5 rounded-full transition-all duration-300`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="type" className="pt-3 space-y-3">
                <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>📋</span> Standard Micro-Tasks
                    </span>
                    <Badge variant="outline" className="text-xs font-bold">
                      {standardOrdersCount} Completed
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Fixed-reward tasks including surveys, verification, testing briefs, and data purification.
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-accent h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${totalCompletedCount > 0 ? Math.round((standardOrdersCount / totalCompletedCount) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>⏱️</span> Hourly Project Workspaces
                    </span>
                    <Badge variant="outline" className="text-xs font-bold">
                      {projectOrdersCount} Completed
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    In-depth hourly projects with interactive workspace sections and time tracking.
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${totalCompletedCount > 0 ? Math.round((projectOrdersCount / totalCompletedCount) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Referral Commission Card */}
          <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-card to-accent/5 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Referral Invitation
              </span>
              <Badge variant="outline" className="text-xs">
                Earn 5%
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Invite colleagues and earn commissions on their approved platform earnings.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Personal Invite Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={referralLink || "Generating..."}
                  className="rounded-xl text-xs bg-muted/50 font-mono h-10"
                />
                <Button
                  onClick={copyReferralLink}
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Account Security & Deactivation */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Account Actions
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need a break? You can temporarily deactivate your account or securely end your session.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                variant="outline"
                onClick={logout}
                className="w-full rounded-xl text-xs font-semibold justify-center h-10"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sign Out of Device
              </Button>

              <Button
                variant="destructive"
                disabled={deactivateUserMutation.isPending}
                onClick={() => {
                  if (confirm("Are you certain you wish to deactivate your specialist account?")) {
                    deactivateUserMutation.mutate();
                  }
                }}
                className="w-full rounded-xl text-xs font-semibold justify-center h-10 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20"
              >
                Deactivate Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
