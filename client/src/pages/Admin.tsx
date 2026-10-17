
import { type User, type Task, type Withdrawal, type UserTask, type TaskCategory, type SkillUpgradeTier } from "@shared/types";
import { useState } from "react";
interface Stats {
  totalUsers: number;
  activeSkillUpgrades: number;
  totalEarnings: string;
  totalTasks: number;
  usersByTier: Record<string, number>;
  verificationRequests: number;
  recentActivity: any[];
  totalReferrals: number;
  totalReferralBonuses: string;
  pendingApplications: number;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema, type InsertTask } from "@shared/types";
import {
  Users, DollarSign, ClipboardList, UserCheck,
  MoreVertical, Edit, Shield, Ban, UserX, CheckCircle, Bell, ExternalLink, Gift, UserPlus, Lock as LucideLock, FileUp,
  FileText
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Admin() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
    };

    updateUserProfileMutation.mutate({ userId: editingUser.id, data: updates });
    setEditDialogOpen(false);
  };

  const handleViewDocument = async (docUrl: string) => {
    try {
      // Determine bucket and path from URL
      let bucket = 'verification-docs';
      let path = docUrl;

      if (docUrl.includes('proof-submissions')) bucket = 'proof-submissions';
      else if (docUrl.includes('task-attachments')) bucket = 'task-attachments';

      if (docUrl.startsWith('http')) {
        // Extract path from Supabase public URL structure
        const storageSlug = `/storage/v1/object/public/${bucket}/`;
        if (docUrl.includes(storageSlug)) {
          path = docUrl.split(storageSlug)[1];
        }
      }

      const res = await apiRequest("GET", `/api/admin/storage/signed-url?bucket=${bucket}&path=${path}`);
      const data = await res.json();

      if (data.success && data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        // Fallback to direct link if proxy fails (might work if public)
        window.open(docUrl, '_blank');
      }
    } catch (error) {
      console.error("Document viewing error:", error);
      window.open(docUrl, '_blank');
    }
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats = { totalUsers: 0, activeSkillUpgrades: 0, totalEarnings: '0', totalTasks: 0, recentActivity: [], usersByTier: {}, verificationRequests: 0, totalReferrals: 0, totalReferralBonuses: '0', pendingApplications: 0 } } = useQuery<Stats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000, // Increased from 5s to 30s
  });

  const { data: pendingTasks = [] } = useQuery<UserTask[]>({
    queryKey: ['/api/admin/user-tasks/pending'],
  });

  const { data: withdrawals = [] } = useQuery<Withdrawal[]>({
    queryKey: ['/api/admin/withdrawals'],
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/admin/tasks'],
  });

  const { data: pendingSkillUpgrades = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/skill-upgrades/pending'],
  });

  const { data: pendingVerifications = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/verifications/pending'],
  });

  const { data: settings } = useQuery<any>({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/settings");
      return res.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/settings", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Settings Updated", description: "System configuration updated." });
      queryClient.setQueryData(['/api/admin/settings'], data.settings);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update settings", variant: "destructive" })
  });

  const taskForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "main",
      url: "",
      reward: "0",
      minTier: "member",
      isActive: true,
      isOrientation: false,
    },
  });
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/admin/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "New task has been added successfully",
      });
      taskForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });
  const approveTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/approve`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Success" : "Task approved",
        description: data.message || "Task has been approved and earnings added",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-tasks/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
    },
  });
  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task rejected",
        description: "Task has been rejected with reason",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-tasks/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
    },
  });
  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal updated",
        description: "Withdrawal status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertTask> }) => {
      const response = await apiRequest("PATCH", `/api/admin/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "Task details have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/tasks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({
        title: "User approved",
        description: "User has been approved and can now access premium tasks",
      });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    },
  });
  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/reject`, { reason });
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({
        title: "User rejected",
        description: "User has been rejected",
      });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/profile`, data);
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({ title: "Profile Updated", description: "User profile has been updated." });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
    },
    onError: () => toast({ title: "Error", description: "Failed to update profile", variant: "destructive" })
  });

  const verifyIdentityMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/verify-identity`);
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({ title: "Verification Requested", description: "User has been notified to verify identity." });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, isSuspended, duration_days }: { userId: string; isSuspended: boolean; duration_days?: number }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/suspend`, { is_suspended: isSuspended, duration_days });
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({
        title: updatedUser.is_suspended ? "User Suspended" : "User Unsuspended",
        description: `User access has been ${updatedUser.is_suspended ? "revoked" : "restored"}.`
      });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/deactivate`);
      return response.json();
    },
    onSuccess: (data: { success: boolean, user: User }) => {
      const updatedUser = data.user;
      toast({ title: "Account Deactivated", description: "User account has been deactivated." });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
    },
  });

  const recommendTaskMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const response = await apiRequest("POST", `/api/admin/tasks/${taskId}/recommend`, { userId });
      return response.json();
    },
    onSuccess: () => toast({ title: "Task Recommended", description: "Recommendation sent to user." }),
  });

  const reviseTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason, feedback_attachments }: { taskId: string; reason: string; feedback_attachments?: any[] }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/revise`, { reason, feedback_attachments });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Revision Requested", description: "Task returned to user for revision." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-tasks/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/notifications", data);
      return response.json();
    },
    onSuccess: () => toast({ title: "Notification Sent", description: "User has been notified." }),
  });

  const updateWithdrawalPaymentDetailsMutation = useMutation({
    mutationFn: async ({ id, details }: { id: string; details: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/withdrawals/${id}/payment-details`, { payment_details: details });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Details Updated", description: "Withdrawal payment info updated." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
    },
  });

  const approveSkillUpgradeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/admin/skill-upgrades/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Skill-Upgrade approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/skill-upgrades/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve upgrade", variant: "destructive" })
  });

  const rejectSkillUpgradeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/skill-upgrades/${id}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Skill-Upgrade rejected" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/skill-upgrades/pending'] });
    },
    onError: () => toast({ title: "Error", description: "Failed to reject upgrade", variant: "destructive" })
  });

  const approveVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/verify-approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification Approved", description: "User has been verified." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    }
  });

  const rejectVerificationMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/verify-reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification Rejected", description: "Request has been rejected." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications/pending'] });
    }
  });
  const onCreateTask = (data: InsertTask) => {
    // Ensure empty URL is explicitly sent as null if not empty or valid
    const processedData = {
      ...data,
      url: data.url?.trim() === "" ? null : data.url
    };
    createTaskMutation.mutate(processedData as InsertTask);
  };

  const onUpdateTask = (id: string, data: Partial<InsertTask>) => {
    updateTaskMutation.mutate({ id, updates: data });
  };

  const handleTaskApproval = (taskId: string, approve: boolean, reason?: string) => {
    if (approve) {
      approveTaskMutation.mutate(taskId);
    } else if (reason) {
      rejectTaskMutation.mutate({ taskId, reason });
    }
  };
  const handleWithdrawalUpdate = (id: string, status: string, adminNotes?: string) => {
    updateWithdrawalMutation.mutate({
      id,
      updates: { status, adminNotes },
    });
  };
  const tierEmoji = {
    member: '👤',
    silver: '🥈',
    bronze: '🥉',
    diamond: '💎',
    gold: '🏅',
    vip: '💰',
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, tasks, and platform operations</p>
        </div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>

          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Skill Upgrades</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeSkillUpgrades}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$ {parseFloat(stats.totalEarnings).toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referral Bonuses Paid</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$ {parseFloat(stats.totalReferralBonuses).toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verification Requests</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.verificationRequests}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 5).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {user.gender === 'male' ? '🙍🏻‍♂️' : user.gender === 'female' ? '🙎‍♀️' : '🤓'}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Badge>
                          {user.skill_upgrade_tier ? tierEmoji[user.skill_upgrade_tier as keyof typeof tierEmoji] : '🔒'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pending Task Reviews</span>
                      <Badge variant="secondary">{pendingTasks?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Applications</span>
                      <Badge variant="secondary">{stats.pendingApplications || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Admin Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentActivity?.length > 0 ? (
                      stats.recentActivity.map((activity: any) => (
                        <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <p className="font-medium">
                              {activity.activity_type === 'user_registration' ? 'New User Registered' : (activity.task?.title || 'Unknown Task')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.activity_type === 'user_registration'
                                ? `User ${activity.user?.name || 'Unknown'} signed up`
                                : `${activity.status === 'approved' ? 'Approved' : 'Rejected'} for ${activity.user?.name || 'Unknown User'}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              activity.activity_type === 'user_registration' ? 'outline' :
                                activity.status === 'approved' ? 'default' : 'destructive'
                            }>
                              {activity.activity_type === 'user_registration' ? 'New' : activity.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.updated_at || activity.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>All Users</CardTitle>
                <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                  <Label htmlFor="global-profile-editing" className="text-sm font-medium cursor-pointer">
                    Allow Profile Editing
                  </Label>
                  <Switch
                    id="global-profile-editing"
                    checked={settings?.allow_profile_editing ?? true}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ allow_profile_editing: checked })}
                  />
                </div>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Skill Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {user.gender === 'male' ? '🙍🏻‍♂️' : user.gender === 'female' ? '🙎‍♀️' : '🤓'}
                            </span>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          {user.skill_upgrade_tier ? (
                            <Badge>
                              {tierEmoji[user.skill_upgrade_tier as keyof typeof tierEmoji]} {user.skill_upgrade_tier}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Training</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={user.is_active ? 'bg-success' : 'bg-destructive'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.approval_status === 'approved' ? 'default' :
                              user.approval_status === 'pending' ? 'secondary' :
                                'destructive'
                          }>
                            {user.approval_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.verification_status === 'verified' ? 'default' : user.verification_status === 'requested' ? 'secondary' : 'outline'}>
                            {user.verification_status || 'none'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Approval Buttons (legacy/quick action) */}
                            {user.approval_status === 'pending' && (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => approveUserMutation.mutate(user.id)} title="Approve">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => rejectUserMutation.mutate({ userId: user.id, reason: "Account review failed" })} title="Reject">
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setEditingUser(user); setEditDialogOpen(true); }}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit Profile </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  sendNotificationMutation.mutate({
                                    userId: user.id,
                                    title: "Profile Update Request",
                                    message: "Admin has requested that you update your profile details. Please go to your profile settings.",
                                    type: "system",
                                    is_read: false
                                  });
                                }}>
                                  <Bell className="mr-2 h-4 w-4" /> Request Profile Update
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => verifyIdentityMutation.mutate(user.id)}>
                                  <Shield className="mr-2 h-4 w-4" /> Verify Identity
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.is_suspended ? (
                                  <DropdownMenuItem onClick={() => suspendUserMutation.mutate({ userId: user.id, isSuspended: false })}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Unsuspend
                                  </DropdownMenuItem>
                                ) : (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Ban className="mr-2 h-4 w-4 text-orange-500" /> Suspend User
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Suspend User</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <Label>Suspension Duration (Days)</Label>
                                        <Input type="number" placeholder="Enter days (0 for indefinite)" id={`suspend-days-${user.id}`} />
                                        <Button
                                          className="w-full"
                                          onClick={() => {
                                            const daysInput = document.getElementById(`suspend-days-${user.id}`) as HTMLInputElement;
                                            const days = parseInt(daysInput?.value || '0');
                                            suspendUserMutation.mutate({ userId: user.id, isSuspended: true, duration_days: days });
                                          }} > Confirm Suspension </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => deactivateUserMutation.mutate(user.id)}>
                                  <UserX className="mr-2 h-4 w-4" /> Deactivate Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Task Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create New Task</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Task Title</Label>
                      <Input id="title" {...taskForm.register("title")} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" {...taskForm.register("description")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category Discipline</Label>
                        <Select
                          onValueChange={(value) => {
                            taskForm.setValue('category', value as TaskCategory);
                            const tierMap: Record<TaskCategory, SkillUpgradeTier> = {
                              main: 'member',
                              social: 'silver',
                              app: 'bronze',
                              surveys: 'diamond',
                              testing: 'gold',
                              ai: 'vip',
                            };
                            taskForm.setValue('minTier', tierMap[value as TaskCategory] || 'member');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select discipline" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ai">🤖 AI Training (VIP Tier)</SelectItem>
                            <SelectItem value="testing">⚙️ App & Web Testing (Gold Tier)</SelectItem>
                            <SelectItem value="surveys">📊 Surveys & Polls (Diamond Tier)</SelectItem>
                            <SelectItem value="social">👥 Social Engagement (Silver Tier)</SelectItem>
                            <SelectItem value="app">📱 Application Tasks (Bronze Tier)</SelectItem>
                            <SelectItem value="main">📋 Core Verification (Member Tier)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Auto-calibrates minimum skill upgrade tier requirement.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="minTier">Minimum Required Tier</Label>
                        <Select
                          value={taskForm.watch('minTier')}
                          onValueChange={(value) => taskForm.setValue('minTier', value as SkillUpgradeTier)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member (Free)</SelectItem>
                            <SelectItem value="silver">Silver ($10)</SelectItem>
                            <SelectItem value="bronze">Bronze ($25)</SelectItem>
                            <SelectItem value="diamond">Diamond ($50)</SelectItem>
                            <SelectItem value="gold">Gold ($75)</SelectItem>
                            <SelectItem value="vip">VIP ($100)</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Mapped to user skill upgrade unlocks.
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reward">Reward ($ Usd)</Label>
                      <Input
                        id="reward"
                        type="number"
                        step="0.01"
                        {...taskForm.register("reward")}
                      />
                    </div>
                    <div>
                      <Input id="url" type="url" {...taskForm.register("url")} />
                    </div>
                    <div>
                      <Label>Instruction Attachments</Label>
                      <FileUpload
                        bucket="task-attachments"
                        onUploadSuccess={(uploadedFiles) => {
                          taskForm.setValue('attachments', uploadedFiles);
                        }}
                        useProxy={true}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="create-isActive"
                        className="h-4 w-4 rounded border-gray-300"
                        defaultChecked={true}
                        {...taskForm.register("isActive")}
                      />
                      <Label htmlFor="create-isActive">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="create-isOrientation"
                        className="h-4 w-4 rounded border-gray-300"
                        {...taskForm.register("isOrientation")}
                      />
                      <Label htmlFor="create-isOrientation">Orientation Benchmark Task</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Min Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTasks?.map((task: Task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{task.title}</span>
                            {task.is_orientation && (
                              <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                                Orientation
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{task.category}</TableCell>
                        <TableCell>${parseFloat(String(task.reward)).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {tierEmoji[task.min_tier as keyof typeof tierEmoji]} {task.min_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={task.is_active ? "default" : "secondary"}>
                              {task.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" title="Recommend">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Recommend Task</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Label>User ID</Label>
                                  <Input placeholder="Enter User ID (UUID)" type="text" id={`rec-user-${task.id}`} />
                                  <Button
                                    className="w-full"
                                    onClick={() => {
                                      const inputInfo = document.getElementById(`rec-user-${task.id}`) as HTMLInputElement;
                                      const userId = inputInfo?.value?.trim();
                                      if (userId) recommendTaskMutation.mutate({ taskId: task.id, userId });
                                    }} >  Send Recommendation
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">Edit</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Edit Task</DialogTitle>
                                </DialogHeader>
                                <EditTaskForm task={task} onUpdate={(data) => onUpdateTask(task.id, data)} />
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">Delete</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Task</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>Are you sure you want to delete "{task.title}"? This action cannot be undone.</p>
                                  <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                    disabled={deleteTaskMutation.isPending}
                                  >
                                    {deleteTaskMutation.isPending ? "Deleting..." : "Confirm Delete"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!allTasks || allTasks.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tasks found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Identity Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingVerifications?.map((vUser: any) => (
                    <div key={vUser.id} className="border rounded-lg p-4 bg-primary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {vUser.gender === 'male' ? '🙍🏻‍♂️' : vUser.gender === 'female' ? '🙎‍♀️' : '🤓'}
                            {vUser.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{vUser.email} • {vUser.phone || 'No phone'}</p>
                          <div className="mt-4 space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Uploaded Documents:</Label>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(vUser.verification_documents) ? vUser.verification_documents.map((doc: string, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5"
                                  onClick={() => handleViewDocument(doc)}
                                >
                                  <FileText className="h-4 w-4" />
                                  View Doc {idx + 1}
                                </Button>
                              )) : (
                                <p className="text-sm text-muted-foreground italic">No document links found</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Identity Review</Badge>
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={() => approveVerificationMutation.mutate(vUser.id)}
                          disabled={approveVerificationMutation.isPending}
                        >
                          Approve Identity
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive">Reject</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Identity Verification</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Reason for rejection (e.g., documents unclear)..."
                                id={`v-reject-reason-${vUser.id}`}
                              />
                              <Button
                                onClick={() => {
                                  const reason = (document.getElementById(`v-reject-reason-${vUser.id}`) as HTMLTextAreaElement)?.value;
                                  if (reason) rejectVerificationMutation.mutate({ userId: vUser.id, reason });
                                }}
                                className="w-full"
                                variant="destructive"
                                disabled={rejectVerificationMutation.isPending}
                              >
                                Confirm Rejection
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                  {(!pendingVerifications || pendingVerifications.length === 0) && (
                    <p className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">No pending identity verifications</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Skill Upgrades</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSkillUpgrades?.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{sub.user?.name}</span>
                            <span className="text-xs text-muted-foreground">{sub.user?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {tierEmoji[sub.tier as keyof typeof tierEmoji]} {sub.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>${sub.amount}</TableCell>
                        <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveSkillUpgradeMutation.mutate(sub.id)}
                              disabled={approveSkillUpgradeMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">Reject</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Skill-Upgrade</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter rejection reason..."
                                    id={`sub-reject-${sub.id}`}
                                  />
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      const reason = (document.getElementById(`sub-reject-${sub.id}`) as HTMLTextAreaElement)?.value;
                                      if (reason) rejectSkillUpgradeMutation.mutate({ id: sub.id, reason });
                                    }}
                                    className="w-full"
                                    disabled={rejectSkillUpgradeMutation.isPending}
                                  > Confirm Rejection
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pendingSkillUpgrades || pendingSkillUpgrades.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No pending upgrades
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Task Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* 1. Submissions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      Task Submissions
                      <Badge variant="secondary">{pendingTasks?.filter((t: any) => t.status === 'submitted').length || 0}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingTasks?.filter((t: any) => t.status === 'submitted').map((userTask: any) => (
                        <div key={userTask.id} className="border rounded-lg p-4 bg-muted/10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold">{userTask.task.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                by {userTask.user.name} • Submitted {new Date(userTask.created_at).toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm">{userTask.task.description}</p>
                              </div>
                              {userTask.proof_attachments && userTask.proof_attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Proof of Work:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {userTask.proof_attachments.map((file: any, i: number) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleViewDocument(file.url)}
                                        className="flex items-center gap-1 text-xs bg-accent/10 border border-accent/20 px-2 py-1 rounded hover:bg-accent/20 transition-colors"
                                      >
                                        <FileText className="h-3 w-3" />
                                        <span className="truncate max-w-[100px]">{file.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {userTask.submission_description && (
                                <div className="mt-2 bg-muted/50 p-2 rounded text-xs italic">
                                  "{userTask.submission_description}"
                                </div>
                              )}
                            </div>
                            <Badge className="bg-success"> $ {parseFloat(userTask.task.reward).toFixed(0)}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleTaskApproval(userTask.id, true)}
                              disabled={approveTaskMutation.isPending}
                            >  Approve & Pay
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">Revise</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Request Revision</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter revision instructions..."
                                    id={`revise-reason-${userTask.id}`}
                                  />
                                  <div className="space-y-2">
                                    <Label>Feedback Files (Optional)</Label>
                                    <FileUpload
                                      bucket="task-attachments"
                                      onUploadSuccess={(files) => {
                                        (window as any)[`feedback_files_${userTask.id}`] = files;
                                      }}
                                      useProxy={true}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const reason = (document.getElementById(`revise-reason-${userTask.id}`) as HTMLTextAreaElement)?.value;
                                      const feedback_attachments = (window as any)[`feedback_files_${userTask.id}`];
                                      if (reason) reviseTaskMutation.mutate({ taskId: userTask.id, reason, feedback_attachments });
                                    }}
                                    className="w-full"
                                    disabled={reviseTaskMutation.isPending}
                                  > Send for Revision
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">Reject</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Task</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter rejection reason..."
                                    id={`reason-${userTask.id}`}
                                  />
                                  <Button
                                    onClick={() => {
                                      const reason = (document.getElementById(`reason-${userTask.id}`) as HTMLTextAreaElement)?.value;
                                      if (reason) handleTaskApproval(userTask.id, false, reason);
                                    }}
                                    className="w-full"
                                    disabled={rejectTaskMutation.isPending}
                                  > Confirm Rejection
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                      {!pendingTasks?.some((t: any) => t.status === 'submitted') && (
                        <p className="text-center text-muted-foreground py-4 border border-dashed rounded-lg">No pending task submissions</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t my-4" />

                  {/* 2. Bids */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      Bids & Applications
                      <Badge variant="secondary">{pendingTasks?.filter((t: any) => t.status === 'pending').length || 0}</Badge>
                    </h3>
                    <div className="space-y-4">
                      {pendingTasks?.filter((t: any) => t.status === 'pending').map((userTask: any) => (
                        <div key={userTask.id} className="border rounded-lg p-4 bg-yellow-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">{userTask.task.title}</h4>
                              <p className="text-sm text-muted-foreground">Applicant: {userTask.user.name} <span className="text-xs border px-1 rounded ml-1">{tierEmoji[userTask.user.skill_upgrade_tier as keyof typeof tierEmoji] || '🔒'} {userTask.user.skill_upgrade_tier}</span></p>
                            </div>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Bid</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleTaskApproval(userTask.id, true)} disabled={approveTaskMutation.isPending}>
                              Accept Bid (Assign)
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">Reject</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Bid</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Reason for rejection (optional)..."
                                    id={`bid-reject-${userTask.id}`}
                                  />
                                  <Button
                                    onClick={() => {
                                      const reason = (document.getElementById(`bid-reject-${userTask.id}`) as HTMLTextAreaElement)?.value || "Bid Rejected";
                                      handleTaskApproval(userTask.id, false, reason);
                                    }}
                                    className="w-full"
                                    disabled={rejectTaskMutation.isPending}
                                  > Confirm Rejection
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                      {!pendingTasks?.some((t: any) => t.status === 'pending') && (
                        <p className="text-center text-muted-foreground py-4 border border-dashed rounded-lg">No pending bids</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals?.map((withdrawal: any) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">User #{withdrawal.userId}</TableCell>
                        <TableCell>${parseFloat(withdrawal.amount).toLocaleString()}</TableCell>
                        <TableCell>{withdrawal.phoneNumber}</TableCell>
                        <TableCell>
                          <Badge className={
                            withdrawal.status === 'completed' ? 'bg-success' :
                              withdrawal.status === 'failed' ? 'bg-destructive' : 'bg-warning'
                          }>
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {withdrawal.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleWithdrawalUpdate(withdrawal.id, 'completed')}
                                disabled={updateWithdrawalMutation.isPending}
                              >
                                Approve
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="ghost" title="Edit Payment Details" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Payment Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Label>Payment Details</Label>
                                    <Textarea
                                      id={`payment-details-${withdrawal.id}`}
                                      defaultValue={withdrawal.admin_notes || ''}
                                      placeholder="Enter payment account details..."
                                    />
                                    <Button
                                      className="w-full" onClick={() => {
                                        const details = (document.getElementById(`payment-details-${withdrawal.id}`) as HTMLTextAreaElement)?.value;
                                        if (details) updateWithdrawalPaymentDetailsMutation.mutate({ id: withdrawal.id, details });
                                      }} disabled={updateWithdrawalPaymentDetailsMutation.isPending}
                                    > Save Details
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">Reject</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Withdrawal</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea
                                      placeholder="Enter rejection reason..."
                                      id={`withdrawal-reason-${withdrawal.id}`}
                                    />
                                    <Button
                                      onClick={() => {
                                        const reason = (document.getElementById(`withdrawal-reason-${withdrawal.id}`) as HTMLTextAreaElement)?.value;
                                        handleWithdrawalUpdate(withdrawal.id, 'failed', reason);
                                      }}
                                      className="w-full"
                                      disabled={updateWithdrawalMutation.isPending}
                                    >
                                      Confirm Rejection
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            {/* <AdminFinance /> */}
          </TabsContent>

          <TabsContent value="settings">
            {/* System Settings Component */}
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" defaultValue={editingUser.name} required />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" defaultValue={editingUser.email} required type="email" />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editingUser.phone || ''} />
              </div>
              <Button type="submit" disabled={updateUserProfileMutation.isPending} className="w-full">
                {updateUserProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/settings");
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: { allow_profile_editing: boolean }) => {
      await apiRequest("POST", "/api/admin/settings", data);
    },
    onSuccess: () => {
      toast({ title: "Settings Updated", description: "System configuration updated." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update settings", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow-profile-editing">Allow Profile Editing</Label>
              <p className="text-sm text-muted-foreground"> Enable or disable the ability for users to edit their own profiles.</p>
            </div>
            <Switch
              id="allow-profile-editing"
              checked={settings?.allow_profile_editing ?? true}
              onCheckedChange={(checked) => mutation.mutate({ allow_profile_editing: checked })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditTaskForm({ task, onUpdate }: { task: Task; onUpdate: (data: Partial<InsertTask>) => void }) {
  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      category: task.category,
      url: task.url || "",
      reward: String(task.reward), // Ensure string for form input
      minTier: task.min_tier,
      isActive: task.is_active,
      isOrientation: task.is_orientation,
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => onUpdate(data))} className="space-y-4">
      <div>
        <Label htmlFor="edit-title">Task Title</Label>
        <Input id="edit-title" {...form.register("title")} />
      </div>
      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" {...form.register("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-category">Category</Label>
          <Select
            defaultValue={task.category}
            onValueChange={(value) => form.setValue('category', value as TaskCategory)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main Tasks</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="surveys">Surveys & Polls</SelectItem>
              <SelectItem value="testing">App/Website Testing</SelectItem>
              <SelectItem value="ai">AI Training</SelectItem>
              <SelectItem value="app">Application Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-minTier">Minimum Tier</Label>
          <Select
            defaultValue={task.min_tier}
            onValueChange={(value) => form.setValue('minTier', value as SkillUpgradeTier)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="diamond">Diamond</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="edit-reward">Reward ($ Usd)</Label>
        <Input
          id="edit-reward"
          type="number"
          step="0.01"
          {...form.register("reward")}
        />
      </div>
      <div>
        <Label htmlFor="edit-url">Task URL (optional)</Label>
        <Input id="edit-url" type="url" {...form.register("url")} />
      </div>
      <div>
        <Label>Instruction Attachments</Label>
        <FileUpload
          bucket="task-attachments"
          initialFiles={task.attachments || []}
          onUploadSuccess={(uploadedFiles) => {
            form.setValue('attachments', uploadedFiles);
          }}
          useProxy={true}
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-isActive"
          className="h-4 w-4 rounded border-gray-300"
          {...form.register("isActive")}
        />
        <Label htmlFor="edit-isActive">Active</Label>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-isOrientation"
          className="h-4 w-4 rounded border-gray-300"
          {...form.register("isOrientation")}
        />
        <Label htmlFor="edit-isOrientation">Is Orientation Task</Label>
      </div>
      <Button type="submit" className="w-full">
        Update Task
      </Button>
    </form>
  );
}
