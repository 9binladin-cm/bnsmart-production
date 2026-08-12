import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";
import { MapPin, Camera, Plus, Trash2, Pencil, CheckCircle2, X, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { createReminder, ensureNotificationPermission } from "@/lib/reminders";

export const Route = createFileRoute("/assess")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Assess,
});

type MaterialItem = {
  id: string;
  name: string;
  purpose: string;
  status: "in_stock" | "buy";
  qty: string;
};

type WorkPoint = {
  id: string;
  title: string;
  description: string;
  approach: string;
  materials: MaterialItem[];
  quantity: number;
  unit: string;
  unit_price: number;
  photos: string[];
};

const emptyPoint = (): WorkPoint => ({
  id: crypto.randomUUID(),
  title: "", description: "", approach: "", materials: [],
  quantity: 1, unit: "งาน", unit_price: 0, photos: [],
});

const newMat = (): MaterialItem => ({
  id: crypto.randomUUID(), name: "", purpose: "", status: "in_stock", qty: "1",
});

function Assess() {
  const nav = useNavigate();
  const [step, setStep] = useState<"start" | "customer" | "points">("start");
  const [checkin, setCheckin] = useState<{ lat: number; lng: number; at: string } | null>(null);
  const [cust, setCust] = useState({ name: "", phone: "", line_id: "", email: "", address: "" });
  const [jobTitle, setJobTitle] = useState("");
  const [points, setPoints] = useState<WorkPoint[]>([]);
  const [editing, setEditing] = useState<WorkPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPrices, setShowPrices] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "point" | "material"; id: string; label: string; matPointId?: string } | null>(null);

  async function startCheckin() {
    if (!("geolocation" in navigator)) {
      toast.error("อุปกรณ์ไม่รองรับ GPS");
      setCheckin({ lat: 0, lng: 0, at: new Date().toISOString() });
      setStep("customer");
      return;
    }
    toast.loading("กำลังขอตำแหน่ง GPS…", { id: "gps" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.success("เช็คอินสำเร็จ", { id: "gps" });
        setCheckin({ lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date().toISOString() });
        setStep("customer");
      },
      (err) => {
        toast.error("ไม่สามารถอ่านตำแหน่งได้: " + err.message, { id: "gps" });
        setCheckin({ lat: 0, lng: 0, at: new Date().toISOString() });
        setStep("customer");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveAll() {
    if (!jobTitle.trim()) return toast.error("กรุณาระบุชื่องาน");
    if (!cust.name.trim()) return toast.error("กรุณาระบุชื่อลูกค้า");
    if (points.length === 0) return toast.error("กรุณาเพิ่มจุดงานอย่างน้อย 1 รายการ");
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user!.id;
      const { data: c, error: cErr } = await supabase.from("customers").insert({
        user_id: uid, ...cust,
      }).select().single();
      if (cErr) throw cErr;
      const { data: job, error: jErr } = await supabase.from("jobs").insert({
        user_id: uid, customer_id: c.id, title: jobTitle,
        checkin_lat: checkin?.lat, checkin_lng: checkin?.lng,
        checkin_at: checkin?.at, status: "assessed",
      }).select().single();
      if (jErr) throw jErr;
      const { error: pErr } = await supabase.from("work_points").insert(
        points.map((p, i) => ({
          user_id: uid, job_id: job.id,
          title: p.title, description: p.description, approach: p.approach,
          materials: p.materials as any, quantity: p.quantity, unit: p.unit,
          unit_price: p.unit_price, photos: p.photos, sort_order: i,
        }))
      );
      if (pErr) throw pErr;

      // Auto-seed checklist ONLY for materials marked as "buy"
      const buyItems: { label: string; qty: string }[] = [];
      points.forEach((p) => p.materials.forEach((m) => {
        if (m.status === "buy" && m.name.trim()) {
          buyItems.push({ label: `${m.name} ${m.purpose ? `(${m.purpose})` : ""}`.trim(), qty: m.qty });
        }
      }));
      if (buyItems.length) {
        await supabase.from("checklist_items").insert(
          buyItems.map((it) => ({ user_id: uid, job_id: job.id, label: `🛒 ${it.label} × ${it.qty}` }))
        );
      }

      // Reminder every 1 hour from check-in time
      await ensureNotificationPermission();
      await createReminder({
        title: `งาน: ${jobTitle} — ${cust.name}`,
        job_id: job.id,
        next_fire_at: new Date(Date.now() + 60 * 60 * 1000),
        interval_minutes: 60,
      });

      toast.success("บันทึกงานเรียบร้อย");
      nav({ to: "/jobs/$jobId", params: { jobId: job.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  return (
    <PageShell title="เข้าประเมินงาน" subtitle="สร้างการประเมินหน้างานใหม่">
      {step === "start" && (
        <div className="card-luxe p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold text-primary-foreground">
            <MapPin size={28} />
          </div>
          <h2 className="mt-4 text-lg font-semibold">เริ่มประเมินหน้างาน</h2>
          <p className="mt-1 text-sm text-muted-foreground">ระบบจะบันทึกตำแหน่ง GPS และเวลาเช็คอินอัตโนมัติ</p>
          <button onClick={startCheckin} className="btn-gold mt-6 w-full">เริ่มประเมิน + เช็คอิน GPS</button>
        </div>
      )}

      {step === "customer" && (
        <div className="space-y-4">
          {checkin && (
            <div className="card-luxe flex items-center gap-3 p-4">
              <MapPin size={18} className="text-gold" />
              <div className="min-w-0 text-xs">
                <p className="font-medium">เช็คอินแล้ว</p>
                <p className="truncate text-muted-foreground">
                  {checkin.lat.toFixed(5)}, {checkin.lng.toFixed(5)} · {new Date(checkin.at).toLocaleString("th-TH")}
                </p>
              </div>
            </div>
          )}
          <div className="card-luxe space-y-3 p-5">
            <h3 className="font-semibold text-gold">ข้อมูลงาน & ลูกค้า</h3>
            <Field label="ชื่องาน" value={jobTitle} onChange={setJobTitle} placeholder="เช่น ติดตั้งแอร์บ้าน 2 ตัว" />
            <Field label="ชื่อลูกค้า" value={cust.name} onChange={(v) => setCust({ ...cust, name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="เบอร์โทร" value={cust.phone} onChange={(v) => setCust({ ...cust, phone: v })} />
              <Field label="Line ID" value={cust.line_id} onChange={(v) => setCust({ ...cust, line_id: v })} />
            </div>
            <Field label="Email" value={cust.email} onChange={(v) => setCust({ ...cust, email: v })} />
            <Field label="ที่อยู่" value={cust.address} onChange={(v) => setCust({ ...cust, address: v })} multiline />
            <button
              onClick={() => {
                if (!jobTitle.trim()) return toast.error("กรุณาระบุชื่องานก่อน");
                if (!cust.name.trim()) return toast.error("กรุณาระบุชื่อลูกค้าก่อน");
                setStep("points");
              }}
              className="btn-gold mt-2 w-full">ถัดไป: เพิ่มจุดงาน</button>
          </div>
        </div>
      )}

      {step === "points" && (
        <div className="space-y-3">
          <div className="card-luxe p-4 space-y-2">
            <Field label="ชื่องาน" value={jobTitle} onChange={setJobTitle} placeholder="เช่น ติดตั้งแอร์บ้าน 2 ตัว" />
            <p className="text-[11px] text-muted-foreground">ลูกค้า: {cust.name || "-"}</p>
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} />
              แสดงราคาบน "สรุปประเมินงาน" และในเอกสาร
            </label>
          </div>
          {points.length === 0 && (
            <div className="card-luxe p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีจุดงาน กด "เพิ่มงาน" เพื่อเริ่ม
            </div>
          )}
          {points.map((p, i) => {
            const buyCount = p.materials.filter((m) => m.status === "buy").length;
            const stockCount = p.materials.filter((m) => m.status === "in_stock").length;
            return (
              <div key={p.id} className="card-luxe p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gold-soft">จุดที่ {i + 1}</p>
                    <p className="truncate font-semibold">{p.title || "(ไม่มีชื่อ)"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    {showPrices && <p className="mt-1 text-xs text-gold">{p.quantity} {p.unit} × ฿{p.unit_price.toLocaleString()}</p>}
                    {(buyCount + stockCount) > 0 && (
                      <div className="mt-1 flex gap-2 text-[10px]">
                        {stockCount > 0 && <span className="text-teal-300">📦 มีสต๊อก {stockCount}</span>}
                        {buyCount > 0 && <span className="text-amber-300">🛒 ต้องซื้อ {buyCount}</span>}
                      </div>
                    )}
                  </div>
                  {p.photos[0] && <img src={p.photos[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => setEditing(p)} className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs hover:border-gold"><Pencil size={14} /> แก้ไข</button>
                  <button onClick={() => setConfirmDelete({ kind: "point", id: p.id, label: p.title || "จุดนี้" })}
                    className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs text-destructive hover:border-destructive"><Trash2 size={14} /> ลบ</button>
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setEditing(emptyPoint())} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm hover:border-gold"><Plus size={16} /> เพิ่มงาน</button>
            <button disabled={saving} onClick={saveAll} className="btn-gold flex items-center justify-center gap-2 disabled:opacity-60"><CheckCircle2 size={16} /> สรุปและบันทึก</button>
          </div>
        </div>
      )}

      {editing && (
        <PointEditor
          value={editing}
          onCancel={() => setEditing(null)}
          onRequestDeleteMaterial={(matId, label) =>
            setConfirmDelete({ kind: "material", id: matId, label, matPointId: editing.id })
          }
          onSave={(next) => {
            setPoints((prev) => prev.some(p => p.id === next.id)
              ? prev.map(p => p.id === next.id ? next : p)
              : [...prev, next]);
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4">
          <div className="card-luxe w-full max-w-sm p-5 text-center">
            <AlertTriangle className="mx-auto text-destructive" size={32} />
            <h3 className="mt-3 font-semibold">ยืนยันการลบ</h3>
            <p className="mt-1 text-sm text-muted-foreground">คุณต้องการลบ "{confirmDelete.label}" ใช่หรือไม่?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border py-2 text-sm">ยกเลิก</button>
              <button
                onClick={() => {
                  if (confirmDelete.kind === "point") {
                    setPoints((prev) => prev.filter((x) => x.id !== confirmDelete.id));
                  } else if (confirmDelete.kind === "material" && editing) {
                    setEditing({
                      ...editing,
                      materials: editing.materials.filter((m) => m.id !== confirmDelete.id),
                    });
                  }
                  setConfirmDelete(null);
                  toast.success("ลบแล้ว");
                }}
                className="rounded-xl bg-destructive py-2 text-sm text-destructive-foreground">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Field({ label, value, onChange, multiline, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full resize-none rounded-xl border border-border bg-input/40 px-3 py-2 outline-none focus:border-gold" />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-2 outline-none focus:border-gold" />
      )}
    </label>
  );
}

function PointEditor({ value, onCancel, onSave, onRequestDeleteMaterial }: {
  value: WorkPoint; onCancel: () => void; onSave: (p: WorkPoint) => void;
  onRequestDeleteMaterial: (matId: string, label: string) => void;
}) {
  const [p, setP] = useState<WorkPoint>(value);
  const [uploading, setUploading] = useState(false);

  async function uploadPhoto(file: File) {
    setUploading(true);
    const tid = toast.loading("กำลังบีบอัดและอัปโหลด…");
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลดรูป");
      const optimized = await compressImage(file);
      const contentType = optimized.type || "image/jpeg";
      const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${userRes.user.id}/photos/${safeName}`;
      const { error } = await supabase.storage
        .from("dayneramit")
        .upload(path, optimized, { contentType, upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from("dayneramit")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("สร้างลิงก์รูปไม่สำเร็จ");
      setP((prev) => ({ ...prev, photos: [...prev.photos, data.signedUrl] }));
      toast.success("อัปโหลดสำเร็จ", { id: tid });
    } catch (err: any) {
      console.error("upload photo failed", err);
      toast.error(err?.message ?? "อัปโหลดไม่สำเร็จ", { id: tid });
    } finally { setUploading(false); }
  }

  function updateMat(id: string, patch: Partial<MaterialItem>) {
    setP({ ...p, materials: p.materials.map((m) => m.id === id ? { ...m, ...patch } : m) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center">
      <div className="card-luxe max-h-[92vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gold">รายละเอียดจุดงาน</h3>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full border border-border"><X size={14} /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="ชื่องาน" value={p.title} onChange={(v) => setP({ ...p, title: v })} />
          <Field label="รายละเอียด" value={p.description} onChange={(v) => setP({ ...p, description: v })} multiline />
          <Field label="แนวทางการปฏิบัติ" value={p.approach} onChange={(v) => setP({ ...p, approach: v })} multiline />

          {/* Structured materials */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gold">วัสดุ / อุปกรณ์</span>
              <button onClick={() => setP({ ...p, materials: [...p.materials, newMat()] })}
                className="rounded-lg border border-border px-2 py-1 text-[11px] hover:border-gold"><Plus size={11} className="inline" /> เพิ่ม</button>
            </div>
            {p.materials.length === 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">ยังไม่มีวัสดุ กด "เพิ่ม" เพื่อเริ่ม</p>
            )}
            <ul className="mt-2 space-y-2">
              {p.materials.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-2 space-y-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    <input value={m.name} placeholder="ชื่อวัสดุ" onChange={(e) => updateMat(m.id, { name: e.target.value })}
                      className="col-span-2 rounded-md border border-border bg-input/40 px-2 py-1.5 text-xs" />
                    <input value={m.qty} placeholder="จำนวน" onChange={(e) => updateMat(m.id, { qty: e.target.value })}
                      className="rounded-md border border-border bg-input/40 px-2 py-1.5 text-xs" />
                  </div>
                  <input value={m.purpose} placeholder="ใช้เพื่ออะไร (เช่น เปลี่ยนของเก่า)" onChange={(e) => updateMat(m.id, { purpose: e.target.value })}
                    className="w-full rounded-md border border-border bg-input/40 px-2 py-1.5 text-xs" />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button onClick={() => updateMat(m.id, { status: "in_stock" })}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] border ${m.status === "in_stock" ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-border text-muted-foreground"}`}>
                        <Package size={10} /> มีสต๊อก
                      </button>
                      <button onClick={() => updateMat(m.id, { status: "buy" })}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] border ${m.status === "buy" ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-border text-muted-foreground"}`}>
                        <ShoppingCart size={10} /> ต้องซื้อ
                      </button>
                    </div>
                    <button onClick={() => onRequestDeleteMaterial(m.id, m.name || "วัสดุนี้")}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-destructive hover:border-destructive">
                      <Trash2 size={10} /> ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="จำนวน" type="number" value={p.quantity ? String(p.quantity) : ""} onChange={(v) => setP({ ...p, quantity: v === "" ? 0 : Number(v) })} />
            <Field label="หน่วย" value={p.unit} onChange={(v) => setP({ ...p, unit: v })} />
            <Field label="ราคา/หน่วย" type="number" value={p.unit_price ? String(p.unit_price) : ""} onChange={(v) => setP({ ...p, unit_price: v === "" ? 0 : Number(v) })} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">รูปภาพหน้างาน</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.photos.map((u, i) => (
                <div key={i} className="relative">
                  <img src={u} className="h-20 w-20 rounded-lg object-cover" alt="" />
                  <button onClick={() => setP({ ...p, photos: p.photos.filter((_, j) => j !== i) })}
                    className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white"><X size={10} /></button>
                </div>
              ))}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-gold hover:text-gold" title="ถ่ายรูปด้วยกล้อง">
                <Camera size={22} />
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.currentTarget.value = ""; }} />
              </label>
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-[10px] leading-tight text-muted-foreground hover:border-gold hover:text-gold" title="เลือกจากคลังภาพ">
                <span className="text-lg">🖼️</span>
                <span>อัปโหลด</span>
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.currentTarget.value = ""; }} />
              </label>
            </div>
            {uploading && <p className="mt-1 text-xs text-muted-foreground">กำลังอัปโหลด…</p>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-border py-2.5 text-sm">ยกเลิก</button>
          <button onClick={() => onSave(p)} className="btn-gold">บันทึกจุดนี้</button>
        </div>
      </div>
    </div>
  );
}
