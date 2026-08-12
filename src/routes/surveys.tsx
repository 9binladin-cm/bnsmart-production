import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { compressImage } from "@/lib/image-compress";
import { formatThaiDateTime, localInputToIso, toLocalInputValue } from "@/lib/date-time";

export const Route = createFileRoute("/surveys")({
  ssr: false,
  validateSearch: z.object({
    bookingId: z.string().optional(),
    customerId: z.string().optional(),
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: SurveysPage,
});

type ChecklistItem = { id: string; label: string; checked: boolean };
type Survey = Tables<"site_surveys"> & {
  customers?: { name: string } | null;
  bookings?: { title: string; starts_at: string } | null;
  jobs?: { id: string; title: string; status: string } | null;
};
type Customer = Pick<Tables<"customers">, "id" | "name" | "address" | "latitude" | "longitude">;
type Booking = Pick<Tables<"bookings">, "id" | "title" | "customer_id" | "location" | "starts_at">;

type SurveyForm = {
  id?: string;
  booking_id: string;
  customer_id: string;
  job_id: string;
  title: string;
  status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_at: string;
  address: string;
  latitude: string;
  longitude: string;
  issue_summary: string;
  site_conditions: string;
  recommendations: string;
  checklist: ChecklistItem[];
  photos: string[];
};

const defaultChecklist = (): ChecklistItem[] => [
  { id: crypto.randomUUID(), label: "ยืนยันตำแหน่งและขอบเขตหน้างาน", checked: false },
  { id: crypto.randomUUID(), label: "ตรวจแหล่งจ่ายไฟ / น้ำ / จุดตัดระบบ", checked: false },
  { id: crypto.randomUUID(), label: "ถ่ายภาพภาพรวมและจุดเสียหาย", checked: false },
  { id: crypto.randomUUID(), label: "บันทึกข้อจำกัดด้านพื้นที่และความปลอดภัย", checked: false },
];

function emptySurvey(): SurveyForm {
  return {
    booking_id: "",
    customer_id: "",
    job_id: "",
    title: "",
    status: "draft",
    scheduled_at: "",
    address: "",
    latitude: "",
    longitude: "",
    issue_summary: "",
    site_conditions: "",
    recommendations: "",
    checklist: defaultChecklist(),
    photos: [],
  };
}

function parseChecklist(value: Json): ChecklistItem[] {
  if (!Array.isArray(value)) return defaultChecklist();
  return value
    .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      label: typeof item.label === "string" ? item.label : "รายการตรวจสอบ",
      checked: item.checked === true,
    }));
}

function toForm(survey: Survey): SurveyForm {
  return {
    id: survey.id,
    booking_id: survey.booking_id ?? "",
    customer_id: survey.customer_id ?? "",
    job_id: survey.job_id ?? "",
    title: survey.title,
    status: survey.status as SurveyForm["status"],
    scheduled_at: toLocalInputValue(survey.scheduled_at),
    address: survey.address ?? "",
    latitude: survey.latitude == null ? "" : String(survey.latitude),
    longitude: survey.longitude == null ? "" : String(survey.longitude),
    issue_summary: survey.issue_summary ?? "",
    site_conditions: survey.site_conditions ?? "",
    recommendations: survey.recommendations ?? "",
    checklist: parseChecklist(survey.checklist),
    photos: survey.photos ?? [],
  };
}

