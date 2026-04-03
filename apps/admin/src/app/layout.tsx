import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Vee Admin',
    template: '%s | Vee Admin',
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
