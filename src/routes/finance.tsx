import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Banknote, CreditCard, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";

export const Route = createFileRoute("/finance")({
  ssr: false,
  validateSearch: z.object({ jobId: z.string().optional() }),
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); },
  component: FinancePage,
});

const money = (n: unknown) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(Number(n || 0));

function FinancePage() {
  const { jobId: initialJobId } = Route.useSearch();
  const [jobs, setJobs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [form, setForm] = useState({ amount: "", paid_at: new Date().toISOString().slice(0,16), method: "transfer", reference_no: "", notes: "" });

  async function load() {
    const [j, p] = await Promise.all([
      (supabase as any).from("jobs").select("id,title,selling_price,status,customers(id,name)").order("created_at", { ascending: false }),
      (supabase as any).from("payments").select("*, jobs(title), customers(name)").order("paid_at", { ascending: false }).limit(200),
    ]);
    setJobs(j.data ?? []); setPayments(p.data ?? []);
  }
  useEffect(() => { load(); }, []);
  const selectedJob = jobs.find((j) => j.id === jobId);
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const totals = useMemo(() => ({
    received: confirmed.reduce((s,p)=>s+Number(p.amount),0),
    selectedPaid: confirmed.filter(p=>p.job_id===jobId).reduce((s,p)=>s+Number(p.amount),0),
  }), [payments, jobId]);

  async function addPayment() {
    if (!jobId) return toast.error("เลือก JOB");
    if (Number(form.amount) <= 0) return toast.error("จำนวนเงินต้องมากกว่า 0");
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { error } = await (supabase as any).from("payments").insert({
      user_id: u.user.id, job_id: jobId, customer_id: selectedJob?.customers?.id ?? null,
      amount: Number(form.amount), paid_at: new Date(form.paid_at).toISOString(), method: form.method,
      reference_no: form.reference_no || null, notes: form.notes || null, status: "confirmed",
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, amount: "", reference_no: "", notes: "" }); await load(); toast.success("บันทึกรับชำระแล้ว");
  }

  return <PageShell title="Receipt / Invoice / Payment" subtitle="บันทึกรับเงิน ติดตามยอดค้าง และสร้างเอกสารการเงิน">
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="metric-card"><div className="metric-label"><Banknote size={17} className="text-gold"/>รับเงินรวม</div><div className="metric-value text-xl">{money(totals.received)}</div></div>
        <div className="metric-card"><div className="metric-label"><WalletCards size={17} className="text-gold"/>JOB ที่เลือก</div><div className="metric-value text-xl">{money(totals.selectedPaid)}</div></div>
        <div className="metric-card"><div className="metric-label"><CreditCard size={17} className="text-gold"/>ยอดคงค้าง</div><div className="metric-value text-xl">{money(Math.max(Number(selectedJob?.selling_price||0)-totals.selectedPaid,0))}</div></div>
      </section>

      <section className="card-luxe p-4 sm:p-5">
        <h2 className="font-semibold text-gold">บันทึกรับชำระ</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label><span className="form-label">JOB</span><select className="form-control" value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">เลือกงาน</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} — {j.customers?.name ?? ""}</option>)}</select></label>
          <label><span className="form-label">จำนวนเงิน</span><input type="number" className="form-control" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
          <label><span className="form-label">วันที่รับเงิน</span><input type="datetime-local" className="form-control" value={form.paid_at} onChange={e=>setForm({...form,paid_at:e.target.value})}/></label>
          <label><span className="form-label">วิธีชำระ</span><select className="form-control" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option value="transfer">โอน</option><option value="promptpay">พร้อมเพย์</option><option value="cash">เงินสด</option><option value="card">บัตร</option><option value="cheque">เช็ค</option><option value="other">อื่นๆ</option></select></label>
          <label><span className="form-label">เลขอ้างอิง</span><input className="form-control" value={form.reference_no} onChange={e=>setForm({...form,reference_no:e.target.value})}/></label>
          <label><span className="form-label">หมายเหตุ</span><input className="form-control" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        </div>
        <button className="btn-gold mt-4" onClick={addPayment}><Plus size={16}/>บันทึกรับชำระ</button>
      </section>

      <section className="card-luxe p-4 sm:p-5">
        <div className="panel-title"><h2>รายการรับชำระ</h2><span className="text-xs text-muted-foreground">{payments.length} รายการ</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3">วันที่</th><th className="pb-3">JOB</th><th className="pb-3">ลูกค้า</th><th className="pb-3">วิธี</th><th className="pb-3">อ้างอิง</th><th className="pb-3 text-right">ยอด</th><th></th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-b border-border/50"><td className="py-3">{new Date(p.paid_at).toLocaleString("th-TH")}</td><td>{p.jobs?.title ?? "—"}</td><td>{p.customers?.name ?? "—"}</td><td>{p.method}</td><td>{p.reference_no ?? "—"}</td><td className="text-right text-gold">{money(p.amount)}</td><td className="pl-2"><button className="text-red-300" onClick={async()=>{const {error}=await (supabase as any).from("payments").delete().eq("id",p.id);if(error)return toast.error(error.message);await load();}}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {['receipt','tax_receipt','delivery'].map(type=><a key={type} href={jobId?`/documents/new?jobId=${jobId}&type=${type}`:`/documents/new?type=${type}`} className="card-luxe flex items-center justify-center gap-2 p-4 text-sm"><ReceiptText size={16} className="text-gold"/>{type==='receipt'?'ใบรับเงิน':type==='tax_receipt'?'ใบเสร็จรับเงิน':'ใบส่งมอบ'}</a>)}
      </section>
    </div>
  </PageShell>;
}
