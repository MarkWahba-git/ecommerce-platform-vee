import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Vee Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">Willkommen im Vee Verwaltungsbereich.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Produkte', href: '/products', description: 'Produkte verwalten' },
          { label: 'Bestellungen', href: '/orders', description: 'Bestellungen einsehen' },
          { label: 'Kunden', href: '/customers', description: 'Kundenverwaltung' },
          { label: 'Inventar', href: '/inventory', description: 'Lagerbestand verwalten' },
          { label: 'Kategorien', href: '/categories', description: 'Kategorien bearbeiten' },
          { label: 'Rabatte', href: '/discounts', description: 'Gutscheine und Aktionen' },
          { label: 'Kanäle', href: '/channels', description: 'Marktplatz-Verbindungen' },
          { label: 'Sync', href: '/sync', description: 'Synchronisierung überwachen' },
          { label: 'Inhalte', href: '/content', description: 'Blog und Seiten' },
          { label: 'SEO', href: '/seo', description: 'Meta-Daten verwalten' },
          { label: 'Analytik', href: '/analytics', description: 'Statistiken und Berichte' },
          { label: 'Einstellungen', href: '/settings', description: 'Shop-Einstellungen' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border bg-white p-4 transition hover:shadow-md"
          >
            <h3 className="font-semibold">{item.label}</h3>
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
