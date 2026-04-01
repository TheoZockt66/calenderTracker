"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Home, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/mock-data";
import type { TrackingKey, TrackedEvent } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hexToGlow(hex: string, alpha = 0.5): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(120,120,255,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── GlassCard ────────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-2xl p-4 backdrop-blur-xl", className)}
      style={{
        background: "var(--app-accent-soft)",
        border: "1px solid var(--app-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KeyVisualizationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const touchStartX = useRef<number>(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const scrolledKey = useRef<string>("");
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(185);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Load all keys once
  useEffect(() => {
    if (!session) return;
    fetch("/api/keys")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: TrackingKey[]) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setKeys(sorted);
      })
      .catch(() => setKeys([]))
      .finally(() => setLoadingKeys(false));
  }, [session]);

  // Measure header height after each key change
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [currentIdx]);

  const currentKey = keys[currentIdx];

  // Load events for the current key
  useEffect(() => {
    if (!currentKey) return;
    setLoadingEvents(true);
    fetch(`/api/events?key_id=${currentKey.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: TrackedEvent[]) => {
        const sorted = [...data].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );
        setEvents(sorted);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [currentKey?.id]);

  // Auto-scroll to anchor entry (5 from bottom)
  useEffect(() => {
    if (events.length === 0) return;
    const key = `${currentIdx}-${events.length}`;
    if (key === scrolledKey.current) return;
    scrolledKey.current = key;
    queueMicrotask(() => {
      anchorRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }, [currentIdx, events.length]);

  function goNext() {
    if (currentIdx < keys.length - 1) setCurrentIdx(currentIdx + 1);
  }

  function goPrev() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) goNext();
    else if (diff < -50) goPrev();
  }

  // ── Loading / Auth states ──────────────────────────────────────────────────

  if (status === "loading" || loadingKeys) {
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

  if (keys.length === 0) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "24px 20px",
          maxWidth: "640px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <p style={{ color: "var(--app-text-muted)", fontSize: "14px" }}>
          Keine Tracking-Keys vorhanden.
        </p>
        <Link href="/keys/new" className="btn-primary">
          Key erstellen
        </Link>
      </main>
    );
  }

  const key = currentKey;
  const color = key.color || "#7C7CFF";
  const glow = hexToGlow(color, 0.5);
  const anchorIdx = Math.max(0, events.length - 5);

  return (
    <main
      style={{ minHeight: "100vh", maxWidth: "640px", margin: "0 auto" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Fixed Header ──────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div
          ref={headerRef}
          className="backdrop-blur-xl"
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            background: "var(--app-bg)",
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--app-border)",
          }}
        >
          {/* Nav row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <Link
              href="/dashboard"
              className="btn-ghost"
              style={{ padding: "7px 11px" }}
            >
              <Home size={15} />
            </Link>

            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "19px", fontWeight: 700, lineHeight: 1.2 }}>
                {key.name}
              </h1>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--app-text-muted)",
                  marginTop: "2px",
                }}
              >
                {currentIdx + 1} / {keys.length}
              </p>
            </div>

            <div style={{ display: "flex", gap: "5px" }}>
              <button
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="btn-ghost"
                style={{
                  padding: "7px 9px",
                  opacity: currentIdx === 0 ? 0.2 : 1,
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={goNext}
                disabled={currentIdx === keys.length - 1}
                className="btn-ghost"
                style={{
                  padding: "7px 9px",
                  opacity: currentIdx === keys.length - 1 ? 0.2 : 1,
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Color bar */}
          <div
            style={{
              height: "2px",
              borderRadius: "2px",
              background: `linear-gradient(90deg, ${color}, ${color}22)`,
              marginBottom: "12px",
            }}
          />

          {/* Stats card */}
          <GlassCard className="p-3">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "var(--app-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "3px",
                  }}
                >
                  Gesamt
                </p>
                <p
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "var(--app-fg)",
                  }}
                >
                  {formatMinutes(key.total_minutes)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--app-text-muted)",
                  }}
                >
                  {key.event_count} Events
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: headerHeight }} />

      {/* ── Scrollable content ──────────────────────────────────── */}
      <div
        style={{ maxWidth: "640px", margin: "0 auto", padding: "14px 20px 64px" }}
      >
        {loadingEvents ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "48px 0",
            }}
          >
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: "var(--app-text-muted)" }}
            />
          </div>
        ) : (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {events.length === 0 && (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--app-text-muted)",
                  textAlign: "center",
                  padding: "32px 0",
                }}
              >
                Noch keine Events für diesen Key.
              </p>
            )}

            {events.map((event, i) => {
              const isFirst = i === 0;
              const isLast = i === events.length - 1;
              const hasConnector = !isLast;

              return (
                <div
                  key={event.id}
                  ref={i === anchorIdx ? anchorRef : undefined}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "stretch",
                    scrollMarginTop: "220px",
                  }}
                >
                  {/* Left column: pill + optional connector */}
                  <div
                    style={{
                      width: "16px",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "26px",
                        flexShrink: 0,
                        background: color,
                        boxShadow: `0 0 10px ${glow}`,
                        borderTopLeftRadius: isFirst ? "8px" : 0,
                        borderTopRightRadius: isFirst ? "8px" : 0,
                        borderBottomLeftRadius: hasConnector ? 0 : "8px",
                        borderBottomRightRadius: hasConnector ? 0 : "8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "white",
                        }}
                      />
                    </div>
                    {hasConnector && (
                      <div
                        style={{ width: "16px", flex: 1, background: color }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      flex: 1,
                      paddingTop: "5px",
                      paddingBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: color,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {formatDate(event.event_date)}
                    </span>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        marginTop: "2px",
                        lineHeight: 1.3,
                        color: "var(--app-fg)",
                      }}
                    >
                      {event.summary}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "5px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--app-text-muted)",
                        }}
                      >
                        {formatTime(event.start_time)} –{" "}
                        {formatTime(event.end_time)}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "11px",
                          color: color,
                          background: `${color}18`,
                          border: `1px solid ${color}30`,
                          borderRadius: "6px",
                          padding: "1px 6px",
                        }}
                      >
                        <Clock size={10} />
                        {formatMinutes(event.duration_minutes)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
