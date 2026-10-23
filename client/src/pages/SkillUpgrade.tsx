import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Award,
  ArrowRight,
  Clock,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Code2,
  Binary,
  Languages,
  Microscope,
  ShieldAlert,
  RotateCcw,
  Timer,
  GraduationCap,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PayPalCheckoutButton from "@/components/PayPalCheckoutButton";
import { ComponentLoader } from "@/components/LoadingSpinner";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SkillPlan {
  id: string;
  name: string;
  badge: string;
  price: number;
  linksPerDay: string;
  accessLevel: string;
  disciplines: string[];
  popular?: boolean;
  isUniversal?: boolean;
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
    name: "Senior Tasker",
    badge: "💎",
    price: 50,
    linksPerDay: "15 Tasks / Day",
    accessLevel: "Core + Social + App Ops + Surveys & Market Intelligence",
    disciplines: ["Core Verification", "Surveys & Polls", "App Operations"],
    popular: true,
  },
  {
    id: "gold",
    name: "Golden Level Geek",
    badge: "🏅",
    price: 75,
    linksPerDay: "20 Tasks / Day",
    accessLevel: "Core + Social + Surveys + QA Testing & Bug Hunting",
    disciplines: ["Core Tasks", "Surveys & Polls", "App & Web Testing"],
    popular: false,
  },
  {
    id: "vip",
    name: "VIP Specialist",
    badge: "👑",
    price: 100,
    linksPerDay: "25 Tasks / Day",
    accessLevel: "Full Core Access: All Standard Disciplines + AI Training Benchmarks",
    disciplines: ["All Standard Disciplines", "Frontier AI Training", "Priority Review"],
    popular: false,
  },
  {
    id: "universal",
    name: "UniversalGeek",
    badge: "🌐",
    price: 250,
    linksPerDay: "50 Tasks / Day + Integrated Projects",
    accessLevel: "Access to all projects including project-based tasks. The ONLY skill tier with integrated project tasks.",
    disciplines: [
      "All Platform Disciplines",
      "Integrated Project-Based Hourly Tasks",
      "Real-Time Working Time Tracker",
      "Frontier AI Training & Reasoning",
      "Maximum Compensation Workspaces"
    ],
    popular: false,
    isUniversal: true,
  },
];

interface DisciplineItem {
  id: string;
  title: string;
  category: string;
  rate: string;
  description: string;
  skills: string[];
  icon: React.ReactNode;
}

const DISCIPLINES: DisciplineItem[] = [
  {
    id: "software",
    title: "Software & Code Generation",
    category: "Computer Science",
    rate: "$40 - $65 / hr",
    description: "Evaluate complex algorithmic solutions, review code generation accuracy, debug subtle runtime bugs, and benchmark model completions.",
    skills: ["Python", "Algorithms", "TypeScript", "Rust", "System Architecture"],
    icon: <Code2 className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: "math",
    title: "Mathematics & Formal Logic",
    category: "STEM",
    rate: "$45 - $60 / hr",
    description: "Write and evaluate step-by-step rigorous proofs, verify mathematical reasoning in calculus, number theory, and formal logic systems.",
    skills: ["Calculus", "Linear Algebra", "Proof Verification", "Discrete Math"],
    icon: <Binary className="w-5 h-5 text-amber-500" />,
  },
  {
    id: "linguistics",
    title: "Multilingual & Computational NLP",
    category: "Humanities & Language",
    rate: "$30 - $48 / hr",
    description: "Craft culturally nuanced prompts, identify idiomatic errors, evaluate multi-turn dialectical subtleties, and benchmark localized responses.",
    skills: ["Translation", "Semantics", "Syntax Analysis", "Idiomatic Evaluation"],
    icon: <Languages className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "sciences",
    title: "Natural Sciences & Biomedicine",
    category: "Life Sciences",
    rate: "$42 - $58 / hr",
    description: "Assess scientific validity in biochemistry, pharmacology, genetics, and molecular biology. Validate clinical reasoning benchmarks.",
    skills: ["Biochemistry", "Molecular Biology", "Clinical Reasoning", "Physics"],
    icon: <Microscope className="w-5 h-5 text-accent" />,
  },
  {
    id: "safety",
    title: "AI Safety, Ethics & Red Teaming",
    category: "Model Alignment",
    rate: "$40 - $55 / hr",
    description: "Stress-test frontier models against adversarial jailbreaks, evaluate toxicity, ensure privacy compliance, and verify alignment.",
    skills: ["Adversarial Testing", "Toxicity Auditing", "Prompt Engineering", "Policy"],
    icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
  },
  {
    id: "reasoning",
    title: "Advanced Reasoning & Synthesis",
    category: "Humanities & Logic",
    rate: "$32 - $45 / hr",
    description: "Grade multi-source synthesis, assess high-context factual consistency, refine instruction-following fidelity, and curate gold-standard datasets.",
    skills: ["Critical Analysis", "Fact Verification", "RAG Grounding", "Expository Writing"],
    icon: <BookOpen className="w-5 h-5 text-cyan-500" />,
  },
];

