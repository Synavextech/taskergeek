import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share2, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setShowInstallBanner(false);
      return;
    }

    // Check if dismissed in last 24 hours
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < twentyFourHours) {
        setShowInstallBanner(false);
        return;
      }
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    if (isIos) {
      setIsIosDevice(true);
      setShowInstallBanner(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } catch (error) {
      console.warn('[PWA] User installation error:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-card/95 backdrop-blur-xl p-4 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent ring-1 ring-accent/30">
              <Smartphone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                Install ProTasker.Geek
              </h3>
              <p className="text-[11px] text-muted-foreground">Faster loading & native app experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isIosDevice && !deferredPrompt ? (
          <div className="mb-3 p-2.5 rounded-xl bg-muted/60 border border-border/40 text-[12px] text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              Install on iOS Safari:
            </p>
            <p className="flex items-center gap-1.5">
              1. Tap the Share button <Share2 className="w-3.5 h-3.5 text-accent inline" />
            </p>
            <p className="flex items-center gap-1.5">
              2. Select <PlusSquare className="w-3.5 h-3.5 text-accent inline" /> <strong>Add to Home Screen</strong>
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Install our high-speed desktop/mobile app for instant order notifications and offline access.
          </p>
        )}

        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-xs shadow-md shadow-accent/20 h-9"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Install App
            </Button>
          )}
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60 text-xs h-9 font-medium"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
