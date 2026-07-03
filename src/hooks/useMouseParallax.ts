import { useEffect, useRef } from 'react';
import { useMotionValue } from 'motion/react';
import type { MotionValue } from 'motion/react';

/**
 * useMouseParallax
 *
 * Retorna { x, y } — MotionValues com valores de -1 a 1 representando
 * a posição do mouse relativa ao centro da tela.
 *
 * Usa lerp (linear interpolation) com fator 0.06 via requestAnimationFrame
 * para suavizar o movimento antes de atualizar as MotionValues.
 *
 * @param intensity — multiplicador escalar aplicado aos valores (default: 1)
 */
export function useMouseParallax(intensity = 1): { x: MotionValue<number>; y: MotionValue<number> } {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Refs para o loop de animação (evita re-renders)
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Não rodar em touch devices (sem hover)
    const mq = window.matchMedia('(hover: hover)');
    if (!mq.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normaliza para -1..1 em relação ao centro da janela
      targetRef.current.x = ((e.clientX / window.innerWidth) - 0.5) * 2 * intensity;
      targetRef.current.y = ((e.clientY / window.innerHeight) - 0.5) * 2 * intensity;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const LERP_FACTOR = 0.06;

    const loop = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP_FACTOR;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP_FACTOR;

      x.set(currentRef.current.x);
      y.set(currentRef.current.y);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  // intensity é estável na maioria dos usos; incluir na dep garante correção se mudar
  }, [intensity, x, y]);

  return { x, y };
}
