import React, { useState, useEffect } from 'react';
import { Target, Calendar, PlusCircle, Loader2, ArrowRight } from 'lucide-react';
import type { User, PDIGoal } from '../../types';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

interface PDIManagerProps {
  technicians: User[];
  onUpdate: () => void;
}

export default function PDIManager({ technicians, onUpdate }: PDIManagerProps) {
  const [selectedTechId, setSelectedTechId] = useState('');
  const [techData, setTechData] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedTechId) {
      loadTechData();
    } else {
      setTechData(null);
    }
  }, [selectedTechId, technicians]);

  const loadTechData = async () => {
    const data = await userService.getUser(selectedTechId);
    setTechData(data);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId || !title || !description || !deadline) {
      toast.error('Preencha todos os campos do objetivo.');
      return;
    }

    setSubmitting(true);
    try {
      const newGoal: PDIGoal = {
        id: 'pdi_' + Date.now(),
        title,
        description,
        deadline,
        status: 'pending',
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any // Simulated Firestore Timestamp
      };

      await userService.addPDIGoal(selectedTechId, newGoal);
      toast.success('Objetivo de PDI adicionado!');
      setTitle('');
      setDescription('');
      setDeadline('');
      await loadTechData();
      onUpdate();
    } catch (err: any) {
      toast.error('Erro ao adicionar objetivo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (goalId: string, currentStatus: string) => {
    if (!selectedTechId) return;
    
    let nextStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    if (currentStatus === 'pending') {
      nextStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      nextStatus = 'completed';
    } else if (currentStatus === 'completed') {
      nextStatus = 'pending';
    }

    try {
      await userService.updatePDIGoalStatus(selectedTechId, goalId, nextStatus);
      toast.success('Status do PDI atualizado!');
      await loadTechData();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao atualizar status.');
    }
  };

  // Progress Calculations
  const progressStats = React.useMemo(() => {
    if (!techData || !techData.structuredPDI || techData.structuredPDI.length === 0) {
      return { percentage: 0, completed: 0, total: 0 };
    }
    const total = techData.structuredPDI.length;
    const completed = techData.structuredPDI.filter(g => g.status === 'completed').length;
    const percentage = Math.round((completed / total) * 100);
    return { percentage, completed, total };
  }, [techData]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md text-left">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-6 h-6 text-liberty-sky" />
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
          Gerenciador de PDI da Equipe
        </h2>
      </div>

      {/* Select Technician */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Selecione o Colaborador
        </label>
        <select
          value={selectedTechId}
          onChange={(e) => setSelectedTechId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-350 dark:border-zinc-750 bg-transparent dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-liberty text-sm"
        >
          <option value="">Selecione...</option>
          {technicians.map((t) => (
            <option key={t.uid} value={t.uid}>
              {t.name} - {t.position} ({t.team})
            </option>
          ))}
        </select>
      </div>

      {selectedTechId && techData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Goal List and Progress */}
          <div className="space-y-6">
            <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              Objetivos Atuais ({progressStats.total})
            </h3>

            {progressStats.total > 0 ? (
              <>
                {/* Progress Bar */}
                <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Progresso Geral</span>
                    <span className="font-bold text-liberty dark:text-liberty-sky">{progressStats.percentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-liberty to-liberty-sky h-full transition-all duration-500"
                      style={{ width: `${progressStats.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {progressStats.completed} de {progressStats.total} objetivos concluídos
                  </p>
                </div>

                {/* List */}
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {techData.structuredPDI?.map((goal) => {
                    const statusConfig = {
                      pending: { badge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300', label: 'Pendente' },
                      in_progress: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', label: 'Em Progresso' },
                      completed: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Concluído' }
                    }[goal.status];

                    return (
                      <div
                        key={goal.id}
                        className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-md transition-shadow relative flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{goal.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConfig?.badge}`}>
                              {statusConfig?.label}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap">{goal.description}</p>
                        </div>

                        <div className="flex justify-between items-center text-xs mt-1 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="w-3.5 h-3.5" /> Prazo: {goal.deadline}
                          </span>
                          <button
                            onClick={() => handleStatusChange(goal.id, goal.status)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-liberty hover:text-white dark:hover:bg-liberty-sky rounded-lg transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
                          >
                            Mudar Status <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                Nenhum objetivo cadastrado no plano de desenvolvimento deste técnico.
              </p>
            )}
          </div>

          {/* Add Goal Form */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-1.5">
              <PlusCircle className="w-5 h-5 text-liberty" /> Novo Objetivo de PDI
            </h3>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Título do Objetivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Domínio de SLA N1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-liberty"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Descrição / Plano de Ação
                </label>
                <textarea
                  placeholder="Descreva as ações que o técnico deve tomar e os recursos disponíveis..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-liberty resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Data Limite (Prazo)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-liberty cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-lg text-sm font-bold shadow-md hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Atribuir Objetivo'
                )}
              </button>
            </form>
          </div>

        </div>
      ) : (
        <p className="text-sm italic text-zinc-500 dark:text-zinc-400 text-center py-8">
          Selecione um colaborador acima para gerenciar os objetivos do Plano de Desenvolvimento Individual.
        </p>
      )}
    </div>
  );
}
