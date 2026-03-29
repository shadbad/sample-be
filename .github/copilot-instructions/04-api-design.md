# API Design

## Versioning

Rule: version every route via `@Version('1')` on the controller or via the `APP_PIPE` global URI prefix `/v1/`. Never expose unversioned production endpoints.

```typescript
@Controller({ path: "users", version: "1" })
export class UsersController {}
```

## OpenAPI decoration

Rule: every controller method must carry `@ApiOperation`, at least one `@ApiResponse` per relevant HTTP status, and `@ApiBearerAuth()` on authenticated routes.

```typescript
@Get(':id')
@ApiOperation({ summary: 'Fetch a user by ID' })
@ApiResponse({ status: 200, type: UserResponseDto })
@ApiResponse({ status: 404, description: 'User not found' })
@ApiBearerAuth()
async findOne(@Param('id') id: string): Promise<ApiEnvelope<UserResponseDto>> { ... }
```

## Controller discipline

Rule: controllers are thin — zero business logic. Delegate entirely to the service layer. A controller method must only: extract inputs, call a service method, map the result to the response envelope, and return it.

## Request validation

Rule: validate all request bodies and query params via `class-validator` + `class-transformer` DTOs. Never validate manually inside a controller.

```typescript
export class CreateUserDto {
  @IsEmail() readonly email!: string;
  @IsEnum(UserRole) readonly role!: UserRole;
}
```

## Response envelope

Rule: all responses must use the typed envelope below. Never return a bare entity directly.

```typescript
export interface ApiEnvelope<T> {
  readonly data: T;
  readonly meta?: PaginationMeta;
  readonly errors?: ApiError[];
}
```

## HTTP status codes

Rule: use `@HttpCode(HttpStatus.CREATED)` explicitly on POST handlers. Never return `200` for resource creation.

Rule: HTTP status code conventions:

| Code | Meaning               | Use when                                      |
| ---- | --------------------- | --------------------------------------------- |
| 400  | Bad Request           | Malformed syntax, missing required field      |
| 401  | Unauthorized          | Missing or invalid token                      |
| 403  | Forbidden             | Valid token, insufficient permissions         |
| 404  | Not Found             | Resource does not exist                       |
| 409  | Conflict              | Duplicate resource, state conflict            |
| 422  | Unprocessable Entity  | Validation logic failure (e.g. business rule) |
| 429  | Too Many Requests     | Rate limit exceeded                           |
| 500  | Internal Server Error | Unhandled server fault                        |

## Pagination

Rule: use cursor-based pagination for collections that can exceed 1 000 items. Use offset-based pagination only for small, bounded collections.

## PATCH vs PUT

Rule: `PATCH` = partial update (only supplied fields are changed). `PUT` = full replacement (all fields required). Never mix semantics.

## Error visibility

Rule: never return stack traces or internal error messages to API consumers. Funnel all unhandled errors through `AllExceptionsFilter` which returns the standard envelope with a sanitised `errors` array.

## Related files

- `03-typescript-style.md` — DTO and interface conventions
- `07-error-handling-and-logging.md` — exception filter implementation
- `08-security.md` — authentication guards and rate-limiting
