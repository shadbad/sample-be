import { Message, PubSub, Subscription } from '@google-cloud/pubsub';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { IDENTITY_EVENT_TYPES, IdentityEvent } from '@libs/contracts';
import { PUBSUB_CLIENT } from '@libs/infra';

import { UsersService } from '../users/users.service';

const SUBSCRIPTION_NAME = 'user-service-identity-events';

/** Listens for identity-service events over Pub/Sub and applies them to users. */
@Injectable()
export class IdentityEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(IdentityEventsListener.name);
  private _subscription!: Subscription;

  constructor(
    @Inject(PUBSUB_CLIENT) private readonly _pubsub: PubSub,
    private readonly _usersService: UsersService,
  ) {}

  /** Subscribe to the identity-events subscription and start handling messages. */
  async onModuleInit(): Promise<void> {
    const [subscription] = await this._pubsub
      .subscription(SUBSCRIPTION_NAME)
      .get({ autoCreate: true });

    this._subscription = subscription;
    this._subscription.on('message', (msg: Message) => void this._handleMessage(msg));
    this._subscription.on('error', (err: unknown) => {
      this._logger.error({ err }, 'Pub/Sub subscription error');
    });

    this._logger.log(`Listening on subscription: ${SUBSCRIPTION_NAME}`);
  }

  /** Close the subscription gracefully on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this._subscription.close();
  }

  private async _handleMessage(message: Message): Promise<void> {
    let event: IdentityEvent;
    try {
      event = JSON.parse(message.data.toString()) as IdentityEvent;
    } catch {
      this._logger.warn('Received unparseable Pub/Sub message — acking');
      message.ack();
      return;
    }

    switch (event.eventType) {
      case IDENTITY_EVENT_TYPES.USER_REGISTERED: {
        const result = await this._usersService.createFromEvent(event.payload);
        if (result.success) {
          message.ack();
        } else {
          this._logger.error({ error: result.error }, 'Failed to create user from event — nacking');
          message.nack();
        }
        break;
      }
      case IDENTITY_EVENT_TYPES.USER_DEACTIVATED: {
        const result = await this._usersService.remove(event.payload.userId);
        if (!result.success) {
          this._logger.warn({ error: result.error }, 'Failed to remove deactivated user');
        }
        message.ack();
        break;
      }
      default: {
        this._logger.warn(
          { eventType: (event as Record<string, unknown>)['eventType'] },
          'Unknown event type — acking',
        );
        message.ack();
      }
    }
  }
}
