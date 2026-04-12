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
          summary: `Response did not contain "${check.expectSubstring}"`,
        };
      }
    }

    return {
      state: "healthy",
      checkedAt,
      latencyMs,
      url: check.url,
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
    return nextState === "down" ? check.failureThreshold : check.recoveryThreshold;
  }

  async function tick() {
    if (state.running) {
      scheduleNext();
      return;
    }

    state.running = true;

    try {
      const result = await runCheck(check);

      if (state.lastObservedState === result.state) {
        state.streak += 1;
      } else {
        state.lastObservedState = result.state;
        state.streak = 1;
      }

      const threshold = thresholdFor(result.state);

      if (state.currentState === "unknown" && state.streak >= threshold) {
        state.currentState = result.state;
        if (result.state === "down") {
          await notifier.sendAlert({
            appName,
            nextState: result.state,
            result: {
              ...result,
              attempts: state.streak,
            },
          });
          log("Initial down alert sent", {
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
        await notifier.sendAlert({
          appName,
          nextState: result.state,
          result: result.state === "down"
            ? {
                ...result,
                attempts: state.streak,
              }
            : result,
        });
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
  });

  void tick();
}
