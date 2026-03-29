# TypeScript Style

## Required compiler flags

Enable all of the following in `tsconfig.json`; never disable them per-file:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
  },
}
```

## `any` policy

Rule: never use `any`. Use `unknown` and narrow the type with a type guard or `zod` schema.
Document unavoidable exceptions with an inline `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment and a reason.

❌ Bad: `function parse(input: any): any`
✅ Good: `function parse(input: unknown): ParsedResult`

## `interface` vs `type`

Rule: use `interface` for object shapes (they are mergeable and produce better IDE error messages).
Use `type` for unions, intersections, mapped types, and conditional types.

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
}
type UserId = string & { readonly _brand: 'UserId' };
type Nullable<T> = T | null;
```

## Async return types

Rule: all async functions must declare an explicit `Promise<T>` return type — never `Promise<any>` or an omitted return type.

```typescript
// ✅
async findUser(id: string): Promise<User | null> { ... }
// ❌
async findUser(id: string) { ... }
```

## Non-null assertions

Rule: never use `!` non-null assertions. Use optional chaining (`?.`), nullish coalescing (`??`), or an explicit guard.

❌ Bad: `const name = user!.profile!.name`
✅ Good: `const name = user?.profile?.name ?? 'Anonymous'`

## Immutability

Rule: mark all DTO and entity properties `readonly`. Use `as const` for configuration objects and static lookup maps.

```typescript
export class CreateUserDto {
  readonly email!: string;
  readonly role!: UserRole;
}

const HTTP_TIMEOUTS = { default: 5_000, auth: 3_000 } as const;
```

## Naming conventions

| Construct       | Convention               | Example                   |
| --------------- | ------------------------ | ------------------------- |
| Class           | PascalCase               | `UserService`             |
| Interface       | PascalCase + `I` prefix  | `IUserRepository`         |
| Enum            | PascalCase               | `OrderStatus`             |
| Enum member     | SCREAMING_SNAKE          | `OrderStatus.PENDING`     |
| Private field   | `_camelCase`             | `_userId`                 |
| Generic param   | `T`, `TResult`, `TKey`   | `findOne<TEntity>`        |
| File            | kebab-case               | `user-profile.service.ts` |
| Injection token | SCREAMING_SNAKE constant | `I_USERS_REPOSITORY`      |

## Size limits

Rule: max function body length is 40 lines — extract helpers otherwise.
Rule: max file length is 300 lines — split into focused files otherwise.

## Exports

Rule: never use default exports. Always use named exports.

❌ Bad: `export default class UserService`
✅ Good: `export class UserService`

## JSDoc

Rule: every exported symbol — class, function, method, interface, type alias, enum, and `const` — must have a JSDoc comment.

Rule: every private and protected method must also have a one-line JSDoc comment.

Rule: use a single-line `/** … */` comment when the description fits on one line. Use a multi-line block only when `@param`, `@returns`, or `@throws` tags are needed.

```typescript
// ✅ one-line — sufficient for most methods
/** Find a credential by its email address. */
async findByEmail(email: string): Promise<Credential | null> { ... }

// ✅ multi-line — use when params or return value need clarification
/**
 * Rotate the refresh token for the given raw cookie value.
 *
 * @param rawRefreshToken - The raw UUID stored in the httpOnly cookie.
 * @returns New access JWT and a fresh raw refresh token, or an error Result.
 */
async refresh(rawRefreshToken: string): Promise<Result<{ auth: AuthResponseDto; rawRefreshToken: string }>> { ... }

// ❌ missing JSDoc on exported symbol
export function createDatabaseModule(entities: EntityClassOrSchema[]): DynamicModule { ... }

// ❌ trivial restating of the name — add meaningful context instead
/** Save. */
save(entity: T): Promise<T>
```

Rule: JSDoc on a class describes its responsibility in the architecture (e.g., which layer, which bounded context). Do not just restate the class name.

Rule: when a method throws — or returns a `Result` that wraps a specific `AppException` subclass — document it:

```typescript
/**
 * Deactivate a user account.
 * @returns `err(UnauthorisedException)` if the user is not found.
 * @returns `err(ConflictException)` if the account is already inactive.
 */
```

Rule: JSDoc on exported `const` string literals and injection tokens must state what they identify:

```typescript
/** DI injection token for the TypeORM User repository. */
export const I_USER_REPOSITORY = Symbol('IUserRepository');

/** Pub/Sub topic name for identity-service outbound events. */
export const IDENTITY_EVENTS_TOPIC = 'identity-events' as const;
```

## Related files

- `02-module-design.md` — DI and provider patterns
- `09-testing.md` — test naming follows the same clarity standard
- `04-api-design.md` — DTO validation conventions
