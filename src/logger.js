function timestamp() {
  return new Date().toISOString();
}

export function log(message, context = {}) {
  const suffix = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";
  console.log(`[${timestamp()}] ${message}${suffix}`);
}

export function logError(message, error, context = {}) {
  const enrichedContext = {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  };

  log(message, enrichedContext);
}
