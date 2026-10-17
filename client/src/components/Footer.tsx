import React from "react";
import { useLocation } from "wouter";
import { ShieldCheck, ArrowRight, Github, Twitter, Linkedin, Mail, Globe2 } from "lucide-react";

export default function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="w-full border-t border-border/60 bg-card/60 backdrop-blur-md pt-16 pb-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-10 pb-12 border-b border-border/50">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                P
              </div>
              <span className="font-extrabold text-xl tracking-tight text-foreground">
                ProTasker<span className="text-accent">.Geek</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-6">
              The premier Human-in-the-Loop AI training and alignment network. Connecting world-class researchers, engineers, and specialists to benchmark tomorrow's intelligence.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>SOC2 Type II Compliant • Enterprise Data Protection</span>
            </div>
          </div>

          {/* Column: Disciplines */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Disciplines
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><a href="/#disciplines" className="hover:text-accent transition-colors">Software & Code</a></li>
              <li><a href="/#disciplines" className="hover:text-accent transition-colors">Mathematics & Logic</a></li>
              <li><a href="/#disciplines" className="hover:text-accent transition-colors">Multilingual NLP</a></li>
              <li><a href="/#disciplines" className="hover:text-accent transition-colors">Biomedical & Sciences</a></li>
              <li><a href="/#disciplines" className="hover:text-accent transition-colors">AI Safety & Alignment</a></li>
            </ul>
          </div>

          {/* Column: Platform & Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Platform & Company
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><button onClick={() => setLocation("/about")} className="hover:text-accent transition-colors text-left">About Us</button></li>
              <li><button onClick={() => setLocation("/contact")} className="hover:text-accent transition-colors text-left">Contact Us</button></li>
              <li><button onClick={() => setLocation("/faq")} className="hover:text-accent transition-colors text-left">Help & FAQ</button></li>
              <li><a href="/#how-it-works" className="hover:text-accent transition-colors">How It Works</a></li>
              <li><button onClick={() => setLocation("/auth")} className="hover:text-accent transition-colors text-left">Sign In</button></li>
            </ul>
          </div>

          {/* Column: Legal & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Legal & Trust
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><button onClick={() => setLocation("/privacy-policy")} className="hover:text-accent transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => setLocation("/user-agreement")} className="hover:text-accent transition-colors text-left">User Agreement</button></li>
              <li><a href="/#earnings" className="hover:text-accent transition-colors">Payout Policy</a></li>
              <li><span className="text-xs text-muted-foreground/80">Confidentiality Guarantee</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ProTasker.Geek Inc. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Global Remote Network</span>
            </span>
            <span>•</span>
            <span className="text-accent font-semibold">Strict AI Quality Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}