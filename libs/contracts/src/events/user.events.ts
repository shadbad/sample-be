/** Pub/Sub topic name for user-service outbound events. */
export const USER_EVENTS_TOPIC = 'user-events' as const;

/** Lookup map of all event type string literals emitted by the user service. */
export const USER_EVENT_TYPES = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
} as const;

/** Emitted by the user service when a new user profile is created. */
export interface UserCreatedEvent {
  readonly eventType: typeof USER_EVENT_TYPES.CREATED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly fullName: string;
    readonly roleId: string;
    readonly roleName: string;
  };
}

/** Emitted by the user service when a user profile is updated. */
export interface UserUpdatedEvent {
  readonly eventType: typeof USER_EVENT_TYPES.UPDATED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly fullName: string;
    readonly roleId: string;
    readonly roleName: string;
  };
}

/** Emitted by the user service when a user profile is deleted. */
export interface UserDeletedEvent {
  readonly eventType: typeof USER_EVENT_TYPES.DELETED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
  };
}

/** Union of all events emitted by the user service onto the user-events topic. */
export type UserEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent;
