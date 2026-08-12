import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Banknote, BriefcaseBusiness, CalendarDays, ClipboardCheck, PackageSearch, ReceiptText, TrendingUp, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatThaiDateTime } from "@/lib/date-time";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); },
  component: Dashboard,
});

const money=(n:unknown)=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n||0));

function Dashboard(){
  const [state,setState]=useState<any>({customers:0,jobs:0,surveys:0,quotations:0,upcoming:[],recentJobs:[],financials:[],payments:[]});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;(async()=>{const now=new Date().toISOString();const [customers,jobs,surveys,quotations,upcoming,recentJobs,financials,payments]=await Promise.all([
    (supabase as any).from('customers').select('id',{count:'exact',head:true}),
    (supabase as any).from('jobs').select('id',{count:'exact',head:true}),
    (supabase as any).from('site_surveys').select('id',{count:'exact',head:true}),
    (supabase as any).from('documents').select('id',{count:'exact',head:true}).eq('doc_type','quotation'),
    (supabase as any).from('bookings').select('*, customers(name)').gte('starts_at',now).neq('status','cancelled').order('starts_at').limit(5),
    (supabase as any).from('jobs').select('*, customers(name)').order('created_at',{ascending:false}).limit(6),
    (supabase as any).from('job_financial_summary').select('*'),
    (supabase as any).from('payments').select('amount,status').eq('status','confirmed'),
  ]);if(!mounted)return;setState({customers:customers.count??0,jobs:jobs.count??0,surveys:surveys.count??0,quotations:quotations.count??0,upcoming:upcoming.data??[],recentJobs:recentJobs.data??[],financials:financials.data??[],payments:payments.data??[]});setLoading(false);})();return()=>{mounted=false};},[]);
  const kpi=useMemo(()=>{const sales=state.financials.reduce((s:number,j:any)=>s+Number(j.selling_price),0);const cost=state.financials.reduce((s:number,j:any)=>s+Number(j.total_cost),0);const paid=state.payments.reduce((s:number,p:any)=>s+Number(p.amount),0);return{sales,cost,profit:sales-cost,paid,outstanding:state.financials.reduce((s:number,j:any)=>s+Number(j.outstanding_amount),0)};},[state]);
  const cards=[
    {label:'รายได้รับจริง',value:money(kpi.paid),note:`คงค้าง ${money(kpi.outstanding)}`,icon:Banknote,to:'/finance'},
    {label:'ต้นทุนรวม',value:money(kpi.cost),note:'วัสดุ + แรงงาน + อื่นๆ',icon:PackageSearch,to:'/reports'},
    {label:'กำไรขั้นต้น',value:money(kpi.profit),note:kpi.sales?`${(kpi.profit/kpi.sales*100).toFixed(1)}% ของมูลค่างาน`:'ยังไม่มีมูลค่างาน',icon:TrendingUp,to:'/reports'},
    {label:'งานทั้งหมด',value:state.jobs.toLocaleString('th-TH'),note:`ลูกค้า ${state.customers} ราย`,icon:BriefcaseBusiness,to:'/jobs'},
  ];
  return <PageShell title="Dashboard" subtitle="ภาพรวมธุรกิจ Day Neramit จากข้อมูลจริง">
    <div className="dashboard-grid">
      <div className="space-y-4">
        <section className="metric-grid">{cards.map(({label,value,note,icon:Icon,to})=><Link to={to as any} key={label} className="metric-card transition hover:-translate-y-0.5"><div className="metric-label"><Icon size={17} className="text-gold"/>{label}</div><div className="metric-value">{loading?'—':value}</div><div className="metric-note">{note}</div></Link>)}</section>
        <section className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>งานล่าสุด</h2><Link to="/jobs" className="inline-flex items-center gap-1 text-xs text-gold">ดูทั้งหมด <ArrowRight size={13}/></Link></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3">ชื่องาน</th><th className="pb-3">ลูกค้า</th><th className="pb-3">สถานะ</th><th className="pb-3 text-right">วันที่สร้าง</th></tr></thead><tbody>{state.recentJobs.map((j:any)=><tr key={j.id} className="border-b border-border/50"><td className="py-3"><Link to="/jobs/$jobId" params={{jobId:j.id}} className="text-gold hover:underline">{j.title}</Link></td><td>{j.customers?.name??'—'}</td><td><StatusBadge status={j.status}/></td><td className="text-right text-muted-foreground">{new Date(j.created_at).toLocaleDateString('th-TH')}</td></tr>)}</tbody></table></div></section>
        <section className="grid gap-3 sm:grid-cols-4">{[[Users,'Customer',state.customers,'/customers'],[ClipboardCheck,'Site Survey',state.surveys,'/surveys'],[ReceiptText,'Quotation',state.quotations,'/quotations'],[Wrench,'AI Engineering','PRO','/engineering']].map(([Icon,label,value,to]:any)=><Link key={label} to={to} className="card-luxe flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold"><Icon size={18}/></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold text-gold">{value}</p></div></Link>)}</section>
      </div>
      <aside className="space-y-4">
        <section className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>นัดหมายถัดไป</h2><CalendarDays size={17} className="text-gold"/></div><div className="mt-4 space-y-2">{state.upcoming.length?state.upcoming.map((b:any)=><Link key={b.id} to="/bookings" className="block rounded-xl border border-border p-3 hover:border-gold"><p className="text-sm font-medium">{b.title}</p><p className="mt-1 text-xs text-gold">{formatThaiDateTime(b.starts_at)}</p><p className="text-[11px] text-muted-foreground">{b.customers?.name??b.location??'—'}</p></Link>):<p className="text-xs text-muted-foreground">ยังไม่มีนัดหมาย</p>}</div></section>
        <section className="card-luxe p-4 sm:p-5"><h2 className="font-semibold text-gold">เมนูลัด</h2><div className="mt-3 grid grid-cols-2 gap-2"><Link to="/bookings" className="rounded-xl border border-border p-3 text-center text-xs hover:border-gold">สร้าง Booking</Link><Link to="/surveys" className="rounded-xl border border-border p-3 text-center text-xs hover:border-gold">สำรวจหน้างาน</Link><Link to="/materials" className="rounded-xl border border-border p-3 text-center text-xs hover:border-gold">ค้นหาวัสดุ</Link><Link to="/engineering" className="rounded-xl border border-border p-3 text-center text-xs hover:border-gold">AI วิศวกรรม</Link></div></section>
      </aside>
    </div>
  </PageShell>;
}
