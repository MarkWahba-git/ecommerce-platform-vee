import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Vee Handmade — Handcrafted with Love',
    template: '%s | Vee Handmade',
  },
  description:
    'Discover unique handmade products crafted with love. Jewelry, home decor, accessories, and custom creations.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'Vee Handmade',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
