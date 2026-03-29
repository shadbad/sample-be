# Testing

## Auto-generation rule

**Rule: whenever Copilot creates or materially modifies a service, repository, listener, guard, or strategy file, it must also create or update the corresponding `.spec.ts` file in the same operation — without being asked.**

This applies to every file matching these patterns:

| Source pattern    | Spec to create/update  |
| ----------------- | ---------------------- |
| `*.service.ts`    | `*.service.spec.ts`    |
| `*.repository.ts` | `*.repository.spec.ts` |
| `*.listener.ts`   | `*.listener.spec.ts`   |
| `*.guard.ts`      | `*.guard.spec.ts`      |
| `*.strategy.ts`   | `*.strategy.spec.ts`   |

Exceptions — do **not** auto-generate a spec for:

- `*.module.ts` (NestJS module wiring files)
- `*.dto.ts` (plain data shapes, no logic)
- `*.entity.ts` (TypeORM entity definitions)
- `data-source.ts` / `seed.ts` (standalone CLI scripts)
- `main.ts` (bootstrap entry point)
- `*.token.ts` / `*.decorator.ts` / `*.filter.ts` unless they contain branching logic

---

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
import { createMock } from '@golevelup/ts-jest';

describe('UsersService', () => {
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

## Test generation

Follow this checklist whether generating tests automatically (triggered by writing source code) or on explicit request:

1. **Locate the source file** and read every public and private method before writing a single test.
2. **Create the spec file** co-located with the source (`user.service.ts` → `user.service.spec.ts`). If a `__tests__/` sub-directory already exists, place it there instead.
3. **Mock all dependencies** using `createMock<T>()` from `@golevelup/ts-jest`. Never write manual `jest.fn()` boilerplate for interface mocks.
4. **Cover every method** with at minimum:
   - One happy-path case (`given … valid …, when … called, then … succeeds`)
   - One error-path case per distinct `Result` error or thrown exception
5. **Assert on side-effects** — verify that publish/save/external calls were made with the correct arguments using `expect(mock.method).toHaveBeenCalledWith(…)`.
6. **Do not test implementation details** — assert on outputs and observable side-effects only; never assert on private field values directly.
7. **Seed only what the test needs** — keep `beforeEach` minimal; move fixture data into local `const` inside the individual `it` block when it is used by only one case.

```typescript
// Template: unit test scaffold
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';

import { UsersService } from '../users.service';
import {
  IUserRepository,
  I_USER_REPOSITORY,
} from '../interfaces/user-repository.interface';
import { RolesRepository } from '../../roles/roles.repository';
import { PubSubPublisherService } from '@libs/infra';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<IUserRepository>;
  let rolesRepo: jest.Mocked<RolesRepository>;
  let pubSub: jest.Mocked<PubSubPublisherService>;

  beforeEach(async () => {
    usersRepo = createMock<IUserRepository>();
    rolesRepo = createMock<RolesRepository>();
    pubSub = createMock<PubSubPublisherService>();

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: I_USER_REPOSITORY, useValue: usersRepo },
        { provide: RolesRepository, useValue: rolesRepo },
        { provide: PubSubPublisherService, useValue: pubSub },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('given an email already taken, when create is called, then it returns a ConflictException result', async () => {
      usersRepo.findByEmail.mockResolvedValue({ id: 'existing' } as never);
      const result = await service.create({
        email: 'a@b.com',
        fullName: 'A',
        roleId: 'r1',
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('CONFLICT');
    });
  });
});
```

Rule: when generating tests for a controller, test only that it correctly maps `Result` values to HTTP exceptions — do not re-test service logic.

Rule: when generating tests for a Pub/Sub listener, mock the `Message` object with `{ data: Buffer.from(JSON.stringify(…)), ack: jest.fn(), nack: jest.fn() }`.

## Related files

- `05-domain-and-services.md` — service patterns being tested
- `06-database-and-orm.md` — integration test DB strategy
- `12-ci-cd-and-ops.md` — CI pipeline stage ordering
