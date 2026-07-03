import { AnimatePresence, motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Chave que controla qual view está ativa — troca de chave dispara a animação */
  keyId: string;
}

/**
 * Componente de transição entre páginas/abas usando AnimatePresence.
 *
 * Entrada: opacity 0→1, y 16→0 (spring)
 * Saída:   opacity 1→0, y 0→-8
 */
export default function PageTransition({ children, keyId }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={keyId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 24,
        }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
