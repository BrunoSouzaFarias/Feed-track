import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Briefcase, 
  Award, 
  Target, 
  MessageSquare, 
  ThumbsUp, 
  ArrowUpDown, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Star, 
  Sparkles,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import type { User, Feedback } from '../../types';
import { parseDate, parseLocalDate } from '../../services/dateUtils';
import { userService } from '../../services/userService';

interface CareerTimelineProps {
  userProfile: User;
  feedbacks: Feedback[];
}

type TimelineEventType = 'hiring' | 'feedback_signed' | 'pdi_goal' | 'badge_unlocked';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  subtitle?: string;
  description: string;
  meta?: any; // Extra data for custom rendering
}

export default function CareerTimeline({ userProfile, feedbacks }: CareerTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'feedbacks' | 'pdi' | 'badges'>('all');
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [supervisorNames, setSupervisorNames] = useState<Record<string, string>>({});
  const fetchedSupervisorIds = useRef(new Set<string>());

  // Resolve each distinct supervisorId to its real name (instead of a
  // hardcoded uid comparison that only matched a non-existent demo id).
  useEffect(() => {
    const uniqueIds = Array.from(new Set(feedbacks.map(f => f.supervisorId).filter(Boolean)));
    const missing = uniqueIds.filter(id => !fetchedSupervisorIds.current.has(id));
    if (missing.length === 0) return;
    missing.forEach(id => fetchedSupervisorIds.current.add(id));

    let cancelled = false;
    Promise.all(missing.map(id => userService.getUser(id).then(u => [id, u?.name] as const)))
      .then(pairs => {
        if (cancelled) return;
        setSupervisorNames(prev => {
          const next = { ...prev };
          pairs.forEach(([id, name]) => { if (name) next[id] = name; });
          return next;
        });
      });
    return () => { cancelled = true; };
  }, [feedbacks]);

  // Compile all user milestones into a structured chronological timeline
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // 1. Hiring Milestone
    if (userProfile.createdAt) {
      events.push({
        id: 'hiring',
        type: 'hiring',
        date: parseDate(userProfile.createdAt),
        title: 'Boas-vindas à Equipe!',
        subtitle: `Cargo: ${userProfile.position || 'Técnico'}`,
        description: `Início oficial da jornada de desenvolvimento profissional da(o) ${userProfile.name} na equipe de ${userProfile.team === 'back-office' ? 'Back-office' : 'Televendas/Telesserviço'}.`,
        meta: {
          team: userProfile.team,
          position: userProfile.position
        }
      });
    }

    // 2. Feedbacks Milestones (focusing on signed or read feedbacks)
    feedbacks.forEach(f => {
      // We can list when the feedback was signed, or fallback to when it was created
      const eventDate = f.signedAt ? parseDate(f.signedAt) : parseDate(f.createdAt);
      const isSigned = !!f.signedAt || f.status === 'read';
      
      events.push({
        id: `feedback-${f.id}`,
        type: 'feedback_signed',
        date: eventDate,
        title: f.type === 'positive' ? `Feedback Positivo: ${f.axis}` : `Feedback de Desenvolvimento: ${f.axis}`,
        subtitle: `Supervisor: ${supervisorNames[f.supervisorId] || 'Supervisor de Equipe'}`,
        description: f.description,
        meta: {
          axis: f.axis,
          feedbackType: f.type,
          isSigned,
          signedDate: f.signedAt ? parseDate(f.signedAt) : null
        }
      });
    });

    // 3. PDI Goals
    if (userProfile.structuredPDI) {
      userProfile.structuredPDI.forEach(g => {
        // Created milestone
        events.push({
          id: `pdi-created-${g.id}`,
          type: 'pdi_goal',
          date: parseDate(g.createdAt),
          title: `Meta de PDI Definida: ${g.title}`,
          subtitle: `Prazo acordado: ${g.deadline}`,
          description: g.description,
          meta: {
            goalStatus: g.status,
            goalId: g.id,
            stage: 'created'
          }
        });

        // Completed milestone
        if (g.status === 'completed') {
          // Use the real completion timestamp when available (set by
          // userService.updatePDIGoalStatus). Goals completed before that
          // field existed have no ground truth — fall back to the agreed
          // deadline instead of fabricating an arbitrary offset date.
          const complDate = g.completedAt ? parseDate(g.completedAt) : parseLocalDate(g.deadline);
          events.push({
            id: `pdi-completed-${g.id}`,
            type: 'pdi_goal',
            date: complDate,
            title: `Objetivo Concluído! 🎉`,
            subtitle: g.title,
            description: `A meta "${g.title}" foi totalmente concluída e validada pelo supervisor. Parabéns pelo foco no desenvolvimento!`,
            meta: {
              goalStatus: 'completed',
              goalId: g.id,
              stage: 'completed'
            }
          });
        }
      });
    }

    // 4. Badges/Trophies
    if (userProfile.badges) {
      userProfile.badges.forEach(b => {
        events.push({
          id: `badge-${b.id}`,
          type: 'badge_unlocked',
          date: parseDate(b.earnedAt),
          title: `Conquista Desbloqueada: ${b.title}`,
          subtitle: b.description,
          description: `Você recebeu o badge digital correspondente ao cumprimento do marco: "${b.description}".`,
          meta: {
            badgeId: b.id,
            iconName: b.icon
          }
        });
      });
    }

    // Filter events based on active tab
    const filteredEvents = events.filter(e => {
      if (filter === 'all') return true;
      if (filter === 'feedbacks') return e.type === 'feedback_signed';
      if (filter === 'pdi') return e.type === 'pdi_goal';
      if (filter === 'badges') return e.type === 'badge_unlocked';
      return true;
    });

    // Sort chronologically
    return filteredEvents.sort((a, b) => {
      const timeA = a.date.getTime();
      const timeB = b.date.getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [userProfile, feedbacks, filter, sortOrder, supervisorNames]);

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'hiring':
        return <Briefcase className="w-5 h-5 text-white" />;
      case 'feedback_signed':
        return event.meta?.feedbackType === 'positive' 
          ? <ThumbsUp className="w-5 h-5 text-white" />
          : <MessageSquare className="w-5 h-5 text-white" />;
      case 'pdi_goal':
        return event.meta?.stage === 'completed' 
          ? <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
          : <Target className="w-5 h-5 text-white" />;
      case 'badge_unlocked':
        return <Award className="w-5 h-5 text-white" />;
      default:
        return <Star className="w-5 h-5 text-white" />;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'hiring':
        return 'bg-zinc-800 dark:bg-zinc-700 shadow-zinc-200 dark:shadow-zinc-900';
      case 'feedback_signed':
        return event.meta?.feedbackType === 'positive'
          ? 'bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-950/20'
          : 'bg-amber-500 shadow-amber-200 dark:shadow-amber-950/20';
      case 'pdi_goal':
        return event.meta?.stage === 'completed'
          ? 'bg-liberty shadow-liberty/30'
          : 'bg-indigo-500 shadow-indigo-200 dark:shadow-indigo-950/20';
      case 'badge_unlocked':
        return 'bg-amber-500 shadow-amber-200 dark:shadow-amber-950/20';
      default:
        return 'bg-zinc-500 shadow-zinc-200 dark:shadow-zinc-900';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Stagger variants for cascade animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 90, damping: 14 }
    }
  };

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-6 shadow-sm text-left">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-liberty/10 text-liberty dark:text-liberty-sky">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Jornada de Carreira</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Marcos históricos, feedbacks assinados e conquistas alcançadas</p>
          </div>
        </div>

        {/* Layout & sorting control bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sorting button */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
            title={sortOrder === 'desc' ? 'Mais recentes no topo' : 'Mais antigos no topo'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Recentes primeiro' : 'Antigos primeiro'}</span>
          </button>

          {/* Layout buttons */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setLayout('vertical')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                layout === 'vertical'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Vertical
            </button>
            <button
              onClick={() => setLayout('horizontal')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                layout === 'horizontal'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Horizontal
            </button>
          </div>
        </div>
      </div>

      {/* Filter tab bar */}
      <div className="flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6 overflow-x-auto select-none">
        <SlidersHorizontal className="w-4 h-4 text-zinc-400 mr-1 shrink-0" />
        {[
          { id: 'all', label: 'Tudo', icon: Star },
          { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
          { id: 'pdi', label: 'Metas PDI', icon: Target },
          { id: 'badges', label: 'Conquistas', icon: Award }
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id as any);
                setExpandedNodeId(null); // Reset detail expansion when filtering
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                isActive
                  ? 'bg-liberty/10 dark:bg-liberty/20 border-liberty/20 text-liberty dark:text-liberty-sky'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-650 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline display rendering */}
      {timelineEvents.length === 0 ? (
        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
          Nenhum evento registrado nesta categoria.
        </div>
      ) : layout === 'vertical' ? (
        /* ================= VERTICAL TIMELINE ================= */
        <div className="relative pl-6 md:pl-8 border-l-2 border-zinc-200 dark:border-zinc-800 ml-3.5 py-2 space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {timelineEvents.map((event) => {
              const isExpanded = expandedNodeId === event.id;
              
              return (
                <motion.div
                  key={event.id}
                  variants={itemVariants}
                  className="relative group text-left"
                >
                  {/* Event bullet/node marker */}
                  <div className="absolute -left-[39px] md:-left-[47px] top-1 flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setExpandedNodeId(isExpanded ? null : event.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform duration-200 ${getEventColor(event)}`}
                    >
                      {getEventIcon(event)}
                    </motion.div>
                  </div>

                  {/* Main Event Card */}
                  <div 
                    onClick={() => setExpandedNodeId(isExpanded ? null : event.id)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none ${
                      isExpanded 
                        ? 'bg-zinc-50 dark:bg-zinc-850/60 border-zinc-300 dark:border-zinc-700 shadow-sm' 
                        : 'bg-white/40 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-850/60 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(event.date)}
                        </span>
                        {/* Event type Pill Badge */}
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          event.type === 'hiring' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
                          event.type === 'feedback_signed' ? (event.meta?.feedbackType === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') :
                          event.type === 'pdi_goal' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {event.type === 'hiring' ? 'Contratação' :
                           event.type === 'feedback_signed' ? 'Feedback' :
                           event.type === 'pdi_goal' ? 'Meta PDI' : 'Conquista'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-850 dark:text-zinc-150 flex items-center gap-2">
                      {event.title}
                      {event.type === 'badge_unlocked' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    </h3>
                    
                    {event.subtitle && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
                        {event.subtitle}
                      </p>
                    )}

                    {/* Expandable Details Container */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed text-left"
                        >
                          <div className="bg-zinc-50/55 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-155/30 dark:border-zinc-850 space-y-2">
                            <p>{event.description}</p>
                            
                            {/* Extra attributes based on type */}
                            {event.type === 'feedback_signed' && (
                              <div className="flex flex-wrap gap-4 text-[10px] text-zinc-500 mt-2 font-medium">
                                <span>Eixo: <strong className="text-zinc-700 dark:text-zinc-300">{event.meta?.axis}</strong></span>
                                <span>Status: <strong className={event.meta?.isSigned ? 'text-emerald-500' : 'text-amber-500'}>
                                  {event.meta?.isSigned ? 'Assinado / Lido' : 'Pendente de Leitura'}
                                </strong></span>
                              </div>
                            )}

                            {event.type === 'pdi_goal' && (
                              <div className="flex flex-wrap gap-4 text-[10px] text-zinc-500 mt-2 font-medium">
                                <span>Status Final: <strong className="text-zinc-700 dark:text-zinc-350">{event.meta?.goalStatus === 'completed' ? 'Concluído' : 'Em Andamento'}</strong></span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Toggle expand helper row */}
                    <div className="flex justify-end mt-2">
                      <span className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center gap-0.5">
                        {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ) : (
        /* ================= HORIZONTAL JOURNEY SCROLL ================= */
        <div className="relative py-4 select-none">
          <div className="overflow-x-auto pb-6 pt-2 flex gap-6 snap-x scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scroll-smooth">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex gap-6"
            >
              {timelineEvents.map((event, index) => {
                const isExpanded = expandedNodeId === event.id;
                
                return (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    className="w-72 shrink-0 snap-center flex flex-col justify-start relative text-left"
                  >
                    {/* Horizontal Connector Line */}
                    {index < timelineEvents.length - 1 && (
                      <div className="absolute top-5 left-[calc(50%+18px)] right-[-12px] h-0.5 bg-zinc-200 dark:bg-zinc-850 z-0" />
                    )}

                    {/* Top bullet/node marker centered */}
                    <div className="flex justify-center mb-4 relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setExpandedNodeId(isExpanded ? null : event.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform duration-200 ${getEventColor(event)}`}
                      >
                        {getEventIcon(event)}
                      </motion.div>
                    </div>

                    {/* Card container */}
                    <div 
                      onClick={() => setExpandedNodeId(isExpanded ? null : event.id)}
                      className={`p-4 rounded-xl border flex-1 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                        isExpanded 
                          ? 'bg-zinc-50 dark:bg-zinc-850/60 border-zinc-300 dark:border-zinc-700 shadow-sm' 
                          : 'bg-white/40 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-850/60 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(event.date)}
                          </span>
                          
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                            event.type === 'hiring' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
                            event.type === 'feedback_signed' ? (event.meta?.feedbackType === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') :
                            event.type === 'pdi_goal' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {event.type === 'hiring' ? 'Início' :
                             event.type === 'feedback_signed' ? 'Feedback' :
                             event.type === 'pdi_goal' ? 'Meta' : 'Conquista'}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-150 line-clamp-1">
                          {event.title}
                        </h3>
                        
                        {event.subtitle && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 line-clamp-1">
                            {event.subtitle}
                          </p>
                        )}

                        <p className={`text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 ${isExpanded ? 'line-clamp-none' : 'line-clamp-2'}`}>
                          {event.description}
                        </p>
                      </div>

                      {/* Expand detail helper bottom text */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                          {isExpanded ? 'Toque para encolher' : 'Toque para expandir'}
                        </span>
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
