import { useState, useEffect, useMemo } from 'react';
import { motion, useTransform, AnimatePresence } from 'motion/react';
import { useMouseParallax } from '../../hooks/useMouseParallax';
import { 
  Users, 
  MessageSquarePlus, 
  FileBarChart, 
  FileText,
  Target,
  User as UserIcon,
  LogOut,
  FileSpreadsheet,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFeedbacks } from '../../hooks/useFeedbacks';
import { useTheme } from '../../hooks/useTheme';
import { userService } from '../../services/userService';
import { exportService } from '../../services/exportService';
import { auditService } from '../../services/auditService';
import { parseDate } from '../../services/dateUtils';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { useScrollReveal, fadeUpVariants, staggerContainerVariants } from '../../hooks/useScrollReveal';
import type { User, AuditLog } from '../../types';
import Avatar from '../shared/Avatar';
import { Skeleton, SkeletonStatCard } from '../shared/Skeleton';
import FeedbackForm from './FeedbackForm';
import TeamManagement from './TeamManagement';
import FeedbackHistory from './FeedbackHistory';
import PDIManager from './PDIManager';
import ClimateOverview from './ClimateOverview';
import ComplianceAudit from './ComplianceAudit';
import BatchExport from './BatchExport';
import Talent9Box from './Talent9Box';
import ExecutiveInsights from './ExecutiveInsights';
import toast from 'react-hot-toast';
import Magnetic from '../shared/Magnetic';
import Tilt3D from '../shared/Tilt3D';
import NotificationCenter from '../shared/NotificationCenter';
import PageTransition from '../shared/PageTransition';

