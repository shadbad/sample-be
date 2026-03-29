import { PubSub } from '@google-cloud/pubsub';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PubSubPublisherService } from './pubsub-publisher.service';
import { PUBSUB_CLIENT } from './pubsub.token';

/** Global module — import once in AppModule; provides PubSubPublisherService everywhere. */
@Global()
@Module({})
export class PubSubModule {
  /** Register the Pub/Sub client and publisher service using config from the environment. */
  static forRoot(): DynamicModule {
    return {
      module: PubSubModule,
      providers: [
        {
          provide: PUBSUB_CLIENT,
          useFactory: (config: ConfigService): PubSub => {
            const projectId = config.getOrThrow<string>('PUBSUB_PROJECT_ID');
            return new PubSub({ projectId });
          },
          inject: [ConfigService],
        },
        PubSubPublisherService,
      ],
      exports: [PUBSUB_CLIENT, PubSubPublisherService],
    };
  }
}
