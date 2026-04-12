# Remed Health Checker

Simple webhook-based uptime alerts for one on-prem server. Poll a local health endpoint and post to one Discord channel.

## How it works

- Uses a single Discord incoming webhook for message delivery.
- Polls one local health endpoint from the same machine.
- Sends alerts only when the server changes state between `DOWN` and `RECOVERED`.
- Mentions one Discord role on `DOWN` alerts.
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
- `REQUEST_TIMEOUT_MS`: request timeout. Defaults to `5000`.
- `FAILURE_THRESHOLD`: consecutive failed checks before sending `DOWN`. Defaults to `2`.
- `RECOVERY_THRESHOLD`: consecutive healthy checks before sending `RECOVERED`. Defaults to `1`.

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

## Validate config

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN npm run validate:config
```

## PM2

```bash
pm2 start ecosystem.config.js
```
