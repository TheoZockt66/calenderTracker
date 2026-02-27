-- CalendarTracker Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking keys table
CREATE TABLE IF NOT EXISTS tracking_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  calendar_id TEXT,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked events table
CREATE TABLE IF NOT EXISTS tracked_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary TEXT NOT NULL,
  key_id UUID NOT NULL REFERENCES tracking_keys(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_keys_category ON tracking_keys(category_id);
CREATE INDEX IF NOT EXISTS idx_tracked_events_key ON tracked_events(key_id);
CREATE INDEX IF NOT EXISTS idx_tracked_events_date ON tracked_events(event_date);
CREATE INDEX IF NOT EXISTS idx_tracked_events_key_name ON tracked_events(key_name);

-- RPC function to increment key statistics
CREATE OR REPLACE FUNCTION increment_key_stats(p_key_id UUID, p_minutes INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE tracking_keys
  SET total_minutes = total_minutes + p_minutes,
      event_count = event_count + 1
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (optional, add policies as needed)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_events ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (adjust for your auth setup)
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tracking_keys" ON tracking_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tracked_events" ON tracked_events FOR ALL USING (true) WITH CHECK (true);
