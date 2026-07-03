import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldAlert, Sparkles, CheckCircle2, Cpu } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Inicializando sistemas...');
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    // 1. Carregamento de Recursos e Fontes
    let fontsLoaded = false;
    let imagesLoaded = false;

    // Aguardar fontes
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsLoaded = true;
      }).catch(() => {
        fontsLoaded = true; // Fallback se falhar
      });
    } else {
      fontsLoaded = true;
    }

    // Pré-carregar imagens vitais
    const heroImage = new Image();
    heroImage.src = '/src/assets/hero.png';
    heroImage.onload = () => {
      imagesLoaded = true;
    };
    heroImage.onerror = () => {
      imagesLoaded = true; // Ignorar erro
    };

    // 2. Simular carregamento com etapas detalhadas e realistas
    const startTime = Date.now();
    const duration = 1200; // 1.2 segundos — responsivo sem comprometer a experiência

    const statusUpdates = [
      { threshold: 0, text: 'Estabelecendo conexão segura...' },
      { threshold: 20, text: 'Carregando fontes e componentes dinâmicos...' },
      { threshold: 45, text: 'Sincronizando base de dados de feedbacks...' },
      { threshold: 70, text: 'Estruturando planos de desenvolvimento individual (PDI)...' },
      { threshold: 90, text: 'Otimizando performance e renderização...' },
      { threshold: 100, text: 'Tudo pronto!' }
    ];

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(calculatedProgress);

      // Atualizar o texto de status com base no progresso atual
      const currentStatus = statusUpdates.reduce((acc, curr) => {
        if (calculatedProgress >= curr.threshold) {
          return curr.text;
        }
        return acc;
      }, statusUpdates[0].text);

      setStatusText(currentStatus);

      if (calculatedProgress >= 100 && fontsLoaded && imagesLoaded) {
        clearInterval(interval);
        setIsFinishing(true);
        // Pequeno atraso para o usuário ver o "Tudo pronto!" antes do split-door reveal
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Ícone correspondente ao status do carregamento
  const getStatusIcon = () => {
    if (progress < 25) return <Cpu className="h-5 w-5 animate-pulse text-primary" />;
    if (progress < 50) return <Activity className="h-5 w-5 animate-pulse text-secondary-container" />;
    if (progress < 75) return <ShieldAlert className="h-5 w-5 animate-pulse text-amber-500" />;
    if (progress < 95) return <Sparkles className="h-5 w-5 animate-spin-slow text-primary-container" />;
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  };

  return (
    <AnimatePresence>
      {!isFinishing && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden">
          {/* Split-Door Sweep Panels */}
          {/* Porta Esquerda */}
          <motion.div
            initial={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
            className="absolute top-0 left-0 bottom-0 w-1/2 bg-zinc-950 border-r border-zinc-800/20 shadow-2xl flex items-center justify-end"
          />
          {/* Porta Direita */}
          <motion.div
            initial={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
            className="absolute top-0 right-0 bottom-0 w-1/2 bg-zinc-950 border-l border-zinc-800/20 shadow-2xl flex items-center justify-start"
          />

          {/* Conteúdo Central */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center"
          >
            {/* Logo feed-track */}
            <div className="mb-8 flex flex-col items-center">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20 mb-4"
              >
                <Activity className="h-8 w-8 text-white" />
              </motion.div>
              <motion.h1
                initial={{ letterSpacing: '0.1em', opacity: 0 }}
                animate={{ letterSpacing: '0.3em', opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl font-extrabold text-white tracking-widest uppercase font-sans"
              >
                Feed<span className="text-primary">-Track</span>
              </motion.h1>
              <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Plataforma de Desenvolvimento Contínuo</p>
            </div>

            {/* Container do progresso */}
            <div className="w-full bg-zinc-900/60 backdrop-blur-md rounded-2xl p-6 border border-zinc-800/50 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-xs font-semibold tracking-wider uppercase flex items-center gap-2">
                  {getStatusIcon()}
                  {statusText}
                </span>
                <span className="text-primary font-mono text-sm font-bold">{Math.round(progress)}%</span>
              </div>

              {/* Barra de Progresso Tridimensional */}
              <div className="h-2 w-full bg-zinc-850 rounded-full overflow-hidden p-[1px] border border-zinc-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-primary-container to-emerald-400 rounded-full shadow-[0_0_12px_rgba(75,223,161,0.5)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Rodapé técnico sutil + botão pular */}
            <div className="absolute bottom-[-100px] left-0 right-0 flex items-center justify-between px-4 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
              <span>v1.0.0 // Execução Segura e Otimizada</span>
              <button
                onClick={onComplete}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-mono uppercase tracking-widest cursor-pointer bg-transparent border-none"
              >
                Pular →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
