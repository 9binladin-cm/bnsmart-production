import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export async function createReminder(input: {
  title: string;
  job_id?: string | null;
  booking_id?: string | null;
  next_fire_at?: Date;
  interval_minutes?: number;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  const next = input.next_fire_at ?? new Date(Date.now() + 60 * 60 * 1000);
  await supabase.from("reminders").insert({
    user_id: user.user.id,
    title: input.title,
    job_id: input.job_id ?? null,
    booking_id: input.booking_id ?? null,
    next_fire_at: next.toISOString(),
    interval_minutes: input.interval_minutes ?? 60,
  });
}

export async function stopRemindersForJob(job_id: string) {
  await supabase.from("reminders").update({ active: false }).eq("job_id", job_id);
}

let started = false;
export function startReminderPoller() {
  if (started || typeof window === "undefined") return;
  started = true;
  const tick = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const nowIso = new Date().toISOString();
      const { data: due } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true)
        .lte("next_fire_at", nowIso);
      for (const r of due ?? []) {
        toast(`⏰ ${r.title}`, { description: "ครบเวลาแจ้งเตือน" });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("DayNeramit — แจ้งเตือน", { body: r.title }); } catch {}
        }
        if (r.booking_id) {
          // Booking reminders are one-shot. Repeating them every hour after the
          // appointment would create duplicate notifications on mobile.
          await supabase.from("reminders").update({ active: false }).eq("id", r.id);
        } else {
          const next = new Date(
            Date.now() + (Number(r.interval_minutes ?? 60)) * 60 * 1000,
          ).toISOString();
          await supabase.from("reminders").update({ next_fire_at: next }).eq("id", r.id);
        }
      }
    } catch (e) {
      console.warn("reminder tick failed", e);
    }
  };
  tick();
  setInterval(tick, 60 * 1000);
}
