"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Category, TrackingKey } from "@/lib/types";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import type { FilterOption } from "@/components/ui/data-table-filter";
import {
  ArrowLeft,
  Loader2,
  Key,
  Trash2,
  Save,
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

export default function EditKeyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const keyId = params.id as string;

  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyData, setKeyData] = useState<TrackingKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [name, setName] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [category, setCategory] = useState("");
  const [calendar, setCalendar] = useState("");
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      // Load calendars
      fetch("/api/calendar")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setCalendars(data.calendars || []))
        .catch(() => setCalendars([]))
        .finally(() => setCalendarsLoading(false));

      // Load categories
      fetch("/api/categories")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setCategories(data || []))
        .catch(() => setCategories([]));

      // Load the specific key
      fetch("/api/keys")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: TrackingKey[]) => {
          const found = data.find((k) => k.id === keyId);
          if (found) {
            setKeyData(found);
            setName(found.name);
            setSearchKey(found.search_key || "");
            setCategory(found.category_id || "");
            setCalendar(found.calendar_id || "");
            setColor(found.color);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, keyId]);

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

  const handleSave = async () => {
    if (!name.trim() || !searchKey.trim() || !keyId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: keyId,
          name: name.trim(),
          search_key: searchKey.trim(),
          color,
          category_id: category || null,
          calendar_id: calendar || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update key");
      router.push("/keys");
    } catch (err) {
      console.error("Error updating key:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!keyId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete key");
      router.push("/keys");
    } catch (err) {
      console.error("Error deleting key:", err);
    } finally {
      setDeleting(false);
    }
  };

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

  if (!keyData) {
    return (
      <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "var(--app-text-muted)", marginBottom: "16px" }}>
            Key nicht gefunden.
          </p>
          <Link href="/keys" className="btn-ghost" style={{ textDecoration: "none" }}>
            <ArrowLeft size={16} />
            Zurück zu Keys
          </Link>
        </div>
      </main>
    );
  }

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
              style={{ backgroundColor: color + "18" }}
            >
              <Key size={20} style={{ color }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {t("keys.editKey")}
              </h1>
              <p
                style={{
                  marginTop: "2px",
                  fontSize: "13px",
                  color: "var(--app-text-muted)",
                }}
              >
                Bearbeite die Einstellungen für &bdquo;{keyData.name}&ldquo;
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
                  onChange={(vals) =>
                    setCalendar(vals.length > 0 ? vals[0] : "")
                  }
                />
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5 uppercase tracking-wider">
                {t("keys.color")}
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-lg border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor:
                        color === c ? "white" : "transparent",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                      boxShadow:
                        color === c
                          ? `0 0 0 2px ${c}, 0 4px 12px ${c}44`
                          : "none",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div
                  className="w-10 h-10 rounded-lg border border-[var(--app-border)]"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[13px] text-[var(--app-text-muted)] font-mono">
                  {color}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="glow-card animate-fade-up delay-2"
          style={{ padding: "20px", marginTop: "16px" }}
        >
          <p className="text-[12px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-3">
            Statistiken
          </p>
          <div className="flex items-center gap-4">
            <div className="chip text-[12px]">
              {keyData.event_count} Events
            </div>
            <div className="chip text-[12px]">
              {Math.round(keyData.total_minutes / 60 * 10) / 10}h getrackt
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-between pt-6 mt-6 animate-fade-up delay-3"
          style={{ borderTop: "1px solid var(--app-border)" }}
        >
          {/* Delete */}
          {!showDeleteConfirm ? (
            <button
              className="btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
              {t("keys.deleteKey")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--app-text-muted)]">
                Wirklich löschen?
              </span>
              <button
                className="btn-danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Ja, löschen
              </button>
              <button
                className="btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Nein
              </button>
            </div>
          )}

          {/* Save */}
          <div className="flex gap-3">
            <Link
              href="/keys"
              className="btn-ghost"
              style={{ textDecoration: "none" }}
            >
              {t("common.cancel")}
            </Link>
            <button
              className="btn-primary"
              disabled={!name.trim() || !searchKey.trim() || saving}
              onClick={handleSave}
              style={{ opacity: name.trim() && searchKey.trim() ? 1 : 0.5 }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
