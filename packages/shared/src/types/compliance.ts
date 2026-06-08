/** Compliance & Trust types */
export interface FTCComplianceCheck {
  id: string;
  creatorId: string;
  contentUrl: string;
  contentType: 'post' | 'story' | 'video' | 'blog';
  hasDisclosure: boolean;
  disclosureType?: 'hashtag' | 'verbal' | 'text_overlay' | 'description';
  isCompliant: boolean;
  issues: string[];
  checkedAt: Date;
}

export interface ComplianceSummary {
  totalChecks: number;
  compliantCount: number;
  nonCompliantCount: number;
  complianceRate: number;
  topIssues: { issue: string; count: number }[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BrandSafetyScore {
  creatorId: string;
  overallScore: number;
  riskLevel: RiskLevel;
  factors: {
    category: string;
    score: number;
    details: string;
  }[];
  calculatedAt: Date;
}
