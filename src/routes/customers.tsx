import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/customers")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: CustomersPage,
});

type Customer = Tables<"customers">;
type CustomerForm = {
  id?: string;
  name: string;
  company_name: string;
  phone: string;
  line_id: string;
  email: string;
  address: string;
  notes: string;
  latitude: string;
  longitude: string;
};

const emptyForm: CustomerForm = {
  name: "",
  company_name: "",
  phone: "",
  line_id: "",
  email: "",
  address: "",
  notes: "",
  latitude: "",
  longitude: "",
};

function toForm(customer?: Customer): CustomerForm {
  if (!customer) return emptyForm;
  return {
    id: customer.id,
    name: customer.name,
    company_name: customer.company_name ?? "",
    phone: customer.phone ?? "",
    line_id: customer.line_id ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
    latitude: customer.latitude == null ? "" : String(customer.latitude),
    longitude: customer.longitude == null ? "" : String(customer.longitude),
  };
}

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CustomerForm | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("customers").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(`โหลดข้อมูลลูกค้าไม่สำเร็จ: ${error.message}`);
    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("customers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th-TH");
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.company_name, customer.phone, customer.email, customer.address]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("th-TH").includes(needle)),
    );
  }, [customers, query]);

  return (
    <PageShell
      title="Customer CRM"
      subtitle="ข้อมูลลูกค้า ที่อยู่ ประวัติการติดต่อ และจุดเชื่อมต่อ Workflow"
      actions={<button className="btn-gold !min-h-10 !px-3" onClick={() => setEditing({ ...emptyForm })}><Plus size={16} /><span className="hidden sm:inline">เพิ่มลูกค้า</span></button>}
    >
      <div className="card-luxe p-3 sm:p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <input
            className="form-control pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อ เบอร์โทร บริษัท หรือที่อยู่"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => (
          <article key={customer.id} className="card-luxe p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><UserRound size={21} /></span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-gold-soft">{customer.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{customer.company_name || "ลูกค้าบุคคล"}</p>
                </div>
              </div>
              <button className="icon-button !h-9 !w-9" onClick={() => setEditing(toForm(customer))} aria-label={`แก้ไข ${customer.name}`}><Pencil size={15} /></button>
            </div>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Phone size={14} className="text-gold" />{customer.phone || "ไม่ระบุเบอร์โทร"}</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-gold" />{customer.email || "ไม่ระบุอีเมล"}</p>
              <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-gold" /><span className="line-clamp-2">{customer.address || "ไม่ระบุที่อยู่"}</span></p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to="/bookings" search={{ customerId: customer.id }} className="rounded-xl border border-border py-2 text-center text-xs hover:border-gold">สร้าง Booking</Link>
              <Link to="/surveys" search={{ customerId: customer.id }} className="rounded-xl border border-border py-2 text-center text-xs hover:border-gold">สำรวจหน้างาน</Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="card-luxe empty-state mt-4">
          <UserRound className="mx-auto text-gold" size={34} />
          <p className="mt-3 font-medium">ไม่พบข้อมูลลูกค้า</p>
          <p className="mt-1 text-xs text-muted-foreground">เพิ่มลูกค้ารายแรก หรือเปลี่ยนคำค้นหา</p>
        </div>
      )}

      {editing && <CustomerDialog value={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </PageShell>
  );
}

function CustomerDialog({ value, onClose, onSaved }: { value: CustomerForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  function update<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function captureLocation() {
    if (!navigator.geolocation) return toast.error("อุปกรณ์นี้ไม่รองรับ GPS");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", String(position.coords.latitude));
        update("longitude", String(position.coords.longitude));
        setLocating(false);
        toast.success("บันทึกพิกัดแล้ว");
      },
      (error) => {
        setLocating(false);
        toast.error(`อ่านพิกัดไม่สำเร็จ: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("กรุณาระบุชื่อลูกค้า");
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("ไม่พบผู้ใช้งาน");
      const payload = {
        user_id: auth.user.id,
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        phone: form.phone.trim() || null,
        line_id: form.line_id.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };
      const result = form.id
        ? await supabase.from("customers").update(payload).eq("id", form.id)
        : await supabase.from("customers").insert(payload);
      if (result.error) throw result.error;
      toast.success(form.id ? "อัปเดตข้อมูลลูกค้าแล้ว" : "เพิ่มลูกค้าแล้ว");
      onSaved();
    } catch (error: any) {
      toast.error(error?.message ?? "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card-luxe max-h-[94vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gold">{form.id ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}</h2>
            <p className="text-xs text-muted-foreground">ข้อมูลนี้จะถูกใช้ต่อใน Booking, Survey, Quotation และ JOB</p>
          </div>
          <button type="button" className="icon-button !h-9 !w-9" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อลูกค้า *" value={form.name} onChange={(value) => update("name", value)} />
          <Field label="บริษัท / ร้านค้า" value={form.company_name} onChange={(value) => update("company_name", value)} />
          <Field label="โทรศัพท์" value={form.phone} onChange={(value) => update("phone", value)} inputMode="tel" />
          <Field label="LINE ID" value={form.line_id} onChange={(value) => update("line_id", value)} />
          <Field label="อีเมล" value={form.email} onChange={(value) => update("email", value)} type="email" />
          <div className="sm:col-span-2">
            <Field label="ที่อยู่" value={form.address} onChange={(value) => update("address", value)} multiline />
          </div>
          <Field label="Latitude" value={form.latitude} onChange={(value) => update("latitude", value)} inputMode="decimal" />
          <Field label="Longitude" value={form.longitude} onChange={(value) => update("longitude", value)} inputMode="decimal" />
          <button type="button" className="rounded-xl border border-border py-2.5 text-xs hover:border-gold sm:col-span-2" onClick={captureLocation} disabled={locating}>
            <MapPin size={15} className="mr-1 inline text-gold" />{locating ? "กำลังอ่านพิกัด…" : "ใช้พิกัดปัจจุบัน"}
          </button>
          <div className="sm:col-span-2">
            <Field label="หมายเหตุ" value={form.notes} onChange={(value) => update("notes", value)} multiline />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-border py-2.5 text-sm">ยกเลิก</button>
          <button disabled={saving} className="btn-gold">{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, multiline = false, type = "text", inputMode }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "decimal" | "numeric";
}) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      {multiline ? (
        <textarea className="form-control min-h-24 resize-y" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="form-control" type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
