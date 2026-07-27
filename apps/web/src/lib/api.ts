import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  // For server-side calls (RSC), forward the JWT from the request cookie
  let authHeader: Record<string, string> = {};
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("tf_token")?.value;
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Not in a server component context — client-side calls will use
    // whatever Authorization header the caller provides
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
    next: { revalidate: 30 }, // ISR: revalidate every 30s for server components
    ...init,
  });

  // Global 401 handling: clear stale session and redirect
  if (res.status === 401 && typeof window !== "undefined") {
    const { clearAuthSession, redirectToLogin } = await import("./auth-utils");
    clearAuthSession();
    redirectToLogin();
    throw new Error("Session expired. Redirecting to login.");
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type AttributionModel =
  | "FIRST_TOUCH"
  | "LAST_TOUCH"
  | "LINEAR"
  | "TIME_DECAY";

export const ATTRIBUTION_MODELS: {
  value: AttributionModel;
  label: string;
}[] = [
  { value: "FIRST_TOUCH", label: "First Touch" },
  { value: "LAST_TOUCH", label: "Last Touch" },
  { value: "LINEAR", label: "Linear" },
  { value: "TIME_DECAY", label: "Time Decay" },
];

export interface DashboardMetrics {
  totalRevenue: number;
  attributedRevenue: number;
  attributionRate: number;
  orderCount: number;
  avgOrderValue: number;
  creatorAcquiredCustomers: number;
  attributionCount: number;
  totalClicks?: number;
  clickToAttributionRate?: number;
  model?: string;
}

export interface TimeSeriesPoint {
  month: string;
  revenue: number;
  attributed: number;
}

export interface CreatorPerformance {
  creatorId: string;
  creatorName: string;
  attributedRevenue: number;
  conversions: number;
}

export interface TrackingLink {
  id: string;
  shortCode: string;
  destinationUrl: string;
  type: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  promoCode?: string;
  clickCount: number;
  createdAt: string;
  creator: { id: string; name: string; handle?: string };
}

export interface Creator {
  id: string;
  name: string;
  email?: string;
  platform?: string;
  handle?: string;
  _count: { trackingLinks: number; attributions: number };
}

export interface Customer {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  creatorAcquired: boolean;
  totalRevenue: number;
  orderCount: number;
  ltv: number;
  firstSeenAt: string;
}

export interface CohortData {
  period: string;
  customerCount: number;
  totalRevenue: number;
}

export interface CampaignBreakdown {
  campaign: string;
  source: string;
  medium: string;
  attributedRevenue: number;
  conversions: number;
  creatorCount: number;
  revenueShare: number;
}

export interface ConnectorStatus {
  type: string;
  lastSync: string | null;
  status: string;
  recordsProcessed: number;
}

export interface CreatorScore {
  creatorId: string;
  name: string;
  handle: string | null;
  platform: string | null;
  attributedRevenue: number;
  conversions: number;
  totalClicks: number;
  score: number;
  tier: "platinum" | "gold" | "silver" | "bronze";
}

export interface SearchResult {
  type: "creator" | "customer" | "tracking_link";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export type AudienceRuleField =
  | "creatorAcquired"
  | "totalRevenue"
  | "orderCount"
  | "creatorId"
  | "channel";
export type AudienceRuleOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte";

export interface AudienceRule {
  field: AudienceRuleField;
  operator: AudienceRuleOperator;
  value: string | number | boolean;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string | null;
  rules: AudienceRule[];
  customerCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface AudienceExportResult {
  exportId: string;
  audienceId: string;
  destination: string;
  status: string;
  estimatedRecords: number;
}

export type ExportDestination =
  | "salesforce"
  | "salesforce_data_cloud"
  | "sfmc"
  | "shopify";

export interface SearchResults {
  creators: SearchResult[];
  customers: SearchResult[];
  links: SearchResult[];
}

// ─── Compliance types ─────────────────────────────────────────

export interface ComplianceSummary {
  totalChecks: number;
  compliantCount: number;
  nonCompliantCount: number;
  complianceRate: number;
  topIssues: { issue: string; count: number }[];
}

export interface CreatorComplianceRow {
  creatorId: string;
  name: string;
  platform: string | null;
  handle: string | null;
  totalChecks: number;
  compliantCount: number;
  nonCompliantCount: number;
  complianceRate: number | null;
  lastCheckedAt: string | null;
  lastCheckPassed: boolean | null;
}

export interface FTCCheckResult {
  id: string;
  creatorId: string;
  contentUrl: string;
  contentType: string;
  hasDisclosure: boolean;
  disclosureType: string | null;
  isCompliant: boolean;
  issues: string[];
  checkedAt: string;
}

// ─── Customer types ───────────────────────────────────────────

export interface CustomerIdentity {
  id: string;
  identityType: string;
  identityValue: string;
  lastSeen: string;
}

export interface CustomerProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  externalId: string | null;
  creatorAcquired: boolean;
  totalRevenue: number;
  orderCount: number;
  createdAt: string;
  identities: CustomerIdentity[];
  touchpoints: {
    id: string;
    timestamp: string;
    utmSource: string | null;
    utmCampaign: string | null;
    creator: { id: string; name: string } | null;
  }[];
  orders: {
    id: string;
    orderDate: string;
    totalAmount: number;
    currency: string;
    status: string;
  }[];
}

export interface CustomerSearchResult {
  items: CustomerProfile[];
  total: number;
  page: number;
  limit: number;
}

export interface TouchpointAttribution {
  touchpointId: string;
  creatorId: string;
  creatorName?: string;
  weight: number;
  revenue: number;
}

export interface OrderAttributionResult {
  orderId: string;
  attributions: TouchpointAttribution[];
  message?: string;
}

export interface TrackingLinkStats {
  id: string;
  shortCode: string;
  destinationUrl: string;
  clickCount: number;
  type: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  promoCode: string | null;
  createdAt: string;
  creator: { id: string; name: string; handle: string | null };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
}

export interface SystemStats {
  users: number;
  creators: number;
  customers: number;
  orders: number;
  attributions: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  budget: string | null;
  currency: string;
  status: string;
  creatorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats extends Campaign {
  spend: number;
  remaining: number | null;
  roi: number | null;
}

export interface CampaignListResponse {
  items: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Payout {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  campaignId: string | null;
  campaign: { id: string; name: string } | null;
  amount: string;
  currency: string;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  periodStart: string;
  periodEnd: string;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PayoutListResponse {
  items: Payout[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommissionEstimate {
  creatorId: string;
  creatorName: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  commissionRate: number;
  estimatedCommission: number;
  attributionCount: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unread: number;
}

export interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  status: "ACTIVE" | "DISABLED";
  description: string | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  attemptedAt: string;
}

export const api = {
  // Revenue Intelligence
  getDashboard: (
    from?: string,
    to?: string,
    model?: string,
  ): Promise<DashboardMetrics> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (model) params.set("model", model);
    return fetcher(`/api/v1/revenue-intelligence/dashboard?${params}`);
  },
  getTimeSeries: (
    from?: string,
    to?: string,
    model?: string,
  ): Promise<TimeSeriesPoint[]> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (model) params.set("model", model);
    return fetcher(`/api/v1/revenue-intelligence/timeseries?${params}`);
  },
  getRoas: (from?: string, to?: string, model?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (model) params.set("model", model);
    return fetcher(`/api/v1/revenue-intelligence/roas?${params}`);
  },
  getCreatorPerformance: (
    limit = 10,
    from?: string,
    to?: string,
    model?: string,
  ): Promise<CreatorPerformance[]> => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (model) params.set("model", model);
    return fetcher(
      `/api/v1/revenue-intelligence/creators/performance?${params}`,
    );
  },

  getCampaigns: (from?: string, to?: string): Promise<CampaignBreakdown[]> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return fetcher(`/api/v1/revenue-intelligence/campaigns?${params}`);
  },
  getConnectorStatus: (): Promise<ConnectorStatus[]> =>
    fetcher("/api/v1/revenue-intelligence/connectors/status"),
  getCohorts: (): Promise<CohortData[]> =>
    fetcher("/api/v1/revenue-intelligence/cohorts?type=creator"),
  getCreatorScores: (): Promise<CreatorScore[]> =>
    fetcher("/api/v1/revenue-intelligence/creators/scores"),

  // Audiences
  listAudiences: (): Promise<AudienceSegment[]> => fetcher("/api/v1/audiences"),
  getAudience: (id: string): Promise<AudienceSegment> =>
    fetcher(`/api/v1/audiences/${id}`),
  createAudience: (data: {
    name: string;
    description?: string;
    rules: AudienceRule[];
  }): Promise<AudienceSegment> =>
    fetcher("/api/v1/audiences", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteAudience: (id: string): Promise<void> =>
    fetcher(`/api/v1/audiences/${id}`, { method: "DELETE" }),
  computeAudience: (
    id: string,
  ): Promise<{ audienceId: string; customerCount: number }> =>
    fetcher(`/api/v1/audiences/${id}/compute`, { method: "POST" }),
  exportAudience: (
    id: string,
    destination: ExportDestination,
  ): Promise<AudienceExportResult> =>
    fetcher(`/api/v1/audiences/${id}/export`, {
      method: "POST",
      body: JSON.stringify({ destination }),
    }),

  // Creators
  getCreators: (search?: string): Promise<Creator[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    return fetcher(`/api/v1/creators?${params}`);
  },
  createCreator: (data: {
    name: string;
    email?: string;
    platform?: string;
    handle?: string;
  }): Promise<Creator> =>
    fetcher("/api/v1/creators", { method: "POST", body: JSON.stringify(data) }),

  // Attribution
  getTrackingLinks: (creatorId?: string): Promise<TrackingLink[]> => {
    const params = new URLSearchParams();
    if (creatorId) params.set("creatorId", creatorId);
    return fetcher(`/api/v1/attribution/tracking-links?${params}`);
  },
  getTrackingLink: (id: string): Promise<TrackingLinkStats> =>
    fetcher(`/api/v1/attribution/tracking-links/${id}`),
  calculateOrderAttribution: (
    orderId: string,
    model?: string,
  ): Promise<OrderAttributionResult> => {
    const params = new URLSearchParams();
    if (model) params.set("model", model);
    return fetcher(
      `/api/v1/revenue-attribution/calculate/${orderId}?${params}`,
      { method: "POST" },
    );
  },
  getOrderAttribution: (orderId: string): Promise<OrderAttributionResult> =>
    fetcher(`/api/v1/revenue-attribution/order/${orderId}`),
  createTrackingLink: (data: Record<string, unknown>): Promise<TrackingLink> =>
    fetcher("/api/v1/attribution/tracking-links", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Identity
  getCustomers: (
    filters?: Record<string, string>,
  ): Promise<{ customers: Customer[]; total: number }> => {
    const params = new URLSearchParams(filters);
    return fetcher(`/api/v1/identity/customers?${params}`);
  },
  getCustomer: (id: string): Promise<CustomerProfile> =>
    fetcher(`/api/v1/identity/customers/${id}`),
  searchCustomers: (params: {
    email?: string;
    creatorAcquired?: boolean;
    page?: number;
    limit?: number;
  }): Promise<CustomerSearchResult> => {
    const p = new URLSearchParams();
    if (params.email) p.set("email", params.email);
    if (params.creatorAcquired !== undefined)
      p.set("creatorAcquired", String(params.creatorAcquired));
    if (params.page) p.set("page", String(params.page));
    if (params.limit) p.set("limit", String(params.limit));
    return fetcher(`/api/v1/identity/customers?${p}`);
  },

  // Compliance
  getComplianceSummary: (): Promise<ComplianceSummary> =>
    fetcher("/api/v1/compliance/ftc/summary"),
  getAllCreatorCompliance: (): Promise<CreatorComplianceRow[]> =>
    fetcher("/api/v1/compliance/ftc/creators"),
  getCreatorCompliance: (creatorId: string) =>
    fetcher(`/api/v1/compliance/ftc/creator/${creatorId}`),
  runFTCCheck: (data: {
    creatorId: string;
    contentUrl: string;
    contentType: string;
    contentText?: string;
    hasSponsorship?: boolean;
  }): Promise<FTCCheckResult> =>
    fetcher("/api/v1/compliance/ftc/check", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Search
  search: (q: string): Promise<SearchResults> =>
    fetcher(`/api/v1/search?q=${encodeURIComponent(q)}&limit=5`),

  // Admin (ADMIN role required — pass token via headers)
  adminListUsers: (token: string): Promise<AdminUser[]> =>
    fetcher("/api/v1/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  adminUpdateRole: (
    token: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ): Promise<AdminUser> =>
    fetcher(`/api/v1/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminGetStats: (token: string): Promise<SystemStats> =>
    fetcher("/api/v1/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  adminFlushCache: (token: string): Promise<{ flushed: true }> =>
    fetcher("/api/v1/admin/cache", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminGetAuditLog: (token: string, limit = 100): Promise<AuditLogEntry[]> =>
    fetcher(`/api/v1/admin/audit-log?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),

  // API Keys
  listApiKeys: (token: string): Promise<ApiKeyRecord[]> =>
    fetcher("/api/v1/api-keys", {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  generateApiKey: (
    token: string,
    name: string,
    scopes?: string[],
  ): Promise<{
    key: string;
    id: string;
    prefix: string;
    name: string;
    scopes: string[];
    createdAt: string;
  }> =>
    fetcher("/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, scopes }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  revokeApiKey: (token: string, id: string): Promise<void> =>
    fetcher(`/api/v1/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Campaigns (CRUD management)
  listCampaigns: (page = 1, limit = 20): Promise<CampaignListResponse> =>
    fetcher(`/api/v1/campaigns?page=${page}&limit=${limit}`),
  getCampaignStats: (id: string): Promise<CampaignStats> =>
    fetcher(`/api/v1/campaigns/${id}/stats`),
  createCampaign: (token: string, data: Partial<Campaign>): Promise<Campaign> =>
    fetcher("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateCampaign: (
    token: string,
    id: string,
    data: Partial<Campaign>,
  ): Promise<Campaign> =>
    fetcher(`/api/v1/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  deleteCampaign: (token: string, id: string): Promise<{ deleted: boolean }> =>
    fetcher(`/api/v1/campaigns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Payouts
  getPayouts: (
    token: string,
    params?: { creatorId?: string; status?: string; page?: number },
  ): Promise<PayoutListResponse> => {
    const q = new URLSearchParams();
    if (params?.creatorId) q.set("creatorId", params.creatorId);
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    return fetcher(`/api/v1/payouts?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
  },
  calculateCommission: (
    creatorId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<CommissionEstimate> => {
    const q = new URLSearchParams({ creatorId, periodStart, periodEnd });
    return fetcher(`/api/v1/payouts/calculate?${q}`);
  },
  createPayout: (token: string, data: object): Promise<Payout> =>
    fetcher("/api/v1/payouts", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  approvePayout: (token: string, id: string): Promise<Payout> =>
    fetcher(`/api/v1/payouts/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  markPayoutPaid: (token: string, id: string): Promise<Payout> =>
    fetcher(`/api/v1/payouts/${id}/pay`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  cancelPayout: (token: string, id: string): Promise<Payout> =>
    fetcher(`/api/v1/payouts/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  bulkApprovePayout: (
    token: string,
    ids: string[],
  ): Promise<{ approved: number; skipped: number }> =>
    fetcher("/api/v1/payouts/bulk-approve", {
      method: "POST",
      body: JSON.stringify({ ids }),
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Notifications
  getNotifications: (
    token: string,
    limit = 30,
  ): Promise<NotificationListResponse> =>
    fetcher(`/api/v1/notifications?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  markNotificationRead: (token: string, id: string): Promise<unknown> =>
    fetcher(`/api/v1/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  markAllNotificationsRead: (token: string): Promise<unknown> =>
    fetcher("/api/v1/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Creator invite
  inviteCreator: (
    token: string,
    creatorId: string,
  ): Promise<{ invited: boolean; email: string }> =>
    fetcher(`/api/v1/creators/${creatorId}/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateCreatorCommission: (
    token: string,
    creatorId: string,
    commissionRate: number,
  ): Promise<unknown> =>
    fetcher(`/api/v1/creators/${creatorId}/commission`, {
      method: "PATCH",
      body: JSON.stringify({ commissionRate }),
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Webhooks (admin)
  listWebhooks: (token: string): Promise<WebhookRecord[]> =>
    fetcher("/api/v1/webhooks", {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  createWebhook: (
    token: string,
    data: { url: string; description?: string; events?: string[] },
  ): Promise<WebhookRecord & { secret: string }> =>
    fetcher("/api/v1/webhooks", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  toggleWebhook: (token: string, id: string): Promise<WebhookRecord> =>
    fetcher(`/api/v1/webhooks/${id}/toggle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  deleteWebhook: (token: string, id: string): Promise<{ deleted: boolean }> =>
    fetcher(`/api/v1/webhooks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  listWebhookDeliveries: (
    token: string,
    id: string,
  ): Promise<WebhookDelivery[]> =>
    fetcher(`/api/v1/webhooks/${id}/deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
};
