import { useEffect, useState, type DependencyList } from "react";

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Small fetch-on-deps-change hook. Deliberately minimal (no cache/retry) —
// this app doesn't need a full data-fetching library, just loading/error
// states around the mock API calls used across booking and agenda.
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, enabled = true) {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    // Resets to loading whenever deps change, before the async call below settles.
    setState({ status: "loading" });
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: err instanceof Error ? err.message : "Erro inesperado",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
