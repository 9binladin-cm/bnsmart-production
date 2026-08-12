import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Banknote, BriefcaseBusiness, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/reports")({
  ssr: false,
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); },
  component: ReportsPage,
});
const money=(n:unknown)=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n||0));

function ReportsPage(){
  const [summary,setSummary]=useState<any[]>([]); const [payments,setPayments]=useState<any[]>([]); const [jobs,setJobs]=useState<any[]>([]);
  useEffect(()=>{Promise.all([(supabase as any).from('job_financial_summary').select('*'),(supabase as any).from('payments').select('amount,paid_at,status').eq('status','confirmed').order('paid_at'),(supabase as any).from('jobs').select('id,status,created_at,completed_at')]).then(([s,p,j])=>{setSummary(s.data??[]);setPayments(p.data??[]);setJobs(j.data??[]);});},[]);
  const kpi=useMemo(()=>{const revenue=payments.reduce((s,p)=>s+Number(p.amount),0);const cost=summary.reduce((s,j)=>s+Number(j.total_cost),0);const sales=summary.reduce((s,j)=>s+Number(j.selling_price),0);const completed=jobs.filter(j=>j.status==='completed').length;return{revenue,cost,sales,profit:sales-cost,completed,margin:sales?((sales-cost)/sales*100):0};},[summary,payments,jobs]);
  const monthly=useMemo(()=>{const map=new Map<string,{month:string,revenue:number}>();payments.forEach(p=>{const d=new Date(p.paid_at);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const row=map.get(key)??{month:d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'}),revenue:0};row.revenue+=Number(p.amount);map.set(key,row);});return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([,v])=>v);},[payments]);
  return <PageShell title="Dashboard & KPI" subtitle="รายได้ ต้นทุน กำไร งานคงค้าง และประสิทธิภาพการดำเนินงาน">
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[[Banknote,'รับเงินจริง',kpi.revenue],[BriefcaseBusiness,'มูลค่างาน',kpi.sales],[Activity,'ต้นทุนรวม',kpi.cost],[TrendingUp,'กำไรขั้นต้น',kpi.profit]].map(([Icon,label,value]:any)=><div key={label} className="metric-card"><div className="metric-label"><Icon size={17} className="text-gold"/>{label}</div><div className="metric-value text-xl">{money(value)}</div></div>)}</section>
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>รายรับรายเดือน</h2><span className="text-xs text-muted-foreground">สูงสุด 12 เดือน</span></div><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="rgba(221,177,75,.12)"/><XAxis dataKey="month" stroke="#9f9685" fontSize={11}/><YAxis stroke="#9f9685" fontSize={11}/><Tooltip contentStyle={{background:'#0d0d0d',border:'1px solid rgba(221,177,75,.3)',borderRadius:12}} formatter={(v:any)=>money(v)}/><Bar dataKey="revenue" fill="#ddb14b" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></div><div className="card-luxe p-4 sm:p-5"><h2 className="font-semibold text-gold">ประสิทธิภาพ</h2><div className="mt-5 space-y-5"><div><p className="text-xs text-muted-foreground">อัตรากำไรขั้นต้น</p><p className="mt-1 text-3xl font-semibold text-gold">{kpi.margin.toFixed(1)}%</p></div><div><p className="text-xs text-muted-foreground">งานเสร็จสิ้น</p><p className="mt-1 text-3xl font-semibold">{kpi.completed}</p></div><div><p className="text-xs text-muted-foreground">งานทั้งหมด</p><p className="mt-1 text-3xl font-semibold">{jobs.length}</p></div></div></div></section>
      <section className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>กำไรแยกตาม JOB</h2><span className="text-xs text-muted-foreground">ข้อมูลจากต้นทุนจริง</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3">JOB</th><th className="pb-3 text-right">ราคาขาย</th><th className="pb-3 text-right">วัสดุ</th><th className="pb-3 text-right">แรงงาน</th><th className="pb-3 text-right">ต้นทุนรวม</th><th className="pb-3 text-right">กำไร</th><th className="pb-3 text-right">คงค้าง</th></tr></thead><tbody>{summary.map(j=><tr key={j.job_id} className="border-b border-border/50"><td className="py-3">{j.title}</td><td className="text-right">{money(j.selling_price)}</td><td className="text-right">{money(j.material_cost)}</td><td className="text-right">{money(j.labor_cost)}</td><td className="text-right">{money(j.total_cost)}</td><td className={`text-right ${Number(j.gross_profit)>=0?'text-emerald-300':'text-red-300'}`}>{money(j.gross_profit)}</td><td className="text-right text-gold">{money(j.outstanding_amount)}</td></tr>)}</tbody></table></div></section>
    </div>
  </PageShell>;
}
