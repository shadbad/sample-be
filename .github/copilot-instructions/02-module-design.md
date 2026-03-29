# Module Design

## Provider scoping

Rule: every module declares its own providers — never import a service class directly from a foreign module's file. Export the service from its owning module and import the module instead.

❌ Bad

```typescript
import { OrdersService } from "../orders/orders.service"; // direct cross-module import
@Module({ providers: [PaymentsService, OrdersService] })
export class PaymentsModule {}
```

✅ Good

```typescript
import { OrdersModule } from "../orders/orders.module";
@Module({ imports: [OrdersModule], providers: [PaymentsService] })
export class PaymentsModule {}
```

## Config-dependent providers

Rule: use `forRootAsync` / `registerAsync` for every provider that requires runtime configuration — never call `ConfigService` inside a constructor.

Rule: prefer `useFactory` over `useClass` when wiring external SDK clients so config injection is explicit.

```typescript
// ✅ Good — factory wires the SDK client with injected config
TypeOrmModule.forRootAsync({
  useFactory: (cfg: ConfigService) => ({
    type: "postgres",
    url: cfg.getOrThrow<string>("DATABASE_URL"),
    entities: [__dirname + "/**/*.entity{.ts,.js}"],
    synchronize: false,
  }),
  inject: [ConfigService],
});
```

## Global modules

Rule: `@Global()` is banned on all modules except `CoreModule` and `LoggerModule`. Use it at most twice in the entire codebase.

Alternative: import the module explicitly wherever it is needed — this keeps dependency graphs legible.

## Dynamic modules

Rule: every reusable library module must expose both a static `register()` and a `registerAsync()` factory. Use `ConfigurableModuleBuilder` to avoid boilerplate:

```typescript
// libs/infra/src/cache/cache.module.ts
import { ConfigurableModuleBuilder, Module } from "@nestjs/common";

export interface CacheModuleOptions {
  readonly ttlSeconds: number;
  readonly keyPrefix: string;
}

const { ConfigurableModuleClass } =
  new ConfigurableModuleBuilder<CacheModuleOptions>()
    .setClassMethodName("forRoot")
    .build();

@Module({})
export class CacheModule extends ConfigurableModuleClass {}
```

## Anti-patterns

❌ Importing a concrete repository directly in a service instead of injecting via token.
❌ Declaring `@Global()` on a feature module to avoid imports — it pollutes the DI container.
❌ Using `forwardRef()` between two sibling modules — extract the shared piece to `libs/core/`.
❌ Registering the same provider in multiple modules to satisfy lazy imports — causes duplicate instances.
❌ Calling `app.get(SomeService)` outside bootstrap — creates hidden module coupling.

## Circular dependencies

Rule: `forwardRef()` is a code smell. Resolve circular dependencies by extracting the shared interface or value object into `libs/core/` and depending on the abstraction, not the concrete module.

## Related files

- `01-project-structure.md` — directory layout and bounded context isolation
- `05-domain-and-services.md` — service layer rules
