# Domain and Services

## Layer discipline

Rule: services contain business logic; repositories contain data-access logic; controllers contain HTTP concerns. Never mix these responsibilities.

❌ Bad: querying the database directly inside a controller.
✅ Good: controller calls service → service calls repository interface → repository executes query.

## Domain entities

Rule: domain entities are plain TypeScript classes with no ORM decorators. Place ORM-decorated persistence models in `libs/infra/` and map between them.

```typescript
// libs/core/src/domain/user.entity.ts — pure domain object
export class User {
  constructor(
    readonly id: UserId,
    readonly email: Email,
    readonly role: UserRole,
  ) {}
}

// libs/infra/src/database/user.orm-entity.ts — persistence model
@Entity("users")
export class UserOrmEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() email!: string;
  @Column({ type: "enum", enum: UserRole }) role!: UserRole;
}
```

## Result pattern

Rule: use `Result<T, E>` instead of throwing exceptions for expected business failures (validation errors, not-found, conflicts). Throw only for truly unexpected runtime errors.

```typescript
export type Result<T, E = AppException> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

## Side effects via domain events

Rule: trigger side effects (emails, webhooks, audit logs) exclusively through domain events — never call notification or external services inline mid-service method.

```typescript
// ✅ Raise event; a listener handles the side effect
this._eventEmitter.emit("user.registered", new UserRegisteredEvent(user));
```

## Stateless services

Rule: services must be stateless. Never store request-scoped data in instance variables. Use `AsyncLocalStorage` (via `ClsService`) for request-scoped context propagation.

## CQRS-light

Pattern: for complex write paths, extract a `*CommandHandler` class; for complex read paths, extract a `*QueryHandler` class. This keeps individual classes under the 40-line limit and separates read/write optimisation concerns.

```typescript
export class RegisterUserCommandHandler {
  async execute(cmd: RegisterUserCommand): Promise<Result<User>> { ... }
}
```

## Cross-bounded-context communication

Rule: a service in one bounded context must never call a service in a different bounded context directly. Publish an application event over the message broker or call through an anti-corruption layer interface defined in `libs/core/`.

## Transactions

Pattern: wrap any operation that writes to more than one aggregate in an explicit transaction using an `@Transactional()` decorator (e.g. `typeorm-transactional`) or an explicit `EntityManager` transaction block.

```typescript
@Transactional()
async transfer(from: AccountId, to: AccountId, amount: Money): Promise<Result<void>> {
  await this._accountRepo.debit(from, amount);
  await this._accountRepo.credit(to, amount);
}
```

## Related files

- `06-database-and-orm.md` — repository interface and migration rules
- `10-async-and-queues.md` — domain event to message-broker bridge
