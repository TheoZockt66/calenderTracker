import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Check if an event summary matches a search_key string.
 * search_key can contain multiple comma-separated terms.
 * Returns true if any term matches (case-insensitive).
 */
function matchesSearchKey(summary: string, searchKey: string): boolean {
  const summaryLower = summary.toLowerCase();
  const terms = searchKey.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return terms.some((term) => summaryLower.includes(term));
}

/**
 * POST /api/tracking
 * Scans Google Calendar events and matches them against tracking keys.
 * Supports incremental sync via Google syncToken per calendar.
 * Supports multiple search terms per key (comma-separated).
 */
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: user.accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const debugLog: string[] = [];

  try {
    // 1. Get all tracking keys for this user from Supabase
    const { data: keys, error: keysError } = await supabase
      .from("tracking_keys")
      .select("*")
      .eq("user_id", user.id);

    if (keysError) {
      return NextResponse.json({ error: keysError.message }, { status: 500 });
    }

    if (!keys || keys.length === 0) {
      return NextResponse.json({
        message: "No tracking keys found",
        matched: 0,
        newEvents: 0,
        debug: ["Keine Tracking-Keys in der Datenbank gefunden."],
      });
    }

    debugLog.push(`${keys.length} Keys geladen: ${keys.map((k) => `"${k.name}" (search: "${k.search_key || k.name}")`).join(", ")}`);

    // 2. Get existing tracked event IDs to prevent duplicates
    const { data: existingEvents } = await supabase
      .from("tracked_events")
      .select("id, summary, start_time, key_id")
      .eq("user_id", user.id);

    const existingSet = new Set(
      (existingEvents || []).map(
        (e) => `${e.key_id}|${e.summary}|${new Date(e.start_time).getTime()}`
      )
    );

    debugLog.push(`${existingSet.size} bereits getrackte Events in DB.`);

    // 4. Fetch calendar events (full sync always — incremental sync misses past events that were planned before the last sync token)
    const now = new Date();
    const timeMin = new Date("2026-01-01T00:00:00Z").toISOString();
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + 1);
    const timeMax = futureDate.toISOString();

    let calendarList;
    try {
      calendarList = await calendar.calendarList.list();
    } catch (calErr) {
      const msg = calErr instanceof Error ? calErr.message : "Unknown";
      const isInsufficientScope = msg.includes("insufficient authentication scopes") || msg.includes("insufficientPermissions");
      return NextResponse.json({
        error: isInsufficientScope ? "InsufficientScopeError" : "Google Calendar API Fehler",
        details: msg,
        debug: [...debugLog, `Fehler beim Abrufen der Kalender-Liste: ${msg}`],
      }, { status: isInsufficientScope ? 403 : 500 });
    }

    const calendars = calendarList.data.items || [];
    debugLog.push(`${calendars.length} Kalender gefunden: ${calendars.map((c) => c.summary).join(", ")}`);

    interface RawEvent {
      id: string;
      summary: string;
      start: string | null;
      end: string | null;
      allDay: boolean;
      calendarId: string;
      calendarName: string;
      cancelled: boolean;
    }

    const allEvents: RawEvent[] = [];

    for (const cal of calendars) {
      const calId = cal.id!;

      try {
        const eventsRes = await calendar.events.list({
          calendarId: calId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 2500,
        });

        const events = (eventsRes.data.items || []).map((event) => ({
          id: event.id || "",
          summary: event.summary || "",
          start: event.start?.dateTime || event.start?.date || null,
          end: event.end?.dateTime || event.end?.date || null,
          allDay: !event.start?.dateTime,
          calendarId: calId,
          calendarName: cal.summary || "Unbekannt",
          cancelled: event.status === "cancelled",
        }));

        allEvents.push(...events);
      } catch {
        debugLog.push(`⚠ Kalender "${cal.summary}" konnte nicht gelesen werden.`);
      }
    }

    debugLog.push(`${allEvents.length} Kalender-Events abgerufen.`);

    // 5. Match events against keys (supports multiple comma-separated search terms)
    let totalMatched = 0;
    let newEventsCount = 0;
    let skippedDuplicates = 0;
    let skippedAllDay = 0;
    const keyUpdates = new Map<string, { addMinutes: number; addEvents: number }>();
    const matchedSamples: string[] = [];

    for (const event of allEvents) {
      if (!event.summary || event.cancelled) continue;

      // Skip all-day events
      if (event.allDay || !event.start || !event.end) {
        skippedAllDay++;
        continue;
      }

      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const durationMinutes = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      if (durationMinutes <= 0) continue;

      for (const key of keys) {
        const rawSearchKey = key.search_key || key.name || "";
        if (!rawSearchKey.trim()) continue;

        const matches = matchesSearchKey(event.summary, rawSearchKey);

        // Calendar filter: only if key has a specific calendar assigned
        const calendarMatch = !key.calendar_id || key.calendar_id === event.calendarId;

        if (matches && calendarMatch) {
          totalMatched++;

          const dedupeKey = `${key.id}|${event.summary}|${startDate.getTime()}`;
          if (existingSet.has(dedupeKey)) {
            skippedDuplicates++;
            continue;
          }

          const eventDate = event.start.split("T")[0];
          const { error: insertError } = await supabase
            .from("tracked_events")
            .insert({
              summary: event.summary,
              key_id: key.id,
              key_name: key.name,
              start_time: event.start,
              end_time: event.end,
              duration_minutes: durationMinutes,
              event_date: eventDate,
              user_id: user.id,
            });

          if (!insertError) {
            newEventsCount++;
            existingSet.add(dedupeKey);

            if (matchedSamples.length < 10) {
              matchedSamples.push(`"${event.summary}" → ${key.name} (${durationMinutes}min)`);
            }

            const existing = keyUpdates.get(key.id) || { addMinutes: 0, addEvents: 0 };
            existing.addMinutes += durationMinutes;
            existing.addEvents += 1;
            keyUpdates.set(key.id, existing);
          } else {
            debugLog.push(`⚠ Insert-Fehler für "${event.summary}": ${insertError.message}`);
          }
        }
      }
    }

    debugLog.push(`Matching: ${totalMatched} Treffer, ${newEventsCount} neu, ${skippedDuplicates} Duplikate übersprungen, ${skippedAllDay} ganztägige übersprungen.`);

    // 6. Cleanup: Remove tracked events whose calendar events no longer exist
    const calendarEventSignatures = new Set(
      allEvents
        .filter((e) => e.start && !e.allDay && !e.cancelled)
        .map((e) => `${e.summary}|${new Date(e.start!).getTime()}`)
    );

    let removedCount = 0;
    let removedMinutes = 0;
    const removedFromKeys = new Map<string, { minutes: number; count: number }>();

    if (existingEvents && existingEvents.length > 0) {
      for (const tracked of existingEvents) {
        const sig = `${tracked.summary}|${new Date(tracked.start_time).getTime()}`;
        if (!calendarEventSignatures.has(sig)) {
          const { data: deleted } = await supabase
            .from("tracked_events")
            .delete()
            .eq("id", tracked.id)
            .select("duration_minutes, key_id")
            .single();

          if (deleted) {
            removedCount++;
            removedMinutes += deleted.duration_minutes || 0;
            const prev = removedFromKeys.get(deleted.key_id) || { minutes: 0, count: 0 };
            prev.minutes += deleted.duration_minutes || 0;
            prev.count += 1;
            removedFromKeys.set(deleted.key_id, prev);
          }
        }
      }
    }

    if (removedCount > 0) {
      debugLog.push(`🗑 ${removedCount} gelöschte Events entfernt (${removedMinutes}min).`);
    }

    // 7. Recalculate stats for all affected keys
    const affectedKeyIds = new Set([
      ...keyUpdates.keys(),
      ...removedFromKeys.keys(),
    ]);

    for (const keyId of affectedKeyIds) {
      const { data: keyEvents } = await supabase
        .from("tracked_events")
        .select("duration_minutes")
        .eq("key_id", keyId);

      const totalMin = (keyEvents || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const totalCnt = (keyEvents || []).length;

      await supabase
        .from("tracking_keys")
        .update({ total_minutes: totalMin, event_count: totalCnt })
        .eq("id", keyId);
    }

    debugLog.push(`${affectedKeyIds.size} Keys Stats neu berechnet.`);

    // 8. Update last_sync_at on user
    await supabase
      .from("users")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      message: "Tracking sync complete",
      totalCalendarEvents: allEvents.length,
      matched: totalMatched,
      newEvents: newEventsCount,
      removedEvents: removedCount,
      skippedDuplicates,
      keysUpdated: affectedKeyIds.size,
      matchedSamples,
      debug: debugLog,
    });
  } catch (error: unknown) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync tracking",
        details: error instanceof Error ? error.message : "Unknown",
        debug: [...debugLog, `Fatal: ${error instanceof Error ? error.message : "Unknown"}`],
      },
      { status: 500 }
    );
  }
}

// GET /api/tracking - Get sync status for the current user
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data } = await supabase
    .from("users")
    .select("last_sync_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    lastSyncAt: data?.last_sync_at || null,
  });
}
