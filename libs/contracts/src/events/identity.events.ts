/** Topic name for identity-service outbound events. */
export const IDENTITY_EVENTS_TOPIC = 'identity-events' as const;

export const IDENTITY_EVENT_TYPES = {
  USER_REGISTERED: 'identity.user-registered',
  USER_DEACTIVATED: 'identity.user-deactivated',
} as const;

export interface IdentityUserRegisteredEvent {
  readonly eventType: typeof IDENTITY_EVENT_TYPES.USER_REGISTERED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly fullName: string;
    readonly roleId: string;
  };
}

export interface IdentityUserDeactivatedEvent {
  readonly eventType: typeof IDENTITY_EVENT_TYPES.USER_DEACTIVATED;
  readonly occurredAt: string;
  readonly payload: {
    readonly userId: string;
  };
}

export type IdentityEvent =
  | IdentityUserRegisteredEvent
  | IdentityUserDeactivatedEvent;
