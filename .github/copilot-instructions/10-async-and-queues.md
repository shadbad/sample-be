# Async and Queues

## Offloading long-running work

Rule: any operation expected to take longer than 500 ms must be offloaded to a BullMQ queue — never awaited inline inside a request handler.

```typescript
// ✅ Enqueue and return immediately
@Post('reports')
@HttpCode(HttpStatus.ACCEPTED)
async requestReport(@Body() dto: CreateReportDto): Promise<ApiEnvelope<{ jobId: string }>> {
  const job = await this._reportQueue.add('generate', dto);
  return { data: { jobId: job.id } };
}
```

## Job failure handling

Rule: every BullMQ processor class must implement `OnQueueFailed` and log the failure with full context (job ID, payload, attempt count, error).

## Idempotency

Rule: every job processor must be idempotent — re-running the same job payload any number of times must produce the same outcome. Use a deduplication key stored in Redis to detect and skip already-completed jobs.

## Versioned job payloads

Rule: job payloads are versioned DTOs. When a breaking payload change is required, bump the `version` field and handle both versions in the processor during the migration window. Never rename the queue.

```typescript
export class GenerateReportJobPayload {
  readonly version: 2 = 2;
  readonly reportId!: string;
  readonly tenantId!: string;
}
```

## Dead-letter queues

Rule: configure `attempts` + an exponential `backoff` strategy and a dead-letter (failed) queue for every production BullMQ queue. Never leave jobs silently discarded.

## Saga / Process Manager

Pattern: use a Saga or Process Manager class for multi-step async workflows. Never chain jobs via `onComplete` callbacks — that creates implicit, hard-to-trace dependencies.

## In-process vs cross-service events

Rule: use `EventEmitter2` for in-process domain events only (same Node.js process). Cross-service events must travel over the message broker (Kafka, RabbitMQ, or SQS).

## forEach + await anti-pattern

Rule: never use `await` inside a `forEach` callback — the awaits run but errors are swallowed and parallelism is lost. Use `Promise.all()` for concurrent work or a concurrency limiter (`p-limit`) when the operation volume is large.

❌ Bad: `items.forEach(async (item) => { await process(item); })`
✅ Good: `await Promise.all(items.map((item) => process(item)))`

## Graceful shutdown

Rule: call `app.enableShutdownHooks()` in `main.ts`. Implement `onModuleDestroy()` in queue processor modules to drain active jobs before the process exits on `SIGTERM`.

```typescript
async onModuleDestroy(): Promise<void> {
  await this._worker.close();
}
```

## Related files

- `05-domain-and-services.md` — domain event patterns
- `11-performance.md` — concurrency and resource management
- `12-ci-cd-and-ops.md` — graceful shutdown in deployment
