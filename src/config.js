function parseBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(name, rawValue, fallback) {
  const value = rawValue == null || rawValue === "" ? fallback : Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function parseExpectedStatus(rawValue) {
  const value = rawValue == null || rawValue === "" ? 200 : Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new Error("EXPECTED_STATUS must be a valid HTTP status code");
  }

  return value;
}

export async function loadRuntimeConfig() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is required");
  }

  const roleId = process.env.DISCORD_ROLE_ID?.trim() || "";

  return {
    appName: process.env.APP_NAME?.trim() || "Remed Server",
    dryRun: parseBoolean(process.env.DISCORD_WEBHOOK_DRY_RUN, false),
    webhook: {
      url: webhookUrl,
      dryRun: parseBoolean(process.env.DISCORD_WEBHOOK_DRY_RUN, false),
      username: process.env.DISCORD_WEBHOOK_USERNAME?.trim() || "Health Checker",
      roleMention: roleId ? `<@&${roleId}>` : "",
    },
    check: {
      url: process.env.HEALTHCHECK_URL?.trim() || "http://127.0.0.1:3000/health",
      intervalMs: parsePositiveInteger("CHECK_INTERVAL_MS", process.env.CHECK_INTERVAL_MS, 30_000),
      timeoutMs: parsePositiveInteger("REQUEST_TIMEOUT_MS", process.env.REQUEST_TIMEOUT_MS, 5_000),
      failureThreshold: parsePositiveInteger("FAILURE_THRESHOLD", process.env.FAILURE_THRESHOLD, 2),
      recoveryThreshold: parsePositiveInteger("RECOVERY_THRESHOLD", process.env.RECOVERY_THRESHOLD, 1),
      expectedStatus: parseExpectedStatus(process.env.EXPECTED_STATUS),
      expectSubstring: process.env.EXPECT_SUBSTRING?.trim() || "",
    },
  };
}
