/**
 * Monitoramento mínimo de erros em produção (sem dependência externa).
 *
 * Se `VITE_ERROR_REPORT_URL` estiver definida (ex.: endpoint de uma Cloud
 * Function, Sentry "envelope"/webhook, Logtail...), erros não tratados são
 * enviados por `sendBeacon` — SEM dados pessoais: só mensagem, pilha truncada,
 * caminho da URL (sem query/hash), versão e user agent.
 * Sem a variável, apenas registra no console (comportamento anterior).
 *
 * Proteções: no máximo MAX_REPORTS por sessão e deduplicação por mensagem.
 */
const MAX_REPORTS = 10;
const seen = new Set<string>();
let sent = 0;

export interface ErrorReport {
  message: string;
  stack?: string;
  source: string;
  path: string;
  ua: string;
  ts: string;
}

export function buildReport(error: unknown, source: string): ErrorReport {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido');
  return {
    message: err.message.slice(0, 300),
    stack: err.stack?.split('\n').slice(0, 12).join('\n').slice(0, 2000),
    source,
    path: typeof location !== 'undefined' ? location.pathname : '',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ts: new Date().toISOString(),
  };
}

export function reportError(error: unknown, source = 'app'): void {
  const report = buildReport(error, source);
  console.error(`[${source}]`, error);

  const url: string | undefined = import.meta.env.VITE_ERROR_REPORT_URL;
  if (!url || sent >= MAX_REPORTS) return;
  const key = `${source}:${report.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;
  try {
    const body = JSON.stringify(report);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch {
    /* monitoramento nunca pode quebrar o app */
  }
}

export function initMonitoring(): void {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window.onerror'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandledrejection'));
}
