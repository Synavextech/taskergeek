
import {
  type User, type Task, type Withdrawal, type UserTask, type TaskCategory, type SkillUpgradeTier,
  type ProjectSection, type ProjectSubsection, type ProjectTaskItem
} from "@shared/types";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema, type InsertTask } from "@shared/types";
import {
  Users, DollarSign, ClipboardList, UserCheck, Phone,
  MoreVertical, Edit, Shield, Ban, UserX, CheckCircle, Bell, ExternalLink, Gift, UserPlus, Lock as LucideLock, FileUp,
  FileText, Star, Plus, Trash2, Clock, Layers, Copy, MessageSquare, Send, MessageCircle
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

  // Support Livechat Admin State & Queries
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");

  const { data: supportConversations = [] } = useQuery<any[]>({
    queryKey: ['/api/support/admin/conversations'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/support/admin/conversations");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: selectedChatMessages = [], isLoading: isChatMessagesLoading } = useQuery<any[]>({
    queryKey: ['/api/support/admin/messages', selectedChatUserId],
    queryFn: async () => {
      if (!selectedChatUserId) return [];
      const res = await apiRequest("GET", `/api/support/admin/messages/${selectedChatUserId}`);
      return res.json();
    },
    enabled: !!selectedChatUserId,
    refetchInterval: selectedChatUserId ? 3000 : false,
  });

  const sendAdminReplyMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/support/admin/messages/${userId}`, { message });
      return res.json();
    },
    onSuccess: () => {
      setAdminReplyText("");
      queryClient.invalidateQueries({ queryKey: ['/api/support/admin/messages', selectedChatUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/support/admin/conversations'] });
    },
    onError: (err: any) => {
      toast({
        title: "Reply Failed",
        description: err.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const totalUnreadSupport = (supportConversations || []).reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
  const activeConversationUser = supportConversations.find((c: any) => c.userId === selectedChatUserId);


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

  // Task Approval & Rejection Modal States
  const [approvingTask, setApprovingTask] = useState<any | null>(null);
  const [approvalQualityRating, setApprovalQualityRating] = useState<number>(5);

  const [rejectingTask, setRejectingTask] = useState<any | null>(null);
  const [rejectionQualityRating, setRejectionQualityRating] = useState<number>(1);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Task Creation States for Project-based Tasks
  const [taskTypeState, setTaskTypeState] = useState<'standard' | 'project'>('standard');
  const [projectSections, setProjectSections] = useState<ProjectSection[]>([
    {
      id: "sec-1",
      title: "Section 1: Initial Discovery & Verification",
      description: "Perform comprehensive initial checks and data inspection",
      subsections: [
        {
          id: "subsec-1-1",
          title: "Subsection 1.1: Core Checks",
          description: "Follow the core inspection parameters",
          tasks: [
            {
              id: "task-1-1-1",
              title: "Deliverable Step 1",
              description: "Execute the benchmark inspection and record details.",
              type: "text",
              estimated_duration_minutes: 15,
            }
          ]
        }
      ]
    }
  ]);

  const addProjectSection = () => {
    const newSecId = `sec-${Date.now()}`;
    setProjectSections(prev => [
      ...prev,
      {
        id: newSecId,
        title: `Section ${prev.length + 1}: Project Phase`,
        description: "",
        subsections: [
          {
            id: `subsec-${Date.now()}`,
            title: "Subsection 1",
            tasks: [
              {
                id: `task-${Date.now()}`,
                title: "Subtask 1",
                description: "",
                type: "text",
                estimated_duration_minutes: 15
              }
            ]
          }
        ]
      }
    ]);
  };

  const addProjectSubsection = (secId: string) => {
    setProjectSections(prev => prev.map(sec => {
      if (sec.id !== secId) return sec;
      return {
        ...sec,
        subsections: [
          ...sec.subsections,
          {
            id: `subsec-${Date.now()}`,
            title: `Subsection ${sec.subsections.length + 1}`,
            tasks: [
              {
                id: `task-${Date.now()}`,
                title: "Subtask 1",
                description: "",
                type: "text",
                estimated_duration_minutes: 15
              }
            ]
          }
        ]
      };
    }));
  };

  const addProjectTaskItem = (secId: string, subId: string) => {
    setProjectSections(prev => prev.map(sec => {
      if (sec.id !== secId) return sec;
      return {
        ...sec,
        subsections: sec.subsections.map(sub => {
          if (sub.id !== subId) return sub;
          return {
            ...sub,
            tasks: [
              ...sub.tasks,
              {
                id: `task-${Date.now()}`,
                title: `Task ${sub.tasks.length + 1}`,
                description: "",
                type: "text",
                estimated_duration_minutes: 15
              }
            ]
          };
        })
      };
    }));
  };

  const removeProjectSection = (secId: string) => {
    setProjectSections(prev => prev.filter(s => s.id !== secId));
  };

  const taskForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "main",
      taskType: "standard",
      url: "",
      reward: "0",
      hourlyRate: "0",
      maxParticipants: 1,
      estimatedDurationMinutes: 30,
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
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
    mutationFn: async ({ taskId, quality_rating }: { taskId: string; quality_rating?: number }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/approve`, { quality_rating });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Success" : "Task approved",
        description: data.message || "Task has been approved and earnings added",
      });
      setApprovingTask(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-tasks/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason, quality_rating }: { taskId: string; reason: string; quality_rating?: number }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/reject`, { reason, quality_rating });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Task rejected",
        description: data?.message || "Task has been rejected with reason and quality score",
      });
      setRejectingTask(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-tasks/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const expandSlotsMutation = useMutation({
    mutationFn: async ({ id, currentMax }: { id: string; currentMax: number }) => {
      const response = await apiRequest("PATCH", `/api/admin/tasks/${id}`, {
        max_participants: currentMax + 5,
        is_active: true
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Slots Expanded",
        description: "5 additional participant slots added and project reactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
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

  const togglePhoneVerifyMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/verify-phone`, { verified });
      return response.json();
    },
    onSuccess: (data: { success: boolean; user: User }, variables) => {
      const updatedUser = data.user;
      toast({
        title: variables.verified ? "Phone Verified" : "Phone Verification Revoked",
        description: variables.verified ? "User phone marked as verified." : "User phone verification reset."
      });
      queryClient.setQueryData(['/api/admin/users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return [];
        return oldUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update phone verification status",
        variant: "destructive"
      });
    }
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
      taskType: taskTypeState,
      hourlyRate: taskTypeState === 'project' ? (data.hourlyRate || "15.00") : "0",
      maxParticipants: taskTypeState === 'project' ? (Number(data.maxParticipants) || 1) : (Number(data.maxParticipants) || 100),
      projectStructure: taskTypeState === 'project' ? projectSections : null,
      url: data.url?.trim() === "" ? null : data.url
    };
    createTaskMutation.mutate(processedData as InsertTask);
  };

  const onUpdateTask = (id: string, data: Partial<InsertTask>) => {
    updateTaskMutation.mutate({ id, updates: data });
  };

  const handleTaskApproval = (taskId: string, approve: boolean, reason?: string, quality_rating?: number) => {
    if (approve) {
      approveTaskMutation.mutate({ taskId, quality_rating: quality_rating ?? 5 });
    } else {
      rejectTaskMutation.mutate({ taskId, reason: reason || "Task submission rejected", quality_rating: quality_rating ?? 1 });
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
    universal: '🌐',
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, tasks, and platform operations</p>
        </div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="support" className="relative flex items-center justify-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Support Chat</span>
              {totalUnreadSupport > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[10px] font-black px-1.5 py-0.2 leading-tight">
                  {totalUnreadSupport}
                </span>
              )}
            </TabsTrigger>
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
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs">{user.phone || '—'}</span>
                            {user.phone && (
                              user.phone_verified ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] w-fit py-0">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px] w-fit py-0">
                                  Unverified
                                </Badge>
                              )
                            )}
                          </div>
                        </TableCell>
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
                                {user.phone && (
                                  <DropdownMenuItem
                                    onClick={() => togglePhoneVerifyMutation.mutate({ userId: user.id, verified: !user.phone_verified })}
                                  >
                                    <Phone className="mr-2 h-4 w-4 text-emerald-500" />
                                    {user.phone_verified ? "Revoke Phone Verification" : "Mark Phone Verified"}
                                  </DropdownMenuItem>
                                )}
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
              <div>
                <h2 className="text-xl font-semibold">Task Management</h2>
                <p className="text-xs text-muted-foreground">Manage standard micro-tasks and multi-section hourly projects</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Create New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Task / Project</DialogTitle>
                  </DialogHeader>

                  {/* Task Type Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg my-2">
                    <Button
                      type="button"
                      variant={taskTypeState === 'standard' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setTaskTypeState('standard');
                        taskForm.setValue('taskType', 'standard');
                      }}
                      className="flex items-center gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Standard Task (Fixed Reward)
                    </Button>
                    <Button
                      type="button"
                      variant={taskTypeState === 'project' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setTaskTypeState('project');
                        taskForm.setValue('taskType', 'project');
                      }}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Project Task (Hourly Rate)
                    </Button>
                  </div>

                  <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-4">
                    <div>
                      <Label htmlFor="title">{taskTypeState === 'project' ? 'Project Title' : 'Task Title'}</Label>
                      <Input id="title" placeholder={taskTypeState === 'project' ? 'e.g. End-to-End Application Quality Audit' : 'e.g. Test Checkout Flow'} {...taskForm.register("title")} />
                    </div>
                    <div>
                      <Label htmlFor="description">Overview & Scope</Label>
                      <Textarea id="description" rows={3} placeholder="Describe the objectives and requirements" {...taskForm.register("description")} />
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

                    {taskTypeState === 'standard' ? (
                      <div>
                        <Label htmlFor="reward">Fixed Reward ($ USD)</Label>
                        <Input
                          id="reward"
                          type="number"
                          step="0.01"
                          placeholder="5.00"
                          {...taskForm.register("reward")}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                        <div>
                          <Label htmlFor="hourlyRate">Hourly Rate ($ / hr)</Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            step="0.01"
                            placeholder="18.50"
                            {...taskForm.register("hourlyRate")}
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">Accrues dynamically as user works.</p>
                        </div>
                        <div>
                          <Label htmlFor="maxParticipants">Participant Limit</Label>
                          <Input
                            id="maxParticipants"
                            type="number"
                            placeholder="10"
                            {...taskForm.register("maxParticipants")}
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">Auto-hides project when full.</p>
                        </div>
                        <div>
                          <Label htmlFor="estimatedDurationMinutes">Est. Duration (Mins)</Label>
                          <Input
                            id="estimatedDurationMinutes"
                            type="number"
                            placeholder="60"
                            {...taskForm.register("estimatedDurationMinutes")}
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">Benchmark project length.</p>
                        </div>
                      </div>
                    )}

                    {/* Project Section & Subsection Hierarchy Builder */}
                    {taskTypeState === 'project' && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                              <Layers className="h-4 w-4 text-primary" /> Project Sections & Questions
                            </h4>
                            <p className="text-xs text-muted-foreground">Define sections, subsections, and questions/tasks with estimated durations.</p>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={addProjectSection}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {projectSections.map((sec, secIdx) => (
                            <div key={sec.id} className="border rounded-lg p-3 bg-card space-y-3 shadow-sm">
                              <div className="flex items-center justify-between gap-2">
                                <Input
                                  value={sec.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProjectSections(prev => prev.map(s => s.id === sec.id ? { ...s, title: val } : s));
                                  }}
                                  placeholder={`Section ${secIdx + 1} Title`}
                                  className="h-8 font-medium text-sm"
                                />
                                {projectSections.length > 1 && (
                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeProjectSection(sec.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Subsections */}
                              <div className="pl-3 border-l-2 border-primary/20 space-y-2">
                                {sec.subsections.map((subsec, subIdx) => (
                                  <div key={subsec.id} className="p-2.5 rounded bg-muted/30 border space-y-2">
                                    <Input
                                      value={subsec.title}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setProjectSections(prev => prev.map(s => s.id === sec.id ? {
                                          ...s,
                                          subsections: s.subsections.map(sub => sub.id === subsec.id ? { ...sub, title: val } : sub)
                                        } : s));
                                      }}
                                      placeholder={`Subsection ${subIdx + 1} Title`}
                                      className="h-7 text-xs font-semibold"
                                    />

                                    {/* Questions / Subtasks */}
                                    <div className="space-y-1.5">
                                      {subsec.tasks.map((taskItem, tIdx) => (
                                        <div key={taskItem.id} className="grid grid-cols-12 gap-1.5 items-center bg-background/80 p-1.5 rounded border text-xs">
                                          <div className="col-span-6">
                                            <Input
                                              value={taskItem.title}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setProjectSections(prev => prev.map(s => s.id === sec.id ? {
                                                  ...s,
                                                  subsections: s.subsections.map(sub => sub.id === subsec.id ? {
                                                    ...sub,
                                                    tasks: sub.tasks.map(t => t.id === taskItem.id ? { ...t, title: val } : t)
                                                  } : sub)
                                                } : s));
                                              }}
                                              placeholder={`Task / Question ${tIdx + 1}`}
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                          <div className="col-span-3">
                                            <Input
                                              type="number"
                                              value={taskItem.estimated_duration_minutes || 15}
                                              onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setProjectSections(prev => prev.map(s => s.id === sec.id ? {
                                                  ...s,
                                                  subsections: s.subsections.map(sub => sub.id === subsec.id ? {
                                                    ...sub,
                                                    tasks: sub.tasks.map(t => t.id === taskItem.id ? { ...t, estimated_duration_minutes: val } : t)
                                                  } : sub)
                                                } : s));
                                              }}
                                              placeholder="Minutes"
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                          <div className="col-span-3">
                                            <Select
                                              value={taskItem.type || 'text'}
                                              onValueChange={(val: any) => {
                                                setProjectSections(prev => prev.map(s => s.id === sec.id ? {
                                                  ...s,
                                                  subsections: s.subsections.map(sub => sub.id === subsec.id ? {
                                                    ...sub,
                                                    tasks: sub.tasks.map(t => t.id === taskItem.id ? { ...t, type: val } : t)
                                                  } : sub)
                                                } : s));
                                              }}
                                            >
                                              <SelectTrigger className="h-7 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="text">Short Text</SelectItem>
                                                <SelectItem value="textarea">Paragraph</SelectItem>
                                                <SelectItem value="file">File Upload</SelectItem>
                                                <SelectItem value="url">Link / URL</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[11px] text-primary"
                                        onClick={() => addProjectTaskItem(sec.id, subsec.id)}
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Add Question/Subtask
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] text-muted-foreground"
                                  onClick={() => addProjectSubsection(sec.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Subsection
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Input id="url" placeholder="Resource link (optional)" type="url" {...taskForm.register("url")} />
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
                      {createTaskMutation.isPending ? "Creating..." : taskTypeState === 'project' ? "Publish Project Task" : "Create Task"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Tasks & Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type & Category</TableHead>
                      <TableHead>Reward / Rate</TableHead>
                      <TableHead>Slots / Capacity</TableHead>
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
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            {task.task_type === 'project' ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px]">
                                ⏱️ Hourly Project
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">
                                📋 Standard
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{task.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.task_type === 'project' ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              ${parseFloat(String(task.hourly_rate || '15')).toFixed(2)}/hr
                            </span>
                          ) : (
                            <span className="font-medium">
                              ${parseFloat(String(task.reward)).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.task_type === 'project' ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-medium">{task.current_participants || 0} / {task.max_participants || 1}</span>
                                {(task.current_participants || 0) >= (task.max_participants || 1) && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0">FULL</Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-1.5 flex items-center gap-1"
                                onClick={() => expandSlotsMutation.mutate({ id: task.id, currentMax: task.max_participants || 1 })}
                                disabled={expandSlotsMutation.isPending}
                              >
                                <Plus className="h-3 w-3" /> +5 Slots
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unlimited</span>
                          )}
                        </TableCell>
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
                          <div className="mt-4 space-y-3">
                            <div>
                              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                                Identity Documents:
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(vUser.verification_documents) && vUser.verification_documents.length > 0 ? (
                                  vUser.verification_documents.map((doc: string, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs font-medium"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      <FileText className="h-4 w-4 text-accent" />
                                      Identity Doc {idx + 1}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No identity documents uploaded</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                                Tax Documents (W-9 / W-8BEN / Tax ID):
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(vUser.tax_documents) && vUser.tax_documents.length > 0 ? (
                                  vUser.tax_documents.map((doc: string, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs font-medium border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      <FileText className="h-4 w-4 text-emerald-500" />
                                      Tax Doc {idx + 1}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No tax documents uploaded</p>
                                )}
                              </div>
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
                      <TableHead>Payment Method & Reference</TableHead>
                      <TableHead>Training & Exam Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSkillUpgrades?.map((sub: any) => {
                      const refCode = sub.payment_reference || sub.transaction_code || "N/A";
                      const grammarPassed = sub.user?.grammar_test_passed === true;
                      const hasProject = sub.user?.has_project_access === true;
                      const assessments = sub.assessments || [];
                      const passedAssessments = assessments.filter((a: any) => a.passed === true);

                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{sub.user?.name || "Unnamed"}</span>
                              <span className="text-xs text-muted-foreground">{sub.user?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize font-bold">
                              {tierEmoji[sub.tier as keyof typeof tierEmoji] || "👑"} {sub.tier}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ${sub.amount}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="w-fit text-[10px] uppercase font-bold tracking-wider">
                                {sub.payment_method || "manual"}
                              </Badge>
                              <div className="flex items-center gap-1.5 font-mono text-xs bg-muted/50 px-2 py-1 rounded-md border border-border/50 max-w-[200px]">
                                <span className="truncate" title={refCode}>{refCode}</span>
                                {refCode !== "N/A" && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(refCode);
                                      toast({ title: "Copied", description: "Reference code copied to clipboard." });
                                    }}
                                    className="p-1 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                                    title="Copy reference code"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${grammarPassed ? "bg-emerald-500" : "bg-amber-500"}`} />
                                <span className="text-[11px] font-medium">
                                  {grammarPassed ? "Grammar: Passed" : "Grammar: Pending"}
                                </span>
                              </div>
                              {hasProject && (
                                <Badge variant="outline" className="text-[10px] bg-accent/10 border-accent/30 text-accent font-semibold w-fit">
                                  Project Qualified
                                </Badge>
                              )}
                              {passedAssessments.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {passedAssessments.length} Specialist Exam(s) Passed
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveSkillUpgradeMutation.mutate(sub.id)}
                                disabled={approveSkillUpgradeMutation.isPending}
                                className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                              >
                                Approve
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="text-xs h-8">Reject</Button>
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
                      );
                    })}
                    {(!pendingSkillUpgrades || pendingSkillUpgrades.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                            <div className="flex flex-col items-end gap-1">
                              {userTask.task.task_type === 'project' ? (
                                <div className="text-right">
                                  <Badge className="bg-primary/90 text-white font-mono text-xs">
                                    ⏱️ ${(parseFloat(userTask.accrued_earnings || '0') || ((userTask.time_spent_seconds || 0) / 3600 * parseFloat(userTask.hourly_rate || '15'))).toFixed(2)}
                                  </Badge>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {Math.floor((userTask.time_spent_seconds || 0) / 3600)}h {Math.floor(((userTask.time_spent_seconds || 0) % 3600) / 60)}m active • ${parseFloat(userTask.hourly_rate || userTask.task.hourly_rate || '15').toFixed(2)}/hr
                                  </div>
                                </div>
                              ) : (
                                <Badge className="bg-success text-white font-semibold">
                                  ${parseFloat(userTask.task.reward).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Project Responses Preview */}
                          {userTask.project_responses && Object.keys(userTask.project_responses).length > 0 && (
                            <div className="my-3 p-3 bg-muted/40 rounded-lg border text-xs space-y-2">
                              <p className="font-semibold text-muted-foreground uppercase text-[11px] flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5 text-primary" /> Project Question Responses ({Object.keys(userTask.project_responses).length}):
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {Object.entries(userTask.project_responses).map(([k, v]: [string, any]) => (
                                  <div key={k} className="p-2 rounded bg-background border">
                                    <span className="font-medium text-muted-foreground block text-[10px]">{k}</span>
                                    <span className="text-foreground break-words">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                              onClick={() => {
                                setApprovingTask(userTask);
                                setApprovalQualityRating(5);
                              }}
                            >
                              <Star className="h-3.5 w-3.5 fill-current" /> Review & Approve
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
                                  >
                                    Send for Revision
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRejectingTask(userTask);
                                setRejectionQualityRating(1);
                                setRejectionReason("");
                              }}
                            >
                              Reject & Rate
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!pendingTasks?.some((t: any) => t.status === 'submitted') && (
                        <p className="text-center text-muted-foreground py-4 border border-dashed rounded-lg">No pending task submissions</p>
                      )}
                    </div>

                    {/* Task Approval Modal with 0-5 Quality Rating */}
                    <Dialog open={!!approvingTask} onOpenChange={(open) => !open && setApprovingTask(null)}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                            Approve & Rate Quality
                          </DialogTitle>
                        </DialogHeader>
                        {approvingTask && (
                          <div className="space-y-4 py-2">
                            <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
                              <p className="font-semibold text-foreground">{approvingTask.task?.title}</p>
                              <p className="text-xs text-muted-foreground">Tasker: <span className="font-medium text-foreground">{approvingTask.user?.name}</span></p>
                              <p className="text-xs text-muted-foreground">
                                Calculated Payout: <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  ${approvingTask.task?.task_type === 'project'
                                    ? (parseFloat(approvingTask.accrued_earnings || '0') || ((approvingTask.time_spent_seconds || 0) / 3600 * parseFloat(approvingTask.hourly_rate || '15'))).toFixed(2)
                                    : parseFloat(approvingTask.task?.reward || '0').toFixed(2)}
                                </span>
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold flex items-center justify-between">
                                <span>Quality Rating (0 - 5 Stars)</span>
                                <span className="text-primary font-bold">{approvalQualityRating.toFixed(1)} / 5.0</span>
                              </Label>
                              <div className="flex items-center justify-between gap-1 p-2 bg-muted/20 rounded-lg border">
                                {[0, 1, 2, 3, 4, 5].map((starVal) => (
                                  <button
                                    key={starVal}
                                    type="button"
                                    onClick={() => setApprovalQualityRating(starVal)}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                                      approvalQualityRating === starVal
                                        ? "bg-amber-500 text-white shadow-sm scale-105"
                                        : "bg-background hover:bg-muted text-muted-foreground border"
                                    }`}
                                  >
                                    <Star className={`h-4 w-4 ${approvalQualityRating >= starVal && starVal > 0 ? "fill-amber-400 text-amber-400" : ""}`} />
                                    <span>{starVal}★</span>
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {approvalQualityRating === 5 && "⭐ 5.0 - Exceptional Quality: Thorough work adhering to all specifications."}
                                {approvalQualityRating === 4 && "⭐ 4.0 - High Quality: Minor trivial imperfections, well-executed."}
                                {approvalQualityRating === 3 && "⭐ 3.0 - Satisfactory: Meets basic acceptable standards."}
                                {approvalQualityRating === 2 && "⭐ 2.0 - Subpar: Noticeable flaws or incomplete execution."}
                                {approvalQualityRating === 1 && "⭐ 1.0 - Poor: Low effort or significant errors."}
                                {approvalQualityRating === 0 && "⭐ 0.0 - Unacceptable: Completely incorrect work."}
                              </p>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                              <Button variant="outline" onClick={() => setApprovingTask(null)}>Cancel</Button>
                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={approveTaskMutation.isPending}
                                onClick={() => handleTaskApproval(approvingTask.id, true, undefined, approvalQualityRating)}
                              >
                                {approveTaskMutation.isPending ? "Approving..." : "Confirm & Release Payment"}
                              </Button>
                            </DialogFooter>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Task Rejection Modal with Quality Score and Reason */}
                    <Dialog open={!!rejectingTask} onOpenChange={(open) => !open && setRejectingTask(null)}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-destructive flex items-center gap-2">
                            Reject Submission & Rate Quality
                          </DialogTitle>
                        </DialogHeader>
                        {rejectingTask && (
                          <div className="space-y-4 py-2">
                            <div className="p-3 bg-destructive/10 rounded-lg text-sm space-y-1">
                              <p className="font-semibold text-foreground">{rejectingTask.task?.title}</p>
                              <p className="text-xs text-muted-foreground">Tasker: <span className="font-medium text-foreground">{rejectingTask.user?.name}</span></p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold flex items-center justify-between">
                                <span>Quality Rating for Submission</span>
                                <span className="text-destructive font-bold">{rejectionQualityRating.toFixed(1)} / 5.0</span>
                              </Label>
                              <div className="flex items-center justify-between gap-1 p-2 bg-muted/20 rounded-lg border">
                                {[0, 1, 2, 3, 4, 5].map((starVal) => (
                                  <button
                                    key={starVal}
                                    type="button"
                                    onClick={() => setRejectionQualityRating(starVal)}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                                      rejectionQualityRating === starVal
                                        ? "bg-destructive text-white shadow-sm"
                                        : "bg-background hover:bg-muted text-muted-foreground border"
                                    }`}
                                  >
                                    <Star className={`h-4 w-4 ${rejectionQualityRating >= starVal && starVal > 0 ? "fill-amber-400 text-amber-400" : ""}`} />
                                    <span>{starVal}★</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reject-task-reason">Rejection Feedback / Reason</Label>
                              <Textarea
                                id="reject-task-reason"
                                placeholder="Explain why the submission failed standards..."
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                              />
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                              <Button variant="outline" onClick={() => setRejectingTask(null)}>Cancel</Button>
                              <Button
                                variant="destructive"
                                disabled={rejectTaskMutation.isPending || !rejectionReason.trim()}
                                onClick={() => handleTaskApproval(rejectingTask.id, false, rejectionReason, rejectionQualityRating)}
                              >
                                {rejectTaskMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                              </Button>
                            </DialogFooter>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
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

          <TabsContent value="support" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[650px]">
              {/* Conversations List */}
              <Card className="col-span-1 flex flex-col h-full border-border/80">
                <CardHeader className="py-3 px-4 border-b shrink-0 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-accent" />
                    <CardTitle className="text-sm font-bold">Conversations</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {supportConversations.length} Active
                  </Badge>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
                  {supportConversations.length === 0 ? (
                    <div className="text-center py-12 px-4 text-xs text-muted-foreground">
                      No customer support inquiries yet.
                    </div>
                  ) : (
                    supportConversations.map((conv: any) => {
                      const isSelected = selectedChatUserId === conv.userId;
                      return (
                        <div
                          key={conv.userId}
                          onClick={() => setSelectedChatUserId(conv.userId)}
                          className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-accent/15 border-accent shadow-sm'
                              : 'bg-card hover:bg-muted/60 border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-bold text-xs text-foreground truncate">
                              {conv.userName}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                            {conv.lastMessage}
                          </p>
                          <div className="flex items-center justify-between text-[10px]">
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">
                              {conv.tier}
                            </Badge>
                            {conv.unreadCount > 0 && (
                              <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                {conv.unreadCount} new
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Message Thread */}
              <Card className="col-span-1 md:col-span-2 flex flex-col h-full border-border/80">
                {selectedChatUserId ? (
                  <>
                    <CardHeader className="py-3 px-4 border-b shrink-0 flex flex-row items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{activeConversationUser?.userName || "Specialist"}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {activeConversationUser?.tier || "member"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activeConversationUser?.userEmail}
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
                        Direct Livechat
                      </Badge>
                    </CardHeader>

                    {/* Messages feed */}
                    <CardContent className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10 text-xs">
                      {isChatMessagesLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Clock className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : selectedChatMessages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          No messages in this thread yet.
                        </div>
                      ) : (
                        selectedChatMessages.map((msg: any) => {
                          const isUser = msg.sender_role === 'user';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {isUser ? (activeConversationUser?.userName || 'Specialist') : 'Support (You)'}
                                </span>
                                <span className="text-[9px] text-muted-foreground/70">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div
                                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                                  isUser
                                    ? 'bg-card border border-border/80 text-foreground rounded-bl-xs'
                                    : 'bg-accent text-accent-foreground rounded-br-xs'
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>

                    {/* Reply Bar */}
                    <div className="p-3 border-t bg-card shrink-0 flex items-center gap-2">
                      <Input
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (adminReplyText.trim() && !sendAdminReplyMutation.isPending) {
                              sendAdminReplyMutation.mutate({ userId: selectedChatUserId, message: adminReplyText.trim() });
                            }
                          }
                        }}
                        placeholder="Type reply to user..."
                        className="rounded-xl text-xs h-9 bg-muted/50"
                        disabled={sendAdminReplyMutation.isPending}
                      />
                      <Button
                        onClick={() => {
                          if (adminReplyText.trim() && !sendAdminReplyMutation.isPending) {
                            sendAdminReplyMutation.mutate({ userId: selectedChatUserId, message: adminReplyText.trim() });
                          }
                        }}
                        disabled={!adminReplyText.trim() || sendAdminReplyMutation.isPending}
                        className="rounded-xl h-9 px-4 text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Reply
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">No Conversation Selected</h4>
                      <p className="text-xs max-w-sm mt-1">
                        Select an inquiry from the list on the left to read messages and send responses.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
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
  const [selectedTaskType, setSelectedTaskType] = useState<string>(task.task_type || 'standard');

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      category: task.category,
      taskType: (task.task_type || 'standard') as any,
      url: task.url || "",
      reward: String(task.reward), // Ensure string for form input
      hourlyRate: task.hourly_rate ? String(task.hourly_rate) : "15.00",
      maxParticipants: task.max_participants || 1,
      estimatedDurationMinutes: task.estimated_duration_minutes || 30,
      instructions: task.instructions || "",
      minTier: task.min_tier,
      isActive: task.is_active,
      isOrientation: task.is_orientation,
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => {
      const processedData = {
        ...data,
        taskType: selectedTaskType as any,
        url: data.url?.trim() ? data.url.trim() : undefined,
      };
      onUpdate(processedData);
    })} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
      <div>
        <Label htmlFor="edit-title">Task Title</Label>
        <Input id="edit-title" {...form.register("title")} className="rounded-xl" />
      </div>

      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" {...form.register("description")} className="rounded-xl min-h-[80px]" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-taskType">Task Type</Label>
          <Select
            defaultValue={task.task_type || 'standard'}
            onValueChange={(value) => {
              setSelectedTaskType(value);
              form.setValue('taskType', value as any);
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard (Fixed Reward)</SelectItem>
              <SelectItem value="project">Project (Hourly Rate)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="edit-category">Category</Label>
          <Select
            defaultValue={task.category}
            onValueChange={(value) => form.setValue('category', value as TaskCategory)}
          >
            <SelectTrigger className="rounded-xl">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-reward">Fixed Reward ($ USD)</Label>
          <Input
            id="edit-reward"
            type="number"
            step="0.01"
            {...form.register("reward")}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="edit-hourlyRate">Hourly Rate ($/hr)</Label>
          <Input
            id="edit-hourlyRate"
            type="number"
            step="0.50"
            {...form.register("hourlyRate")}
            className="rounded-xl"
            disabled={selectedTaskType !== 'project'}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="edit-minTier">Minimum Tier</Label>
          <Select
            defaultValue={task.min_tier}
            onValueChange={(value) => form.setValue('minTier', value as SkillUpgradeTier)}
          >
            <SelectTrigger className="rounded-xl">
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

        <div>
          <Label htmlFor="edit-maxParticipants">Max Participants</Label>
          <Input
            id="edit-maxParticipants"
            type="number"
            {...form.register("maxParticipants")}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="edit-duration">Est. Duration (min)</Label>
          <Input
            id="edit-duration"
            type="number"
            {...form.register("estimatedDurationMinutes")}
            className="rounded-xl"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="edit-url">Task URL (optional)</Label>
        <Input id="edit-url" type="url" {...form.register("url")} className="rounded-xl" />
      </div>

      <div>
        <Label htmlFor="edit-instructions">Detailed Instructions (optional)</Label>
        <Textarea id="edit-instructions" {...form.register("instructions")} className="rounded-xl min-h-[60px]" />
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

      <div className="flex items-center space-x-6 pt-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isActive"
            className="h-4 w-4 rounded border-gray-300 accent-emerald-500"
            {...form.register("isActive")}
          />
          <Label htmlFor="edit-isActive" className="cursor-pointer">Active</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isOrientation"
            className="h-4 w-4 rounded border-gray-300 accent-emerald-500"
            {...form.register("isOrientation")}
          />
          <Label htmlFor="edit-isOrientation" className="cursor-pointer">Is Orientation Task</Label>
        </div>
      </div>

      <Button type="submit" className="w-full rounded-xl bg-accent text-accent-foreground font-semibold py-2.5">
        Update Task
      </Button>
    </form>
  );
}
