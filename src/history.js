import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { log, logError } from "./logger.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class UptimeHistory {
  constructor(config) {
    this.filePath = path.resolve(process.cwd(), config.filePath);
    this.retentionMs = config.retentionDays * ONE_DAY_MS;
    this.nextPruneAt = 0;
  }

  async initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await this.prune(Date.now(), true);
  }

  async record(entry) {
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, `${JSON.stringify(entry)}\n`, { flag: "a" });

      const now = Date.now();
      if (now >= this.nextPruneAt) {
        await this.prune(now, false);
      }
    } catch (error) {
      logError("Failed to persist uptime history", error, { filePath: this.filePath });
    }
  }

  async prune(now, force) {
    try {
      const cutoff = now - this.retentionMs;
      let raw = "";

      try {
        raw = await readFile(this.filePath, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") {
          this.nextPruneAt = now + ONE_DAY_MS;
          return;
        }

        throw error;
      }

      const keptLines = [];
      for (const line of raw.split("\n")) {
        if (!line.trim()) {
          continue;
        }

        try {
          const entry = JSON.parse(line);
          if (typeof entry.checkedAt === "number" && entry.checkedAt >= cutoff) {
            keptLines.push(JSON.stringify(entry));
          }
        } catch {
          // Ignore malformed lines while compacting the retained history.
        }
      }

      const nextContents = keptLines.length > 0 ? `${keptLines.join("\n")}\n` : "";
      await writeFile(this.filePath, nextContents);
      this.nextPruneAt = now + ONE_DAY_MS;

      if (force) {
        log("Initialized uptime history retention", {
          filePath: this.filePath,
          retentionDays: Math.round(this.retentionMs / ONE_DAY_MS),
        });
      }
    } catch (error) {
      logError("Failed to prune uptime history", error, { filePath: this.filePath });
    }
  }
}
