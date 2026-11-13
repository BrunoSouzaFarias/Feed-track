import { useState, useEffect } from 'react';
import { motion, useTransform, AnimatePresence } from 'motion/react';
import { useMouseParallax } from '../../hooks/useMouseParallax';
import Avatar from '../shared/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useFeedbacks } from '../../hooks/useFeedbacks';
import { useTheme } from '../../hooks/useTheme';
import { userService } from '../../services/userService';
import { exportService } from '../../services/exportService';
import { auditService } from '../../services/auditService';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import type { User, AuditLog } from '../../types';
import FeedbackForm from './FeedbackForm';
import TeamManagement from './TeamManagement';
import FeedbackHistory from './FeedbackHistory';
import PDIManager from './PDIManager';
import ClimateOverview from './ClimateOverview';
import ComplianceAudit from './ComplianceAudit';
import BatchExport from './BatchExport';
import Talent9Box from './Talent9Box';
import ExecutiveInsights from './ExecutiveInsights';
import SupervisorSidebar from './SupervisorSidebar';
import SettingsModal from './SettingsModal';
import DashboardOverview from './DashboardOverview';
import toast from 'react-hot-toast';
import NotificationCenter from '../shared/NotificationCenter';
import PageTransition from '../shared/PageTransition';
import { friendlyError } from '../../services/errors';

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
  
  // Dashboard states
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'feedbacks' | 'pdis' | 'climate' | 'export' | 'compliance' | '9box' | 'insights'>('dashboard');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackModalTechId, setFeedbackModalTechId] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAllTechnicians();
      setTechnicians(data);
      const logs = await auditService.getLogs();
      setAuditLogs(logs);
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao carregar colaboradores."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportAll = () => {
    if (!user) return;
    if (feedbacks.length === 0) {
      toast.error("Nenhum feedback disponível para exportação.");
      return;
    }
    exportService.exportToPDF(feedbacks, user.name);
    toast.success("Relatório PDF exportado com sucesso!");
  };

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
      <SupervisorSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLogout={logout}
      />

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
        <main id="conteudo" tabIndex={-1} ref={wrapperRef} className="flex-1 overflow-y-auto px-8 py-6 text-left">
          
          <PageTransition keyId={activeTab}>

          {activeTab === 'dashboard' && (
            <DashboardOverview
              user={user}
              technicians={technicians}
              feedbacks={feedbacks}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onTabChange={setActiveTab}
              onNewFeedbackFor={(techId) => { setFeedbackModalTechId(techId); setIsFeedbackModalOpen(true); }}
            />
          )}

          {activeTab === 'team' && (
            <TeamManagement
              technicians={technicians}
              feedbacks={feedbacks}
              onRefresh={loadData}
              onSelectTechnicianFeedbacks={() => {
                setActiveTab('feedbacks');
              }}
              onSelectTechnicianPDI={() => {
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

      <SettingsModal open={isSettingsModalOpen} user={user} onClose={() => setIsSettingsModalOpen(false)} />

    </div>
  );
}
