-- Migration: Create user context table
-- Stores personal context for AI personalization

CREATE TABLE public.user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Personal Context
  occupation TEXT,
  interests TEXT[], -- Array of interests
  expertise_areas TEXT[], -- What they know well
  goals TEXT, -- What they want to achieve

  -- Location Context
  country TEXT DEFAULT 'Rwanda',
  city TEXT,
  timezone TEXT DEFAULT 'Africa/Kigali',

  -- Custom Instructions
  custom_instructions TEXT, -- "Always respond in Kinyarwanda first"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own context"
  ON public.user_context FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_context_updated_at
  BEFORE UPDATE ON public.user_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create user context when preferences are created
CREATE OR REPLACE FUNCTION public.handle_new_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_context (user_id)
  VALUES (NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create context on preferences creation
CREATE TRIGGER on_preferences_created
  AFTER INSERT ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_preferences();
