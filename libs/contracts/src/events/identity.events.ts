/** Pub/Sub topic name for identity-service outbound events. */
export const IDENTITY_EVENTS_TOPIC = 'identity-events' as const;

/** Lookup map of all event type string literals emitted by the identity service. */
export const IDENTITY_EVENT_TYPES = {
  USER_REGISTERED: 'identity.user-registered',
  USER_DEACTIVATED: 'identity.user-deactivated',
} as const;

/** Emitted by the identity service when a new user successfully registers. */
export interface IdentityUserRegisteredEvent {
  readonly eventType: typeof IDENTITY_EVENT_TYPES.USER_REGISTERED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly fullName: string;
    readonly roleId?: string;
  };
}

/** Emitted by the identity service when a user account is deactivated. */
export interface IdentityUserDeactivatedEvent {
  readonly eventType: typeof IDENTITY_EVENT_TYPES.USER_DEACTIVATED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
  };
}

/** Union of all events emitted by the identity service onto the identity-events topic. */
export type IdentityEvent = IdentityUserRegisteredEvent | IdentityUserDeactivatedEvent;
