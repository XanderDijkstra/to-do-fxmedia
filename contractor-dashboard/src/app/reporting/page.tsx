"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  BarChart3,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronRight,
  Trash2,
  Edit,
} from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { ClientWithStatus, ReportingSource } from "@/lib/reporting/types";

const SOURCES: { key: ReportingSource; label: string }[] = [
  { key: "ga4", label: "GA4" },
  { key: "gsc", label: "Search Console" },
  { key: "meta", label: "Meta Ads" },
];

function SourceStatus({
  pull,
  configured,
}: {
  pull: { status: string; completed_at: string | null } | null;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
        <Circle className="h-3 w-3" />
        Not set up
      </span>
    );
  }
  if (!pull) {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-400">
        <Circle className="h-3 w-3" />
        Never pulled
      </span>
    );
  }
  if (pull.status === "success") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        {pull.completed_at ? formatDate(pull.completed_at) : "Synced"}
      </span>
    );
  }
  if (pull.status === "failed") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-blue-400">
      <Circle className="h-3 w-3 animate-pulse" />
      {pull.status}
    </span>
  );
}

export default function ReportingPage() {
  const [clients, setClients] = useState<ClientWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ga4_property_id: "",
    gsc_site_url: "",
    meta_ad_account_id: "",
    notes: "",
  });

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/reporting/clients");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const resetForm = () => {
    setForm({
      name: "",
      ga4_property_id: "",
      gsc_site_url: "",
      meta_ad_account_id: "",
      notes: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/reporting/clients/${editingId}`
        : "/api/reporting/clients";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await fetchClients();
      resetForm();
    } catch {
      alert("Failed to save client.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: ClientWithStatus) => {
    setForm({
      name: c.name,
      ga4_property_id: c.ga4_property_id || "",
      gsc_site_url: c.gsc_site_url || "",
      meta_ad_account_id: c.meta_ad_account_id || "",
      notes: c.notes || "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? All pulled data will be removed.`)) return;
    setClients((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/reporting/clients/${id}`, { method: "DELETE" });
    } catch {
      fetchClients();
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reporting"
        description="Marketing data across your clients"
      >
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-5">
            <h3 className="text-sm font-semibold">
              {editingId ? "Edit client" : "New client"}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Client name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Optoteam AS"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  GA4 Property ID
                </label>
                <Input
                  placeholder="123456789"
                  value={form.ga4_property_id}
                  onChange={(e) =>
                    setForm({ ...form, ga4_property_id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Search Console site URL
                </label>
                <Input
                  placeholder="https://optoteam.no/"
                  value={form.gsc_site_url}
                  onChange={(e) =>
                    setForm({ ...form, gsc_site_url: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Meta Ad Account ID
                </label>
                <Input
                  placeholder="act_1234567890"
                  value={form.meta_ad_account_id}
                  onChange={(e) =>
                    setForm({ ...form, meta_ad_account_id: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Notes
              </label>
              <Input
                placeholder="Anything relevant..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No clients yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Add your first client to start pulling data
          </p>
        </div>
      )}

      {clients.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clients.map((c) => (
            <Card
              key={c.id}
              className="group relative transition-colors hover:border-primary/30"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/reporting/${c.slug}`}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {c.name}
                      </h3>
                      {!c.active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {c.notes && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {c.notes}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  {SOURCES.map((source) => {
                    const configured =
                      source.key === "ga4"
                        ? !!c.ga4_property_id
                        : source.key === "gsc"
                          ? !!c.gsc_site_url
                          : !!c.meta_ad_account_id;
                    return (
                      <div
                        key={source.key}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">{source.label}</span>
                        <SourceStatus
                          pull={c.last_pull[source.key]}
                          configured={configured}
                        />
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/reporting/${c.slug}`}
                  className={cn(
                    "mt-4 flex items-center justify-end text-xs text-primary",
                    "opacity-0 transition-opacity group-hover:opacity-100"
                  )}
                >
                  View dashboard
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
