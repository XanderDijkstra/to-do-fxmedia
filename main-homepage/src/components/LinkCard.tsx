import { ArrowUpRight } from "lucide-react";
import type { HomeLink } from "@/lib/links";

interface LinkCardProps {
  link: HomeLink;
}

export function LinkCard({ link }: LinkCardProps) {
  const Icon = link.icon;
  const isPlaceholder = link.href === "#";

  return (
    <a
      href={link.href}
      target={isPlaceholder ? undefined : "_blank"}
      rel={isPlaceholder ? undefined : "noreferrer"}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${link.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${link.accent} ring-1 ring-white/10`}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-white/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/80" />
      </div>
      <div className="relative mt-6">
        <h3 className="text-base font-semibold text-white">{link.title}</h3>
        <p className="mt-1 text-sm text-white/50">{link.description}</p>
      </div>
    </a>
  );
}
