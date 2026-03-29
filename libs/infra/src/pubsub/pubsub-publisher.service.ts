import { PubSub, Topic } from '@google-cloud/pubsub';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { AppException } from '@libs/core';

import { PUBSUB_CLIENT } from './pubsub.token';

/** Publishes domain events to Google Cloud Pub/Sub topics. */
@Injectable()
export class PubSubPublisherService {
  private readonly _logger = new Logger(PubSubPublisherService.name);
  private readonly _topicCache = new Map<string, Topic>();

  constructor(@Inject(PUBSUB_CLIENT) private readonly _pubsub: PubSub) {}

  /** Get or create a topic, using an in-process cache. */
  async getTopic(name: string): Promise<Topic> {
    const cached = this._topicCache.get(name);
    if (cached !== undefined) return cached;

    const [topic] = await this._pubsub.topic(name).get({ autoCreate: true });
    this._topicCache.set(name, topic);
    return topic;
  }

  /** Serialise event to JSON and publish with eventType attribute for filtering. */
  async publish(topicName: string, event: unknown): Promise<void> {
    try {
      const topic = await this.getTopic(topicName);
      const data = Buffer.from(JSON.stringify(event));
      const eventType =
        typeof event === 'object' &&
        event !== null &&
        'eventType' in event &&
        typeof (event as Record<string, unknown>)['eventType'] === 'string'
          ? ((event as Record<string, unknown>)['eventType'] as string)
          : 'unknown';

      await topic.publishMessage({ data, attributes: { eventType } });
    } catch (error: unknown) {
      this._logger.error({ topicName, error }, 'Failed to publish event');
      throw new AppException('Failed to publish event', 'PUBSUB_ERROR', {
        topicName,
      });
    }
  }
}
