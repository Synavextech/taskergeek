import React from "react";
import { Code2, Binary, Languages, Microscope, ShieldAlert, BookOpen, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface Discipline {
  id: string;
  title: string;
  category: string;
  rate: string;
  description: string;
  skills: string[];
  icon: React.ReactNode;
  demand: "High Demand" | "Surging" | "Top Rate";
  featured?: boolean;
}

const DISCIPLINES: Discipline[] = [
  {
    id: "software",
    title: "Software & Code Generation",
    category: "Computer Science",
    rate: "$40 - $65 / hr",
    description: "Evaluate complex algorithmic solutions, review code generation accuracy, debug subtle runtime bugs, and benchmark model code completions in Python, TypeScript, C++, and Rust.",
    skills: ["Python", "Algorithms", "TypeScript", "Rust", "System Architecture"],
    icon: <Code2 className="w-6 h-6 text-emerald-500" />,
    demand: "Top Rate",
    featured: true
  },
  {
    id: "math",
    title: "Mathematics & Formal Logic",
    category: "STEM",
    rate: "$45 - $60 / hr",
    description: "Write and evaluate step-by-step rigorous proofs, verify mathematical reasoning in competitive calculus, number theory, and formal logic systems.",
    skills: ["Calculus", "Linear Algebra", "Proof Verification", "Discrete Math"],
    icon: <Binary className="w-6 h-6 text-amber-500" />,
    demand: "High Demand",
    featured: false
  },
  {
    id: "linguistics",
    title: "Multilingual & Computational NLP",
    category: "Humanities & Language",
    rate: "$30 - $48 / hr",
    description: "Craft culturally nuanced prompts, identify idiomatic errors, evaluate multi-turn dialectical subtleties, and benchmark localized LLM responses.",
    skills: ["Translation", "Semantics", "Syntax Analysis", "Idiomatic Evaluation"],
    icon: <Languages className="w-6 h-6 text-blue-500" />,
    demand: "High Demand",
    featured: false
  },
  {
    id: "sciences",
    title: "Natural Sciences & Biomedicine",
    category: "Life Sciences",
    rate: "$42 - $58 / hr",
    description: "Assess scientific validity in biochemistry, pharmacology, genetics, and molecular biology. Validate clinical reasoning benchmarks and scientific literature synthesis.",
    skills: ["Biochemistry", "Molecular Biology", "Clinical Reasoning", "Physics"],
    icon: <Microscope className="w-6 h-6 text-accent" />,
    demand: "Surging",
    featured: false
  },
  {
    id: "safety",
    title: "AI Safety, Ethics & Red Teaming",
    category: "Model Alignment",
    rate: "$40 - $55 / hr",
    description: "Stress-test frontier models against adversarial jailbreaks, evaluate toxicity, ensure privacy compliance, and verify alignment with ethical safety policies.",
    skills: ["Adversarial Testing", "Toxicity Auditing", "Prompt Engineering", "Policy"],
    icon: <ShieldAlert className="w-6 h-6 text-rose-500" />,
    demand: "Top Rate",
    featured: true
  },
  {
    id: "reasoning",
    title: "Advanced Reasoning & Synthesis",
    category: "Humanities & Logic",
    rate: "$32 - $45 / hr",
    description: "Grade multi-source synthesis, assess high-context factual consistency, refine instruction-following fidelity, and curate gold-standard grounding datasets.",
    skills: ["Critical Analysis", "Fact Verification", "RAG Grounding", "Expository Writing"],
    icon: <BookOpen className="w-6 h-6 text-cyan-500" />,
    demand: "High Demand",
    featured: false
  }
];

export function DisciplinesGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleApply = (disciplineId: string) => {
    if (user) {
      setLocation(`/skill-upgrade?mode=assessment&discipline=${disciplineId}`);
    } else {
      setLocation(`/auth?redirect=${encodeURIComponent(`/skill-upgrade?mode=assessment&discipline=${disciplineId}`)}`);
    }
  };

  return (
    <section id="disciplines" className="py-20 sm:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide uppercase mb-4">
            Specialized AI Training Fields
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
            Choose Your Discipline & <span className="text-accent">Earn on Your Terms</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Apply your academic knowledge and technical expertise to benchmark, teach, and align tomorrow's frontier AI models with market-leading compensation.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {DISCIPLINES.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-3xl p-6 sm:p-8 transition-all duration-300 flex flex-col justify-between border ${
                item.featured
                  ? "bg-gradient-to-b from-card via-card/90 to-card border-accent/40 shadow-lg shadow-accent/5"
                  : "bg-card/70 hover:bg-card border-border/70 hover:border-accent/40 shadow-sm hover:shadow-md"
              } backdrop-blur-sm`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="p-3 rounded-2xl bg-muted/60 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      {item.rate}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground mt-1">
                      {item.demand}
                    </span>
                  </div>
                </div>

                {/* Title & Category */}
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  {item.category}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1 mb-3 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              {/* Skills Tags & Apply Button */}
              <div>
                <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/40">
                  {item.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-muted text-foreground/80 px-2.5 py-1 rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <Button
                  onClick={() => handleApply(item.id)}
                  variant="outline"
                  className="w-full justify-between rounded-xl font-semibold border-border hover:border-accent hover:bg-accent hover:text-white transition-all group-hover:border-accent"
                >
                  <span>Apply for this Role</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DisciplinesGrid;
