"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertCircle } from "lucide-react";

type Country = "NL" | "BE";

function getMaskedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "Not configured";
  }
}

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [dbError, setDbError] = useState<string | null>(null);
  const [defaultCountry, setDefaultCountry] = useState<Country>("NL");
  const [supabaseUrl, setSupabaseUrl] = useState<string>("");

  // Load default country from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("defaultCountry");
    if (stored === "NL" || stored === "BE") {
      setDefaultCountry(stored);
    }
  }, []);

  // Test database connection on mount
  useEffect(() => {
    async function testConnection() {
      try {
        setDbStatus("checking");
        const res = await fetch("/api/leads?per_page=1");
        if (res.ok) {
          setDbStatus("connected");
        } else {
          const data = await res.json();
          setDbStatus("disconnected");
          setDbError(data.error || "Connection failed");
        }
      } catch (err) {
        setDbStatus("disconnected");
        setDbError(
          err instanceof Error ? err.message : "Connection test failed"
        );
      }
    }

    // Get Supabase URL from the public env var
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    setSupabaseUrl(url);

    testConnection();
  }, []);

  const handleCountryChange = (country: Country) => {
    setDefaultCountry(country);
    localStorage.setItem("defaultCountry", country);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your scraper settings"
      />

      <div className="grid gap-6">
        {/* Database Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Database Connection</CardTitle>
            <CardDescription>
              Supabase connection status and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              {dbStatus === "checking" ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500" />
                  </span>
                  <span className="text-sm text-yellow-400">Checking...</span>
                </div>
              ) : dbStatus === "connected" ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                  <span className="text-sm text-green-400">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <span className="text-sm text-red-400">Disconnected</span>
                </div>
              )}
            </div>

            {dbError && dbStatus === "disconnected" && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{dbError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Supabase URL:
              </span>
              <code className="rounded bg-muted px-2 py-1 text-sm text-foreground">
                {supabaseUrl ? getMaskedUrl(supabaseUrl) : "Not configured"}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Scraping Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scraping Preferences</CardTitle>
            <CardDescription>
              Default settings for new scrape jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Default Country
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCountryChange("NL")}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    defaultCountry === "NL"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <span role="img" aria-label="Netherlands flag">
                    🇳🇱
                  </span>
                  Netherlands
                </button>
                <button
                  onClick={() => handleCountryChange("BE")}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    defaultCountry === "BE"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <span role="img" aria-label="Belgium flag">
                    🇧🇪
                  </span>
                  Belgium
                </button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Scraper settings like delays, concurrency, and retry limits are
                configured in the scraper&apos;s{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  .env
                </code>{" "}
                file.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GoHighLevel Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                GoHighLevel Integration
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              >
                Coming Soon
              </Badge>
            </div>
            <CardDescription>
              Push qualified leads directly to your GHL account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                GHL API Key
              </label>
              <Input
                type="password"
                placeholder="Enter your GHL API key..."
                disabled
                className="disabled:opacity-40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                GHL Location ID
              </label>
              <Input
                placeholder="Enter your GHL location ID..."
                disabled
                className="disabled:opacity-40"
              />
            </div>
            <Button disabled className="opacity-40">
              Connect
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Version:
              </span>
              <code className="rounded bg-muted px-2 py-1 text-sm text-foreground">
                1.0.0
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for FXMedia contractor lead generation
            </p>
            <div className="pt-2">
              <a
                href="#"
                className="text-sm text-primary hover:underline"
              >
                View on GitHub
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
