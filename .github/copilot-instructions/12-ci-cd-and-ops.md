# CI/CD and Ops

## Pipeline stages

Run stages in this exact order; a failing stage blocks all subsequent stages:

```
lint → type-check → unit-test → build → integration-test → security-scan → docker-build → e2e-test → deploy
```

## Branch protection

Rule: no merge to `main` without a passing CI run. Enforce this via branch protection rules in GitHub / GitLab — it must not be bypassable without admin approval.

## Docker image

Rule: use a multi-stage Dockerfile — `build` stage on `node:20-alpine`, `runtime` stage on `node:20-alpine` (or distroless). The final image must run as a non-root user.

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER app
CMD ["node", "dist/main"]
```

## Config at runtime

Rule: environment-specific config is injected at container runtime via environment variables or a secret manager. Never bake config values into the image layer.

## Health checks

Rule: implement both endpoints via `@nestjs/terminus`:

- `GET /health/live` — liveness probe (is the process alive?)
- `GET /health/ready` — readiness probe (can the app serve traffic? DB + Redis reachable?)

## Startup logging

Rule: structured startup logs must emit at minimum: `appName`, `version`, `environment`, `port`, `nodeVersion`, and any active feature-flag overrides.

## Production mode

Rule: set `NODE_ENV=production` in production deployments. This disables stack traces in error responses and enables Node.js clustering.

## Deployment checklist

Before shifting production traffic to a new release, verify every item:

- [ ] Migrations ran and verified against production DB before traffic shift
- [ ] Rollback plan documented (previous artifact tag noted, rollback runbook linked)
- [ ] Feature flags toggled to correct state for this release
- [ ] Secrets rotated if this release changes secret-consumption code
- [ ] Smoke test suite passed against staging with production-equivalent data
- [ ] Dashboards (error rate, p99 latency, saturation) checked immediately post-deploy
- [ ] Alert thresholds verified as active and correctly routed
- [ ] Previous deployment artifact retained and tagged for rollback
- [ ] Changelog entry merged to main before deploy
- [ ] On-call engineer notified with deploy summary and rollback contact

## Security scan

Rule: run `npm audit --audit-level=high` in the `security-scan` stage. Block the pipeline on any HIGH or CRITICAL finding without a documented exception.

## Related files

- `08-security.md` — dependency audit policy
- `09-testing.md` — test stage details
- `10-async-and-queues.md` — graceful shutdown requirement
- `11-performance.md` — k6 smoke test budget
