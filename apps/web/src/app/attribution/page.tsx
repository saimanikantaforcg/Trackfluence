import { api } from '@/lib/api';
import { AttributionClient } from '@/components/attribution/attribution-client';

async function fetchData() {
  try {
    const [links, creators] = await Promise.all([api.getTrackingLinks(), api.getCreators()]);
    return { links, creators };
  } catch {
    return { links: [], creators: [] };
  }
}

export default async function AttributionPage() {
  const { links, creators } = await fetchData();
  return <AttributionClient initialLinks={links} creators={creators} />;
}

