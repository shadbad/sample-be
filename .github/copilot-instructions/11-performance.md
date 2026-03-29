# Performance

## External HTTP calls

Rule: every outbound HTTP call must set an explicit timeout (default 5 000 ms) and a retry policy using exponential back-off with jitter (max 3 retries) via `axios-retry` or an equivalent resilience library.

```typescript
import axiosRetry from "axios-retry";
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: axiosRetry.isNetworkOrIdempotentRequestError,
});
axiosInstance.defaults.timeout = 5_000;
```

## Caching

Rule: use the cache-aside pattern for read-heavy data via `@nestjs/cache-manager` backed by Redis.

Rule: cache keys must include the API version and the user/tenant scope to prevent cross-tenant cache poisoning.

```typescript
const key = `v1:user:${tenantId}:${userId}`;
```

Rule: cache TTLs must always be explicit integers in seconds. Never rely on a default "forever" TTL.

Rule: invalidate cache entries on write operations — do not serve stale data after a successful mutation.

## Synchronous fs calls

Rule: never use synchronous `fs.*` calls (`fs.readFileSync`, `fs.writeFileSync`) inside request handlers. Use `fs/promises` equivalents exclusively.

## Streaming large responses

Rule: use `@Res() res: Response` streaming for response payloads larger than 1 MB. Never buffer the entire payload in memory before responding.

## DB connection pool sizing

Rule: size the DB connection pool to `(2 × CPU cores) + effective_spindle_count`. Document the chosen value as an environment variable with a comment explaining the formula.

## Memory leak prevention

Rule: every `EventEmitter` subscription, `setInterval`, and readable stream must be cleaned up inside `onModuleDestroy()` to prevent memory leaks during hot-reload and graceful shutdown.

```typescript
async onModuleDestroy(): Promise<void> {
  clearInterval(this._pollInterval);
  this._subscription.unsubscribe();
}
```

## Performance budgets

Rule: p99 response time targets — tested in CI via a k6 smoke test on every build:

| Endpoint type          | p99 target |
| ---------------------- | ---------- |
| Read (GET)             | ≤ 300 ms   |
| Write (POST/PUT/PATCH) | ≤ 1 000 ms |

## Related files

- `06-database-and-orm.md` — connection pool and N+1 rules
- `10-async-and-queues.md` — offloading heavy work
- `12-ci-cd-and-ops.md` — k6 smoke test in CI pipeline
