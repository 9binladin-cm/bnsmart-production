// Server-only quota enforcement. Runs with the service role so hourly limits
// cannot be tampered with from the client; the user id always comes from the
// verified bearer token in the server function context.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function consumeQuota(
  userId: string,
  provider: string,
  mode: string,
  hourlyLimit: number,
): Promise<void> {
  const { error } = await (supabaseAdmin as any).rpc("consume_api_quota", {
    p_user_id: userId,
    p_provider: provider,
    p_mode: mode,
    p_hourly_limit: hourlyLimit,
  });
  if (error) throw new Error(error.message);
}
