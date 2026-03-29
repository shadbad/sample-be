# Error Handling and Logging

## Global exception filter

Rule: every unhandled exception must propagate to a global `AllExceptionsFilter` registered via `APP_FILTER`. This filter is the only place that formats error responses sent to clients.

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    res.status(status).json({
      data: null,
      errors: [sanitise(exception)],
    });
  }
}
```

## AppException base class

Rule: all business exceptions must extend `AppException` and carry a `code` string, a `message`, and an optional `context` payload. Never expose raw `new Error()` from service code.

```typescript
export class AppException extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UserNotFoundException extends AppException {
  constructor(id: string) {
    super("USER_NOT_FOUND", `User ${id} not found`, { id });
  }
}
```

## HTTP exceptions

Rule: use NestJS built-in HTTP exception classes (`NotFoundException`, `ConflictException`, `BadRequestException`, etc.) at the controller and filter layer — never throw raw `Error` objects from controllers.

## Structured log format

Rule: every log entry must be a JSON object with these fields:

```jsonc
{
  "timestamp": "2026-03-29T12:00:00.000Z",
  "level": "info",
  "correlationId": "uuid-v4",
  "service": "api",
  "method": "UsersService.findById",
  "durationMs": 42,
  "userId": "optional",
  "error": "optional serialised error",
}
```

## Correlation ID propagation

Rule: inject `correlationId` via `AsyncLocalStorage` (use `nestjs-cls` or a custom `ClsService`) into every log call. Never pass `correlationId` as a function argument through the call chain.

## Log levels

Rule: use log levels as follows — `ERROR` for unrecoverable faults; `WARN` for recoverable business anomalies; `INFO` for state transitions (request received, job completed); `DEBUG` for local development only. Never emit `DEBUG` logs in production.

## PII policy

Rule: never log personally identifiable information (email addresses, passwords, tokens, card numbers). Pass all outgoing log data through a `redact()` utility before logging.

```typescript
function redact(data: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_KEYS = new Set(["password", "token", "email", "cardNumber"]);
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      REDACTED_KEYS.has(k) ? [k, "[REDACTED]"] : [k, v],
    ),
  );
}
```

## Distributed tracing

Rule: use the OpenTelemetry Node.js SDK. Every outbound HTTP call, DB query, and queue publish must be wrapped in a child span.

## Logger injection

Pattern: inject a `LoggerService` (wrapping `pino` or `winston`) via NestJS DI everywhere. Never use `console.log` outside of `main.ts` bootstrap.

## Related files

- `04-api-design.md` — error code conventions
- `08-security.md` — security event logging
