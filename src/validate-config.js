import { loadRuntimeConfig } from "./config.js";

const config = await loadRuntimeConfig();

console.log(JSON.stringify({
  appName: config.appName,
  healthcheckUrl: config.check.url,
  expectedStatus: config.check.expectedStatus,
  degradedTimeoutMs: config.check.degradedTimeoutMs,
  failureThreshold: config.check.failureThreshold,
  recoveryThreshold: config.check.recoveryThreshold,
  notifyOnRecovery: config.check.notifyOnRecovery,
  notifyOnDegraded: config.check.notifyOnDegraded,
  historyFile: config.history.filePath,
  dryRun: config.dryRun,
}, null, 2));
