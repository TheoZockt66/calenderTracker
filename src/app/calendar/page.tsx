"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import type { FilterOption } from "@/components/ui/data-table-filter";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePickerInput } from "@mantine/dates";
import "dayjs/locale/de";
import type { TrackingKey } from "@/lib/types";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Loader2,
  CalendarIcon,
  X,
  CheckCircle2,
  Circle,
  ListTodo,
  RefreshCw,
  Key,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ───── Types ───── */
interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  calendarName: string;
  calendarColor: string;
  status: string;
  htmlLink: string;
  creator: string | null;
  attendees: { email: string; displayName?: string; responseStatus?: string }[];
}

interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

interface CalendarData {
  calendars: CalendarInfo[];
  events: CalendarEvent[];
  total: number;
}

interface TaskItem {
  id: string;
  title: string;
  notes: string | null;
  due: string | null;
  status: "needsAction" | "completed";
  completed: string | null;
  updated: string | null;
  taskListName: string;
  taskListId: string;
}

interface TaskList {
  id: string;
  name: string;
}

interface TasksData {
  taskLists: TaskList[];
  tasks: TaskItem[];
  total: number;
}

/* ───── Helpers ───── */
type DayFilter = "today" | "7days" | "30days" | "all" | "custom";
type ViewTab = "events" | "tasks";

/* ───── Filter Options ───── */
const dayFilterOptions: FilterOption[] = [
  { value: "today", label: "Heute" },
  { value: "7days", label: "7 Tage" },
  { value: "30days", label: "30 Tage" },
  { value: "all", label: "Alle" },
];

const taskFilterOptions: FilterOption[] = [
  { value: "open", label: "Offen", icon: Circle },
  { value: "done", label: "Erledigt", icon: CheckCircle2 },
];

function formatEventTime(dateStr: string | null, allDay: boolean) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (allDay) {
    return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
  }
  return (
    d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  );
}

function getDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isWithinDays(dateStr: string | null, days: number) {
  if (!dateStr) return false;
  const eventDate = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return eventDate >= start && eventDate < end;
}

function isSameDay(dateStr: string | null, targetDate: string) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date(targetDate).toDateString();
}

function formatCustomDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTaskDue(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d überfällig`, overdue: true };
  if (diff === 0) return { label: "Heute", overdue: false };
  if (diff === 1) return { label: "Morgen", overdue: false };
  return {
    label: d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
    overdue: false,
  };
}

/* ───── Date group helper ───── */
function groupEventsByDate(events: CalendarEvent[]) {
  const groups: { date: string; label: string; events: CalendarEvent[] }[] = [];
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const dateKey = event.start
      ? new Date(event.start).toISOString().split("T")[0]
      : "unknown";
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(event);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  for (const [dateKey, evts] of map) {
    let label: string;
    if (dateKey === todayStr) {
      label = "Heute";
    } else if (dateKey === tomorrowStr) {
      label = "Morgen";
    } else if (dateKey === "unknown") {
      label = "Ohne Datum";
    } else {
      label = new Date(dateKey + "T00:00:00").toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
    groups.push({ date: dateKey, label, events: evts });
  }

  return groups;
}

/* ───── Calendar month helpers ───── */
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // Monday = 0 start
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; currentMonth: boolean; dateStr: string }[] = [];

  // Previous month padding
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      day: d,
      currentMonth: false,
      dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      currentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Next month padding
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        currentMonth: false,
        dateStr: `${ny}-${String(nm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
  }

  return cells;
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const WEEKDAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/* ───── EventCard ───── */
function EventCard({ event, index }: { event: CalendarEvent; index: number }) {
  const today = isToday(event.start);
  const duration = getDuration(event.start, event.end);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
    >
      <div className={`event-card ${today ? "event-card--today" : ""}`}>
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: event.calendarColor }}
        />

        <div className="pl-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: "14px", fontWeight: 600 }} className="truncate">
                {event.summary}
              </p>
              <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--app-text-muted)" }}>
                {event.allDay
                  ? "Ganztägig"
                  : event.start
                    ? new Date(event.start).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) +
                      (event.end
                        ? " – " +
                          new Date(event.end).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "")
                    : ""}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {duration && !event.allDay && (
                <span className="chip" style={{ fontSize: "11px" }}>
                  <Clock size={10} />
                  {duration}
                </span>
              )}
              {event.allDay && <span className="chip" style={{ fontSize: "11px" }}>Ganztägig</span>}
            </div>
          </div>

          <div
            className="mt-1.5 flex flex-wrap items-center gap-3"
            style={{ fontSize: "11px", color: "var(--app-text-muted)" }}
          >
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: event.calendarColor }}
              />
              {event.calendarName}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate max-w-50">
                <MapPin size={11} />
                {event.location}
              </span>
            )}
            {event.attendees.length > 0 && <span>{event.attendees.length} Teilnehmer</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───── TaskCard ───── */
function TaskCard({ task, index }: { task: TaskItem; index: number }) {
  const dueInfo = formatTaskDue(task.due);
  const done = task.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
    >
      <div className={`card p-4 relative ${done ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          {done ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: "var(--app-success)" }} />
          ) : (
            <Circle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--app-text-muted)" }} />
          )}
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: done ? "line-through" : "none",
              }}
              className="truncate"
            >
              {task.title}
            </p>

            {task.notes && (
              <p
                className="mt-1 line-clamp-2"
                style={{ fontSize: "12px", color: "var(--app-text-muted)" }}
              >
                {task.notes}
              </p>
            )}

            <div
              className="mt-2 flex flex-wrap items-center gap-3"
              style={{ fontSize: "11px", color: "var(--app-text-muted)" }}
            >
              <span className="flex items-center gap-1">
                <ListTodo size={11} />
                {task.taskListName}
              </span>
              {dueInfo && (
                <span
                  className="chip"
                  style={{
                    fontSize: "10px",
                    ...(dueInfo.overdue
                      ? { background: "rgba(255, 59, 48, 0.15)", color: "#FF3B30" }
                      : {}),
                  }}
                >
                  {dueInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───── Page ───── */
export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [tasksData, setTasksData] = useState<TasksData | null>(null);
  const [trackingKeys, setTrackingKeys] = useState<TrackingKey[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View
  const [viewTab, setViewTab] = useState<ViewTab>("events");
  const [eventView, setEventView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Filters
  const [dayFilter, setDayFilter] = useState<DayFilter>("30days");
  const [customDate, setCustomDate] = useState<string>("");
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [taskFilter, setTaskFilter] = useState<"all" | "open" | "done">("open");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const loadTrackingKeys = () => {
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTrackingKeys(data || []))
      .catch(() => setTrackingKeys([]));
  };

  const loadCalendarData = () => {
    setLoadingCal(true);
    setError(null);
    fetch("/api/calendar")
      .then((res) => {
        if (!res.ok) throw new Error("Fehler beim Laden der Kalender");
        return res.json();
      })
      .then((data: CalendarData) => {
        setCalendarData(data);
        setSelectedCalendars((prev) =>
          prev.size > 0 ? prev : new Set(data.calendars.map((c) => c.id))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCal(false));
  };

  const loadTasksData = () => {
    setLoadingTasks(true);
    fetch("/api/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Fehler beim Laden der Tasks");
        return res.json();
      })
      .then((data: TasksData) => setTasksData(data))
      .catch(() => {
        // Tasks may fail if scope not yet granted — silently ignore
        setTasksData({ taskLists: [], tasks: [], total: 0 });
      })
      .finally(() => setLoadingTasks(false));
  };

  useEffect(() => {
    if (session) {
      loadCalendarData();
      loadTasksData();
      loadTrackingKeys();
    }
  }, [session]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      loadCalendarData();
      loadTasksData();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleDayFilterChange = (filter: DayFilter) => {
    if (filter !== "custom") setCustomDate("");
    setDayFilter(filter);
  };

  const handleCustomDateChange = (date: string) => {
    setCustomDate(date);
    setDayFilter("custom");
  };

  const clearCustomDate = () => {
    setCustomDate("");
    setDayFilter("30days");
  };

  // Calendar filter options for DataTableFilter
  const calendarFilterOptions: FilterOption[] = useMemo(() => {
    if (!calendarData) return [];
    return calendarData.calendars.map((cal) => ({
      value: cal.id,
      label: cal.name + (cal.primary ? " ★" : ""),
    }));
  }, [calendarData]);

  // Key filter options
  const keyFilterOptions: FilterOption[] = useMemo(() => {
    return trackingKeys.map((k) => ({
      value: k.id,
      label: k.name,
      icon: Key,
    }));
  }, [trackingKeys]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!calendarData) return [];
    return calendarData.events.filter((event) => {
      // Calendar filter
      const cal = calendarData.calendars.find((c) => c.name === event.calendarName);
      if (cal && !selectedCalendars.has(cal.id)) return false;

      // Time filter
      if (dayFilter === "today" && !isToday(event.start)) return false;
      if (dayFilter === "7days" && !isWithinDays(event.start, 7)) return false;
      if (dayFilter === "30days" && !isWithinDays(event.start, 30)) return false;
      if (dayFilter === "custom" && customDate && !isSameDay(event.start, customDate)) return false;

      // Key filter
      if (selectedKeys.length > 0) {
        const summaryLower = (event.summary || "").toLowerCase();
        const matchesAnyKey = selectedKeys.some((keyId) => {
          const key = trackingKeys.find((k) => k.id === keyId);
          if (!key) return false;
          const searchTerm = (key.search_key || key.name).trim().toLowerCase();
          return searchTerm !== "" && summaryLower.includes(searchTerm);
        });
        if (!matchesAnyKey) return false;
      }

      return true;
    });
  }, [calendarData, dayFilter, customDate, selectedCalendars, selectedKeys, trackingKeys]);

  // Group events by date for list view
  const groupedEvents = useMemo(
    () => groupEventsByDate(filteredEvents),
    [filteredEvents]
  );

  // Events indexed by date string for calendar view
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const dateKey = event.start
        ? new Date(event.start).toISOString().split("T")[0]
        : "unknown";
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(event);
    }
    return map;
  }, [filteredEvents]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasksData) return [];
    return tasksData.tasks.filter((t) => {
      if (taskFilter === "open") return t.status === "needsAction";
      if (taskFilter === "done") return t.status === "completed";
      return true;
    });
  }, [tasksData, taskFilter]);

  const loading = viewTab === "events" ? loadingCal : loadingTasks;

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div className="animate-fade-up" style={{ marginBottom: "28px" }}>
          <Link
            href="/"
            className="btn-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "6px 12px",
              marginBottom: "20px",
              textDecoration: "none",
              borderRadius: "100px",
            }}
          >
            <ArrowLeft size={14} />
            Zurück
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1
                style={{
                  fontSize: "clamp(26px, 5vw, 34px)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                }}
              >
                Kalender
              </h1>
              <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--app-text-muted)" }}>
                {session.user?.email}
              </p>
            </div>
            <button
              onClick={() => { loadCalendarData(); loadTasksData(); }}
              className="btn-ghost"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                padding: 0,
                borderRadius: "12px",
              }}
              title="Aktualisieren"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="animate-fade-up delay-1" style={{ marginBottom: "20px" }}>
          <ToggleGroup
            type="single"
            value={viewTab}
            onValueChange={(val) => { if (val) setViewTab(val as "events" | "tasks"); }}
            className="inline-flex rounded-lg p-1 gap-0.5"
            style={{
              background: "var(--app-accent-soft)",
              border: "1px solid var(--app-border)",
            }}
          >
            <ToggleGroupItem value="events" className="px-5 py-2">
              <CalendarDays size={14} className="mr-1.5" />
              Events
            </ToggleGroupItem>
            <ToggleGroupItem value="tasks" className="px-5 py-2">
              <ListTodo size={14} className="mr-1.5" />
              Tasks
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* ── Filter Bar – Events ── */}
        {viewTab === "events" && calendarData && !loadingCal && (
          <div
            className="card animate-fade-up delay-2"
            style={{ padding: "12px 14px", marginBottom: "24px" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <DataTableFilter
                label="Zeitraum"
                options={dayFilterOptions}
                selectedValues={dayFilter === "custom" ? [] : [dayFilter]}
                onChange={(vals) => {
                  if (vals.length === 0) handleDayFilterChange("all");
                  else handleDayFilterChange(vals[0] as DayFilter);
                }}
              />
              <DataTableFilter
                label="Kalender"
                options={calendarFilterOptions}
                selectedValues={Array.from(selectedCalendars)}
                onChange={(vals) => setSelectedCalendars(new Set(vals))}
                isMultiSelect
              />
              {keyFilterOptions.length > 0 && (
                <DataTableFilter
                  label="Keys"
                  options={keyFilterOptions}
                  selectedValues={selectedKeys}
                  onChange={(vals) => setSelectedKeys(vals)}
                  isMultiSelect
                />
              )}

              {/* Date picker inline */}
              <DatePickerInput
                locale="de"
                placeholder="tt.mm.jjjj"
                valueFormat="DD.MM.YYYY"
                value={customDate ? new Date(customDate + "T00:00:00") : null}
                onChange={(value) => {
                  if (value) {
                    const date = new Date(String(value));
                    if (!isNaN(date.getTime())) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      handleCustomDateChange(`${y}-${m}-${d}`);
                    }
                  } else {
                    clearCustomDate();
                  }
                }}
                clearable
                leftSection={<CalendarIcon size={13} />}
                styles={{
                  input: {
                    height: "32px",
                    minHeight: "32px",
                    fontSize: "13px",
                    fontWeight: 500,
                    background: "transparent",
                    border: "1px solid var(--app-border)",
                    borderRadius: "8px",
                    color: "var(--app-text-secondary)",
                    cursor: "pointer",
                    paddingLeft: "32px",
                    paddingRight: "10px",
                    width: "150px",
                  },
                  wrapper: {
                    width: "auto",
                  },
                }}
              />

              {dayFilter === "custom" && customDate && (
                <button
                  onClick={clearCustomDate}
                  className="cursor-pointer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    height: "32px",
                    padding: "0 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "var(--app-fg)",
                    color: "var(--app-bg)",
                    border: "none",
                    borderRadius: "8px",
                  }}
                >
                  {formatCustomDate(customDate)}
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Filter Bar – Tasks ── */}
        {viewTab === "tasks" && !loadingTasks && (
          <div
            className="card animate-fade-up delay-2"
            style={{ padding: "12px 14px", marginBottom: "24px" }}
          >
            <div className="flex items-center gap-2">
              <DataTableFilter
                label="Status"
                options={taskFilterOptions}
                selectedValues={taskFilter === "all" ? [] : [taskFilter]}
                onChange={(vals) => {
                  if (vals.length === 0) setTaskFilter("all");
                  else setTaskFilter(vals[0] as "open" | "done");
                }}
              />
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: "var(--app-text-muted)" }}
            />
            <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--app-text-muted)" }}>
              {viewTab === "events" ? "Kalenderdaten" : "Tasks"} werden geladen…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && viewTab === "events" && (
          <div
            className="card"
            style={{
              padding: "24px",
              textAlign: "center",
              border: "1px solid rgba(255, 59, 48, 0.2)",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#FF3B30" }}>{error}</p>
            <button
              onClick={loadCalendarData}
              className="btn-ghost"
              style={{ fontSize: "12px", marginTop: "12px" }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* ── List / Calendar toggle ── */}
        {viewTab === "events" && calendarData && !loadingCal && (
          <div className="flex items-center justify-between mb-4">
            <p className="section-label" style={{ margin: 0 }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? "Event" : "Events"}
            </p>
            <div
              style={{
                display: "flex",
                gap: "2px",
                padding: "3px",
                borderRadius: "10px",
                background: "var(--app-accent-soft)",
              }}
            >
              <button
                onClick={() => setEventView("list")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: eventView === "list" ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background:
                    eventView === "list" ? "var(--app-card-bg)" : "transparent",
                  color:
                    eventView === "list" ? "var(--app-text)" : "var(--app-text-muted)",
                  boxShadow:
                    eventView === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <List size={13} />
                Liste
              </button>
              <button
                onClick={() => setEventView("calendar")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: eventView === "calendar" ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background:
                    eventView === "calendar" ? "var(--app-card-bg)" : "transparent",
                  color:
                    eventView === "calendar" ? "var(--app-text)" : "var(--app-text-muted)",
                  boxShadow:
                    eventView === "calendar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <LayoutGrid size={13} />
                Kalender
              </button>
            </div>
          </div>
        )}

        {/* ── Events List (grouped by date) ── */}
        {viewTab === "events" && eventView === "list" && calendarData && !loadingCal && filteredEvents.length > 0 && (
          <div className="flex flex-col gap-6">
            {groupedEvents.map((group) => (
              <div key={group.date}>
                <div
                  className="flex items-center gap-3 mb-3"
                  style={{ padding: "0 4px" }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color:
                        group.date === new Date().toISOString().split("T")[0]
                          ? "var(--app-success, #34C759)"
                          : "var(--app-text-secondary)",
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--app-text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {group.events.length} {group.events.length === 1 ? "Event" : "Events"}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "var(--app-border)",
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout">
                    {group.events.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Calendar Month Grid ── */}
        {viewTab === "events" && eventView === "calendar" && calendarData && !loadingCal && (
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                  else setCalMonth(calMonth - 1);
                }}
                className="btn-ghost"
                style={{ padding: "8px", borderRadius: "10px" }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                  else setCalMonth(calMonth + 1);
                }}
                className="btn-ghost"
                style={{ padding: "8px", borderRadius: "10px" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "1px",
                marginBottom: "4px",
              }}
            >
              {WEEKDAY_HEADERS.map((wd) => (
                <div
                  key={wd}
                  style={{
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--app-text-muted)",
                    padding: "6px 0",
                  }}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "1px",
              }}
            >
              {getMonthDays(calYear, calMonth).map((cell, idx) => {
                const cellEvents = eventsByDate.get(cell.dateStr) || [];
                const isTodayCell =
                  cell.dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: "72px",
                      padding: "4px",
                      borderRadius: "8px",
                      border: isTodayCell
                        ? "1px solid var(--app-success, #34C759)"
                        : "1px solid var(--app-border)",
                      background: isTodayCell
                        ? "rgba(52, 199, 89, 0.06)"
                        : cell.currentMonth
                          ? "var(--app-card-bg)"
                          : "transparent",
                      opacity: cell.currentMonth ? 1 : 0.35,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: isTodayCell ? 800 : 600,
                        color: isTodayCell
                          ? "var(--app-success, #34C759)"
                          : "var(--app-text-secondary)",
                        marginBottom: "2px",
                      }}
                    >
                      {cell.day}
                    </div>
                    {cellEvents.slice(0, 3).map((ev, ei) => (
                      <div
                        key={ei}
                        title={`${ev.summary}${ev.allDay ? " (Ganztägig)" : ""}`}
                        style={{
                          fontSize: "9px",
                          fontWeight: 500,
                          padding: "1px 3px",
                          marginBottom: "1px",
                          borderRadius: "3px",
                          background: ev.calendarColor + "25",
                          color: "var(--app-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          borderLeft: `2px solid ${ev.calendarColor}`,
                        }}
                      >
                        {ev.summary}
                      </div>
                    ))}
                    {cellEvents.length > 3 && (
                      <div
                        style={{
                          fontSize: "9px",
                          color: "var(--app-text-muted)",
                          fontWeight: 600,
                          paddingLeft: "3px",
                        }}
                      >
                        +{cellEvents.length - 3}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── No events ── */}
        {viewTab === "events" && calendarData && filteredEvents.length === 0 && !loadingCal && (
          <div className="py-20 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "var(--app-accent-soft)",
              }}
            >
              <CalendarDays size={24} style={{ color: "var(--app-text-muted)" }} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600 }}>
              Keine Events gefunden
            </p>
            <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--app-text-muted)" }}>
              Probiere einen anderen Zeitraum oder Kalender.
            </p>
          </div>
        )}

        {/* ── Tasks List ── */}
        {viewTab === "tasks" && !loadingTasks && filteredTasks.length > 0 && (
          <div>
            <p className="section-label" style={{ textAlign: "center", marginBottom: "16px" }}>
              {filteredTasks.length} {filteredTasks.length === 1 ? "Task" : "Tasks"}
            </p>
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── No tasks ── */}
        {viewTab === "tasks" && !loadingTasks && filteredTasks.length === 0 && (
          <div className="py-20 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "var(--app-accent-soft)",
              }}
            >
              <ListTodo size={24} style={{ color: "var(--app-text-muted)" }} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600 }}>
              {taskFilter === "open"
                ? "Keine offenen Tasks"
                : taskFilter === "done"
                  ? "Keine erledigten Tasks"
                  : "Keine Tasks gefunden"}
            </p>
            <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--app-text-muted)" }}>
              Tasks werden aus Google Tasks geladen.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
