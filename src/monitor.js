import { log, logError } from "./logger.js";

async function runCheck(check) {
  const checkedAt = Date.now();
  const startedAt = performance.now();

  try {
    const response = await fetch(check.url, {
      method: "GET",
      signal: AbortSignal.timeout(check.timeoutMs),
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (response.status !== check.expectedStatus) {
      return {
        state: "down",
        failureKind: "response",
        checkedAt,
        latencyMs,
        url: check.url,
        statusCode: response.status,
        summary: `Unexpected HTTP ${response.status}; expected ${check.expectedStatus}`,
      };
    }

    if (check.expectSubstring) {
      const bodyText = await response.text();
      if (!bodyText.includes(check.expectSubstring)) {
        return {
          state: "down",
          failureKind: "response",
          checkedAt,
          latencyMs,
          url: check.url,
          statusCode: response.status,
          summary: `Response did not contain "${check.expectSubstring}"`,
        };
      }
    }

    if (check.degradedTimeoutMs > 0 && latencyMs >= check.degradedTimeoutMs) {
      return {
        state: "degraded",
        checkedAt,
        latencyMs,
        url: check.url,
        degradedTimeoutMs: check.degradedTimeoutMs,
        statusCode: response.status,
        summary: `Slow response (${latencyMs}ms >= ${check.degradedTimeoutMs}ms)`,
      };
    }

    return {
      state: "healthy",
      checkedAt,
      latencyMs,
      url: check.url,
      statusCode: response.status,
      summary: `HTTP ${response.status}`,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const isTimeout = error?.name === "TimeoutError";

    return {
      state: "down",
      failureKind: isTimeout ? "timeout" : "fetch",
      checkedAt,
      latencyMs,
      url: check.url,
      statusCode: null,
      timeoutMs: isTimeout ? check.timeoutMs : undefined,
      summary: error?.name === "TimeoutError"
        ? `Timed out after ${check.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export function startMonitor(appName, check, notifier) {
  const state = {
    currentState: "unknown",
    lastObservedState: "unknown",
    streak: 0,
    running: false,
  };

  function thresholdFor(nextState) {
    if (nextState === "down") {
      return check.failureThreshold;
    }

    if (nextState === "healthy") {
      return check.recoveryThreshold;
    }

    return 1;
  }

  function shouldNotify(nextState) {
    if (nextState === "healthy") {
      return check.notifyOnRecovery;
    }

    if (nextState === "degraded") {
      return check.notifyOnDegraded;
    }

    return true;
  }

  async function tick() {
    if (state.running) {
      scheduleNext();
      return;
    }

    state.running = true;

    try {
      const result = await runCheck(check);
      await notifier.recordHistory({
        appName,
        ...result,
      });

      if (state.lastObservedState === result.state) {
        state.streak += 1;
      } else {
        state.lastObservedState = result.state;
        state.streak = 1;
      }

      const threshold = thresholdFor(result.state);

      if (state.currentState === "unknown" && state.streak >= threshold) {
        state.currentState = result.state;
        if (shouldNotify(result.state)) {
          await notifier.sendAlert({
            appName,
            nextState: result.state,
            result: enrichAlertResult(result, state.streak),
          });
          log("Initial state alert sent", {
            appName,
            state: result.state,
            summary: result.summary,
          });
        } else {
          log("Initial health state established", {
            appName,
            state: result.state,
            summary: result.summary,
          });
        }
      } else if (state.currentState !== result.state && state.streak >= threshold) {
        state.currentState = result.state;
        if (shouldNotify(result.state)) {
          await notifier.sendAlert({
            appName,
            nextState: result.state,
            result: enrichAlertResult(result, state.streak),
          });
        }
        log("Health state changed", {
          appName,
          state: result.state,
          summary: result.summary,
        });
      }
    } catch (error) {
      logError("Unexpected monitor loop failure", error, { appName });
    } finally {
      state.running = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    setTimeout(tick, check.intervalMs);
  }

  log("Starting health check loop", {
    appName,
    url: check.url,
    intervalMs: check.intervalMs,
    degradedTimeoutMs: check.degradedTimeoutMs,
  });

  void tick();
}

function enrichAlertResult(result, attempts) {
  return result.state === "down"
    ? {
        ...result,
        attempts,
      }
    : result;
}
