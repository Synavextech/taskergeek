import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  AlertOctagon,
} from "lucide-react";
import { ComponentLoader } from "@/components/LoadingSpinner";

interface Question {
  id: string;
  question: string;
  options: string[];
}

export default function GrammarTest() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(user?.grammar_test_attempts || 0);
  const [isRejected, setIsRejected] = useState(user?.approval_status === "rejected" || (user?.grammar_test_attempts || 0) >= 5);
  const [testResult, setTestResult] = useState<{
    passed: boolean;
    score: number;
    total: number;
    attempts: number;
    remainingAttempts?: number;
    message: string;
    reviewDetails?: Record<string, { correct: boolean; explanation: string }>;
  } | null>(null);

  // Fetch grammar questions from backend
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/api/assessment/grammar");
      if (!res.ok) {
        throw new Error("Failed to load grammar assessment");
      }
      const data = await res.json();
      setQuestions(data.questions || []);
      setAttempts(data.attempts || 0);
      if (data.isRejected) {
        setIsRejected(true);
      }
      if (data.passed) {
        toast({
          title: "Assessment Cleared",
          description: "You have already passed the grammar benchmark.",
        });
        setLocation("/home");
      }
    } catch (err: any) {
      toast({
        title: "Loading Error",
        description: err.message || "Could not retrieve questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (user.grammar_test_passed) {
      setLocation("/home");
      return;
    }
    fetchQuestions();
  }, [user]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleSubmit = async () => {
    if (!isAllAnswered) {
      const firstUnanswered = questions.find(q => selectedAnswers[q.id] === undefined);
      toast({
        title: "Incomplete Assessment",
        description: `Please answer all remaining questions before submitting (${answeredCount}/${questions.length} answered).`,
        variant: "destructive",
      });
      if (firstUnanswered) {
        const el = document.getElementById(`question-${firstUnanswered.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest("POST", "/api/assessment/grammar/submit", {
        answers: selectedAnswers,
      });

      const data = await res.json();

      if (!res.ok && res.status === 403 && data.rejected) {
        setIsRejected(true);
        setTestResult({
          passed: false,
          score: data.score || 0,
          total: 15,
          attempts: data.attempts || 5,
          remainingAttempts: 0,
          message: data.message,
        });
        if (user) {
          const updatedUser = { ...user, approval_status: "rejected" as const, grammar_test_attempts: 5 };
          setUser(updatedUser);
        }
        return;
      }

      setTestResult(data);
      setAttempts(data.attempts);

      if (data.passed) {
        toast({
          title: "Assessment Passed! 🌟",
          description: data.message,
        });
        if (user) {
          const updatedUser = {
            ...user,
            grammar_test_passed: true,
            grammar_test_attempts: data.attempts,
          };
          queryClient.setQueryData(["user", user.id], updatedUser);
          setUser(updatedUser);
        }
      } else {
        if (data.attempts >= 5 || data.rejected) {
          setIsRejected(true);
          toast({
            title: "Application Declined",
            description: "Maximum allowable assessment attempts exceeded.",
            variant: "destructive",
          });
          if (user) {
            setUser({ ...user, approval_status: "rejected" });
          }
        } else {
          toast({
            title: "Assessment Not Passed",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "An unexpected error occurred during submission.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setTestResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <ComponentLoader text="Loading Grammar Assessment Benchmark..." />;
  }

  // Automatic Rejection Screen
  if (isRejected) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-lg w-full text-center rounded-3xl border-destructive/40 bg-card p-6 sm:p-10 shadow-lg space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-destructive/15 text-destructive mx-auto flex items-center justify-center text-4xl shadow-inner">
            <AlertOctagon className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <Badge variant="outline" className="text-destructive border-destructive/40 bg-destructive/10 px-3 py-1 font-bold">
              Automatic Application Rejection
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Assessment Limit Exceeded
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have failed the mandatory onboarding grammar assessment <strong>5 times</strong>. In accordance with platform quality standards, your registration cannot be approved at this time.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/60 text-xs text-muted-foreground text-left space-y-1">
            <p className="font-semibold text-foreground">What this means:</p>
            <p>• Access to live tasks and workspaces is permanently restricted for this account.</p>
            <p>• For appeals or inquiries regarding technical anomalies, please contact administration.</p>
          </div>
          <Button
            onClick={() => setLocation("/contact")}
            variant="outline"
            className="w-full rounded-2xl font-bold border-border hover:border-destructive hover:text-destructive"
          >
            Contact Support & Appeals
          </Button>
        </Card>
      </div>
    );
  }

  // Passed State Celebration
  if (testResult?.passed) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-lg w-full text-center rounded-3xl border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center text-4xl shadow-inner">
            <Award className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <Badge className="bg-emerald-500 text-white px-3 py-1 font-bold text-xs">
              Grammar Benchmark Certified
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Assessment Passed!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Congratulations! You achieved a score of <strong>{testResult.score} / {testResult.total}</strong> (Passing: 12/15). Your linguistic and syntactical accuracy has met platform guidelines.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="p-4 rounded-2xl bg-card border border-border/60 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Final Score</span>
              <span className="text-2xl font-black text-emerald-500">{testResult.score} / 15</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/60 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Attempts Used</span>
              <span className="text-2xl font-black text-foreground">{testResult.attempts} of 5</span>
            </div>
          </div>

          <Button
            onClick={() => setLocation("/home")}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md"
          >
            Enter Specialist Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  const remaining = Math.max(0, 5 - attempts);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/10 border border-border/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Step 2 of 2: Quality & Benchmark Clearance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Grammar & Syntax Assessment
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Verify your grasp of academic, professional, and instructional English. Complete all 15 questions with an 80% passing threshold (12/15) to unlock live tasks.
            </p>
          </div>

          {/* Attempt Status Badge */}
          <div className="shrink-0 flex flex-col items-end gap-1.5 bg-card/80 border border-border/80 p-3 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Attempts:</span>
              <span className="text-accent">{attempts} of 5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <div
                  key={num}
                  className={`w-3 h-3 rounded-full transition-all ${
                    num <= attempts
                      ? "bg-destructive/80"
                      : "bg-muted-foreground/30"
                  }`}
                  title={`Attempt ${num}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {remaining} {remaining === 1 ? "attempt" : "attempts"} remaining
            </span>
          </div>
        </div>

        {/* Warning if attempts > 0 */}
        {attempts > 0 && !testResult && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Notice:</strong> You have used {attempts} out of 5 attempts. If you fail 5 times, your platform registration will be automatically rejected.
            </p>
          </div>
        )}
      </div>

      {/* Result Alert if just failed */}
      {testResult && !testResult.passed && (
        <Card className="rounded-3xl border-destructive/40 bg-destructive/5 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Assessment Not Cleared</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                You scored <strong>{testResult.score} / {testResult.total}</strong>. A score of at least 12/15 is required.
                You have <strong>{testResult.remainingAttempts}</strong> attempts remaining before permanent account decline.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={handleRetake}
              className="rounded-xl font-bold text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retake Assessment
            </Button>
          </div>
        </Card>
      )}

      {/* Questions Form */}
      {(!testResult || testResult.passed === false) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Progress: {answeredCount} / {questions.length} answered
            </span>
            <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${(answeredCount / (questions.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const currentSelected = selectedAnswers[q.id];

              return (
                <Card
                  key={q.id}
                  id={`question-${q.id}`}
                  className={`rounded-3xl p-5 sm:p-6 transition-all duration-200 border ${
                    currentSelected !== undefined
                      ? "border-accent/50 bg-card shadow-sm"
                      : "border-border/60 bg-card/60"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-accent/15 text-accent font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Question {idx + 1} of {questions.length}
                        </span>
                      </div>
                      {currentSelected !== undefined && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                      {q.question}
                    </p>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = currentSelected === optIdx;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 ${
                              isChosen
                                ? "bg-accent/10 border-accent text-foreground shadow-sm ring-1 ring-accent/30"
                                : "bg-muted/40 hover:bg-muted/70 border-border/50 text-foreground/80"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                                isChosen
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Submission Bar */}
          <div className="sticky bottom-6 z-20 p-4 rounded-3xl bg-card/95 backdrop-blur-md border border-border/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              {isAllAnswered ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> All 15 questions completed
                </span>
              ) : (
                <span>
                  Please complete remaining {questions.length - answeredCount} questions before submitting.
                </span>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-8 h-12 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground text-sm shadow-md cursor-pointer"
            >
              {submitting ? "Grading Assessment..." : "Submit Grammar Assessment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
