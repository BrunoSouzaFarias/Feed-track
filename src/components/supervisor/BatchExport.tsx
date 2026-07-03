import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Download, 
  Users, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Search,
  Smile,
  Target
} from 'lucide-react';
import type { User, Feedback, SelfAssessment } from '../../types';
import { userService } from '../../services/userService';
import { exportService } from '../../services/exportService';
import Avatar from '../shared/Avatar';
import toast from 'react-hot-toast';

interface BatchExportProps {
  technicians: User[];
  feedbacks: Feedback[];
}

export default function BatchExport({ technicians, feedbacks }: BatchExportProps) {
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'back-office' | 'teleservice'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [includeClimate, setIncludeClimate] = useState(true);
  const [includePDI, setIncludePDI] = useState(true);
  const [includeFeedbacks, setIncludeFeedbacks] = useState(true);

  // Load self-assessments
  useEffect(() => {
    userService.getSelfAssessments()
      .then(data => {
        setAssessments(data);
      })
      .catch(() => {
        toast.error("Erro ao carregar dados de autoavaliação/clima.");
      });
  }, [technicians]);

  // Filter technicians based on team and search input
  const filteredTechs = useMemo(() => {
    return technicians.filter(tech => {
      const matchesTeam = selectedTeam === 'all' || tech.team === selectedTeam;
      const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tech.position.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTeam && matchesSearch;
    });
  }, [technicians, selectedTeam, searchTerm]);

  // Select all technicians by default ONCE, the first time the list loads.
  // Must NOT depend on filteredTechs — resetting on every search keystroke or
  // team-filter change would silently undo manual deselections.
  const didInitSelection = useRef(false);
  useEffect(() => {
    if (!didInitSelection.current && technicians.length > 0) {
      setSelectedTechIds(technicians.map(t => t.uid));
      didInitSelection.current = true;
    }
  }, [technicians]);

  // Toggle selection for a single technician
  const toggleSelectTech = (uid: string) => {
    setSelectedTechIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Toggle select all in current filtered list
  const toggleSelectAll = () => {
    const allFilteredIds = filteredTechs.map(t => t.uid);
    const areAllSelected = allFilteredIds.every(id => selectedTechIds.includes(id));
    
    if (areAllSelected) {
      // Unselect only the currently filtered ones
      setSelectedTechIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Add missing filtered ones to selection
      setSelectedTechIds(prev => {
        const unique = new Set([...prev, ...allFilteredIds]);
        return Array.from(unique);
      });
    }
  };

  // Compile full team report dataset
  const exportData = useMemo(() => {
    return technicians
      .filter(tech => selectedTechIds.includes(tech.uid))
      .map(tech => {
        // 1. Climate / Self-assessment
        const techAssessments = assessments.filter(a => a.technicianId === tech.uid);
        const climate = {
          communication: 0,
          teamwork: 0,
          technical: 0,
          proactivity: 0,
          attendance: 0,
          overall: 0,
          assessmentsCount: techAssessments.length
        };

        if (techAssessments.length > 0) {
          let comm = 0, team = 0, technical = 0, pro = 0, att = 0;
          techAssessments.forEach(a => {
            comm += a.scores.communication || 0;
            team += a.scores.teamwork || 0;
            technical += a.scores.technical || 0;
            pro += a.scores.proactivity || 0;
            att += a.scores.attendance || 0;
          });
          const len = techAssessments.length;
          climate.communication = Number((comm / len).toFixed(1));
          climate.teamwork = Number((team / len).toFixed(1));
          climate.technical = Number((technical / len).toFixed(1));
          climate.proactivity = Number((pro / len).toFixed(1));
          climate.attendance = Number((att / len).toFixed(1));
          climate.overall = Number(((climate.communication + climate.teamwork + climate.technical + climate.proactivity + climate.attendance) / 5).toFixed(1));
        }

        // 2. PDI Progress
        const goals = tech.structuredPDI || [];
        const pdi = {
          total: goals.length,
          pending: goals.filter(g => g.status === 'pending').length,
          inProgress: goals.filter(g => g.status === 'in_progress').length,
          completed: goals.filter(g => g.status === 'completed').length,
          completionRate: 0
        };
        if (pdi.total > 0) {
          pdi.completionRate = Number(((pdi.completed / pdi.total) * 100).toFixed(0));
        }

        // 3. 1:1 / Feedbacks
        const techFbs = feedbacks.filter(f => f.technicianId === tech.uid);
        const fbs = {
          total: techFbs.length,
          positive: techFbs.filter(f => f.type === 'positive').length,
          development: techFbs.filter(f => f.type === 'development').length,
          pending: techFbs.filter(f => f.status === 'pending').length
        };

        return {
          technician: tech,
          climate: includeClimate ? climate : { communication: 0, teamwork: 0, technical: 0, proactivity: 0, attendance: 0, overall: 0, assessmentsCount: 0 },
          pdi: includePDI ? pdi : { total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0 },
          feedbacks: includeFeedbacks ? fbs : { total: 0, positive: 0, development: 0, pending: 0 }
        };
      });
  }, [technicians, assessments, feedbacks, selectedTechIds, includeClimate, includePDI, includeFeedbacks]);

  // Execute CSV or XLSX Export
  const handleExport = (format: 'csv' | 'xlsx') => {
    if (exportData.length === 0) {
      toast.error("Selecione pelo menos um colaborador para exportar.");
      return;
    }
    exportService.exportTeamData(exportData, format);
    toast.success(format === 'xlsx' ? 'Relatório CSV (Excel) exportado!' : 'Relatório CSV exportado!');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md text-left space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" /> Exportação de Dados em Lote
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gere relatórios unificados contendo médias de clima, progresso de PDI e histórico de feedbacks da equipe.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportData.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-50 transition-all w-full md:w-auto"
          >
            <FileText className="w-4 h-4" /> Exportar CSV
          </button>
          
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exportData.length === 0}
            title="CSV formatado para Excel (separador ; e decimais com vírgula)"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50 transition-all w-full md:w-auto"
          >
            <Download className="w-4 h-4" /> Exportar CSV (Excel)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Configuration & Selectors */}
        <div className="space-y-6 lg:border-r lg:border-zinc-100 lg:dark:border-zinc-800 lg:pr-6">
          
          {/* 1. Columns Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> 1. Conteúdo do Relatório
            </h3>
            
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3.5 border border-zinc-100 dark:border-zinc-800/80 space-y-3.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-850 dark:text-zinc-250 select-none">
                <input
                  type="checkbox"
                  checked={includeClimate}
                  onChange={(e) => setIncludeClimate(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span>Médias de Clima & Competências</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Notas médias das autoavaliações do trimestre</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-850 dark:text-zinc-250 select-none">
                <input
                  type="checkbox"
                  checked={includePDI}
                  onChange={(e) => setIncludePDI(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span>Progresso de PDIs</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Metas pendentes, concluídas e progresso</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-850 dark:text-zinc-250 select-none">
                <input
                  type="checkbox"
                  checked={includeFeedbacks}
                  onChange={(e) => setIncludeFeedbacks(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span>Histórico de 1:1s & Feedbacks</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Totais positivos, desenvolvimento e pendências</span>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Team & Search Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 2. Filtrar Colaboradores
            </h3>

            <div className="space-y-3">
              {/* Team select */}
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Todos os Times</option>
                <option value="back-office">Back-office</option>
                <option value="teleservice">Teleservice</option>
              </select>

              {/* Search text input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Selection & Table Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" /> Colaboradores Selecionados ({selectedTechIds.length}/{filteredTechs.length})
            </h3>
            
            <button
              onClick={toggleSelectAll}
              className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              {filteredTechs.every(t => selectedTechIds.includes(t.uid)) ? "Desmarcar Todos" : "Selecionar Todos"}
            </button>
          </div>

          {/* Quick interactive Technician list */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm max-h-[360px] overflow-y-auto">
            {filteredTechs.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 font-semibold text-left border-b border-zinc-150 dark:border-zinc-800">
                    <th className="py-2.5 px-4 w-10">Select</th>
                    <th className="py-2.5 px-2">Membro</th>
                    <th className="py-2.5 px-2">Time</th>
                    <th className="py-2.5 px-2">Média Clima</th>
                    <th className="py-2.5 px-2">PDI Progress</th>
                    <th className="py-2.5 px-2 text-right pr-4">1:1s</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {filteredTechs.map(tech => {
                    const isSelected = selectedTechIds.includes(tech.uid);
                    
                    // Instant compilation display
                    const rowData = exportData.find(d => d.technician.uid === tech.uid);
                    const climateAvg = rowData?.climate?.overall || 'N/A';
                    const pdiPercent = rowData?.pdi?.total ? `${rowData.pdi.completionRate}%` : 'N/A';
                    const fbCount = rowData?.feedbacks?.total || 0;

                    return (
                      <tr 
                        key={tech.uid} 
                        onClick={() => toggleSelectTech(tech.uid)}
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer ${
                          isSelected ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' : ''
                        }`}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => toggleSelectTech(tech.uid)}
                            className="text-zinc-400 hover:text-emerald-500 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-2 flex items-center gap-3">
                          <Avatar name={tech.name} photoURL={tech.photoURL} size="sm" />
                          <div>
                            <p className="font-bold text-zinc-850 dark:text-zinc-200">{tech.name}</p>
                            <p className="text-[10px] text-zinc-400">{tech.position}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="capitalize text-zinc-500 dark:text-zinc-400">{tech.team}</span>
                        </td>
                        <td className="py-3 px-2">
                          {climateAvg !== 'N/A' ? (
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5">
                              <Smile className="w-3.5 h-3.5 text-emerald-500" /> {climateAvg}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {pdiPercent !== 'N/A' ? (
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5">
                              <Target className="w-3.5 h-3.5 text-cyan-500" /> {pdiPercent}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right pr-4">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                            {fbCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-zinc-400">
                Nenhum colaborador corresponde aos filtros de busca.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
