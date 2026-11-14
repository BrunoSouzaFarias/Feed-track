import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Home, Link2, Loader2, LockKeyhole, LockOpen, Settings2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomeOfficeConfig, HomeOfficePoint, HomeOfficeWeek, Team, User } from '../../types';
import { homeOfficeService } from '../../services/homeOfficeService';
import { DEFAULT_HOME_OFFICE_CONFIG, computeScore, shiftWeek, weekIdOf, weekRangeLabel } from '../../services/homeOfficeLogic';
import { friendlyError } from '../../services/errors';
import { scope } from '../../services/scope';
import { useDataEffect } from '../../hooks/useDataEffect';
import { Skeleton } from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import ScoreRing from '../shared/ScoreRing';
import Avatar from '../shared/Avatar';
import HomeOfficeTeamList, { type HomeOfficeRow } from './HomeOfficeTeamList';
import HomeOfficeEntryForm from './HomeOfficeEntryForm';
import HomeOfficePointList from './HomeOfficePointList';
import HomeOfficeConfigModal from './HomeOfficeConfigModal';

interface HomeOfficeProps {
  technicians: User[];
}

interface Loaded {
  key: string;
  config: HomeOfficeConfig;
  points: HomeOfficePoint[];
  weeks: HomeOfficeWeek[];
}

const TEAM_LABEL: Record<Team, string> = { teleservice: 'Teleatendimento', 'back-office': 'Back-office' };

