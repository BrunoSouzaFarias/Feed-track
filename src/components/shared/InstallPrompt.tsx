import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (deferredPrompt && !isDismissed) {
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 30000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [deferredPrompt, isDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {isVisible && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-3rem)] max-w-sm"
        >
          <div className="backdrop-blur-md bg-zinc-900/80 border border-white/10 rounded-2xl px-5 py-4 shadow-2xl shadow-black/40 flex items-center gap-4">
            {/* App Icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[#006c49]/30 border border-[#4bdfa1]/20 flex items-center justify-center text-2xl select-none">
              📊
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                Instalar FEED-TRACK
              </p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                Acesso rápido como app nativo
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
                style={{ background: '#0bbb81' }}
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95"
              >
                Agora não
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
