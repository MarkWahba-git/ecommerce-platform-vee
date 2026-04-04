import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: {
    default: 'Vee Admin',
    template: '%s | Vee Admin',
  },
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Derive a human-readable page title from the pathname header.
// Next.js 15 passes the request pathname via the `x-pathname` header
// when middleware rewrites, but we fall back to a basic segment parse.
// ---------------------------------------------------------------------------
function titleFromPathname(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the current pathname so we can derive a title for the top bar.
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? '/';
  const isLoginPage = pathname.startsWith('/login');

  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {isLoginPage ? (
          children
        ) : (
          <DashboardShell title={titleFromPathname(pathname)}>
            {children}
          </DashboardShell>
        )}
      </body>
    </html>
  );
}
