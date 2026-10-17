import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Sparkles, Menu, X, ArrowRight, ShieldCheck, Sun, Moon } from "lucide-react";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border/50 shadow-sm py-3"
          : "bg-transparent py-4 sm:py-5"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setLocation("/")}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            P
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground flex items-center gap-1">
              ProTasker<span className="text-accent">.Geek</span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold -mt-1 hidden sm:block">
              Human-in-the-Loop AI
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-foreground/80">
          <button
            onClick={() => scrollToSection("disciplines")}
            className="hover:text-accent transition-colors"
          >
            Disciplines
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="hover:text-accent transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection("earnings")}
            className="hover:text-accent transition-colors"
          >
            Earnings & Benefits
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="hover:text-accent transition-colors"
          >
            Community
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="hover:text-accent transition-colors"
          >
            FAQ
          </button>
        </nav>

        {/* Desktop Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </Button>
          {user ? (
            <Button
              onClick={() => setLocation("/home")}
              className="bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl px-5 shadow-sm"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setLocation("/auth")}
                variant="ghost"
                className="font-medium hover:text-accent hover:bg-accent/10 rounded-xl px-4"
              >
                Log In
              </Button>
              <Button
                onClick={() => setLocation("/auth")}
                className="bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl px-5 shadow-md hover:shadow-lg transition-all"
              >
                Apply as a Geek
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground hover:text-accent rounded-lg"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-4">
          <button
            onClick={() => scrollToSection("disciplines")}
            className="text-left py-2 font-medium text-foreground hover:text-accent"
          >
            Disciplines & Roles
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="text-left py-2 font-medium text-foreground hover:text-accent"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection("earnings")}
            className="text-left py-2 font-medium text-foreground hover:text-accent"
          >
            Earnings & Benefits
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="text-left py-2 font-medium text-foreground hover:text-accent"
          >
            Community
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="text-left py-2 font-medium text-foreground hover:text-accent"
          >
            FAQ
          </button>
          <div className="pt-4 border-t border-border/60 flex flex-col gap-2.5">
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="w-full justify-between rounded-xl text-xs font-semibold"
            >
              <span>{theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}</span>
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </Button>
            {user ? (
              <Button
                onClick={() => setLocation("/home")}
                className="w-full bg-accent text-white rounded-xl"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setLocation("/auth")}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => setLocation("/auth")}
                  className="w-full bg-accent text-white rounded-xl"
                >
                  Apply as a Geek
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
