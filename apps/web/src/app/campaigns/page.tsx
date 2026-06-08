import { api } from '@/lib/api';
import CampaignsClient from '@/components/campaigns/campaigns-client';

export default async function CampaignsPage() {
  let initial = null;
  try {
    initial = await api.listCampaigns(1);
  } catch {
    // fall through to client-side fetch
  }
  return <CampaignsClient initial={initial} />;
}
