import React from "react";
import { UserCheck, Award, Cpu, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const STEPS = [
  {
    step: "01",
    title: "Apply & Verify Profile",
    description: "Submit your academic credentials or technical background. Complete a quick, secure identity verification to activate your specialist profile.",
    icon: <UserCheck className="w-6 h-6 text-accent" />,
    badge: "15 Minutes"
  },
  {
    step: "02",
    title: "Domain Assessment",
    description: "Take a focused, domain-specific screening test evaluating your code quality, reasoning rigor, or language fluency to unlock matching task queues.",
    icon: <Award className="w-6 h-6 text-accent" />,
    badge: "Automated Review"
  },
  {
    step: "03",
    title: "Train Frontier AI",
    description: "Receive high-value tasks directly in your secure workspace. Review model responses, write golden-standard reasoning, and provide RLHF critique.",
    icon: <Cpu className="w-6 h-6 text-accent" />,
    badge: "100% Remote"
  },
  {
    step: "04",
    title: "Weekly Direct Payouts",
    description: "Track earnings live in your dashboard. Enjoy guaranteed weekly payouts via PayPal, AirTM, or direct bank transfer with full ledger transparency.",
    icon: <Wallet className="w-6 h-6 text-accent" />,
    badge: "Every Tuesday"
  }
];

export function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30 border-y border-border/50 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide uppercase mb-4">
            Simple, Transparent Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
            From Application to <span className="text-accent">Earning in 4 Steps</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            We removed the friction. No endless bidding, no client chasing — just pure merit-based matching to high-paying AI training tasks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {STEPS.map((step, idx) => (
            <div
              key={step.step}
              className="relative bg-card border border-border/60 hover:border-accent/40 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-accent/30 tracking-tight">
                    {step.step}
                  </span>
                </div>

                <div className="inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-3">
                  {step.badge}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-border">
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button
            onClick={() => setLocation("/auth")}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-white font-semibold rounded-2xl px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all"
          >
            Start Your Application Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
