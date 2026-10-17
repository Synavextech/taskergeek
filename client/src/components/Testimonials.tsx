import React from "react";
import { Star, Quote, CheckCircle2 } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  country: string;
  avatar: string;
  quote: string;
  earnings: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Dr. Elena Rostova",
    role: "Postdoc in Mathematical Physics",
    country: "Estonia",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
    quote: "ProTasker gives me the intellectual stimulation of academic research with complete freelance autonomy. I can log in for 3 hours after university lectures and train mathematical logic models.",
    earnings: "$3,400+ / mo",
    rating: 5.0
  },
  {
    name: "Kenji Sato",
    role: "Senior Software Engineer",
    country: "Japan",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
    quote: "The Python and Rust task queues are genuinely challenging. You're reviewing subtle concurrency bugs and optimizing algorithmic logic for leading models. Payouts arrive like clockwork every Tuesday.",
    earnings: "$4,250+ / mo",
    rating: 5.0
  },
  {
    name: "Amara Okafor",
    role: "Computational Linguist",
    country: "Nigeria",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
    quote: "Evaluating multilingual nuance and African language datasets for AI models has been both financially rewarding and deeply impactful. The support team is responsive and the tooling is best-in-class.",
    earnings: "$2,800+ / mo",
    rating: 4.98
  }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide uppercase mb-4">
            Expert Community Voices
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
            Hear From Our <span className="text-accent">Global Specialists</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Thousands of researchers, engineers, and domain experts earn flexibly by shaping the future of AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="bg-card/70 hover:bg-card border border-border/70 hover:border-accent/40 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {t.earnings}
                  </span>
                </div>

                <Quote className="w-8 h-8 text-accent/30 mb-3" />
                <p className="text-sm text-foreground/90 leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-border/50">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-accent/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-foreground">{t.name}</h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.role} • {t.country}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