export default function SkillUpgrade() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();

  // Mode: "assessment" (primary) | "training" (secondary)
  const [activeTab, setActiveTab] = useState<"assessment" | "training">("assessment");

  // Training Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<string>("universal");
  const [transactionCode, setTransactionCode] = useState("");
  const [paypalError, setPaypalError] = useState<string | null>(null);

  // Discipline Assessment Flow
  const [activeDiscipline, setActiveDiscipline] = useState<string>("software");
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentData, setAssessmentData] = useState<{
    disciplineId: string;
    title: string;
    section1: { id: string; question: string; options: string[] }[];
    section2: { id: string; question: string; minWords?: number; maxWords?: number }[];
  } | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({});
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);

  // Hourly Rate Specific Test Flow (15 Questions)
  const [isHourlyTestOpen, setIsHourlyTestOpen] = useState(false);
  const [hourlyQuestions, setHourlyQuestions] = useState<{ id: string; question: string; options: string[] }[]>([]);
  const [hourlyAnswers, setHourlyAnswers] = useState<Record<string, number>>({});
  const [isSubmittingHourly, setIsSubmittingHourly] = useState(false);
  const [hourlyResult, setHourlyResult] = useState<any>(null);

  // Parse Query Parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const tier = params.get("tier");
    const isProject = params.get("project");
    const discipline = params.get("discipline");

    if (mode === "assessment" || discipline) {
      setActiveTab("assessment");
      if (discipline && DISCIPLINES.some((d) => d.id === discipline.toLowerCase())) {
        setActiveDiscipline(discipline.toLowerCase());
      }
    } else if (mode === "training" || tier || isProject) {
      setActiveTab("training");
      if (isProject) {
        setSelectedPlan("universal");
      } else if (tier && skillUpgradePlans.some((p) => p.id === tier)) {
        setSelectedPlan(tier);
      }
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

  // Handle Copy / Paste Prevention on Written Answers
  const handlePreventPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Action Restricted",
      description: "Pasting is strictly disabled in assessment answer fields. Please type your response directly.",
      variant: "destructive",
    });
  };

  const handlePreventCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Action Restricted",
      description: "Copying text from assessment fields is restricted.",
      variant: "destructive",
    });
  };

  const getWordCount = (text: string) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Launch Discipline Assessment
  const handleStartDisciplineAssessment = async (disciplineId: string) => {
    try {
      setActiveDiscipline(disciplineId);
      setAssessmentResult(null);
      setMcqAnswers({});
      setWrittenAnswers({});
      const res = await apiRequest("GET", `/api/assessment/discipline/${disciplineId}`);
      if (!res.ok) throw new Error("Failed to load assessment questions");
      const data = await res.json();
      setAssessmentData(data);
      setIsAssessmentOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        title: "Unable to Start Assessment",
        description: err.message || "Failed to fetch questions.",
        variant: "destructive",
      });
    }
  };

  // Submit Discipline Assessment
  const handleSubmitDisciplineAssessment = async () => {
    if (!assessmentData) return;

    // Check Section 1 completion
    const mcqAnsweredCount = Object.keys(mcqAnswers).length;
    if (mcqAnsweredCount < assessmentData.section1.length) {
      toast({
        title: "Incomplete Section 1",
        description: `Please answer all 10 multiple-choice questions before submitting (${mcqAnsweredCount}/10 completed).`,
        variant: "destructive",
      });
      return;
    }

    // Check Section 2 word counts (1500 - 5000 words per question)
    const invalidQuestions: number[] = [];
    assessmentData.section2.forEach((q, idx) => {
      const words = getWordCount(writtenAnswers[q.id] || "");
      const min = q.minWords || 1500;
      const max = q.maxWords || 5000;
      if (words < min || words > max) {
        invalidQuestions.push(idx + 1);
      }
    });

    if (invalidQuestions.length > 0) {
      toast({
        title: "Word Count Requirement Unmet",
        description: `Questions ${invalidQuestions.join(", ")} do not meet the 1,500 – 5,000 words requirement. Please review.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingAssessment(true);
      const res = await apiRequest("POST", "/api/assessment/discipline/submit", {
        disciplineId: assessmentData.disciplineId,
        section1Answers: mcqAnswers,
        section2Answers: writtenAnswers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Submission failed");
      }

      setAssessmentResult(data);
      toast({
        title: data.passed ? "Assessment Complete! 🌟" : "Assessment Graded",
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Could not submit assessment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  // Launch Hourly Rate Test
  const handleStartHourlyTest = async () => {
    try {
      setHourlyResult(null);
      setHourlyAnswers({});
      const res = await apiRequest("GET", "/api/assessment/hourly");
      if (!res.ok) throw new Error("Failed to load hourly assessment");
      const data = await res.json();
      setHourlyQuestions(data.questions || []);
      setIsHourlyTestOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        title: "Error Loading Test",
        description: err.message || "Could not retrieve hourly test questions.",
        variant: "destructive",
      });
    }
  };

  // Submit Hourly Rate Test
  const handleSubmitHourlyTest = async () => {
    const answeredCount = Object.keys(hourlyAnswers).length;
    if (answeredCount < hourlyQuestions.length) {
      toast({
        title: "Incomplete Test",
        description: `Please answer all 15 questions (${answeredCount}/15 completed).`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingHourly(true);
      const res = await apiRequest("POST", "/api/assessment/hourly/submit", {
        answers: hourlyAnswers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Hourly test submission failed");

      setHourlyResult(data);
      if (data.passed) {
        toast({
          title: "Project Access Unlocked! 🎉",
          description: data.message,
        });
        if (user) {
          const updatedUser = { ...user, has_project_access: true };
          queryClient.setQueryData(["user", user.id], updatedUser);
          setUser(updatedUser);
        }
      } else {
        toast({
          title: "Qualification Not Met",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit hourly test.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingHourly(false);
    }
  };

  const handlePayPalError = (error: any) => {
    setPaypalError("PayPal gateway encountered an issue. You may submit manual transaction verification below.");
    toast({
      title: "PayPal Notification",
      description: "Gateway issue detected. You can submit manual receipt verification.",
      variant: "destructive",
    });
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/10 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
              <Award className="w-3.5 h-3.5" />
              <span>Skill Level & Discipline Credentialing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Specialist Skill Progression
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Unlock higher compensation rates, project-based hourly workspaces, and specialized model alignment domains. Choose to test directly via assessment or access paid training.
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

        {/* Top-Level Upgrade Options Switcher */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
          <button
            onClick={() => {
              setActiveTab("assessment");
              setIsAssessmentOpen(false);
              setIsHourlyTestOpen(false);
            }}
            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all text-left ${activeTab === "assessment"
                ? "bg-accent text-accent-foreground border-accent shadow-md ring-2 ring-accent/30 font-bold"
                : "bg-card/70 hover:bg-card border-border/70 text-muted-foreground hover:text-foreground font-semibold"
              }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === "assessment" ? "bg-black/20" : "bg-muted"}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">Take an Assessment</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30">
                  Primary Option
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${activeTab === "assessment" ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
                Zero upfront fee. Prove domain mastery through multi-choice and written analysis.
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab("training");
              setIsAssessmentOpen(false);
              setIsHourlyTestOpen(false);
            }}
            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all text-left ${activeTab === "training"
                ? "bg-accent text-accent-foreground border-accent shadow-md ring-2 ring-accent/30 font-bold"
                : "bg-card/70 hover:bg-card border-border/70 text-muted-foreground hover:text-foreground font-semibold"
              }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === "training" ? "bg-black/20" : "bg-muted"}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">Pay for Training</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent font-extrabold border border-accent/30">
                  Direct Path
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${activeTab === "training" ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
                Purchase tier credentialing starting from $10 up to UniversalGeek ($250).
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* OPTION 1: TAKE AN ASSESSMENT (PRIMARY)                   */}
      {/* ======================================================== */}
      {activeTab === "assessment" && (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Independent Hourly Rate Tasks Qualification */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-card via-card to-accent/10 border border-accent/30 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-accent text-accent-foreground font-bold text-xs">
                    Independent Track
                  </Badge>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">
                    Project-Based Hourly Tasks Qualification (15 Questions)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  Hourly rate tasks operate completely independently from standard daily task quotas. Complete this specialized 15-question protocol exam covering real-time working time trackers, subsection deliverables, and milestone validation to unlock high-rate project workspaces ($15–$50+/hr).
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                {user?.has_project_access || user?.skill_upgrade_tier === "universal" ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Unlocked & Active
                  </div>
                ) : (
                  <Button
                    onClick={handleStartHourlyTest}
                    className="w-full sm:w-auto h-12 px-6 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground text-xs sm:text-sm shadow-md"
                  >
                    <Timer className="w-4 h-4 mr-2" /> Take 15-Question Hourly Test
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Active Hourly Test View */}
          {isHourlyTestOpen && (
            <Card className="rounded-3xl border-accent/40 bg-card p-6 sm:p-8 shadow-lg space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <Badge className="bg-accent text-accent-foreground font-bold text-xs">
                    Hourly Qualification Assessment
                  </Badge>
                  <h3 className="text-xl font-black text-foreground mt-1">
                    Workspace Protocols & Tracker Ethics (15 Questions)
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHourlyTestOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>

              {hourlyResult ? (
                <div className={`p-6 rounded-2xl border text-center space-y-4 ${hourlyResult.passed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}>
                  <div className="w-16 h-16 rounded-2xl bg-card mx-auto flex items-center justify-center text-3xl shadow-sm">
                    {hourlyResult.passed ? "🎉" : "⚠️"}
                  </div>
                  <h4 className="text-lg font-black">{hourlyResult.passed ? "Qualification Successful!" : "Score Below Passing"}</h4>
                  <p className="text-xs sm:text-sm max-w-lg mx-auto text-foreground leading-relaxed">
                    {hourlyResult.message}
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    {hourlyResult.passed ? (
                      <Button
                        onClick={() => setLocation("/tasks?taskType=project")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                      >
                        Open Project Tasks
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setHourlyAnswers({});
                          setHourlyResult(null);
                        }}
                        className="rounded-xl font-bold"
                        variant="outline"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retake Hourly Test
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {hourlyQuestions.map((q, idx) => {
                      const selected = hourlyAnswers[q.id];
                      return (
                        <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold uppercase">Question {idx + 1} of 15</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{q.question}</p>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                onClick={() => setHourlyAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${selected === optIdx
                                    ? "bg-accent text-accent-foreground border-accent font-semibold shadow-sm"
                                    : "bg-card hover:bg-muted border-border/50 text-foreground/80"
                                  }`}
                              >
                                <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Completed: {Object.keys(hourlyAnswers).length} / {hourlyQuestions.length}
                    </span>
                    <Button
                      onClick={handleSubmitHourlyTest}
                      disabled={isSubmittingHourly || Object.keys(hourlyAnswers).length < hourlyQuestions.length}
                      className="rounded-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground px-8"
                    >
                      {isSubmittingHourly ? "Evaluating..." : "Submit Hourly Qualification"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Section 2: Discipline Assessment Suite (Two-Section Test) */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Domain Discipline Assessments (Two-Section Test)
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Select your specialized field to initiate candidate assessment. Streamlined into <strong>10 Multiple-Choice Questions</strong> and <strong>10 Written Analytical Questions</strong> requiring 1,500 – 5,000 words each (copy/paste disabled).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
              {DISCIPLINES.map((item) => {
                const isSelected = activeDiscipline === item.id;

                return (
                  <Card
                    key={item.id}
                    onClick={() => setActiveDiscipline(item.id)}
                    className={`rounded-3xl p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between ${isSelected
                        ? "border-accent ring-2 ring-accent/30 bg-accent/5 shadow-md"
                        : "border-border/60 bg-card hover:border-accent/40"
                      }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-muted/70">{item.icon}</div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          {item.rate}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
                          {item.category}
                        </span>
                        <h3 className="text-base font-bold text-foreground mt-0.5">{item.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {item.skills.slice(0, 3).map((s, i) => (
                          <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/75">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-border/40 mt-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDisciplineAssessment(item.id);
                        }}
                        variant={isSelected ? "default" : "outline"}
                        className={`w-full rounded-xl text-xs font-bold h-10 ${isSelected
                            ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                            : "hover:border-accent hover:text-accent"
                          }`}
                      >
                        Launch 2-Section Assessment
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Active 2-Section Discipline Assessment View */}
          {isAssessmentOpen && assessmentData && (
            <Card className="rounded-3xl border-accent/40 bg-card p-6 sm:p-10 shadow-xl space-y-8 animate-fade-in mt-6">
              <div className="flex items-start justify-between border-b border-border/50 pb-6 gap-4">
                <div>
                  <Badge className="bg-accent text-accent-foreground font-bold text-xs">
                    Specialist Credentialing Exam
                  </Badge>
                  <h2 className="text-2xl font-black text-foreground mt-1">
                    {assessmentData.title} Assessment
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Section 1: 10 Objective Questions • Section 2: 10 Rigorous Written Responses (1,500 – 5,000 words each, copy/paste blocked).
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsAssessmentOpen(false)}
                  className="rounded-xl text-xs shrink-0"
                >
                  Exit Exam
                </Button>
              </div>

              {assessmentResult ? (
                <div className="p-8 rounded-3xl bg-muted/30 border border-border/60 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center text-3xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground">Assessment Submitted</h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    {assessmentResult.message}
                  </p>
                  <div className="pt-4">
                    <Button
                      onClick={() => {
                        setIsAssessmentOpen(false);
                        setAssessmentResult(null);
                      }}
                      className="rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground px-8"
                    >
                      Return to Specialist Suite
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* SECTION 1: 10 MCQs */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                      <span className="w-8 h-8 rounded-xl bg-accent/15 text-accent font-black text-sm flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Section 1: Domain Multiple-Choice Questions (10 Questions)</h3>
                        <p className="text-xs text-muted-foreground">Select the single most accurate response for each question.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {assessmentData.section1.map((q, idx) => {
                        const selected = mcqAnswers[q.id];

                        return (
                          <div key={q.id} className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-accent">Q{idx + 1}.</span>
                              <span className="text-sm font-bold text-foreground">{q.question}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  onClick={() => setMcqAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${selected === optIdx
                                      ? "bg-accent text-accent-foreground font-bold border-accent shadow-sm"
                                      : "bg-card hover:bg-muted border-border/50 text-foreground/85"
                                    }`}
                                >
                                  <span className="font-mono font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 2: 10 WRITTEN QUESTIONS (1500 - 5000 WORDS, NO PASTE) */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                      <span className="w-8 h-8 rounded-xl bg-accent/15 text-accent font-black text-sm flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground">Section 2: Written Exposition (10 Questions)</h3>
                          <Badge variant="outline" className="text-destructive border-destructive/40 text-[10px] font-bold">
                            Copy & Paste Disabled
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Each written answer must contain a minimum of <strong>1,500 words</strong> and a maximum of <strong>5,000 words</strong>. Typing directly is required.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {assessmentData.section2.map((q, idx) => {
                        const content = writtenAnswers[q.id] || "";
                        const words = getWordCount(content);
                        const min = q.minWords || 1500;
                        const max = q.maxWords || 5000;
                        const isValidLength = words >= min && words <= max;

                        return (
                          <div key={q.id} className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-3 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-accent mt-0.5">Prompt {idx + 1}.</span>
                                <p className="text-sm font-bold text-foreground leading-relaxed">{q.question}</p>
                              </div>
                              <div className="shrink-0">
                                <Badge
                                  className={`text-[11px] font-bold ${isValidLength
                                      ? "bg-emerald-500 text-white"
                                      : words > max
                                        ? "bg-destructive text-destructive-foreground"
                                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    }`}
                                >
                                  {words.toLocaleString()} / {min.toLocaleString()} words
                                </Badge>
                              </div>
                            </div>

                            <Textarea
                              value={content}
                              onChange={(e) => setWrittenAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              onPaste={handlePreventPaste}
                              onCopy={handlePreventCopy}
                              onCut={handlePreventPaste}
                              onContextMenu={(e) => e.preventDefault()}
                              placeholder={`Type your comprehensive analytical answer directly into this field (minimum ${min.toLocaleString()} words, maximum ${max.toLocaleString()} words). Copy-paste is disabled.`}
                              rows={8}
                              className="rounded-xl text-xs sm:text-sm font-sans leading-relaxed resize-y select-text"
                            />

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {words < min && `Need ${(min - words).toLocaleString()} more words to satisfy minimum.`}
                                {isValidLength && "✓ Satisfies required 1,500 – 5,000 word length."}
                                {words > max && `Exceeds maximum limit by ${(words - max).toLocaleString()} words.`}
                              </span>
                              <span>Pasting disabled</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Exam Bar */}
                  <div className="sticky bottom-6 z-20 p-4 rounded-3xl bg-card/95 backdrop-blur-md border border-border/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground">
                      Ensure both Section 1 (10 MCQs) and Section 2 (10 written responses 1500–5000 words each) are completed.
                    </div>
                    <Button
                      onClick={handleSubmitDisciplineAssessment}
                      disabled={isSubmittingAssessment}
                      className="w-full sm:w-auto px-8 h-12 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground text-sm shadow-md"
                    >
                      {isSubmittingAssessment ? "Validating & Submitting..." : "Submit 2-Section Assessment"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* OPTION 2: PAY FOR TRAINING (SECONDARY)                   */}
      {/* ======================================================== */}
      {activeTab === "training" && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Tiers Grid */}
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Select Your Training & Credentialing Tier
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                One-time training fee backed by immediate task volume expansion.
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
                    className={`relative cursor-pointer transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between border ${plan.isUniversal
                        ? isSelected
                          ? "border-accent ring-2 ring-accent/40 bg-accent/10 shadow-lg shadow-accent/10"
                          : "border-accent/40 bg-gradient-to-b from-card to-accent/5 hover:border-accent"
                        : isSelected
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

                    {plan.isUniversal && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-accent text-accent-foreground font-black text-[11px] shadow-sm">
                          Integrated Projects Tier
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
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-1 bg-accent/15 text-accent">
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
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${plan.isUniversal && d.includes("Project")
                                  ? "bg-accent/15 text-accent font-bold"
                                  : "bg-muted text-foreground/80"
                                }`}
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
                        className={`w-full rounded-xl text-xs font-bold h-11 ${isSelected
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
                      onClick={() => {
                        const paypalUrl = `https://www.paypal.com/checkoutnow?token=EC-MANUAL-${selectedPlan}-${user.id}`;
                        window.location.href = paypalUrl;
                      }}
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
                              variant: "destructive",
                            });
                            return;
                          }

                          const codeRegex = /^[a-zA-Z0-9-]{6,30}$/;
                          if (!codeRegex.test(transactionCode)) {
                            toast({
                              title: "Invalid Code",
                              description: "Transaction code must be alphanumeric (6-30 characters).",
                              variant: "destructive",
                            });
                            return;
                          }

                          apiRequest("POST", "/api/payments/skill-upgrades/manual", {
                            tier: selectedPlan,
                            amount: amount.toString(),
                            transactionCode,
                          })
                            .then(async (res) => {
                              if (res.ok) {
                                toast({
                                  title: "Verification Submitted",
                                  description: "Your tier upgrade payment has been recorded and will be verified by administration.",
                                });
                                setLocation("/waiting-approval");
                              } else {
                                const data = await res.json();
                                toast({
                                  title: "Submission Failed",
                                  description: data.message || "Failed to record verification.",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(() => {
                              toast({
                                title: "Network Error",
                                description: "An unexpected error occurred. Please try again.",
                                variant: "destructive",
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
      )}
    </div>
  );
}