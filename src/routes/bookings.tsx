import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { th } from "date-fns/locale";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  createGoogleCalendarUrl,
  dateKey,
  formatThaiDateTime,
  localInputToIso,
  openSystemCalendar,
  toLocalInputValue,
} from "@/lib/date-time";
import { ensureNotificationPermission } from "@/lib/reminders";

export const Route = createFileRoute("/bookings")({
  ssr: false,
  validateSearch: z.object({ customerId: z.string().optional() }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: BookingsPage,
});

type Booking = Tables<"bookings"> & { customers?: { name: string } | null };
type Customer = Pick<Tables<"customers">, "id" | "name" | "address">;

type BookingForm = {
  id?: string;
  title: string;
  kind: "assessment" | "work";
  customer_id: string;
  location: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  reminder_minutes: string;
};

function emptyBooking(date = new Date()): BookingForm {
  const start = new Date(date);
  const now = new Date();
  const isToday = dateKey(start) === dateKey(now);
  const suggestedHour = isToday ? Math.min(21, Math.max(8, now.getHours() + 1)) : 9;
  start.setHours(suggestedHour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    kind: "assessment",
    customer_id: "",
    location: "",
    starts_at: toLocalInputValue(start),
    ends_at: toLocalInputValue(end),
    notes: "",
    reminder_minutes: "60",
  };
}

function toForm(booking: Booking): BookingForm {
  return {
    id: booking.id,
    title: booking.title,
    kind: booking.kind === "assessment" ? "assessment" : "work",
    customer_id: booking.customer_id ?? "",
    location: booking.location ?? "",
    starts_at: toLocalInputValue(booking.starts_at),
    ends_at: toLocalInputValue(booking.ends_at ?? new Date(new Date(booking.starts_at).getTime() + 60 * 60 * 1000)),
    notes: booking.notes ?? "",
    reminder_minutes: String(booking.reminder_minutes ?? 60),
  };
}

function BookingsPage() {
  const search = Route.useSearch();
  const [items, setItems] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editing, setEditing] = useState<BookingForm | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: bookings, error }, { data: customerRows }] = await Promise.all([
      supabase.from("bookings").select("*, customers(name)").order("starts_at", { ascending: true }),
      supabase.from("customers").select("id,name,address").order("name"),
    ]);
    if (error) toast.error(`โหลด Booking ไม่สำเร็จ: ${error.message}`);
    setItems((bookings ?? []) as Booking[]);
    setCustomers(customerRows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("bookings-realtime-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!search.customerId || customers.length === 0) return;
    const customer = customers.find((item) => item.id === search.customerId);
    if (!customer) return;
    const form = emptyBooking(selectedDate);
    setEditing({
      ...form,
      customer_id: customer.id,
      location: customer.address ?? "",
    });
  }, [search.customerId, customers]);

  const dayItems = useMemo(
    () => items.filter((item) => dateKey(item.starts_at) === dateKey(selectedDate)),
    [items, selectedDate],
  );
  const bookingDays = useMemo(() => items.filter((item) => item.status !== "cancelled").map((item) => new Date(item.starts_at)), [items]);

  async function setStatus(id: string, status: "acknowledged" | "done" | "cancelled") {
    const patch = status === "acknowledged"
      ? { status, acknowledged_at: new Date().toISOString() }
      : { status };
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("อัปเดตสถานะแล้ว");
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("ยืนยันการลบ Booking นี้?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ลบ Booking แล้ว");
    load();
  }

  function openNewForSelectedDate() {
    setEditing(emptyBooking(selectedDate));
  }

  return (
    <PageShell
      title="Booking & Calendar"
      subtitle="เชื่อมวันนัดหมาย ลูกค้า สำรวจหน้างาน และปฏิทินบนมือถือ"
      actions={<button onClick={openNewForSelectedDate} className="btn-gold !min-h-10 !px-3"><Plus size={16} /><span className="hidden sm:inline">เพิ่ม Booking</span></button>}
    >
      <div className="grid gap-4 xl:grid-cols-[25rem_minmax(0,1fr)]">
        <section className="card-luxe p-3 sm:p-4">
          <Calendar
            mode="single"
            locale={th}
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{ booked: bookingDays }}
            modifiersClassNames={{ booked: "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-gold" }}
            className="mx-auto w-full bg-transparent [--cell-size:2.8rem] sm:[--cell-size:3rem]"
          />
          <button onClick={openNewForSelectedDate} className="btn-gold mt-3 w-full"><CalendarPlus size={16} />เพิ่มนัดหมายวันที่เลือก</button>
        </section>

        <section className="card-luxe p-4 sm:p-5">
          <div className="panel-title">
            <div>
              <h2>{selectedDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{dayItems.length} นัดหมาย</p>
            </div>
            <CalendarClock className="text-gold" size={22} />
          </div>

          <div className="mt-4 space-y-3">
            {dayItems.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onEdit={() => setEditing(toForm(booking))}
                onDelete={() => remove(booking.id)}
                onStatus={(status) => setStatus(booking.id, status)}
              />
            ))}
            {!loading && dayItems.length === 0 && (
              <div className="empty-state rounded-xl border border-dashed border-border">
                <CalendarClock className="mx-auto text-gold" size={34} />
                <p className="mt-3 font-medium">วันนี้ยังไม่มีนัดหมาย</p>
                <p className="mt-1 text-xs text-muted-foreground">แตะปุ่มเพิ่ม Booking เพื่อสร้างนัดหมาย</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {editing && (
        <BookingDialog
          value={editing}
          bookings={items}
          customers={customers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </PageShell>
  );
}

function BookingCard({ booking, onEdit, onDelete, onStatus }: {
  booking: Booking;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: "acknowledged" | "done" | "cancelled") => void;
}) {
  const calendarEvent = {
    id: booking.id,
    title: booking.title,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    location: booking.location,
    notes: booking.notes,
  };
  const statusLabel: Record<string, string> = {
    pending: "รอยืนยัน",
    acknowledged: "รับทราบแล้ว",
    done: "เสร็จแล้ว",
    cancelled: "ยกเลิก",
  };

  return (
    <article className="rounded-2xl border border-border/80 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gold-soft">{booking.title}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{statusLabel[booking.status] ?? booking.status}</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14} className="text-gold" />{formatThaiDateTime(booking.starts_at)}{booking.ends_at ? ` – ${new Date(booking.ends_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><UserRound size={14} className="text-gold" />{booking.customers?.name ?? "ไม่ระบุลูกค้า"}</p>
          <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground"><MapPin size={14} className="mt-0.5 shrink-0 text-gold" /><span>{booking.location || "ไม่ระบุสถานที่"}</span></p>
        </div>
        <button onClick={onEdit} className="icon-button !h-9 !w-9" aria-label="แก้ไข Booking"><Pencil size={15} /></button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a href={createGoogleCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer" className="rounded-xl border border-border py-2 text-center text-[11px] hover:border-gold"><ExternalLink size={13} className="mr-1 inline" />Google Calendar</a>
        <button onClick={() => void openSystemCalendar(calendarEvent)} className="rounded-xl border border-border py-2 text-[11px] hover:border-gold"><CalendarPlus size={13} className="mr-1 inline" />Apple / Samsung</button>
        {booking.kind === "assessment" ? (
          <Link to="/surveys" search={{ bookingId: booking.id, customerId: booking.customer_id ?? undefined }} className="rounded-xl border border-border py-2 text-center text-[11px] hover:border-gold"><ClipboardCheckIcon />สร้าง Survey</Link>
        ) : (
          <Link to="/jobs" className="rounded-xl border border-border py-2 text-center text-[11px] hover:border-gold">เปิด JOB</Link>
        )}
        <button onClick={onDelete} className="rounded-xl border border-border py-2 text-[11px] text-destructive hover:border-destructive"><Trash2 size={13} className="mr-1 inline" />ลบ</button>
      </div>

      {booking.status !== "done" && booking.status !== "cancelled" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {booking.status === "pending" && <button onClick={() => onStatus("acknowledged")} className="rounded-xl border border-gold/30 py-2 text-xs text-gold">รับทราบนัดหมาย</button>}
          <button onClick={() => onStatus("done")} className="rounded-xl border border-emerald-500/30 py-2 text-xs text-emerald-300"><CheckCircle2 size={14} className="mr-1 inline" />เสร็จแล้ว</button>
        </div>
      )}
    </article>
  );
}

function ClipboardCheckIcon() {
  return <span aria-hidden="true" className="mr-1">▣</span>;
}

function BookingDialog({ value, bookings, customers, onClose, onSaved }: {
  value: BookingForm;
  bookings: Booking[];
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({
      ...current,
      customer_id: customerId,
      location: current.location || customer?.address || "",
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("กรุณาระบุชื่อ Booking");
    const startsAt = localInputToIso(form.starts_at);
    const endsAt = localInputToIso(form.ends_at);
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");

    const conflict = bookings.find((item) =>
      item.id !== form.id &&
      item.status !== "cancelled" &&
      new Date(item.starts_at) < new Date(endsAt) &&
      new Date(item.ends_at ?? new Date(new Date(item.starts_at).getTime() + 60 * 60 * 1000)) > new Date(startsAt),
    );
    if (conflict && !window.confirm(`เวลานี้ชนกับ “${conflict.title}”\nต้องการบันทึกต่อหรือไม่?`)) return;

    setSaving(true);
    try {
      if (Number(form.reminder_minutes) > 0) {
        await ensureNotificationPermission();
      }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ไม่พบผู้ใช้งาน");
      const payload = {
        user_id: auth.user.id,
        title: form.title.trim(),
        kind: form.kind,
        customer_id: form.customer_id || null,
        location: form.location.trim() || null,
        starts_at: startsAt,
        ends_at: endsAt,
        notes: form.notes.trim() || null,
        reminder_minutes: Number(form.reminder_minutes) || 0,
      };
      let bookingId = form.id;
      if (form.id) {
        const { error } = await supabase.from("bookings").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bookings").insert(payload).select("id").single();
        if (error) throw error;
        bookingId = data.id;
      }

      await supabase.from("reminders").delete().eq("booking_id", bookingId!);
      const reminderMinutes = Number(form.reminder_minutes);
      if (reminderMinutes > 0) {
        const nextFireAt = new Date(new Date(startsAt).getTime() - reminderMinutes * 60 * 1000);
        if (nextFireAt > new Date()) {
          const { error } = await supabase.from("reminders").insert({
            user_id: auth.user.id,
            booking_id: bookingId,
            title: `นัดหมาย: ${form.title.trim()}`,
            next_fire_at: nextFireAt.toISOString(),
            interval_minutes: 60,
          });
          if (error) console.warn("create reminder failed", error);
        }
      }
      toast.success(form.id ? "อัปเดต Booking แล้ว" : "สร้าง Booking แล้ว");
      onSaved();
    } catch (error: any) {
      toast.error(error?.message ?? "บันทึก Booking ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card-luxe max-h-[94vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gold">{form.id ? "แก้ไข Booking" : "สร้าง Booking"}</h2>
            <p className="text-xs text-muted-foreground">รองรับ Google, Apple และ Samsung Calendar</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button !h-9 !w-9"><X size={15} /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="form-label">ชื่อการนัดหมาย *</span><input className="form-control" value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label><span className="form-label">ประเภท</span><select className="form-control" value={form.kind} onChange={(event) => update("kind", event.target.value as BookingForm["kind"])}><option value="assessment">ประเมิน / สำรวจหน้างาน</option><option value="work">ปฏิบัติงาน</option></select></label>
          <label><span className="form-label">ลูกค้า</span><select className="form-control" value={form.customer_id} onChange={(event) => applyCustomer(event.target.value)}><option value="">ไม่ระบุลูกค้า</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label><span className="form-label">เริ่ม</span><input className="form-control" required type="datetime-local" value={form.starts_at} onChange={(event) => update("starts_at", event.target.value)} /></label>
          <label><span className="form-label">สิ้นสุด</span><input className="form-control" required type="datetime-local" value={form.ends_at} onChange={(event) => update("ends_at", event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="form-label">สถานที่</span><input className="form-control" value={form.location} onChange={(event) => update("location", event.target.value)} /></label>
          <label><span className="form-label">แจ้งเตือนล่วงหน้า</span><select className="form-control" value={form.reminder_minutes} onChange={(event) => update("reminder_minutes", event.target.value)}><option value="0">ไม่แจ้งเตือน</option><option value="30">30 นาที</option><option value="60">1 ชั่วโมง</option><option value="180">3 ชั่วโมง</option><option value="1440">1 วัน</option></select></label>
          <label className="sm:col-span-2"><span className="form-label">หมายเหตุ</span><textarea className="form-control min-h-24 resize-y" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-border py-2.5 text-sm">ยกเลิก</button>
          <button disabled={saving} className="btn-gold">{saving ? "กำลังบันทึก…" : "บันทึก Booking"}</button>
        </div>
      </form>
    </div>
  );
}
