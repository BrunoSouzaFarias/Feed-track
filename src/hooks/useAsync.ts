import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook que executa uma função assíncrona com timeout automático.
 * Se a promise não resolver em `timeoutMs`, define error com mensagem amigável.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  timeoutMs = 10_000
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const retryCount = useRef(0);

  const run = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    const timer = setTimeout(() => {
      setState({ data: null, loading: false, error: 'Tempo de carregamento esgotado. Verifique sua conexão.' });
    }, timeoutMs);

    try {
      const result = await fn();
      clearTimeout(timer);
      setState({ data: result, loading: false, error: null });
    } catch (err: any) {
      clearTimeout(timer);
      setState({ data: null, loading: false, error: err?.message ?? 'Erro ao carregar dados.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryCount.current]);

  useEffect(() => {
    run();
  }, [run]);

  const retry = useCallback(() => {
    retryCount.current += 1;
    run();
  }, [run]);

  return { ...state, retry };
}
