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
} from "lucide-react";
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
          {/* Quality Acceptance Score */}
          <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Quality Rating
              </span>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                {user?.rating ?? 100}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acceptance ratios above 80% guarantee ongoing qualification for high-rate projects and fast-track review.
            </p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-accent h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, user?.rating ?? 100))}%` }}
              />
            </div>
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
