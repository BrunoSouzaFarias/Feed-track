import { useState, useEffect, useCallback, useRef } from 'react';
import { friendlyError } from '../services/errors';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook que executa uma função assíncrona com timeout automático.
 * Se a promise não resolver em `timeoutMs`, define error com mensagem amigável.
 * `fn` é lida de um ref, então não precisa de useCallback no chamador; a
 * função é reexecutada quando `deps` mudam ou quando `retry()` é chamado.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  timeoutMs = 10_000
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    const timer = setTimeout(() => {
      if (!cancelled) {
        setState({ data: null, loading: false, error: 'Tempo de carregamento esgotado. Verifique sua conexão.' });
      }
    }, timeoutMs);

    fnRef.current().then(
      (result) => {
        clearTimeout(timer);
        if (!cancelled) setState({ data: result, loading: false, error: null });
      },
      (err) => {
        clearTimeout(timer);
        if (!cancelled) setState({ data: null, loading: false, error: friendlyError(err, 'Erro ao carregar dados.') });
      }
    );

    return () => { cancelled = true; clearTimeout(timer); };
  }, [depsKey, attempt, timeoutMs]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
