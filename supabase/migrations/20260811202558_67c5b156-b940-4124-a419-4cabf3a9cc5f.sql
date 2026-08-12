DROP FUNCTION IF EXISTS public.consume_api_quota(text,text,integer);

CREATE OR REPLACE FUNCTION public.consume_api_quota(p_user_id uuid, p_provider text, p_mode text, p_hourly_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_hourly_limit IS NULL OR p_hourly_limit < 1 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  SELECT count(*)::integer INTO used FROM public.api_usage_events
    WHERE user_id = p_user_id AND provider = p_provider AND created_at >= now() - interval '1 hour';
  IF used >= p_hourly_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded for %: % requests/hour', p_provider, p_hourly_limit;
  END IF;
  INSERT INTO public.api_usage_events(user_id, provider, mode) VALUES(p_user_id, p_provider, p_mode);
  RETURN used + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_quota(uuid,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_api_quota(uuid,text,text,integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(uuid,text,text,integer) TO service_role;