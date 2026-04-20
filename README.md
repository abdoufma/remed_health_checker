# Remed Health Checker

Simple webhook-based uptime alerts for one on-prem server. Poll a local health endpoint and post to one Discord channel.

## How it works

- Uses a single Discord incoming webhook for message delivery.
- Polls one local health endpoint from the same machine.
- Tracks `DOWN`, `DEGRADED`, and `RECOVERED` states.
- Mentions one Discord role on `DOWN` alerts.
- Stores every check result locally for the last 7 days.
- Runs on plain Node.js 22 with no runtime dependencies.

## Configuration

Environment variables:

- `DISCORD_WEBHOOK_URL`: required Discord incoming webhook URL for the target channel.
- `DISCORD_ROLE_ID`: optional Discord role ID to mention on `DOWN` alerts.
- `DISCORD_WEBHOOK_DRY_RUN`: optional; when `true`, log the webhook payload instead of sending it.
- `DISCORD_WEBHOOK_USERNAME`: optional display name for webhook messages.
- `DISCORD_WEBHOOK_AVATAR_URL`: optional avatar image URL for webhook messages.
- `APP_NAME`: optional name shown in alert messages.
- `HEALTHCHECK_URL`: local endpoint to poll. Defaults to `http://127.0.0.1:3000/health`.
- `EXPECTED_STATUS`: expected HTTP status code. Defaults to `200`.
- `EXPECT_SUBSTRING`: optional substring that must be present in the response body.
- `CHECK_INTERVAL_MS`: poll interval. Defaults to `30000`.
- `REQUEST_TIMEOUT`: request timeout in milliseconds. Defaults to `30000`.
- `DEGRADED_TIMEOUT`: latency threshold for `DEGRADED` in milliseconds. Defaults to `10000`.
- `FAILURE_THRESHOLD`: consecutive failed checks before sending `DOWN`. Defaults to `2`.
- `RECOVERY_THRESHOLD`: consecutive healthy checks before sending `RECOVERED`. Defaults to `1`.
- `NOTIFY_ON_RECOVERY`: when `false`, suppress `RECOVERED` messages. Defaults to `true`.
- `NOTIFY_ON_DEGRADED`: when `false`, suppress `DEGRADED` messages. Defaults to `true`.
- `UPTIME_HISTORY_FILE`: optional path for the rolling 7-day history file. Defaults to `./data/uptime-checks.ndjson`.
- `REQUEST_TIMEOUT_MS` and `DEGRADED_TIMEOUT_MS` are still accepted as backward-compatible aliases.

## Running locally

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN \
DISCORD_ROLE_ID=123456789012345678 \
DISCORD_WEBHOOK_AVATAR_URL=https://cdn.discordapp.com/embed/avatars/2.png \
APP_NAME="Remed Server" \
npm start
```

For dry-run mode:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN \
DISCORD_ROLE_ID=123456789012345678 \
DISCORD_WEBHOOK_AVATAR_URL=https://cdn.discordapp.com/embed/avatars/2.png \
DISCORD_WEBHOOK_DRY_RUN=true \
npm start
```

The sample server in `test_server.ts` exposes `http://127.0.0.1:3000/health`.

## History

Every check is appended as newline-delimited JSON to `./data/uptime-checks.ndjson` by default. Entries older than 7 days are pruned automatically.

To inspect it in a readable format:

```bash
npm run history
```

To show a different number of recent entries:

```bash
npm run history -- 50
```

## Validate config

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN npm run validate:config
```

## Plot

Generate a latency plot from an NDJSON history file:

```bash
npm run plot -- data/chu_bm_uptime-checks.ndjson 2026-04-19
```

If you omit arguments, the script defaults to `data/uptime-checks.ndjson` and today in `Africa/Algiers`.

The script always writes an SVG and will also write a PNG when `rsvg-convert` or `magick` is available locally.

On Windows, `magick` from ImageMagick is the most likely PNG converter to be available.

## PM2

```bash
pm2 start ecosystem.config.js
```
