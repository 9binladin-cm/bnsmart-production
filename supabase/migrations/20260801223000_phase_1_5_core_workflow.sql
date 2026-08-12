-- Day Neramit phases 1-5: core workflow, booking/calendar, CRM,
-- site survey and quotation linkage.

-- Keep jobs.status consistent even when an older deployment created it as text.
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status';

  IF current_type = 'text' THEN
    UPDATE public.jobs
    SET status = CASE status
      WHEN 'assessment' THEN 'draft'
      WHEN 'pending' THEN 'draft'
      WHEN 'active' THEN 'in_progress'
      WHEN 'done' THEN 'completed'
      ELSE status
    END
    WHERE status IN ('assessment', 'pending', 'active', 'done');

    UPDATE public.jobs
    SET status = 'draft'
    WHERE status IS NULL OR status NOT IN (
      'draft', 'assessed', 'quoted', 'in_progress', 'delivered', 'completed', 'cancelled'
    );

    ALTER TABLE public.jobs
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.job_status USING status::public.job_status,
      ALTER COLUMN status SET DEFAULT 'draft'::public.job_status;
  END IF;
END $$;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.site_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','in_progress','completed','cancelled')),
  scheduled_at timestamptz,
  address text,
  latitude double precision,
  longitude double precision,
  issue_summary text,
  site_conditions text,
  recommendations text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  videos text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_surveys TO authenticated;
GRANT ALL ON public.site_surveys TO service_role;
ALTER TABLE public.site_surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own site surveys" ON public.site_surveys;
CREATE POLICY "own site surveys" ON public.site_surveys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS survey_id uuid REFERENCES public.site_surveys(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS survey_id uuid REFERENCES public.site_surveys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_user_starts_at ON public.bookings(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_name ON public.customers(user_id, name);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_user_created ON public.site_surveys(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_surveys_booking_id ON public.site_surveys(booking_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_customer_id ON public.site_surveys(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON public.documents(user_id, doc_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_set_updated_at') THEN
    CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_set_updated_at') THEN
    CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'jobs_set_updated_at') THEN
    CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'documents_set_updated_at') THEN
    CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON public.documents
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'site_surveys_set_updated_at') THEN
    CREATE TRIGGER site_surveys_set_updated_at BEFORE UPDATE ON public.site_surveys
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
