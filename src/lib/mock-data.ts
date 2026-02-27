import type { Category, TrackingKey, TrackedEvent, DashboardStats, WeeklyData, Task } from "./types";

// ─── Mock Categories ─────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "Semester 4",
    description: "Alle Fächer im 4. Semester",
    created_at: "2025-10-01T10:00:00Z",
  },
  {
    id: "cat-2",
    name: "Semester 5",
    description: "Alle Fächer im 5. Semester",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "cat-3",
    name: "Persönlich",
    description: "Persönliche Aktivitäten",
    created_at: "2026-01-01T10:00:00Z",
  },
];

// ─── Mock Tasks ──────────────────────────────────────────────────────

export const MOCK_TASKS: Task[] = [
  {
    id: "task-1",
    key_id: "key-1",
    name: "Vorlesung",
    search_term: "Vorlesung",
    total_minutes: 1080,
    event_count: 12,
    created_at: "2025-10-05T10:00:00Z",
  },
  {
    id: "task-2",
    key_id: "key-1",
    name: "Übung",
    search_term: "Übung",
    total_minutes: 720,
    event_count: 8,
    created_at: "2025-10-05T10:00:00Z",
  },
  {
    id: "task-3",
    key_id: "key-1",
    name: "Klausurvorbereitung",
    search_term: "Klausur",
    total_minutes: 540,
    event_count: 6,
    created_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "task-4",
    key_id: "key-2",
    name: "Vorlesung",
    search_term: "Vorlesung",
    total_minutes: 900,
    event_count: 10,
    created_at: "2025-10-05T10:00:00Z",
  },
  {
    id: "task-5",
    key_id: "key-2",
    name: "Tutorium",
    search_term: "Tutorium",
    total_minutes: 540,
    event_count: 6,
    created_at: "2025-10-05T10:00:00Z",
  },
  {
    id: "task-6",
    key_id: "key-6",
    name: "Krafttraining",
    search_term: "Kraft",
    total_minutes: 780,
    event_count: 26,
    created_at: "2026-01-01T10:00:00Z",
  },
  {
    id: "task-7",
    key_id: "key-6",
    name: "Cardio",
    search_term: "Cardio",
    total_minutes: 480,
    event_count: 16,
    created_at: "2026-01-01T10:00:00Z",
  },
];

export function getTasksForKey(keyId: string): Task[] {
  return MOCK_TASKS.filter((t) => t.key_id === keyId);
}

export function getKeyById(keyId: string): TrackingKey | undefined {
  return MOCK_KEYS.find((k) => k.id === keyId);
}

// ─── Mock Keys ───────────────────────────────────────────────────────

export const MOCK_KEYS: TrackingKey[] = [
  {
    id: "key-1",
    name: "Geschäftsprozessmanagement",
    search_key: "GPM",
    color: "#000000",
    category_id: "cat-1",
    calendar_id: null,
    total_minutes: 2340,
    event_count: 26,
    created_at: "2025-10-01T10:00:00Z",
  },
  {
    id: "key-2",
    name: "Mathematik III",
    search_key: "Mathe III",
    color: "#404040",
    category_id: "cat-1",
    calendar_id: null,
    total_minutes: 1890,
    event_count: 21,
    created_at: "2025-10-01T10:00:00Z",
  },
  {
    id: "key-3",
    name: "Datenbanken",
    search_key: "Datenbanken",
    color: "#808080",
    category_id: "cat-1",
    calendar_id: null,
    total_minutes: 1350,
    event_count: 15,
    created_at: "2025-10-01T10:00:00Z",
  },
  {
    id: "key-4",
    name: "Software Engineering",
    search_key: "SE",
    color: "#1a1a1a",
    category_id: "cat-2",
    calendar_id: null,
    total_minutes: 960,
    event_count: 12,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "key-5",
    name: "KI Grundlagen",
    search_key: "KI",
    color: "#333333",
    category_id: "cat-2",
    calendar_id: null,
    total_minutes: 720,
    event_count: 8,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "key-6",
    name: "Sport",
    search_key: "Sport",
    color: "#595959",
    category_id: "cat-3",
    calendar_id: null,
    total_minutes: 1560,
    event_count: 52,
    created_at: "2026-01-01T10:00:00Z",
  },
  {
    id: "key-7",
    name: "Lesen",
    search_key: "Lesen",
    color: "#737373",
    category_id: "cat-3",
    calendar_id: null,
    total_minutes: 840,
    event_count: 28,
    created_at: "2026-01-01T10:00:00Z",
  },
];

