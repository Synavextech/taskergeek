import React from "react";
import { DollarSign, Clock, Globe2, ShieldCheck, Zap, Sparkles } from "lucide-react";

export function EarningsBenefits() {
  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
      title: "Competitive Hourly Compensation",
      description: "Earn between $30 and $65+ per hour based on your specialty, credentials, and task quality scores."
    },
    {
      icon: <Clock className="w-6 h-6 text-amber-500" />,
      title: "100% Flexible Working Hours",
      description: "No mandatory shifts or minimum weekly hours. Work early in the morning, late at night, or on weekends."
    },
    {
      icon: <Globe2 className="w-6 h-6 text-blue-500" />,
      title: "Work From Anywhere in the World",
      description: "All tasks are completed within our browser-based secure workspace. No specialized local hardware needed."
    },
    {
      icon: <Zap className="w-6 h-6 text-accent" />,
      title: "Weekly Direct Payouts",
      description: "Receive your earnings automatically every week via PayPal, AirTM, or direct bank deposit with zero hidden fees."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-accent" />,
      title: "Train Frontier AI Models",
      description: "Work on cutting-edge generative models, multi-modal systems, and reinforcement learning datasets."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-500" />,
      title: "Merit-Based Growth & Bonuses",
      description: "High-accuracy contributors unlock priority queue access, tier bonuses, and reviewer promotions."
    }
  ];

  return (
    <section id="earnings" className="py-20 sm:py-28 bg-card/40 border-y border-border/50 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide uppercase mb-4">
            Why Top Geeks Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
            Freedom, Flexibility & <span className="text-accent">Industry-Leading Pay</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Experience the future of intellectual work. Earn on your own terms while advancing global artificial intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/60 hover:border-accent/40 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="p-3 w-fit rounded-2xl bg-muted/60 mb-5">
                {b.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {b.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EarningsBenefits;
