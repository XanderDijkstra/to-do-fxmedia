import { Clock } from "@/components/Clock";
import { LinkCard } from "@/components/LinkCard";
import { categoryLabels, links, type LinkCategory } from "@/lib/links";

const order: LinkCategory[] = ["work", "personal", "tools"];

export default function HomePage() {
  const grouped = order.map((category) => ({
    category,
    label: categoryLabels[category],
    items: links.filter((l) => l.category === category),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-2">
        <Clock />
      </header>

      <div className="mt-16 flex flex-col gap-12">
        {grouped.map(
          ({ category, label, items }) =>
            items.length > 0 && (
              <section key={category}>
                <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                  {label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((link) => (
                    <LinkCard key={link.title} link={link} />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>

      <footer className="mt-auto pt-16 text-center text-xs text-white/30">
        main.fx-media.no
      </footer>
    </main>
  );
}
