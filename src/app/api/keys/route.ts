import { NextRequest, NextResponse } from "next/server";
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

// GET /api/keys - List all tracking keys for the current user
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("tracking_keys")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/keys - Create a new tracking key
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, search_key, color, category_id, calendar_id, budget_hours_weekly } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const insertData = {
      name,
      search_key: search_key || name,
      color: color || "#000000",
      category_id: category_id || null,
      calendar_id: calendar_id || null,
      budget_hours_weekly: budget_hours_weekly ?? null,
      total_minutes: 0,
      event_count: 0,
      user_id: user.id,
    };

    console.log("[POST /api/keys] inserting:", JSON.stringify(insertData));

    const { data, error } = await supabase
      .from("tracking_keys")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/keys] Supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[POST /api/keys] Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/keys - Update a tracking key and re-evaluate tracked events
export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { id, name, search_key, color, category_id, calendar_id, budget_hours_weekly } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // 1. Update the key itself
  const { data, error } = await supabase
    .from("tracking_keys")
    .update({ name, search_key, color, category_id, calendar_id, budget_hours_weekly: budget_hours_weekly ?? null })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newSearchKey = (search_key || name || "").trim();

  // 2. Re-evaluate existing tracked events against the new search_key
  const { data: trackedEvents } = await supabase
    .from("tracked_events")
    .select("id, summary, duration_minutes")
    .eq("key_id", id);

  let removedCount = 0;

  if (trackedEvents && newSearchKey) {
    for (const event of trackedEvents) {
      if (!matchesSearchKey(event.summary || "", newSearchKey)) {
        await supabase.from("tracked_events").delete().eq("id", event.id);
        removedCount++;
      }
    }
  }

  // 3. Update key_name on all remaining events (in case name changed)
  if (name) {
    await supabase
      .from("tracked_events")
      .update({ key_name: name })
      .eq("key_id", id);
  }

  // 4. Recalculate key stats from remaining events
  const { data: remainingEvents } = await supabase
    .from("tracked_events")
    .select("duration_minutes")
    .eq("key_id", id);

  const totalMinutes = (remainingEvents || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const eventCount = (remainingEvents || []).length;

  await supabase
    .from("tracking_keys")
    .update({ total_minutes: totalMinutes, event_count: eventCount })
    .eq("id", id);

  return NextResponse.json({
    ...data,
    total_minutes: totalMinutes,
    event_count: eventCount,
    _reeval: { removedCount, remaining: eventCount },
  });
}

// DELETE /api/keys - Delete a tracking key
export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tracking_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
