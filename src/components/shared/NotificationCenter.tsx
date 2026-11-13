import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  Check, 
  BookOpen, 
  Target, 
  Award, 
  Volume2, 
  VolumeX,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { feedbackService } from '../../services/feedbackService';
import { userService } from '../../services/userService';
import { parseDate, parseLocalDate, formatDate } from '../../services/dateUtils';
import type { Feedback, User, SelfAssessment } from '../../types';


// Web Audio API Corporate double chime helper
const playCorporateChime = (muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // First high note (warm sine)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second note (pleasing interval A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
};

interface NotificationItem {
  id: string;
  type: 'feedback' | 'pdi' | 'assessment';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
  dateText?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [muted, setMuted] = useState(() => {
    return localStorage.getItem('feed_track_notifications_muted') === 'true';
  });
  
  // Data states
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [techProfile, setTechProfile] = useState<User | null>(null);
  const [teamTechs, setTeamTechs] = useState<User[]>([]);
  const [teamAssessments, setTeamAssessments] = useState<SelfAssessment[]>([]);
  const [hasSaCurrentPeriod, setHasSaCurrentPeriod] = useState(true);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Load notification sources
  const loadNotificationData = async () => {
    if (!user) return;
    try {
      if (user.role === 'technician') {
        // Feedbacks for technician
        const fbs = await feedbackService.getFeedbacks(user.uid);
        setFeedbacks(fbs);

        // Profile for PDI goals
        const profile = await userService.getUser(user.uid);
        setTechProfile(profile);

        // Check self assessments
        const assessments = await userService.getSelfAssessments(user.uid);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentQuarter = Math.floor(currentMonth / 3) + 1;
        const currentPeriod = `${currentYear}-Q${currentQuarter}`;
        const hasCurrentSA = assessments.some(sa => sa.period === currentPeriod);
        setHasSaCurrentPeriod(hasCurrentSA);
      } else {
        // Supervisor: load all feedbacks and all technicians
        const fbs = await feedbackService.getFeedbacks();
        setFeedbacks(fbs);
        const techs = await userService.getAllTechnicians();
        setTeamTechs(techs);
        const assessments = await userService.getSelfAssessments();
        setTeamAssessments(assessments);
      }
    } catch (e) {
      console.error("Error loading notification resources", e);
    }
  };

