# Testing

## Testing pyramid targets

| Layer       | Target share | Tool                               |
| ----------- | ------------ | ---------------------------------- |
| Unit        | 70%          | Jest + `@golevelup/ts-jest`        |
| Integration | 20%          | `@nestjs/testing` + Testcontainers |
| E2E         | 10%          | `supertest` + fully booted app     |

## Unit tests

Rule: unit tests mock all I/O (DB, HTTP, queue, cache). Test the service in complete isolation from infrastructure.

Pattern: use `createMock<T>()` from `@golevelup/ts-jest` to auto-mock interfaces — no manual `jest.fn()` boilerplate.

```typescript
import { createMock } from "@golevelup/ts-jest";

describe("UsersService", () => {
  let service: UsersService;
  const mockRepo = createMock<IUserRepository>();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: I_USER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
  });
});
```

## Integration tests

Rule: integration tests use `@nestjs/testing` `TestingModule` wired to either an in-memory SQLite instance or a Docker Postgres started via Testcontainers.

Rule: every DB integration test must run inside a transaction that is rolled back after each test case, guaranteeing isolation.

## E2E tests

Rule: E2E tests send HTTP requests via `supertest` against a fully booted NestJS application — the same bootstrap path used in production.

## Coverage requirements

Rule: coverage gates are enforced as CI quality gates — the pipeline fails if any threshold is not met:

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 80%     |
| Branches   | 75%     |
| Functions  | 80%     |
| Lines      | 80%     |

## Co-location

Rule: test files are co-located with source files:

- `user.service.ts` → `user.service.spec.ts` (same directory)
- E2E tests live in `test/` at app root.

## Test naming

Rule: test description strings follow Given/When/Then format.

```typescript
it('given a valid user ID, when findById is called, then it returns the user', async () => { ... });
it('given an unknown user ID, when findById is called, then it returns a not-found Result', async () => { ... });
```

## Coverage per method

Rule: every service method must have at least one happy-path test and one error-path test.

## Branch hygiene

Rule: never commit `it.only`, `describe.only`, or `test.only` to the main branch. Use a lint rule (`jest/no-focused-tests`) to enforce this.

## Related files

- `05-domain-and-services.md` — service patterns being tested
- `06-database-and-orm.md` — integration test DB strategy
- `12-ci-cd-and-ops.md` — CI pipeline stage ordering
