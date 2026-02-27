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

const DAY_FILTER_LABELS: Record<Exclude<DayFilter, "custom">, string> = {
  today: "Heute",
  "7days": "7 Tage",
  "30days": "30 Tage",
  all: "Alle",
};

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
              <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--app-text-muted)" }}>
                {formatEventTime(event.start, event.allDay)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {today && <span className="chip chip-success" style={{ fontSize: "10px" }}>Heute</span>}
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
            className="mt-2 flex flex-wrap items-center gap-3"
            style={{ fontSize: "11px", color: "var(--app-text-muted)" }}
          >
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {event.calendarName}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
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
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--app-success)" }} />
          ) : (
            <Circle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--app-text-muted)" }} />
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
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View
  const [viewTab, setViewTab] = useState<ViewTab>("events");

  // Filters
  const [dayFilter, setDayFilter] = useState<DayFilter>("30days");
  const [customDate, setCustomDate] = useState<string>("");
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [taskFilter, setTaskFilter] = useState<"all" | "open" | "done">("open");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadCalendarData();
      loadTasksData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      loadCalendarData();
      loadTasksData();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleCalendar = (calId: string) => {
    setSelectedCalendars((prev) => {
      const next = new Set(prev);
      next.has(calId) ? next.delete(calId) : next.add(calId);
      return next;
    });
  };

  const selectAllCalendars = () => {
    if (calendarData) setSelectedCalendars(new Set(calendarData.calendars.map((c) => c.id)));
  };
  const deselectAllCalendars = () => setSelectedCalendars(new Set());

  // Calendar filter options for DataTableFilter
  const calendarFilterOptions: FilterOption[] = useMemo(() => {
    if (!calendarData) return [];
    return calendarData.calendars.map((cal) => ({
      value: cal.id,
      label: cal.name + (cal.primary ? " ★" : ""),
    }));
  }, [calendarData]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!calendarData) return [];
    return calendarData.events.filter((event) => {
      const cal = calendarData.calendars.find((c) => c.name === event.calendarName);
      if (cal && !selectedCalendars.has(cal.id)) return false;
      if (dayFilter === "today") return isToday(event.start);
      if (dayFilter === "7days") return isWithinDays(event.start, 7);
      if (dayFilter === "30days") return isWithinDays(event.start, 30);
      if (dayFilter === "custom" && customDate) return isSameDay(event.start, customDate);
      return true;
    });
  }, [calendarData, dayFilter, customDate, selectedCalendars]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasksData) return [];
    return tasksData.tasks.filter((t) => {
      if (taskFilter === "open") return t.status === "needsAction";
      if (taskFilter === "done") return t.status === "completed";
      return true;
    });
  }, [tasksData, taskFilter]);

  const allSelected =
    calendarData != null && selectedCalendars.size === calendarData.calendars.length;

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

        {/* ── Events List ── */}
        {viewTab === "events" && calendarData && !loadingCal && filteredEvents.length > 0 && (
          <div>
            <p className="section-label" style={{ textAlign: "center", marginBottom: "16px" }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? "Event" : "Events"}
            </p>
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </AnimatePresence>
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
