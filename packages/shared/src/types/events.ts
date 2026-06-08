/** Event types flowing through the Event Intelligence Platform */
export type EventCategory =
  | 'page_view'
  | 'link_click'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'purchase'
  | 'sign_up'
  | 'lead'
  | 'custom';

export interface TrackfluenceEvent {
  id: string;
  eventName: string;
  category: EventCategory;
  timestamp: number;
  sessionId: string;
  customerId?: string;
  creatorId?: string;
  trackingLinkId?: string;
  properties: Record<string, unknown>;
  context: EventContext;
}

export interface EventContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
  page?: {
    url: string;
    referrer?: string;
    title?: string;
  };
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
  };
}

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  enrichedEvent?: TrackfluenceEvent;
}
