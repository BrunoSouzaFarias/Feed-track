import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquarePlus, User as UserIcon } from 'lucide-react';
import type { Feedback, User } from '../../types';
import { parseDate, daysSince } from '../../services/dateUtils';
import { useScrollReveal, fadeUpVariants, staggerContainerVariants } from '../../hooks/useScrollReveal';
import Avatar from '../shared/Avatar';
import Tilt3D from '../shared/Tilt3D';
import { Skeleton, SkeletonStatCard } from '../shared/Skeleton';
import type { SupervisorTab } from './SupervisorSidebar';

interface DashboardOverviewProps {
  user: User | null;
  technicians: User[];
  feedbacks: Feedback[];
  isLoading: boolean;
  searchTerm: string;
  onTabChange: (tab: SupervisorTab) => void;
  onNewFeedbackFor: (technicianId: string) => void;
}

export default function DashboardOverview({
  user, technicians, feedbacks, isLoading, searchTerm, onTabChange, onNewFeedbackFor,
}: DashboardOverviewProps) {
  const { ref: statsRef } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  const [dashboardPeriod, setDashboardPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Summary Metrics calculations
  const stats = useMemo(() => {
    const totalTechs = technicians.length;
    
    // Feedbacks in selected period
    const now = new Date();
    const cutoff = new Date();
    if (dashboardPeriod === 'month') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dashboardPeriod === 'quarter') {
      cutoff.setDate(now.getDate() - 90);
    } else if (dashboardPeriod === 'year') {
      cutoff.setDate(now.getDate() - 365);
    }

    const sentThisPeriod = feedbacks.filter(fb => {
      const date = parseDate(fb.createdAt);
      return date >= cutoff;
    }).length;

    // Active PDIs (number of technicians with at least one goal in progress or pending)
    const activePDIs = technicians.filter(t => 
      t.structuredPDI && t.structuredPDI.some(goal => goal.status === 'in_progress' || goal.status === 'pending')
    ).length;

    // Pending read feedbacks
    const pendingRead = feedbacks.filter(fb => fb.status === 'pending').length;

    return { totalTechs, sentThisPeriod, activePDIs, pendingRead };
  }, [technicians, feedbacks, dashboardPeriod]);

  // Helper to determine status for compact table
  const getTechStatus = (tech: User) => {
    const techFbs = feedbacks.filter(f => f.technicianId === tech.uid);
    const hasPending = techFbs.some(f => f.status === 'pending');
    if (hasPending) return { label: 'Leitura Pendente', color: 'bg-rose-500', text: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' };
    
    const hasGoals = tech.structuredPDI && tech.structuredPDI.length > 0;
    if (!hasGoals) return { label: 'Aguardando PDI', color: 'bg-zinc-400', text: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' };
    
    return { label: 'Em dia', color: 'bg-[#0bbb81]', text: 'text-[#006c49] bg-emerald-50 dark:bg-emerald-950/20' };
  };

  // Filter tech list by search
  const filteredTechsForSearch = useMemo(() => {
    if (!searchTerm) return technicians;
    return technicians.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [technicians, searchTerm]);

  // Compute Dica Executiva dynamically
  const execTip = useMemo(() => {
    if (technicians.length === 0) return null;
    // Find technician with oldest feedback or no feedback
    let targetTech = technicians[0];
    let maxDays = -1;

    technicians.forEach(t => {
      const techFbs = feedbacks.filter(f => f.technicianId === t.uid);
      if (techFbs.length === 0) {
        maxDays = 999;
        targetTech = t;
        return;
      }
      
      const newestFbDate = techFbs.reduce((newest, current) => {
        const date = parseDate(current.createdAt);
        return date > newest ? date : newest;
      }, new Date(0));

      const diffDays = daysSince(newestFbDate);
      if (diffDays > maxDays) {
        maxDays = diffDays;
        targetTech = t;
      }
    });

    if (maxDays === 999) {
      return `${targetTech.name} não possui nenhum feedback registrado. Considere agendar uma conversa 1:1 inicial.`;
    }
    if (maxDays > 15) {
      return `${targetTech.name} não recebe um feedback há mais de ${maxDays} dias. Considere agendar uma conversa 1:1.`;
    }
  }, [technicians, feedbacks]);

  // Find stagnant technicians (>30 days without feedback and active PDI)
  const stagnantTechs = useMemo(() => {
    const list: User[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    technicians.forEach(tech => {
      const techFbs = feedbacks.filter(fb => fb.technicianId === tech.uid);
      const hasRecentFeedback = techFbs.some(fb => parseDate(fb.createdAt) > thirtyDaysAgo);
      const hasActivePdi = tech.structuredPDI && tech.structuredPDI.some(g => g.status === 'in_progress' || g.status === 'pending');
      if (hasActivePdi && !hasRecentFeedback) {
        list.push(tech);
      }
    });
    return list;
  }, [technicians, feedbacks]);


  return (
            <div className="space-y-6">
              {/* Welcome row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white dashboard-title">
                    Olá, {user?.name}!
                  </h1>
                  <p className="text-xs text-zinc-500 mt-1">
                    Bem-vindo ao centro de comando de performance da sua equipe.
                  </p>
                </div>
                
                {/* Period Selector */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 self-start sm:self-center shadow-xs">
                  {(['month', 'quarter', 'year'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setDashboardPeriod(p)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        dashboardPeriod === p
                          ? 'bg-white dark:bg-zinc-700 text-[#006c49] dark:text-[#4bdfa1] shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {p === 'month' ? 'Este Mês' : p === 'quarter' ? 'Último Trimestre' : 'Ano Atual'}
                    </button>
                  ))}
                </div>
              </div>

              {stagnantTechs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 text-left"
                >
                  <span className="text-base">⚠️</span>
                  <div>
                    <h4 className="font-bold">Alerta de Estagnação de PDI</h4>
                    <p className="mt-1 opacity-90">
                      Os seguintes colaboradores possuem metas de PDI ativas mas estão há mais de 30 dias sem receber feedbacks: <strong>{stagnantTechs.map(t => t.name).join(', ')}</strong>. Recomenda-se agendar conversas 1:1.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Stats Grid — Scroll-Driven Narrative */}
              {isLoading ? (
                <SkeletonStatCard className="mb-6" />
              ) : (
                <motion.div
                  ref={statsRef}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ willChange: 'transform, opacity' }}
                >
                {/* Total Techs */}
                <Tilt3D maxRotation={8} scaleOnHover={1.03}>
                  <motion.div 
                    variants={fadeUpVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white/60 dark:bg-[#1e2023]/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-4 relative shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] border-l-4 border-l-[#006c49] transition-all duration-300 h-full text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">Colaboradores Totais</span>
                      <span className="text-[9px] text-[#006c49] dark:text-[#4bdfa1] bg-emerald-50 dark:bg-emerald-950/20 font-bold px-1.5 py-0.5 rounded">
                        +0%
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white font-sans">{stats.totalTechs}</p>
                  </motion.div>
                </Tilt3D>

                {/* Sent feedbacks */}
                <Tilt3D maxRotation={8} scaleOnHover={1.03}>
                  <motion.div 
                    variants={fadeUpVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white/60 dark:bg-[#1e2023]/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-4 relative shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 h-full text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">Feedbacks Enviados</span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 font-bold px-1.5 py-0.5 rounded">
                        {dashboardPeriod === 'month' ? 'Este Mês' : dashboardPeriod === 'quarter' ? 'Trimestre' : 'Ano Atual'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white font-sans">{stats.sentThisPeriod}</p>
                  </motion.div>
                </Tilt3D>

                {/* Active PDIs */}
                <Tilt3D maxRotation={8} scaleOnHover={1.03}>
                  <motion.div 
                    variants={fadeUpVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white/60 dark:bg-[#1e2023]/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-4 relative shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] border-l-4 border-l-[#006c49] transition-all duration-300 h-full text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">PDIs em Curso</span>
                      <span className="text-[9px] text-[#006c49] dark:text-[#4bdfa1] bg-emerald-50 dark:bg-emerald-950/20 font-bold px-1.5 py-0.5 rounded">
                        Ativos
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white font-sans">{stats.activePDIs}</p>
                  </motion.div>
                </Tilt3D>

                {/* Pending feedbacks */}
                <Tilt3D maxRotation={8} scaleOnHover={1.03}>
                  <motion.div 
                    variants={fadeUpVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white/60 dark:bg-[#1e2023]/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-4 relative shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 h-full text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">Leituras Pendentes</span>
                      <span className="text-[9px] text-rose-600 bg-rose-50 dark:bg-rose-950/20 font-bold px-1.5 py-0.5 rounded">
                        Urgente
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white font-sans">{stats.pendingRead}</p>
                  </motion.div>
                </Tilt3D>
              </motion.div>
              )}

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gestão de Equipe (Left 2 Columns) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1e2023] border border-zinc-200 dark:border-zinc-850 rounded p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.02)] flex flex-col">
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                      Gestão de Equipe
                    </h2>
                    <button
                      onClick={() => onTabChange('team')}
                      className="text-xs font-semibold text-[#006c49] dark:text-[#4bdfa1] hover:underline"
                    >
                      Ver Todos &rarr;
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-150 dark:border-zinc-800 text-zinc-400 font-semibold text-left">
                          <th className="pb-3 uppercase tracking-wider">Membro</th>
                          <th className="pb-3 uppercase tracking-wider">Status</th>
                          <th className="pb-3 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {isLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>
                              <td colSpan={3} className="py-4">
                                <Skeleton variant="row" />
                              </td>
                            </tr>
                          ))
                        ) : filteredTechsForSearch.map(tech => {
                          const status = getTechStatus(tech);
                          return (
                            <tr key={tech.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all">
                              <td className="py-3 flex items-center gap-3">
                                <Avatar name={tech.name} photoURL={tech.photoURL} size="sm" />
                                <div>
                                  <p className="font-bold text-zinc-850 dark:text-zinc-200">{tech.name}</p>
                                  <p className="text-[10px] text-zinc-400 capitalize">{tech.position}</p>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] ${status.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                                  {status.label}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => {
                                      onTabChange('pdis');
                                    }}
                                    className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-[#006c49] dark:hover:text-[#4bdfa1] cursor-pointer"
                                    title={`Ver PDI de ${tech.name}`}
                                    aria-label={`Ver PDI de ${tech.name}`}
                                  >
                                    <UserIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onNewFeedbackFor(tech.uid);
                                    }}
                                    className="p-1.5 rounded bg-[#006c49]/5 text-[#006c49] dark:text-[#4bdfa1] border border-zinc-200 dark:border-zinc-700 hover:bg-[#006c49]/10 cursor-pointer"
                                    title={`Novo Feedback para ${tech.name}`}
                                    aria-label={`Novo Feedback para ${tech.name}`}
                                  >
                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!isLoading && filteredTechsForSearch.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-zinc-400">
                              Nenhum técnico encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Activities + Executive Tip */}
                <div className="flex flex-col gap-6">
                  
                  {/* Atividades Recentes */}
                  <div className="bg-white dark:bg-[#1e2023] border border-zinc-200 dark:border-zinc-850 rounded p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.02)] flex flex-col text-left">
                    <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-5">
                      Atividades Recentes
                    </h2>
                    
                    <div className="relative border-l border-zinc-150 dark:border-zinc-800 ml-2 space-y-4">
                      {feedbacks.slice(0, 3).map((fb, idx) => {
                        const date = parseDate(fb.createdAt);
                        return (
                          <div key={fb.id || idx} className="relative pl-6">
                            <span className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#1e2023] ${
                              fb.status === 'read' ? 'bg-[#0bbb81]' : 'bg-rose-500'
                            }`} />
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {fb.status === 'read' ? 'Feedback Lido' : 'Feedback Enviado'}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              Para: {fb.technicianName} • {date.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        );
                      })}
                      {feedbacks.length === 0 && (
                        <div className="relative pl-6">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-zinc-400 border-2 border-white dark:border-[#1e2023]" />
                          <p className="text-xs font-bold text-zinc-400">Nenhuma atividade recente</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dica Executiva */}
                  {execTip && (
                    <div className="bg-emerald-50/50 dark:bg-[#006c49]/5 border border-emerald-250 dark:border-emerald-950/20 rounded p-5 text-left flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#006c49] dark:text-[#4bdfa1]">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Dica Executiva
                      </div>
                      <p className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium">
                        {execTip}
                      </p>
                    </div>
                  )}

                </div>

              </div>

            </div>
  );
}
