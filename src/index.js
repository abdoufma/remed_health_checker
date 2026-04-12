import { loadRuntimeConfig } from "./config.js";
import { log, logError } from "./logger.js";
import { startMonitor } from "./monitor.js";
import { DiscordWebhookNotifier } from "./notifier.js";

async function main() {
  const config = await loadRuntimeConfig();
  const notifier = new DiscordWebhookNotifier(config.webhook);

  log("Loaded runtime configuration", {
    appName: config.appName,
    healthcheckUrl: config.check.url,
    dryRun: config.dryRun,
  });

  startMonitor(config.appName, config.check, notifier);
}

main().catch((error) => {
  logError("Fatal startup error", error);
  process.exitCode = 1;
});
