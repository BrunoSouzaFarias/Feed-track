import { useState, useMemo } from 'react';
import { Search, FileDown, ShieldAlert } from 'lucide-react';
import type { Feedback } from '../../types';
import { FEEDBACK_AXES } from '../../types';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../shared/StatusBadge';
import { parseDate } from '../../services/dateUtils';

interface FeedbackHistoryProps {
  feedbacks: Feedback[];
  onRefresh?: () => void;
}

export default function FeedbackHistory({ feedbacks }: FeedbackHistoryProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'read'>('all');
  const [selectedAxis, setSelectedAxis] = useState('all');

  // Client side filtering using useMemo
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const matchSearch =
        fb.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.axis.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        selectedStatus === 'all' || fb.status === selectedStatus;

      const matchAxis =
        selectedAxis === 'all' || fb.axis === selectedAxis;

      return matchSearch && matchStatus && matchAxis;
    });
  }, [feedbacks, searchTerm, selectedStatus, selectedAxis]);

  const handleExportRow = (fb: Feedback) => {
    if (!user) return;
    exportService.exportToPDF([fb], user.name, fb.technicianName);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md text-left">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
          Últimas Movimentações (Feedbacks)
        </h2>
      </div>

      {/* Filters & Search Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-650" />
          <input
            type="text"
            placeholder="Buscar por colaborador, descrição, eixo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-liberty"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-liberty cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes de Leitura</option>
            <option value="read">Lidos</option>
          </select>
        </div>

        {/* Axis Filter */}
        <div className="relative">
          <select
            value={selectedAxis}
            onChange={(e) => setSelectedAxis(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-liberty cursor-pointer"
          >
            <option value="all">Todas as Categorias (Eixos)</option>
            {FEEDBACK_AXES.map((ax) => (
              <option key={ax} value={ax}>
                {ax}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      {filteredFeedbacks.length > 0 ? (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full min-w-[700px] table-fixed divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/80 text-xs font-bold text-zinc-500 dark:text-zinc-400 text-left">
                <th className="w-24 px-4 py-3">Data</th>
                <th className="w-36 px-4 py-3">Técnico</th>
                <th className="w-28 px-4 py-3">Tipo</th>
                <th className="w-36 px-4 py-3">Eixo</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="w-28 px-4 py-3 text-center">Status</th>
                <th className="w-16 px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {filteredFeedbacks.map((fb, idx) => {
                const date = parseDate(fb.createdAt);
                const descStr = fb.description.length > 70 ? fb.description.substring(0, 70) + '...' : fb.description;
                
                return (
                  <tr
                    key={fb.id}
                    className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors ${
                      idx % 2 === 1 ? 'bg-zinc-50/20 dark:bg-zinc-800/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-150 truncate">
                      {fb.technicianName}
                    </td>
                    <td className="px-4 py-3">
                      {fb.type === 'positive' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-450 text-xs font-bold">
                          🟢 Positivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-liberty dark:text-liberty-sky text-xs font-bold">
                          🔵 Desenvolvimento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-650 dark:text-zinc-350 truncate">
                      {fb.axis}
                    </td>
                    <td className="px-4 py-3 text-zinc-550 dark:text-zinc-400 truncate max-w-[200px]" title={fb.description}>
                      {descStr}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={fb.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleExportRow(fb)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-liberty dark:text-zinc-450 dark:hover:text-liberty-sky hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Exportar PDF Individual"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-sm italic text-zinc-500 dark:text-zinc-450">
            Nenhum feedback encontrado para os filtros selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