// ─── Deterministic random ────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Mock Events ─────────────────────────────────────────────────────

function generateMockEvents(): TrackedEvent[] {
  const events: TrackedEvent[] = [];
  const baseDate = new Date("2026-02-24T12:00:00Z");
  const random = seededRandom(42);

  const entries = [
    { keyId: "key-1", keyName: "GPM", durations: [90, 120, 90, 60, 90, 120] },
    { keyId: "key-2", keyName: "Mathe III", durations: [90, 90, 60, 90] },
    { keyId: "key-3", keyName: "Datenbanken", durations: [90, 60, 90] },
    { keyId: "key-4", keyName: "Software Engineering", durations: [120, 90, 60] },
    { keyId: "key-5", keyName: "KI Grundlagen", durations: [90, 90] },
    { keyId: "key-6", keyName: "Sport", durations: [60, 30, 45, 60, 30] },
    { keyId: "key-7", keyName: "Lesen", durations: [30, 45, 30, 30] },
  ];

  let id = 1;
  for (const entry of entries) {
    for (let week = 0; week < 4; week++) {
      for (const duration of entry.durations) {
        const dayOffset = week * 7 + Math.floor(random() * 7);
        const hourOffset = 8 + Math.floor(random() * 10);
        const date = new Date(baseDate.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        date.setHours(hourOffset, 0, 0, 0);
        const endDate = new Date(date.getTime() + duration * 60 * 1000);

        events.push({
          id: `event-${id++}`,
          summary: `${entry.keyName} – Termin`,
          key_id: entry.keyId,
          key_name: entry.keyName,
          start_time: date.toISOString(),
          end_time: endDate.toISOString(),
          duration_minutes: duration,
          event_date: date.toISOString().split("T")[0],
          created_at: date.toISOString(),
        });
      }
    }
  }

  return events.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
}

export const MOCK_EVENTS: TrackedEvent[] = generateMockEvents();

// ─── Stats ───────────────────────────────────────────────────────────

export const MOCK_STATS: DashboardStats = {
  totalHours: Math.round(MOCK_KEYS.reduce((sum, k) => sum + k.total_minutes, 0) / 60),
  totalEvents: MOCK_KEYS.reduce((sum, k) => sum + k.event_count, 0),
  activeKeys: MOCK_KEYS.length,
  thisWeekHours: 24,
  lastWeekHours: 21,
};

export const MOCK_WEEKLY_DATA: WeeklyData[] = [
  { week: "KW 4", hours: 18 },
  { week: "KW 5", hours: 22 },
  { week: "KW 6", hours: 21 },
  { week: "KW 7", hours: 24 },
  { week: "KW 8", hours: 19 },
  { week: "KW 9", hours: 24 },
];

export function getHoursPerKey() {
  return MOCK_KEYS.map((k) => ({
    name: k.name,
    hours: Math.round((k.total_minutes / 60) * 10) / 10,
    color: k.color,
  })).sort((a, b) => b.hours - a.hours);
}

export function getCategoryName(categoryId: string | null): string {
  if (!categoryId) return "Ohne Kategorie";
  return MOCK_CATEGORIES.find((c) => c.id === categoryId)?.name || "Ohne Kategorie";
}

export function getKeysForCategory(categoryId: string): TrackingKey[] {
  return MOCK_KEYS.filter((k) => k.category_id === categoryId);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
