import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { userQueries, supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { Task, UserTask } from "@shared/types";
import {
  Lock as LucideLock,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Clock,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  Send,
  RotateCcw,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";

// Helper component for live task countdown timer
function TaskTimer({ createdAt, onExpire }: { createdAt: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const created = new Date(createdAt).getTime();
      const deadline = created + 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const difference = deadline - now;

      if (difference <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [createdAt, onExpire]);

  return (
    <div className={`flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded-md border ${
      isExpired
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : "bg-warning/10 text-warning border-warning/30"
    }`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{timeLeft}</span>
    </div>
  );
}

const taskCategories = [
  {
    id: "all",
    name: "All Projects",
    icon: "⚡",
    description: "Browse all available human-in-the-loop task opportunities.",
    badgeClass: "bg-accent/15 text-accent border-accent/30",
  },
  {
    id: "ai",
    name: "AI Training",
    icon: "🤖",
    description: "Train frontier AI models via reasoning validation, RLHF, and prompt-response ranking.",
    minTier: "vip",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    id: "testing",
    name: "App & Web Testing",
    icon: "⚙️",
    description: "Quality assurance, functional validation, UX inspection, and pre-launch bug hunts.",
    minTier: "gold",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    id: "surveys",
    name: "Surveys & Polls",
    icon: "📊",
    description: "Market intelligence, demographic surveys, and product viability evaluations.",
    minTier: "diamond",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    id: "social",
    name: "Social Engagement",
    icon: "👥",
    description: "Community engagement, platform content validation, and discussion management.",
    minTier: "silver",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    id: "app",
    name: "Application Tasks",
    icon: "📱",
    description: "Mobile app workflows, software installation verification, UX engagement, and beta testing.",
    minTier: "bronze",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  },
  {
    id: "main",
    name: "Core Verification",
    icon: "📋",
    description: "Foundational data purification, basic tasks, and platform benchmarks.",
    minTier: "member",
    badgeClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
  },
];

const tierOrder = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium'];

export default function Tasks() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'review' | 'history'>('available');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // Submission Dialog State
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [submissionTaskId, setSubmissionTaskId] = useState<string | null>(null);
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [proofAttachments, setProofAttachments] = useState<any[]>([]);

  const isInOrientation = user && !user.orientation_complete;

  // React Query for available tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksQueryError,
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks', { type: isInOrientation ? 'orientation' : 'regular' }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?type=${isInOrientation ? 'orientation' : 'regular'}&includeLocked=true`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    staleTime: 15000,
  });

  // React Query for user tasks history & active items
  const {
    data: userTasks = [],
    isLoading: userTasksLoading,
    refetch: refetchUserTasks,
  } = useQuery<UserTask[]>({
    queryKey: ['/api/tasks/user-tasks', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/tasks/user-tasks', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired, please login again");
        }
        throw new Error('Failed to fetch user tasks');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 15000,
  });

  // Real-time subscription to user task state updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });

          if (payload.eventType === 'UPDATE' && payload.new.user_id === user.id) {
            const newStatus = payload.new.status;
            if (newStatus === 'approved') {
              toast({ title: "Task Approved! 🌟", description: "Your task submission was approved and compensation credited." });
            } else if (newStatus === 'rejected') {
              toast({ title: "Task Revision Needed", description: "Admin requested revision. Check feedback in Active Tasks.", variant: "destructive" });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

  // Submit Claimed Task Mutation
  const submitClaimedTaskMutation = useMutation({
    mutationFn: async ({ id, description, proof_attachments }: { id: string; description: string; proof_attachments?: any[] }) => {
      const response = await apiRequest("POST", `/api/tasks/${id}/submit`, { description, proof_attachments });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Submitted Successfully! 🚀",
        description: "Your task has been queued for quality evaluation and payout approval.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
      setIsSubmissionOpen(false);
      setSubmissionDescription("");
      setProofAttachments([]);
      setSubmissionTaskId(null);
      setActiveTab('review');
    },
    onError: () => {
      toast({ title: "Submission Failed", description: "Could not submit task. Please check your network and try again.", variant: "destructive" });
    }
  });

  const handleOpenSubmission = (userTask: UserTask) => {
    setSubmissionTaskId(userTask.id);
    setSubmissionDescription(userTask.rejection_reason || "");
    setProofAttachments(userTask.proof_attachments || []);
    setIsSubmissionOpen(true);
  };

  const handleSubmitTask = () => {
    if (!submissionTaskId) return;
    if (!submissionDescription.trim()) {
      toast({ title: "Description Required", description: "Please provide a concise description of your completed work.", variant: "destructive" });
      return;
    }
    submitClaimedTaskMutation.mutate({
      id: submissionTaskId,
      description: submissionDescription,
      proof_attachments: proofAttachments
    });
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  // Claim Task Mutation
  const claimTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/claim`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Claimed! 🎯",
        description: "Task added to your active workspace. Complete and submit within 24 hours.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
      setIsDetailsOpen(false);
      setSelectedTask(null);
      setActiveTab('active');
    },
    onError: () => {
      toast({ title: "Claiming Failed", description: "Could not claim task. It may have already been allocated.", variant: "destructive" });
    }
  });

  // Bid Task Mutation
  const bidTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/bid`, {
        userId: user?.id,
        taskId: taskId,
        status: 'pending'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted! 📋",
        description: "Your project bid has been placed and is currently under review by project managers.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsDetailsOpen(false);
      setSelectedTask(null);
      setActiveTab('review');
    },
    onError: (error: Error) => {
      toast({
        title: "Bid Failed",
        description: error.message || "Failed to submit project bid",
        variant: "destructive"
      });
    }
  });

  const handleTaskAction = async () => {
    if (!selectedTask) return;
    if (!user?.id) {
      toast({ title: "Authentication Required", description: "Please log in to claim tasks.", variant: "destructive" });
      return;
    }

    const isBidCategory = ['testing', 'ai'].includes(selectedTask.category);
    if (isBidCategory) {
      await bidTaskMutation.mutateAsync(selectedTask.id);
    } else {
      await claimTaskMutation.mutateAsync(selectedTask.id);
    }
  };

  const handleCancelTask = async (userTaskId: string) => {
    if (!confirm("Are you sure you want to cancel this task? This may impact your completion rating.")) return;

    setActionLoading(true);
    try {
      await apiRequest("POST", `/api/tasks/${userTaskId}/cancel`);
      toast({
        title: "Task Cancelled",
        description: "Task removed from your queue.",
      });
      await refetchUserTasks();
      if (user?.id) {
        await userQueries.getUser(user.id).then(setUser);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel task",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isTaskLocked = (task: Task) => {
    if (isInOrientation) return false;
    if (!user?.skill_upgrade_tier) return true;

    const userTierIndex = tierOrder.indexOf(user.skill_upgrade_tier);
    const minTierIndex = tierOrder.indexOf(task.min_tier || 'member');
    return userTierIndex < minTierIndex;
  };

  // Filter tasks by active category and search input
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(task.id).includes(searchQuery);

      return matchesCategory && matchesSearch;
    });
  }, [tasks, selectedCategory, searchQuery]);

  // Derived counts for tabs
  const activeTasks = useMemo(
    () => userTasks.filter((t) => ['claimed', 'revision_requested'].includes(t.status)),
    [userTasks]
  );
  const underReviewTasks = useMemo(
    () => userTasks.filter((t) => ['pending', 'submitted'].includes(t.status)),
    [userTasks]
  );
  const completedTasks = useMemo(
    () => userTasks.filter((t) => ['approved', 'completed'].includes(t.status)),
    [userTasks]
  );

  const getCategoryMeta = (categoryId: string) => {
    return taskCategories.find((c) => c.id === categoryId) || {
      name: categoryId,
      icon: "📋",
      badgeClass: "bg-muted text-muted-foreground",
    };
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Outlier-style Hero Banner & Metrics Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Tasks Feed
              </span>

              {user?.skill_upgrade_tier && (
                <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider border-border/80">
                  Level: {user.skill_upgrade_tier}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              {isInOrientation ? "Orientation Project Queue" : "Task Marketplace"}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              {isInOrientation
                ? "Complete your orientation modules by reviewing 2 benchmark tasks across our platform disciplines."
                : "High-impact Human-in-the-Loop projects for frontier AI, application testing, and consumer research. Claim available tasks or apply for specialized initiatives."}
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-background/60 backdrop-blur-md p-4 rounded-2xl border border-border/50">
            <div className="text-center px-2 sm:px-3">
              <p className="text-2xl font-black text-foreground">{tasks.length}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Available</p>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center px-2 sm:px-3">
              <p className="text-2xl font-black text-accent">{activeTasks.length}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">In Progress</p>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center px-2 sm:px-3">
              <p className="text-2xl font-black text-success">{completedTasks.length}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orientation Alert Message */}
      {isInOrientation && (
        <div className="bg-accent/10 border border-accent/25 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
          <div className="p-2 bg-accent/20 rounded-xl text-accent shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-foreground">Orientation Mode Active</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              All categories are currently unlocked for practice. Complete sample tasks to earn your full verified tasker credentials and unlock paid live projects.
            </p>
          </div>
        </div>
      )}

      {/* Outlier-Style Main View Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/50 no-scrollbar">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all whitespace-nowrap border-b-2 -mb-px ${
            activeTab === 'available'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Available Projects</span>
          <Badge variant="secondary" className="text-xs font-bold rounded-full px-2 py-0.5">
            {tasks.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all whitespace-nowrap border-b-2 -mb-px ${
            activeTab === 'active'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Active In-Progress</span>
          {activeTasks.length > 0 && (
            <Badge className="bg-accent text-accent-foreground text-xs font-bold rounded-full px-2 py-0.5 animate-pulse">
              {activeTasks.length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all whitespace-nowrap border-b-2 -mb-px ${
            activeTab === 'review'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Under Review</span>
          {underReviewTasks.length > 0 && (
            <Badge variant="outline" className="text-xs font-bold rounded-full px-2 py-0.5">
              {underReviewTasks.length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all whitespace-nowrap border-b-2 -mb-px ${
            activeTab === 'history'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Completed History</span>
          <Badge variant="secondary" className="text-xs font-bold rounded-full px-2 py-0.5">
            {completedTasks.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: AVAILABLE OPPORTUNITIES (Outlier Grid) */}
      {activeTab === 'available' && (
        <div className="space-y-6">
          {/* Controls: Dropdown Selection + Category Quick Chips + Live Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Task Category Discipline Dropdown Selection */}
              <div className="w-full sm:w-80">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 rounded-2xl bg-card border-border/70 text-xs font-semibold shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Filter className="w-3.5 h-3.5 text-accent shrink-0" />
                      <SelectValue placeholder="Select Category Discipline" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-80">
                    <SelectItem value="all" className="text-xs font-semibold">
                      ⚡ All Disciplines & Tasks ({tasks.length})
                    </SelectItem>
                    {taskCategories.filter((c) => c.id !== 'all').map((cat) => {
                      const count = tasks.filter((t) => t.category === cat.id).length;
                      return (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs py-2">
                          <span className="font-semibold">{cat.name}</span>
                          <span className="text-muted-foreground ml-1.5">({count})</span>
                          <span className="ml-auto text-[10px] text-muted-foreground pl-2 font-mono uppercase">
                            [{cat.minTier}]
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Live Search Input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by title, description or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card border-border/70 rounded-2xl text-xs sm:text-sm h-10 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Project Cards Grid */}
          {tasksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-muted/40 animate-pulse border border-border/40 p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="h-5 w-24 bg-muted/70 rounded-full" />
                    <div className="h-6 w-3/4 bg-muted/70 rounded-lg" />
                    <div className="h-12 w-full bg-muted/50 rounded-lg" />
                  </div>
                  <div className="h-10 w-full bg-muted/70 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-2xl">
                🔍
              </div>
              <h3 className="text-base font-bold text-foreground">No tasks match your criteria</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Try selecting a different discipline or clear your search query to see active tasks.
              </p>
              {selectedCategory !== 'all' || searchQuery !== "" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 rounded-xl text-xs"
                >
                  Reset All Filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTasks.map((task) => {
                const locked = isTaskLocked(task);
                const categoryMeta = getCategoryMeta(task.category);
                const isBidCategory = ['testing', 'ai'].includes(task.category);

                return (
                  <div
                    key={task.id}
                    className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-6 backdrop-blur-sm ${
                      locked
                        ? "bg-card/40 border-border/40 opacity-75 hover:opacity-90"
                        : "bg-card hover:bg-card/95 border-border/60 hover:border-accent/40 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Top Row: Category Pill & Compensation Callout */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${categoryMeta.badgeClass}`}>
                          <span>{categoryMeta.icon}</span>
                          <span>{categoryMeta.name}</span>
                        </span>

                        <div className="flex items-center gap-1 bg-success/15 border border-success/30 text-success font-black text-sm px-3 py-1 rounded-full">
                          <span>${parseFloat(String(task.reward)).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Title & Brief */}
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-accent transition-colors line-clamp-2">
                          {task.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-2 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="mt-6 pt-4 border-t border-border/40 space-y-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>~15-30 mins</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                          <span className="capitalize">{task.min_tier || 'Member'}+ Level</span>
                        </span>
                      </div>

                      {/* Action CTA */}
                      {locked ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/skill-upgrade?tier=${task.min_tier}`)}
                            className="w-full rounded-xl text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:border-accent font-semibold transition-all shadow-sm"
                          >
                            <LucideLock className="w-3.5 h-3.5" />
                            <span>Unlock with {task.min_tier?.toUpperCase()} Upgrade</span>
                            <ArrowUpRight className="w-3.5 h-3.5 ml-auto" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(task)}
                            className="flex-1 rounded-xl text-xs font-semibold border-border/80 hover:bg-muted"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Briefing
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              handleTaskAction();
                            }}
                            disabled={claimTaskMutation.isPending || bidTaskMutation.isPending}
                            className="flex-1 rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                          >
                            {isBidCategory ? "Apply / Bid" : "Claim Task"}
                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE IN-PROGRESS TASKS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeTasks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-2xl">
                ⚡
              </div>
              <h3 className="text-base font-bold text-foreground">No active tasks in your queue</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Explore the marketplace and claim tasks to start working and earning.
              </p>
              <Button
                onClick={() => setActiveTab('available')}
                className="mt-4 rounded-xl text-xs font-bold bg-accent text-accent-foreground"
              >
                Browse Available Opportunities
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeTasks.map((userTask) => (
                <Card key={userTask.id} className="rounded-3xl border-border/60 shadow-sm overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-6 pb-4 bg-muted/20 border-b border-border/40">
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        className={`text-xs font-bold rounded-full ${
                          userTask.status === 'claimed'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : 'bg-warning/15 text-warning border border-warning/30'
                        }`}
                      >
                        {userTask.status === 'claimed' ? 'In Progress' : 'Revision Required'}
                      </Badge>
                      <TaskTimer createdAt={userTask.created_at} />
                    </div>

                    <CardTitle className="text-lg font-bold text-foreground mt-3 leading-snug">
                      {userTask.task?.title || `Task #${userTask.task_id}`}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6 pt-4 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Feedback if revision requested */}
                    {userTask.status === 'revision_requested' && (
                      <div className="p-3.5 bg-warning/10 border border-warning/25 rounded-2xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-warning">
                          <AlertCircle className="w-4 h-4" />
                          <span>Admin Feedback</span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed">{userTask.feedback || "Please revise your deliverables and resubmit."}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(userTask.task || ({ id: userTask.task_id } as any))}
                        className="rounded-xl text-xs font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Instructions
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelTask(userTask.id)}
                          className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                        >
                          Cancel
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenSubmission(userTask)}
                          className="rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Submit Work
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UNDER REVIEW */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {underReviewTasks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-2xl">
                ⏳
              </div>
              <h3 className="text-base font-bold text-foreground">No tasks currently under review</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Submissions and specialist bids awaiting administrative verification will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {underReviewTasks.map((userTask) => (
                <div key={userTask.id} className="p-5 rounded-3xl bg-card border border-border/60 shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] font-semibold bg-warning/10 text-warning border-warning/20">
                        {userTask.status === 'pending' ? 'Project Application Bid' : 'Deliverables Under Review'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(userTask.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-foreground">
                      {userTask.task?.title || `Task #${userTask.task_id}`}
                    </h4>

                    <p className="text-xs text-muted-foreground">
                      Evaluators are verifying submission quality against project guidelines.
                    </p>
                  </div>

                  {userTask.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelTask(userTask.id)}
                      className="text-destructive hover:bg-destructive/10 rounded-xl text-xs shrink-0"
                    >
                      Retract Bid
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPLETED HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {completedTasks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-2xl">
                📜
              </div>
              <h3 className="text-base font-bold text-foreground">No completed tasks yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Your approved tasks and reward payout receipts will be preserved here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTasks.map((userTask) => (
                <div key={userTask.id} className="p-5 rounded-3xl bg-card border border-border/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-success/15 text-success border border-success/30 text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(userTask.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground line-clamp-1">
                    {userTask.task?.title || `Task #${userTask.task_id}`}
                  </h4>

                  {userTask.task?.reward && (
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Credited to Wallet:</span>
                      <span className="font-black text-success text-sm">+${parseFloat(String(userTask.task.reward)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Briefing / Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="text-xs uppercase font-semibold">
                {selectedTask?.category || 'Task'}
              </Badge>
              {selectedTask?.reward && (
                <span className="text-base font-black text-success bg-success/10 px-3 py-1 rounded-full border border-success/20">
                  ${parseFloat(String(selectedTask.reward)).toFixed(2)}
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 my-3 text-sm text-foreground/90">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Overview</Label>
              <p className="mt-1 leading-relaxed bg-muted/30 p-3.5 rounded-2xl border border-border/40">
                {selectedTask?.description}
              </p>
            </div>

            {selectedTask?.instructions && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions & Deliverables</Label>
                <div className="mt-1 p-3.5 bg-card border border-border/60 rounded-2xl text-xs space-y-2 leading-relaxed">
                  <p>{selectedTask.instructions}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="rounded-xl">
              Close
            </Button>
            {selectedTask && !isTaskLocked(selectedTask) && (
              <Button
                onClick={handleTaskAction}
                disabled={claimTaskMutation.isPending || bidTaskMutation.isPending}
                className="rounded-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
              >
                {['testing', 'ai'].includes(selectedTask.category) ? "Submit Bid / Apply" : "Claim & Begin Task"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog */}
      <Dialog open={isSubmissionOpen} onOpenChange={setIsSubmissionOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Submit Completed Work</DialogTitle>
            <DialogDescription>
              Detail your deliverables, results, or findings for verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-2">
              <Label htmlFor="submission-notes" className="text-xs font-bold uppercase text-muted-foreground">
                Work Summary & Notes
              </Label>
              <Textarea
                id="submission-notes"
                placeholder="Describe the steps you took, findings, or completed deliverables..."
                value={submissionDescription}
                onChange={(e) => setSubmissionDescription(e.target.value)}
                rows={4}
                className="rounded-2xl bg-card border-border/60 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Proof & Evidence Attachments (Optional)
              </Label>
              <FileUpload
                bucket="task-attachments"
                useProxy={true}
                initialFiles={proofAttachments}
                onUploadSuccess={(uploaded) => setProofAttachments(uploaded)}
                maxFiles={5}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsSubmissionOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTask}
              disabled={submitClaimedTaskMutation.isPending}
              className="rounded-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
            >
              {submitClaimedTaskMutation.isPending ? "Submitting..." : "Send for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}