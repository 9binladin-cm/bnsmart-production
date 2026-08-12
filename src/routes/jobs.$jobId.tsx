import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { StatusBadge, JOB_STATUS_META, type JobStatus } from "@/components/StatusBadge";
import { toast } from "sonner";
import { CalendarClock, FileText, ListChecks, MapPin, PackageSearch, Plus, Trash2, UsersRound, WalletCards } from "lucide-react";

export const Route = createFileRoute("/jobs/$jobId")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: JobDetail,
});

const DOC_TYPES = [
  { k: "quotation", label: "ใบเสนอราคา" }, { k: "receipt", label: "ใบรับเงิน" },
  { k: "daily_report", label: "รายงานประจำวัน" }, { k: "delivery", label: "ใบส่งมอบ" },
  { k: "warranty", label: "ใบรับประกัน" }, { k: "tax_receipt", label: "ใบเสร็จรับเงิน" },
];

type Tab = "overview" | "materials" | "labor" | "expenses" | "documents";
const money = (n: unknown) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(Number(n || 0));

function JobDetail() {
  const { jobId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [job, setJob] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [labor, setLabor] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [materialForm, setMaterialForm] = useState({ name: "", quantity: "1", unit: "ชิ้น", unit_cost: "0" });
  const [laborForm, setLaborForm] = useState({ technician_name: "", work_date: new Date().toISOString().slice(0, 10), rate_type: "daily", regular_hours: "0", overtime_hours: "0", rate: "0", overtime_rate: "0", travel_cost: "0", meal_cost: "0" });
  const [expenseForm, setExpenseForm] = useState({ category: "other", description: "", amount: "0", expense_date: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    const [j, p, m, l, e, pay] = await Promise.all([
      (supabase as any).from("jobs").select("*, customers(*)").eq("id", jobId).single(),
      (supabase as any).from("work_points").select("*").eq("job_id", jobId).order("sort_order"),
      (supabase as any).from("job_materials").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
      (supabase as any).from("job_labor_entries").select("*").eq("job_id", jobId).order("work_date", { ascending: false }),
      (supabase as any).from("job_expenses").select("*").eq("job_id", jobId).order("expense_date", { ascending: false }),
      (supabase as any).from("payments").select("*").eq("job_id", jobId).eq("status", "confirmed"),
    ]);
    setJob(j.data); setPoints(p.data ?? []); setMaterials(m.data ?? []); setLabor(l.data ?? []); setExpenses(e.data ?? []); setPayments(pay.data ?? []);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const costs = useMemo(() => {
    const material = materials.filter((x) => x.status !== "cancelled").reduce((s, x) => s + Number(x.actual_quantity > 0 ? x.actual_quantity : x.quantity) * Number(x.unit_cost), 0);
    const laborCost = labor.reduce((s, x) => s + (x.rate_type === "hourly" ? Number(x.regular_hours) * Number(x.rate) : Number(x.rate)) + Number(x.overtime_hours) * Number(x.overtime_rate) + Number(x.travel_cost) + Number(x.meal_cost), 0);
    const other = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const paid = payments.reduce((s, x) => s + Number(x.amount), 0);
    const selling = Number(job?.selling_price || 0);
    return { material, labor: laborCost, other, total: material + laborCost + other, paid, selling, profit: selling - material - laborCost - other, outstanding: Math.max(selling - paid, 0) };
  }, [materials, labor, expenses, payments, job]);

  async function userId() { const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error("Unauthorized"); return data.user.id; }
  async function addMaterial() {
    if (!materialForm.name.trim()) return toast.error("กรอกชื่อวัสดุ");
    const { error } = await (supabase as any).from("job_materials").insert({ user_id: await userId(), job_id: jobId, name: materialForm.name.trim(), quantity: Number(materialForm.quantity), unit: materialForm.unit, unit_cost: Number(materialForm.unit_cost), status: "planned", source_type: "manual" });
    if (error) return toast.error(error.message); setMaterialForm({ name: "", quantity: "1", unit: "ชิ้น", unit_cost: "0" }); await load(); toast.success("เพิ่มวัสดุแล้ว");
  }
  async function addLabor() {
    if (!laborForm.technician_name.trim()) return toast.error("กรอกชื่อช่าง");
    const payload = Object.fromEntries(Object.entries(laborForm).map(([k,v]) => (["regular_hours","overtime_hours","rate","overtime_rate","travel_cost","meal_cost"].includes(k) ? [k, Number(v)] : [k,v])));
    const { error } = await (supabase as any).from("job_labor_entries").insert({ user_id: await userId(), job_id: jobId, ...payload });
    if (error) return toast.error(error.message); await load(); toast.success("บันทึกแรงงานแล้ว");
  }
  async function addExpense() {
    if (!expenseForm.description.trim()) return toast.error("กรอกรายละเอียดค่าใช้จ่าย");
    const { error } = await (supabase as any).from("job_expenses").insert({ user_id: await userId(), job_id: jobId, ...expenseForm, amount: Number(expenseForm.amount) });
    if (error) return toast.error(error.message); setExpenseForm({ category: "other", description: "", amount: "0", expense_date: new Date().toISOString().slice(0,10) }); await load(); toast.success("เพิ่มค่าใช้จ่ายแล้ว");
  }
  async function remove(table: string, id: string) { const { error } = await (supabase as any).from(table).delete().eq("id", id); if (error) return toast.error(error.message); await load(); }

  if (!job) return <PageShell title="JOB" back="/jobs"><div className="card-luxe p-6 text-center">กำลังโหลด…</div></PageShell>;

  return (
    <PageShell title={job.title} subtitle={job.customers?.name ?? "—"} back="/jobs" actions={<Link to="/materials" search={{ jobId }} className="btn-gold hidden sm:inline-flex"><PackageSearch size={16}/>ค้นหาวัสดุ</Link>}>
      <div className="space-y-4">
        <section className="card-luxe p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-2"><MapPin size={17} className="mt-1 text-gold"/><div><StatusBadge status={job.status} size="md"/><p className="mt-2 text-xs text-muted-foreground">{job.customers?.address || "ไม่ระบุสถานที่"}</p></div></div>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(JOB_STATUS_META) as JobStatus[]).map((s) => <button key={s} onClick={async()=>{ const update:any={status:s}; if(s==="completed") update.completed_at=new Date().toISOString(); const {error}=await (supabase as any).from("jobs").update(update).eq("id",jobId); if(error)return toast.error(error.message); await load(); }} className={`rounded-full border px-2 py-1 text-[10px] ${job.status===s?"border-gold bg-gold/10 text-gold":"border-border text-muted-foreground"}`}>{JOB_STATUS_META[s].label}</button>)}</div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label><span className="form-label">ราคาขาย</span><input type="number" className="form-control" value={job.selling_price ?? 0} onChange={(e)=>setJob({...job,selling_price:e.target.value})} onBlur={async(e)=>{await (supabase as any).from("jobs").update({selling_price:Number(e.target.value)}).eq("id",jobId); await load();}}/></label>
            <label><span className="form-label">ความคืบหน้า {job.progress_percent ?? 0}%</span><input type="range" min="0" max="100" className="w-full accent-amber-400" value={job.progress_percent ?? 0} onChange={(e)=>setJob({...job,progress_percent:Number(e.target.value)})} onMouseUp={async()=>{await (supabase as any).from("jobs").update({progress_percent:Number(job.progress_percent)}).eq("id",jobId);}}/></label>
            <div><span className="form-label">กำไรขั้นต้น</span><p className={`pt-2 text-xl font-semibold ${costs.profit>=0?"text-emerald-300":"text-red-300"}`}>{money(costs.profit)}</p></div>
          </div>
        </section>

        <div className="section-tabs">{([['overview','ภาพรวม'],['materials','วัสดุ'],['labor','แรงงาน'],['expenses','ค่าใช้จ่าย'],['documents','เอกสาร']] as const).map(([k,l])=><button key={k} className={`section-tab ${tab===k?"is-active":""}`} onClick={()=>setTab(k)}>{l}</button>)}</div>

        {tab === "overview" && <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['วัสดุ',costs.material],['แรงงาน',costs.labor],['ค่าใช้จ่ายอื่น',costs.other],['ต้นทุนรวม',costs.total],['ราคาขาย',costs.selling],['รับเงินแล้ว',costs.paid],['คงค้าง',costs.outstanding],['กำไร',costs.profit]].map(([label,value])=><div key={String(label)} className="metric-card min-h-0"><div className="metric-label">{label}</div><div className="metric-value text-lg">{money(value)}</div></div>)}</section>
          <section className="card-luxe p-4"><h3 className="font-semibold text-gold">จุดงาน ({points.length})</h3><ul className="mt-3 space-y-2 text-sm">{points.map((p,i)=><li key={p.id} className="flex justify-between border-b border-border/50 pb-2"><span>{i+1}. {p.title}</span><span className="text-gold">{money(Number(p.quantity)*Number(p.unit_price))}</span></li>)}</ul></section>
        </>}

        {tab === "materials" && <section className="card-luxe p-4 sm:p-5">
          <div className="panel-title"><h2>วัสดุและอะไหล่</h2><Link to="/materials" search={{jobId}} className="text-xs text-gold">ค้นหาราคาออนไลน์ →</Link></div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_100px_90px_130px_auto]"><input className="form-control" placeholder="ชื่อวัสดุ" value={materialForm.name} onChange={e=>setMaterialForm({...materialForm,name:e.target.value})}/><input type="number" className="form-control" value={materialForm.quantity} onChange={e=>setMaterialForm({...materialForm,quantity:e.target.value})}/><input className="form-control" value={materialForm.unit} onChange={e=>setMaterialForm({...materialForm,unit:e.target.value})}/><input type="number" className="form-control" value={materialForm.unit_cost} onChange={e=>setMaterialForm({...materialForm,unit_cost:e.target.value})}/><button className="btn-gold" onClick={addMaterial}><Plus size={15}/></button></div>
          <div className="mt-4 space-y-2">{materials.map(m=><div key={m.id} className="flex items-center justify-between rounded-xl border border-border p-3"><div><p className="text-sm font-medium">{m.name}</p><p className="text-[11px] text-muted-foreground">{m.quantity} {m.unit} × {money(m.unit_cost)} · {m.source_name || 'บันทึกเอง'}</p></div><div className="flex items-center gap-2"><span className="text-sm text-gold">{money(Number(m.quantity)*Number(m.unit_cost))}</span><button onClick={()=>remove('job_materials',m.id)} className="text-red-300"><Trash2 size={15}/></button></div></div>)}</div>
        </section>}

        {tab === "labor" && <section className="card-luxe p-4 sm:p-5">
          <h2 className="font-semibold text-gold">แรงงาน</h2><div className="mt-4 grid gap-2 md:grid-cols-4"><input className="form-control" placeholder="ชื่อช่าง" value={laborForm.technician_name} onChange={e=>setLaborForm({...laborForm,technician_name:e.target.value})}/><input type="date" className="form-control" value={laborForm.work_date} onChange={e=>setLaborForm({...laborForm,work_date:e.target.value})}/><select className="form-control" value={laborForm.rate_type} onChange={e=>setLaborForm({...laborForm,rate_type:e.target.value})}><option value="daily">รายวัน</option><option value="hourly">รายชั่วโมง</option><option value="fixed">เหมาจ่าย</option></select><input type="number" className="form-control" placeholder="ค่าแรง" value={laborForm.rate} onChange={e=>setLaborForm({...laborForm,rate:e.target.value})}/><input type="number" className="form-control" placeholder="ชั่วโมงปกติ" value={laborForm.regular_hours} onChange={e=>setLaborForm({...laborForm,regular_hours:e.target.value})}/><input type="number" className="form-control" placeholder="ชั่วโมง OT" value={laborForm.overtime_hours} onChange={e=>setLaborForm({...laborForm,overtime_hours:e.target.value})}/><input type="number" className="form-control" placeholder="อัตรา OT" value={laborForm.overtime_rate} onChange={e=>setLaborForm({...laborForm,overtime_rate:e.target.value})}/><button className="btn-gold" onClick={addLabor}><Plus size={15}/>บันทึก</button></div>
          <div className="mt-4 space-y-2">{labor.map(x=><div key={x.id} className="flex justify-between rounded-xl border border-border p-3"><div><p className="text-sm font-medium">{x.technician_name}</p><p className="text-[11px] text-muted-foreground">{x.work_date} · {x.rate_type}</p></div><div className="flex items-center gap-2"><span className="text-gold">{money((x.rate_type==='hourly'?Number(x.regular_hours)*Number(x.rate):Number(x.rate))+Number(x.overtime_hours)*Number(x.overtime_rate)+Number(x.travel_cost)+Number(x.meal_cost))}</span><button onClick={()=>remove('job_labor_entries',x.id)} className="text-red-300"><Trash2 size={15}/></button></div></div>)}</div>
        </section>}

        {tab === "expenses" && <section className="card-luxe p-4 sm:p-5"><h2 className="font-semibold text-gold">ค่าใช้จ่ายอื่น</h2><div className="mt-4 grid gap-2 md:grid-cols-[140px_1fr_140px_160px_auto]"><select className="form-control" value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})}><option value="transport">เดินทาง</option><option value="equipment">เครื่องมือ</option><option value="permit">ใบอนุญาต</option><option value="other">อื่นๆ</option></select><input className="form-control" placeholder="รายละเอียด" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm,description:e.target.value})}/><input type="number" className="form-control" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})}/><input type="date" className="form-control" value={expenseForm.expense_date} onChange={e=>setExpenseForm({...expenseForm,expense_date:e.target.value})}/><button className="btn-gold" onClick={addExpense}><Plus size={15}/></button></div><div className="mt-4 space-y-2">{expenses.map(x=><div key={x.id} className="flex justify-between rounded-xl border border-border p-3"><div><p className="text-sm">{x.description}</p><p className="text-[11px] text-muted-foreground">{x.category} · {x.expense_date}</p></div><div className="flex gap-2"><span className="text-gold">{money(x.amount)}</span><button onClick={()=>remove('job_expenses',x.id)} className="text-red-300"><Trash2 size={15}/></button></div></div>)}</div></section>}

        {tab === "documents" && <section className="card-luxe p-4"><h3 className="flex items-center gap-2 font-semibold text-gold"><FileText size={16}/>สร้างเอกสาร</h3><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">{DOC_TYPES.map(d=><Link key={d.k} to="/documents/new" search={{jobId,type:d.k}} className="rounded-xl border border-border px-3 py-3 text-center text-xs hover:border-gold">{d.label}</Link>)}</div></section>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Link to="/bookings" className="card-luxe flex items-center justify-center gap-2 p-4 text-sm"><CalendarClock size={16} className="text-gold"/>Booking</Link><Link to="/checklist" search={{jobId}} className="card-luxe flex items-center justify-center gap-2 p-4 text-sm"><ListChecks size={16} className="text-gold"/>Checklist</Link><Link to="/finance" search={{jobId}} className="card-luxe flex items-center justify-center gap-2 p-4 text-sm"><WalletCards size={16} className="text-gold"/>รับชำระ</Link><Link to="/warranty" search={{jobId}} className="card-luxe flex items-center justify-center gap-2 p-4 text-sm"><UsersRound size={16} className="text-gold"/>Warranty</Link></div>
      </div>
    </PageShell>
  );
}
