import type { Metadata } from 'next';
import ExploreGame from '@/components/explore/ExploreGame';

export const metadata: Metadata = {
  title: 'Castle Relic Hunt',
  description: 'Explore the CONTINUUM castle in third person and find five hidden relics.',
};

export default function ExplorePage() {
  return <ExploreGame />;
}
