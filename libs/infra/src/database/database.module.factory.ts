import { DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

/**
 * Factory that creates a TypeORM root module scoped to one service.
 * Pass the entity classes belonging to that service.
 */
export function createDatabaseModule(entities: EntityClassOrSchema[]): DynamicModule {
  return TypeOrmModule.forRootAsync({
    useFactory: (config: ConfigService) => ({
      type: 'postgres',
      url: config.getOrThrow<string>('DATABASE_URL'),
      entities,
      migrations: ['dist/apps/*/database/migrations/*.js'],
      migrationsRun: false,
      synchronize: false,
      logging: process.env['NODE_ENV'] !== 'production',
      // Pool size: 2 × CPU cores + 1 spindle (single postgres instance)
      extra: { max: 10 },
    }),
    inject: [ConfigService],
  });
}
