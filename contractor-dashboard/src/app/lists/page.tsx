"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { List, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { ListRecord } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function countryFlag(country: string): string {
  const upper = country.toUpperCase();
  if (upper.includes("NL") && upper.includes("BE")) return "\ud83c\uddf3\ud83c\uddf1 \ud83c\udde7\ud83c\uddea";
  if (upper.includes("NL")) return "\ud83c\uddf3\ud83c\uddf1";
  if (upper.includes("BE")) return "\ud83c\udde7\ud83c\uddea";
  return country;
}

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) {
        throw new Error(`Failed to fetch lists (${res.status})`);
      }
      const data = await res.json();
      // API returns { lists: [...] }
      const listsArr: ListRecord[] = Array.isArray(data) ? data : data.lists || [];
      setLists(listsArr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleDelete = async (
    e: React.MouseEvent,
    listId: string,
    listName: string
  ) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${listName}"? This will also delete all leads in this list.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch {
      alert("Failed to delete list. Please try again.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Lists"
        description="View and manage your lead lists"
      />

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
          <Button variant="ghost" size="sm" onClick={fetchLists} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading skeleton */}
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

            {/* Empty state */}
            {!loading && lists.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <List className="h-10 w-10 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium text-muted-foreground">
                        No lists yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground/70">
                        Start your first scrape!
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/scrape")}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      New Scrape
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!loading &&
              lists.map((list) => (
                <TableRow
                  key={list.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/lists/${list.id}`)}
                >
                  <TableCell className="font-medium text-foreground">
                    {list.name}
                  </TableCell>
                  <TableCell>{list.trade_type || '--'}</TableCell>
                  <TableCell>{list.search_location || '--'}</TableCell>
                  <TableCell>{list.country ? countryFlag(list.country) : '--'}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(list.lead_count ?? list.leads_count ?? 0)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(list.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={(e) => handleDelete(e, list.id, list.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
