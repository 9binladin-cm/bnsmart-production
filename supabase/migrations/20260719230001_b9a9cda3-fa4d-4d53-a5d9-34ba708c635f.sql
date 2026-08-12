
-- Job status enum + column
DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('draft','assessed','quoted','in_progress','delivered','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status public.job_status NOT NULL DEFAULT 'draft';

-- Convert work_points.materials to jsonb (structured items)
ALTER TABLE public.work_points
  ALTER COLUMN materials TYPE jsonb USING
    CASE
      WHEN materials IS NULL OR materials = '' THEN '[]'::jsonb
      WHEN left(materials::text,1) = '[' THEN materials::jsonb
      ELSE to_jsonb(string_to_array(materials, E'\n'))
    END,
  ALTER COLUMN materials SET DEFAULT '[]'::jsonb;

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  next_fire_at timestamptz NOT NULL,
  interval_minutes int NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_owner_all" ON public.reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
