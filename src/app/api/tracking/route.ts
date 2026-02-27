import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/tracking
 * Scans Google Calendar events and matches them against tracking keys.
 * For each key: if the event summary contains the search_key (case-insensitive),
 * the event is tracked. Also checks for duplicates before inserting.
 */
export async function POST(req: NextRequest) {
  // Authenticate
  const { getToken } = await import("next-auth/jwt");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token.accessToken as string });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const debugLog: string[] = [];

  try {
    // 1. Get all tracking keys from Supabase
    const { data: keys, error: keysError } = await supabase
      .from("tracking_keys")
      .select("*");

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
      .select("id, summary, start_time, key_id");

    const existingSet = new Set(
      (existingEvents || []).map(
        (e) => `${e.key_id}|${e.summary}|${e.start_time}`
      )
    );

    debugLog.push(`${existingSet.size} bereits getrackte Events in DB.`);

    // 3. Fetch calendar events (last 90 days + next 30 days)
    const now = new Date();
    const timeMin = new Date(
      now.getTime() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();
    const timeMax = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    let calendarList;
    try {
      calendarList = await calendar.calendarList.list();
    } catch (calErr) {
      const msg = calErr instanceof Error ? calErr.message : "Unknown";
      return NextResponse.json({
        error: "Google Calendar API Fehler",
        details: msg,
        debug: [...debugLog, `Fehler beim Abrufen der Kalender-Liste: ${msg}`],
      }, { status: 500 });
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
    }

    const allEvents: RawEvent[] = [];

    for (const cal of calendars) {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id!,
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
          calendarId: cal.id || "",
          calendarName: cal.summary || "Unbekannt",
        }));

        allEvents.push(...events);
      } catch {
        debugLog.push(`⚠ Kalender "${cal.summary}" konnte nicht gelesen werden.`);
      }
    }

    debugLog.push(`${allEvents.length} Kalender-Events abgerufen (${allEvents.filter(e => !e.allDay).length} mit Uhrzeit, ${allEvents.filter(e => e.allDay).length} ganztägig).`);

    // 4. Match events against keys
    let totalMatched = 0;
    let newEventsCount = 0;
    let skippedDuplicates = 0;
    let skippedAllDay = 0;
    const keyUpdates = new Map<
      string,
      { addMinutes: number; addEvents: number }
    >();
    const matchedSamples: string[] = [];

    for (const event of allEvents) {
      if (!event.summary) continue;

      // Skip all-day events
      if (event.allDay || !event.start || !event.end) {
        skippedAllDay++;
        continue;
      }

      const summaryLower = event.summary.toLowerCase();
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const durationMinutes = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      if (durationMinutes <= 0) continue;

      for (const key of keys) {
        // Match by search_key (case-insensitive), fallback to name
        const rawSearchKey = key.search_key || key.name || "";
        if (!rawSearchKey.trim()) continue;
        
        const searchTerm = rawSearchKey.trim().toLowerCase();
        const matches = summaryLower.includes(searchTerm);

        // Calendar filter: only if key has a specific calendar assigned
        const calendarMatch =
          !key.calendar_id || key.calendar_id === event.calendarId;

        if (matches && calendarMatch) {
          totalMatched++;

          // Check for duplicate
          const dedupeKey = `${key.id}|${event.summary}|${event.start}`;
          if (existingSet.has(dedupeKey)) {
            skippedDuplicates++;
            continue;
          }

          // Insert new tracked event
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
            });

          if (!insertError) {
            newEventsCount++;
            existingSet.add(dedupeKey);

            if (matchedSamples.length < 10) {
              matchedSamples.push(`"${event.summary}" → ${key.name} (${durationMinutes}min)`);
            }

            // Accumulate key stat updates
            const existing = keyUpdates.get(key.id) || {
              addMinutes: 0,
              addEvents: 0,
            };
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

    // 5. Batch update key statistics
    for (const [keyId, updates] of keyUpdates) {
      // Use RPC to increment: first call adds all minutes + 1 event
      for (let i = 0; i < updates.addEvents; i++) {
        const { error: rpcError } = await supabase.rpc("increment_key_stats", {
          p_key_id: keyId,
          p_minutes: i === 0 ? updates.addMinutes : 0,
        });
        if (rpcError) {
          debugLog.push(`⚠ Stats-Update Fehler für Key ${keyId}: ${rpcError.message}`);
          break;
        }
      }
    }

    debugLog.push(`${keyUpdates.size} Keys aktualisiert.`);

    return NextResponse.json({
      message: "Tracking sync complete",
      totalCalendarEvents: allEvents.length,
      matched: totalMatched,
      newEvents: newEventsCount,
      skippedDuplicates,
      keysUpdated: keyUpdates.size,
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
