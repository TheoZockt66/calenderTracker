"use client"

import { useSession, signOut } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatMinutes } from "@/lib/mock-data"
import type { Category, TrackingKey, TrackedEvent } from "@/lib/types"
import { DataTableFilter } from "@/components/ui/data-table-filter"
import type { FilterOption } from "@/components/ui/data-table-filter"
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
} from "lucide-react"

type ChartPoint = {
  label: string
  minutes: number
  events: number
}

type SyncResult = {
  newEvents: number
  matched: number
  removedEvents?: number
  totalCalendarEvents?: number
  error?: string
}

type ChartMode = "day" | "week" | "month"

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0]
}

function getDefaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 84)
  return toDateInputValue(date)
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  })
}

function getDayLabel(date: Date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  })
}

function getDisplayDate(value: string) {
  if (!value) return "Datum wählen"
  return new Date(`${value}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date()
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const startOffset = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - startOffset)

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })

  const monthLabel = viewDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  })

  const changeMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", position: "relative", zIndex: open ? 1000 : "auto" }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--app-text-muted)" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          height: "48px",
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
          boxShadow: open ? "0 0 0 2px rgba(52, 199, 89, 0.35), 0 18px 44px rgba(0,0,0,0.28)" : "none",
        }}
      >
        <span>{getDisplayDate(value)}</span>
        <CalendarDays size={16} style={{ color: open ? "#34C759" : "var(--app-text-muted)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "76px",
            left: 0,
            zIndex: 10000,
            width: "300px",
            padding: "14px",
            borderRadius: "18px",
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.48)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" className="btn-ghost" aria-label="Vorheriger Monat" onClick={() => changeMonth(-1)} style={{ width: "34px", height: "34px", padding: 0, borderRadius: "999px", border: "1px solid var(--app-border)", background: "var(--app-accent-soft)", color: "var(--app-text)", fontSize: 0 }}>
              <ChevronLeft size={16} />
              ‹
            </button>
            <span style={{ fontSize: "13px", fontWeight: 800, textTransform: "capitalize" }}>
              {monthLabel}
            </span>
            <button type="button" className="btn-ghost" aria-label="Nächster Monat" onClick={() => changeMonth(1)} style={{ width: "34px", height: "34px", padding: 0, borderRadius: "999px", border: "1px solid var(--app-border)", background: "var(--app-accent-soft)", color: "var(--app-text)", fontSize: 0 }}>
              <ChevronRight size={16} />
              ›
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "6px" }}>
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
              <span key={day} style={{ textAlign: "center", fontSize: "10px", color: "var(--app-text-muted)", fontWeight: 700 }}>
                {day}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {days.map((date) => {
              const dateValue = toDateInputValue(date)
              const selected = dateValue === value
              const muted = date.getMonth() !== viewDate.getMonth()

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => {
                    onChange(dateValue)
                    setOpen(false)
                  }}
                  style={{
                    height: "34px",
                    borderRadius: "10px",
                    border: selected ? "1px solid rgba(52, 199, 89, 0.85)" : "1px solid transparent",
                    background: selected ? "linear-gradient(180deg, #34C759, #5856D6)" : "transparent",
                    color: selected ? "white" : muted ? "var(--app-text-muted)" : "var(--app-text)",
                    fontSize: "12px",
                    fontWeight: selected ? 800 : 600,
                    cursor: "pointer",
                    opacity: muted ? 0.45 : 1,
                  }}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function isWithinLifetime(eventDate: string, key?: TrackingKey) {
  if (!key) return true
  if (key.lifetime_start && eventDate < key.lifetime_start) return false
  if (key.lifetime_end && eventDate > key.lifetime_end) return false
  return true
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
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
      <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>
        {value}
      </p>
      <p style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: "11px", color: "var(--app-text-muted)", marginTop: "2px" }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function BarChart({
  title,
  data,
}: {
  title: string
  data: ChartPoint[]
}) {
  const maxMinutes = Math.max(...data.map((item) => item.minutes), 1)

  return (
    <div className="glow-card" style={{ padding: "20px" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>
            {title}
          </p>
          <p style={{ fontSize: "12px", color: "var(--app-text-muted)" }}>
            {data.length} Zeiträume
          </p>
        </div>
        <BarChart3 size={18} style={{ color: "var(--app-text-muted)" }} />
      </div>

      {data.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--app-text-muted)", fontSize: "13px" }}>
          Keine Daten im gewählten Zeitraum
        </div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "220px", minWidth: `${Math.max(data.length * 48, 320)}px` }}>
            {data.map((item) => {
              const height = Math.max((item.minutes / maxMinutes) * 100, item.minutes > 0 ? 4 : 0)
              return (
                <div
                  key={item.label}
                  style={{
                    flex: 1,
                    minWidth: "34px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--app-text-muted)",
                      minHeight: "16px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.minutes > 0 ? formatMinutes(item.minutes) : ""}
                  </span>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                    <div
                      title={`${item.label}: ${formatMinutes(item.minutes)}`}
                      style={{
                        width: "100%",
                        height: `${height}%`,
                        borderRadius: "7px 7px 3px 3px",
                        background:
                          item.minutes > 0
                            ? "linear-gradient(180deg, #34C759 0%, #5856D6 100%)"
                            : "var(--app-accent-soft)",
                        border: "1px solid var(--app-border)",
                        transition: "height 0.25s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      marginTop: "8px",
                      color: "var(--app-text-muted)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [keys, setKeys] = useState<TrackingKey[]>([])
  const [events, setEvents] = useState<TrackedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [dateFrom, setDateFrom] = useState(getDefaultFromDate)
  const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date()))
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [kpisOpen, setKpisOpen] = useState(true)
  const [chartMode, setChartMode] = useState<ChartMode>("week")

  const loadData = useCallback(() => {
    if (!session) return

    Promise.all([
      fetch("/api/categories").then((response) => (response.ok ? response.json() : [])),
      fetch("/api/keys").then((response) => (response.ok ? response.json() : [])),
      fetch("/api/events").then((response) => (response.ok ? response.json() : [])),
    ])
      .then(([categoryData, keyData, eventData]) => {
        setCategories(categoryData || [])
        setKeys(keyData || [])
        setEvents(eventData || [])
      })
      .catch(() => {
        setCategories([])
        setKeys([])
        setEvents([])
      })
      .finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const keyMap = useMemo(() => {
    const map = new Map<string, TrackingKey>()
    for (const key of keys) map.set(key.id, key)
    return map
  }, [keys])

  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      if (selectedCategoryIds.length > 0 && (!key.category_id || !selectedCategoryIds.includes(key.category_id))) return false
      return true
    })
  }, [keys, selectedCategoryIds])

  const categoryOptions: FilterOption[] = useMemo(() => {
    return categories.map((category) => ({
      value: category.id,
      label: category.name,
    }))
  }, [categories])

  const keyOptions: FilterOption[] = useMemo(() => {
    return filteredKeys.map((key) => ({
      value: key.id,
      label: key.name,
    }))
  }, [filteredKeys])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return events.filter((event) => {
      const key = keyMap.get(event.key_id)
      if (event.event_date < dateFrom || event.event_date > dateTo) return false
      if (!isWithinLifetime(event.event_date, key)) return false
      if (selectedCategoryIds.length > 0 && (!key?.category_id || !selectedCategoryIds.includes(key.category_id))) return false
      if (selectedKeyIds.length > 0 && !selectedKeyIds.includes(event.key_id)) return false

      if (query) {
        const text = `${event.summary} ${event.key_name} ${key?.name || ""} ${key?.search_key || ""}`.toLowerCase()
        if (!text.includes(query)) return false
      }

      return true
    })
  }, [events, keyMap, dateFrom, dateTo, selectedCategoryIds, selectedKeyIds, search])

  const totalMinutes = useMemo(() => {
    return filteredEvents.reduce((sum, event) => sum + event.duration_minutes, 0)
  }, [filteredEvents])

  const activeDays = useMemo(() => {
    return new Set(filteredEvents.map((event) => event.event_date)).size
  }, [filteredEvents])

  const averageMinutesPerActiveDay = useMemo(() => {
    if (activeDays === 0) return 0
    return Math.round(totalMinutes / activeDays)
  }, [activeDays, totalMinutes])

  const busiestDay = useMemo(() => {
    const map = new Map<string, number>()

    for (const event of filteredEvents) {
      map.set(event.event_date, (map.get(event.event_date) || 0) + event.duration_minutes)
    }

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
  }, [filteredEvents])

  const topKeys = useMemo(() => {
    const map = new Map<string, { minutes: number; events: number }>()

    for (const event of filteredEvents) {
      const current = map.get(event.key_id) || { minutes: 0, events: 0 }
      current.minutes += event.duration_minutes
      current.events += 1
      map.set(event.key_id, current)
    }

    return Array.from(map.entries())
      .map(([keyId, stats]) => ({
        key: keyMap.get(keyId),
        keyId,
        ...stats,
      }))
      .sort((a, b) => b.minutes - a.minutes)
  }, [filteredEvents, keyMap])

  const dailyData = useMemo(() => {
    const map = new Map<string, ChartPoint>()

    for (const event of filteredEvents) {
      const eventDate = new Date(`${event.event_date}T00:00:00`)
      const label = getDayLabel(eventDate)
      const current = map.get(event.event_date) || { label, minutes: 0, events: 0 }
      current.minutes += event.duration_minutes
      current.events += 1
      map.set(event.event_date, current)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  }, [filteredEvents])

  const weeklyData = useMemo(() => {
    const map = new Map<string, ChartPoint>()

    for (const event of filteredEvents) {
      const eventDate = new Date(event.event_date)
      const monday = getMonday(eventDate)
      const label = `KW ${getWeekNumber(monday)}`
      const current = map.get(label) || { label, minutes: 0, events: 0 }
      current.minutes += event.duration_minutes
      current.events += 1
      map.set(label, current)
    }

    return Array.from(map.values())
  }, [filteredEvents])

  const monthlyData = useMemo(() => {
    const map = new Map<string, ChartPoint>()

    for (const event of filteredEvents) {
      const eventDate = new Date(event.event_date)
      const monthStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1)
      const label = getMonthLabel(monthStart)
      const sortKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`
      const current = map.get(sortKey) || { label, minutes: 0, events: 0 }
      current.minutes += event.duration_minutes
      current.events += 1
      map.set(sortKey, current)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  }, [filteredEvents])

  const chartData =
    chartMode === "day" ? dailyData : chartMode === "week" ? weeklyData : monthlyData

  const chartTitle =
    chartMode === "day" ? "Tagesansicht" : chartMode === "week" ? "Wochenansicht" : "Monatsansicht"

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch("/api/tracking", { method: "POST" })
      const result = await response.json()

      if (response.ok) {
        setSyncResult({
          newEvents: result.newEvents || 0,
          matched: result.matched || 0,
          removedEvents: result.removedEvents || 0,
          totalCalendarEvents: result.totalCalendarEvents || 0,
        })
        loadData()
      } else if (result.error === "InsufficientScopeError") {
        await signOut({ callbackUrl: "/" })
      } else {
        setSyncResult({
          newEvents: 0,
          matched: 0,
          error: result.error || "Unbekannter Fehler",
        })
      }
    } catch (error) {
      setSyncResult({
        newEvents: 0,
        matched: 0,
        error: error instanceof Error ? error.message : "Netzwerkfehler",
      })
    } finally {
      setSyncing(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    )
  }

  if (!session) return null

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px 96px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "980px" }}>
        <div className="animate-fade-up" style={{ marginBottom: "28px" }}>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800 }}>
                Zeit Auswertung
              </h1>
              <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--app-text-muted)" }}>
                Filtere Zeitraum, Kategorie und Keyword und sieh Wochen und Monate im Diagramm.
              </p>
            </div>
            <button className="btn-primary" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {syncing ? "Synchronisiert" : "Sync"}
            </button>
          </div>
        </div>

        {syncResult && (
          <div
            className="animate-fade-up rounded-2xl p-4 mb-6"
            style={{
              background: syncResult.error ? "rgba(255, 59, 48, 0.12)" : "var(--app-accent-soft)",
              border: "1px solid var(--app-border)",
            }}
          >
            <p style={{ fontSize: "13px", color: syncResult.error ? "#FF3B30" : "var(--app-text)" }}>
              {syncResult.error
                ? `Fehler: ${syncResult.error}`
                : `${syncResult.newEvents} neue Events, ${syncResult.matched} Treffer, ${syncResult.totalCalendarEvents || 0} Kalender Events gescannt`}
            </p>
          </div>
        )}

        <div className="glow-card animate-fade-up delay-1" style={{ padding: "20px", marginBottom: "20px", overflow: "visible", position: "relative", zIndex: filtersOpen ? 50 : "auto" }}>
          <button
            onClick={() => setFiltersOpen((value) => !value)}
            className="w-full flex items-center justify-between"
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
          >
            <div style={{ textAlign: "left" }}>
              <p className="section-label" style={{ marginBottom: "4px" }}>
                Filter
              </p>
              <p style={{ fontSize: "12px", color: "var(--app-text-muted)" }}>
                Zeitraum, Kategorien, Keywords und Suche
              </p>
            </div>
            <ChevronDown
              size={18}
              style={{
                color: "var(--app-text-muted)",
                transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {filtersOpen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "18px",
              }}
            >
              <DatePicker label="Von" value={dateFrom} onChange={setDateFrom} />

              <DatePicker label="Bis" value={dateTo} onChange={setDateTo} />

              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--app-text-muted)" }}>
                  Kategorien
                </span>
                <DataTableFilter
                  label="Alle Kategorien"
                  options={categoryOptions}
                  selectedValues={selectedCategoryIds}
                  isMultiSelect
                  onChange={(values) => {
                    setSelectedCategoryIds(values)
                    setSelectedKeyIds([])
                  }}
                  className="h-10 justify-between"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--app-text-muted)" }}>
                  Keywords
                </span>
                <DataTableFilter
                  label="Alle Keywords"
                  options={keyOptions}
                  selectedValues={selectedKeyIds}
                  isMultiSelect
                  onChange={setSelectedKeyIds}
                  className="h-10 justify-between"
                />
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--app-text-muted)" }}>
                  Suche
                </span>
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--app-text-muted)",
                    }}
                  />
                  <input
                    className="input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Titel oder Keyword"
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="glow-card animate-fade-up delay-1" style={{ padding: "20px", marginBottom: "20px" }}>
          <button
            onClick={() => setKpisOpen((value) => !value)}
            className="w-full flex items-center justify-between"
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
          >
            <div style={{ textAlign: "left" }}>
              <p className="section-label" style={{ marginBottom: "4px" }}>
                KPIs
              </p>
              <p style={{ fontSize: "12px", color: "var(--app-text-muted)" }}>
                Gesamtzeit, Events und Tagesintensität
              </p>
            </div>
            <ChevronDown
              size={18}
              style={{
                color: "var(--app-text-muted)",
                transform: kpisOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {kpisOpen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <StatTile icon={Clock} label="Gesamtzeit" value={formatMinutes(totalMinutes)} sub={`${filteredEvents.length} Events`} />
              <StatTile icon={Target} label="Events" value={filteredEvents.length} sub="im Filter" />
              <StatTile icon={TrendingUp} label="Ø pro aktivem Tag" value={formatMinutes(averageMinutesPerActiveDay)} sub={`${activeDays} aktive Tage`} />
              <StatTile icon={CalendarDays} label="Stärkster Tag" value={busiestDay ? formatMinutes(busiestDay[1]) : "0m"} sub={busiestDay ? getDisplayDate(busiestDay[0]) : "keine Daten"} />
            </div>
          )}
        </div>

        <div className="animate-fade-up delay-2" style={{ marginBottom: "20px" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label" style={{ marginBottom: 0 }}>
              Diagramm
            </p>
            <div
              style={{
                display: "flex",
                gap: "4px",
                padding: "4px",
                borderRadius: "14px",
                background: "var(--app-accent-soft)",
              }}
            >
              {(
                [
                  { key: "day", label: "Tag" },
                  { key: "week", label: "Woche" },
                  { key: "month", label: "Monat" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setChartMode(item.key)}
                  style={{
                    border: 0,
                    borderRadius: "10px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: chartMode === item.key ? "var(--app-card-bg)" : "transparent",
                    color: chartMode === item.key ? "var(--app-text)" : "var(--app-text-muted)",
                    boxShadow: chartMode === item.key ? "0 1px 3px rgba(0,0,0,0.18)" : "none",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <BarChart title={chartTitle} data={chartData} />
        </div>

        <div className="glow-card animate-fade-up delay-3" style={{ padding: "20px" }}>
          <p className="section-label">Was du gemacht hast</p>
          {topKeys.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--app-text-muted)", padding: "24px 0", textAlign: "center" }}>
              Keine Events für diese Filter
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topKeys.map(({ key, keyId, minutes, events: count }) => {
                const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0
                return (
                  <Link
                    key={keyId}
                    href={`/keys/${keyId}/edit`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: "12px",
                      textDecoration: "none",
                      color: "inherit",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "999px",
                            background: key?.color || "var(--app-text-muted)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: 700 }}>
                          {key?.name || "Unbekannt"}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--app-text-muted)" }}>
                          {count} Events
                        </span>
                      </div>
                      <div style={{ marginTop: "8px", height: "7px", borderRadius: "999px", background: "var(--app-accent-soft)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            borderRadius: "999px",
                            background: key?.color || "#34C759",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700 }}>{formatMinutes(minutes)}</p>
                      <p style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>{pct}%</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
