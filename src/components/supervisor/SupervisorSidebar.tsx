import { motion } from 'motion/react';
import { CalendarCheck, FileBarChart, FileSpreadsheet, FileText, Grid3x3, Home, LayoutGrid, LogOut, Shield, Sparkles, Target, Users, type LucideIcon } from 'lucide-react';
import Magnetic from '../shared/Magnetic';
import BrandLogo from '../shared/BrandLogo';

export type SupervisorTab = 'dashboard' | 'team' | 'feedbacks' | 'pdis' | 'climate' | 'export' | 'compliance' | '9box' | 'insights' | 'homeoffice' | 'today';

interface NavItem { id: SupervisorTab; label: string; icon: LucideIcon }
interface NavGroup { title: string; items: NavItem[] }

/** Menu agrupado pelo ritmo de trabalho: o que fazer hoje, pessoas, a semana, análises. */
const NAV_GROUPS: NavGroup[] = [
  { title: 'Hoje', items: [
    { id: 'today', label: 'Central de ações', icon: Home },
    { id: 'dashboard', label: 'Visão geral', icon: LayoutGrid },
  ] },
  { title: 'Pessoas', items: [
    { id: 'team', label: 'Equipe', icon: Users },
    { id: 'feedbacks', label: 'Feedbacks', icon: FileText },
    { id: 'pdis', label: 'Metas (PDI)', icon: Target },
  ] },
  { title: 'Semana', items: [{ id: 'homeoffice', label: 'Home Office', icon: CalendarCheck }] },
  { title: 'Análises', items: [
    { id: '9box', label: 'Matriz 9-Box', icon: Grid3x3 },
    { id: 'insights', label: 'Insights', icon: Sparkles },
    { id: 'climate', label: 'Relatórios', icon: FileBarChart },
    { id: 'export', label: 'Exportar lote', icon: FileSpreadsheet },
  ] },
  { title: 'Conformidade', items: [{ id: 'compliance', label: 'Auditoria', icon: Shield }] },
];

interface SupervisorSidebarProps {
  activeTab: SupervisorTab;
  onTabChange: (tab: SupervisorTab) => void;
  onNewFeedback: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function SupervisorSidebar({ activeTab, onTabChange, onNewFeedback, onOpenSettings, onLogout }: SupervisorSidebarProps) {
  return (
      <aside className="w-64 bg-white/80 dark:bg-[#1e2023]/80 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shrink-0 p-6 z-20">
        <div className="flex flex-col gap-8">
          <BrandLogo />

          {/* Menu Items */}
          <nav aria-label="Principal" className="flex flex-col gap-5 text-left">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <span className="px-4 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">{group.title}</span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`relative flex items-center gap-3 px-4 py-2.5 rounded font-bold text-xs transition-all cursor-pointer text-left overflow-hidden ${
                        isActive
                          ? 'text-[#006c49] dark:text-[#4bdfa1]'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
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
              </div>
            ))}
          </nav>

          {/* Create Feedback Button in Sidebar */}
          <Magnetic strength={0.15} className="w-full mt-4">
            <button
              onClick={() => onNewFeedback()}
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
              onClick={() => onOpenSettings()}
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
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-2 rounded text-rose-500 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </Magnetic>
        </div>
      </aside>
  );
}