function SurveysPage() {
  const search = Route.useSearch();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editing, setEditing] = useState<SurveyForm | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [surveyResult, customerResult, bookingResult] = await Promise.all([
      supabase.from("site_surveys").select("*, customers(name), bookings(title, starts_at), jobs(id,title,status)").order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name,address,latitude,longitude").order("name"),
      supabase.from("bookings").select("id,title,customer_id,location,starts_at").eq("kind", "assessment").order("starts_at", { ascending: false }),
    ]);
    if (surveyResult.error) toast.error(`โหลดข้อมูลสำรวจไม่สำเร็จ: ${surveyResult.error.message}`);
    setSurveys((surveyResult.data ?? []) as Survey[]);
    setCustomers(customerResult.data ?? []);
    setBookings(bookingResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.bookingId && !search.customerId) return;
    const booking = bookings.find((item) => item.id === search.bookingId);
    const customerId = search.customerId ?? booking?.customer_id ?? "";
    const customer = customers.find((item) => item.id === customerId);
    const form = emptySurvey();
    setEditing({
      ...form,
      booking_id: booking?.id ?? "",
      customer_id: customerId,
      title: booking?.title ? `สำรวจ: ${booking.title}` : "",
      scheduled_at: booking ? toLocalInputValue(booking.starts_at) : "",
      address: booking?.location || customer?.address || "",
      latitude: customer?.latitude == null ? "" : String(customer.latitude),
      longitude: customer?.longitude == null ? "" : String(customer.longitude),
      status: booking ? "scheduled" : "draft",
    });
  }, [search.bookingId, search.customerId, bookings, customers]);

  const stats = useMemo(() => ({
    total: surveys.length,
    active: surveys.filter((item) => ["scheduled", "in_progress"].includes(item.status)).length,
    completed: surveys.filter((item) => item.status === "completed").length,
  }), [surveys]);

  async function createJob(survey: Survey) {
    if (survey.job_id) return;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ไม่พบผู้ใช้งาน");
      const { data: job, error } = await supabase.from("jobs").insert({
        user_id: auth.user.id,
        customer_id: survey.customer_id,
        booking_id: survey.booking_id,
        survey_id: survey.id,
        title: survey.title,
        status: "assessed",
        notes: [survey.issue_summary, survey.site_conditions, survey.recommendations].filter(Boolean).join("\n\n"),
        checkin_lat: survey.latitude,
        checkin_lng: survey.longitude,
      }).select("id,title,status").single();
      if (error) throw error;
      const { error: updateError } = await supabase.from("site_surveys").update({ job_id: job.id, status: "completed" }).eq("id", survey.id);
      if (updateError) throw updateError;
      toast.success("สร้าง JOB จากผลสำรวจแล้ว");
      load();
    } catch (error: any) {
      toast.error(error?.message ?? "สร้าง JOB ไม่สำเร็จ");
    }
  }

  return (
    <PageShell
      title="Site Survey"
      subtitle="เก็บข้อมูลหน้างานจริงก่อนสร้าง JOB และใบเสนอราคา โดยไม่ย้ายต้นทุนวัสดุ/แรงงานมาไว้ใน Survey"
      actions={<button onClick={() => setEditing(emptySurvey())} className="btn-gold !min-h-10 !px-3"><Plus size={16} /><span className="hidden sm:inline">สร้าง Survey</span></button>}
    >
      <section className="metric-grid">
        <div className="metric-card"><div className="metric-label"><ClipboardCheck size={17} className="text-gold" />ทั้งหมด</div><div className="metric-value">{stats.total}</div><div className="metric-note">รายการสำรวจ</div></div>
        <div className="metric-card"><div className="metric-label"><MapPin size={17} className="text-gold" />กำลังดำเนินการ</div><div className="metric-value">{stats.active}</div><div className="metric-note">นัดหมาย / หน้างาน</div></div>
        <div className="metric-card"><div className="metric-label"><CheckCircle2 size={17} className="text-gold" />สำรวจเสร็จ</div><div className="metric-value">{stats.completed}</div><div className="metric-note">พร้อมสร้าง JOB</div></div>
      </section>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {surveys.map((survey) => (
          <article key={survey.id} className="card-luxe p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-gold-soft">{survey.title}</h2>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{survey.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{survey.customers?.name ?? "ไม่ระบุลูกค้า"}</p>
                {survey.scheduled_at && <p className="mt-1 text-xs text-muted-foreground">{formatThaiDateTime(survey.scheduled_at)}</p>}
              </div>
              <button className="icon-button !h-9 !w-9" onClick={() => setEditing(toForm(survey))}><Pencil size={15} /></button>
            </div>

            <p className="mt-4 line-clamp-3 text-xs leading-6 text-muted-foreground">{survey.issue_summary || "ยังไม่ได้บันทึกอาการหรือปัญหาที่พบ"}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="rounded-full border border-border px-2 py-1">Checklist {parseChecklist(survey.checklist).filter((item) => item.checked).length}/{parseChecklist(survey.checklist).length}</span>
              <span className="rounded-full border border-border px-2 py-1">รูป {survey.photos?.length ?? 0}</span>
              {survey.latitude != null && survey.longitude != null && <span className="rounded-full border border-border px-2 py-1">มี GPS</span>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {!survey.job_id ? (
                <button onClick={() => createJob(survey)} className="rounded-xl border border-gold/35 py-2 text-xs text-gold"><BriefcaseBusiness size={14} className="mr-1 inline" />สร้าง JOB</button>
              ) : (
                <Link to="/jobs/$jobId" params={{ jobId: survey.job_id }} className="rounded-xl border border-border py-2 text-center text-xs hover:border-gold"><BriefcaseBusiness size={14} className="mr-1 inline" />เปิด JOB</Link>
              )}
              {survey.job_id ? (
                <Link to="/documents/new" search={{ jobId: survey.job_id, type: "quotation" }} className="rounded-xl border border-border py-2 text-center text-xs hover:border-gold"><FileText size={14} className="mr-1 inline" />ทำใบเสนอราคา</Link>
              ) : (
                <button disabled className="rounded-xl border border-border py-2 text-xs opacity-40"><FileText size={14} className="mr-1 inline" />ใบเสนอราคา</button>
              )}
              <button onClick={() => setEditing(toForm(survey))} className="col-span-2 rounded-xl border border-border py-2 text-xs hover:border-gold sm:col-span-1">ดู / แก้ไข</button>
            </div>
          </article>
        ))}
      </div>

      {!loading && surveys.length === 0 && (
        <div className="card-luxe empty-state mt-4">
          <ClipboardCheck className="mx-auto text-gold" size={36} />
          <p className="mt-3 font-medium">ยังไม่มีข้อมูลสำรวจหน้างาน</p>
          <p className="mt-1 text-xs text-muted-foreground">สร้างจาก Booking หรือเพิ่ม Survey ใหม่</p>
        </div>
      )}

      {editing && <SurveyDialog value={editing} customers={customers} bookings={bookings} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </PageShell>
  );
}

function SurveyDialog({ value, customers, bookings, onClose, onSaved }: {
  value: SurveyForm;
  customers: Customer[];
  bookings: Booking[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);

  function update<K extends keyof SurveyForm>(key: K, value: SurveyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyBooking(id: string) {
    const booking = bookings.find((item) => item.id === id);
    const customer = customers.find((item) => item.id === booking?.customer_id);
    setForm((current) => ({
      ...current,
      booking_id: id,
      customer_id: booking?.customer_id ?? current.customer_id,
      title: current.title || (booking ? `สำรวจ: ${booking.title}` : ""),
      scheduled_at: booking ? toLocalInputValue(booking.starts_at) : current.scheduled_at,
      address: current.address || booking?.location || customer?.address || "",
      status: booking ? "scheduled" : current.status,
    }));
  }

  function applyCustomer(id: string) {
    const customer = customers.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      customer_id: id,
      address: current.address || customer?.address || "",
      latitude: current.latitude || (customer?.latitude == null ? "" : String(customer.latitude)),
      longitude: current.longitude || (customer?.longitude == null ? "" : String(customer.longitude)),
    }));
  }

  function captureLocation() {
    if (!navigator.geolocation) return toast.error("อุปกรณ์นี้ไม่รองรับ GPS");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", String(position.coords.latitude));
        update("longitude", String(position.coords.longitude));
        setLocating(false);
        toast.success(`บันทึก GPS แล้ว (±${Math.round(position.coords.accuracy)} ม.)`);
      },
      (error) => { setLocating(false); toast.error(`อ่าน GPS ไม่สำเร็จ: ${error.message}`); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ไม่พบผู้ใช้งาน");
      const optimized = await compressImage(file);
      const type = optimized.type || "image/jpeg";
      const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const path = `${auth.user.id}/site-surveys/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("dayneramit").upload(path, optimized, { contentType: type, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed, error: signedError } = await supabase.storage.from("dayneramit").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error("สร้างลิงก์รูปไม่สำเร็จ");
      update("photos", [...form.photos, signed.signedUrl]);
      toast.success("อัปโหลดรูปแล้ว");
    } catch (error: any) {
      toast.error(error?.message ?? "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("กรุณาระบุชื่อการสำรวจ");
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ไม่พบผู้ใช้งาน");
      const payload = {
        user_id: auth.user.id,
        booking_id: form.booking_id || null,
        customer_id: form.customer_id || null,
        job_id: form.job_id || null,
        title: form.title.trim(),
        status: form.status,
        scheduled_at: form.scheduled_at ? localInputToIso(form.scheduled_at) : null,
        address: form.address.trim() || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        issue_summary: form.issue_summary.trim() || null,
        site_conditions: form.site_conditions.trim() || null,
        recommendations: form.recommendations.trim() || null,
        checklist: form.checklist as unknown as Json,
        photos: form.photos,
      };
      const result = form.id
        ? await supabase.from("site_surveys").update(payload).eq("id", form.id)
        : await supabase.from("site_surveys").insert(payload);
      if (result.error) throw result.error;
      toast.success(form.id ? "อัปเดต Survey แล้ว" : "บันทึก Survey แล้ว");
      onSaved();
    } catch (error: any) {
      toast.error(error?.message ?? "บันทึก Survey ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card-luxe max-h-[96vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-gold">{form.id ? "แก้ไข Site Survey" : "สร้าง Site Survey"}</h2><p className="text-xs text-muted-foreground">บันทึกข้อเท็จจริงหน้างาน รูปภาพ GPS และ Checklist</p></div>
          <button type="button" onClick={onClose} className="icon-button !h-9 !w-9"><X size={15} /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label><span className="form-label">Booking ต้นทาง</span><select className="form-control" value={form.booking_id} onChange={(event) => applyBooking(event.target.value)}><option value="">ไม่ผูก Booking</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.title}</option>)}</select></label>
          <label><span className="form-label">ลูกค้า</span><select className="form-control" value={form.customer_id} onChange={(event) => applyCustomer(event.target.value)}><option value="">ไม่ระบุลูกค้า</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="form-label">ชื่อการสำรวจ *</span><input className="form-control" value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label><span className="form-label">สถานะ</span><select className="form-control" value={form.status} onChange={(event) => update("status", event.target.value as SurveyForm["status"])}><option value="draft">ฉบับร่าง</option><option value="scheduled">นัดหมายแล้ว</option><option value="in_progress">กำลังสำรวจ</option><option value="completed">สำรวจเสร็จ</option><option value="cancelled">ยกเลิก</option></select></label>
          <label><span className="form-label">วันเวลาสำรวจ</span><input className="form-control" type="datetime-local" value={form.scheduled_at} onChange={(event) => update("scheduled_at", event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="form-label">ที่อยู่หน้างาน</span><textarea className="form-control min-h-20 resize-y" value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
          <label><span className="form-label">Latitude</span><input className="form-control" inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} /></label>
          <label><span className="form-label">Longitude</span><input className="form-control" inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></label>
          <button type="button" onClick={captureLocation} disabled={locating} className="rounded-xl border border-border py-2.5 text-xs hover:border-gold sm:col-span-2"><MapPin size={15} className="mr-1 inline text-gold" />{locating ? "กำลังอ่าน GPS…" : "บันทึกพิกัดปัจจุบัน"}</button>
          <label className="sm:col-span-2"><span className="form-label">อาการ / ปัญหาที่พบ</span><textarea className="form-control min-h-28 resize-y" value={form.issue_summary} onChange={(event) => update("issue_summary", event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="form-label">สภาพหน้างานและข้อจำกัด</span><textarea className="form-control min-h-24 resize-y" value={form.site_conditions} onChange={(event) => update("site_conditions", event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="form-label">แนวทางเสนอแนะ</span><textarea className="form-control min-h-24 resize-y" value={form.recommendations} onChange={(event) => update("recommendations", event.target.value)} /></label>
        </div>

        <section className="mt-4 rounded-2xl border border-border p-4">
          <div className="panel-title"><h3>Checklist หน้างาน</h3><button type="button" onClick={() => update("checklist", [...form.checklist, { id: crypto.randomUUID(), label: "", checked: false }])} className="rounded-lg border border-border px-2 py-1 text-xs hover:border-gold"><Plus size={13} className="mr-1 inline" />เพิ่ม</button></div>
          <div className="mt-3 space-y-2">
            {form.checklist.map((item) => (
              <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <input type="checkbox" checked={item.checked} onChange={(event) => update("checklist", form.checklist.map((current) => current.id === item.id ? { ...current, checked: event.target.checked } : current))} />
                <input className="form-control !min-h-10" value={item.label} onChange={(event) => update("checklist", form.checklist.map((current) => current.id === item.id ? { ...current, label: event.target.value } : current))} />
                <button type="button" className="icon-button !h-9 !w-9 text-destructive" onClick={() => update("checklist", form.checklist.filter((current) => current.id !== item.id))}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-gold">รูปภาพหน้างาน</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {form.photos.map((url) => <div key={url} className="relative"><img src={url} alt="ภาพสำรวจหน้างาน" className="h-24 w-24 rounded-xl object-cover" /><button type="button" onClick={() => update("photos", form.photos.filter((item) => item !== url))} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white"><X size={12} /></button></div>)}
            <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground hover:border-gold hover:text-gold"><Camera size={23} /><span>{uploading ? "กำลังอัปโหลด" : "ถ่าย / เลือกรูป"}</span><input hidden type="file" accept="image/*" capture="environment" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = ""; }} /></label>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-border py-2.5 text-sm">ยกเลิก</button>
          <button disabled={saving || uploading} className="btn-gold">{saving ? "กำลังบันทึก…" : "บันทึก Survey"}</button>
        </div>
      </form>
    </div>
  );
}
