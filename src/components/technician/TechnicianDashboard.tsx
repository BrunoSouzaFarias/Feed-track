import { useState, useMemo, useCallback } from 'react';
import { motion, useTransform, AnimatePresence } from 'motion/react';
import { useMouseParallax } from '../../hooks/useMouseParallax';
import { BookOpen, Target, Award, PlusCircle, BarChart3, Milestone } from 'lucide-react';
import { useDataEffect } from '../../hooks/useDataEffect';
import { useAuth } from '../../hooks/useAuth';
import { useFeedbacks } from '../../hooks/useFeedbacks';
import { userService } from '../../services/userService';
import type { User, SelfAssessment as SelfAssessmentRecord } from '../../types';
import Header from '../shared/Header';
import MyFeedbacks from './MyFeedbacks';
import MyPDI from './MyPDI';
import BadgesPanel from './BadgesPanel';
import CareerTimeline from './CareerTimeline';
import SelfAssessment from './SelfAssessment';
import RadarChart from '../shared/RadarChart';
import { calculateSupervisorScores } from '../../services/radarUtils';
import { parseDate } from '../../services/dateUtils';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import toast from 'react-hot-toast';
import Magnetic from '../shared/Magnetic';
import Tilt3D from '../shared/Tilt3D';
import PageTransition from '../shared/PageTransition';
import { Skeleton } from '../shared/Skeleton';
import { friendlyError } from '../../services/errors';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { feedbacks, loading: feedbacksLoading, error: feedbacksError, refreshFeedbacks } = useFeedbacks(user?.uid);
  useSmoothScroll();

  // Mouse Parallax 3D — orbes de fundo
  const { x: mouseX, y: mouseY } = useMouseParallax(1);
  // Orbe 1 (top-right): +15px de movimento
  const orb1X = useTransform(mouseX, [-1, 1], [-15, 15]);
  const orb1Y = useTransform(mouseY, [-1, 1], [-15, 15]);
  // Orbe 2 (bottom-left): -10px de movimento (direção oposta)
  const orb2X = useTransform(mouseX, [-1, 1], [10, -10]);
  const orb2Y = useTransform(mouseY, [-1, 1], [10, -10]);
  
  // Dashboard states
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'pdi' | 'radar' | 'badges' | 'timeline'>('feedbacks');
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [hasAssessments, setHasAssessments] = useState(false);
  const [latestSelfAssessment, setLatestSelfAssessment] = useState<SelfAssessmentRecord['scores'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stagger animation layouts
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

  const fetchProfileData = useCallback(async () => {
    if (!user) return null;
    const [data, assessmentsList] = await Promise.all([
      userService.getUser(user.uid),
      userService.getSelfAssessments(user.uid),
    ]);
    return { data, assessmentsList };
  }, [user]);

  const applyProfileData = (r: Awaited<ReturnType<typeof fetchProfileData>>) => {
    if (!r) return;
    setProfile(r.data);
    setHasAssessments(r.assessmentsList.length > 0);
    if (r.assessmentsList.length > 0) {
      // Mais recente primeiro
      const sorted = [...r.assessmentsList].sort((x, y) =>
        parseDate(y.createdAt).getTime() - parseDate(x.createdAt).getTime()
      );
      setLatestSelfAssessment(sorted[0].scores);
    } else {
      setLatestSelfAssessment(null);
    }
  };

  // Recarga manual (onRefresh dos painéis)
  const loadProfile = async () => {
    try {
      applyProfileData(await fetchProfileData());
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao carregar dados do perfil.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Carga inicial / quando o usuário muda
  useDataEffect(
    fetchProfileData,
    (r) => { applyProfileData(r); setIsLoading(false); },
    (err) => { toast.error(friendlyError(err, 'Erro ao carregar dados do perfil.')); setIsLoading(false); },
    [user]
  );

  // Compute supervisor scores based on feedbacks
  const supervisorScores = useMemo(() => {
    return calculateSupervisorScores(feedbacks);
  }, [feedbacks]);

  // Goal metrics
  const goalStats = useMemo(() => {
    if (!profile || !profile.structuredPDI || profile.structuredPDI.length === 0) {
      return { completed: 0, total: 0 };
    }
    const total = profile.structuredPDI.length;
    const completed = profile.structuredPDI.filter(g => g.status === 'completed').length;
    return { completed, total };
  }, [profile]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200 relative overflow-hidden canvas-grain">
      
      {/* Premium Vignette Texture Filter */}
      <div className="atmospheric-vignette" />

      {/* Background glow effects — scroll parallax + mouse parallax 3D */}
      <motion.div
        className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] pointer-events-none"
        style={{
          x: orb1X,
          y: orb1Y,
          opacity: 'calc(1 - var(--scroll-progress, 0) * 0.45)',
          willChange: 'transform, opacity'
        }}
      >
        <div className="w-full h-full bg-primary/5 rounded-full blur-[140px] animate-float-slow" />
      </motion.div>
      <motion.div
        className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] pointer-events-none"
        style={{
          x: orb2X,
          y: orb2Y,
          opacity: 'calc(1 - var(--scroll-progress, 0) * 0.3)',
          willChange: 'transform, opacity'
        }}
      >
        <div className="w-full h-full bg-secondary-container/8 rounded-full blur-[100px] animate-float-medium" />
      </motion.div>

      <Header />

      <main id="conteudo" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left relative z-10">
        
        {/* Welcome block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight dashboard-title">
              Olá, {user?.name}! 🚀
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Aqui está seu painel de desenvolvimento pessoal e acompanhamento de carreira.
            </p>
          </div>

          {/* Quick stats and action triggers */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 select-none">
            {/* Quick assessment button */}
            <Magnetic strength={0.15}>
              <button
                onClick={() => setIsAssessmentOpen(true)}
                className="flex-1 sm:flex-none py-3 px-4 text-sm font-bold bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4.5 h-4.5" /> Nova Autoavaliação
              </button>
            </Magnetic>

            {/* Badges tab trigger shortcut */}
            <Magnetic strength={0.15}>
              <button
                onClick={() => setActiveTab('badges')}
                className="flex-1 sm:flex-none py-3 px-4 text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-250 rounded-xl shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Award className="w-4.5 h-4.5 text-amber-500" /> Minhas Conquistas
              </button>
            </Magnetic>
          </div>
        </div>

        {/* Dashboard summary grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
          {/* Card: PDI progress */}
          <Tilt3D maxRotation={6} scaleOnHover={1.03}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-5 shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 h-full"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2 rounded-xl bg-liberty/10 dark:bg-liberty/20 text-liberty dark:text-liberty-sky">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Objetivos de PDI</span>
              </div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {goalStats.completed} de {goalStats.total} concluídos
              </p>
              <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-liberty h-full transition-all duration-500"
                  style={{ width: `${goalStats.total > 0 ? (goalStats.completed / goalStats.total) * 100 : 0}%` }}
                />
              </div>
            </motion.div>
          </Tilt3D>

          {/* Card: Received Feedbacks counts */}
          <Tilt3D maxRotation={6} scaleOnHover={1.03}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-5 shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 h-full"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Total de Feedbacks</span>
              </div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {feedbacks.length} recebidos
              </p>
              <p className="text-xs text-zinc-400 mt-2 font-medium">
                {feedbacks.filter(f => f.status === 'read').length} lidos | {feedbacks.filter(f => f.status === 'pending').length} pendentes
              </p>
            </motion.div>
          </Tilt3D>

          {/* Card: Badge conquistas counts */}
          <Tilt3D maxRotation={6} scaleOnHover={1.03}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-5 shadow-[0px_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0px_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 h-full"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Minhas Conquistas</span>
              </div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {profile?.badges?.length || 0} badges coletados
              </p>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Pronto para novos desafios gamificados</p>
            </motion.div>
          </Tilt3D>
          </motion.div>
        )}

        {/* Tab options row */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto gap-2 select-none scrollbar-none scroll-smooth snap-x snap-mandatory md:snap-none" role="tablist" aria-label="Abas do painel">
          {[
            { id: 'feedbacks', label: 'Meus Feedbacks', icon: BookOpen },
            { id: 'pdi', label: 'Meu Plano de Desenvolvimento (PDI)', icon: Target },
            { id: 'radar', label: 'Radar de Competências', icon: BarChart3 },
            { id: 'badges', label: 'Minhas Conquistas', icon: Award },
            { id: 'timeline', label: 'Jornada & Linha do Tempo', icon: Milestone }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex items-center gap-2 py-3 px-4 font-bold text-sm shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-liberty focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 rounded-lg snap-start ${
                  isActive
                    ? 'text-liberty dark:text-liberty-sky'
                    : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4.5 h-4.5 z-10" />
                <span className="z-10">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTechnicianTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-liberty dark:bg-liberty-sky will-change-transform-opacity"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab view containers */}
        <PageTransition keyId={activeTab}>
          <div>
          {activeTab === 'feedbacks' && (
            <MyFeedbacks
              feedbacks={feedbacks}
              loading={feedbacksLoading}
              error={feedbacksError}
              onRefresh={refreshFeedbacks}
            />
          )}

          {activeTab === 'pdi' && profile && (
            <MyPDI userProfile={profile} onRefresh={loadProfile} />
          )}

          {activeTab === 'radar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <RadarChart
                selfAssessment={latestSelfAssessment}
                supervisor={supervisorScores}
                selfLabel="Minha Autoavaliação"
                supervisorLabel="Avaliação do Supervisor"
              />
              <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Análise Radar de Competências</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  O gráfico de radar compara a sua percepção de desempenho (autoavaliação) com os feedbacks formais registrados pelo seu supervisor neste período.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-350">
                      <strong>Autoavaliação (Azul):</strong> Reflete sua visão individual sobre habilidades e atitudes no trimestre atual.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-350">
                      <strong>Avaliação do Supervisor (Verde):</strong> Calculada dinamicamente com base nos feedbacks construtivos e positivos que você recebeu nas 5 competências.
                    </span>
                  </div>
                </div>
                {!latestSelfAssessment && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                    Você ainda não realizou sua autoavaliação para o período atual. Clique em <strong>"Nova Autoavaliação"</strong> no topo da página para atualizar seus dados no gráfico.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'badges' && profile && (
            <BadgesPanel
              userProfile={profile}
              feedbacks={feedbacks}
              hasAssessments={hasAssessments}
              onRefresh={loadProfile}
            />
          )}

          {activeTab === 'timeline' && profile && (
            <CareerTimeline
              userProfile={profile}
              feedbacks={feedbacks}
            />
          )}
          </div>
        </PageTransition>

      </main>

      {/* Self assessment modal overlay */}
      <AnimatePresence>
        {isAssessmentOpen && profile && (
          <SelfAssessment
            userProfile={profile}
            onSuccess={loadProfile}
            onClose={() => setIsAssessmentOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
