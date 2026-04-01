-- CalendarTracker Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (stores Google auth tokens for cross-device persistence)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  image TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at BIGINT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync tokens table (stores Google Calendar incremental sync tokens per user per calendar)
CREATE TABLE IF NOT EXISTS sync_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  sync_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, calendar_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking keys table
CREATE TABLE IF NOT EXISTS tracking_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_key TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#000000',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  calendar_id TEXT,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  budget_hours_weekly NUMERIC(5,1) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked events table
CREATE TABLE IF NOT EXISTS tracked_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_sync_tokens_user ON sync_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_keys_category ON tracking_keys(category_id);
CREATE INDEX IF NOT EXISTS idx_tracking_keys_user ON tracking_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_events_key ON tracked_events(key_id);
CREATE INDEX IF NOT EXISTS idx_tracked_events_date ON tracked_events(event_date);
CREATE INDEX IF NOT EXISTS idx_tracked_events_key_name ON tracked_events(key_name);
CREATE INDEX IF NOT EXISTS idx_tracked_events_user ON tracked_events(user_id);

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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_events ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (app filters by user_id in application layer)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all on users') THEN
    CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_tokens' AND policyname = 'Allow all on sync_tokens') THEN
    CREATE POLICY "Allow all on sync_tokens" ON sync_tokens FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Allow all on categories') THEN
    CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_keys' AND policyname = 'Allow all on tracking_keys') THEN
    CREATE POLICY "Allow all on tracking_keys" ON tracking_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracked_events' AND policyname = 'Allow all on tracked_events') THEN
    CREATE POLICY "Allow all on tracked_events" ON tracked_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
