import type { Metadata } from 'next';
import CampusGame from '@/components/campus/CampusGame';

export const metadata: Metadata = {
  title: 'Explore MMMUT Campus',
  description: 'Walk through a voxel MMMUT campus, meet the people behind CONTINUUM 2027, and discover five festival events.',
};

export default function CampusPage() {
  return <CampusGame />;
}
