import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { TrustBar } from '@/components/home/TrustBar';
import { FuenfStimmen } from '@/components/home/FuenfStimmen';
import { FeaturedEditions } from '@/components/home/FeaturedEditions';
import { WerkstattTeaser } from '@/components/home/WerkstattTeaser';
import { BibliothekTeaser } from '@/components/home/BibliothekTeaser';
import { EditorialLetter } from '@/components/home/EditorialLetter';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'SILBE — Editorial Klassiker für Lesende im deutschsprachigen Raum',
  },
  description:
    'Worte deutschsprachiger Klassiker als Kunstdrucke auf hochweißem Premium-Papier, 200 g/m², matt, säurefrei. Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach. Versand DE/AT 3–6 Werktage.',
  alternates: { canonical: '/' },
  openGraph: {
    images: [{ url: '/og/og-five-klassiker-a.png', width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <FeaturedEditions />
      <FuenfStimmen />
      <EditorialLetter />
      <WerkstattTeaser />
      <BibliothekTeaser />
    </>
  );
}
