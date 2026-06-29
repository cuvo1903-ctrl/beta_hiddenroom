# Debian Server Map

Last verified by SSH diagnostic session: 2026-06-28 local project context / 2026-06-29 UTC command output.

## Access

- Hostname: `mysauth`.
- Tailscale SSH target: `prodxdack@100.106.132.42`.
- Usual shell home: `/home/prodxdack`.
- Public cloud domain: `cloud.hiddenroom.mx`.

Use read-only diagnostics first. Redact secrets from any output before reporting.

## Active Cloud Routing

The active public path is Cloudflare Tunnel, not Nginx:

```text
Cloudflare -> cloudflared tunnel hiddenroom-cloud -> http://localhost:8080 -> Docker File Browser
```

Observed config:

- Service: `cloudflared.service`, active/running.
- Config: `/etc/cloudflared/config.yml`.
- Tunnel UUID: `406771ae-f4c6-4083-91f3-c47736cab3d2`.
- Tunnel name: `hiddenroom-cloud`.
- Ingress: `cloud.hiddenroom.mx` -> `http://localhost:8080`.

No active `nginx.service` was found during diagnostics, and no Nginx site was found controlling `cloud.hiddenroom.mx`.

## File Browser Fallback

File Browser is running in Docker:

- Container name: `filebrowser`.
- Image: `filebrowser/filebrowser`.
- Version label: `2.63.15`.
- Host port: `8080`.
- Container port: `80`.
- Process shape: `containerd-shim` -> `tini` -> `filebrowser --config=/config/settings.json`.

Mounts:

- Host `/home/prodxdack/filebrowser` -> container `/config`.
- Docker volume `/var/lib/docker/volumes/3ec126e28c06e90fd98b381ae61e31b0bcb355014dc183d846e1cfe913b2565c/_data` -> container `/database`.
- Host `/home/prodxdack/hiddenroom` -> container `/srv`.

File Browser settings:

- Config file on host: `/home/prodxdack/filebrowser/settings.json`.
- Root in container: `/srv`.
- Root on host: `/home/prodxdack/hiddenroom`.
- Database in container: `/database/filebrowser.db`.

Treat File Browser as a temporary fallback. Do not remove it or repoint public traffic away from it without explicit approval.

## MysAuth Cloud Agent

Observed path:

- Agent directory: `/home/prodxdack/mysauth-agents/cloud-agent/`.
- Main file: `/home/prodxdack/mysauth-agents/cloud-agent/agent.js`.
- Package file: `/home/prodxdack/mysauth-agents/cloud-agent/package.json`.
- Service: `/etc/systemd/system/mysauth-cloud-agent.service`.
- Service command: `WorkingDirectory=/home/prodxdack/mysauth-agents/cloud-agent`, `ExecStart=/usr/bin/npm start`.

Implementation shape:

- Node.js worker, not Express.
- Uses `cloud_jobs` and Supabase REST/storage.
- Uses `@supabase/supabase-js`, `dotenv`, and `ws` dependencies.
- Validates filesystem paths with `path.resolve`, `path.relative`, and child-name checks.

Known live issue:

- `mysauth-cloud-agent.service` is enabled but fails in auto-restart.
- Logs report missing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CLOUD_HIDDENROOM_ROOT`.
- `.env` exists but currently uses `CLOUD_ROOT`, while `agent.js` expects `CLOUD_HIDDENROOM_ROOT`.
- The systemd unit does not declare `EnvironmentFile`; the code also did not show a `dotenv` load at the top during diagnostics.

Before starting or restarting the service, align env loading and variable names with the agent code and confirm the fixed root is `/home/prodxdack/hiddenroom`.

## Recommended Target Architecture

Preferred secure Cloud flow:

```text
Portal/Dashboard MysAuth
  -> Supabase Auth + Edge Functions
  -> cloud_jobs queue
  -> mysauth-cloud-agent on Debian
  -> /home/prodxdack/hiddenroom
```

For a public custom MysAuth Cloud UI/backend, choose one entry path before implementation:

- `Cloudflare Tunnel -> MysAuth Cloud Node/Express backend/UI`, with File Browser bound internally as fallback.
- `Cloudflare Tunnel -> Nginx -> MysAuth Cloud backend/UI`, if local reverse-proxy routing is desired.

Do not assume Nginx exists or is active; install/configure it only after approval.

## Diagnostic Commands

Safe read-only checks:

```bash
whoami
hostname
pwd
systemctl status cloudflared --no-pager
systemctl status mysauth-cloud-agent --no-pager
ss -tulpn
docker ps
docker inspect filebrowser
journalctl -u mysauth-cloud-agent -n 80 --no-pager
cat /home/prodxdack/filebrowser/settings.json
```

When reading `.env` or Cloudflare credentials, print key names only or replace values with `[REDACTED]`.
