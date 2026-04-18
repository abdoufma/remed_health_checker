import { loadRuntimeConfig } from "./config.js";
import { UptimeHistory } from "./history.js";
import { log, logError } from "./logger.js";
import { startMonitor } from "./monitor.js";
import { DiscordWebhookNotifier } from "./notifier.js";

async function main() {
  const config = await loadRuntimeConfig();
  const notifier = new DiscordWebhookNotifier(config.webhook);
  const history = new UptimeHistory(config.history);
  await history.initialize();
  notifier.recordHistory = history.record.bind(history);

  log("Loaded runtime configuration", {
    appName: config.appName,
    healthcheckUrl: config.check.url,
    dryRun: config.dryRun,
    degradedTimeoutMs: config.check.degradedTimeoutMs,
  });

  startMonitor(config.appName, config.check, notifier);
}

main().catch((error) => {
  logError("Fatal startup error", error);
  process.exitCode = 1;
});
