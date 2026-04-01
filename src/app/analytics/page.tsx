"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/mock-data";
import type { TrackingKey, TrackedEvent, Category } from "@/lib/types";
import { GlowCard } from "@/components/GlowCard";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Calendar,
  BarChart3,
  Target,
  ChevronRight,
} from "lucide-react";
import { AnimatedSelect } from "@/components/ui/animated-select";

/* ───── helpers ───── */

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getStreakDays(events: TrackedEvent[], keyId?: string): { current: number; longest: number } {
  const filtered = keyId ? events.filter((e) => e.key_id === keyId) : events;
  const daysSet = new Set(filtered.map((e) => e.event_date));
  const sortedDays = Array.from(daysSet).sort().reverse();

  if (sortedDays.length === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().split("T")[0];
  let current = 0;
  let checkDate = new Date(today);

  if (!daysSet.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!daysSet.has(checkDate.toISOString().split("T")[0])) {
      current = 0;
    }
  }

  if (current === 0 && (daysSet.has(today) || daysSet.has(new Date(checkDate).toISOString().split("T")[0]))) {
    const start = daysSet.has(today) ? new Date(today) : new Date(checkDate);
    let d = new Date(start);
    while (daysSet.has(d.toISOString().split("T")[0])) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  }

  let longest = 0;
  const allDays = Array.from(daysSet).sort();
  let streak = 1;
  for (let i = 1; i < allDays.length; i++) {
    const prev = new Date(allDays[i - 1]);
    const curr = new Date(allDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { current, longest };
}

type Period = "week" | "month";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      Promise.all([
        fetch("/api/keys").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/events").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([k, e, c]) => {
          setKeys(k || []);
          setEvents(e || []);
          setCategories(c || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session]);

  /* ───── computed stats ───── */

  const comparison = useMemo(() => {
    const now = new Date();

    if (period === "week") {
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const twoWeeksAgo = new Date(lastMonday);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

      const thisWeekEnd = new Date(thisMonday);
      thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

      const thisWeekEvents = events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= thisMonday && d < thisWeekEnd;
      });
      const lastWeekEvents = events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= lastMonday && d < thisMonday;
      });

      return { current: thisWeekEvents, previous: lastWeekEvents, currentLabel: `KW ${getWeekNumber(now)}`, previousLabel: `KW ${getWeekNumber(lastMonday)}` };
    } else {
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = new Date(thisMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

      const thisMonthEvents = events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= thisMonthStart;
      });
      const lastMonthEvents = events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= lastMonthStart && d < thisMonthStart;
      });

      const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      return {
        current: thisMonthEvents,
        previous: lastMonthEvents,
        currentLabel: monthNames[now.getMonth()],
        previousLabel: monthNames[lastMonthStart.getMonth()],
      };
    }
  }, [events, period]);

  const perKeyComparison = useMemo(() => {
    const currentByKey = new Map<string, number>();
    const previousByKey = new Map<string, number>();

    for (const e of comparison.current) {
      currentByKey.set(e.key_id, (currentByKey.get(e.key_id) || 0) + e.duration_minutes);
    }
    for (const e of comparison.previous) {
      previousByKey.set(e.key_id, (previousByKey.get(e.key_id) || 0) + e.duration_minutes);
    }

    return keys.map((key) => {
      const current = currentByKey.get(key.id) || 0;
      const previous = previousByKey.get(key.id) || 0;
      const diff = current - previous;
      const pct = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;
      return { key, current, previous, diff, pct };
    }).filter((k) => k.current > 0 || k.previous > 0)
      .sort((a, b) => b.current - a.current);
  }, [keys, comparison]);

  const totalCurrent = useMemo(() => comparison.current.reduce((s, e) => s + e.duration_minutes, 0), [comparison]);
  const totalPrevious = useMemo(() => comparison.previous.reduce((s, e) => s + e.duration_minutes, 0), [comparison]);
  const totalDiff = totalCurrent - totalPrevious;
  const totalPct = totalPrevious > 0 ? Math.round((totalDiff / totalPrevious) * 100) : totalCurrent > 0 ? 100 : 0;

  const globalStreak = useMemo(() => getStreakDays(events), [events]);
  const keyStreaks = useMemo(() => {
    const map = new Map<string, { current: number; longest: number }>();
    for (const key of keys) {
      map.set(key.id, getStreakDays(events, key.id));
    }
    return map;
  }, [keys, events]);

  /* ───── budget progress ───── */
  const budgetKeys = useMemo(() => {
    return keys.filter((k) => k.budget_hours_weekly != null && k.budget_hours_weekly > 0);
  }, [keys]);

  const weeklyMinutesByKey = useMemo(() => {
    const thisMonday = getMonday(new Date());
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const map = new Map<string, number>();
    for (const e of events) {
      const d = new Date(e.event_date);
      if (d >= thisMonday && d < nextMonday) {
        map.set(e.key_id, (map.get(e.key_id) || 0) + e.duration_minutes);
      }
    }
    return map;
  }, [events]);

  /* ───── weekly bar chart data (last 8 weeks) ───── */
  const weeklyBars = useMemo(() => {
    const weeks: { label: string; minutes: number; weekStart: Date }[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const monday = getMonday(now);
      monday.setDate(monday.getDate() - i * 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 7);

      const mins = events
        .filter((e) => {
          if (selectedKeyId && e.key_id !== selectedKeyId) return false;
          const d = new Date(e.event_date);
          return d >= monday && d < sunday;
        })
        .reduce((s, e) => s + e.duration_minutes, 0);

      weeks.push({
        label: `KW ${getWeekNumber(monday)}`,
        minutes: mins,
        weekStart: monday,
      });
    }
    return weeks;
  }, [events, selectedKeyId]);

  const maxBarMinutes = useMemo(() => Math.max(...weeklyBars.map((w) => w.minutes), 1), [weeklyBars]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "780px" }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: "32px" }}>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--app-text-muted)", textDecoration: "none", marginBottom: "16px" }}
          >
            <ArrowLeft size={16} />
            Zurück
          </Link>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            {t("analytics.title")}
          </h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--app-text-muted)" }}>
            {t("analytics.subtitle")}
          </p>
        </div>

        {/* Period Toggle */}
        <div
          className="animate-fade-up delay-1"
          style={{ display: "flex", gap: "6px", marginBottom: "24px", padding: "4px", borderRadius: "14px", background: "var(--app-accent-soft)", width: "fit-content" }}
        >
          {([
            { key: "week" as Period, label: "Woche" },
            { key: "month" as Period, label: "Monat" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", fontSize: "13px",
                fontWeight: period === key ? 700 : 500, border: "none", cursor: "pointer", transition: "all 0.2s",
                background: period === key ? "var(--app-card-bg)" : "transparent",
                color: period === key ? "var(--app-text)" : "var(--app-text-muted)",
                boxShadow: period === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview Cards */}
        <div className="animate-fade-up delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <div className="stat-card">
            <div style={{ width: "40px", height: "40px", borderRadius: "14px", background: "var(--app-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
              <BarChart3 size={18} />
            </div>
            <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>{formatMinutes(totalCurrent)}</p>
            <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>{comparison.currentLabel}</p>
            <div className="flex items-center gap-1 mt-1" style={{ fontSize: "12px", color: totalDiff > 0 ? "#34C759" : totalDiff < 0 ? "#FF3B30" : "var(--app-text-muted)" }}>
              {totalDiff > 0 ? <TrendingUp size={12} /> : totalDiff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              <span>{totalDiff > 0 ? "+" : ""}{formatMinutes(Math.abs(totalDiff))} ({totalPct > 0 ? "+" : ""}{totalPct}%)</span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>vs. {comparison.previousLabel}: {formatMinutes(totalPrevious)}</p>
          </div>

          <div className="stat-card">
            <div style={{ width: "40px", height: "40px", borderRadius: "14px", background: "#FF950018", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
              <Flame size={18} style={{ color: "#FF9500" }} />
            </div>
            <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>{globalStreak.current}</p>
            <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>{t("analytics.currentStreak")}</p>
            <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>{t("analytics.longestStreak")}: {globalStreak.longest} {t("analytics.days")}</p>
          </div>

          <div className="stat-card">
            <div style={{ width: "40px", height: "40px", borderRadius: "14px", background: "#5856D618", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
              <Calendar size={18} style={{ color: "#5856D6" }} />
            </div>
            <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>{comparison.current.length}</p>
            <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>Events ({comparison.currentLabel})</p>
            <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>{comparison.previousLabel}: {comparison.previous.length} Events</p>
          </div>

          <div className="stat-card">
            <div style={{ width: "40px", height: "40px", borderRadius: "14px", background: "#34C75918", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
              <Target size={18} style={{ color: "#34C759" }} />
            </div>
            <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>{new Set(comparison.current.map((e) => e.event_date)).size}</p>
            <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>{t("analytics.activeDays")}</p>
            <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>{comparison.previousLabel}: {new Set(comparison.previous.map((e) => e.event_date)).size} Tage</p>
          </div>
        </div>

        {/* Budget Progress */}
        {budgetKeys.length > 0 && (
          <div className="animate-fade-up delay-2" style={{ marginBottom: "24px" }}>
            <p className="section-label">{t("analytics.weeklyBudget")}</p>
            <div className="space-y-3">
              {budgetKeys.map((key) => {
                const spent = weeklyMinutesByKey.get(key.id) || 0;
                const budgetMin = (key.budget_hours_weekly || 0) * 60;
                const pct = budgetMin > 0 ? Math.min((spent / budgetMin) * 100, 100) : 0;
                const overBudget = spent > budgetMin;
                return (
                  <GlowCard key={key.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: key.color }} />
                        <span className="text-[14px] font-semibold">{key.name}</span>
                      </div>
                      <span className="text-[13px] tabular-nums" style={{ color: overBudget ? "#FF3B30" : "var(--app-text-muted)" }}>
                        {formatMinutes(spent)} / {key.budget_hours_weekly}h
                      </span>
                    </div>
                    <div style={{ height: "8px", borderRadius: "4px", background: "var(--app-accent-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px", background: overBudget ? "#FF3B30" : key.color, transition: "width 0.5s ease" }} />
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--app-text-muted)" }}>
                      {overBudget ? `${formatMinutes(spent - budgetMin)} über Budget` : `${formatMinutes(budgetMin - spent)} verbleibend`}
                    </p>
                  </GlowCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Bar Chart */}
        <div className="animate-fade-up delay-2" style={{ marginBottom: "24px" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label" style={{ marginBottom: 0 }}>{t("analytics.weeklyChart")}</p>
            <AnimatedSelect
              value={selectedKeyId || ""}
              onChange={(v) => setSelectedKeyId(v || null)}
              options={[
                { value: "", label: "Alle Keys" },
                ...keys.map((k) => ({ value: k.id, label: k.name })),
              ]}
            />
          </div>
          <GlowCard>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
              {weeklyBars.map((week, i) => {
                const heightPct = maxBarMinutes > 0 ? (week.minutes / maxBarMinutes) * 100 : 0;
                const isCurrentWeek = i === weeklyBars.length - 1;
                return (
                  <div key={week.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                    <span className="text-[10px] tabular-nums mb-1" style={{ color: "var(--app-text-muted)" }}>
                      {week.minutes > 0 ? formatMinutes(week.minutes) : ""}
                    </span>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(heightPct, 2)}%`,
                          borderRadius: "6px 6px 2px 2px",
                          background: isCurrentWeek ? "linear-gradient(180deg, #5856D6 0%, #7B79E8 100%)" : "var(--app-accent-soft)",
                          transition: "height 0.5s ease",
                          minHeight: "4px",
                        }}
                      />
                    </div>
                    <span className="text-[10px] mt-1" style={{ color: isCurrentWeek ? "var(--app-text)" : "var(--app-text-muted)", fontWeight: isCurrentWeek ? 700 : 400 }}>
                      {week.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </div>

        {/* Per Key Comparison */}
        <div className="animate-fade-up delay-3">
          <p className="section-label">{t("analytics.perKey")} ({perKeyComparison.length})</p>
          <div className="space-y-3">
            {perKeyComparison.map(({ key, current, previous, diff, pct }) => {
              const streak = keyStreaks.get(key.id);
              return (
                <GlowCard key={key.id}>
                  <Link href={`/keys/${key.id}/edit`} style={{ textDecoration: "none", color: "inherit" }} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: key.color }} />
                      <div className="min-w-0">
                        <span className="text-[14px] font-semibold block truncate">{key.name}</span>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[12px] text-muted-foreground tabular-nums">{formatMinutes(current)}</span>
                          <span className="text-[11px] flex items-center gap-0.5" style={{ color: diff > 0 ? "#34C759" : diff < 0 ? "#FF3B30" : "var(--app-text-muted)" }}>
                            {diff > 0 ? <TrendingUp size={10} /> : diff < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                            {diff > 0 ? "+" : ""}{formatMinutes(Math.abs(diff))}
                          </span>
                          {streak && streak.current > 0 && (
                            <span className="text-[11px] flex items-center gap-0.5" style={{ color: "#FF9500" }}>
                              <Flame size={10} />{streak.current}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.budget_hours_weekly != null && key.budget_hours_weekly > 0 && (
                        <div style={{ width: "60px", height: "6px", borderRadius: "3px", background: "var(--app-accent-soft)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(((weeklyMinutesByKey.get(key.id) || 0) / (key.budget_hours_weekly * 60)) * 100, 100)}%`, borderRadius: "3px", background: key.color }} />
                        </div>
                      )}
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                </GlowCard>
              );
            })}
          </div>
          {perKeyComparison.length === 0 && (
            <div className="glow-card" style={{ padding: "40px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "var(--app-text-muted)" }}>Noch keine Daten für diesen Zeitraum vorhanden.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
