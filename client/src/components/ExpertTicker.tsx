import React from "react";
import { Star, ShieldCheck, Sparkles } from "lucide-react";
import { EXPERTS_DATA, type ExpertProfile } from "@/data/experts";

function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

interface ExpertTickerProps {
  className?: string;
}

export function ExpertTicker({ className = "" }: ExpertTickerProps) {
  // Duplicate array once for seamless continuous loop
  const displayList = [...EXPERTS_DATA, ...EXPERTS_DATA];

  return (
    <div className={`w-full relative py-4 overflow-hidden border-y border-border/40 bg-background/60 backdrop-blur-md ${className}`}>
      {/* Background accent glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 pointer-events-none" />

      {/* Header bar above ticker */}
      <div className="container mx-auto px-4 mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-foreground tracking-wide">Live Global Expert Network</span>
          <span className="hidden sm:inline text-muted-foreground/80">• Active specialists in 50+ countries training frontier AI</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-accent text-[11px] font-semibold bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
          <Sparkles className="w-3 h-3 text-accent" />
          <span>Top 3% Vetted Geeks</span>
        </div>
      </div>

      {/* Edge gradient mask overlays for seamless fading */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

      {/* Scrolling Ticker Track */}
      <div className="group flex overflow-hidden select-none">
        <div className="flex w-max shrink-0 gap-4 sm:gap-6 animate-marquee group-hover:[animation-play-state:paused] will-change-transform">
          {displayList.map((expert, idx) => (
            <div
              key={`${expert.id}-${idx}`}
              className="flex items-center gap-3.5 bg-card/80 hover:bg-card border border-border/60 hover:border-accent/50 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm shrink-0 min-w-[280px] sm:min-w-[320px]"
            >
              {/* Avatar + Country Flag */}
              <div className="relative shrink-0">
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-accent/30 shadow-inner"
                  loading="lazy"
                />
                <span
                  className="absolute -bottom-1 -right-1 text-sm bg-background/90 rounded-full shadow-sm leading-none p-0.5 border border-border/50"
                  title={expert.country}
                >
                  {getFlagEmoji(expert.countryCode)}
                </span>
              </div>

              {/* Expert Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight">
                    {expert.name}
                  </h4>
                  <span title="Identity & Skill Verified">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  </span>
                </div>
                <p className="text-[11px] text-accent font-medium truncate">
                  {expert.role}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {expert.specialty}
                </p>
              </div>

              {/* Rating & Rate Badges */}
              <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-500/20">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{expert.rating.toFixed(2)}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {expert.hourlyRate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExpertTicker;
