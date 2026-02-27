import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/events - List tracked events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("key_id");
  const gpmOnly = searchParams.get("gpm_only");
  const search = searchParams.get("search");

  let query = supabase
    .from("tracked_events")
    .select("*")
    .order("start_time", { ascending: false });

  if (keyId && keyId !== "all") {
    query = query.eq("key_id", keyId);
  }

  if (gpmOnly === "true") {
    query = query.eq("key_name", "GPM");
  }

  if (search) {
    query = query.ilike("summary", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/events - Create a tracked event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { summary, key_id, key_name, start_time, end_time, duration_minutes, event_date } = body;

  if (!summary || !key_id) {
    return NextResponse.json(
      { error: "summary and key_id are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tracked_events")
    .insert({
      summary,
      key_id,
      key_name: key_name || "",
      start_time,
      end_time,
      duration_minutes: duration_minutes || 0,
      event_date: event_date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update key statistics
  await supabase.rpc("increment_key_stats", {
    p_key_id: key_id,
    p_minutes: duration_minutes || 0,
  });

  return NextResponse.json(data, { status: 201 });
}
