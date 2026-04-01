"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/mock-data";
import type { TrackingKey, TrackedEvent, Category } from "@/lib/types";
import {
  ArrowLeft,
  Loader2,
  Download,
  FileText,
  FileSpreadsheet,
  CalendarDays,
  Filter,
} from "lucide-react";

type ExportFormat = "csv" | "pdf";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function ExportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<"date" | "key">("date");

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

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.event_date < dateFrom || e.event_date > dateTo) return false;
      if (selectedKeyIds.length > 0 && !selectedKeyIds.includes(e.key_id)) return false;
      return true;
    }).sort((a, b) => a.event_date.localeCompare(b.event_date) || new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events, dateFrom, dateTo, selectedKeyIds]);

  const keyMap = useMemo(() => {
    const map = new Map<string, TrackingKey>();
    for (const k of keys) map.set(k.id, k);
    return map;
  }, [keys]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const totalMinutes = useMemo(
    () => filteredEvents.reduce((s, e) => s + e.duration_minutes, 0),
    [filteredEvents]
  );

  const toggleKey = (keyId: string) => {
    setSelectedKeyIds((prev) =>
      prev.includes(keyId) ? prev.filter((id) => id !== keyId) : [...prev, keyId]
    );
  };

  /* ───── CSV Export ───── */
  const exportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Datum", "Startzeit", "Endzeit", "Dauer (Min)", "Dauer (Std)", "Event", "Key", "Kategorie"];
    const rows = filteredEvents.map((e) => {
      const key = keyMap.get(e.key_id);
      const cat = key?.category_id ? categoryMap.get(key.category_id) : null;
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return [
        e.event_date,
        start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        String(e.duration_minutes),
        (e.duration_minutes / 60).toFixed(2),
        `"${e.summary.replace(/"/g, '""')}"`,
        key?.name || e.key_name,
        cat?.name || "Ohne Kategorie",
      ];
    });

    // Summary rows
    rows.push([]);
    rows.push(["Zusammenfassung"]);
    rows.push(["Zeitraum", `${dateFrom} bis ${dateTo}`]);
    rows.push(["Events gesamt", String(filteredEvents.length)]);
    rows.push(["Stunden gesamt", (totalMinutes / 60).toFixed(2)]);

    // Per key summary
    rows.push([]);
    rows.push(["Key", "Events", "Stunden"]);
    const keyStats = new Map<string, { events: number; minutes: number }>();
    for (const e of filteredEvents) {
      const prev = keyStats.get(e.key_id) || { events: 0, minutes: 0 };
      prev.events++;
      prev.minutes += e.duration_minutes;
      keyStats.set(e.key_id, prev);
    }
    for (const [keyId, stats] of keyStats) {
      const key = keyMap.get(keyId);
      rows.push([key?.name || "Unbekannt", String(stats.events), (stats.minutes / 60).toFixed(2)]);
    }

    const csv = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    downloadFile(csv, `CalendarTracker_${dateFrom}_${dateTo}.csv`, "text/csv;charset=utf-8");
  }, [filteredEvents, dateFrom, dateTo, keyMap, categoryMap, totalMinutes]);

  /* ───── PDF Export (HTML-based) ───── */
  const exportPDF = useCallback(() => {
    const key_summaries: string[] = [];
    const keyStats = new Map<string, { events: number; minutes: number }>();
    for (const e of filteredEvents) {
      const prev = keyStats.get(e.key_id) || { events: 0, minutes: 0 };
      prev.events++;
      prev.minutes += e.duration_minutes;
      keyStats.set(e.key_id, prev);
    }
    for (const [keyId, stats] of keyStats) {
      const key = keyMap.get(keyId);
      key_summaries.push(`
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${key?.name || "Unbekannt"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${stats.events}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${(stats.minutes / 60).toFixed(1)}h</td>
        </tr>
      `);
    }

    const eventRows = filteredEvents.map((e) => {
      const key = keyMap.get(e.key_id);
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.event_date}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.summary}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${key?.name || e.key_name}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;">${formatMinutes(e.duration_minutes)}</td>
        </tr>
      `;
    });

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>CalendarTracker Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 32px; margin-bottom: 8px; color: #666; }
  .meta { font-size: 13px; color: #888; margin-bottom: 24px; }
  .summary { display: flex; gap: 32px; margin-bottom: 24px; }
  .summary-item { text-align: center; }
  .summary-item .value { font-size: 28px; font-weight: 800; }
  .summary-item .label { font-size: 12px; color: #888; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<h1>CalendarTracker - Stundenzettel</h1>
<p class="meta">${dateFrom} bis ${dateTo} · Erstellt am ${new Date().toLocaleDateString("de-DE")}</p>

<div class="summary">
  <div class="summary-item"><div class="value">${(totalMinutes / 60).toFixed(1)}h</div><div class="label">Gesamt</div></div>
  <div class="summary-item"><div class="value">${filteredEvents.length}</div><div class="label">Events</div></div>
  <div class="summary-item"><div class="value">${keyStats.size}</div><div class="label">Keys</div></div>
</div>

<h2>Zusammenfassung pro Key</h2>
<table>
  <thead><tr><th>Key</th><th style="text-align:right;">Events</th><th style="text-align:right;">Stunden</th></tr></thead>
  <tbody>${key_summaries.join("")}</tbody>
</table>

<h2>Alle Events</h2>
<table>
  <thead><tr><th>Datum</th><th>Zeit</th><th>Event</th><th>Key</th><th style="text-align:right;">Dauer</th></tr></thead>
  <tbody>${eventRows.join("")}</tbody>
</table>

<script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onafterprint = () => URL.revokeObjectURL(url);
    }
  }, [filteredEvents, dateFrom, dateTo, keyMap, totalMinutes]);

  const handleExport = () => {
    if (format === "csv") exportCSV();
    else exportPDF();
  };

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
            {t("export.title")}
          </h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--app-text-muted)" }}>
            {t("export.subtitle")}
          </p>
        </div>

        {/* Format Toggle */}
        <div
          className="animate-fade-up delay-1"
          style={{ display: "flex", gap: "6px", marginBottom: "24px", padding: "4px", borderRadius: "14px", background: "var(--app-accent-soft)", width: "fit-content" }}
        >
          {([
            { key: "csv" as ExportFormat, label: "CSV", icon: FileSpreadsheet },
            { key: "pdf" as ExportFormat, label: "PDF", icon: FileText },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFormat(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", fontSize: "13px",
                fontWeight: format === key ? 700 : 500, border: "none", cursor: "pointer", transition: "all 0.2s",
                background: format === key ? "var(--app-card-bg)" : "transparent",
                color: format === key ? "var(--app-text)" : "var(--app-text-muted)",
                boxShadow: format === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="glow-card animate-fade-up delay-1" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Date range */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                <CalendarDays size={12} className="inline mr-1" />
                {t("export.dateRange")}
              </label>
              <div className="flex items-center gap-3">
                <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ flex: 1 }} />
                <span className="text-[13px] text-[var(--app-text-muted)]">bis</span>
                <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ flex: 1 }} />
              </div>
              {/* Quick selects */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[
                  { label: "Diese Woche", fn: () => { const m = getMonday(new Date()); setDateFrom(m.toISOString().split("T")[0]); setDateTo(new Date().toISOString().split("T")[0]); } },
                  { label: "Dieser Monat", fn: () => { const d = new Date(); d.setDate(1); setDateFrom(d.toISOString().split("T")[0]); setDateTo(new Date().toISOString().split("T")[0]); } },
                  { label: "Letzter Monat", fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); setDateFrom(d.toISOString().split("T")[0]); const end = new Date(); end.setDate(0); setDateTo(end.toISOString().split("T")[0]); } },
                  { label: "Alles", fn: () => { setDateFrom("2020-01-01"); setDateTo(new Date().toISOString().split("T")[0]); } },
                ].map((q) => (
                  <button key={q.label} className="chip text-[11px] cursor-pointer hover:opacity-80" onClick={q.fn}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key filter */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                <Filter size={12} className="inline mr-1" />
                Keys filtern
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="chip text-[11px] cursor-pointer"
                  style={{
                    background: selectedKeyIds.length === 0 ? "var(--app-card-bg)" : "transparent",
                    fontWeight: selectedKeyIds.length === 0 ? 700 : 400,
                  }}
                  onClick={() => setSelectedKeyIds([])}
                >
                  Alle
                </button>
                {keys.map((key) => (
                  <button
                    key={key.id}
                    className="chip text-[11px] cursor-pointer"
                    style={{
                      background: selectedKeyIds.includes(key.id) ? `${key.color}25` : "transparent",
                      color: selectedKeyIds.includes(key.id) ? key.color : "var(--app-text-muted)",
                      borderColor: selectedKeyIds.includes(key.id) ? `${key.color}40` : "var(--app-border)",
                    }}
                    onClick={() => toggleKey(key.id)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: key.color }} />
                    {key.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="animate-fade-up delay-2" style={{ marginBottom: "24px" }}>
          <p className="section-label">Vorschau ({filteredEvents.length} Events · {formatMinutes(totalMinutes)})</p>
          <div className="glow-card" style={{ maxHeight: "300px", overflowY: "auto", padding: "0" }}>
            {filteredEvents.length === 0 ? (
              <p style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--app-text-muted)" }}>
                Keine Events im gewählten Zeitraum.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", top: 0, background: "var(--app-card-bg)", padding: "10px 12px", fontSize: "11px", textAlign: "left", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--app-border)" }}>Datum</th>
                    <th style={{ position: "sticky", top: 0, background: "var(--app-card-bg)", padding: "10px 12px", fontSize: "11px", textAlign: "left", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--app-border)" }}>Event</th>
                    <th style={{ position: "sticky", top: 0, background: "var(--app-card-bg)", padding: "10px 12px", fontSize: "11px", textAlign: "left", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--app-border)" }}>Key</th>
                    <th style={{ position: "sticky", top: 0, background: "var(--app-card-bg)", padding: "10px 8px", fontSize: "11px", textAlign: "right", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--app-border)" }}>Dauer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.slice(0, 50).map((e) => {
                    const key = keyMap.get(e.key_id);
                    return (
                      <tr key={e.id}>
                        <td style={{ padding: "8px 12px", fontSize: "12px", borderBottom: "1px solid var(--app-border)", whiteSpace: "nowrap" }}>{e.event_date}</td>
                        <td style={{ padding: "8px 12px", fontSize: "12px", borderBottom: "1px solid var(--app-border)" }} className="truncate max-w-[200px]">{e.summary}</td>
                        <td style={{ padding: "8px 12px", fontSize: "12px", borderBottom: "1px solid var(--app-border)" }}>
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: key?.color || "#666" }} />
                            {key?.name || e.key_name}
                          </span>
                        </td>
                        <td style={{ padding: "8px 8px", fontSize: "12px", borderBottom: "1px solid var(--app-border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatMinutes(e.duration_minutes)}</td>
                      </tr>
                    );
                  })}
                  {filteredEvents.length > 50 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--app-text-muted)" }}>
                        … und {filteredEvents.length - 50} weitere Events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Export Button */}
        <div className="animate-fade-up delay-3">
          <button
            className="btn-primary w-full"
            onClick={handleExport}
            disabled={filteredEvents.length === 0}
            style={{
              padding: "14px",
              fontSize: "14px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: filteredEvents.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={16} />
            {format === "csv" ? "Als CSV exportieren" : "Als PDF drucken"}
          </button>
        </div>
      </div>
    </main>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
