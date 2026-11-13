import { motion, AnimatePresence } from 'motion/react';
import type { User } from '../../types';
import { useModalA11y } from '../../hooks/useModalA11y';
import { isFirebaseMock } from '../../services/env';

interface SettingsModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

/** Apaga APENAS os dados de demonstração (chaves feed_track_*), nunca o localStorage inteiro. */
function resetMockData() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('feed_track_') && k !== 'feed_track_theme')
    .forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
  window.location.reload();
}

export default function SettingsModal({ open, user, onClose }: SettingsModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose, open);
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="will-change-transform-opacity relative w-full max-w-md bg-white dark:bg-[#1e2023]/95 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-6 text-left z-50"
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
            >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800 mb-4">
              <h3 id="settings-modal-title" className="text-sm font-bold text-zinc-900 dark:text-white">
                Configurações da Conta
              </h3>
              <button 
                onClick={() => onClose()}
                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer text-xs"
                aria-label="Fechar configurações"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">Supervisor</p>
                <p className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded font-bold text-zinc-800 dark:text-zinc-200">
                  {user?.name}
                </p>
              </div>

              <div>
                <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">E-mail de Acesso</p>
                <p className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded font-bold text-zinc-800 dark:text-zinc-200">
                  {user?.email}
                </p>
              </div>

              <div>
                <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">Cargo / Função</p>
                <p className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                  {user?.position} ({user?.team})
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800">
                <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">Banco de Dados</p>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-[#4bdfa1] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isFirebaseMock ? 'Modo simulado (dados locais deste navegador)' : 'Conectado ao Firebase'}
                </div>
              </div>

              <div className="pt-4 flex justify-between gap-3 border-t border-zinc-150 dark:border-zinc-800">
                {isFirebaseMock ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja restaurar os dados de demonstração? Todos os dados locais do FEED-TRACK serão apagados.')) resetMockData();
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded transition-colors text-[10px] font-bold cursor-pointer"
                  >
                    Restaurar dados de demonstração
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="px-4 py-2 bg-[#006c49] hover:bg-[#005236] text-white rounded font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
