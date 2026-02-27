"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MOCK_EVENTS, MOCK_KEYS, formatMinutes } from "@/lib/mock-data";
import { GlowingEffect } from "@/components/GlowingEffect";
import { EmptyState } from "@/components/EmptyState";
import { Switch } from "@/components/ui/Switch";
import { Search, Clock, Filter, CalendarDays, ArrowLeft, Loader2 } from "lucide-react";

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(
    locale === "de" ? "de-DE" : "en-US",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDate(events: typeof MOCK_EVENTS) {
  const groups: Map<string, typeof MOCK_EVENTS> = new Map();
  for (const event of events) {
    if (!groups.has(event.event_date)) groups.set(event.event_date, []);
    groups.get(event.event_date)!.push(event);
  }
  return groups;
}

export default function EventsPage() {
  const { t, locale } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [gpmOnly, setGpmOnly] = useState(false);

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => {
      const matchesSearch = event.summary
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesKey =
        selectedKey === "all" || event.key_id === selectedKey;
      const matchesGpm = !gpmOnly || event.key_name === "GPM";
      return matchesSearch && matchesKey && matchesGpm;
    });
  }, [search, selectedKey, gpmOnly]);

  const groupedEvents = useMemo(
    () => groupByDate(filteredEvents),
    [filteredEvents]
  );

  const totalHours = useMemo(() => {
    return (
      Math.round(
        (filteredEvents.reduce((s, e) => s + e.duration_minutes, 0) / 60) * 10
      ) / 10
    );
  }, [filteredEvents]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  return (
    <>
      <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: "672px", margin: "0 auto", width: "100%" }}>
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
            <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">
              {t("events.title")}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--app-text-muted)]">
              {filteredEvents.length} {t("events.total")} · {totalHours}{" "}
              {t("common.hours")}
            </p>
          </div>

          {/* Search & Filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row animate-fade-up delay-1">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--app-text-muted)" }}
              />
              <input
                type="text"
                placeholder={t("events.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-icon"
              />
            </div>
            <div className="relative">
              <Filter
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--app-text-muted)" }}
              />
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="input input-icon appearance-none pr-10 cursor-pointer"
                style={{ width: "auto", minWidth: "150px" }}
              >
                <option value="all">{t("events.allKeys")}</option>
                {MOCK_KEYS.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GPM Filter Toggle */}
          <div className="mb-6 flex items-center gap-3 animate-fade-up delay-2">
            <Switch
              size="sm"
              checked={gpmOnly}
              onCheckedChange={setGpmOnly}
              showIcons
            />
            <span className="text-[13px] font-medium text-[var(--app-text-secondary)]">
              {t("events.gpmOnly")}
            </span>
          </div>

          {/* Event List */}
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t("events.noEvents")}
            />
          ) : (
            <div className="space-y-5 animate-fade-up delay-3">
              {Array.from(groupedEvents.entries()).map(([date, events]) => (
                <div key={date}>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                    {formatDate(events[0].start_time, locale)}
                  </p>
                    <div className="relative rounded-[16px]">
                    <GlowingEffect
                      spread={40}
                      glow={true}
                      disabled={false}
                      proximity={64}
                      inactiveZone={0.01}
                      borderWidth={2}
                    />
                    <div className="relative glow-card overflow-hidden">
                      {events.map((event, i) => (
                        <div
                          key={event.id}
                          className={`flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[var(--app-surface-hover)]
                            ${i < events.length - 1 ? "border-b border-[var(--app-border)]" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold">
                              {event.summary}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
                              {formatTime(event.start_time)} –{" "}
                              {formatTime(event.end_time)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="chip text-[11px]">
                              {event.key_name}
                            </span>
                            <span className="chip text-[11px]">
                              <Clock size={10} />
                              {formatMinutes(event.duration_minutes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
