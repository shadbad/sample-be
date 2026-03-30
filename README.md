# sample-be

A NestJS monorepo backend consisting of three microservices — **API Gateway**, **Identity Service**, and **User Service** — communicating over Google Cloud Pub/Sub with PostgreSQL persistence.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (from fresh clone)](#quick-start-from-fresh-clone)
- [Step-by-Step Setup](#step-by-step-setup)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [Database](#database)
- [Pub/Sub Event Bus](#pubsub-event-bus)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Troubleshooting](#troubleshooting)
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
│  • Helmet, CORS (localhost:4200), rate limiting      │
│  • URI versioning (default: /v1)                     │
└───────────┬─────────────────────────┬───────────────┘
            │ HTTP                    │ HTTP
┌───────────▼──────────┐  ┌──────────▼──────────────┐
│  Identity Service    │  │     User Service         │
│       :3002          │  │         :3001            │
│  • Registration      │  │  • User profiles (CRUD)  │
│  • Login / Logout    │  │  • Role management       │
│  • JWT issuance      │  │  • Pub/Sub listener      │
│  • Refresh tokens    │  │                          │
│  DB: identity_db     │  │  DB: users_db            │
└───────────┬──────────┘  └──────────┬───────────────┘
            │                        │
            │ Pub/Sub                │ Pub/Sub
            │ (identity-events)      │ (user-events)
            └──────► User Service    └──────► API Gateway
```

### Key Design Decisions

| Concern               | Decision                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| Auth                  | Email + bcrypt (12 rounds) — no OAuth/OIDC                                  |
| JWT                   | HS256, 15 min access token, httpOnly cookie refresh token                   |
| Refresh token storage | SHA-256(UUID) stored in DB; raw UUID in `httpOnly` `SameSite=Strict` cookie |
| Service communication | Google Cloud Pub/Sub (emulated locally via `google/cloud-sdk:emulators`)    |
| Error handling        | `Result<T>` pattern in services; `AllExceptionsFilter` at HTTP layer        |
| Schema changes        | TypeORM migrations only — `synchronize: false` in all environments          |
| Soft deletes          | All entities use `deletedAt` column via TypeORM `@DeleteDateColumn`         |

### Shared Libraries

| Library           | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `@libs/core`      | `BaseEntity`, `AppException` hierarchy, `Result<T>`, `AllExceptionsFilter` |
| `@libs/contracts` | Pub/Sub event interfaces, topic names, and event-type constants            |
| `@libs/infra`     | `PubSubModule`, `PubSubPublisherService`, `createDatabaseModule()`         |
| `@libs/common`    | Shared utilities (reserved for future use)                                 |

---

## Tech Stack

| Category        | Technology                                                       |
| --------------- | ---------------------------------------------------------------- |
| Runtime         | Node.js 20 LTS, TypeScript 5.7 (`module: nodenext`, ES2023)     |
| Framework       | NestJS 11 (monorepo mode, webpack compiler)                      |
| Database        | PostgreSQL 16 (via TypeORM 0.3)                                  |
| Auth            | Passport.js + `@nestjs/jwt` (HS256)                              |
| Messaging       | Google Cloud Pub/Sub (`@google-cloud/pubsub` 5.x)               |
| Validation      | `class-validator` + `class-transformer`                           |
| API docs        | `@nestjs/swagger` (auto-generated OpenAPI / Swagger UI)          |
| Testing         | Jest 30, Supertest 7, `@golevelup/ts-jest`                       |
| Linting         | ESLint 9 (flat config) + Prettier 3                               |
| Git hooks       | Husky 9 + lint-staged                                             |
| Containerisation| Docker Compose (Postgres, Pub/Sub emulator, pgAdmin)             |

---

## Prerequisites

| Tool                    | Minimum version             | Install                            |
| ----------------------- | --------------------------- | ---------------------------------- |
| Node.js                 | 20 LTS                      | https://nodejs.org                 |
| npm                     | 10                          | Ships with Node.js 20              |
| Docker & Docker Compose | 24 / v2                     | https://docs.docker.com/get-docker |
| NestJS CLI              | 11                          | `npm i -g @nestjs/cli`            |

> **macOS Apple Silicon note:** The Pub/Sub emulator image runs as `linux/amd64`. Docker Desktop handles this via Rosetta, but the first pull may be slow.

---

## Quick Start (from fresh clone)

Copy-paste the entire block below to go from zero to running in one shot:

```bash
git clone <repo-url> sample-be
cd sample-be

# Install dependencies
npm install

# Create env files from examples (defaults work out of the box for local dev)
cp .env.api-gateway.example .env.api-gateway
cp .env.identity.example    .env.identity
cp .env.user-service.example .env.user-service

# Update DATABASE_URL in .env.identity and .env.user-service to use the dev user:
#   .env.identity:     DATABASE_URL=postgresql://dev:dev@localhost:5432/identity_db
#   .env.user-service: DATABASE_URL=postgresql://dev:dev@localhost:5432/users_db

# Start infrastructure (Postgres, Pub/Sub emulator, pgAdmin)
npm run infra:up

# Run database migrations (creates tables)
npm run db:identity-service:migration:up
npm run db:user-service:migration:up

# Seed initial data (admin user, roles, dummy data)
npm run db:identity-service:seed
npm run db:user-service:seed

# Start all three services in watch mode
npm run dev
```

Once running:

| What              | URL                           |
| ----------------- | ----------------------------- |
| API Gateway       | http://localhost:3000          |
| Swagger (Gateway) | http://localhost:3000/docs    |
| Identity Service  | http://localhost:3002          |
| User Service      | http://localhost:3001          |
| pgAdmin           | http://localhost:5050          |

Login with the seeded admin account:

```
Email:    admin@example.com
Password: Admin1234!
```

---

## Step-by-Step Setup

If you prefer understanding each step, follow this detailed walkthrough.

### 1. Clone and install dependencies

```bash
git clone <repo-url> sample-be
cd sample-be
npm install
```

This installs all production and dev dependencies and configures Husky git hooks (via the `prepare` script).

### 2. Create environment files

```bash
cp .env.api-gateway.example .env.api-gateway
cp .env.identity.example    .env.identity
cp .env.user-service.example .env.user-service
```

The `.example` files contain sensible local defaults. The **one thing you must update** is `DATABASE_URL` in `.env.identity` and `.env.user-service` — change the placeholder credentials to match the Docker Postgres user:

```dotenv
# .env.identity
DATABASE_URL=postgresql://dev:dev@localhost:5432/identity_db

# .env.user-service
DATABASE_URL=postgresql://dev:dev@localhost:5432/users_db
```

The `JWT_SECRET` defaults to `change-me` which is fine for local dev. Both `.env.api-gateway` and `.env.identity` must use the **same** `JWT_SECRET` value.

### 3. Start infrastructure

```bash
npm run infra:up
```

This command:

1. Runs `docker compose up -d` — starts three containers:
   - **postgres** (port 5432) — PostgreSQL 16-alpine with user `dev`/`dev`
   - **pubsub-emulator** (port 8085) — Google Cloud Pub/Sub emulator
   - **pgadmin** (port 5050) — database admin UI
2. Waits 4 seconds for containers to be healthy
3. Runs `scripts/init-pubsub.sh` — creates topics and subscriptions:

| Topic              | Subscription                     | Consumer        |
| ------------------ | -------------------------------- | --------------- |
| `identity-events`  | `user-service-identity-events`   | User Service    |
| `user-events`      | `gateway-user-events`            | API Gateway     |

The `scripts/init-db.sql` file (mounted into Postgres) automatically creates both `identity_db` and `users_db` databases on first container start.

### 4. Run database migrations

Migrations create the required tables in each database:

```bash
npm run db:identity-service:migration:up
npm run db:user-service:migration:up
```

**identity_db** tables created:
- `credentials` — `id`, `userId`, `email`, `passwordHash`, `refreshTokenHash`, `lastLoginAt`, `isActive`, `createdAt`, `updatedAt`, `deletedAt`

**users_db** tables created:
- `roles` — `id`, `name`, `createdAt`, `updatedAt`, `deletedAt`
- `users` — `id`, `email`, `fullName`, `roleId` (FK → roles, nullable), `createdAt`, `updatedAt`, `deletedAt`

### 5. Seed initial data

```bash
npm run db:identity-service:seed
npm run db:user-service:seed
```

Seeds are **idempotent** — safe to re-run at any time (uses upsert/conflict handling).

**What gets seeded:**

| Data                       | Details                                              |
| -------------------------- | ---------------------------------------------------- |
| Admin credential           | `admin@example.com` / `Admin1234!`                   |
| Admin role                 | `admin` role in `users_db`                           |
| Admin user profile         | Linked to the credential via matching UUID            |
| 30 dummy user credentials  | `alice.johnson@example.com`, etc. / `Password1234!`  |
| 30 dummy user profiles     | Matching emails and UUIDs, no role assigned           |

> **Important:** Change the admin password immediately in any non-local environment.

### 6. Start all services

```bash
npm run dev
```

This launches all three NestJS apps in watch mode (hot-reloading on file changes) using `concurrently`. If infrastructure isn't already running, it starts it first.

To verify everything is working:

```bash
# Health-check the gateway
curl http://localhost:3000/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}'
```

You should receive an access token in the response.

---

## Environment Variables

Each service loads its own env file from the repo root:

| File                      | Service          | Copy from                      |
| ------------------------- | ---------------- | ------------------------------ |
| `.env.api-gateway`        | API Gateway      | `.env.api-gateway.example`     |
| `.env.identity`           | Identity Service | `.env.identity.example`        |
| `.env.user-service`       | User Service     | `.env.user-service.example`    |

### Variable reference

| Variable               | File(s)                                                  | Description                            | Default / Example                                 |
| ---------------------- | -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| `PORT`                 | all                                                      | HTTP port for the service              | `3000` / `3002` / `3001`                         |
| `DATABASE_URL`         | `.env.identity`, `.env.user-service`                     | PostgreSQL connection string           | `postgresql://dev:dev@localhost:5432/identity_db` |
| `JWT_SECRET`           | `.env.api-gateway`, `.env.identity`                      | Shared HS256 signing secret            | `change-me` *(generate a strong value for prod)*  |
| `JWT_EXPIRES_IN`       | `.env.api-gateway`, `.env.identity`                      | Access token lifetime                  | `15m`                                             |
| `PUBSUB_PROJECT_ID`    | all                                                      | GCP project ID (emulator: `local-dev`) | `local-dev`                                       |
| `PUBSUB_EMULATOR_HOST` | all                                                      | Emulator host — omit in production     | `localhost:8085`                                  |
| `IDENTITY_SERVICE_URL` | `.env.api-gateway`                                       | Downstream URL for identity-service    | `http://localhost:3002`                           |
| `USER_SERVICE_URL`     | `.env.api-gateway`                                       | Downstream URL for user-service        | `http://localhost:3001`                           |

> **Security:** Never commit real `.env` files. The `.gitignore` excludes all `.env.*` files; only `*.example` files are tracked.

---

## Running the Services

### All services (development)

```bash
npm run dev
```

Starts infrastructure (if not already running) then launches all three services in watch mode via `concurrently`.

### Individual service

```bash
nest start api-gateway --watch
nest start identity-service --watch
nest start user-service --watch
```

### Infrastructure only

```bash
npm run infra:up    # start Postgres + Pub/Sub emulator + pgAdmin + create topics
npm run infra:down  # stop and remove containers (data persists in Docker volumes)
```

### Kill orphan processes

If ports are still occupied after stopping services:

```bash
npm run kill:ports   # kills anything on :3000, :3001, :3002
```

### pgAdmin (Database UI)

pgAdmin is available at **http://localhost:5050** after `npm run infra:up`.

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

## Database

### Overview

Each service owns its own database — no cross-database queries.

| Service          | Database       | Tables         | ORM        |
| ---------------- | -------------- | -------------- | ---------- |
| Identity Service | `identity_db`  | `credentials`  | TypeORM    |
| User Service     | `users_db`     | `users`, `roles` | TypeORM  |

`synchronize: false` in all environments. Schema changes are managed exclusively through TypeORM migrations. Connection pool max size is 10.

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

### Generate a new migration

Run after modifying an entity. Pass a descriptive `--name`:

```bash
npm run db:identity-service:migration:generate --name=AddLastLoginIndex
npm run db:user-service:migration:generate --name=AddUserAvatarColumn
```

TypeORM diffs the entity definitions against the live schema and writes a timestamped file to `apps/<service>/src/database/migrations/`.

### Run seeds

Seeds are idempotent — safe to re-run at any time.

```bash
npm run db:identity-service:seed
npm run db:user-service:seed
```

### Reset database from scratch

If you need a clean slate:

```bash
npm run infra:down                           # stop containers
docker volume rm sample-be_postgres_data     # delete Postgres data
npm run infra:up                             # recreate containers (init-db.sql re-runs)
npm run db:identity-service:migration:up     # recreate tables
npm run db:user-service:migration:up
npm run db:identity-service:seed             # re-seed data
npm run db:user-service:seed
```

---

## Pub/Sub Event Bus

Services communicate asynchronously via Google Cloud Pub/Sub (emulated locally).

### Topics and subscriptions

| Topic              | Publisher        | Subscription                   | Consumer        |
| ------------------ | ---------------- | ------------------------------ | --------------- |
| `identity-events`  | Identity Service | `user-service-identity-events` | User Service    |
| `user-events`      | User Service     | `gateway-user-events`          | API Gateway     |

### Event types

**`identity-events` topic:**

| Event Type                   | Trigger              | Payload                                         |
| ---------------------------- | -------------------- | ------------------------------------------------ |
| `identity.user-registered`   | User registers       | `userId`, `email`, `fullName`, `roleId?`         |
| `identity.user-deactivated`  | User deactivated     | `userId`                                         |

**`user-events` topic:**

| Event Type       | Trigger              | Payload                                                      |
| ---------------- | -------------------- | ------------------------------------------------------------ |
| `user.created`   | User profile created | `userId`, `email`, `fullName`, `roleId?`, `roleName?`        |
| `user.updated`   | User profile updated | `userId`, `email`, `fullName`, `roleId?`, `roleName?`        |
| `user.deleted`   | User soft-deleted    | `userId`                                                     |

### Event flow example

1. User calls `POST /v1/auth/register` on the API Gateway
2. Gateway proxies to Identity Service → creates credential → publishes `identity.user-registered`
3. User Service listener receives event → creates user profile automatically
4. User Service publishes `user.created` on the `user-events` topic

---

## API Documentation

Swagger UI is auto-generated and available when any service is running:

| Service          | URL                        |
| ---------------- | -------------------------- |
| API Gateway      | http://localhost:3000/docs |
| Identity Service | http://localhost:3002/docs |
| User Service     | http://localhost:3001/docs |

All client-facing requests should go through the **API Gateway** (port 3000), which handles JWT validation and proxying.

### Authentication flow

```
POST /v1/auth/register   → 201  { data: { accessToken, tokenType, expiresIn } }
POST /v1/auth/login      → 200  { data: { accessToken, tokenType, expiresIn } }
                                 Sets httpOnly cookie: refresh_token
POST /v1/auth/refresh    → 200  Rotates refresh token, issues new access token
POST /v1/auth/logout     → 204  Clears refresh token (requires Bearer token)
```

### Users API

All endpoints require `Authorization: Bearer <accessToken>`.

```
GET    /v1/users            → 200  { data: UserResponseDto[], meta: { page, limit, total } }
                                   Query: page, limit, search, sortBy, sortOrder
POST   /v1/users            → 201  { data: UserResponseDto }
GET    /v1/users/:id        → 200  { data: UserResponseDto }
PATCH  /v1/users/:id        → 200  { data: UserResponseDto }
DELETE /v1/users/:id        → 204  (soft-delete)
```

### Roles API

```
GET    /v1/roles            → 200  { data: RoleResponseDto[] }
```

---

## Project Structure

```
.
├── apps/
│   ├── api-gateway/              # JWT validation + reverse proxy (port 3000)
│   │   └── src/
│   │       ├── auth/             # JWT strategy, guard, @Public() decorator
│   │       ├── identity/         # Proxy controller for /auth/* routes
│   │       ├── proxy/            # ProxyService — HTTP forwarding with user headers
│   │       └── users/            # Proxy controller for /users/* and /roles/*
│   ├── identity-service/         # Auth, credentials, JWT issuance (port 3002)
│   │   └── src/
│   │       ├── auth/             # Controller, service, repository, entity, DTOs
│   │       └── database/         # Data source, migrations, seeds
│   └── user-service/             # User profiles, roles, event listener (port 3001)
│       └── src/
│           ├── users/            # User CRUD controller, service, repository, entity
│           ├── roles/            # Roles controller, service, repository, entity
│           ├── listeners/        # Pub/Sub event listener (identity-events)
│           └── database/         # Data source, migrations, seeds
├── libs/
│   ├── core/                     # BaseEntity, AppException hierarchy, Result<T>, filter
│   ├── contracts/                # Pub/Sub event interfaces, topic/event-type constants
│   ├── infra/                    # PubSubModule, PubSubPublisherService, DB factory
│   └── common/                   # Shared utilities (placeholder)
├── scripts/
│   ├── init-db.sql               # Creates identity_db and users_db databases
│   └── init-pubsub.sh            # Creates Pub/Sub topics and subscriptions via REST
├── test/
│   └── e2e/                      # End-to-end tests (auth flow, user CRUD)
│       ├── auth/
│       ├── users/
│       ├── helpers/              # ApiClient, ResourceTracker, TestData factories
│       └── setup/                # Global setup/teardown, environment config
├── docker-compose.yml            # Postgres 16, Pub/Sub emulator, pgAdmin
├── nest-cli.json                 # Monorepo config (3 apps, 4 libs, webpack)
├── tsconfig.json                 # Root TS config with @libs/* path aliases
├── eslint.config.mjs             # ESLint 9 flat config + Prettier integration
└── .env.*.example                # Environment file templates
```

---

## Testing

### Unit tests

```bash
npm test                # run all unit tests once
npm run test:watch      # watch mode
npm run test:cov        # with coverage report
```

Unit tests are co-located with source files (`*.spec.ts`). All unit tests mock I/O using `@golevelup/ts-jest` `createMock<T>()` — no real database or Pub/Sub connections required.

### End-to-end tests

E2E tests run against **live services** — all three apps plus infrastructure must be running.

```bash
# 1. Start everything
npm run dev

# 2. In another terminal, run e2e tests
npm run test:e2e
```

E2E tests live under `test/e2e/` and exercise the full HTTP stack through the API Gateway:
- **Auth suite** — register, login, refresh, logout flows
- **Users suite** — CRUD operations, pagination, search, soft-delete

The test framework includes:
- **ApiClient** — wraps Supertest with auto bearer-token management
- **ResourceTracker** — cleans up created users in LIFO order after each suite
- **TestData** — generates unique emails and names (UUID-suffixed) to avoid collisions

Test timeout is 30 seconds. Global setup verifies the API Gateway is reachable before running.

---

## Code Quality

```bash
npm run type:check      # TypeScript strict type check (tsc --noEmit)
npm run lint:check      # ESLint — report only
npm run lint:fix        # ESLint — auto-fix
npm run format:check    # Prettier — report only
npm run format:fix      # Prettier — auto-fix
```

**Pre-commit hooks** (via Husky + lint-staged) automatically run ESLint and Prettier on staged `.ts` files.

---

## Troubleshooting

### Ports already in use

```bash
npm run kill:ports    # kills processes on :3000, :3001, :3002
```

### Pub/Sub emulator not ready

If services fail to connect to Pub/Sub, the emulator may still be starting:

```bash
curl http://localhost:8085    # should return 200 when ready
./scripts/init-pubsub.sh     # re-create topics and subscriptions
```

### Migrations fail with "relation does not exist"

Ensure the databases exist and migrations run in order:

```bash
# Verify databases were created
docker exec -it sample-be-postgres-1 psql -U dev -l

# Re-run migrations
npm run db:identity-service:migration:up
npm run db:user-service:migration:up
```

### Docker containers won't start (Apple Silicon)

The Pub/Sub emulator image is `linux/amd64`. Ensure Docker Desktop has Rosetta emulation enabled:
Docker Desktop → Settings → General → "Use Rosetta for x86_64/amd64 emulation on Apple Silicon".

### E2E tests fail

Ensure all three services are running and seeded:

```bash
npm run dev                          # in terminal 1
npm run db:identity-service:seed     # if not already seeded
npm run db:user-service:seed
npm run test:e2e                     # in terminal 2
```

---

## Scripts Reference

### Development

| Script               | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start infra + all three services in watch mode            |
| `npm run infra:up`   | Start Docker services + initialise Pub/Sub topics/subs    |
| `npm run infra:down` | Stop and remove Docker containers                         |
| `npm run kill:ports` | Kill processes occupying ports 3000, 3001, 3002           |
| `npm run build`      | Compile all apps for production                           |

### Database — Identity Service

| Script                                                              | Description                                     |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| `npm run db:identity-service:migration:up`                          | Run all pending migrations on `identity_db`     |
| `npm run db:identity-service:migration:down`                        | Revert the last applied migration               |
| `npm run db:identity-service:migration:generate --name=<Name>`      | Generate a migration from entity diff           |
| `npm run db:identity-service:seed`                                  | Seed admin credential + 30 dummy users          |

### Database — User Service

| Script                                                           | Description                                     |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| `npm run db:user-service:migration:up`                           | Run all pending migrations on `users_db`        |
| `npm run db:user-service:migration:down`                         | Revert the last applied migration               |
| `npm run db:user-service:migration:generate --name=<Name>`       | Generate a migration from entity diff           |
| `npm run db:user-service:seed`                                   | Seed admin role, admin user + 30 dummy users    |

### Code Quality

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run type:check`    | TypeScript type check (`tsc --noEmit`)           |
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
