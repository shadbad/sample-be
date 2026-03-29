import { createMock } from '@golevelup/ts-jest';
import { PubSub, Topic } from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppException } from '@libs/core';

import { PubSubPublisherService } from './pubsub-publisher.service';
import { PUBSUB_CLIENT } from './pubsub.token';

describe('PubSubPublisherService', () => {
  let service: PubSubPublisherService;
  let mockPubSub: jest.Mocked<PubSub>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    mockPubSub = createMock<PubSub>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PubSubPublisherService, { provide: PUBSUB_CLIENT, useValue: mockPubSub }],
    }).compile();

    service = module.get<PubSubPublisherService>(PubSubPublisherService);
  });

  describe('getTopic', () => {
    it('given a topic name not in cache, when getTopic is called, then it fetches from PubSub and returns it', async () => {
      const mockTopic = createMock<Topic>();
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      const { topic } = mockPubSub;
      topic.mockReturnValue(mockTopicRef as unknown as Topic);

      const result = await service.getTopic('my-topic');

      expect(topic).toHaveBeenCalledWith('my-topic');
      expect(mockTopicRef.get).toHaveBeenCalledWith({ autoCreate: true });
      expect(result).toBe(mockTopic);
    });

    it('given a topic name already fetched, when getTopic is called again, then it returns the cached instance without re-fetching', async () => {
      const mockTopic = createMock<Topic>();
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      const { topic } = mockPubSub;
      topic.mockReturnValue(mockTopicRef as unknown as Topic);

      const first = await service.getTopic('cached-topic');
      const second = await service.getTopic('cached-topic');

      expect(topic).toHaveBeenCalledTimes(1);
      expect(first).toBe(mockTopic);
      expect(second).toBe(mockTopic);
    });
  });

  describe('publish', () => {
    it('given an event with a string eventType, when publish is called, then it serialises the payload and publishes with the correct attribute', async () => {
      const mockTopic = createMock<Topic>();
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      mockPubSub.topic.mockReturnValue(mockTopicRef as unknown as Topic);

      const event = {
        eventType: 'identity.user-registered',
        occurredAt: '2026-01-01T00:00:00.000Z',
        payload: {
          userId: 'u1',
          email: 'a@b.com',
          fullName: 'A B',
          roleId: 'r1',
        },
      };

      await service.publish('identity-events', event);

      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        data: Buffer.from(JSON.stringify(event)),
        attributes: { eventType: 'identity.user-registered' },
      });
    });

    it('given an event without a string eventType field, when publish is called, then it uses "unknown" as the eventType attribute', async () => {
      const mockTopic = createMock<Topic>();
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      mockPubSub.topic.mockReturnValue(mockTopicRef as unknown as Topic);

      await service.publish('some-topic', { data: 'no-event-type' });

      expect(mockTopic.publishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ attributes: { eventType: 'unknown' } }),
      );
    });

    it('given publishMessage rejects, when publish is called, then it throws an AppException with code PUBSUB_ERROR', async () => {
      const mockTopic = createMock<Topic>();
      mockTopic.publishMessage.mockRejectedValue(new Error('Network failure') as never);
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      mockPubSub.topic.mockReturnValue(mockTopicRef as unknown as Topic);

      await expect(service.publish('bad-topic', { eventType: 'x' })).rejects.toThrow(AppException);
    });

    it('given publishMessage rejects, when publish is called, then the thrown AppException carries code PUBSUB_ERROR', async () => {
      const mockTopic = createMock<Topic>();
      mockTopic.publishMessage.mockRejectedValue(new Error('Network failure') as never);
      const mockTopicRef = { get: jest.fn().mockResolvedValue([mockTopic]) };
      mockPubSub.topic.mockReturnValue(mockTopicRef as unknown as Topic);

      await expect(service.publish('bad-topic', { eventType: 'x' })).rejects.toMatchObject({
        code: 'PUBSUB_ERROR',
      });
    });
  });
});