export default function SupervisorDashboard() {
  const { user, logout } = useAuth();
  const { feedbacks, refreshFeedbacks } = useFeedbacks();
  const { theme, toggleTheme } = useTheme();
  const { wrapperRef } = useSmoothScroll();

  // Mouse Parallax 3D — orbes de fundo
  const { x: mouseX, y: mouseY } = useMouseParallax(1);
  // Orbe 1 (top-right): +15px de movimento
  const orb1X = useTransform(mouseX, [-1, 1], [-15, 15]);
  const orb1Y = useTransform(mouseY, [-1, 1], [-15, 15]);
  // Orbe 2 (bottom-left): -10px de movimento (direção oposta)
  const orb2X = useTransform(mouseX, [-1, 1], [10, -10]);
  const orb2Y = useTransform(mouseY, [-1, 1], [10, -10]);
  const { ref: statsRef } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  
  // Dashboard states
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'feedbacks' | 'pdis' | 'climate' | 'export' | 'compliance' | '9box' | 'insights'>('dashboard');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackModalTechId, setFeedbackModalTechId] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardPeriod, setDashboardPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAllTechnicians();
      setTechnicians(data);
      const logs = await auditService.getLogs();
      setAuditLogs(logs);
    } catch (err) {
      toast.error("Erro ao carregar colaboradores.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleExportAll = () => {
    if (!user) return;
    if (feedbacks.length === 0) {
      toast.error("Nenhum feedback disponível para exportação.");
      return;
    }
    exportService.exportToPDF(feedbacks, user.name);
    toast.success("Relatório PDF exportado com sucesso!");
  };

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

      const diffTime = Math.abs(Date.now() - newestFbDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    <div className="min-h-screen flex bg-[#f9f9fd] dark:bg-[#111316] text-[#1a1c1f] dark:text-[#e2e2e6] transition-colors duration-200 font-sans relative overflow-hidden w-full canvas-grain">
      
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
        className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] pointer-events-none"
        style={{
          x: orb2X,
          y: orb2Y,
          opacity: 'calc(1 - var(--scroll-progress, 0) * 0.3)',
          willChange: 'transform, opacity'
        }}
      >
        <div className="w-full h-full bg-secondary-container/8 rounded-full blur-[100px] animate-float-medium" />
      </motion.div>

      {/* Sidebar Layout */}
      <aside className="w-64 bg-white/80 dark:bg-[#1e2023]/80 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shrink-0 p-6 z-20">
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 text-left">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#10b981]/15 to-[#059669]/5 dark:from-[#34d399]/15 dark:to-[#059669]/5 shadow-inner border border-emerald-500/10 flex items-center justify-center shrink-0 animate-float-slow">
              <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Liberty Health Flame/Leaf vector path replica */}
                <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthGlow)" />
                <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthGlow)" />
                
                <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthLogo)" />
                <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthLogo)" />
                <defs>
                  <linearGradient id="libertyHealthLogo" x1="20" y1="15" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <radialGradient id="libertyHealthGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-[#006c49] dark:text-[#4bdfa1] tracking-wider brand-text leading-tight">
                FEED-TRACK
              </span>
              <span className="text-[8px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-semibold leading-none mt-0.5">
                LIBERTY HEALTH
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex flex-col gap-1.5 text-left">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: () => (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="9" />
                  <rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" />
                  <rect x="3" y="16" width="7" height="5" />
                </svg>
              )},
              { id: 'team', label: 'Equipe', icon: Users },
              { id: 'feedbacks', label: 'Feedbacks', icon: FileText },
              { id: 'pdis', label: 'Metas', icon: Target },
              { id: '9box', label: 'Matriz 9-Box', icon: () => (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="5" height="5" />
                  <rect x="9.5" y="3" width="5" height="5" />
                  <rect x="16" y="3" width="5" height="5" />
                  <rect x="3" y="9.5" width="5" height="5" />
                  <rect x="9.5" y="9.5" width="5" height="5" />
                  <rect x="16" y="9.5" width="5" height="5" />
                  <rect x="3" y="16" width="5" height="5" />
                  <rect x="9.5" y="16" width="5" height="5" />
                  <rect x="16" y="16" width="5" height="5" />
                </svg>
              )},
              { id: 'insights', label: 'IA Insights', icon: Sparkles },
              { id: 'climate', label: 'Relatórios', icon: FileBarChart },
              { id: 'export', label: 'Exportar Lote', icon: FileSpreadsheet },
              { id: 'compliance', label: 'Auditoria', icon: Shield }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`relative flex items-center gap-3 px-4 py-2.5 rounded font-bold text-xs transition-all cursor-pointer text-left overflow-hidden ${
                    isActive
                      ? 'text-[#006c49] dark:text-[#4bdfa1]'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20'
                  }`}
                  aria-selected={isActive}
                  role="tab"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarTab"
                      className="absolute inset-0 bg-[#006c49]/5 dark:bg-[#4bdfa1]/5 border-l-2 border-[#006c49] dark:border-[#4bdfa1] rounded pointer-events-none will-change-transform-opacity"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0 z-10" />
                  <span className="z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Create Feedback Button in Sidebar */}
          <Magnetic strength={0.15} className="w-full mt-4">
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="w-full py-2.5 bg-[#0bbb81] hover:bg-[#0bbb81]/95 text-white font-bold rounded text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo Feedback
            </button>
          </Magnetic>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 border-t border-zinc-150 dark:border-zinc-800 pt-4 text-left">
          <Magnetic strength={0.2}>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-3 px-4 py-2 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configurações
            </button>
          </Magnetic>
          <Magnetic strength={0.2}>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-2 rounded text-rose-500 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </Magnetic>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#1e2023]/70 backdrop-blur-md px-8 flex items-center justify-between z-10 shrink-0">
          {/* Search bar */}
          <div className="relative w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-none focus:ring-1 focus:ring-[#006c49]"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Export PDF Report */}
            <button
              onClick={handleExportAll}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Exportar Relatório PDF"
              aria-label="Exportar Relatório PDF"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>

            {/* Notification Center */}
            <NotificationCenter />
            
            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.22" x2="5.64" y2="17.78" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800" />

            {/* Profile Avatar */}
            <div className="flex items-center gap-2">
              <Avatar name={user?.name || 'Supervisor'} photoURL={user?.photoURL} size="sm" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 hidden md:block">
                {user?.name.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main ref={wrapperRef} className="flex-1 overflow-y-auto px-8 py-6 text-left">
          
          <PageTransition keyId={activeTab}>

          {activeTab === 'dashboard' && (
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
                      onClick={() => setActiveTab('team')}
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
                                      setActiveTab('pdis');
                                    }}
                                    className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-[#006c49] dark:hover:text-[#4bdfa1] cursor-pointer"
                                    title={`Ver PDI de ${tech.name}`}
                                    aria-label={`Ver PDI de ${tech.name}`}
                                  >
                                    <UserIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setFeedbackModalTechId(tech.uid);
                                      setIsFeedbackModalOpen(true);
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
          )}

          {activeTab === 'team' && (
            <TeamManagement
              technicians={technicians}
              feedbacks={feedbacks}
              onRefresh={loadData}
              onSelectTechnicianFeedbacks={(_techName) => {
                setActiveTab('feedbacks');
              }}
              onSelectTechnicianPDI={(_techId) => {
                setActiveTab('pdis');
              }}
            />
          )}

          {activeTab === 'feedbacks' && (
            <FeedbackHistory feedbacks={feedbacks} onRefresh={refreshFeedbacks} />
          )}

          {activeTab === 'pdis' && (
            <PDIManager technicians={technicians} onUpdate={loadData} />
          )}

          {activeTab === 'climate' && (
            <ClimateOverview technicians={technicians} feedbacks={feedbacks} />
          )}

          {activeTab === '9box' && (
            <Talent9Box technicians={technicians} />
          )}

          {activeTab === 'insights' && (
            <ExecutiveInsights technicians={technicians} feedbacks={feedbacks} />
          )}

          {activeTab === 'export' && (
            <BatchExport technicians={technicians} feedbacks={feedbacks} />
          )}

          {activeTab === 'compliance' && (
            <ComplianceAudit logs={auditLogs} onRefresh={loadData} />
          )}

          </PageTransition>

        </main>

      </div>

      {/* Feedback creation Form modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <FeedbackForm
            technicians={technicians.filter(t => t.active)}
            initialTechId={feedbackModalTechId}
            onClose={() => { setIsFeedbackModalOpen(false); setFeedbackModalTechId(undefined); }}
            onSuccess={() => {
              refreshFeedbacks();
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
            >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800 mb-4">
              <h3 id="settings-modal-title" className="text-sm font-bold text-zinc-900 dark:text-white">
                Configurações da Conta
              </h3>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
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
                  Conectado (Modo Simulado / Local Storage)
                </div>
              </div>

              <div className="pt-4 flex justify-between gap-3 border-t border-zinc-150 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Deseja realmente limpar todos os dados locais do FEED-TRACK e restaurar as configurações padrão?")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded transition-colors text-[10px] font-bold cursor-pointer"
                >
                  Restaurar Banco Padrão
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
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

    </div>
  );
}
