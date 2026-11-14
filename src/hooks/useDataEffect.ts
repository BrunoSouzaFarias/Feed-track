import { useEffect, useRef } from 'react';

/**
 * Busca dados quando `deps` mudam e entrega o resultado por callbacks
 * (setState só acontece DENTRO dos callbacks, após a promise resolver —
 * nunca de forma síncrona no corpo do effect). Ignora resultados de
 * execuções canceladas (deps mudaram / componente desmontou).
 * Os callbacks são lidos de refs: não precisam estar nas `deps`.
 */
export function useDataEffect<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  onError: (error: unknown) => void,
  deps: readonly unknown[]
): void {
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (data) => { if (!cancelled) onDataRef.current(data); },
      (err) => { if (!cancelled) onErrorRef.current(err); }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
