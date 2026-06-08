import { api } from '@/lib/api';
import type { Creator, CreatorScore } from '@/lib/api';
import { CreatorsClient } from '@/components/creators/creators-client';

export default async function CreatorsPage() {
  let creators: Creator[] = [];
  let scores: CreatorScore[] = [];
  try {
    [creators, scores] = await Promise.all([api.getCreators(), api.getCreatorScores()]);
  } catch {
    // API unavailable — render empty state
  }

  return <CreatorsClient initialCreators={creators} scores={scores} token={null} />;
}
