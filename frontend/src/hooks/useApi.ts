import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Load data on mount and whenever `deps` change. In-flight requests are
 * aborted when deps change or the component unmounts, so stale responses
 * never overwrite newer ones.
 */
export function useApi<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error).name === "AbortError") return;
        const error = err instanceof ApiError ? err : new ApiError(0, "Something went wrong. Please try again.");
        setState((s) => ({ ...s, error, loading: false }));
      });
    return () => controller.abort();
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setState((s) => ({ ...s, data: updater(s.data) }));
  }, []);

  return { ...state, reload, setData };
}
