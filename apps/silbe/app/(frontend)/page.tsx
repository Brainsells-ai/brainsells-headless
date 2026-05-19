import type { Metadata } from 'next';
import { Hero } from '@/components/home-r8/Hero';
import { EditorialStatement } from '@/components/home-r8/EditorialStatement';
import { FeaturedEditions } from '@/components/home-r8/FeaturedEditions';
import { EssayTeaser } from '@/components/home-r8/EssayTeaser';
import { AboutTeaser } from '@/components/home-r8/AboutTeaser';
import { NewsletterSection } from '@/components/home-r8/NewsletterSection';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'SILBE — Editionen aus dem literarischen Kanon',
  },
  description:
    'Editionen literarischer Zeilen aus dem deutschsprachigen Kanon — Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach. Auf hochweißem Premium-Papier, 200 g/m², matt, säurefrei.',
  alternates: { canonical: '/' },
  openGraph: {
    images: [{ url: '/og/og-five-klassiker-a.png', width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <EditorialStatement />
      <FeaturedEditions />
      <EssayTeaser />
      <AboutTeaser />
      <NewsletterSection />
    </>
  );
}
