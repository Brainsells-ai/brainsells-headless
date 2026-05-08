import type { Metadata } from 'next';
import { Cormorant_Garamond, Crimson_Pro, Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const cormorant = Cormorant_Garamond({
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-cormorant',
  display: 'swap',
});

const crimson = Crimson_Pro({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-crimson',
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://silbe.at'),
  title: {
    default: 'SILBE — Editorial Klassiker für Lesende im deutschsprachigen Raum',
    template: '%s · SILBE',
  },
  description:
    'Worte deutschsprachiger Klassiker als Kunstdrucke. Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach. Hochweißes Premium-Papier 200 g/m², matt, säurefrei. Versand DE/AT 3–6 Werktage.',
  openGraph: {
    type: 'website',
    locale: 'de_AT',
    siteName: 'SILBE',
    images: [{ url: '/og/five-klassiker.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de-AT"
      className={`${cormorant.variable} ${crimson.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
