import { useCallback, useEffect, useState } from "react";

/** Loads data from the backend on mount; `reload()` refetches. */
export function useLoad<T>(fn: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const reload = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    fn().then((d) => { setData(d); setError(""); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}
