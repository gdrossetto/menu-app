import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { ConfirmContext } from "./confirmContext";
import type { ConfirmOptions, ConfirmState } from "./confirmContext";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        id: crypto.randomUUID(),
        tone: "default",
        ...options,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="modal-overlay px-4" onClick={() => close(false)}>
          <div
            className="w-full max-w-md rounded-[1.25rem] bg-app-surface p-6 shadow-app-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  state.tone === "danger"
                    ? "bg-red-50 text-red-600"
                    : "bg-app-surface-hover text-app-primary"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-app-text">
                  {state.title}
                </h2>
                {state.description ? (
                  <p className="mt-1 text-[0.92rem] text-app-text-muted">
                    {state.description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => close(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={
                  state.tone === "danger"
                    ? "btn btn-danger"
                    : "btn btn-primary"
                }
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
