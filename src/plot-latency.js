import { access, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DEFAULT_TZ = process.env.PLOT_TIMEZONE?.trim() || "Africa/Algiers";
const DEFAULT_WIDTH = 1400;
const DEFAULT_HEIGHT = 720;
const DEFAULT_LIMIT_DATE = localDateString(new Date(), DEFAULT_TZ);

async function main() {
  const args = process.argv.slice(2);
  const inputPath = await resolveInputPath(args[0]);
  const targetDate = args[1] || DEFAULT_LIMIT_DATE;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error(`Date must be in YYYY-MM-DD format, received "${targetDate}"`);
  }

  const entries = await loadEntries(inputPath, targetDate, DEFAULT_TZ);
  if (entries.length === 0) {
    throw new Error(`No entries found in ${inputPath} for ${targetDate} (${DEFAULT_TZ})`);
  }

  const stats = summarize(entries);
  const { svgPath, pngPath } = outputPaths(inputPath, targetDate);
  const svg = buildSvg({ entries, stats, targetDate, timezone: DEFAULT_TZ });
  await writeFile(svgPath, svg, "utf8");

  const pngResult = convertSvgToPng(svgPath, pngPath);

  console.log(`Input: ${inputPath}`);
  console.log(`Date: ${targetDate} (${DEFAULT_TZ})`);
  console.log(`Entries: ${stats.count}`);
  console.log(`Latency: min=${stats.min}ms p50=${stats.p50}ms p95=${stats.p95}ms max=${stats.max}ms`);
  console.log(`SVG: ${svgPath}`);

  if (pngResult.ok) {
    console.log(`PNG: ${pngPath} (${pngResult.tool})`);
  } else {
    console.log("PNG: skipped (no SVG converter found; install rsvg-convert or ImageMagick)");
  }
}

async function resolveInputPath(candidate) {
  if (candidate) {
    return path.resolve(process.cwd(), candidate);
  }

  const envPath = process.env.UPTIME_HISTORY_FILE?.trim();
  if (envPath) {
    return path.resolve(process.cwd(), envPath);
  }

  return path.resolve(process.cwd(), "data/uptime-checks.ndjson");
}

async function loadEntries(inputPath, targetDate, timeZone) {
  const raw = await readFile(inputPath, "utf8");
  const entries = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    if (typeof row.checkedAt !== "number" || typeof row.latencyMs !== "number") {
      continue;
    }

    const date = new Date(row.checkedAt);
    if (localDateString(date, timeZone) !== targetDate) {
      continue;
    }

    entries.push({
      checkedAt: row.checkedAt,
      date,
      latencyMs: row.latencyMs,
      state: row.state ?? "unknown",
      statusCode: row.statusCode ?? null,
      summary: row.summary ?? "",
      appName: row.appName ?? "Server",
      url: row.url ?? "",
    });
  }

  entries.sort((a, b) => a.checkedAt - b.checkedAt);
  return entries;
}

function summarize(entries) {
  const latencies = entries.map((entry) => entry.latencyMs).sort((a, b) => a - b);

  return {
    count: entries.length,
    min: latencies[0],
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    max: latencies.at(-1),
    start: entries[0].date,
    end: entries.at(-1).date,
    appName: entries[0].appName,
  };
}

function percentile(sorted, p) {
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index];
}

function outputPaths(inputPath, targetDate) {
  const directory = path.dirname(inputPath);
  const stem = path.basename(inputPath, path.extname(inputPath)).replace(/_uptime-checks$/, "");

  return {
    svgPath: path.join(directory, `${stem}_latency_${targetDate}.svg`),
    pngPath: path.join(directory, `${stem}_latency_${targetDate}.png`),
  };
}

