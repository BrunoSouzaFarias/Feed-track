import { useState, useEffect, useCallback, useRef } from 'react';
import { friendlyError } from '../services/errors';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Hook que executa uma função assíncrona com timeout automático.
 * Se a promise não resolver em `timeoutMs`, define error com mensagem amigável.
 * `fn` é lida de um ref (não precisa de useCallback no chamador); reexecuta
 * quando `deps` mudam ou quando `retry()` é chamado.
 * `loading` é DERIVADO: true enquanto o resultado guardado não pertence à
 * execução atual (chave deps+tentativa) — sem setState síncrono em effect.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  timeoutMs = 10_000
): AsyncState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: '', data: null, error: null });
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const key = `${JSON.stringify(deps)}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    const finish = (data: T | null, error: string | null) => {
      if (!cancelled) setSettled({ key, data, error });
    };
    const timer = setTimeout(
      () => finish(null, 'Tempo de carregamento esgotado. Verifique sua conexão.'),
      timeoutMs
    );
    fnRef.current().then(
      (result) => { clearTimeout(timer); finish(result, null); },
      (err) => { clearTimeout(timer); finish(null, friendlyError(err, 'Erro ao carregar dados.')); }
    );
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, timeoutMs]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const done = settled.key === key;
  return { data: done ? settled.data : null, loading: !done, error: done ? settled.error : null, retry };
}
