ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS selling_price numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS public.job_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  model text,
  part_number text,
  quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  actual_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK (actual_quantity >= 0),
  unit text NOT NULL DEFAULT 'ชิ้น',
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  source_name text,
  source_url text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','serper','brightdata','local_store')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ordered','received','used','returned','cancelled')),
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_name text NOT NULL,
  role text,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz,
  ended_at timestamptz,
  regular_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
  overtime_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  rate_type text NOT NULL DEFAULT 'daily' CHECK (rate_type IN ('hourly','daily','fixed')),
  rate numeric(14,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  overtime_rate numeric(14,2) NOT NULL DEFAULT 0 CHECK (overtime_rate >= 0),
  travel_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (travel_cost >= 0),
  meal_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (meal_cost >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'transfer' CHECK (method IN ('cash','transfer','promptpay','card','cheque','other')),
  reference_no text,
  slip_url text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','refunded','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warranty_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  serial_number text,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date NOT NULL,
  terms text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','expired','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_id uuid NOT NULL REFERENCES public.warranty_records(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  issue text NOT NULL,
  diagnosis text,
  resolution text,
  photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','inspecting','approved','rejected','resolved','cancelled')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  query text NOT NULL,
  mode text NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard','jom_yut')),
  location text NOT NULL DEFAULT 'อำเภอบางใหญ่ จังหวัดนนทบุรี',
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.engineering_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard','jom_yut')),
  title text NOT NULL,
  equipment_type text,
  manufacturer text,
  model text,
  serial_number text,
  manufacture_year integer,
  image_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  symptoms text,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'researching' CHECK (status IN ('researching','ready','needs_evidence','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_materials, public.job_labor_entries,
  public.job_expenses, public.payments, public.warranty_records, public.warranty_claims,
  public.material_searches, public.engineering_cases TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.job_materials, public.job_labor_entries, public.job_expenses,
  public.payments, public.warranty_records, public.warranty_claims,
  public.material_searches, public.engineering_cases, public.audit_logs TO service_role;

ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_materials','job_labor_entries','job_expenses','payments','warranty_records','warranty_claims','material_searches','engineering_cases']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'owner_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', 'owner_all_' || t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS audit_logs_owner_read ON public.audit_logs;
CREATE POLICY audit_logs_owner_read ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_materials_job_status ON public.job_materials(job_id, status);
CREATE INDEX IF NOT EXISTS idx_job_labor_job_date ON public.job_labor_entries(job_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_expenses_job_date ON public.job_expenses(job_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_paid ON public.payments(user_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_job ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_warranty_user_status ON public.warranty_records(user_id, status, ends_on);
CREATE INDEX IF NOT EXISTS idx_claims_warranty_status ON public.warranty_claims(warranty_id, status);
CREATE INDEX IF NOT EXISTS idx_material_search_user_created ON public.material_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engineering_case_user_created ON public.engineering_cases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON public.audit_logs(user_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_materials','job_labor_entries','job_expenses','payments','warranty_records','warranty_claims','engineering_cases']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_set_updated_at') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_set_updated_at', t);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.job_financials(p_job_id uuid)
RETURNS TABLE (
  material_cost numeric,
  labor_cost numeric,
  other_cost numeric,
  total_cost numeric,
  paid_amount numeric,
  selling_price numeric,
  gross_profit numeric,
  outstanding_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH m AS (
    SELECT COALESCE(SUM((CASE WHEN actual_quantity > 0 THEN actual_quantity ELSE quantity END) * unit_cost),0)::numeric AS v
    FROM public.job_materials WHERE job_id = p_job_id AND status <> 'cancelled'
  ), l AS (
    SELECT COALESCE(SUM(
      CASE rate_type
        WHEN 'hourly' THEN regular_hours * rate
        WHEN 'daily' THEN rate
        ELSE rate
      END + overtime_hours * overtime_rate + travel_cost + meal_cost
    ),0)::numeric AS v
    FROM public.job_labor_entries WHERE job_id = p_job_id
  ), e AS (
    SELECT COALESCE(SUM(amount),0)::numeric AS v FROM public.job_expenses WHERE job_id = p_job_id
  ), p AS (
    SELECT COALESCE(SUM(amount),0)::numeric AS v FROM public.payments WHERE job_id = p_job_id AND status = 'confirmed'
  ), j AS (
    SELECT COALESCE(selling_price,0)::numeric AS v FROM public.jobs WHERE id = p_job_id
  )
  SELECT m.v, l.v, e.v, (m.v+l.v+e.v), p.v, j.v, (j.v-(m.v+l.v+e.v)), GREATEST(j.v-p.v,0)
  FROM m,l,e,p,j;
$$;
GRANT EXECUTE ON FUNCTION public.job_financials(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.job_financial_summary
WITH (security_invoker = true) AS
SELECT
  j.id AS job_id,
  j.user_id,
  j.title,
  j.status,
  j.selling_price,
  COALESCE(m.material_cost,0)::numeric AS material_cost,
  COALESCE(l.labor_cost,0)::numeric AS labor_cost,
  COALESCE(e.other_cost,0)::numeric AS other_cost,
  (COALESCE(m.material_cost,0)+COALESCE(l.labor_cost,0)+COALESCE(e.other_cost,0))::numeric AS total_cost,
  COALESCE(p.paid_amount,0)::numeric AS paid_amount,
  (j.selling_price-(COALESCE(m.material_cost,0)+COALESCE(l.labor_cost,0)+COALESCE(e.other_cost,0)))::numeric AS gross_profit,
  GREATEST(j.selling_price-COALESCE(p.paid_amount,0),0)::numeric AS outstanding_amount
FROM public.jobs j
LEFT JOIN (
  SELECT job_id, SUM((CASE WHEN actual_quantity > 0 THEN actual_quantity ELSE quantity END)*unit_cost) material_cost
  FROM public.job_materials WHERE status <> 'cancelled' GROUP BY job_id
) m ON m.job_id=j.id
LEFT JOIN (
  SELECT job_id, SUM((CASE rate_type WHEN 'hourly' THEN regular_hours*rate ELSE rate END)+overtime_hours*overtime_rate+travel_cost+meal_cost) labor_cost
  FROM public.job_labor_entries GROUP BY job_id
) l ON l.job_id=j.id
LEFT JOIN (SELECT job_id, SUM(amount) other_cost FROM public.job_expenses GROUP BY job_id) e ON e.job_id=j.id
LEFT JOIN (SELECT job_id, SUM(amount) paid_amount FROM public.payments WHERE status='confirmed' GROUP BY job_id) p ON p.job_id=j.id;
GRANT SELECT ON public.job_financial_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  rid text;
  payload jsonb;
BEGIN
  uid := COALESCE((to_jsonb(NEW)->>'user_id')::uuid, (to_jsonb(OLD)->>'user_id')::uuid, auth.uid());
  rid := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id');
  payload := CASE TG_OP
    WHEN 'INSERT' THEN jsonb_build_object('new', to_jsonb(NEW) - 'slip_url' - 'receipt_url')
    WHEN 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD) - 'slip_url' - 'receipt_url', 'new', to_jsonb(NEW) - 'slip_url' - 'receipt_url')
    ELSE jsonb_build_object('old', to_jsonb(OLD) - 'slip_url' - 'receipt_url')
  END;
  INSERT INTO public.audit_logs(user_id, table_name, record_id, action, changed_fields)
  VALUES (uid, TG_TABLE_NAME, rid, TG_OP, payload);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.capture_audit_log() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['jobs','job_materials','job_labor_entries','job_expenses','payments','warranty_records','warranty_claims']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_audit') THEN
      EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log()', t || '_audit', t);
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.api_usage_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.api_usage_events TO authenticated;
GRANT ALL ON public.api_usage_events TO service_role;
DROP POLICY IF EXISTS api_usage_owner_read ON public.api_usage_events;
CREATE POLICY api_usage_owner_read ON public.api_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_provider_time ON public.api_usage_events(user_id, provider, created_at DESC);

CREATE OR REPLACE FUNCTION public.consume_api_quota(p_provider text, p_mode text, p_hourly_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  used integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT count(*)::integer INTO used FROM public.api_usage_events
    WHERE user_id = uid AND provider = p_provider AND created_at >= now() - interval '1 hour';
  IF used >= p_hourly_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded for %: % requests/hour', p_provider, p_hourly_limit;
  END IF;
  INSERT INTO public.api_usage_events(user_id, provider, mode) VALUES(uid, p_provider, p_mode);
  RETURN used + 1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_api_quota(text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(text,text,integer) TO authenticated;