type LogLevel = "info" | "warn" | "error";

interface LogDetails {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, details: LogDetails) {
  const payload = {
    level,
    message: details.message,
    context: details.context,
    metadata: details.metadata,
    error: serializeError(details.error),
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error("[MenuQR]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[MenuQR]", payload);
    return;
  }

  if (import.meta.env.DEV) {
    console.info("[MenuQR]", payload);
  }
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    writeLog("info", { message, metadata });
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    writeLog("warn", { message, metadata });
  },
  error(message: string, error?: unknown, metadata?: Record<string, unknown>) {
    writeLog("error", { message, error, metadata });
  },
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
