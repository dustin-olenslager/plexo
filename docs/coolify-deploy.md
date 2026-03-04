# Plexo — Coolify Deployment Notes
#
# Coolify manages deployments via the docker/compose.yml in this repo.
# This file documents the required Coolify project configuration.
#
# ── Setup Steps ───────────────────────────────────────────────────────────────
#
# 1. In Coolify: New Resource → Docker Compose → select this repo
# 2. Set compose file path: docker/compose.yml
# 3. Configure all environment variables listed in .env.example
#    (Coolify encrypts secrets at rest — safe to paste API keys)
# 4. Enable "Auto Deploy on Push" for main branch
# 5. Set domain in Coolify → Domains → point to PUBLIC_DOMAIN
#    Caddy inside the compose handles TLS automatically via ACME
#
# ── Resource Requirements (minimum) ──────────────────────────────────────────
#
# Total reserved across all containers:
#   Memory: ~1.9 GB (postgres 512M + redis 192M + api 512M + web 512M + caddy 128M + migrate 128M headroom)
#   CPU:    ~3.75 cores (under normal load, <1.0 effective)
#   Disk:   ~20 GB (OS + Docker images + pgdata volume + caddy certs)
#
# Recommended VPS: cx21 (Hetzner) or equivalent — 4 GB RAM, 2 vCPU, 40 GB disk
# For heavy AI workloads: cx31 — 8 GB RAM, 4 vCPU
#
# ── Volumes ──────────────────────────────────────────────────────────────────
#
# pgdata      — PostgreSQL data directory (persistent, back up regularly)
# redisdata   — Redis AOF persistence (can be rebuilt from DB, low-risk)
# caddy_data  — TLS certificates (do NOT delete — causes ACME rate limit issues)
# caddy_config — Caddy config cache
#
# ── Rollback ─────────────────────────────────────────────────────────────────
#
# In Coolify: Deployments → select previous deployment → Redeploy
# DB migrations are additive-only — rollback is safe for schema (no column drops).
# If a migration fails at startup, the migrate service exits 1 → api/web won't start.
#
# ── Health Checks ─────────────────────────────────────────────────────────────
#
# /health — Plexo API health (postgres, redis, anthropic status + Kapsel compliance)
# Caddy itself has no /health — check container status in Coolify UI
#
# ── Post-Deploy Smoke Test ────────────────────────────────────────────────────
#
# curl https://YOUR_DOMAIN/health | jq .
# Expected:
# {
#   "status": "ok",
#   "services": { "postgres": { "ok": true }, "redis": { "ok": true } },
#   "kapsel": { "complianceLevel": "full", "specVersion": "0.2.0" }
# }
#
# ── Environment Variables Required in Coolify ─────────────────────────────────
#
# Copy from .env.example. At minimum, set:
#   POSTGRES_PASSWORD  — generate: openssl rand -hex 32
#   SESSION_SECRET     — generate: openssl rand -hex 64
#   PUBLIC_URL         — https://your-domain.com
#   PUBLIC_DOMAIN      — your-domain.com
#   ANTHROPIC_API_KEY  — (or another AI provider)
#
# All other vars are optional but unlock features when set.
