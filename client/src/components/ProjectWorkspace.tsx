import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserTask, ProjectSection, ProjectTaskItem } from "@shared/types";
import {
  Play,
  Pause,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  FileText
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";

interface ProjectWorkspaceProps {
  userTask: UserTask;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function ProjectWorkspace({ userTask, onSubmitted, onCancel }: ProjectWorkspaceProps) {
  const { toast } = useToast();
  const task = userTask.task;

  // Working time state in seconds
  const [seconds, setSeconds] = useState<number>(userTask.time_spent_seconds || 0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Parse structured project sections
  const sections: ProjectSection[] = (task?.project_structure as ProjectSection[]) || [];

  // Responses map: { [taskId]: answerStringOrData }
  const [responses, setResponses] = useState<Record<string, any>>(userTask.project_responses || {});
  const [finalNotes, setFinalNotes] = useState<string>(userTask.submission_description || "");
  const [proofAttachments, setProofAttachments] = useState<any[]>(userTask.proof_attachments || []);

  // Section accordion state (all expanded by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s) => { init[s.id] = true; });
    return init;
  });

  const hourlyRate = parseFloat(String(userTask.hourly_rate || task?.hourly_rate || 0));

  // Live timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Periodic background auto-sync every 30 seconds
  const latestSecondsRef = useRef(seconds);
  const latestResponsesRef = useRef(responses);
  latestSecondsRef.current = seconds;
  latestResponsesRef.current = responses;

  useEffect(() => {
    const autoSyncInterval = setInterval(async () => {
      try {
        await apiRequest("POST", `/api/tasks/${userTask.id}/track-time`, {
          time_spent_seconds: latestSecondsRef.current,
          project_responses: latestResponsesRef.current
        });
      } catch (err) {
        console.warn("Auto-sync notice:", err);
      }
    }, 30000);

    return () => clearInterval(autoSyncInterval);
  }, [userTask.id]);

  // Manual save handler
  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", `/api/tasks/${userTask.id}/track-time`, {
        time_spent_seconds: seconds,
        project_responses: responses
      });
      toast({
        title: "Progress Saved",
        description: "Your working time and responses have been safely synchronized.",
      });
    } catch (err) {
      toast({
        title: "Save Notice",
        description: "Could not save progress. Please check connection.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Final project submission handler
  const handleSubmitProject = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/tasks/${userTask.id}/submit`, {
        description: finalNotes || `Project work completed in ${formatTime(seconds)}.`,
        proof_attachments: proofAttachments,
        time_spent_seconds: seconds,
        project_responses: responses
      });

      toast({
        title: "Project Submitted for Review! 🚀",
        description: `Delivered with ${formatTime(seconds)} of logged time. Compensation: $${earnedAmount}`,
      });
      onSubmitted();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit project. Please verify inputs.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formats seconds into HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate live accrued earnings
  const earnedAmount = ((seconds / 3600) * hourlyRate).toFixed(2);

  // Compute total tasks and completed tasks
  const allSubtasks: ProjectTaskItem[] = [];
  sections.forEach((sec) => {
    sec.subsections?.forEach((sub) => {
      sub.tasks?.forEach((t) => allSubtasks.push(t));
    });
  });

  const completedCount = allSubtasks.filter((t) => {
    const val = responses[t.id];
    return val !== undefined && val !== null && String(val).trim() !== "";
  }).length;

  const progressPercent = allSubtasks.length > 0
    ? Math.round((completedCount / allSubtasks.length) * 100)
    : 100;

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleResponseChange = (taskId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [taskId]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Sticky Active Working Time & Accrued Earnings Bar */}
      <div className="sticky top-16 z-20 rounded-3xl bg-card/95 backdrop-blur-md border border-border/80 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Project Title & Badge */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-xs">
                ⏱️ Hourly Project Workspace
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs">
                ${hourlyRate.toFixed(2)}/hr Rate
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              {task?.title || "Active Project Assignment"}
            </h2>
          </div>

          {/* Clock Timer & Real-time Earnings Accrual */}
          <div className="flex items-center gap-3 sm:gap-4 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
            {/* Live Clock */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm ${
              isRunning
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse"
                : "bg-warning/10 text-warning border-warning/30"
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(seconds)}</span>
            </div>

            {/* Accrued Earnings Display */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-success/15 text-success border border-success/30 font-bold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>${earnedAmount} Accrued</span>
            </div>

            {/* Timer Play / Pause Controls */}
            <Button
              size="sm"
              variant={isRunning ? "outline" : "default"}
              onClick={() => setIsRunning(!isRunning)}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Clock
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume Clock
                </>
              )}
            </Button>

            {/* Manual Save Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="rounded-xl text-xs font-semibold gap-1.5"
              title="Save current time and answers"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>

        {/* Deliverables Progress Bar */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Progress: {completedCount} of {allSubtasks.length} items completed</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 rounded-full" />
        </div>
      </div>

      {/* Project Description & Guidelines */}
      {task?.description && (
        <Card className="rounded-3xl border-border/60 p-5 bg-card/60 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Project Overview & Instructions
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
          {task.instructions && (
            <div className="mt-3 p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs text-foreground/80 leading-relaxed">
              <strong>Specific Guidelines:</strong> {task.instructions}
            </div>
          )}
        </Card>
      )}

      {/* Structured Sections & Subsections */}
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section, secIdx) => {
            const isExpanded = !!expandedSections[section.id];
            return (
              <Card key={section.id || secIdx} className="rounded-3xl border-border/60 overflow-hidden shadow-sm">
                {/* Section Header */}
                <CardHeader
                  onClick={() => toggleSection(section.id)}
                  className="p-5 bg-muted/30 hover:bg-muted/50 cursor-pointer flex flex-row items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                      Section {secIdx + 1}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground">
                      {section.title}
                    </CardTitle>
                    {section.description && (
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CardHeader>

                {/* Section Content */}
                {isExpanded && (
                  <CardContent className="p-5 sm:p-6 space-y-6">
                    {section.subsections?.map((subsection, subIdx) => (
                      <div key={subsection.id || subIdx} className="space-y-4 pt-2 first:pt-0">
                        {/* Subsection Title */}
                        <div className="border-b border-border/40 pb-2">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                            {subsection.title}
                          </h4>
                          {subsection.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                              {subsection.description}
                            </p>
                          )}
                        </div>

                        {/* Subsection Tasks / Questions */}
                        <div className="space-y-4 ml-2 sm:ml-4">
                          {subsection.tasks?.map((subtask, tIdx) => {
                            const val = responses[subtask.id] || "";
                            const isAnswered = val !== undefined && val !== null && String(val).trim() !== "";

                            return (
                              <div
                                key={subtask.id || tIdx}
                                className={`p-4 rounded-2xl border transition-all ${
                                  isAnswered
                                    ? "bg-card border-border/80"
                                    : "bg-muted/20 border-dashed border-border/70"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-foreground">
                                        {tIdx + 1}. {subtask.title}
                                      </span>
                                      {isAnswered && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                      )}
                                    </div>
                                    {subtask.description && (
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {subtask.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Approximated completion duration badge */}
                                  <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-accent" />
                                    <span>~{subtask.estimated_duration_minutes || 15} mins</span>
                                  </Badge>
                                </div>

                                {/* Task input depending on type */}
                                <div className="mt-3">
                                  {subtask.type === 'choice' && subtask.options && subtask.options.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {subtask.options.map((opt, oIdx) => (
                                        <button
                                          key={oIdx}
                                          type="button"
                                          onClick={() => handleResponseChange(subtask.id, opt)}
                                          className={`p-3 rounded-xl border text-xs text-left font-medium transition-all ${
                                            val === opt
                                              ? "bg-accent/15 border-accent text-accent font-bold ring-1 ring-accent/30"
                                              : "bg-card border-border/60 hover:bg-muted/50 text-foreground/80"
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  ) : subtask.type === 'checklist' ? (
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold p-2.5 rounded-xl border border-border/60 hover:bg-muted/40">
                                      <input
                                        type="checkbox"
                                        checked={val === true}
                                        onChange={(e) => handleResponseChange(subtask.id, e.target.checked)}
                                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                                      />
                                      <span>Mark verified and completed</span>
                                    </label>
                                  ) : (
                                    <Textarea
                                      placeholder="Provide your detailed answer, findings, or notes for this item..."
                                      value={val}
                                      onChange={(e) => handleResponseChange(subtask.id, e.target.value)}
                                      rows={2}
                                      className="rounded-xl text-xs bg-card border-border/60"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* Fallback for standard tasks without predefined project sections */
        <Card className="rounded-3xl border-border/60 p-6 space-y-4 bg-card">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Work Deliverables & Summary</Label>
          <Textarea
            placeholder="Document all completed deliverables and results..."
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            rows={5}
            className="rounded-2xl text-xs"
          />
        </Card>
      )}

      {/* Deliverable Attachments & Submission Card */}
      <Card className="rounded-3xl border-border/60 p-6 bg-card space-y-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-foreground">Project Finalization & Deliverable Proof</h3>
          <p className="text-xs text-muted-foreground">
            Attach any screenshots, documents, or data deliverables that substantiate your completed work.
          </p>
        </div>

        <FileUpload
          bucket="task-attachments"
          useProxy={true}
          initialFiles={proofAttachments}
          onUploadSuccess={(uploaded) => setProofAttachments(uploaded)}
          maxFiles={5}
        />

        <div className="space-y-2 pt-2">
          <Label htmlFor="submission-notes" className="text-xs font-bold uppercase text-muted-foreground">
            Concluding Summary Notes
          </Label>
          <Textarea
            id="submission-notes"
            placeholder="Add any summary or handover remarks for the evaluating administrator..."
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            rows={3}
            className="rounded-2xl text-xs bg-card border-border/60"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
          >
            Exit Workspace (Keep In Queue)
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="rounded-xl text-xs font-semibold flex-1 sm:flex-none"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>

            <Button
              type="button"
              onClick={handleSubmitProject}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm flex-1 sm:flex-none"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isSubmitting ? "Submitting Work..." : "Submit Project Deliverables"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
