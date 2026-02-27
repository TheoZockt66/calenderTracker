"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Clock,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  calendarName: string;
  calendarColor: string;
}

interface CalendarData {
  calendars: { id: string; name: string; color: string; primary: boolean }[];
  events: CalendarEvent[];
  total: number;
}

interface CalendarStats {
  totalEvents: number;
  totalCalendars: number;
  totalHours: number;
  todayEvents: number;
  upcomingEvents: number;
  calendarBreakdown: { name: string; color: string; count: number; hours: number }[];
}

function computeStats(data: CalendarData): CalendarStats {
  const now = new Date();
  const todayStr = now.toDateString();

  let totalMinutes = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  const calMap = new Map<string, { name: string; color: string; count: number; minutes: number }>();

  for (const evt of data.events) {
    if (evt.start && new Date(evt.start).toDateString() === todayStr) todayCount++;
    if (evt.start && new Date(evt.start) > now) upcomingCount++;
    if (evt.start && evt.end && !evt.allDay) {
      const mins = (new Date(evt.end).getTime() - new Date(evt.start).getTime()) / 60000;
      totalMinutes += mins;
      const existing = calMap.get(evt.calendarName);
      if (existing) {
        existing.count++;
        existing.minutes += mins;
      } else {
        calMap.set(evt.calendarName, { name: evt.calendarName, color: evt.calendarColor, count: 1, minutes: mins });
      }
    } else {
      const existing = calMap.get(evt.calendarName);
      if (existing) {
        existing.count++;
      } else {
        calMap.set(evt.calendarName, { name: evt.calendarName, color: evt.calendarColor, count: 1, minutes: 0 });
      }
    }
  }

  const breakdown = Array.from(calMap.values())
    .map((c) => ({ name: c.name, color: c.color, count: c.count, hours: Math.round((c.minutes / 60) * 10) / 10 }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEvents: data.total,
    totalCalendars: data.calendars.length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    todayEvents: todayCount,
    upcomingEvents: upcomingCount,
    calendarBreakdown: breakdown,
  };
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "14px",
          background: "var(--app-accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "14px",
        }}
      >
        <Icon size={18} />
      </div>
      <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>{label}</p>
      {sub && (
        <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>{sub}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/calendar")
        .then((res) => {
          if (!res.ok) throw new Error("Fehler beim Laden");
          return res.json();
        })
        .then((data) => setCalendarData(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  const stats = calendarData ? computeStats(calendarData) : null;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
          <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Dashboard
          </h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--app-text-muted)" }}>
            Übersicht deiner Kalenderdaten.
          </p>
        </div>

        {error && (
          <div
            className="rounded-2xl p-5 text-center mb-6"
            style={{ background: "rgba(255, 59, 48, 0.12)" }}
          >
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#FF3B30" }}>{error}</p>
          </div>
        )}

        {stats && (
          <>
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
              <StatTile icon={CalendarDays} label="Events gesamt" value={stats.totalEvents} sub="±30 Tage" />
              <StatTile icon={Clock} label="Stunden gesamt" value={`${stats.totalHours}h`} sub="Nicht-ganztägig" />
              <StatTile icon={TrendingUp} label="Heute" value={stats.todayEvents} sub="Events heute" />
              <StatTile icon={BarChart3} label="Kommend" value={stats.upcomingEvents} sub="Zukünftige Events" />
            </div>

            {/* Calendar Breakdown */}
            <div className="animate-fade-up delay-2">
              <p className="section-label">
                Nach Kalender ({stats.totalCalendars})
              </p>
              <div className="glow-card" style={{ overflow: "hidden" }}>
                {stats.calendarBreakdown.map((cal, i) => (
                  <div
                    key={cal.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom:
                        i < stats.calendarBreakdown.length - 1
                          ? "1px solid var(--app-border)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: cal.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cal.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                      <span className="chip" style={{ fontSize: "11px" }}>
                        {cal.count} Events
                      </span>
                      {cal.hours > 0 && (
                        <span className="chip" style={{ fontSize: "11px" }}>
                          {cal.hours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {stats.calendarBreakdown.length === 0 && (
                  <div style={{ padding: "24px", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--app-text-muted)" }}>
                      Keine Kalenderdaten vorhanden.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
