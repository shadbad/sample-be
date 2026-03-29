# Security

## Authentication

Rule: validate JWTs via Passport `JwtStrategy`. Store refresh tokens as `httpOnly`, `Secure`, `SameSite=Strict` cookies only — never in `localStorage` or a response body field.

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.getOrThrow<string>("JWT_SECRET"),
      ignoreExpiration: false,
    });
  }
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return { userId: payload.sub, role: payload.role };
  }
}
```

## Secrets management

Rule: all sensitive configuration (secrets, API keys, DSNs, private keys) must be loaded at runtime via `ConfigService` from environment variables or a secret manager (Vault / AWS Secrets Manager). Never hard-code secrets or commit them to source control.

Rule: secrets rotation must not require a code change or a redeployment — use dynamic secret injection.

## Rate limiting

Rule: apply `@nestjs/throttler` to every public endpoint. Apply a strict burst limit on auth endpoints: max 5 requests per minute per IP.

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('auth/login')
async login(@Body() dto: LoginDto) { ... }
```

## CORS

Rule: configure CORS explicitly with an allowlist of trusted origins. Wildcard `*` origin is banned in production environments.

## HTTP headers

Rule: enable `helmet` middleware with a strict Content Security Policy in the bootstrap. Never skip `helmet` in production.

```typescript
app.use(
  helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }),
);
```

## Input sanitisation

Rule: sanitise all user-supplied strings before they reach DB interpolation. Never use raw template literals to build query fragments.

❌ Bad: `` `SELECT * FROM users WHERE email = '${email}'` ``
✅ Good: parameterised query or ORM method with typed parameters.

## File uploads

Rule: validate uploaded files for MIME type (header check) AND magic bytes (content check). Enforce a maximum size cap. Store uploaded files outside the web root and serve via a pre-signed URL.

## Authorisation

Rule: enforce `@Roles()` and `@Permissions()` guards at the controller method level for every protected endpoint. Never rely on the frontend to hide routes.

```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
async remove(@Param('id') id: string) { ... }
```

## Dependency audit

Rule: `npm audit --audit-level=high` must run in CI. The build must fail on any HIGH or CRITICAL severity finding.

## Related files

- `04-api-design.md` — HTTP error codes for security failures
- `07-error-handling-and-logging.md` — security event logging
- `12-ci-cd-and-ops.md` — security scan CI stage
