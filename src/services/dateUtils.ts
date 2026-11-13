export type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number; _nanoseconds?: number }
  | string
  | number
  | Date
  | null
  | undefined;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Tenta converter; devolve `null` quando o valor é vazio ou inválido. */
export function tryParseDate(val: TimestampLike): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (isObj(val)) {
    const o: Record<string, unknown> = val;
    if (typeof o.toDate === 'function') return (o.toDate as () => Date).call(val);
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
    if (typeof o._seconds === 'number') return new Date(o._seconds * 1000);
    return null;
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normaliza qualquer formato de timestamp para Date.
 * Valores vazios/inválidos viram a época (1970), NÃO "agora" — assim um dado
 * corrompido não aparece como "criado agora" nem distorce métricas/relatórios.
 * Use `tryParseDate` quando precisar distinguir "ausente" de "válido".
 */
export function parseDate(val: TimestampLike): Date {
  return tryParseDate(val) ?? new Date(0);
}

/** Formata uma data para exibição em pt-BR ('—' quando ausente/inválida). */
export function formatDate(val: TimestampLike, options?: Intl.DateTimeFormatOptions): string {
  const d = tryParseDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', options ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Parseia 'YYYY-MM-DD' no fuso LOCAL (new Date('YYYY-MM-DD') seria UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Dias inteiros decorridos desde `date` (nunca negativo, mesmo com relógio adiantado). */
export function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

/** Dias inteiros entre agora e `date` (negativo = passado). */
export function daysFromNow(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / 86_400_000);
}
