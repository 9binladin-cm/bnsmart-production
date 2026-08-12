import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { DEFAULT_PROFILE } from "@/lib/brand";
import { BANK_OPTIONS, bankLogoByName } from "@/lib/doc-utils";
import { autoCropQr } from "@/lib/qr-crop";
import { toast } from "sonner";
import { getIntegrationStatus } from "@/lib/engineering.functions";
import { CheckCircle2, CircleX } from "lucide-react";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Settings,
});

function Settings() {
  const [p, setP] = useState<any>({ ...DEFAULT_PROFILE });
  const [integrations, setIntegrations] = useState<any>(null);
  useEffect(() => {
    getIntegrationStatus().then(setIntegrations).catch(() => setIntegrations(null));
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      if (data) setP({ ...DEFAULT_PROFILE, ...data });
    });
  }, []);

  async function save() {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({ ...p, id: user.user!.id });
    if (error) toast.error(error.message); else toast.success("บันทึกโปรไฟล์แล้ว");
  }

  async function uploadQr(file: File) {
    toast.loading("กำลังอัปโหลด…", { id: "qr" });
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("กรุณาเข้าสู่ระบบ");
      const cropped = await autoCropQr(file).catch(() => file);
      const path = `${user.user.id}/bank_qr/${Date.now()}.png`;
      const { error } = await supabase.storage.from("dayneramit").upload(path, cropped, { contentType: "image/png", upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("dayneramit").createSignedUrl(path, 60 * 60 * 24 * 365);
      setP({ ...p, bank_qr_url: signed?.signedUrl });
      toast.success("อัปโหลด QR แล้ว", { id: "qr" });
    } catch (e: any) {
      toast.error(e?.message ?? "อัปโหลดไม่สำเร็จ", { id: "qr" });
    }
  }

  const F = (k: string, label: string) => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-2" />
    </label>
  );

  const bankLogo = bankLogoByName(p.bank_name);

  return (
    <PageShell title="ตั้งค่าโปรไฟล์" subtitle="ข้อมูลผู้ประกอบการ (ค่าเริ่มต้นในเอกสาร)">
      <div className="card-luxe space-y-3 p-5">
        {F("display_name_th", "ชื่อ (ไทย)")}
        {F("display_name_en", "ชื่อ (อังกฤษ)")}
        {F("tagline", "Tagline")}
        {F("address", "ที่อยู่")}
        <div className="grid grid-cols-2 gap-3">
          {F("phone", "เบอร์โทร")}
          {F("line_id", "Line ID")}
        </div>
        {F("email", "Email")}

        <h4 className="pt-2 text-sm font-semibold text-gold">บัญชีธนาคาร (ค่าเริ่มต้น)</h4>
        <label className="block">
          <span className="text-xs text-muted-foreground">ธนาคาร</span>
          <div className="mt-1 flex items-center gap-3">
            <img src={bankLogo} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
            <select value={p.bank_name ?? ""} onChange={(e) => setP({ ...p, bank_name: e.target.value })}
              className="flex-1 rounded-xl border border-border bg-input/40 px-3 py-2">
              {BANK_OPTIONS.map((b) => <option key={b.key} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </label>
        {F("bank_account_no", "เลขที่บัญชี")}
        {F("bank_account_name", "ชื่อบัญชี")}

        <div>
          <span className="text-xs text-muted-foreground">QR Code สำหรับรับชำระเงิน (พร้อมเพย์ / บัญชีธนาคาร)</span>
          <div className="mt-2 flex items-center gap-3">
            {p.bank_qr_url && <img src={p.bank_qr_url} alt="QR" className="h-24 w-24 rounded-lg border border-border bg-white object-contain" />}
            <label className="cursor-pointer rounded-xl border border-dashed border-gold/60 bg-gold/10 px-4 py-3 text-xs text-gold hover:bg-gold/20">
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
              {p.bank_qr_url ? "เปลี่ยน QR (ระบบ Auto-Crop)" : "อัปโหลด QR (Auto-Crop)"}
            </label>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-gold">สถานะ Integration ฝั่ง Server</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">ระบบแสดงเฉพาะว่าตั้งค่าแล้วหรือไม่ โดยไม่ส่ง API Key มาที่ Browser</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[["Serper", integrations?.serper], ["AI Agent", integrations?.lovableAi], ["Bright Data", integrations?.brightData]].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs">
                {ok ? <CheckCircle2 size={16} className="text-emerald-300" /> : <CircleX size={16} className="text-red-300" />}
                <span>{label}</span><span className="ml-auto text-muted-foreground">{ok ? "พร้อม" : "ยังไม่ตั้งค่า"}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} className="btn-gold mt-3 w-full">บันทึก</button>
      </div>
    </PageShell>
  );
}