  useEffect(() => {
    loadNotificationData();
    // Cada ciclo faz leituras no Firestore (custo): atualiza a cada 60 s e
    // SOMENTE com a aba visível; ao voltar para a aba, atualiza na hora.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadNotificationData();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadNotificationData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Compute notifications list dynamically
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];
    if (!user) return list;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    const currentPeriod = `${currentYear}-Q${currentQuarter}`;

    if (user.role === 'technician') {
      // 1. Pending Feedbacks (needs to be read/signed)
      feedbacks
        .filter(fb => fb.status === 'pending')
        .forEach(fb => {
          list.push({
            id: `fb-pending-${fb.id}`,
            type: 'feedback',
            severity: 'urgent',
            title: 'Novo Feedback Disponível',
            description: `Você recebeu um feedback de desenvolvimento sobre "${fb.axis}".`,
            dateText: 'Pendente de assinatura',
            actionLabel: 'Assinar e Confirmar Leitura',
            onAction: async () => {
              await feedbackService.updateFeedbackStatus(fb.id, 'read', true);
              loadNotificationData();
            }
          });
        });

      // 2. PDI Deadlines
      if (techProfile && techProfile.structuredPDI) {
        techProfile.structuredPDI
          .filter(goal => goal.status !== 'completed')
          .forEach(goal => {
            const deadlineDate = parseLocalDate(goal.deadline);
            const diffTime = deadlineDate.getTime() - Date.now();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const deadlineLabel = formatDate(goal.deadline);

            let severity: 'info' | 'warning' | 'urgent' = 'info';
            let desc = `Prazo para conclusão: ${deadlineLabel}.`;

            if (diffDays < 0) {
              severity = 'urgent';
              desc = `ATRASADA por ${Math.abs(diffDays)} dias! Prazo limite era: ${deadlineLabel}.`;
            } else if (diffDays <= 7) {
              severity = 'warning';
              desc = `Vence em ${diffDays} dias! (${deadlineLabel}).`;
            }

            list.push({
              id: `pdi-goal-${goal.id}`,
              type: 'pdi',
              severity,
              title: `Meta PDI: ${goal.title}`,
              description: desc,
              actionLabel: goal.status === 'pending' ? 'Marcar Em Andamento' : 'Marcar como Concluída',
              onAction: async () => {
                const nextStatus = goal.status === 'pending' ? 'in_progress' : 'completed';
                await userService.updatePDIGoalStatus(user.uid, goal.id, nextStatus);
                loadNotificationData();
              }
            });
          });
      }

      // 3. Self Assessment Pending
      if (!hasSaCurrentPeriod) {
        list.push({
          id: 'assessment-sa-pending',
          type: 'assessment',
          severity: 'warning',
          title: 'Autoavaliação Pendente',
          description: `Você ainda não registrou sua autoavaliação para o ciclo atual (${currentPeriod}).`,
          dateText: 'Recomendado para o ciclo trimestral'
        });
      }

    } else {
      // Supervisor Alerts
      
      // 1. Pending feedbacks sent to techs but not read
      feedbacks
        .filter(fb => fb.status === 'pending')
        .forEach(fb => {
          list.push({
            id: `fb-unread-${fb.id}`,
            type: 'feedback',
            severity: 'info',
            title: 'Leitura de Feedback Pendente',
            description: `O colaborador ${fb.technicianName} ainda não assinou o feedback de "${fb.axis}".`,
            dateText: 'Aguardando ação do colaborador'
          });
        });

      // 2. Team PDI deadlines approaching/overdue
      teamTechs.forEach(tech => {
        if (tech.structuredPDI) {
          tech.structuredPDI
            .filter(goal => goal.status !== 'completed')
            .forEach(goal => {
              const deadlineDate = parseLocalDate(goal.deadline);
              const diffTime = deadlineDate.getTime() - Date.now();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays <= 5) {
                const severity = diffDays < 0 ? 'urgent' : 'warning';
                const statusStr = diffDays < 0 ? 'ATRASADA' : 'próxima do vencimento';

                list.push({
                  id: `sup-pdi-${tech.uid}-${goal.id}`,
                  type: 'pdi',
                  severity,
                  title: `Meta de ${tech.name}`,
                  description: `A meta "${goal.title}" está ${statusStr} (Prazo: ${formatDate(goal.deadline)}).`
                });
              }
            });
        }
      });

      // 3. Technicians who haven't completed self-assessments in the current cycle
      teamTechs.forEach(tech => {
        const hasSA = teamAssessments.some(sa => sa.technicianId === tech.uid && sa.period === currentPeriod);
        if (!hasSA) {
          list.push({
            id: `sa-missing-${tech.uid}`,
            type: 'assessment',
            severity: 'info',
            title: 'Autoavaliação Ausente',
            description: `${tech.name} não enviou a autoavaliação trimestral para o ciclo ${currentPeriod}.`
          });
        }
      });

      // 4. Stagnant PDI Alerts (>30 days without feedback or locked goals)
      teamTechs.forEach(tech => {
        const techFbs = feedbacks.filter(fb => fb.technicianId === tech.uid);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const hasRecentFeedback = techFbs.some(fb => parseDate(fb.createdAt) > thirtyDaysAgo);
        const hasActivePdi = tech.structuredPDI && tech.structuredPDI.some(g => g.status === 'in_progress' || g.status === 'pending');
        
        if (hasActivePdi && !hasRecentFeedback) {
          list.push({
            id: `pdi-stagnant-${tech.uid}`,
            type: 'pdi',
            severity: 'warning',
            title: `PDI Estagnado: ${tech.name}`,
            description: `${tech.name} possui metas de PDI em andamento, mas está sem receber feedbacks há mais de 30 dias.`,
            dateText: 'Ação recomendada: agendar 1:1'
          });
        }
      });
    }

