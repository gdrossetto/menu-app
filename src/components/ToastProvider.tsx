import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext";
import type { Toast, ToastContextValue, ToastInput, ToastTone } from "./toastContext";

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
  info: "border-slate-200 bg-white text-slate-950",
};

const iconClasses: Record<ToastTone, string> = {
  success: "text-emerald-600",
  error: "text-red-600",
  info: "text-slate-500",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  const className = `mt-0.5 h-5 w-5 shrink-0 ${iconClasses[tone]}`;

  if (tone === "success") return <CheckCircle2 className={className} />;
  if (tone === "error") return <AlertCircle className={className} />;
  return <Info className={className} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      description,
      tone = "info",
      durationMs = tone === "error" ? 7000 : 4500,
    }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current.slice(-3),
        { id, title, description, tone, durationMs },
      ]);

      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, description) =>
        showToast({ title, description, tone: "success" }),
      error: (title, description) =>
        showToast({ title, description, tone: "error" }),
      info: (title, description) =>
        showToast({ title, description, tone: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 bottom-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-app-lg backdrop-blur-md ${toneClasses[toast.tone]}`}
          >
            <ToastIcon tone={toast.tone} />
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-semibold leading-tight">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="mt-1 text-[0.85rem] leading-snug opacity-75">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-full p-1 opacity-50 transition-opacity hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
