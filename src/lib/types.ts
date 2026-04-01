// ─── Supabase Database Types ─────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          google_id: string;
          email: string;
          name: string | null;
          image: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: number | null;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          google_id: string;
          email: string;
          name?: string | null;
          image?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: number | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          google_id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: number | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_tokens: {
        Row: {
          id: string;
          user_id: string;
          calendar_id: string;
          sync_token: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calendar_id: string;
          sync_token: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calendar_id?: string;
          sync_token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tracking_keys: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          search_key: string;
          color: string;
          category_id: string | null;
          calendar_id: string | null;
          total_minutes: number;
          event_count: number;
          budget_hours_weekly: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          search_key?: string;
          color?: string;
          category_id?: string | null;
          calendar_id?: string | null;
          total_minutes?: number;
          event_count?: number;
          budget_hours_weekly?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          search_key?: string;
          color?: string;
          category_id?: string | null;
          calendar_id?: string | null;
          total_minutes?: number;
          event_count?: number;
          budget_hours_weekly?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_keys_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      tracked_events: {
        Row: {
          id: string;
          user_id: string | null;
          summary: string;
          key_id: string;
          key_name: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          event_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          summary: string;
          key_id: string;
          key_name: string;
          start_time: string;
          end_time: string;
          duration_minutes?: number;
          event_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          summary?: string;
          key_id?: string;
          key_name?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          event_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracked_events_key_id_fkey";
            columns: ["key_id"];
            isOneToOne: false;
            referencedRelation: "tracking_keys";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_key_stats: {
        Args: {
          p_key_id: string;
          p_minutes: number;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Application Types ──────────────────────────────────────────────

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TrackingKey {
  id: string;
  user_id: string | null;
  name: string;
  search_key: string;
  color: string;
  category_id: string | null;
  calendar_id: string | null;
  total_minutes: number;
  event_count: number;
  budget_hours_weekly: number | null;
  created_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  key_id: string;
  name: string;
  search_term: string;
  total_minutes: number;
  event_count: number;
  created_at: string;
}

export interface TrackedEvent {
  id: string;
  user_id: string | null;
  summary: string;
  key_id: string;
  key_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  event_date: string;
  created_at: string;
}

export interface DashboardStats {
  totalHours: number;
  totalEvents: number;
  activeKeys: number;
  thisWeekHours: number;
  lastWeekHours: number;
}

export interface WeeklyData {
  week: string;
  hours: number;
}

export interface HoursPerKey {
  name: string;
  hours: number;
  color: string;
}
