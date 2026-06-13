# Clay Oracle

Throw a pot. Receive a personality reading. Get a playlist.

Clay Oracle divines your inner self from the shape, glaze, and decoration of the vessel you build — then hands you a bespoke reading and a soundtrack to match. Backed by a DeepSeek LLM (or warm canned blurbs when the key is absent), a SQLite shelf of past pots, and a lot of affection for the craft.

---

## Local dev

```bash
pnpm install
pnpm dev          # starts on :3478
```

Open [http://localhost:3478](http://localhost:3478).

No API key needed — the app falls back to archetype blurbs automatically when `DEEPSEEK_API_KEY` is not set.

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `DB_PATH` | `./data/oracle.db` | SQLite database path; directory is created on startup |
| `DEEPSEEK_API_KEY` | *(unset)* | Optional. Without it, readings use canned archetype blurbs |
| `LLM_BASE_URL` | `https://api.deepseek.com` | Override to use a compatible proxy |
| `LLM_MODEL` | `deepseek-chat` | Any DeepSeek-compatible model name |

---

## Deploy

Clay Oracle runs as a Docker container on the shared Hetzner box alongside ClayDate, reachable at **oracle.claydate.nyc** via ClayDate's existing Caddy reverse proxy.

The service joins the `claydate_default` Docker network so Caddy can reach it by the hostname `clay-oracle-app` on port 3000. No ports are published directly.

### Required GitHub secrets

| Secret | Value |
|---|---|
| `HETZNER_IP` | Public IPv4 of the server (same as ClayDate) |
| `SSH_PRIVATE_KEY` | Private key for root access (same as ClayDate) |
| `SSH_HOST_FINGERPRINT` | SHA256 host key fingerprint (same as ClayDate) |

Push to `main` triggers an SSH deploy: `git pull` → `docker compose up -d --build` → `docker image prune -f`.

On the server the repo lives at `/opt/clay-oracle`.

### First-time server setup

```bash
cd /opt
git clone <repo-url> clay-oracle
cd clay-oracle
# Optionally create /opt/clay-oracle/.env with DEEPSEEK_API_KEY=sk-...
docker compose up -d --build
```

The `oracledata` volume persists the SQLite database across deploys.
