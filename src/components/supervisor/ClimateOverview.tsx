import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, BarChart3, Users, Clock, Smile } from 'lucide-react';
import { userService } from '../../services/userService';
import type { SelfAssessment, User, Feedback } from '../../types';
import { parseDate } from '../../services/dateUtils';
import RadarChart from '../shared/RadarChart';
import { calculateSupervisorScores } from '../../services/radarUtils';
import { aiInsightsService } from '../../services/aiInsightsService';


interface ClimateOverviewProps {
  technicians: User[];
  feedbacks: Feedback[];
}

export default function ClimateOverview({ technicians, feedbacks }: ClimateOverviewProps) {
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('Todos');
  const [selectedTeam, setSelectedTeam] = useState('Todos');
  const [selectedTechId, setSelectedTechId] = useState('Todos');

  useEffect(() => {
    userService.getSelfAssessments().then(data => {
      setAssessments(data);
    });
  }, [technicians]);

  // generateInsights is O(technicians × feedbacks) — memoize so it runs once
  // per data change instead of 3x on every render (including every keystroke
  // in the filter selects above).
  const insights = useMemo(
    () => aiInsightsService.generateInsights(technicians, feedbacks, assessments),
    [technicians, feedbacks, assessments]
  );
  const filteredInsights = useMemo(
    () => insights.filter(ins => selectedTechId === 'Todos' ? true : ins.technicianId === selectedTechId),
    [insights, selectedTechId]
  );

  // Extract unique periods
  const periods = useMemo(() => {
    const list = new Set<string>();
    assessments.forEach(a => {
      if (a.period) list.add(a.period);
    });
    return ['Todos', ...Array.from(list)];
  }, [assessments]);

  // Filter assessments based on period & team of technician & technician ID
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      // Find technician info to check team
      const tech = technicians.find(t => t.uid === a.technicianId);
      const matchesTeam = selectedTeam === 'Todos' || (tech && tech.team === selectedTeam);
      const matchesPeriod = selectedPeriod === 'Todos' || a.period === selectedPeriod;
      const matchesTech = selectedTechId === 'Todos' || a.technicianId === selectedTechId;
      return matchesTeam && matchesPeriod && matchesTech;
    });
  }, [assessments, selectedPeriod, selectedTeam, selectedTechId, technicians]);

  // Calculate scores average
  const averages = useMemo(() => {
    if (filteredAssessments.length === 0) {
      return { communication: 0, teamwork: 0, technical: 0, proactivity: 0, attendance: 0, overall: 0 };
    }
    let comm = 0, team = 0, tech = 0, pro = 0, att = 0;
    filteredAssessments.forEach(a => {
      comm += a.scores.communication || 0;
      team += a.scores.teamwork || 0;
      tech += a.scores.technical || 0;
      pro += a.scores.proactivity || 0;
      att += a.scores.attendance || 0;
    });
    const len = filteredAssessments.length;
    const stats = {
      communication: Number((comm / len).toFixed(1)),
      teamwork: Number((team / len).toFixed(1)),
      technical: Number((tech / len).toFixed(1)),
      proactivity: Number((pro / len).toFixed(1)),
      attendance: Number((att / len).toFixed(1)),
      overall: 0
    };
    stats.overall = Number(((stats.communication + stats.teamwork + stats.technical + stats.proactivity + stats.attendance) / 5).toFixed(1));
    return stats;
  }, [filteredAssessments]);

  // Sync collaborator filter with team filter
  useEffect(() => {
    if (selectedTeam !== 'Todos' && selectedTechId !== 'Todos') {
      const isStillInList = technicians.some(t => t.uid === selectedTechId && t.team === selectedTeam);
      if (!isStillInList) {
        setSelectedTechId('Todos');
      }
    }
  }, [selectedTeam, selectedTechId, technicians]);

  const filteredTechsForSelect = useMemo(() => {
    if (selectedTeam === 'Todos') return technicians;
    return technicians.filter(t => t.team === selectedTeam);
  }, [technicians, selectedTeam]);

  // Compute supervisor scores based on selected team or technician
  const supervisorScores = useMemo(() => {
    if (selectedTechId !== 'Todos') {
      const techFbs = feedbacks.filter(fb => fb.technicianId === selectedTechId);
      return calculateSupervisorScores(techFbs);
    } else {
      const matchingTechIds = new Set(
        technicians
          .filter(t => selectedTeam === 'Todos' || t.team === selectedTeam)
          .map(t => t.uid)
      );
      const filteredFbs = feedbacks.filter(fb => matchingTechIds.has(fb.technicianId));
      return calculateSupervisorScores(filteredFbs);
    }
  }, [feedbacks, selectedTechId, selectedTeam, technicians]);

  const selfAssessmentScores = useMemo(() => {
    if (filteredAssessments.length === 0) return null;
    return {
      communication: averages.communication,
      teamwork: averages.teamwork,
      technical: averages.technical,
      proactivity: averages.proactivity,
      attendance: averages.attendance,
    };
  }, [averages, filteredAssessments]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md text-left font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Smile className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
            Visão de Clima & Autoavaliação
          </h2>
        </div>
 
        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-liberty cursor-pointer font-semibold"
            >
              {periods.map(p => (
                <option key={p} value={p}>{p === 'Todos' ? 'Todos os Períodos' : p}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-liberty cursor-pointer font-semibold"
            >
              <option value="Todos">Todos os Times</option>
              <option value="back-office">Back-office</option>
              <option value="teleservice">Teleservice</option>
            </select>
          </div>
          <div>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-liberty cursor-pointer font-semibold"
            >
              <option value="Todos">Todos os Colaboradores</option>
              {filteredTechsForSelect.map(t => (
                <option key={t.uid} value={t.uid}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredAssessments.length > 0 ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Overall Score */}
            <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Média Geral</span>
              <span className="text-3xl font-extrabold text-primary">{averages.overall}</span>
              <span className="text-[10px] text-on-surface-variant/70 mt-1">escala 1 a 5</span>
            </div>

            {/* Communication */}
            <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Comunicação</span>
              <span className="text-2xl font-bold text-on-surface">{averages.communication}</span>
            </div>

            {/* Teamwork */}
            <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Trabalho em Equipe</span>
              <span className="text-2xl font-bold text-on-surface">{averages.teamwork}</span>
            </div>

            {/* Technical */}
            <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Conhecimento</span>
              <span className="text-2xl font-bold text-on-surface">{averages.technical}</span>
            </div>

            {/* Proactivity */}
            <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Proatividade</span>
              <span className="text-2xl font-bold text-on-surface">{averages.proactivity}</span>
            </div>

            {/* Attendance */}
            <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant font-bold mb-1">Comprometimento</span>
              <span className="text-2xl font-bold text-on-surface">{averages.attendance}</span>
            </div>

          </div>

          {/* Charts Visualization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Radar Chart */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-[#0bbb81]" /> Radar de Competências (Autoavaliação vs Supervisor)
              </h3>
              <RadarChart
                selfAssessment={selfAssessmentScores}
                supervisor={supervisorScores}
                selfLabel={selectedTechId === 'Todos' ? 'Média de Autoavaliação' : 'Autoavaliação'}
                supervisorLabel={selectedTechId === 'Todos' ? 'Média do Supervisor' : 'Avaliação do Supervisor'}
              />
            </div>

            {/* Horizontal Bar Chart */}
            <div>
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-liberty" /> Gráfico Comparativo de Competências
              </h3>
              
              <div className="space-y-4 pt-2">
                {[
                  { name: 'Comunicação', val: averages.communication, color: 'bg-indigo-500' },
                  { name: 'Trabalho em Equipe', val: averages.teamwork, color: 'bg-emerald-500' },
                  { name: 'Conhecimento Técnico', val: averages.technical, color: 'bg-cyan-500' },
                  { name: 'Proatividade', val: averages.proactivity, color: 'bg-amber-500' },
                  { name: 'Comprometimento / Assiduidade', val: averages.attendance, color: 'bg-rose-500' }
                ].map(item => {
                  const widthPercent = (item.val / 5) * 100;
                  return (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-400 w-28 shrink-0">{item.name}</span>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-4 rounded-full overflow-hidden">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 w-6 text-right">{item.val}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs space-y-2 text-zinc-500 dark:text-zinc-400">
                <p>
                  <strong>Dica Analítica:</strong> Use o gráfico de radar à esquerda para identificar desalinhamentos de percepção.
                </p>
                <p>
                  Quando a autoavaliação (azul) estiver muito maior que a avaliação do supervisor (verde), indica necessidade de feedback de calibração. O contrário pode indicar subestimação do colaborador.
                </p>
              </div>
            </div>
          </div>

          {/* Recent qualitative feedback Comments */}
          <div>
            <h3 className="text-sm font-bold text-zinc-750 dark:text-zinc-350 mb-3 flex items-center gap-1">
              <Users className="w-4 h-4 text-liberty-sky" /> Últimos Comentários Qualitativos ({filteredAssessments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
              {filteredAssessments.map((a) => {
                const tech = technicians.find(t => t.uid === a.technicianId);
                const date = parseDate(a.createdAt);
                return (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                        {tech?.name || 'Técnico'}
                      </span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {date.toLocaleDateString('pt-BR')} - {a.period}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-650 dark:text-zinc-400 italic">
                      "{a.comments || 'Sem comentários adicionais.'}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights Executivos Gerados por IA */}
          <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-750 dark:text-zinc-350 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Insights Executivos — regras automáticas ({filteredInsights.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map((insight) => {
                  let badgeColor = 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40';
                  let icon = 'ℹ️';
                  if (insight.type === 'warning') {
                    badgeColor = 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-250 dark:border-amber-900/45';
                    icon = '⚠️';
                  } else if (insight.type === 'alert') {
                    badgeColor = 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40';
                    icon = '🚨';
                  } else if (insight.type === 'success') {
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
                    icon = '📈';
                  }

                  return (
                    <div
                      key={insight.id}
                      className={`p-4 rounded-xl border flex flex-col gap-2 text-xs ${badgeColor}`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <span>{icon}</span> {insight.title}
                        </span>
                        <span className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">
                          {insight.technicianName}
                        </span>
                      </div>
                      <p className="leading-relaxed opacity-95">
                        {insight.message}
                      </p>
                      <div className="mt-1 pt-2 border-t border-current/10 font-medium">
                        <strong>Recomendação:</strong> {insight.action}
                      </div>
                    </div>
                  );
                })}
              {filteredInsights.length === 0 && (
                <p className="text-xs italic text-zinc-450 col-span-2 text-center py-4">
                  Nenhum insight crítico gerado para os filtros selecionados. A equipe está alinhada!
                </p>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-zinc-350 mb-2" />
          <p className="text-sm italic text-zinc-500 dark:text-zinc-450">
            Nenhuma autoavaliação cadastrada para os filtros selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
