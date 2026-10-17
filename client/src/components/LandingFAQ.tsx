import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How does payment work and when do I get paid?",
    a: "Payouts are calculated based on hourly task engagement or per-task milestones according to your verified discipline rate. All earnings are distributed weekly every Tuesday directly via PayPal, AirTM, or direct bank wire with complete transaction history in your dashboard."
  },
  {
    q: "How many hours am I required to work each week?",
    a: "There are zero minimum hour requirements. You have total autonomy to set your own schedule — whether you want to dedicate 5 hours a week as a flexible side income or 35+ hours as a primary project, task availability is open 24/7."
  },
  {
    q: "What equipment or software do I need to get started?",
    a: "All you need is a reliable computer (laptop or desktop), an up-to-date web browser (Chrome, Firefox, or Edge), and a stable internet connection. All coding environments, LLM inference consoles, and annotation tools run entirely in our cloud workspace."
  },
  {
    q: "What types of tasks will I be working on?",
    a: "Depending on your selected discipline, tasks include: writing gold-standard algorithmic code solutions, grading model outputs for factual accuracy and logical coherence, spotting hallucinated reasoning steps in mathematical proofs, and red-teaming model safety filters."
  },
  {
    q: "How long does the application and verification process take?",
    a: "Initial profile registration takes about 5 minutes. Domain assessment tests typically take 20 to 45 minutes to complete. Our automated review system and specialist team process applications within 24 to 48 hours so you can start earning immediately."
  },
  {
    q: "Can I switch disciplines or work across multiple categories?",
    a: "Yes. Once approved, you can complete additional qualification benchmarks from your dashboard to unlock supplementary task pools (e.g. both Software Engineering and Mathematics) to maximize your earning potential."
  }
];

export function LandingFAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide uppercase mb-4">
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
            Frequently Asked <span className="text-accent">Questions</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Everything you need to know about working as a specialist on the ProTasker Geek network.
          </p>
        </div>

        <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-10 shadow-sm">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border border-border/60 rounded-2xl px-5 transition-colors data-[state=open]:border-accent/40 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="text-left font-bold text-base sm:text-lg py-5 hover:no-underline hover:text-accent">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-accent shrink-0" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-1 pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export default LandingFAQ;
