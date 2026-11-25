import { Check } from 'lucide-react';
import { stepStates, type StepperInput } from '../../services/weekSteps';

const STEPS = [
  { title: 'Lançar', hint: 'ocorrências com print' },
  { title: 'Acompanhar', hint: 'de segunda a quinta' },
  { title: 'Fechar', hint: 'resultado de cada pessoa' },
  { title: 'Ciência', hint: 'cada pessoa assina' },
];

export default function HomeOfficeStepper(props: StepperInput) {
  const states = stepStates(props);
  return (
    <ol aria-label="Etapas da semana" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {STEPS.map((step, i) => {
        const state = states[i];
        return (
          <li
            key={step.title} aria-current={state === 'current' ? 'step' : undefined}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              state === 'current'
                ? 'border-[#006c49] bg-[#006c49] text-white shadow-lg shadow-emerald-900/20'
                : state === 'done'
                  ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023]'
                  : 'border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent'}`}
          >
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
              state === 'current' ? 'bg-white text-[#006c49]'
                : state === 'done' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-[#006c49] dark:text-emerald-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
              {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-xs font-extrabold ${state === 'upcoming' ? 'text-zinc-500 dark:text-zinc-400' : ''}`}>{step.title}</span>
              <span className={`block truncate text-[11px] ${state === 'current' ? 'text-emerald-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{step.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
