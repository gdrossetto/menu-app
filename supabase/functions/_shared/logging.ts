export function logFunctionError(
  context: string,
  error: unknown,
  metadata: Record<string, unknown> = {},
) {
  console.error(
    JSON.stringify({
      level: "error",
      context,
      metadata,
      error: serializeError(error),
      timestamp: new Date().toISOString(),
    }),
  );
}

export function getSafeErrorResponse(
  error: unknown,
  fallbackMessage: string,
): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "";

  if (message === "Unauthorized." || message === "Missing authorization header.") {
    return { status: 401, message };
  }

  if (message === "Restaurant not found.") {
    return { status: 404, message };
  }

  if (message === "Method not allowed.") {
    return { status: 405, message };
  }

  if (
    message.startsWith("Invalid request:") ||
    message.startsWith("Missing request:")
  ) {
    return { status: 400, message };
  }

  return { status: 500, message: fallbackMessage };
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
