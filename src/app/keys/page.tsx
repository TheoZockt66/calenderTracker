"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/mock-data";
import type { TrackingKey, Category } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import type { FilterOption } from "@/components/ui/data-table-filter";
import {
  Plus,
  Search,
  Clock,
  Key,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ListChecks,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface GoogleCalendar {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

export default function KeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    newEvents: number;
    matched: number;
    totalCalendarEvents?: number;
    error?: string;
    debug?: string[];
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const loadData = () => {
    // Load calendars
    fetch("/api/calendar")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCalendars(data.calendars || []))
      .catch(() => setCalendars([]));

    // Load keys from database
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setKeys(data || []))
      .catch(() => setKeys([]));

    // Load categories from database
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setShowDebug(false);
    try {
      const res = await fetch("/api/tracking", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setSyncResult({
          newEvents: result.newEvents || 0,
          matched: result.matched || 0,
          totalCalendarEvents: result.totalCalendarEvents || 0,
          debug: result.debug || [],
        });
        loadData();
      } else {
        setSyncResult({
          newEvents: 0,
          matched: 0,
          error: result.error || "Unbekannter Fehler",
          debug: result.debug || [result.details || "Keine Details"],
        });
      }
    } catch (err) {
      setSyncResult({
        newEvents: 0,
        matched: 0,
        error: `Netzwerkfehler: ${err instanceof Error ? err.message : "Unbekannt"}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);

  // Build category filter options from DB data
  const categoryFilterOptions: FilterOption[] = useMemo(() => {
    const opts: FilterOption[] = categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    }));
    opts.push({ value: "uncategorized", label: t("keys.uncategorized") });
    return opts;
  }, [categories, t]);

  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      const matchesSearch = key.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory.length === 0 ||
        (selectedCategory.includes("uncategorized") && !key.category_id) ||
        (key.category_id && selectedCategory.includes(key.category_id));
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, keys]);

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "Ohne Kategorie";
    return categories.find((c) => c.id === categoryId)?.name || "Ohne Kategorie";
  };

  const getCalendarName = (calendarId: string | null) => {
    if (!calendarId) return null;
    const cal = calendars.find((c) => c.id === calendarId);
    return cal ? cal.name : null;
  };

  const getCalendarColor = (calendarId: string | null) => {
    if (!calendarId) return undefined;
    const cal = calendars.find((c) => c.id === calendarId);
    return cal?.color || undefined;
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--app-text-muted)" }}
        />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Back + Header */}
        <div className="mb-6 animate-fade-up">
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--app-text-muted)",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            <ArrowLeft size={16} />
            Zurück
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1
                style={{
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {t("keys.title")}
              </h1>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "14px",
                  color: "var(--app-text-muted)",
                }}
              >
                {t("keys.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="btn-secondary"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--app-border)",
                  background: "var(--app-card)",
                  cursor: syncing ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {syncing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {syncing ? "Sync..." : "Sync"}
              </button>
              <ButtonColorful
                label={t("keys.addKey")}
                onClick={() => router.push("/keys/new")}
              />
            </div>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row animate-fade-up delay-1">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--app-text-muted)" }}
            />
            <input
              type="text"
              placeholder={t("keys.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-icon"
            />
          </div>
          <DataTableFilter
            label={t("keys.allCategories")}
            options={categoryFilterOptions}
            selectedValues={selectedCategory}
            onChange={(vals) => setSelectedCategory(vals)}
          />
        </div>

        {/* Sync Result Banner */}
        {syncResult && (
          <div
            className="animate-fade-up rounded-2xl p-4 mb-6"
            style={{
              background: syncResult.error
                ? "rgba(255, 59, 48, 0.12)"
                : syncResult.newEvents > 0
                  ? "rgba(52, 199, 89, 0.12)"
                  : "var(--app-accent-soft)",
              border: syncResult.error
                ? "1px solid rgba(255, 59, 48, 0.25)"
                : syncResult.newEvents > 0
                  ? "1px solid rgba(52, 199, 89, 0.25)"
                  : "1px solid var(--app-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={18}
                style={{
                  color: syncResult.error
                    ? "#FF3B30"
                    : syncResult.newEvents > 0
                      ? "#34C759"
                      : "var(--app-text-muted)",
                }}
              />
              <p style={{ fontSize: "13px", fontWeight: 500, flex: 1 }}>
                {syncResult.error
                  ? `Fehler: ${syncResult.error}`
                  : syncResult.newEvents > 0
                    ? `${syncResult.newEvents} neue Events zugeordnet (${syncResult.matched} Treffer)`
                    : `Keine neuen Events. ${syncResult.totalCalendarEvents || 0} Kalender-Events gescannt, ${syncResult.matched || 0} Treffer.`}
              </p>
              <div className="flex items-center gap-2">
                {syncResult.debug && syncResult.debug.length > 0 && (
                  <button
                    className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors underline"
                    onClick={() => setShowDebug(!showDebug)}
                  >
                    {showDebug ? "Ausblenden" : "Details"}
                  </button>
                )}
                <button
                  className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  onClick={() => setSyncResult(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            {showDebug && syncResult.debug && (
              <div
                className="mt-3 pt-3"
                style={{
                  borderTop: "1px solid var(--app-border)",
                  fontSize: "11px",
                  color: "var(--app-text-muted)",
                  fontFamily: "monospace",
                  lineHeight: "1.6",
                }}
              >
                {syncResult.debug.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keys Grid */}
        {filteredKeys.length === 0 ? (
          <EmptyState
            icon={Key}
            title={t("keys.noKeys")}
            action={
              <button
                className="btn-primary"
                onClick={() => router.push("/keys/new")}
              >
                <Plus size={16} />
                {t("keys.addKey")}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up delay-2">
            {filteredKeys.map((key) => {
              const calName = getCalendarName(key.calendar_id);
              const calColor = getCalendarColor(key.calendar_id);
              const categoryName = getCategoryName(key.category_id);
              const tasks = key.tasks || [];

              return (
                <Link
                  key={key.id}
                  href={`/keys/${key.id}/edit`}
                  className="key-card group"
                >
                  {/* Color accent bar at top */}
                  <div
                    style={{
                      height: "4px",
                      background: `linear-gradient(90deg, ${key.color}, ${key.color}88)`,
                    }}
                  />

                  <div style={{ padding: "20px" }}>
                    {/* Top row: icon + event count */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${key.color}22, ${key.color}44)`,
                          border: `1px solid ${key.color}33`,
                        }}
                      >
                        <Key
                          size={18}
                          style={{ color: key.color }}
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="chip text-[12px]"
                          style={{
                            background: `${key.color}15`,
                            color: key.color,
                            border: `1px solid ${key.color}25`,
                          }}
                        >
                          {key.event_count} Events
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: "17px",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        marginBottom: "2px",
                      }}
                    >
                      {key.name}
                    </h3>

                    {/* Search Key */}
                    {key.search_key && key.search_key !== key.name && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--app-text-muted)",
                          marginBottom: "2px",
                          fontFamily: "monospace",
                        }}
                      >
                        Key: {key.search_key}
                      </p>
                    )}

                    {/* Category */}
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--app-text-secondary)",
                        marginBottom: "16px",
                      }}
                    >
                      {categoryName}
                    </p>

                    {/* Stats row */}
                    <div
                      className="flex items-center gap-2 flex-wrap pt-3"
                      style={{ borderTop: "1px solid var(--app-border)" }}
                    >
                      <div
                        className="chip text-[12px]"
                        style={{
                          background: "var(--app-accent-soft)",
                          color: "var(--app-text-secondary)",
                        }}
                      >
                        <Clock size={12} />
                        {formatMinutes(key.total_minutes)}
                      </div>
                      {tasks.length > 0 && (
                        <div
                          className="chip text-[12px]"
                          style={{
                            background: "var(--app-accent-soft)",
                            color: "var(--app-text-secondary)",
                          }}
                        >
                          <ListChecks size={12} />
                          {tasks.length} Tasks
                        </div>
                      )}
                      {calName && (
                        <div
                          className="chip text-[12px] truncate"
                          style={{
                            background: "var(--app-accent-soft)",
                            color: "var(--app-text-secondary)",
                            borderLeft: calColor
                              ? `3px solid ${calColor}`
                              : undefined,
                            maxWidth: "140px",
                          }}
                        >
                          {calName}
                        </div>
                      )}
                      <span
                        className="ml-auto text-[12px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ color: key.color }}
                      >
                        Bearbeiten
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${key.color}30, 0 8px 32px ${key.color}12`,
                    }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
