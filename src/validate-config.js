import { loadRuntimeConfig } from "./config.js";

const config = await loadRuntimeConfig();

console.log(JSON.stringify({
  appName: config.appName,
  healthcheckUrl: config.check.url,
  expectedStatus: config.check.expectedStatus,
  failureThreshold: config.check.failureThreshold,
  recoveryThreshold: config.check.recoveryThreshold,
  dryRun: config.dryRun,
}, null, 2));
