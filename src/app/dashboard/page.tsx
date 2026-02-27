"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/mock-data";
import type { Category, TrackingKey } from "@/lib/types";
import { GlowCard } from "@/components/GlowCard";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Key,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Zap,
  CheckCircle2,
} from "lucide-react";

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "14px",
          background: color ? `${color}18` : "var(--app-accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "14px",
        }}
      >
        <Icon size={18} style={color ? { color } : undefined} />
      </div>
      <p
        style={{
          fontSize: "28px",
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
        {label}
      </p>
      {sub && (
        <p
          style={{
            fontSize: "11px",
            color: "var(--app-text-muted)",
            marginTop: "2px",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [categories, setCategories] = useState<Category[]>([]);
  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    newEvents: number;
    matched: number;
    totalCalendarEvents?: number;
    skippedDuplicates?: number;
    matchedSamples?: string[];
    debug?: string[];
    error?: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const loadData = () => {
    if (!session) return;
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/keys").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([catData, keysData]) => {
        setCategories(catData || []);
        setKeys(keysData || []);
      })
      .catch(() => {
        setCategories([]);
        setKeys([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
          skippedDuplicates: result.skippedDuplicates || 0,
          matchedSamples: result.matchedSamples || [],
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
      console.error("Sync error:", err);
      setSyncResult({
        newEvents: 0,
        matched: 0,
        error: `Netzwerkfehler: ${err instanceof Error ? err.message : "Unbekannt"}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Group keys by category
  const categorizedKeys = useMemo(() => {
    const map = new Map<
      string,
      { category: Category | null; keys: TrackingKey[] }
    >();

    // Create entries for each category
    for (const cat of categories) {
      map.set(cat.id, { category: cat, keys: [] });
    }

    // Add uncategorized bucket
    map.set("uncategorized", {
      category: null,
      keys: [],
    });

    // Assign keys to categories
    for (const key of keys) {
      const catId = key.category_id || "uncategorized";
      const bucket = map.get(catId);
      if (bucket) {
        bucket.keys.push(key);
      } else {
        // Category was deleted but key still has reference
        map.get("uncategorized")!.keys.push(key);
      }
    }

    return Array.from(map.values()).filter((b) => b.keys.length > 0);
  }, [categories, keys]);

  // Compute totals
  const totalHours = useMemo(
    () =>
      Math.round(
        (keys.reduce((s, k) => s + k.total_minutes, 0) / 60) * 10
      ) / 10,
    [keys]
  );
  const totalEvents = useMemo(
    () => keys.reduce((s, k) => s + k.event_count, 0),
    [keys]
  );

  if (status === "loading" || loading) {
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
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "780px" }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: "32px" }}>
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
                {t("dashboard.title")}
              </h1>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "13px",
                  color: "var(--app-text-muted)",
                }}
              >
                {t("dashboard.subtitle")}
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              {syncing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              {syncing ? t("tracking.syncing") : t("tracking.sync")}
            </button>
          </div>
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
                    ? `${syncResult.newEvents} neue Events zugeordnet (${syncResult.matched} Treffer, ${syncResult.totalCalendarEvents} Kalender-Events gescannt)`
                    : `Keine neuen Events. ${syncResult.totalCalendarEvents || 0} Kalender-Events gescannt, ${syncResult.matched || 0} Treffer (${syncResult.skippedDuplicates || 0} Duplikate).`}
              </p>
              <div className="flex items-center gap-2">
                {syncResult.debug && syncResult.debug.length > 0 && (
                  <button
                    className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors underline"
                    onClick={() => setShowDebug(!showDebug)}
                  >
                    {showDebug ? "Details ausblenden" : "Details"}
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

            {/* Debug Details */}
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
                {syncResult.matchedSamples &&
                  syncResult.matchedSamples.length > 0 && (
                    <div className="mt-2">
                      <strong>Zuordnungen:</strong>
                      {syncResult.matchedSamples.map((s, i) => (
                        <div key={i}>→ {s}</div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div
          className="animate-fade-up delay-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <StatTile
            icon={Clock}
            label={t("dashboard.totalHours")}
            value={`${totalHours}h`}
            sub="Alle Keys"
          />
          <StatTile
            icon={BarChart3}
            label={t("dashboard.totalEvents")}
            value={totalEvents}
            sub="Getrackte Events"
          />
          <StatTile
            icon={Key}
            label={t("dashboard.activeKeys")}
            value={keys.length}
            sub="Tracking-Keys"
          />
          <StatTile
            icon={FolderOpen}
            label="Kategorien"
            value={categories.length}
            sub="Organisiert"
          />
        </div>

        {/* Categories with Keys */}
        <div className="animate-fade-up delay-2">
          <p className="section-label">
            Nach Kategorie ({categorizedKeys.length})
          </p>

          {categorizedKeys.length === 0 ? (
            <div
              className="glow-card"
              style={{ padding: "40px 24px", textAlign: "center" }}
            >
              <FolderOpen
                size={32}
                style={{
                  color: "var(--app-text-muted)",
                  opacity: 0.4,
                  margin: "0 auto 12px",
                }}
              />
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--app-text-muted)",
                  marginBottom: "8px",
                }}
              >
                Noch keine Keys angelegt.
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--app-text-muted)",
                  marginBottom: "16px",
                }}
              >
                Erstelle Keys um Kalender-Events automatisch zu tracken.
              </p>
              <Link
                href="/keys/new"
                className="btn-primary"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  fontSize: "13px",
                }}
              >
                <Zap size={14} />
                Ersten Key erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {categorizedKeys.map(({ category, keys: catKeys }) => {
                const catId = category?.id || "uncategorized";
                const isExpanded = expandedCategory === catId;
                const totalMin = catKeys.reduce(
                  (s, k) => s + k.total_minutes,
                  0
                );
                const totalEvts = catKeys.reduce(
                  (s, k) => s + k.event_count,
                  0
                );

                return (
                  <GlowCard key={catId}>
                    {/* Category Header */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedCategory(isExpanded ? null : catId)
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="rounded-xl bg-[var(--app-accent-soft)] p-2.5">
                          <FolderOpen
                            size={18}
                            className="text-[var(--app-text-secondary)]"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold truncate">
                            {category?.name || "Ohne Kategorie"}
                          </h3>
                          {category?.description && (
                            <p className="text-[12px] text-[var(--app-text-muted)] truncate mt-0.5">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <div className="chip text-[11px]">
                          <Key size={10} />
                          {catKeys.length} Keys
                        </div>
                        <div className="chip text-[11px]">
                          <Clock size={10} />
                          {formatMinutes(totalMin)}
                        </div>
                        {totalEvts > 0 && (
                          <div className="chip text-[11px]">
                            <TrendingUp size={10} />
                            {totalEvts} Events
                          </div>
                        )}
                        <ChevronRight
                          size={16}
                          className={`text-[var(--app-text-muted)] transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Keys List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--app-border)]">
                        {catKeys.map((key, i) => (
                          <Link
                            key={key.id}
                            href={`/keys/${key.id}/edit`}
                            className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-[var(--app-accent-soft)] transition-all group"
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                              borderBottom:
                                i < catKeys.length - 1
                                  ? "1px solid var(--app-border)"
                                  : "none",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: key.color }}
                              />
                              <span className="text-[14px] font-semibold">
                                {key.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[12px] text-[var(--app-text-muted)] tabular-nums">
                                {formatMinutes(key.total_minutes)}
                              </span>
                              <span className="text-[11px] text-[var(--app-text-muted)]">
                                · {key.event_count} Events
                              </span>
                              <ChevronRight
                                size={14}
                                className="text-[var(--app-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </GlowCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
