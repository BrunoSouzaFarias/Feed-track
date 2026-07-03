export type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number; nanoseconds: number }
  | { _seconds: number; _nanoseconds?: number }
  | string
  | number
  | Date
  | null
  | undefined;

/** Normaliza qualquer formato de timestamp para Date */
export function parseDate(val: TimestampLike): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof (val as any).toDate === 'function') return (val as any).toDate();
  if (typeof (val as any).seconds === 'number') return new Date((val as any).seconds * 1000);
  if (typeof (val as any)._seconds === 'number') return new Date((val as any)._seconds * 1000);
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Cria um timestamp no formato { seconds, nanoseconds } compatível com Firestore mock */
export function nowTimestamp(): { seconds: number; nanoseconds: number } {
  const ms = Date.now();
  return { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1_000_000 };
}

/** Formata uma data para exibição em pt-BR */
export function formatDate(val: TimestampLike, options?: Intl.DateTimeFormatOptions): string {
  return parseDate(val).toLocaleDateString('pt-BR', options ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Parseia uma data 'YYYY-MM-DD' (ex: prazos de PDI) no fuso horário LOCAL,
 *  em vez de UTC — new Date('YYYY-MM-DD') interpreta como UTC meia-noite,
 *  o que marca metas como vencidas até 1 dia antes em fusos negativos (ex: Brasil). */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
