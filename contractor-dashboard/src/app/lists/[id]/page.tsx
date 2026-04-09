"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  Phone,
  Mail,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SimpleSelect } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { LEAD_STATUSES } from "@/lib/constants";
import type { Lead, ListRecord } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

// --- Clipboard toast helper ---
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
      title={`Copy ${label}`}
    >
      <span>{text}</span>
      {copied ? (
        <span className="inline-flex items-center gap-1 text-xs text-green-400">
          <Check className="h-3 w-3" />
          Copied!
        </span>
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
      )}
    </button>
  );
}

// --- Status badge ---
function StatusBadge({
  status,
  onChange,
}: {
  status: string;
  onChange: (newStatus: string) => void;
}) {
  const statusConfig = LEAD_STATUSES.find((s) => s.value === status);
  const colorClass = statusConfig?.color || "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-ring",
          colorClass
        )}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s.value} value={s.value} className="bg-card text-foreground">
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Stars display ---
function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="text-muted-foreground text-sm">--</span>;
  }
  const full = Math.floor(rating);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-yellow-400">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={i} className="inline h-3.5 w-3.5 fill-yellow-400" />
        ))}
      </span>
      <span className="text-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ListDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const listId = params.id;

  // Data
  const [list, setList] = useState<ListRecord | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasPhoneFilter, setHasPhoneFilter] = useState(false);
  const [hasEmailFilter, setHasEmailFilter] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Export loading
  const [exporting, setExporting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, leadsRes] = await Promise.all([
        fetch(`/api/lists/${listId}`),
        fetch(`/api/leads?list_id=${listId}`),
      ]);

      if (!listRes.ok) throw new Error("Failed to load list details");
      if (!leadsRes.ok) throw new Error("Failed to load leads");

      const listJson = await listRes.json();
      const leadsJson = await leadsRes.json();

      // API returns { list: {...} } and { leads: [...], total, page, per_page }
      const listData: ListRecord = listJson.list || listJson;
      const leadsData: Lead[] = leadsJson.leads || (Array.isArray(leadsJson) ? leadsJson : []);

      setList(listData);
      setLeads(leadsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.business_name?.toLowerCase().includes(q) ||
          lead.city?.toLowerCase().includes(q) ||
          lead.address?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((lead) => lead.status === statusFilter);
    }

    if (hasPhoneFilter) {
      result = result.filter((lead) => lead.phone && lead.phone.trim() !== "");
    }

    if (hasEmailFilter) {
      result = result.filter((lead) => lead.email && lead.email.trim() !== "");
    }

    return result;
  }, [leads, searchQuery, statusFilter, hasPhoneFilter, hasEmailFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, hasPhoneFilter, hasEmailFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const withPhone = leads.filter((l) => l.phone && l.phone.trim()).length;
    const withEmail = leads.filter((l) => l.email && l.email.trim()).length;
    const rated = leads.filter((l) => l.rating !== null && l.rating !== undefined);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, l) => sum + (l.rating || 0), 0) / rated.length
        : 0;
    return { total, withPhone, withEmail, avgRating };
  }, [leads]);

  // Select all on current page
  const allOnPageSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((lead) => selectedIds.has(lead.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const newSet = new Set(selectedIds);
      paginatedLeads.forEach((lead) => newSet.delete(lead.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedLeads.forEach((lead) => newSet.add(lead.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Status change for individual lead
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      // Revert on failure
      fetchData();
    }
  };

  // Bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;

    // Optimistic
    setLeads((prev) =>
      prev.map((l) =>
        selectedIds.has(l.id) ? { ...l, status: newStatus } : l
      )
    );

    try {
      const res = await fetch("/api/leads/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: Array.from(selectedIds),
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      setSelectedIds(new Set());
    } catch {
      fetchData();
    }
  };

  // Export all
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/leads/export?list_id=${listId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list?.name || "leads"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Export selected
  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list?.name || "leads"}-selected.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export selected leads. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/30" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg border border-border bg-muted/30" />
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div>
        <PageHeader title="List Details" />
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-red-400">{error}</p>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    ...LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ];

  const bulkStatusOptions = LEAD_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={list?.name || "List Details"}
        description={
          list ? `${list.trade_type || ''} in ${list.search_location || ''}`.trim() : undefined
        }
      >
        <Button
          variant="outline"
          onClick={handleExportAll}
          disabled={exporting || leads.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export All to CSV"}
        </Button>
      </PageHeader>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <span className="text-2xl font-bold text-foreground">
              {formatNumber(stats.total)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Total Leads
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <span className="inline-flex items-center gap-1.5 text-2xl font-bold text-foreground">
              <Phone className="h-5 w-5 text-green-400" />
              {formatNumber(stats.withPhone)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              With Phone
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <span className="inline-flex items-center gap-1.5 text-2xl font-bold text-foreground">
              <Mail className="h-5 w-5 text-blue-400" />
              {formatNumber(stats.withEmail)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              With Email
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <span className="inline-flex items-center gap-1.5 text-2xl font-bold text-foreground">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Avg Rating
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search business name, city, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <SimpleSelect
          className="w-[180px]"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent">
          <input
            type="checkbox"
            checked={hasPhoneFilter}
            onChange={(e) => setHasPhoneFilter(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          Has Phone
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent">
          <input
            type="checkbox"
            checked={hasEmailFilter}
            onChange={(e) => setHasEmailFilter(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          Has Email
        </label>
        <span className="text-sm text-muted-foreground">
          {formatNumber(filteredLeads.length)} result{filteredLeads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Change Status:</span>
            <SimpleSelect
              className="w-[160px] h-9"
              options={bulkStatusOptions}
              value=""
              onChange={(val) => handleBulkStatusChange(val)}
              placeholder="Select status..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSelected}
            disabled={exporting}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No leads match your filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {paginatedLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                </TableCell>
                <TableCell>
                  {lead.google_maps_url ? (
                    <a
                      href={lead.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {lead.business_name}
                    </a>
                  ) : (
                    <span className="font-medium text-foreground">
                      {lead.business_name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.phone ? (
                    <CopyButton text={lead.phone} label="phone" />
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.email ? (
                    <CopyButton text={lead.email} label="email" />
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors max-w-[150px] truncate"
                      title={lead.website}
                    >
                      {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 25)}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {lead.city || <span className="text-muted-foreground">--</span>}
                </TableCell>
                <TableCell>
                  <RatingStars rating={lead.rating} />
                </TableCell>
                <TableCell className="text-right text-sm">
                  {lead.reviews_count !== null && lead.reviews_count !== undefined
                    ? formatNumber(lead.reviews_count)
                    : "--"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={lead.status}
                    onChange={(newStatus) =>
                      handleStatusChange(lead.id, newStatus)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
