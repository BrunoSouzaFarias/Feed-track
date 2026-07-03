import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Star, 
  Award, 
  Target, 
  Sliders, 
  Grid,
  Info,
  MapPin
} from 'lucide-react';
import { userService } from '../../services/userService';
import { parseDate } from '../../services/dateUtils';
import type { User, SelfAssessment } from '../../types';
import Avatar from '../shared/Avatar';


interface Talent9BoxProps {
  technicians: User[];
  onRefresh?: () => void;
}

interface ProcessedTech {
  tech: User;
  hasAssessment: boolean;
  pdiCount: number;
  completedPdiCount: number;
  performancePercent: number;
  avgPotential: number;
  assessment?: SelfAssessment;
  box: {
    id: number;
    title: string;
    description: string;
    colorClass: string;
    bgClass: string;
    textColor: string;
    xLabel: 'Baixo' | 'Médio' | 'Alto';
    yLabel: 'Baixo' | 'Médio' | 'Alto';
    xIndex: number; // 0, 1, 2
    yIndex: number; // 0, 1, 2
  };
}

// 9-Box definitions according to HR standards
const BOXES = [
  // Top row (High Potential)
  {
    id: 3,
    xIndex: 0,
    yIndex: 2,
    xLabel: 'Baixo' as const,
    yLabel: 'Alto' as const,
    title: 'Enigma / Dilema',
    description: 'Alto potencial com baixo desempenho no PDI. Necessita de acompanhamento e motivação.',
    colorClass: 'border-amber-450/40 dark:border-amber-700/40',
    bgClass: 'bg-amber-50/45 dark:bg-amber-950/10 hover:bg-amber-100/50 dark:hover:bg-amber-950/20',
    textColor: 'text-amber-700 dark:text-amber-400'
  },
  {
    id: 6,
    xIndex: 1,
    yIndex: 2,
    xLabel: 'Médio' as const,
    yLabel: 'Alto' as const,
    title: 'Potencial Crescente',
    description: 'Alto potencial e bom desempenho. Forte candidato a liderança ou projetos de maior complexidade.',
    colorClass: 'border-emerald-450/30 dark:border-emerald-700/30',
    bgClass: 'bg-emerald-50/20 dark:bg-emerald-950/5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/15',
    textColor: 'text-emerald-700 dark:text-[#4bdfa1]'
  },
  {
    id: 9,
    xIndex: 2,
    yIndex: 2,
    xLabel: 'Alto' as const,
    yLabel: 'Alto' as const,
    title: 'Estrela / Talento',
    description: 'Alto potencial e alto desempenho. Futuro líder, referência e multiplicador de conhecimento.',
    colorClass: 'border-emerald-500/50 dark:border-emerald-450/50',
    bgClass: 'bg-emerald-55/60 dark:bg-emerald-900/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20 border-2 shadow-[0_0_15px_rgba(11,187,129,0.08)]',
    textColor: 'text-emerald-800 dark:text-[#0bbb81]'
  },
  // Middle row (Medium Potential)
  {
    id: 2,
    xIndex: 0,
    yIndex: 1,
    xLabel: 'Baixo' as const,
    yLabel: 'Médio' as const,
    title: 'Questionável',
    description: 'Médio potencial e baixo desempenho. Precisa de plano de melhoria e alinhamento de expectativas.',
    colorClass: 'border-rose-450/40 dark:border-rose-800/35',
    bgClass: 'bg-rose-50/35 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-950/20',
    textColor: 'text-rose-700 dark:text-rose-400'
  },
  {
    id: 5,
    xIndex: 1,
    yIndex: 1,
    xLabel: 'Médio' as const,
    yLabel: 'Médio' as const,
    title: 'Mantenedor / Core',
    description: 'Médio potencial e médio desempenho. Colaborador sólido que entrega o esperado de forma consistente.',
    colorClass: 'border-zinc-200 dark:border-zinc-800',
    bgClass: 'bg-white/50 dark:bg-[#1c1e22]/50 hover:bg-zinc-100/45 dark:hover:bg-zinc-800/40',
    textColor: 'text-zinc-700 dark:text-zinc-350'
  },
  {
    id: 8,
    xIndex: 2,
    yIndex: 1,
    xLabel: 'Alto' as const,
    yLabel: 'Médio' as const,
    title: 'Forte Desempenho',
    description: 'Médio potencial e alto desempenho. Excelente em execução. Deve continuar sendo estimulado.',
    colorClass: 'border-[#006c49]/30 dark:border-emerald-800/30',
    bgClass: 'bg-[#006c49]/5 dark:bg-[#006c49]/5 hover:bg-[#006c49]/10 dark:hover:bg-[#006c49]/10',
    textColor: 'text-[#006c49] dark:text-[#4bdfa1]'
  },
  // Bottom row (Low Potential)
  {
    id: 1,
    xIndex: 0,
    yIndex: 0,
    xLabel: 'Baixo' as const,
    yLabel: 'Baixo' as const,
    title: 'Risco de Desempenho',
    description: 'Baixo potencial e baixo desempenho. Requer plano imediato de ação corretiva ou reposicionamento.',
    colorClass: 'border-red-500/45 dark:border-red-800/40',
    bgClass: 'bg-red-50/40 dark:bg-red-950/15 hover:bg-red-100/50 dark:hover:bg-red-950/25 border-l-4 border-l-red-500',
    textColor: 'text-red-750 dark:text-red-400'
  },
  {
    id: 4,
    xIndex: 1,
    yIndex: 0,
    xLabel: 'Médio' as const,
    yLabel: 'Baixo' as const,
    title: 'Eficaz / Sólido',
    description: 'Baixo potencial e médio desempenho. Profissional focado em rotinas estáveis e bem desenhadas.',
    colorClass: 'border-zinc-200 dark:border-zinc-800',
    bgClass: 'bg-zinc-100/40 dark:bg-zinc-900/30 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/55',
    textColor: 'text-zinc-650 dark:text-zinc-400'
  },
  {
    id: 7,
    xIndex: 2,
    yIndex: 0,
    xLabel: 'Alto' as const,
    yLabel: 'Baixo' as const,
    title: 'Especialista Técnico',
    description: 'Baixo potencial percebido de liderança corporativa, mas altíssimo desempenho técnico individual.',
    colorClass: 'border-[#006c49]/20 dark:border-zinc-700/30',
    bgClass: 'bg-[#006c49]/2 dark:bg-zinc-900/20 hover:bg-[#006c49]/5 dark:hover:bg-zinc-800/40',
    textColor: 'text-[#006c49] dark:text-[#4bdfa1]'
  }
];

