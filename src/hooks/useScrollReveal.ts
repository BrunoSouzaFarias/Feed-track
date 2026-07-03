import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

/**
 * Hook para revelar elementos conforme entram no viewport.
 * Uma vez visível, permanece visível (isVisible = true permanentemente).
 */
export function useScrollReveal({
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
}: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Se já está visível, não precisa do observer
    if (isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Desconecta após primeiro trigger — permanentemente visível
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, isVisible]);

  return { ref, isVisible };
}

// ─── Variantes de animação padrão ─────────────────────────────────────────────

/**
 * Variante fade + slide up para itens individuais.
 * Use com `motion.div variants={fadeUpVariants}`.
 */
export const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/**
 * Variante container com stagger para animar filhos sequencialmente.
 * Use com `motion.div variants={staggerContainerVariants}`.
 */
export const staggerContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
