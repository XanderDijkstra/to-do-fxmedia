import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Mail,
  Calendar,
  Github,
  FileText,
  Globe,
} from "lucide-react";

export type LinkCategory = "work" | "personal" | "tools";

export interface HomeLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  category: LinkCategory;
  accent: string; // tailwind gradient classes
}

// TODO: Xander will fill in the real hrefs.
export const links: HomeLink[] = [
  {
    title: "Contractor Dashboard",
    description: "Manage scraped leads and job lists",
    href: "#",
    icon: LayoutDashboard,
    category: "work",
    accent: "from-blue-500/30 to-cyan-500/20",
  },
  {
    title: "Gmail",
    description: "Inbox",
    href: "#",
    icon: Mail,
    category: "personal",
    accent: "from-rose-500/30 to-orange-500/20",
  },
  {
    title: "Calendar",
    description: "Schedule and events",
    href: "#",
    icon: Calendar,
    category: "personal",
    accent: "from-emerald-500/30 to-teal-500/20",
  },
  {
    title: "GitHub",
    description: "Repositories and PRs",
    href: "#",
    icon: Github,
    category: "tools",
    accent: "from-slate-400/30 to-slate-600/20",
  },
  {
    title: "Docs",
    description: "Notes and documentation",
    href: "#",
    icon: FileText,
    category: "tools",
    accent: "from-amber-500/30 to-yellow-500/20",
  },
  {
    title: "fx-media.no",
    description: "Main website",
    href: "#",
    icon: Globe,
    category: "work",
    accent: "from-purple-500/30 to-fuchsia-500/20",
  },
];

export const categoryLabels: Record<LinkCategory, string> = {
  work: "Work",
  personal: "Personal",
  tools: "Tools",
};