export default function Talent9Box({ technicians }: Talent9BoxProps) {
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'Todos' | 'back-office' | 'teleservice'>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'scatter'>('grid');
  const [selectedTech, setSelectedTech] = useState<ProcessedTech | null>(null);

  // Threshold States (Customizable for HR calibration)
  const [lowPerfThreshold, setLowPerfThreshold] = useState(35);
  const [highPerfThreshold, setHighPerfThreshold] = useState(70);
  const [lowPotThreshold, setLowPotThreshold] = useState(3.0);
  const [highPotThreshold, setHighPotThreshold] = useState(4.0);

  useEffect(() => {
    userService.getSelfAssessments().then(data => {
      setAssessments(data);
    });
  }, [technicians]);

  // Process and cross data
  const processedData = useMemo<ProcessedTech[]>(() => {
    return technicians.map(tech => {
      const techAssessments = assessments.filter(a => a.technicianId === tech.uid);
      
      // Calculate latest self assessment potential score (average 1-5)
      let avgPotential = 3.0; // default baseline if no self assessment
      let hasAssessment = false;
      let latestAssessment: SelfAssessment | undefined;

      if (techAssessments.length > 0) {
        // Sort to get latest
        const sorted = [...techAssessments].sort((a, b) =>
          parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
        );
        latestAssessment = sorted[0];
        const s = latestAssessment.scores;
        avgPotential = (s.communication + s.teamwork + s.technical + s.proactivity + s.attendance) / 5;
        hasAssessment = true;
      }

      // Calculate PDI performance (completed / total)
      const goals = tech.structuredPDI || [];
      const pdiCount = goals.length;
      const completedPdiCount = goals.filter(g => g.status === 'completed').length;
      const performancePercent = pdiCount > 0 ? (completedPdiCount / pdiCount) * 100 : 0;

      // Classify indices based on customizable thresholds
      let xIndex: number;
      if (performancePercent < lowPerfThreshold) {
        xIndex = 0;
      } else if (performancePercent <= highPerfThreshold) {
        xIndex = 1;
      } else {
        xIndex = 2;
      }

      let yIndex: number;
      if (avgPotential < lowPotThreshold) {
        yIndex = 0;
      } else if (avgPotential <= highPotThreshold) {
        yIndex = 1;
      } else {
        yIndex = 2;
      }

      // Find the corresponding box
      const box = BOXES.find(b => b.xIndex === xIndex && b.yIndex === yIndex) || BOXES[4];

      return {
        tech,
        hasAssessment,
        pdiCount,
        completedPdiCount,
        performancePercent,
        avgPotential: Math.round(avgPotential * 10) / 10,
        assessment: latestAssessment,
        box
      };
    });
  }, [technicians, assessments, lowPerfThreshold, highPerfThreshold, lowPotThreshold, highPotThreshold]);

  // Filter processed data by team
  const filteredData = useMemo(() => {
    if (selectedTeam === 'Todos') return processedData;
    return processedData.filter(d => d.tech.team === selectedTeam);
  }, [processedData, selectedTeam]);

  // Group technicians by box ID for Grid view
  const groupedData = useMemo(() => {
    const groups: { [key: number]: ProcessedTech[] } = {};
    BOXES.forEach(b => {
      groups[b.id] = [];
    });
    filteredData.forEach(item => {
      groups[item.box.id]?.push(item);
    });
    return groups;
  }, [filteredData]);

  // Box coordinates mapping for scatter view:
  // X = Desempenho (0 - 100)%
  // Y = Potencial (1.0 - 5.0) -> Convert to % (avgPotential - 1) / 4 * 100
  const getCoordinates = (performance: number, potential: number) => {
    const x = performance; // 0 to 100
    const y = ((potential - 1) / 4) * 100; // 0 to 100
    return { x, y };
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white dashboard-title flex items-center gap-2">
            Matriz 9-Box
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#006c49]/10 text-[#006c49] dark:bg-[#4bdfa1]/10 dark:text-[#4bdfa1] font-sans">
              Calibração de Talentos
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Mapeamento dinâmico cruzando o percentual de conclusão do PDI (Desempenho) com as últimas Autoavaliações (Potencial).
          </p>
        </div>

        {/* Filter and View Toggles */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-0.5 text-xs font-bold">
            <button
              onClick={() => setSelectedTeam('Todos')}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${
                selectedTeam === 'Todos'
                  ? 'bg-white dark:bg-[#1e2023] text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedTeam('back-office')}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${
                selectedTeam === 'back-office'
                  ? 'bg-white dark:bg-[#1e2023] text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Back-Office
            </button>
            <button
              onClick={() => setSelectedTeam('teleservice')}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${
                selectedTeam === 'teleservice'
                  ? 'bg-white dark:bg-[#1e2023] text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Teleservice
            </button>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-0.5 text-xs font-bold">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded cursor-pointer transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#1e2023] text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Quadrantes"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('scatter')}
              className={`p-1.5 rounded cursor-pointer transition-all flex items-center gap-1.5 ${
                viewMode === 'scatter'
                  ? 'bg-white dark:bg-[#1e2023] text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização Contínua de Dispersão"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Customizable Thresholds Drawer */}
      <div className="bg-white dark:bg-[#1e2023] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-[0px_4px_16px_rgba(0,0,0,0.01)] text-xs flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300">
          <Sliders className="w-4 h-4 text-[#006c49] dark:text-[#4bdfa1]" />
          <span>Régua de Calibração (Filtros HR)</span>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">PDI Baixo:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={lowPerfThreshold}
              onChange={e => setLowPerfThreshold(Number(e.target.value))}
              className="w-12 text-center p-1 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded font-bold"
            />
            <span className="text-zinc-400">%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">PDI Alto:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={highPerfThreshold}
              onChange={e => setHighPerfThreshold(Number(e.target.value))}
              className="w-12 text-center p-1 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded font-bold"
            />
            <span className="text-zinc-400">%</span>
          </div>
          <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <span className="text-zinc-400">Potencial Baixo:</span>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={lowPotThreshold}
              onChange={e => setLowPotThreshold(Number(e.target.value))}
              className="w-12 text-center p-1 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Potencial Alto:</span>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={highPotThreshold}
              onChange={e => setHighPotThreshold(Number(e.target.value))}
              className="w-12 text-center p-1 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded font-bold"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Y Axis Legend (vertical potential indicator on desktop) */}
          <div className="xl:col-span-1 hidden xl:flex flex-col justify-between py-12 items-center text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
            <span className="rotate-270 -translate-y-4">Alto Potencial ({highPotThreshold}+)</span>
            <span className="rotate-270">Médio Potencial</span>
            <span className="rotate-270 translate-y-4">Baixo Potencial (&lt; {lowPotThreshold})</span>
          </div>

          {/* 9-Box Grid Container */}
          <div className="xl:col-span-11 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Render rows in reverse order: YIndex = 2 (Alto), 1 (Médio), 0 (Baixo) */}
            {[2, 1, 0].map(yIndex => (
              <div key={`row-${yIndex}`} className="contents">
                {[0, 1, 2].map(xIndex => {
                  const box = BOXES.find(b => b.xIndex === xIndex && b.yIndex === yIndex)!;
                  const techsInBox = groupedData[box.id] || [];
                  const isStarBox = box.id === 9;

                  return (
                    <motion.div
                      key={box.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 120, damping: 14 }}
                      whileHover={{ scale: 1.015 }}
                      className={`relative rounded-xl border flex flex-col p-4 transition-all duration-300 min-h-[170px] ${box.colorClass} ${box.bgClass}`}
                    >
                      {/* Box Header */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div>
                          <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${box.textColor}`}>
                            {isStarBox && <Star className="w-3.5 h-3.5 fill-[#0bbb81] text-[#0bbb81]" />}
                            {box.title}
                          </h3>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-sans block mt-0.5">
                            PDI: {box.xLabel} • Potencial: {box.yLabel}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          techsInBox.length > 0 
                            ? 'bg-[#006c49]/15 text-[#006c49] dark:bg-[#4bdfa1]/20 dark:text-[#4bdfa1]' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {techsInBox.length}
                        </span>
                      </div>

                      {/* Technicians List in Box */}
                      <div className="flex-1 flex flex-col gap-2 mt-2">
                        {techsInBox.map(item => (
                          <motion.div
                            key={item.tech.uid}
                            layoutId={`tech-card-${item.tech.uid}`}
                            onClick={() => setSelectedTech(item)}
                            whileHover={{ 
                              scale: 1.03, 
                              y: -1,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 20 }}
                            className="bg-white dark:bg-[#25282d] p-2 rounded-lg border border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-2 cursor-pointer shadow-sm relative overflow-hidden"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={item.tech.name} photoURL={item.tech.photoURL} size="sm" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-zinc-850 dark:text-zinc-200 truncate">{item.tech.name}</p>
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium truncate capitalize">{item.tech.position}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9.5px] font-bold text-zinc-700 dark:text-zinc-300 block">
                                PDI: {Math.round(item.performancePercent)}%
                              </span>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block">
                                Pot: {item.avgPotential}
                              </span>
                            </div>
                          </motion.div>
                        ))}

                        {techsInBox.length === 0 && (
                          <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-lg py-6">
                            <span className="text-[10px] text-zinc-450 dark:text-zinc-650 italic">Vazio</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* X Axis Legend (horizontal performance indicator) */}
          <div className="xl:col-span-1" />
          <div className="xl:col-span-11 grid grid-cols-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mt-2">
            <span>Baixo Desempenho PDI (&lt; {lowPerfThreshold}%)</span>
            <span>Médio Desempenho PDI</span>
            <span>Alto Desempenho PDI ({highPerfThreshold}%+)</span>
          </div>
        </div>
      )}

      {/* Continuous Scatter Plot View */}
      {viewMode === 'scatter' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-[#1e2023] border border-zinc-250 dark:border-zinc-800 rounded-xl p-6 shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#006c49]" />
              Dispersão Contínua (X: Desempenho | Y: Potencial)
            </h2>
            <span className="text-[10px] text-zinc-400 italic">
              Posições exatas calculadas matematicamente. Clique nas fotos para detalhes.
            </span>
          </div>

          {/* 2D Plane Container */}
          <div className="relative border border-zinc-300 dark:border-zinc-800 bg-[#fbfbfd] dark:bg-[#17191c] rounded-xl h-[420px] w-full overflow-hidden select-none">
            
            {/* Grid threshold boundary overlay lines */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/20 dark:border-rose-500/10 pointer-events-none"
              style={{ bottom: `${((lowPotThreshold - 1) / 4) * 100}%` }}
            />
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500/20 dark:border-emerald-500/10 pointer-events-none"
              style={{ bottom: `${((highPotThreshold - 1) / 4) * 100}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-rose-500/20 dark:border-rose-500/10 pointer-events-none"
              style={{ left: `${lowPerfThreshold}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-500/20 dark:border-emerald-500/10 pointer-events-none"
              style={{ left: `${highPerfThreshold}%` }}
            />

            {/* Labels for thresholds inside map */}
            <span className="absolute right-2 text-[8px] font-bold text-rose-500/60" style={{ bottom: `calc(${((lowPotThreshold - 1) / 4) * 100}% + 4px)` }}>
              Limite Inferior de Potencial ({lowPotThreshold})
            </span>
            <span className="absolute right-2 text-[8px] font-bold text-emerald-500/60" style={{ bottom: `calc(${((highPotThreshold - 1) / 4) * 100}% + 4px)` }}>
              Limite Superior de Potencial ({highPotThreshold})
            </span>
            <span className="absolute top-2 text-[8px] font-bold text-rose-500/60" style={{ left: `calc(${lowPerfThreshold}% + 6px)` }}>
              PDI Mínimo ({lowPerfThreshold}%)
            </span>
            <span className="absolute top-2 text-[8px] font-bold text-emerald-500/60" style={{ left: `calc(${highPerfThreshold}% + 6px)` }}>
              PDI Excelente ({highPerfThreshold}%)
            </span>

            {/* Quadrant label annotations on background */}
            <div className="absolute top-4 left-4 text-[13px] font-black text-zinc-300/30 dark:text-zinc-700/20 uppercase tracking-widest pointer-events-none">
              Dilema
            </div>
            <div className="absolute top-4 right-4 text-[13px] font-black text-emerald-500/15 dark:text-emerald-500/10 uppercase tracking-widest pointer-events-none text-right">
              Estrelas
            </div>
            <div className="absolute bottom-4 left-4 text-[13px] font-black text-red-500/15 dark:text-red-500/10 uppercase tracking-widest pointer-events-none">
              Risco
            </div>
            <div className="absolute bottom-4 right-4 text-[13px] font-black text-zinc-350/20 dark:text-zinc-700/15 uppercase tracking-widest pointer-events-none text-right">
              Especialistas
            </div>

            {/* Axis titles */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-zinc-400 pointer-events-none bg-white dark:bg-[#1e2023] px-2 py-0.5 rounded border border-zinc-150 dark:border-zinc-800">
              Desempenho (PDI % Completo)
            </div>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[9px] font-bold uppercase tracking-wider text-zinc-400 pointer-events-none bg-white dark:bg-[#1e2023] px-2 py-0.5 rounded border border-zinc-150 dark:border-zinc-800">
              Potencial (Autoavaliação)
            </div>

            {/* Technicians Dots on Map */}
            {filteredData.map(item => {
              const coords = getCoordinates(item.performancePercent, item.avgPotential);
              const isSelected = selectedTech?.tech.uid === item.tech.uid;

              return (
                <motion.div
                  key={item.tech.uid}
                  style={{
                    position: 'absolute',
                    left: `${coords.x}%`,
                    bottom: `${coords.y}%`,
                    transform: 'translate(-50%, 50%)',
                    zIndex: isSelected ? 30 : 10
                  }}
                  whileHover={{ 
                    scale: 1.25, 
                    zIndex: 40 
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 450, 
                    damping: 15 
                  }}
                  onClick={() => setSelectedTech(item)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <div className={`p-1 rounded-full border-2 bg-white dark:bg-[#1e2023] shadow-md transition-colors ${
                    isSelected 
                      ? 'border-[#0bbb81] ring-4 ring-[#0bbb81]/25' 
                      : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-800 dark:group-hover:border-zinc-200'
                  }`}>
                    <Avatar name={item.tech.name} photoURL={item.tech.photoURL} size="sm" />
                  </div>
                  
                  {/* Floating Mini Name Badge */}
                  <div className="mt-1 bg-zinc-950/80 dark:bg-zinc-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold text-white shadow-sm opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.tech.name.split(' ')[0]} ({Math.round(item.performancePercent)}%, {item.avgPotential})
                  </div>
                </motion.div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-450 italic text-xs">
                Nenhum colaborador encontrado para esta equipe.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Technician Detail Sidebar/Modal (AnimatePresence) */}
      <AnimatePresence>
        {selectedTech && (
          <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white dark:bg-[#1e2023]/95 backdrop-blur-md h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-zinc-200 dark:border-zinc-800 text-left"
            >
              <div className="space-y-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedTech.tech.name} photoURL={selectedTech.tech.photoURL} size="md" />
                    <div>
                      <h2 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                        {selectedTech.tech.name}
                      </h2>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 capitalize">
                        {selectedTech.tech.position} • {selectedTech.tech.team}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTech(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-250 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* 9-Box Placement Status */}
                <div className={`p-4 rounded-xl border ${selectedTech.box.colorClass} ${selectedTech.box.bgClass}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Award className={`w-4 h-4 ${selectedTech.box.textColor}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${selectedTech.box.textColor}`}>
                      Quadrante: {selectedTech.box.title}
                    </span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-zinc-650 dark:text-zinc-300 font-medium">
                    {selectedTech.box.description}
                  </p>
                </div>

                {/* X & Y Metrics breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase font-extrabold mb-1">
                      <Target className="w-3.5 h-3.5" />
                      Desempenho (PDI)
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">
                      {Math.round(selectedTech.performancePercent)}%
                    </p>
                    <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-medium block">
                      {selectedTech.completedPdiCount} de {selectedTech.pdiCount} metas concluídas
                    </span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase font-extrabold mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Potencial
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">
                      {selectedTech.avgPotential} / 5.0
                    </p>
                    <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-medium block">
                      {selectedTech.hasAssessment 
                        ? 'Baseado em Autoavaliação recente' 
                        : 'Sem autoavaliação (baseline padrão)'}
                    </span>
                  </div>
                </div>

                {/* Self Assessment Details */}
                {selectedTech.assessment && (
                  <div className="space-y-3">
                    <h4 className="text-[10.5px] font-extrabold uppercase text-zinc-450 tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Notas de Autoavaliação (Período: {selectedTech.assessment.period})
                    </h4>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg p-3 border border-zinc-150 dark:border-zinc-800 space-y-2 text-xs">
                      {[
                        { label: 'Comunicação', score: selectedTech.assessment.scores.communication },
                        { label: 'Trabalho em Equipe', score: selectedTech.assessment.scores.teamwork },
                        { label: 'Conhecimento Técnico', score: selectedTech.assessment.scores.technical },
                        { label: 'Proatividade', score: selectedTech.assessment.scores.proactivity },
                        { label: 'Comprometimento / Frequência', score: selectedTech.assessment.scores.attendance },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-zinc-500 font-medium">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            {/* Visual progress line */}
                            <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.score / 5) * 100}%` }} />
                            </div>
                            <span className="font-extrabold text-zinc-800 dark:text-zinc-200 w-4 text-right">{item.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedTech.assessment.comments && (
                      <div>
                        <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider">Comentários da Autoavaliação</span>
                        <blockquote className="mt-1 p-2 bg-zinc-50/50 dark:bg-zinc-900/20 border-l-2 border-[#006c49] text-[10px] text-zinc-650 dark:text-zinc-350 italic rounded-r">
                          "{selectedTech.assessment.comments}"
                        </blockquote>
                      </div>
                    )}
                  </div>
                )}

                {/* PDI details */}
                <div>
                  <h4 className="text-[10.5px] font-extrabold uppercase text-zinc-450 tracking-wider mb-2 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    Plano de Desenvolvimento Individual (PDI)
                  </h4>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {(selectedTech.tech.structuredPDI || []).map(goal => (
                      <div 
                        key={goal.id} 
                        className="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/25 rounded-lg flex items-start justify-between gap-2 text-[10.5px]"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{goal.title}</p>
                          <p className="text-[9.5px] text-zinc-450 dark:text-zinc-500 font-medium line-clamp-1">{goal.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[8px] shrink-0 ${
                          goal.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : goal.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {goal.status === 'completed' ? 'Concluída' : goal.status === 'in_progress' ? 'Em progresso' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                    {(selectedTech.tech.structuredPDI || []).length === 0 && (
                      <p className="text-[10px] text-zinc-450 italic text-center py-4">Nenhuma meta de PDI estruturada para este colaborador.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedTech(null)}
                  className="flex-1 py-2 text-center text-xs font-bold bg-[#006c49] hover:bg-[#005236] text-white rounded cursor-pointer transition-colors"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