function buildSvg({ entries, stats, targetDate, timezone }) {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  const margin = { top: 60, right: 30, bottom: 90, left: 90 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const spanSeconds = Math.max((stats.end.getTime() - stats.start.getTime()) / 1000, 1);
  const yMax = Math.max(100, Math.round(stats.max * 1.05));
  const timeLabel = makeTimeFormatter(timezone);

  const xPos = (date) => {
    const offset = (date.getTime() - stats.start.getTime()) / 1000;
    return margin.left + (offset / spanSeconds) * plotWidth;
  };

  const yPos = (latency) => margin.top + plotHeight - (latency / yMax) * plotHeight;
  const points = entries.map((entry) => `${xPos(entry.date).toFixed(2)},${yPos(entry.latencyMs).toFixed(2)}`).join(" ");

  const ticks = buildHourTicks(stats.start, stats.end, timezone).map((tick) => {
    const x = xPos(tick);
    return [
      `<line x1="${x.toFixed(2)}" y1="${margin.top}" x2="${x.toFixed(2)}" y2="${margin.top + plotHeight}" stroke="#e5ece7" stroke-width="1"/>`,
      `<text x="${x.toFixed(2)}" y="${height - margin.bottom + 28}" text-anchor="middle" font-size="12" font-family="Menlo, Consolas, monospace" fill="#536471">${escapeXml(timeLabel(tick))}</text>`,
    ].join("");
  }).join("");

  const yGrid = Array.from({ length: 6 }, (_, index) => {
    const value = (yMax * index) / 5;
    const y = yPos(value);
    return [
      `<line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${width - margin.right}" y2="${y.toFixed(2)}" stroke="#d7e0d9" stroke-width="1"/>`,
      `<text x="${margin.left - 12}" y="${(y + 5).toFixed(2)}" text-anchor="end" font-size="12" font-family="Menlo, Consolas, monospace" fill="#536471">${Math.round(value)} ms</text>`,
    ].join("");
  }).join("");

  const spikes = entries
    .filter((entry) => entry.latencyMs >= stats.p95)
    .map((entry) => `<circle cx="${xPos(entry.date).toFixed(2)}" cy="${yPos(entry.latencyMs).toFixed(2)}" r="2.8" fill="#c2410c"/>`)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="#fff8e8"/>`,
    `<stop offset="100%" stop-color="#f2f7f0"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="100%" height="100%" fill="#f7f7f2"/>`,
    `<rect width="100%" height="100%" fill="url(#bg)" opacity="0.7"/>`,
    `<text x="${margin.left}" y="32" font-size="28" font-family="Menlo, Consolas, monospace" fill="#1d2a33">Latency Across Time</text>`,
    `<text x="${margin.left}" y="52" font-size="14" font-family="Menlo, Consolas, monospace" fill="#536471">${escapeXml(stats.appName)} • ${escapeXml(targetDate)} • ${stats.count} checks • p50 ${stats.p50}ms • p95 ${stats.p95}ms • max ${stats.max}ms</text>`,
    yGrid,
    ticks,
    `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#94a3a8" stroke-width="1.2"/>`,
    `<polyline fill="none" stroke="#1f7a8c" stroke-width="1.4" points="${points}"/>`,
    spikes,
    `<rect x="${width - 260}" y="34" width="220" height="68" rx="10" fill="#ffffff" stroke="#d7e0d9"/>`,
    `<line x1="${width - 242}" y1="56" x2="${width - 202}" y2="56" stroke="#1f7a8c" stroke-width="2"/>`,
    `<text x="${width - 190}" y="60" font-size="13" font-family="Menlo, Consolas, monospace" fill="#1d2a33">Latency (ms)</text>`,
    `<circle cx="${width - 222}" cy="80" r="3" fill="#c2410c"/>`,
    `<text x="${width - 190}" y="84" font-size="13" font-family="Menlo, Consolas, monospace" fill="#1d2a33">p95+ spikes</text>`,
    `</svg>`,
  ].join("\n");
}

function buildHourTicks(start, end, timeZone) {
  const ticks = [];
  const current = new Date(start);
  current.setMinutes(0, 0, 0);
  current.setHours(current.getHours() + 1);

  while (current <= end) {
    ticks.push(new Date(current));
    current.setHours(current.getHours() + 1);
  }

  if (ticks.length === 0) {
    ticks.push(start, end);
  }

  return ticks;
}

function localDateString(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function makeTimeFormatter(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (date) => formatter.format(date);
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function convertSvgToPng(svgPath, pngPath) {
  const attempts = [
    {
      tool: "rsvg-convert",
      args: [svgPath, "-o", pngPath],
    },
    {
      tool: "magick",
      args: [svgPath, pngPath],
    },
  ];

  for (const attempt of attempts) {
    if (!commandExists(attempt.tool)) {
      continue;
    }

    const result = spawnSync(attempt.tool, attempt.args, { stdio: "pipe", encoding: "utf8" });
    if (result.status === 0) {
      return { ok: true, tool: attempt.tool };
    }
  }

  return { ok: false, tool: null };
}

function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
  return result.status === 0;
}

await main();
