import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import RouteTransition from '@/components/RouteTransition';
import './globals.css';
import './event-details.css';
import './walkthrough.css';
import './site-chrome.css';
import './route-transition.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'CONTINUUM 2027 — A World of Possibility', template: '%s | CONTINUUM 2027' },
  description: 'Enter CONTINUUM 2027. Discover Neural Nexsus, PromptX, Nexathon, RedStone Rush and Battleforge — a world of learning, ideas, building and competition by Nexsus at MMMUT, Gorakhpur.',
  applicationName: 'CONTINUUM 2027',
  openGraph: { title: 'CONTINUUM 2027 — A World of Possibility', description: 'One world. Five ways to make your mark. January 2027 · MMMUT, Gorakhpur.', type: 'website', images: ['/assets/posters/redstone-rush.webp'] },
  twitter: { card: 'summary_large_image', title: 'CONTINUUM 2027', description: 'One world. Five ways to make your mark.', images: ['/assets/posters/redstone-rush.webp'] },
  icons: { icon: { url: '/continuum/layers/official-icon.png', type: 'image/png', sizes: '128x128' }, apple: '/continuum/layers/official-icon.png' },
};

export const viewport: Viewport = { themeColor: '#a7cfe2', colorScheme: 'light' };

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return <html lang="en"><body><div id="site-root">{children}</div>{modal}<RouteTransition /></body></html>;
}

