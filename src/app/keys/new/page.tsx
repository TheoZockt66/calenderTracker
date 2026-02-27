"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Category, TrackingKey } from "@/lib/types";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import type { FilterOption } from "@/components/ui/data-table-filter";
import {
  ArrowLeft,
  Loader2,
  Key,
  Plus,
  X,
  ListChecks,
  Search,
} from "lucide-react";

/* ───── 30 distinct colors palette ───── */
const COLOR_PALETTE = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#3949AB",
  "#1E88E5", "#039BE5", "#00ACC1", "#00897B", "#43A047",
  "#7CB342", "#C0CA33", "#FDD835", "#FFB300", "#FB8C00",
  "#F4511E", "#6D4C41", "#546E7A", "#EC407A", "#AB47BC",
  "#7E57C2", "#5C6BC0", "#42A5F5", "#26C6DA", "#26A69A",
  "#66BB6A", "#9CCC65", "#FFEE58", "#FFA726", "#FF7043",
];

interface GoogleCalendar {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

interface NewTask {
  id: string;
  name: string;
  search_term: string;
}

let taskIdCounter = 0;

export default function NewKeyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingKeys, setExistingKeys] = useState<TrackingKey[]>([]);

  const [name, setName] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [category, setCategory] = useState("");
  const [calendar, setCalendar] = useState("");
  const [tasks, setTasks] = useState<NewTask[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskSearchTerm, setTaskSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/calendar")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setCalendars(data.calendars || []))
        .catch(() => setCalendars([]))
        .finally(() => setCalendarsLoading(false));

      fetch("/api/categories")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setCategories(data || []))
        .catch(() => setCategories([]));

      fetch("/api/keys")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setExistingKeys(data || []))
        .catch(() => setExistingKeys([]));
    }
  }, [session]);

  // Auto-assign color: pick the next unused color from the palette
  const autoColor = useMemo(() => {
    const usedColors = new Set(existingKeys.map((k) => k.color.toUpperCase()));
    const available = COLOR_PALETTE.find(
      (c) => !usedColors.has(c.toUpperCase())
    );
    return available || COLOR_PALETTE[existingKeys.length % COLOR_PALETTE.length];
  }, [existingKeys]);

  // Build DataTableFilter options
  const categoryFilterOptions: FilterOption[] = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: cat.name })),
    [categories]
  );

  const calendarFilterOptions: FilterOption[] = useMemo(
    () =>
      calendars.map((cal) => ({
        value: cal.id,
        label: cal.name + (cal.primary ? " ★" : ""),
      })),
    [calendars]
  );

  const addTask = () => {
    if (!taskName.trim() || !taskSearchTerm.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `new-task-${++taskIdCounter}`,
        name: taskName.trim(),
        search_term: taskSearchTerm.trim(),
      },
    ]);
    setTaskName("");
    setTaskSearchTerm("");
    setShowTaskForm(false);
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: "32px" }}>
          <Link
            href="/keys"
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
            Zurück zu Keys
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: autoColor + "18" }}
            >
              <Key size={20} style={{ color: autoColor }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {t("keys.newKey")}
              </h1>
              <p
                style={{
                  marginTop: "2px",
                  fontSize: "13px",
                  color: "var(--app-text-muted)",
                }}
              >
                {t("keys.newKeyDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div
          className="glow-card animate-fade-up delay-1"
          style={{ padding: "24px" }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Name */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                {t("keys.name")}
              </label>
              <input
                type="text"
                className="input"
                placeholder="z.B. Geschäftsprozessmanagement, Mathe III …"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--app-text-muted)" }}>
                {t("keys.nameHint")}
              </p>
            </div>

            {/* Search Key */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                {t("keys.searchKey")}
              </label>
              <input
                type="text"
                className="input"
                placeholder="z.B. GPM, Mathe …"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
              />
              <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--app-text-muted)" }}>
                {t("keys.searchKeyHint")}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                {t("keys.category")}
              </label>
              <DataTableFilter
                label={t("common.noCategory")}
                options={categoryFilterOptions}
                selectedValues={category ? [category] : []}
                onChange={(vals) => setCategory(vals.length > 0 ? vals[0] : "")}
              />
            </div>

            {/* Calendar */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                Kalender
              </label>
              {calendarsLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)] py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Kalender werden geladen…
                </div>
              ) : (
                <DataTableFilter
                  label="Kein Kalender"
                  options={calendarFilterOptions}
                  selectedValues={calendar ? [calendar] : []}
                  onChange={(vals) => setCalendar(vals.length > 0 ? vals[0] : "")}
                />
              )}
            </div>

            {/* Color (auto-assigned) */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                {t("keys.color")}
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-[var(--app-border)]"
                  style={{ backgroundColor: autoColor }}
                />
                <span className="text-[13px] text-[var(--app-text-muted)] font-mono">
                  {autoColor}
                </span>
                <span className="text-[11px] text-[var(--app-text-muted)] ml-auto">
                  automatisch vergeben
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="animate-fade-up delay-2" style={{ marginTop: "24px" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks
                size={16}
                style={{ color: "var(--app-text-muted)" }}
              />
              <span className="section-label" style={{ marginBottom: 0 }}>
                {t("keys.tasks")}
              </span>
            </div>
            <button
              className="btn-ghost"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setShowTaskForm(true)}
            >
              <Plus size={14} />
              {t("keys.addTask")}
            </button>
          </div>

          <p
            style={{
              fontSize: "12px",
              color: "var(--app-text-muted)",
              marginBottom: "12px",
            }}
          >
            {t("keys.tasksDesc")}
          </p>

          {/* Task list */}
          {tasks.length > 0 && (
            <div
              className="glow-card"
              style={{ overflow: "hidden", marginBottom: "12px" }}
            >
              {tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderTop:
                      i > 0 ? "1px solid var(--app-border)" : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {task.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Search
                        size={10}
                        style={{ color: "var(--app-text-muted)" }}
                      />
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--app-text-muted)",
                        }}
                      >
                        „{task.search_term}"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="p-1.5 rounded-lg hover:bg-[rgba(255,59,48,0.12)] transition-all"
                    style={{ flexShrink: 0 }}
                  >
                    <X
                      size={14}
                      style={{ color: "var(--app-text-muted)" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add task inline form */}
          {showTaskForm && (
            <div
              className="glow-card"
              style={{ padding: "16px", marginBottom: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--app-text-muted)] mb-1 uppercase tracking-wider">
                    {t("keys.taskName")}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="z.B. Vorlesung, Übung …"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--app-text-muted)] mb-1 uppercase tracking-wider">
                    {t("keys.taskSearchTerm")}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="z.B. Vorlesung, Klausur …"
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                  />
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "var(--app-text-muted)",
                    }}
                  >
                    {t("keys.taskSearchTermHint")}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    className="btn-ghost"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => {
                      setShowTaskForm(false);
                      setTaskName("");
                      setTaskSearchTerm("");
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn-primary"
                    style={{
                      fontSize: "12px",
                      padding: "6px 12px",
                      opacity:
                        taskName.trim() && taskSearchTerm.trim() ? 1 : 0.5,
                    }}
                    disabled={!taskName.trim() || !taskSearchTerm.trim()}
                    onClick={addTask}
                  >
                    <Plus size={13} />
                    {t("keys.addTask")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tasks.length === 0 && !showTaskForm && (
            <div
              className="glow-card"
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ListChecks
                size={24}
                style={{ color: "var(--app-text-muted)", opacity: 0.5 }}
              />
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--app-text-muted)",
                  textAlign: "center",
                }}
              >
                {t("keys.noTasks")}
              </p>
              <button
                className="btn-ghost"
                style={{ fontSize: "12px", marginTop: "4px" }}
                onClick={() => setShowTaskForm(true)}
              >
                <Plus size={13} />
                {t("keys.addTask")}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-3 pt-6 mt-6 animate-fade-up delay-3"
          style={{ borderTop: "1px solid var(--app-border)" }}
        >
          <Link
            href="/keys"
            className="btn-ghost"
            style={{ textDecoration: "none" }}
          >
            {t("common.cancel")}
          </Link>
          <button
            className="btn-primary"
            disabled={!name.trim() || !searchKey.trim()}
            onClick={async () => {
              try {
                const res = await fetch("/api/keys", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name.trim(),
                    search_key: searchKey.trim(),
                    color: autoColor,
                    category_id: category || null,
                    calendar_id: calendar || null,
                  }),
                });
                if (!res.ok) throw new Error("Failed to create key");
                router.push("/keys");
              } catch (err) {
                console.error("Error creating key:", err);
              }
            }}
            style={{ opacity: name.trim() && searchKey.trim() ? 1 : 0.5 }}
          >
            {t("common.create")}
          </button>
        </div>
      </div>
    </main>
  );
}
