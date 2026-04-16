"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export default function DocEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/docs/${params.id}`);
        if (!res.ok) throw new Error("Doc not found");
        const data = await res.json();
        setDoc(data.doc);
        setTitle(data.doc.title);
        setContent(data.doc.content || "");
      } catch {
        setError("Could not load document.");
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [params.id]);

  const saveDoc = useCallback(
    async (newTitle: string, newContent: string) => {
      setSaving(true);
      setSaved(false);
      try {
        const res = await fetch(`/api/docs/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, content: newContent }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // silent
      } finally {
        setSaving(false);
      }
    },
    [params.id]
  );

  // Auto-save after 1.5s of inactivity
  const scheduleAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveDoc(newTitle, newContent);
      }, 1500);
    },
    [saveDoc]
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, content);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    scheduleAutoSave(title, val);
  };

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    saveDoc(title, content);
  };

  // Keyboard shortcut: Ctrl/Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-[60vh] animate-pulse rounded-lg border border-border bg-muted/30" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-red-400">{error || "Doc not found"}</p>
        <Link href="/docs">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Docs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/docs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Docs
          </Button>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {saving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saving}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="mb-4 border-none bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Untitled Document"
      />

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="min-h-[60vh] flex-1 resize-none rounded-lg border border-border bg-card p-6 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Start writing..."
      />

      <p className="mt-3 text-[10px] text-muted-foreground/50">
        Auto-saves after you stop typing. Or press Ctrl+S / Cmd+S.
      </p>
    </div>
  );
}
