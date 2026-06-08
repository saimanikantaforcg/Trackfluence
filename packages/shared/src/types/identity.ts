/** Identity resolution types */
export interface CustomerIdentity {
  id: string;
  customerId: string;
  identityType: IdentityType;
  identityValue: string;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
}

export type IdentityType =
  | 'email'
  | 'phone'
  | 'crm_id'
  | 'device_id'
  | 'session_id'
  | 'fbp'
  | 'fbc';

export interface CustomerProfile {
  id: string;
  externalId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  identities: CustomerIdentity[];
  segments: string[];
  firstSeenAt: Date;
  lastSeenAt: Date;
  creatorAcquired: boolean;
  acquisitionCreatorId?: string;
  totalRevenue: number;
  orderCount: number;
  ltv: number;
}

export interface IdentityGraphNode {
  customerId: string;
  identities: CustomerIdentity[];
  touchpoints: number;
  purchases: number;
}

export interface IdentityResolutionResult {
  resolved: boolean;
  customerId: string;
  mergedFrom?: string[];
  confidence: number;
}
