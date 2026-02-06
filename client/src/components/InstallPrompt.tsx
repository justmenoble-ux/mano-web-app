import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4" data-testid="install-prompt">
      <div className="bg-[#1e293b]/95 backdrop-blur-lg border border-white/10 rounded-lg p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Download className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm">Install MaNo</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add to your home screen for quick access
            </p>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-white transition-colors"
            data-testid="button-dismiss-install"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleDismiss}
            data-testid="button-not-now"
          >
            Not now
          </Button>
          <Button 
            size="sm" 
            className="flex-1 gap-2"
            onClick={handleInstall}
            data-testid="button-install-app"
          >
            <Download className="w-3 h-3" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
