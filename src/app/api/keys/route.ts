import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/keys - List all tracking keys
export async function GET() {
  const { data, error } = await supabase
    .from("tracking_keys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/keys - Create a new tracking key
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, search_key, color, category_id, calendar_id } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tracking_keys")
    .insert({
      name,
      search_key: search_key || name,
      color: color || "#000000",
      category_id: category_id || null,
      calendar_id: calendar_id || null,
      total_minutes: 0,
      event_count: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/keys - Update a tracking key
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, search_key, color, category_id, calendar_id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tracking_keys")
    .update({ name, search_key, color, category_id, calendar_id })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/keys - Delete a tracking key
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tracking_keys")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
