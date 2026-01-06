import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton client instance
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Types for database tables
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  preferred_language: 'en' | 'rw' | 'fr';
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  default_model: string;
  response_style: 'concise' | 'balanced' | 'detailed';
  temperature: number;
  theme: 'light' | 'dark' | 'system';
  font_size: 'small' | 'medium' | 'large';
  sidebar_collapsed: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  occupation: string | null;
  interests: string[] | null;
  expertise_areas: string[] | null;
  goals: string | null;
  country: string;
  city: string | null;
  timezone: string;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  fact: string;
  category: string;
  source_message_id: string | null;
  confidence: number;
  created_at: string;
  last_referenced_at: string | null;
}
