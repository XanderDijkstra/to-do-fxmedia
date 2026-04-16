"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Clock } from "@/components/Clock";
import { LinkCard } from "@/components/LinkCard";
import { categoryLabels, links, type LinkCategory } from "@/lib/links";

const STORAGE_KEY = "fxmedia-dismissed";

const order: LinkCategory[] = ["work", "personal", "tools"];

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export default function HomePage() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissed(loadDismissed());
    setMounted(true);
  }, []);

  const handleDismiss = useCallback((title: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(title);
      saveDismissed(next);
      return next;
    });
  }, []);

  const handleRestoreAll = useCallback(() => {
    setDismissed(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const visibleLinks = links.filter((l) => !dismissed.has(l.title));

  const grouped = order.map((category) => ({
    category,
    label: categoryLabels[category],
    items: visibleLinks.filter((l) => l.category === category),
  }));

  const hasDismissed = dismissed.size > 0;

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
                    <LinkCard
                      key={link.title}
                      link={link}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>

      {mounted && hasDismissed && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={handleRestoreAll}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore all cards
          </button>
        </div>
      )}

      <footer className="mt-auto pt-16 text-center text-xs text-white/30">
        main.fx-media.no
      </footer>
    </main>
  );
}
