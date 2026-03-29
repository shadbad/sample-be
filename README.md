# sample-be

A NestJS monorepo backend consisting of three services — **API Gateway**, **Identity Service**, and **User Service** — communicating over Google Cloud Pub/Sub with PostgreSQL persistence.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [Database Migrations & Seeds](#database-migrations--seeds)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Scripts Reference](#scripts-reference)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Angular Client                    │
└────────────────────────┬────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────┐
│              API Gateway  :3000                      │
│  • Validates JWT (HS256, Bearer)                     │
│  • Injects X-User-Id / X-User-Email headers          │
│  • Reverse-proxies to downstream services            │
└───────────┬─────────────────────────┬───────────────┘
            │ HTTP                    │ HTTP
┌───────────▼──────────┐  ┌──────────▼──────────────┐
│  Identity Service    │  │     User Service         │
│       :3002          │  │         :3001            │
│  • Registration      │  │  • User profiles         │
│  • Login / Logout    │  │  • Role management       │
│  • JWT issuance      │  │  • Pub/Sub listener      │
│  • Refresh tokens    │  │                          │
│  DB: identity_db     │  │  DB: users_db            │
└───────────┬──────────┘  └──────────────────────────┘
            │ Pub/Sub (identity-events)
            └──────────────────────────► User Service
```

### Key Design Decisions

| Concern               | Decision                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| Auth                  | Username + bcrypt (12 rounds) — no OAuth/OIDC                               |
| JWT                   | HS256, 15 min access token, httpOnly cookie refresh token                   |
| Refresh token storage | SHA-256(UUID) stored in DB; raw UUID in `httpOnly` `SameSite=Strict` cookie |
| Service communication | Google Cloud Pub/Sub (emulated locally)                                     |
| Error handling        | `Result<T>` in services; `AllExceptionsFilter` at HTTP layer                |
| Schema changes        | TypeORM migrations only — `synchronize: false` in all environments          |

### Shared Libraries

| Library           | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `@libs/core`      | `BaseEntity`, `AppException` hierarchy, `Result<T>`, `AllExceptionsFilter` |
| `@libs/contracts` | Pub/Sub event interfaces and topic/event-type constants                    |
| `@libs/infra`     | `PubSubModule`, `PubSubPublisherService`, `createDatabaseModule()`         |
| `@libs/common`    | Shared utilities (reserved for future use)                                 |

---

## Prerequisites

| Tool                    | Minimum version             |
| ----------------------- | --------------------------- |
| Node.js                 | 20 LTS                      |
| npm                     | 10                          |
| Docker & Docker Compose | 24                          |
| NestJS CLI              | 11 (`npm i -g @nestjs/cli`) |

---

## Getting Started

```bash
# 1. Clone and install dependencies
git clone <repo-url> sample-be
cd sample-be
npm install

# 2. Create per-service environment files from the provided examples
cp .env.api-gateway.example .env.api-gateway
cp .env.identity.example    .env.identity
cp .env.user-service.example .env.user-service
# Edit each file and fill in real values where noted

# 3. Start infrastructure (Postgres + Pub/Sub emulator)
npm run infra:up

# 4. Run database migrations
npm run db:identity-service:migration:up
npm run db:user-service:migration:up

# 5. Seed initial data
npm run db:identity-service:seed
npm run db:user-service:seed

# 6. Start all services in watch mode
npm run dev
```

---

## Environment Variables

Each service loads its own env file from the repo root. Copy the relevant `.example` file and fill in the values:

| File                      | Service          | Copy from                      |
| ------------------------- | ---------------- | ------------------------------ |
| `.env.api-gateway`        | API Gateway      | `.env.api-gateway.example`     |
| `.env.identity`           | Identity Service | `.env.identity.example`        |
| `.env.user-service`       | User Service     | `.env.user-service.example`    |

### Variable reference

| Variable               | File(s)                              | Description                            | Example                                           |
| ---------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------------- |
| `PORT`                 | all                                  | HTTP port for the service              | `3000`                                            |
| `DATABASE_URL`         | `.env.identity`, `.env.user-service` | PostgreSQL connection string           | `postgresql://dev:dev@localhost:5432/identity_db` |
| `JWT_SECRET`           | `.env.api-gateway`, `.env.identity`  | Shared HS256 signing secret            | *(generate a strong random value)*                |
| `JWT_EXPIRES_IN`       | `.env.api-gateway`, `.env.identity`                      | Access token lifetime                  | `15m`                                             |
| `PUBSUB_PROJECT_ID`    | `.env.api-gateway`, `.env.identity`, `.env.user-service` | GCP project ID (emulator: `local-dev`) | `local-dev`                                       |
| `PUBSUB_EMULATOR_HOST` | `.env.api-gateway`, `.env.identity`, `.env.user-service` | Emulator host — omit in production     | `localhost:8085`                                  |
| `IDENTITY_SERVICE_URL` | `.env.api-gateway`                   | Downstream URL for identity-service    | `http://localhost:3002`                           |
| `USER_SERVICE_URL`     | `.env.api-gateway`                   | Downstream URL for user-service        | `http://localhost:3001`                           |

> **Security:** Never commit real env files. The `.gitignore` excludes all `.env.*` files; only `*.example` files are committed.

---

## Running the Services

### All services (development)

```bash
npm run dev
```

Starts infrastructure then launches all three services in watch mode via `concurrently`.

### Individual service

```bash
nest start api-gateway --watch
nest start identity-service --watch
nest start user-service --watch
```

### Infrastructure only

```bash
npm run infra:up    # start Postgres + Pub/Sub emulator + pgAdmin
npm run infra:down  # stop and remove containers
```

### pgAdmin (Database UI)

pgAdmin runs as part of the Docker stack and is available at **http://localhost:5050** after `npm run infra:up`.

| Field    | Value             |
| -------- | ----------------- |
| Email    | `admin@local.dev` |
| Password | `admin`           |

To connect to the local Postgres instance, add a new server with:

| Field    | Value      |
| -------- | ---------- |
| Host     | `postgres` |
| Port     | `5432`     |
| Username | `dev`      |
| Password | `dev`      |

Both `identity_db` and `users_db` will be visible once connected.

---

## Database Migrations & Seeds

`DATABASE_URL` is read from the service's env file (`.env.identity` / `.env.user-service`), so no inline env prefix is needed.

### Apply migrations

```bash
npm run db:identity-service:migration:up
npm run db:user-service:migration:up
```

### Revert last migration

```bash
npm run db:identity-service:migration:down
npm run db:user-service:migration:down
```

### Generate a migration

Run after modifying an entity. Pass a descriptive `--name`:

```bash
npm run db:identity-service:migration:generate --name=AddLastLoginIndex
npm run db:user-service:migration:generate --name=CreateRolesAndUsersTable
```

TypeORM diffs the entity definitions against the live schema and writes a timestamped file to `apps/<service>/src/database/migrations/`.

### Run seeds

Seeds are idempotent — safe to re-run at any time.

```bash
npm run db:identity-service:seed
npm run db:user-service:seed
```

Default seeded credentials:

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@example.com` |
| Password | `Admin1234!`        |
| Role     | `admin`             |

> Change the admin password immediately in any non-local environment.

---

## API Documentation

Swagger UI is available when any service is running:

| Service          | URL                        |
| ---------------- | -------------------------- |
| API Gateway      | http://localhost:3000/docs |
| Identity Service | http://localhost:3002/docs |
| User Service     | http://localhost:3001/docs |

### Authentication flow

```
POST /v1/auth/register   → 201  { data: { accessToken, tokenType, expiresIn } }
POST /v1/auth/login      → 200  { data: { accessToken, tokenType, expiresIn } }
                                Sets httpOnly cookie: refresh_token
POST /v1/auth/refresh    → 200  Rotates refresh token, issues new access token
POST /v1/auth/logout     → 204  Clears refresh token (requires Bearer token)
```

### Users API

All users endpoints require `Authorization: Bearer <accessToken>`.

```
GET    /v1/users            → 200  { data: UserResponseDto[], meta: { page, limit, total } }
                                   Query params: page (default: 1), limit (default: 20)
POST   /v1/users            → 201  { data: UserResponseDto }
GET    /v1/users/:id        → 200  { data: UserResponseDto }
PATCH  /v1/users/:id        → 200  { data: UserResponseDto }
DELETE /v1/users/:id        → 204  (soft-delete)
```

All protected endpoints require `Authorization: Bearer <accessToken>` header.

---

## Project Structure

```
.
├── apps/
│   ├── api-gateway/          # JWT validation + reverse proxy (port 3000)
│   ├── identity-service/     # Auth, credentials, JWT issuance (port 3002)
│   └── user-service/         # User profiles, roles, event listener (port 3001)
├── libs/
│   ├── core/                 # BaseEntity, exceptions, Result<T>, filter
│   ├── contracts/            # Pub/Sub event interfaces and constants
│   ├── infra/                # PubSubModule, database factory
│   └── common/               # Shared utilities
├── scripts/
│   ├── init-db.sql           # Creates users_db and identity_db
│   └── init-pubsub.sh        # Creates Pub/Sub topics and subscriptions
├── test/
│   └── e2e/                  # End-to-end test suites (auth, users)
├── docker-compose.yml
├── nest-cli.json
├── tsconfig.json
└── .env.*.example
```

### Service internals (example: identity-service)

```
apps/identity-service/src/
├── app.module.ts
├── main.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.repository.ts
│   ├── auth.service.ts
│   ├── credential.entity.ts
│   ├── dto/
│   ├── guards/
│   ├── interfaces/
│   ├── strategies/
│   └── __tests__/
└── database/
    ├── data-source.ts
    ├── database.module.ts
    ├── migrations/
    └── seeds/
```

---

## Testing

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# Coverage report (enforced thresholds: 80% statements/functions/lines, 75% branches)
npm run test:cov

# End-to-end tests (requires running infrastructure and services)
npm run test:e2e
```

Unit tests are co-located with source files (`*.spec.ts`). All unit tests mock I/O using `@golevelup/ts-jest` `createMock<T>()` — no real database or Pub/Sub connections.

End-to-end tests live under `test/e2e/` and exercise the full HTTP stack against real running services (auth flow and users CRUD). Run `npm run infra:up` and start all services before executing `npm run test:e2e`.

---

## Scripts Reference

### Development

| Script               | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Start infra + all three services in watch mode         |
| `npm run infra:up`   | Start Docker services + initialise Pub/Sub topics/subs |
| `npm run infra:down` | Stop and remove Docker containers                      |
| `npm run build`      | Compile all apps for production                        |

### Database — Identity Service

| Script                                                              | Description                                     |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| `npm run db:identity-service:migration:up`                          | Run all pending migrations on `identity_db`     |
| `npm run db:identity-service:migration:down`                        | Revert the last applied migration               |
| `npm run db:identity-service:migration:generate --name=<Name>`      | Generate a migration from entity diff           |
| `npm run db:identity-service:seed`                                  | Seed default admin credential (idempotent)      |

### Database — User Service

| Script                                                           | Description                                     |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| `npm run db:user-service:migration:up`                           | Run all pending migrations on `users_db`        |
| `npm run db:user-service:migration:down`                         | Revert the last applied migration               |
| `npm run db:user-service:migration:generate --name=<Name>`       | Generate a migration from entity diff           |
| `npm run db:user-service:seed`                                   | Seed default roles and admin user (idempotent)  |

### Code Quality

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run type:check`    | TypeScript type check (no emit)                  |
| `npm run lint:check`    | ESLint — report only                             |
| `npm run lint:fix`      | ESLint — report and auto-fix                     |
| `npm run format:check`  | Prettier — report only                           |
| `npm run format:fix`    | Prettier — auto-fix                              |

### Testing

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm test`             | Run all unit tests once                              |
| `npm run test:watch`   | Run unit tests in watch mode                         |
| `npm run test:cov`     | Run tests and generate coverage report               |
| `npm run test:e2e`     | Run end-to-end tests (requires live services)        |
