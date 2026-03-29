/** Topic name for user-service outbound events. */
export const USER_EVENTS_TOPIC = 'user-events' as const;

export const USER_EVENT_TYPES = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
} as const;

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

export interface UserDeletedEvent {
  readonly eventType: typeof USER_EVENT_TYPES.DELETED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
  };
}

export type UserEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent;
