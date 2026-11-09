import type { Metadata } from 'next';
import ExploreGame from '@/components/explore/ExploreGame';

export const metadata: Metadata = {
  title: 'Castle Relic Hunt',
  description: 'Find five relics, solve the village bridge puzzle, and light the keep in the CONTINUUM castle quest.',
};

export default function ExplorePage() {
  return <ExploreGame />;
}
