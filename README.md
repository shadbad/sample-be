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

# 2. Create environment file
cp .env.example .env.local

# 3. Start infrastructure (Postgres + Pub/Sub emulator)
npm run infra:up

# 4. Run database migrations
npm run migrate:identity
npm run migrate:user

# 5. Seed initial data
npm run seed:identity
npm run seed:user

# 6. Start all services in watch mode
npm run dev
```

---

## Environment Variables

Create a `.env.local` file at the repo root. Copy from `.env.example` and adjust as needed.

| Variable               | Service           | Description                            | Example                                           |
| ---------------------- | ----------------- | -------------------------------------- | ------------------------------------------------- |
| `PORT`                 | all               | HTTP port for the service              | `3000`                                            |
| `DATABASE_URL`         | identity, user    | PostgreSQL connection string           | `postgresql://dev:dev@localhost:5432/identity_db` |
| `JWT_SECRET`           | gateway, identity | Shared HS256 signing secret            | `local-dev-secret-change-in-production`           |
| `JWT_EXPIRES_IN`       | identity          | Access token lifetime                  | `15m`                                             |
| `PUBSUB_PROJECT_ID`    | identity, user    | GCP project ID (emulator: `local-dev`) | `local-dev`                                       |
| `PUBSUB_EMULATOR_HOST` | identity, user    | Emulator host (omit in production)     | `localhost:8085`                                  |
| `IDENTITY_SERVICE_URL` | gateway           | Downstream URL for identity-service    | `http://localhost:3002`                           |
| `USER_SERVICE_URL`     | gateway           | Downstream URL for user-service        | `http://localhost:3001`                           |

> **Security:** Never commit `.env.local` or any file containing real secrets. The `.gitignore` excludes all `.env*` files except `.env.example`.

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
npm run infra:up    # start Postgres + Pub/Sub emulator
npm run infra:down  # stop and remove containers
```

---

## Database Migrations & Seeds

### Run migrations

```bash
# Identity service (identity_db)
DATABASE_URL=postgresql://dev:dev@localhost:5432/identity_db npm run migrate:identity

# User service (users_db)
DATABASE_URL=postgresql://dev:dev@localhost:5432/users_db npm run migrate:user
```

### Run seeds

Seeds are idempotent — safe to re-run at any time.

```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/identity_db npm run seed:identity
DATABASE_URL=postgresql://dev:dev@localhost:5432/users_db npm run seed:user
```

Default seeded credentials:

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@example.com` |
| Password | `Admin1234!`        |
| Role     | `admin`             |

> Change the admin password immediately in any non-local environment.

### Generate a new migration

```bash
# After modifying an entity, generate a migration automatically:
npx typeorm migration:generate -d apps/identity-service/src/database/data-source.ts \
  apps/identity-service/src/database/migrations/YourMigrationName
```

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
POST /auth/register   → 201  { data: { accessToken, tokenType, expiresIn } }
POST /auth/login      → 200  { data: { accessToken, tokenType, expiresIn } }
                             Sets httpOnly cookie: refresh_token
POST /auth/refresh    → 200  Rotates refresh token, issues new access token
POST /auth/logout     → 204  Clears refresh token (requires Bearer token)
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
├── docker-compose.yml
├── nest-cli.json
├── tsconfig.json
└── .env.example
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
```

Tests are co-located with source files (`*.spec.ts`). All unit tests mock I/O using `@golevelup/ts-jest` `createMock<T>()` — no real database or Pub/Sub connections.

---

## Scripts Reference

| Script                     | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `npm run dev`              | Start infra + all services in watch mode          |
| `npm run infra:up`         | Start Docker services + initialise Pub/Sub topics |
| `npm run infra:down`       | Stop and remove Docker containers                 |
| `npm run migrate:identity` | Run pending migrations for identity_db            |
| `npm run migrate:user`     | Run pending migrations for users_db               |
| `npm run seed:identity`    | Seed default admin credential (idempotent)        |
| `npm run seed:user`        | Seed default roles and admin user (idempotent)    |
| `npm test`                 | Run all unit tests                                |
| `npm run test:cov`         | Run tests with coverage report                    |
| `npm run lint`             | Lint and auto-fix all TypeScript files            |
| `npm run format`           | Format all TypeScript files with Prettier         |
| `npm run build`            | Build all apps for production                     |
