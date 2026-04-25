# Ollama VPS — provisioning runbook

This directory has everything you need to bring up the Ollama box
that hosts the chat + embedding models behind the in-app AI assistant.

The architecture: the standalone (typically on Vercel) calls
`https://ollama.example.com/api/{chat,embed,tags}` over HTTPS. Caddy
on the VPS terminates TLS, validates a bearer token, and forwards to
Ollama on the loopback.

## Pick a host

Any modern Linux box with Docker works. Sizing depends on the
chat model:

| Chat model               | Min RAM | Tokens/sec (CPU) | Tokens/sec (GPU) | Quality |
| ------------------------ | ------- | ---------------- | ---------------- | ------- |
| `qwen2.5:7b-instruct`    | 8 GB    | 5–10             | 50+              | Good    |
| `qwen2.5:14b-instruct`   | 16 GB   | 3–5              | 30+              | **Default — recommended** |
| `qwen2.5:32b-instruct`   | 24 GB   | 1–2              | 20+              | Excellent |
| `qwen2.5:72b-instruct`   | 48 GB   | 0.5–1 (painful)  | 10+              | Best    |

The embedding model `bge-m3` is small (~1 GB RAM) and runs in
parallel with the chat model.

### Recommended providers

- **Hetzner Cloud** — best price/perf for CPU. CCX23 (4 vCPU dedicated
  + 16 GB RAM) at ~€15/mo runs the 14B model at 3–5 tok/s. CPX51
  (16 vCPU + 32 GB RAM) at ~€55/mo runs the 32B model.
- **Hetzner GEX44** — single H100 GPU, ~€800/mo. Overkill unless
  you're scaling to many concurrent users.
- **fly.io** — 8x A100 boxes, expensive but spiky-traffic friendly.
- **DigitalOcean** — pricier than Hetzner for the same RAM.

## Provision

The following assumes Ubuntu 22.04 / 24.04 on a fresh Hetzner box.

### 1. Install Docker

```bash
ssh root@$VPS_IP
apt update && apt -y upgrade
apt install -y docker.io docker-compose-plugin
systemctl enable --now docker
```

### 2. Set up DNS

Point `ollama.example.com` (your subdomain) to the VPS IP **before
starting Caddy** — Caddy fetches a Let's Encrypt cert on first launch.

### 3. Generate a shared secret

```bash
openssl rand -base64 48
```

Save this as `OLLAMA_AUTH_TOKEN`. You'll set it on both the VPS
(in `docker-compose.yml`) and in your Vercel project env vars.

### 4. Drop these files on the VPS

```bash
mkdir -p /opt/ollama
cd /opt/ollama
# Copy docker-compose.yml, Caddyfile, init-models.sh from this directory
```

Edit `Caddyfile` and replace `ollama.example.com` with your real
hostname.

Edit `docker-compose.yml` and add the Caddy env var:

```yaml
  caddy:
    # ... existing fields ...
    environment:
      OLLAMA_AUTH_TOKEN: "your-secret-from-step-3"
```

### 5. Boot

```bash
chmod +x init-models.sh
docker compose up -d
docker compose exec ollama sh /opt/init-models.sh
```

The model pull takes 5–15 minutes depending on your network. Monitor
with `docker compose logs -f ollama`.

### 6. Verify

```bash
# From the VPS itself:
curl -fsS http://127.0.0.1:11434/api/tags

# From your laptop, with the bearer token:
curl -fsS -H "Authorization: Bearer $OLLAMA_AUTH_TOKEN" \
  https://ollama.example.com/api/tags
```

Expected output: a JSON list including both models.

### 7. Configure the standalone

In your Vercel project (or wherever the standalone runs), set:

```
OLLAMA_BASE_URL=https://ollama.example.com
OLLAMA_AUTH_TOKEN=your-secret-from-step-3
ASSISTANT_CHAT_MODEL=qwen2.5:14b-instruct-q4_K_M
ASSISTANT_EMBED_MODEL=bge-m3
```

Note the `lib/assistant/ollama.ts` client doesn't currently send a
bearer token — that's an upcoming feature. For now, scope your VPS
firewall to only allow inbound from Vercel's egress IP ranges, OR
disable the Caddy bearer-token check until the client supports it.

### 8. Run the KB build

On your dev machine (or in CI):

```bash
OLLAMA_BASE_URL=https://ollama.example.com \
  npm run kb:build
```

This walks `docs/user/`, embeds every chunk via Ollama, and writes
`data/assistant-kb.json`. Commit that file to git so deploys don't
need a running Ollama at build time.

Re-run after every doc edit.

### 9. Probe the assistant

Sign in to the dashboard as an admin → visit `/api/assistant/health`.
You want a 200 with `status: ok` and three checks all `ok: true`.

If you get a 503, the JSON body shows which check failed.

## Operations

### Updating the chat model

Update `ASSISTANT_CHAT_MODEL` in Vercel, restart the standalone (a
redeploy or env-var update triggers it). Pull the new model on the
VPS:

```bash
docker compose exec ollama ollama pull qwen2.5:32b-instruct-q4_K_M
```

The next request uses the new model. Old conversations remain
attributed to whichever model wrote them (`AssistantTurn.model`
column).

### Disk space

Models live in the named docker volume `ollama-models`. Check usage
with `docker system df -v`. To remove an unused model:

```bash
docker compose exec ollama ollama rm qwen2.5:7b-instruct
```

### Backups

The model files don't need backing up — they're public, you can
re-pull them. The standalone's MariaDB has all the conversation
history, so the VPS is purely compute.

### Monitoring

Health endpoint on the standalone: `GET /api/assistant/health`.

For the VPS itself, the docker-compose includes a healthcheck on
the Ollama container; pair it with your alerting platform.
