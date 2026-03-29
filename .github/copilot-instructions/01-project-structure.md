# Project Structure

## Monorepo layout

Rule: use the NestJS `apps/` + `libs/` workspace convention managed by the Nest CLI.

```
.
├── apps/
│   ├── api/                    # Primary HTTP service
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── features/
│   │           ├── users/      # Bounded context: users
│   │           └── orders/     # Bounded context: orders
│   └── worker/                 # Background job processor service
│       └── src/
│           ├── main.ts
│           └── app.module.ts
├── libs/
│   ├── core/                   # Shared kernel: base classes, interfaces, value objects
│   │   └── src/
│   ├── common/                 # DTOs, enums, constants — no business logic
│   │   └── src/
│   └── infra/                  # Adapters: DB, Redis, queue, HTTP clients
│       └── src/
│           ├── database/
│           ├── cache/
│           └── queue/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## Module boundaries

Rule: one NestJS module per bounded context — do not merge unrelated domains into one module.

Rule: `libs/core/` is the shared kernel — no cross-app direct imports; both `apps/` depend on `libs/core/`, never on each other.

Rule: `libs/common/` holds DTOs, enums, and constants only — zero business logic, zero NestJS providers.

Rule: `libs/infra/` holds infrastructure adapters (TypeORM, Prisma, Redis, BullMQ) — domain code never imports from `libs/infra/` directly; depend on the interface in `libs/core/`.

Rule: do not create a barrel `src/index.ts` at the app level — import modules and classes by their direct paths to eliminate circular-import risk.

## Feature module scaffold

Rule: every feature module must follow this exact directory structure:

```
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts          # implements IUsersRepository from libs/core
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts           # ORM persistence model
├── interfaces/
│   └── users-repository.interface.ts
└── __tests__/
    ├── users.service.spec.ts
    └── users.controller.spec.ts
```

## Example: wiring a feature

```typescript
// apps/api/src/features/users/users.module.ts
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { I_USERS_REPOSITORY } from "./interfaces/users-repository.interface";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: I_USERS_REPOSITORY, useClass: UsersRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

## Related files

- `02-module-design.md` — DI discipline and dynamic module patterns
- `05-domain-and-services.md` — service and repository layer rules
