# Copilot instructions — NestJS monorepo

This repo uses a split instruction system. Detailed rules live under
`.github/copilot-instructions/`. Always load the relevant sub-file before
generating or reviewing code.

| Task                              | Load this file                   |
| --------------------------------- | -------------------------------- |
| Creating a new module or service  | 02-module-design.md              |
| Writing a controller or DTO       | 04-api-design.md                 |
| Adding business logic             | 05-domain-and-services.md        |
| Writing DB queries or migrations  | 06-database-and-orm.md           |
| Handling errors or adding logs    | 07-error-handling-and-logging.md |
| Auth, guards, or secrets          | 08-security.md                   |
| Writing tests or generating specs | 09-testing.md                    |
| Adding a job or event handler     | 10-async-and-queues.md           |
| Caching or optimising a hot path  | 11-performance.md                |
| CI pipeline or Dockerfile         | 12-ci-cd-and-ops.md              |
| Adding JSDoc or documenting code  | 03-typescript-style.md           |

Start every session by reading `.github/copilot-instructions/00-index.md`.
