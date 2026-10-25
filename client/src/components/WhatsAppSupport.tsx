import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Headphones,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { SupportMessage } from "@shared/types";

interface WhatsAppSupportProps {
  phoneNumber?: string;
  defaultMessage?: string;
  className?: string;
}

export const WhatsAppSupport: React.FC<WhatsAppSupportProps> = ({
  phoneNumber = "19785236630",
  defaultMessage = "Hi ProTaskerGeek! I need help with my tasks and account.",
  className = "",
}) => {
  const { user } = useAuth() as { user: any };
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [supportType, setSupportType] = useState<"task" | "general">("general");
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Listen to global open event from header/navigation menus
  useEffect(() => {
    const handleOpenSupport = (e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.mode === "task" || e.detail?.mode === "general") {
        setSupportType(e.detail.mode);
      }
    };

    window.addEventListener("open-support" as any, handleOpenSupport);
    return () => {
      window.removeEventListener("open-support" as any, handleOpenSupport);
    };
  }, []);

  // Fetch live chat messages when logged in and widget is open
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    refetch,
  } = useQuery<SupportMessage[]>({
    queryKey: ["/api/support/messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/support/messages");
      return res.json();
    },
    enabled: !!user && isOpen && supportType === "general",
    refetchInterval: isOpen && supportType === "general" ? 4000 : false,
  });

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen && supportType === "general") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, supportType]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await apiRequest("POST", "/api/support/messages", {
        message: messageText,
      });
      return res.json();
    },
    onSuccess: () => {
      setInputMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/support/messages"] });
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputMessage.trim());
  };

  // Pre-formatted WhatsApp link
  const taskHelpContext = user
    ? `Hello ProTaskerGeek Support!%0A%0AUser: ${encodeURIComponent(user.name || "Specialist")} (${encodeURIComponent(user.email || "")})%0ATier: ${encodeURIComponent(user.skill_upgrade_tier || "Member")}%0A%0AI require assistance regarding: Task Operations / Task Assistance.`
    : encodeURIComponent(defaultMessage);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${taskHelpContext}`;

  const unreadAdminCount = messages.filter(
    (m) => m.sender_role === "admin" && !m.is_read
  ).length;

  return (
    <>
      {/* Floating Action Launcher */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
            aria-label="Open Support Hub"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
              </span>
            </div>
            <span className="text-xs font-bold tracking-wide hidden sm:inline-block">
              Support Center
            </span>

            {unreadAdminCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {unreadAdminCount}
              </span>
            )}
          </button>
        )}

        {/* Dual Support Modal / Chat Dialog */}
        {isOpen && (
          <div className="w-[calc(100vw-2rem)] sm:w-[410px] h-[560px] max-h-[85vh] bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight leading-tight">
                      ProTasker Support Hub
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-100 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                      Support Team Online • 24/7
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full text-white/90 hover:text-white hover:bg-white/20 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Communication Option Selector */}
              <div className="mt-3.5 space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100 block">
                  Select Assistance Type:
                </label>
                <Select
                  value={supportType}
                  onValueChange={(val: "task" | "general") => setSupportType(val)}
                >
                  <SelectTrigger className="w-full bg-white/15 border-white/25 text-white h-9 rounded-xl text-xs font-semibold focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Choose support channel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-xl">
                    <SelectItem
                      value="task"
                      className="cursor-pointer text-xs font-medium py-2.5 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-green-500/15 text-green-600 font-bold text-xs">
                          WA
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">
                            Task-Related Support
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Task issues, instructions & proof disputes (WhatsApp)
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="general"
                      className="cursor-pointer text-xs font-medium py-2.5 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-primary/15 text-primary font-bold text-xs">
                          LC
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">
                            General Support
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Platform, billing, KYC & account livechat
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Area Based on Selected Support Type */}
            {supportType === "task" ? (
              /* Task Related Support Screen (WhatsApp Redirect) */
              <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-muted/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Task Operations Desk Active
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                      Instant WhatsApp
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <p className="font-medium text-foreground">
                      Task-related inquiries are routed directly to our 24/7 WhatsApp Tasking Desk for fast-track coordination:
                    </p>
                    <ul className="space-y-2 pl-2">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>Task instructions & rubric clarification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>Proof submission verification & review delays</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>Task rejection appeal & feedback review</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>Hourly project tracking & time logging support</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1.5 shadow-sm text-xs">
                    <div className="text-muted-foreground text-[11px] font-semibold uppercase">
                      Dedicated Desk Line:
                    </div>
                    <div className="font-mono font-bold text-foreground flex items-center justify-between">
                      <span>+1 (978) 523-6630</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 space-y-2">
                  <Button
                    asChild
                    className="w-full h-11 rounded-2xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Continue to WhatsApp Support
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-80" />
                    </a>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Opens your WhatsApp app or WhatsApp Web directly.
                  </p>
                </div>
              </div>
            ) : (
              /* General Support Screen (System Livechat) */
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                {!user ? (
                  /* Guest notice if not authenticated */
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground">
                        Sign In for Live Support
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                        To connect with platform administrators via livechat, please sign in to your specialist account.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setIsOpen(false);
                        setLocation("/auth");
                      }}
                      className="rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground px-5"
                    >
                      Sign In Now
                    </Button>
                  </div>
                ) : (
                  /* Authenticated Live Chat Feed */
                  <>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                      {isMessagesLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground">
                          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-xs">
                              How can we help you today?
                            </p>
                            <p className="text-[11px] leading-relaxed mt-1">
                              Send a message below regarding account, payouts, KYC, or general platform inquiries. An administrator will reply directly.
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isUser = msg.sender_role === "user";
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                isUser ? "items-end" : "items-start"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {isUser ? "You" : "Admin Support"}
                                </span>
                                <span className="text-[9px] text-muted-foreground/70">
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                                  isUser
                                    ? "bg-accent text-accent-foreground rounded-br-xs"
                                    : "bg-muted text-foreground border border-border/80 rounded-bl-xs"
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form
                      onSubmit={handleSendMessage}
                      className="p-3 bg-card border-t border-border/60 flex items-center gap-2 shrink-0"
                    >
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type message to support..."
                        className="rounded-xl text-xs h-9 bg-muted/60 focus-visible:ring-accent"
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                        className="rounded-xl h-9 w-9 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 shadow-sm"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default WhatsAppSupport;