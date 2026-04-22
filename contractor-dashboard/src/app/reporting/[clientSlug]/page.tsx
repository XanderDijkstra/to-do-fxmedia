"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Client } from "@/lib/reporting/types";

export default function ClientDetailPage({
  params,
}: {
  params: { clientSlug: string };
}) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/reporting/clients/${params.clientSlug}`);
        if (!res.ok) throw new Error("Client not found");
        const data = await res.json();
        setClient(data.client);
      } catch {
        setError("Could not load client");
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [params.clientSlug]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-[40vh] animate-pulse rounded-lg border border-border bg-muted/30" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-red-400">{error || "Client not found"}</p>
        <Link href="/reporting">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/reporting">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All clients
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {client.name}
        </h1>
        {client.notes && (
          <p className="mt-1 text-muted-foreground">{client.notes}</p>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            Data connectors coming next
          </p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Once GA4, Search Console, and Meta Ads connectors are wired up, KPIs and charts will appear here.
          </p>
          <div className="mt-6 flex flex-col gap-1 text-left text-xs text-muted-foreground">
            <div>
              <span className="text-muted-foreground/60">GA4 Property:</span>{" "}
              {client.ga4_property_id || "—"}
            </div>
            <div>
              <span className="text-muted-foreground/60">GSC Site:</span>{" "}
              {client.gsc_site_url || "—"}
            </div>
            <div>
              <span className="text-muted-foreground/60">Meta Ad Account:</span>{" "}
              {client.meta_ad_account_id || "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