    return list;
  }, [feedbacks, techProfile, teamTechs, teamAssessments, hasSaCurrentPeriod, user]);

  // Audio trigger on new notification addition
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      playCorporateChime(muted);
    }
    setLastNotificationCount(notifications.length);
  }, [notifications.length, muted]);

  const toggleMute = () => {
    const val = !muted;
    setMuted(val);
    localStorage.setItem('feed_track_notifications_muted', String(val));
  };

  const handleMarkAllRead = async () => {
    // Marks feedbacks as read ONLY — digital signature is a distinct,
    // deliberate action (see the per-item "Assinar e Confirmar Leitura"
    // button) and must never be triggered implicitly by a bulk "mark read".
    if (user?.role === 'technician') {
      const pendingFbs = feedbacks.filter(fb => fb.status === 'pending');
      for (const fb of pendingFbs) {
        await feedbackService.updateFeedbackStatus(fb.id, 'read', false);
      }
      loadNotificationData();
      playCorporateChime(muted);
    }
  };

  return (
    <>
      {/* Micro-badges & pulsing notifications icon */}
      <button 
        onClick={() => {
          setIsOpen(true);
          playCorporateChime(muted);
        }}
        className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer relative transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-liberty focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        aria-label="Central de Notificações"
      >
        <Bell className="w-4.5 h-4.5" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </button>

      {/* Slide Drawer in a Portal to escape transformed parents */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-100 bg-zinc-950/70 backdrop-blur-xs cursor-pointer"
              />

              {/* Sliding Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 z-110 w-full max-w-md bg-white dark:bg-[#151719] border-l border-zinc-200 dark:border-zinc-850 shadow-2xl flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-primary/10 text-primary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Central de Notificações
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Mute button */}
                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer"
                      aria-label={muted ? 'Ativar alertas sonoros' : 'Silenciar alertas sonoros'}
                      title={muted ? 'Ativar alertas sonoros' : 'Silenciar alertas sonoros'}
                    >
                      {muted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
                    </button>

                    {/* Close drawer */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer"
                      aria-label="Fechar central de notificações"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Sub-header actions */}
                {notifications.length > 0 && user?.role === 'technician' && (
                  <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 font-medium">
                      {notifications.length} {notifications.length === 1 ? 'pendência' : 'pendências'}
                    </span>
                    <button 
                      onClick={handleMarkAllRead}
                      className="font-bold text-[#006c49] dark:text-[#4bdfa1] hover:underline cursor-pointer"
                    >
                      Marcar todas lidas
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Sua central está limpa!</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">Nenhuma pendência ou alerta ativo para o seu perfil no momento.</p>
                      </div>
                    </div>
                  ) : (
                    notifications.map(item => {
                      // Decide icon and colors based on type
                      let Icon = BookOpen;
                      let iconBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400';
                      if (item.type === 'pdi') {
                        Icon = Target;
                        iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
                      } else if (item.type === 'assessment') {
                        Icon = Award;
                        iconBg = 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400';
                      }

                      // Severity indicators
                      let cardBorder = 'border-zinc-200 dark:border-zinc-800/80';
                      let severityLabel = null;
                      if (item.severity === 'urgent') {
                        cardBorder = 'border-l-4 border-l-rose-500 border-zinc-250 dark:border-zinc-800';
                        severityLabel = (
                          <span className="text-[8px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Urgente
                          </span>
                        );
                      } else if (item.severity === 'warning') {
                        cardBorder = 'border-l-4 border-l-amber-500 border-zinc-250 dark:border-zinc-800';
                        severityLabel = (
                          <span className="text-[8px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Atenção
                          </span>
                        );
                      }

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`p-3 bg-white dark:bg-zinc-900 border rounded-xl shadow-xs transition-all flex items-start gap-3 text-left ${cardBorder}`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.title}
                              </h4>
                              {severityLabel}
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal">
                              {item.description}
                            </p>
                            {item.dateText && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-zinc-450 dark:text-zinc-500 mt-2 font-medium">
                                <Clock className="w-3 h-3" />
                                {item.dateText}
                              </span>
                            )}

                            {item.onAction && item.actionLabel && (
                              <div className="mt-3">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (item.onAction) {
                                      await item.onAction();
                                    }
                                  }}
                                  className="w-full py-1.5 px-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-750 font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5 text-[#006c49] dark:text-[#4bdfa1]" />
                                  {item.actionLabel}
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Footer info */}
                <div className="p-3 border-t border-zinc-150 dark:border-zinc-850 text-center text-[9px] text-zinc-400 dark:text-zinc-500 bg-zinc-50/20 dark:bg-zinc-900/10">
                  Feed-Track Notifications Center • Sincronizado
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
