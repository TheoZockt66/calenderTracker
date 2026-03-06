import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  // Get session with access token
  const { getToken } = await import("next-auth/jwt");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token.accessToken as string });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    // Fetch events from 2026-01-01 to 1 month in the future
    const now = new Date();
    const timeMin = new Date("2026-01-01T00:00:00Z").toISOString();
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + 1);
    const timeMax = futureDate.toISOString();

    // Get list of calendars
    let calendarList;
    try {
      calendarList = await calendar.calendarList.list();
    } catch (authErr: unknown) {
      const code = (authErr as { code?: number }).code;
      if (code === 401 || code === 403) {
        return NextResponse.json(
          { error: "Token expired", calendars: [], events: [], total: 0 },
          { status: 401 }
        );
      }
      throw authErr;
    }
    const calendars = calendarList.data.items || [];

    // Fetch events from all calendars
    interface CalendarEventItem {
      id: string | null | undefined;
      summary: string;
      description: string | null;
      location: string | null;
      start: string | null;
      end: string | null;
      allDay: boolean;
      calendarName: string;
      calendarColor: string;
      status: string | null | undefined;
      htmlLink: string | null | undefined;
      creator: string | null;
      attendees: { email: string | null | undefined; displayName: string | null | undefined; responseStatus: string | null | undefined }[];
    }
    const allEvents: CalendarEventItem[] = [];

    for (const cal of calendars) {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id!,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
        });

        const events = (eventsRes.data.items || []).map((event) => ({
          id: event.id,
          summary: event.summary || "(Kein Titel)",
          description: event.description || null,
          location: event.location || null,
          start: event.start?.dateTime || event.start?.date || null,
          end: event.end?.dateTime || event.end?.date || null,
          allDay: !event.start?.dateTime,
          calendarName: cal.summary || "Unbekannt",
          calendarColor: cal.backgroundColor || "#666",
          status: event.status,
          htmlLink: event.htmlLink,
          creator: event.creator?.email || null,
          attendees: (event.attendees || []).map((a) => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
          })),
        }));

        allEvents.push(...events);
      } catch {
        // Skip calendars we can't access
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => {
      const dateA = new Date(a.start || "1970-01-01").getTime();
      const dateB = new Date(b.start || "1970-01-01").getTime();
      return dateA - dateB;
    });

    return NextResponse.json({
      calendars: calendars.map((c) => ({
        id: c.id,
        name: c.summary,
        color: c.backgroundColor,
        primary: c.primary || false,
      })),
      events: allEvents,
      total: allEvents.length,
    });
  } catch (error: unknown) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
