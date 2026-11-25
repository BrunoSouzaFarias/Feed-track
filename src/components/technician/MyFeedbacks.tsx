import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock, CheckCircle2, ShieldAlert, FileDown, AlertTriangle } from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import type { Feedback } from '../../types';
import { feedbackService } from '../../services/feedbackService';
import { userService } from '../../services/userService';
import { exportService } from '../../services/exportService';
import { parseDate } from '../../services/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { friendlyError } from '../../services/errors';

interface MyFeedbacksProps {
  feedbacks: Feedback[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export default function MyFeedbacks({ feedbacks, loading = false, error = null, onRefresh }: MyFeedbacksProps) {
  const { user } = useAuth();
  const [signingId, setSigningId] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  const handleOpenAndRead = async (fb: Feedback) => {
    if (fb.status === 'pending') {
      try {
        await feedbackService.updateFeedbackStatus(fb.id, 'read', false);
        onRefresh();
        toast.success('Feedback marcado como lido!');
      } catch (err) {
        toast.error(friendlyError(err, 'Erro ao marcar feedback como lido.'));
      }
    }
  };

  const handleSignFeedback = async (fb: Feedback, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open card click handler
    if (signingId) return; // guard against double-submit while a signature is in flight
    const confirmed = window.confirm(
      'Assinar digitalmente é uma ação permanente e não pode ser desfeita. Deseja continuar?'
    );
    if (!confirmed) return;

    setSigningId(fb.id);
    try {
      await feedbackService.updateFeedbackStatus(fb.id, 'read', true);
      toast.success('Feedback assinado digitalmente com sucesso!');
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao assinar feedback.'));
    } finally {
      setSigningId(null);
    }
  };

  const handleDownloadPDF = async (fb: Feedback, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const supervisor = await userService.getUser(fb.supervisorId);
    exportService.exportToPDF([fb], supervisor?.name || 'Supervisor', user.name);
  };

  return (
    <div className="text-left">
      <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mb-6 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-liberty" /> Meus Feedbacks
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-xs font-bold bg-liberty text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : feedbacks.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {feedbacks.map((fb) => {
            const isPositive = fb.type === 'positive';
            const isRead = fb.status === 'read';
            const isSigned = !!fb.signedAt;
            const date = parseDate(fb.createdAt);
            
            // Layout card styles
            // - Positive: green border/accent #2ECC71
            // - Development: blue border/accent #004B8D
            const accentBorder = isPositive ? 'border-l-[6px] border-l-[#2ECC71]' : 'border-l-[6px] border-l-[#004B8D]';
            const bgCard = 'bg-white dark:bg-zinc-900';

            return (
              <motion.div
                key={fb.id}
                variants={itemVariants}
                onClick={() => handleOpenAndRead(fb)}
                className={`rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md hover:-translate-y-0.5 transition-transform duration-200 overflow-hidden cursor-pointer ${accentBorder} ${bgCard} p-5 flex flex-col justify-between gap-4`}
              >
                <div>
                  {/* Card top banner */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      isPositive 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                    }`}>
                      {isPositive ? '🟢 Feedback Positivo' : '🔵 Desenvolvimento'}
                    </span>
                    
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {date.toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Axis */}
                  <h3 className="font-bold text-md text-zinc-900 dark:text-zinc-100 mb-2">
                    Eixo: {fb.axis}
                  </h3>

                  {/* Body description */}
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {fb.description}
                  </p>
                </div>

                {/* Status indicator / signature row */}
                <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isSigned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Assinado Digitalmente
                      </span>
                    ) : isRead ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <CheckCircle2 className="w-4 h-4" /> Lido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="w-4 h-4" /> Não lido (Clique para ler)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action button sign */}
                    {!isSigned && (
                      <button
                        onClick={(e) => handleSignFeedback(fb, e)}
                        disabled={signingId === fb.id}
                        className="px-3 py-1.5 bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {signingId === fb.id ? 'Assinando...' : 'Assinar'}
                      </button>
                    )}
                    {/* Download individual report */}
                    <button
                      onClick={(e) => handleDownloadPDF(fb, e)}
                      className="p-1.5 text-zinc-450 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Salvar PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nenhum feedback recebido ainda"
          description="Quando seu supervisor registrar um feedback, ele aparecerá aqui para você acompanhar sua evolução."
        />
      )}
    </div>
  );
}
