import { useMemo } from 'react';
import { Target, Calendar } from 'lucide-react';
import type { User, PDIGoal } from '../../types';
import { formatDate } from '../../services/dateUtils';
import { userService } from '../../services/userService';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { friendlyError } from '../../services/errors';

interface MyPDIProps {
  userProfile: User;
  onRefresh: () => void;
}

export default function MyPDI({ userProfile, onRefresh }: MyPDIProps) {
  
  const goals = userProfile.structuredPDI || [];

  const progressStats = useMemo(() => {
    if (goals.length === 0) {
      return { percentage: 0, completed: 0, total: 0 };
    }
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const percentage = Math.round((completed / total) * 100);
    return { percentage, completed, total };
  }, [goals]);

  const handleUpdateStatus = async (goal: PDIGoal) => {
    let nextStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    if (goal.status === 'pending') {
      nextStatus = 'in_progress';
    } else if (goal.status === 'in_progress') {
      nextStatus = 'completed';
    } else if (goal.status === 'completed') {
      nextStatus = 'pending';
    }

    try {
      await userService.updatePDIGoalStatus(userProfile.uid, goal.id, nextStatus);
      
      // Trigger confetti on completed status
      if (nextStatus === 'completed') {
        confetti({
          particleCount: 80,
          spread: 60,
          colors: ['#004B8D', '#FFD700', '#F1C40F'], // Liberty Blue, Gold, Yellow
          origin: { y: 0.6 }
        });
        toast.success('Parabéns! Mais um objetivo concluído com sucesso! 🏆');
      } else {
        toast.success('Status do objetivo atualizado.');
      }
      
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao atualizar status do objetivo.'));
    }
  };

  return (
    <div className="text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-6 h-6 text-liberty-sky" />
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
          Plano de Desenvolvimento Individual (PDI)
        </h2>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-6">
          {/* Progress overview */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between items-center text-sm mb-2 font-semibold">
              <span className="text-zinc-700 dark:text-zinc-300">Meu Progresso PDI</span>
              <span className="text-liberty dark:text-liberty-sky">{progressStats.percentage}%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-liberty to-liberty-sky h-full transition-all duration-500"
                style={{ width: `${progressStats.percentage}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Você completou {progressStats.completed} de {progressStats.total} metas propostas pelo supervisor.
            </p>
          </div>

          {/* Goal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const statusConfig = {
                pending: { badge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400', label: 'Pendente' },
                in_progress: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300', label: 'Em Progresso' },
                completed: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Concluído' }
              }[goal.status];

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/50 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{goal.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConfig?.badge}`}>
                        {statusConfig?.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{goal.description}</p>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" /> Prazo: {formatDate(goal.deadline)}
                    </span>
                    <button
                      onClick={() => handleUpdateStatus(goal)}
                      className="px-3.5 py-1.5 font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-liberty hover:text-white dark:hover:bg-liberty-sky rounded-lg transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 text-[11px]"
                    >
                      Atualizar Status
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
            Nenhum objetivo cadastrado no seu plano de desenvolvimento individual.
          </p>
        </div>
      )}
    </div>
  );
}
