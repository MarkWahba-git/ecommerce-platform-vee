import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center bg-secondary px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-7xl">
          Vee Handmade
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Einzigartige handgefertigte Produkte — mit Liebe gemacht.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/shop"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Shop entdecken
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Unsere Geschichte
          </Link>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-foreground">Kategorien</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {['Jewelry', 'Home Decor', 'Accessories'].map((category) => (
            <Link
              key={category}
              href={`/shop/${category.toLowerCase().replace(' ', '-')}`}
              className="group flex h-48 items-center justify-center rounded-lg bg-muted transition hover:bg-accent/10"
            >
              <span className="text-xl font-semibold text-foreground group-hover:text-accent">
                {category}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Propositions */}
      <section className="bg-secondary px-4 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Handgemacht</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Jedes Stück wird sorgfältig von Hand gefertigt.
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Einzigartig</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Personalisierte Produkte nach Ihren Wünschen.
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Nachhaltig</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Hergestellt mit hochwertigen, nachhaltigen Materialien.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
