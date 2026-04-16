"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Link2,
  FileText,
  Pin,
  PinOff,
  Trash2,
  ExternalLink,
  Search,
  FileSpreadsheet,
  Presentation,
  FileQuestion,
} from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

interface Doc {
  id: string;
  title: string;
  type: "link" | "note";
  url: string | null;
  content: string | null;
  icon: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const ICON_MAP: Record<string, typeof FileText> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: Presentation,
  other: FileQuestion,
};

function detectGoogleIcon(url: string): string {
  if (url.includes("docs.google.com/document")) return "doc";
  if (url.includes("docs.google.com/spreadsheets")) return "sheet";
  if (url.includes("docs.google.com/presentation")) return "slide";
  if (url.includes("docs.google.com/forms")) return "form";
  if (url.includes("drive.google.com")) return "drive";
  return "other";
}

function DocIcon({ icon, type }: { icon: string | null; type: string }) {
  if (type === "note") {
    return <FileText className="h-5 w-5 text-blue-400" />;
  }
  const key = icon || "other";
  const Icon = ICON_MAP[key] || FileQuestion;
  const colorMap: Record<string, string> = {
    doc: "text-blue-400",
    sheet: "text-green-400",
    slide: "text-yellow-400",
    form: "text-purple-400",
    drive: "text-amber-400",
    other: "text-muted-foreground",
  };
  return <Icon className={cn("h-5 w-5", colorMap[key] || "text-muted-foreground")} />;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) throw new Error("Failed to load docs");
      const data = await res.json();
      setDocs(data.docs || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    setSaving(true);
    try {
      const icon = detectGoogleIcon(newLinkUrl);
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLinkTitle.trim(),
          type: "link",
          url: newLinkUrl.trim(),
          icon,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setDocs((prev) => [data.doc, ...prev]);
      setNewLinkTitle("");
      setNewLinkUrl("");
      setShowAddLink(false);
    } catch {
      alert("Failed to save link.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNote = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
          type: "note",
          content: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      // Navigate to the editor
      window.location.href = `/docs/${data.doc.id}`;
    } catch {
      alert("Failed to create document.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (doc: Doc) => {
    const newPinned = !doc.pinned;
    setDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, pinned: newPinned } : d))
    );
    try {
      await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned }),
      });
    } catch {
      fetchDocs();
    }
  };

  const handleDelete = async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      await fetch(`/api/docs/${id}`, { method: "DELETE" });
    } catch {
      fetchDocs();
    }
  };

  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter((d) => d.pinned);
  const unpinned = filtered.filter((d) => !d.pinned);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Docs" description="Save links and create documents">
        <Button variant="outline" onClick={() => setShowAddLink(true)}>
          <Link2 className="mr-2 h-4 w-4" />
          Save Link
        </Button>
        <Button onClick={handleCreateNote} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </PageHeader>

      {/* Add link form */}
      {showAddLink && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Title
              </label>
              <Input
                placeholder="e.g. Project Budget"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              />
            </div>
            <div className="flex-[2]">
              <label className="mb-1 block text-xs text-muted-foreground">
                URL
              </label>
              <Input
                placeholder="https://docs.google.com/..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddLink} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddLink(false);
                  setNewLinkTitle("");
                  setNewLinkUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {docs.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Empty state */}
      {docs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No docs yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Save a Google Doc link or create your own document
          </p>
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Pin className="h-3 w-3" />
            Pinned
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* All docs */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              All Docs
            </h2>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unpinned.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({
  doc,
  onTogglePin,
  onDelete,
}: {
  doc: Doc;
  onTogglePin: (doc: Doc) => void;
  onDelete: (id: string) => void;
}) {
  const isLink = doc.type === "link";
  const preview =
    doc.content && doc.content.length > 80
      ? doc.content.slice(0, 80) + "..."
      : doc.content;

  const cardContent = (
    <Card className="group relative transition-colors hover:border-primary/30">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <DocIcon icon={doc.icon} type={doc.type} />
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
              {doc.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin(doc);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title={doc.pinned ? "Unpin" : "Pin"}
            >
              {doc.pinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(doc.id);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {isLink ? "Link" : "Note"}
          </Badge>
          {isLink && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ExternalLink className="h-2.5 w-2.5" />
              {doc.url?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
            </span>
          )}
        </div>
        {!isLink && preview && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview}
          </p>
        )}
        <p className="mt-auto text-[10px] text-muted-foreground/60">
          {formatDate(doc.updated_at)}
        </p>
      </CardContent>
    </Card>
  );

  if (isLink) {
    return (
      <a href={doc.url || "#"} target="_blank" rel="noreferrer">
        {cardContent}
      </a>
    );
  }

  return <Link href={`/docs/${doc.id}`}>{cardContent}</Link>;
}