export default function HomeOffice({ technicians }: HomeOfficeProps) {
  const currentWeek = useMemo(() => weekIdOf(new Date()), []);
  const [weekId, setWeekId] = useState(currentWeek);
  const [team, setTeam] = useState<Team>(scope.get() ?? 'teleservice');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = `${weekId}#${refresh}`;
  useDataEffect(
    async () => {
      const [config, points, weeks] = await Promise.all([
        homeOfficeService.getConfig(), homeOfficeService.listPoints(weekId), homeOfficeService.listWeeks(weekId),
      ]);
      return { config, points, weeks };
    },
    (r) => setLoaded({ key, ...r }),
    (err) => { toast.error(friendlyError(err, 'Não foi possível carregar a avaliação.')); setLoaded({ key, config: DEFAULT_HOME_OFFICE_CONFIG, points: [], weeks: [] }); },
    [weekId, refresh]
  );
  const loading = loaded?.key !== key;
  const config = loaded?.config ?? DEFAULT_HOME_OFFICE_CONFIG;
  const reload = () => setRefresh((n) => n + 1);

  const team_technicians = useMemo(
    () => technicians.filter((t) => t.active && t.team === team).sort((a, b) => a.name.localeCompare(b.name)),
    [technicians, team]
  );

  const rows: HomeOfficeRow[] = useMemo(() => team_technicians.map((tech) => {
    const own = (loaded?.points ?? []).filter((p) => p.technicianId === tech.uid);
    const week = (loaded?.weeks ?? []).find((w) => w.technicianId === tech.uid);
    return { tech, score: week ? week.score : computeScore(own), count: own.filter((p) => p.status === 'active').length, week };
  }), [team_technicians, loaded]);

  const selected = rows.find((r) => r.tech.uid === selectedId) ?? null;
  const selectedPoints = (loaded?.points ?? []).filter((p) => p.technicianId === selectedId);
  const locked = Boolean(selected?.week);

  const eligibleCount = rows.filter((r) => r.score >= config.threshold).length;
  const awaitingAck = rows.filter((r) => r.week && !r.week.ackAt).length;
  const openCount = rows.filter((r) => !r.week).length;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível concluir a ação.'));
    } finally {
      setBusy(false);
    }
  };

  const closeOne = (row: HomeOfficeRow) => {
    const result = row.score >= config.threshold ? 'ELEGÍVEL' : 'ABAIXO da nota de corte';
    if (!window.confirm(`Fechar a semana de ${row.tech.name}?\n\nSaldo: ${row.score} pontos (corte ${config.threshold}) → ${result}.\nDepois de fechada, não entram novos lançamentos e a pessoa passa a ver as pontuações.`)) return;
    void run(async () => { await homeOfficeService.closeWeek(row.tech, weekId, config.threshold); }, `Semana de ${row.tech.name.split(' ')[0]} fechada.`);
  };

  const closeAll = () => {
    const pending = rows.filter((r) => !r.week);
    if (pending.length === 0) return;
    if (!window.confirm(`Fechar a semana de ${pending.length} pessoa${pending.length > 1 ? 's' : ''} (${TEAM_LABEL[team]})?\nCada uma passa a ver as próprias pontuações.`)) return;
    void run(async () => { for (const r of pending) await homeOfficeService.closeWeek(r.tech, weekId, config.threshold); }, 'Semana da equipe fechada.');
  };

  const reopen = (row: HomeOfficeRow) => {
    if (!row.week) return;
    if (!window.confirm(`Reabrir a semana de ${row.tech.name}? Ela deixa de ver as pontuações até você fechar de novo.`)) return;
    void run(() => homeOfficeService.reopenWeek(row.week as HomeOfficeWeek), 'Semana reaberta.');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/technician?tab=home-office`;
    navigator.clipboard.writeText(link).then(
      () => toast.success('Link copiado. Envie para a pessoa; ela entra com o login dela.'),
      () => toast.error('Não foi possível copiar. Selecione o endereço manualmente.')
    );
  };

  const canConfigure = !scope.get();

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-200/50 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 dark:from-emerald-950/30 dark:via-[#1e2023] dark:to-[#1e2023] p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#0bbb81]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-[#0bbb81] p-3 text-white shadow-lg shadow-emerald-500/25"><Home className="h-6 w-6" /></span>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Home Office</h2>
              <p className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">Todos começam a semana com 100 pontos. Lance as ocorrências com print e motivo; na sexta, feche a semana.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <button type="button" aria-label="Semana anterior" onClick={() => setWeekId(shiftWeek(weekId, -1))} className="rounded-l-xl p-2.5 text-zinc-500 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[8.5rem] text-center text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{weekRangeLabel(weekId)}</span>
              <button type="button" aria-label="Próxima semana" disabled={weekId >= currentWeek} onClick={() => setWeekId(shiftWeek(weekId, 1))} className="rounded-r-xl p-2.5 text-zinc-500 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"><ChevronRight className="h-4 w-4" /></button>
            </div>
            {!scope.get() && (
              <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5" role="group" aria-label="Equipe">
                {(['teleservice', 'back-office'] as Team[]).map((t) => (
                  <button key={t} type="button" aria-pressed={team === t} onClick={() => { setTeam(t); setSelectedId(null); }}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${team === t ? 'bg-[#0bbb81] text-white shadow' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>{TEAM_LABEL[t]}</button>
                ))}
              </div>
            )}
            <button type="button" onClick={copyLink} className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"><Link2 className="h-4 w-4" /> Copiar link</button>
            {canConfigure && <button type="button" onClick={() => setShowConfig(true)} aria-label="Pesos e nota de corte" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5 text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"><Settings2 className="h-4 w-4" /></button>}
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Elegíveis', value: eligibleCount, tone: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Abaixo do corte', value: rows.length - eligibleCount, tone: 'text-rose-600 dark:text-rose-400' },
            { label: 'Aguardando ciência', value: awaitingAck, tone: 'text-sky-600 dark:text-sky-400' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{c.label}</p>
              <p className={`mt-1 text-3xl font-extrabold tabular-nums ${c.tone}`}>{loading ? '–' : c.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-2.5 lg:col-span-2">{[0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)}</div>
          <div className="lg:col-span-3"><Skeleton variant="card" /></div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={`Nenhum colaborador ativo em ${TEAM_LABEL[team]}`} description="Cadastre pessoas na aba Equipe para começar a pontuar." />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-5">
          <section className="space-y-3 lg:col-span-2" aria-label="Equipe">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{TEAM_LABEL[team]} · {rows.length}</h3>
              {openCount > 0 && (
                <button type="button" disabled={busy} onClick={closeAll} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-white px-3 py-1.5 text-[11px] font-bold text-white dark:text-zinc-900 transition hover:opacity-90 disabled:opacity-50 cursor-pointer">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />} Fechar equipe ({openCount})
                </button>
              )}
            </div>
            <HomeOfficeTeamList rows={rows} threshold={config.threshold} selectedId={selectedId} onSelect={setSelectedId} />
          </section>

          <section className="space-y-5 lg:col-span-3" aria-label="Detalhes da pessoa">
            {!selected ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-20 text-center">
                <Home className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Escolha uma pessoa para lançar ocorrências</p>
                <p className="mt-1 text-xs text-zinc-400">Nota de corte desta equipe: {config.threshold} pontos.</p>
              </div>
            ) : (
              <motion.div key={selected.tech.uid} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023] p-5">
                  <ScoreRing score={selected.score} threshold={config.threshold} size={92} label />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={selected.tech.name} photoURL={selected.tech.photoURL} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold text-zinc-900 dark:text-white">{selected.tech.name}</p>
                        <p className="text-xs font-medium text-zinc-400">{selected.tech.position}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {selected.score >= config.threshold ? `Elegível: ${selected.score - config.threshold} pontos acima do corte.` : `Faltam ${config.threshold - selected.score} pontos para o corte de ${config.threshold}.`}
                    </p>
                    {selected.week?.ackAt && selected.week.ackComment && (
                      <p className="mt-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 px-3 py-2 text-xs italic text-sky-800 dark:text-sky-200">“{selected.week.ackComment}”</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!selected.week ? (
                      <button type="button" disabled={busy} onClick={() => closeOne(selected)} className="flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-zinc-900 transition hover:opacity-90 disabled:opacity-50 cursor-pointer"><LockKeyhole className="h-4 w-4" /> Fechar semana</button>
                    ) : !selected.week.ackAt ? (
                      <button type="button" disabled={busy} onClick={() => reopen(selected)} className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-600 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"><LockOpen className="h-4 w-4" /> Reabrir</button>
                    ) : null}
                  </div>
                </div>

                <HomeOfficeEntryForm technician={selected.tech} categories={config.categories} locked={locked} onAdded={reload} />
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Ocorrências da semana</h3>
                  <HomeOfficePointList points={selectedPoints} locked={locked} onChanged={reload} />
                </div>
              </motion.div>
            )}
          </section>
        </div>
      )}

      {showConfig && <HomeOfficeConfigModal config={config} onClose={() => setShowConfig(false)} onSaved={reload} />}
    </div>
  );
}
