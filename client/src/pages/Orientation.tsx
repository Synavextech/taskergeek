import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, RefreshCw, Sparkles, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ComponentLoader } from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { defaultOrientationCategories } from "@/data/orientationCategories";

export function Orientation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());

  const [orientationTasks, setOrientationTasks] = useState<{ [cat: string]: any[] }>({});
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Fetch orientation tasks from API
  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['orientationTasks'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/tasks?is_orientation=true');
      return res.json();
    }
  });

  useEffect(() => {
    setLoadingTasks(isLoading);
    if (allTasks) {
      const byCat: { [cat: string]: any[] } = {};
      const group: { [cat: string]: any[] } = {};

      for (const task of (allTasks as any[])) {
        if (!group[task.category]) group[task.category] = [];
        group[task.category].push(task);
      }

      for (const cat of Object.keys(group)) {
        const arr = group[cat];
        const picks = arr.length <= 2 ? arr : arr.slice(0, 2);
        byCat[cat] = picks;
      }

      setOrientationTasks(byCat);
    }
  }, [allTasks, isLoading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      setLocation('/admin');
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return <ComponentLoader text="Redirecting to login..." />;
  }

  const isOrientationComplete = user?.orientation_complete ?? false;

  const completeOrientationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await apiRequest('POST', '/api/tasks/orientation-complete');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to complete orientation');
      }
      return result;
    },
    onSuccess: (data) => {
      if (user && data.user) {
        const updatedUser = { ...user, ...data.user, orientation_complete: true };
        queryClient.setQueryData(['user', user.id], updatedUser);
        setUser(updatedUser);
      }

      toast({
        title: "Orientation Completed! 🌟",
        description: "You have verified platform standards and can now access tasks.",
      });

      setLocation("/home");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete orientation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canProceed = !isOrientationComplete && hasReviewed;

  const handleCompleteOrientation = () => {
    if (canProceed) {
      completeOrientationMutation.mutate();
    }
  };

  const handleCategoryComplete = (category: string) => {
    setCompletedCategories((prev) => new Set([...prev, category]));
    if (!hasReviewed) {
      setHasReviewed(true);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Specialist Onboarding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Orientation & Benchmark Review
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Examine the sample tasks below to understand our quality benchmarks, deliverable expectations, and payout criteria across each platform category.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/home')}
            className="rounded-xl text-xs font-semibold self-start sm:self-auto"
          >
            Dashboard
          </Button>
        </div>

        {isOrientationComplete && (
          <div className="mt-4 p-4 bg-success/15 border border-success/30 text-success rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Orientation status verified. You are cleared to take on live platform projects.</span>
          </div>
        )}
      </div>

      {/* Task Samples Grid */}
      <div className="space-y-6">
        {loadingTasks ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Loading orientation benchmarks...
          </div>
        ) : (
          defaultOrientationCategories.map((catItem) => {
            const cat = catItem.id;
            const tasks = orientationTasks[cat] || [];
            return (
              <div key={cat} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-base font-bold text-foreground capitalize flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-accent" />
                      <span>{catItem.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{catItem.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto shrink-0">
                    {tasks.length} {tasks.length === 1 ? 'Sample' : 'Samples'}
                  </Badge>
                </div>

                {tasks.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-border/70 text-xs text-muted-foreground">
                    Benchmarks active. Review guidelines and continue.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-5 rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted-foreground">#{task.taskId || task.id}</span>
                            <Badge className="bg-success/15 text-success border-success/30 font-bold text-xs">
                              ${parseFloat(String(task.reward || task.earning || 0)).toFixed(2)}
                            </Badge>
                          </div>

                          <h4 className="font-bold text-sm text-foreground line-clamp-1">{task.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
                        </div>

                        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground font-medium">Sample Specification</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCategoryComplete(cat)}
                            asChild
                            className="rounded-xl text-xs font-semibold"
                          >
                            <a href={task.url || task.link || '#'} target="_blank" rel="noopener noreferrer">
                              Inspect <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completion Confirmation Card */}
      <Card className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
        <CardContent className="p-0 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="reviewed"
              checked={hasReviewed || isOrientationComplete}
              onCheckedChange={(checked) => setHasReviewed(!!checked)}
              disabled={isOrientationComplete}
              className="mt-1"
            />
            <div className="space-y-1">
              <label
                htmlFor="reviewed"
                className={`text-sm font-semibold leading-relaxed ${
                  isOrientationComplete ? 'text-muted-foreground' : 'cursor-pointer text-foreground'
                }`}
              >
                Orientation confirmation: I have reviewed the platform quality standards and acknowledge that accuracy and adherence to task briefs govern task approval and payouts.
              </label>
              {isOrientationComplete && (
                <p className="text-xs text-success font-medium flex items-center gap-1">
                  ✓ Orientation completed & verified
                </p>
              )}
            </div>
          </div>

          {!isOrientationComplete ? (
            <Button
              onClick={handleCompleteOrientation}
              disabled={!canProceed || completeOrientationMutation.isPending}
              className="w-full rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-12"
            >
              {!hasReviewed ? (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Check the confirmation box above to proceed
                </>
              ) : completeOrientationMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Complete Orientation & Access Live Tasks <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full rounded-2xl font-bold"
              variant="secondary"
              onClick={() => setLocation('/tasks')}
            >
              Go to Tasks Marketplace
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}