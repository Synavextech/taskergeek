import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { Navbar } from "@/components/Navbar";
import { ExpertTicker } from "@/components/ExpertTicker";
import { DisciplinesGrid } from "@/components/DisciplinesGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { EarningsBenefits } from "@/components/EarningsBenefits";
import { Testimonials } from "@/components/Testimonials";
import { LandingFAQ } from "@/components/LandingFAQ";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  Globe,
  Sparkles
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent/20 selection:text-accent">
      {/* WhatsApp Support floating action */}
      <WhatsAppSupport />

      {/* Modern Sticky Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden hero-gradient">
        {/* Subtle dynamic backdrop */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent/10 blur-[130px] rounded-full" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs sm:text-sm font-semibold mb-6 animate-fade-in shadow-sm">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Now Recruiting Specialists in Code, Math, STEM & Languages</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1] mb-6">
              Earn by Training <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-accent via-amber-500 to-emerald-500 bg-clip-text text-transparent">
                Next-Generation AI Models
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              Join an elite global network of software engineers, researchers, and domain specialists delivering essential Human-in-the-Loop intelligence. Work remotely, choose your own hours, and receive guaranteed weekly payouts.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 max-w-md mx-auto">
              {user ? (
                <Button
                  onClick={() => setLocation("/home")}
                  size="lg"
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white font-bold px-8 py-6 text-base rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Go to Geek Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setLocation("/auth")}
                    size="lg"
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white font-bold px-8 py-6 text-base rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Apply as a Geek
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={() => setLocation("/auth")}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-2 border-border/80 text-foreground hover:bg-muted font-bold px-8 py-6 text-base rounded-2xl backdrop-blur-sm transition-all"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>

            {/* Key Trust Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-border/60 max-w-3xl mx-auto text-left">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-foreground">50+</span>
                <span className="text-xs text-muted-foreground font-medium">Countries Represented</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-foreground">$30 - $65</span>
                <span className="text-xs text-muted-foreground font-medium">Hourly Earning Range</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-foreground">100%</span>
                <span className="text-xs text-muted-foreground font-medium">Remote & Flexible</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-foreground">Weekly</span>
                <span className="text-xs text-muted-foreground font-medium">Guaranteed Payouts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 20-Expert Scrolling Ticker immediately below Hero */}
      <ExpertTicker />

      {/* Disciplines & Roles Bento Grid */}
      <DisciplinesGrid />

      {/* How It Works (4-Step Pipeline) */}
      <HowItWorks />

      {/* Earnings & Benefits */}
      <EarningsBenefits />

      {/* Social Proof & Testimonials */}
      <Testimonials />

      {/* Interactive FAQ Accordion */}
      <LandingFAQ />

      {/* Final Pre-Footer Call to Action Banner */}
      <section className="py-20 bg-gradient-to-b from-card/80 to-background border-t border-border/60 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-3xl">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 mx-auto mb-6 flex items-center justify-center text-accent">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-4">
            Ready to Put Your Expertise to Work?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
            Apply today, pass our domain screening, and start completing high-paying tasks on the world's premier developer and AI training platform.
          </p>
          <Button
            onClick={() => setLocation("/auth")}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl px-9 py-6 text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            Join ProTasker Geek Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
