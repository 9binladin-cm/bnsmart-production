import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, Plus, ShieldCheck, ShieldX } from "lucide-react";

export const Route = createFileRoute("/warranty")({
  ssr: false,
  validateSearch: z.object({ jobId: z.string().optional() }),
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); },
  component: WarrantyPage,
});

function WarrantyPage() {
  const { jobId: initialJobId } = Route.useSearch();
  const [jobs, setJobs] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [form, setForm] = useState({ job_id: initialJobId ?? "", title: "", serial_number: "", starts_on: new Date().toISOString().slice(0,10), ends_on: new Date(Date.now()+180*86400000).toISOString().slice(0,10), terms: "รับประกันเฉพาะงานและอะไหล่ตามรายการในเอกสาร ไม่ครอบคลุมความเสียหายจากการใช้งานผิดประเภท ภัยธรรมชาติ หรือบุคคลภายนอก" });
  const [claimForm, setClaimForm] = useState({ warranty_id: "", issue: "" });

  async function load() {
    const [j,w,c] = await Promise.all([
      (supabase as any).from("jobs").select("id,title,customer_id,customers(name)").order("created_at",{ascending:false}),
      (supabase as any).from("warranty_records").select("*, jobs(title), customers(name)").order("ends_on"),
      (supabase as any).from("warranty_claims").select("*, warranty_records(title)").order("opened_at",{ascending:false}),
    ]);
    setJobs(j.data??[]); setRecords(w.data??[]); setClaims(c.data??[]);
  }
  useEffect(()=>{load();},[]);
  const stats = useMemo(()=>({
    active: records.filter(r=>r.status==='active' && new Date(r.ends_on)>=new Date()).length,
    expiring: records.filter(r=>{const d=(new Date(r.ends_on).getTime()-Date.now())/86400000; return r.status==='active'&&d>=0&&d<=30;}).length,
    openClaims: claims.filter(c=>!['resolved','rejected','cancelled'].includes(c.status)).length,
  }),[records,claims]);

  async function createWarranty(){
    if(!form.job_id||!form.title.trim()) return toast.error("เลือก JOB และกรอกชื่อการรับประกัน");
    const {data:u}=await supabase.auth.getUser(); if(!u.user)return;
    const job=jobs.find(j=>j.id===form.job_id);
    const {error}=await (supabase as any).from("warranty_records").insert({user_id:u.user.id,job_id:form.job_id,customer_id:job?.customer_id??null,title:form.title.trim(),serial_number:form.serial_number||null,starts_on:form.starts_on,ends_on:form.ends_on,terms:form.terms,status:'active'});
    if(error)return toast.error(error.message); await load(); toast.success("สร้างการรับประกันแล้ว");
  }
  async function createClaim(){
    if(!claimForm.warranty_id||!claimForm.issue.trim())return toast.error("เลือกการรับประกันและกรอกอาการ");
    const {data:u}=await supabase.auth.getUser();if(!u.user)return;
    const warranty=records.find(r=>r.id===claimForm.warranty_id);
    const {error}=await (supabase as any).from("warranty_claims").insert({user_id:u.user.id,warranty_id:claimForm.warranty_id,job_id:warranty?.job_id??null,issue:claimForm.issue.trim(),status:'open'});
    if(error)return toast.error(error.message);setClaimForm({warranty_id:'',issue:''});await load();toast.success("เปิดเคลมแล้ว");
  }

  return <PageShell title="Warranty & Claim" subtitle="ติดตามระยะรับประกัน การเคลม และประวัติหลังส่งมอบ">
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="metric-card"><div className="metric-label"><ShieldCheck size={17} className="text-gold"/>กำลังรับประกัน</div><div className="metric-value">{stats.active}</div></div>
        <div className="metric-card"><div className="metric-label"><CalendarCheck size={17} className="text-gold"/>หมดใน 30 วัน</div><div className="metric-value">{stats.expiring}</div></div>
        <div className="metric-card"><div className="metric-label"><AlertTriangle size={17} className="text-gold"/>เคลมที่ยังเปิด</div><div className="metric-value">{stats.openClaims}</div></div>
      </section>
      <section className="card-luxe p-4 sm:p-5"><h2 className="font-semibold text-gold">สร้างการรับประกัน</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><label><span className="form-label">JOB</span><select className="form-control" value={form.job_id} onChange={e=>setForm({...form,job_id:e.target.value})}><option value="">เลือกงาน</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} — {j.customers?.name??''}</option>)}</select></label><label><span className="form-label">ชื่อรายการรับประกัน</span><input className="form-control" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label><span className="form-label">Serial Number</span><input className="form-control" value={form.serial_number} onChange={e=>setForm({...form,serial_number:e.target.value})}/></label><label><span className="form-label">เริ่ม</span><input type="date" className="form-control" value={form.starts_on} onChange={e=>setForm({...form,starts_on:e.target.value})}/></label><label><span className="form-label">สิ้นสุด</span><input type="date" className="form-control" value={form.ends_on} onChange={e=>setForm({...form,ends_on:e.target.value})}/></label><label className="md:col-span-2 xl:col-span-3"><span className="form-label">เงื่อนไข</span><textarea className="form-control min-h-24" value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})}/></label></div><button className="btn-gold mt-4" onClick={createWarranty}><Plus size={16}/>บันทึกการรับประกัน</button></section>
      <section className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>รายการรับประกัน</h2><span className="text-xs text-muted-foreground">{records.length} รายการ</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{records.map(r=>{const expired=new Date(r.ends_on)<new Date();return <article key={r.id} className="rounded-2xl border border-border p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{r.jobs?.title??'—'} · {r.customers?.name??'—'}</p></div>{expired?<ShieldX className="text-red-300"/>:<ShieldCheck className="text-emerald-300"/>}</div><p className="mt-3 text-xs">{new Date(r.starts_on).toLocaleDateString('th-TH')} – {new Date(r.ends_on).toLocaleDateString('th-TH')}</p>{r.serial_number&&<p className="mt-1 text-[11px] text-gold">S/N: {r.serial_number}</p>}</article>})}</div></section>
      <section className="card-luxe p-4 sm:p-5"><h2 className="font-semibold text-gold">เปิดเคลม</h2><div className="mt-4 grid gap-3 md:grid-cols-[320px_1fr_auto]"><select className="form-control" value={claimForm.warranty_id} onChange={e=>setClaimForm({...claimForm,warranty_id:e.target.value})}><option value="">เลือกการรับประกัน</option>{records.filter(r=>r.status==='active').map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select><input className="form-control" placeholder="อาการหรือปัญหาที่แจ้งเคลม" value={claimForm.issue} onChange={e=>setClaimForm({...claimForm,issue:e.target.value})}/><button className="btn-gold" onClick={createClaim}><Plus size={16}/></button></div><div className="mt-4 space-y-2">{claims.map(c=><div key={c.id} className="rounded-xl border border-border p-3"><div className="flex justify-between"><p className="text-sm font-medium">{c.warranty_records?.title}</p><select className="rounded-lg border border-border bg-black/30 px-2 py-1 text-xs" value={c.status} onChange={async e=>{await (supabase as any).from('warranty_claims').update({status:e.target.value,resolved_at:e.target.value==='resolved'?new Date().toISOString():null}).eq('id',c.id);await load();}}><option value="open">เปิดเคลม</option><option value="inspecting">กำลังตรวจ</option><option value="approved">อนุมัติ</option><option value="rejected">ปฏิเสธ</option><option value="resolved">แก้ไขแล้ว</option><option value="cancelled">ยกเลิก</option></select></div><p className="mt-1 text-xs text-muted-foreground">{c.issue}</p></div>)}</div></section>
    </div>
  </PageShell>;
}
