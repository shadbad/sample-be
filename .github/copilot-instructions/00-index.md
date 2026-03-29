# Copilot Instructions — Root Index

Always load the file relevant to the current task before generating code.
Never contradict a sub-instruction file. If in doubt, ask the developer.

## Sub-instruction manifest

| File                               | Concern                                  | Summary                                                                                                           |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `01-project-structure.md`          | Directory layout & module boundaries     | Monorepo layout, bounded-context isolation, feature-module scaffold                                               |
| `02-module-design.md`              | NestJS module composition & DI           | Provider scoping, dynamic modules, circular-dep resolution                                                        |
| `03-typescript-style.md`           | TypeScript language rules, style & JSDoc | Compiler flags, naming conventions, immutability, no-any policy, JSDoc rules for all exported and private symbols |
| `04-api-design.md`                 | REST API contracts & OpenAPI             | Versioning, response envelope, validation, error codes                                                            |
| `05-domain-and-services.md`        | Domain model & service layer             | Result pattern, domain events, CQRS-light, layer discipline                                                       |
| `06-database-and-orm.md`           | Database access & migrations             | Repository interfaces, migration rules, N+1 prevention, soft-delete                                               |
| `07-error-handling-and-logging.md` | Centralised errors & observability       | AllExceptionsFilter, structured JSON logs, OpenTelemetry, PII redaction                                           |
| `08-security.md`                   | Security controls & auth                 | JWT/cookies, Helmet, rate limiting, RBAC, secrets management                                                      |
| `09-testing.md`                    | Testing strategy & conventions           | Pyramid targets, coverage gates, Given/When/Then, Testcontainers                                                  |
| `10-async-and-queues.md`           | Async patterns & message queues          | BullMQ, idempotency, dead-letter, graceful shutdown                                                               |
| `11-performance.md`                | Performance budgets & caching            | Redis cache-aside, HTTP timeouts, streaming, connection pool sizing                                               |
| `12-ci-cd-and-ops.md`              | CI/CD pipeline & operational readiness   | Pipeline stages, Docker hygiene, health checks, deploy checklist                                                  |

## Usage protocol

1. Read this index first on every session.
2. Identify the concern of the current task (e.g., writing a service → load `05-domain-and-services.md`).
3. Load the relevant sub-file before generating any code.
4. If a task spans multiple concerns, load each relevant file in numeric order.
5. Never contradict a rule in a sub-file. Surface conflicts to the developer immediately.
6. **Auto-generate tests:** after creating or materially modifying a source file that matches the patterns in `09-testing.md § Auto-generation rule`, always create or update the corresponding `.spec.ts` file as part of the same response.
7. **End-of-session quality gate:** after every session in which code was created or modified, run the following commands in order and fix all reported issues before considering the session complete:
   ```bash
   npm run type:check   # must exit 0
   npm run lint:check   # must exit 0 — run npm run lint to auto-fix first
   npm run format:check # must exit 0 — run npm run format to auto-fix first
   npm test             # all test suites must pass
   ```
   Do not hand back to the developer while any of these commands exits non-zero.

## Related files

All files in `.github/copilot-instructions/`.
