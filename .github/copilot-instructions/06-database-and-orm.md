# Database and ORM

## Repository interfaces

Rule: repositories must implement a domain interface (e.g. `IUserRepository`) defined in `libs/core/`. Services depend on the interface token, never on the concrete ORM class or entity.

```typescript
// libs/core/src/interfaces/user-repository.interface.ts
export const I_USER_REPOSITORY = Symbol('IUserRepository');
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Injected in service
constructor(
  @Inject(I_USER_REPOSITORY) private readonly _userRepo: IUserRepository,
) {}
```

## Select field discipline

Rule: never call `find()` or `findMany()` without explicit `select` in production queries. Always limit the returned columns to what the caller needs.

❌ Bad: `this.userRepo.find()` — fetches all columns including hashed passwords, blobs, etc.
✅ Good: `this.userRepo.find({ select: ['id', 'email', 'role'] })`

## Raw SQL

Rule: raw SQL is permitted only inside read-model query handlers. Every raw SQL block must include a comment referencing the ticket/PR that introduced it and must be reviewed by a second engineer before merge.

## Migrations

Rule: all schema changes must be applied via versioned migration files — never use `synchronize: true` in any environment including local development.

Rule: every migration must implement both `up()` and `down()` methods and be idempotent (safe to re-run).

```typescript
export class AddUserRoleColumn1711700000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.addColumn(
      "users",
      new TableColumn({ name: "role", type: "varchar", default: "'user'" }),
    );
  }
  async down(qr: QueryRunner): Promise<void> {
    await qr.dropColumn("users", "role");
  }
}
```

## Index justification

Rule: every index declaration must include a code comment naming the query it was created to support.

```typescript
// Supports: UserRepository.findByEmailAndTenant() — login flow
@Index(['email', 'tenantId'], { unique: true })
```

## Soft-delete

Rule: implement soft-delete via a `deletedAt: Date | null` timestamp column. Hard-delete requires explicit opt-in with a separate repository method named `hardDelete()`.

## N+1 prevention

Rule: every `findAll` that joins relations must use `QueryBuilder` (TypeORM) or Prisma `include` with an explicit depth limit of maximum 2 levels. Document deeper fetches with a performance justification comment.

## Read / write split

Pattern: configure two connection pools — primary (write) and one or more replicas (read). Route all `INSERT`, `UPDATE`, `DELETE` through the primary connection; route `SELECT` operations to replicas.

## No DB logic in event listeners

Rule: never execute database queries inside NestJS event listeners or HTTP interceptors. Delegate DB work to a service method instead.

## Related files

- `05-domain-and-services.md` — repository interface consumption
- `07-error-handling-and-logging.md` — logging DB errors
