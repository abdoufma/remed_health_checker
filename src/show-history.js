import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_HISTORY_FILE = "./data/uptime-checks.ndjson";
const DEFAULT_LIMIT = 20;

function parseLimit(argv) {
  const raw = argv.find((arg) => !arg.startsWith("--"))
    ?? argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]
    ?? DEFAULT_LIMIT;

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Limit must be a positive integer");
  }

  return value;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toISOString();
}

function formatStatus(entry) {
  if (entry.state === "down") {
    return "DOWN";
  }

  if (entry.state === "degraded") {
    return "DEGRADED";
  }

  return "HEALTHY";
}

function formatDetails(entry) {
  if (entry.failureKind === "timeout" && Number.isInteger(entry.timeoutMs)) {
    return `Timed out after ${entry.timeoutMs}ms`;
  }

  return entry.summary ?? "-";
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  const filePath = path.resolve(process.cwd(), process.env.UPTIME_HISTORY_FILE ?? DEFAULT_HISTORY_FILE);

  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(`No history file found at ${filePath}`);
      return;
    }

    throw error;
  }

  const entries = raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.checkedAt - a.checkedAt);

  if (entries.length === 0) {
    console.log(`No history entries found in ${filePath}`);
    return;
  }

  const counts = {
    healthy: 0,
    degraded: 0,
    down: 0,
  };

  for (const entry of entries) {
    if (entry.state in counts) {
      counts[entry.state] += 1;
    }
  }

  console.log(`History file: ${filePath}`);
  console.log(`Entries: ${entries.length}`);
  console.log(`State counts: healthy=${counts.healthy} degraded=${counts.degraded} down=${counts.down}`);
  console.log("");

  for (const entry of entries.slice(0, limit)) {
    console.log(
      [
        formatTimestamp(entry.checkedAt),
        formatStatus(entry),
        `${entry.latencyMs ?? "-"}ms`,
        entry.statusCode ?? "-",
        formatDetails(entry),
      ].join(" | "),
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
