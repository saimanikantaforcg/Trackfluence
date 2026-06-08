/** Revenue Attribution Models */
export type AttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay';

export type B2BAttributionModel = 'u_shaped' | 'w_shaped' | 'full_path';

export interface AttributionResult {
  id: string;
  orderId: string;
  customerId: string;
  model: AttributionModel;
  totalRevenue: number;
  creatorAttributions: CreatorAttribution[];
  calculatedAt: Date;
}

export interface CreatorAttribution {
  creatorId: string;
  touchpointId: string;
  attributedRevenue: number;
  attributionWeight: number;
  touchpointTimestamp: Date;
}

/** Revenue Intelligence Metrics */
export interface RevenueMetrics {
  totalRevenue: number;
  attributedRevenue: number;
  pipeline: number;
  roas: number;
  cac: number;
  avgOrderValue: number;
  conversionRate: number;
  period: DateRange;
}

export interface CustomerQualityMetrics {
  avgLtv: number;
  retentionRate: number;
  churnRate: number;
  repeatPurchaseRate: number;
}

export interface CreatorPerformance {
  creatorId: string;
  creatorName: string;
  revenue: number;
  conversions: number;
  clicks: number;
  roas: number;
  cac: number;
  avgOrderValue: number;
  customerCount: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CohortAnalysis {
  cohortId: string;
  cohortType: 'creator' | 'revenue' | 'retention';
  period: DateRange;
  customerCount: number;
  revenue: number;
  retentionRate: number;
}
