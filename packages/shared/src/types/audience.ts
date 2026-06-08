/** Audience Activation types */
export interface AudienceSegment {
  id: string;
  name: string;
  description?: string;
  rules: AudienceRule[];
  customerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudienceRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: string | number | boolean | string[];
}

export type ActivationDestination =
  | 'salesforce'
  | 'hubspot'
  | 'salesforce_data_cloud'
  | 'segment'
  | 'sfmc'
  | 'marketo'
  | 'braze';

export interface AudienceExport {
  id: string;
  audienceId: string;
  destination: ActivationDestination;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportedCount: number;
  startedAt: Date;
  completedAt?: Date;
}
