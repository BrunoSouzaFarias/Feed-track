import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Loader2, ImageOff } from 'lucide-react';
import { homeOfficeService } from '../../services/homeOfficeService';
import { useDataEffect } from '../../hooks/useDataEffect';
import { useModalA11y } from '../../hooks/useModalA11y';

interface EvidenceLightboxProps {
  pointId: string;
  onClose: () => void;
}

/** Print em tela cheia (carrega o documento de evidência só quando aberto). */
export default function EvidenceLightbox({ pointId, onClose }: EvidenceLightboxProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const [state, setState] = useState<{ pointId: string; src: string | null; failed: boolean } | null>(null);

  useDataEffect(
    () => homeOfficeService.getEvidence(pointId),
    (src) => setState({ pointId, src, failed: false }),
    () => setState({ pointId, src: null, failed: true }),
    [pointId]
  );
  const ready = state?.pointId === pointId;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Print da ocorrência"
        className="relative max-h-[92vh] max-w-5xl" onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button" onClick={onClose} aria-label="Fechar"
          className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-zinc-800 shadow-lg transition hover:scale-105 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        {!ready ? (
          <div className="flex h-48 w-72 items-center justify-center rounded-2xl bg-zinc-900"><Loader2 className="h-7 w-7 animate-spin text-white" /></div>
        ) : state.src ? (
          <img src={state.src} alt="Print da ocorrência" className="max-h-[92vh] rounded-2xl object-contain shadow-2xl" />
        ) : (
          <div className="flex h-48 w-72 flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-zinc-300">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs font-semibold">{state.failed ? 'Não foi possível carregar o print.' : 'Print não encontrado.'}</span>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}
