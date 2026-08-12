import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { researchEquipment } from "@/lib/engineering.functions";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import { AlertTriangle, Camera, CheckCircle2, ExternalLink, FlaskConical, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";

export const Route = createFileRoute("/engineering")({
  ssr: false,
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); },
  component: EngineeringPage,
});

type Research = Awaited<ReturnType<typeof researchEquipment>>;

function EngineeringPage(){
  const [mode,setMode]=useState<'standard'|'jom_yut'>('standard');
  const [modelText,setModelText]=useState('');
  const [symptoms,setSymptoms]=useState('');
  const [imageUrl,setImageUrl]=useState<string|undefined>();
  const [preview,setPreview]=useState<string|undefined>();
  const [uploading,setUploading]=useState(false);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<Research|null>(null);
  const [jobs,setJobs]=useState<any[]>([]); const [jobId,setJobId]=useState('');
  useEffect(()=>{(supabase as any).from('jobs').select('id,title').order('created_at',{ascending:false}).then(({data}:any)=>setJobs(data??[]));},[]);

  async function uploadImage(file:File){
    setUploading(true);
    try{
      const {data:u}=await supabase.auth.getUser(); if(!u.user)throw new Error('Unauthorized');
      const compressed=await compressImage(file,1600,.82); const path=`${u.user.id}/engineering/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const {error}=await supabase.storage.from('dayneramit').upload(path,compressed,{contentType:'image/jpeg',upsert:false}); if(error)throw error;
      const {data:signed,error:signError}=await supabase.storage.from('dayneramit').createSignedUrl(path,900); if(signError)throw signError;
      setImageUrl(signed.signedUrl); setPreview(URL.createObjectURL(compressed)); toast.success('อัปโหลดรูปแล้ว');
    }catch(e){toast.error(e instanceof Error?e.message:'อัปโหลดไม่สำเร็จ');}finally{setUploading(false);}
  }

  async function run(){
    if(!modelText.trim()&&!symptoms.trim()&&!imageUrl)return toast.error('ใส่รุ่น อาการ หรืออัปโหลดรูป');
    setLoading(true);setResult(null);
    try{
      const data=await researchEquipment({data:{mode,modelText,symptoms,imageUrl,selectedUrls:[]}}); setResult(data);
      const {data:u}=await supabase.auth.getUser(); if(u.user){const identity:any=data.analysis?.identity??{};await (supabase as any).from('engineering_cases').insert({user_id:u.user.id,job_id:jobId||null,mode,title:[identity.manufacturer,identity.model].filter(Boolean).join(' ')||modelText||'Engineering Research',equipment_type:identity.equipment_type??null,manufacturer:identity.manufacturer??null,model:identity.model??null,serial_number:identity.serial_number??null,manufacture_year:identity.manufacture_year??null,image_urls:imageUrl?[imageUrl]:[],symptoms,analysis:data.analysis??{},evidence:data.evidence??[],confidence:Number(data.analysis?.confidence??0),status:data.analysis?'ready':'needs_evidence'});}
    }catch(e){toast.error(e instanceof Error?e.message:'วิเคราะห์ไม่สำเร็จ');}finally{setLoading(false);}
  }

  const a:any=result?.analysis;
  return <PageShell title="AI Engineering Assistant" subtitle="หลักฐานก่อนข้อสรุป: ระบุอุปกรณ์ อะไหล่ ค่าอ้างอิง อาการเสีย และขั้นตอนตรวจ">
    <div className="space-y-4">
      <section className="card-luxe p-4 sm:p-5">
        <div className="flex flex-wrap gap-2"><button className={`section-tab ${mode==='standard'?'is-active':''}`} onClick={()=>setMode('standard')}>Standard · Serper + AI</button><button className={`section-tab ${mode==='jom_yut'?'is-active':''}`} onClick={()=>setMode('jom_yut')}><Sparkles size={13} className="inline"/> จอมยุทธ์ · Bright Data</button></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <label className="grid min-h-52 cursor-pointer place-items-center rounded-2xl border border-dashed border-gold/40 bg-black/20 p-4 text-center">
            {preview?<img src={preview} alt="อุปกรณ์" className="max-h-56 rounded-xl object-contain"/>:<div><Camera className="mx-auto text-gold"/><p className="mt-2 text-sm">ถ่ายหรืออัปโหลดรูป Nameplate/อุปกรณ์</p><p className="mt-1 text-[11px] text-muted-foreground">รูปชัด ตรง ไม่สะท้อนแสง</p></div>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0])}/>
          </label>
          <div className="space-y-3"><label><span className="form-label">ยี่ห้อ รุ่น Serial หรือข้อความบนป้าย</span><textarea className="form-control min-h-24" value={modelText} onChange={e=>setModelText(e.target.value)} placeholder="เช่น HITACHI WM-P250GX 250W 220V"/></label><label><span className="form-label">อาการเสียและสิ่งที่ตรวจพบ</span><textarea className="form-control min-h-28" value={symptoms} onChange={e=>setSymptoms(e.target.value)} placeholder="บอกอาการ เสียง กลิ่น รหัส Error ค่าที่วัด และเหตุการณ์ก่อนเสีย"/></label><label><span className="form-label">เชื่อมกับ JOB</span><select className="form-control" value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">ไม่เชื่อม JOB</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label><button className="btn-gold w-full" disabled={loading||uploading} onClick={run}><Search size={16}/>{loading?'กำลังรวบรวมหลักฐาน…':uploading?'กำลังอัปโหลด…':'เริ่มวิเคราะห์แบบไม่คาดเดา'}</button></div>
        </div>
      </section>

      {result&&<>
        <section className="card-luxe p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-gold"/><div><p className="font-semibold text-gold">Evidence Policy</p><p className="mt-1 text-xs text-muted-foreground">ข้อเท็จจริงต้องมี Source ID; ส่วนที่ไม่มีหลักฐานจะแสดงว่า “ต้องหาหลักฐานเพิ่ม”; สมมติฐานต้องตรวจหน้างานก่อน</p>{result.agentError&&<p className="mt-2 text-xs text-red-300">AI Agent: {result.agentError} — ยังแสดงแหล่งข้อมูลที่ค้นพบให้ตรวจเองได้</p>}</div></div></section>
        {a&&<>
          <section className="grid gap-3 md:grid-cols-3"><div className="metric-card"><div className="metric-label">อุปกรณ์</div><div className="metric-value text-lg">{a.identity?.equipment_type??'ยังยืนยันไม่ได้'}</div></div><div className="metric-card"><div className="metric-label">ยี่ห้อ / รุ่น</div><div className="metric-value text-lg">{[a.identity?.manufacturer,a.identity?.model].filter(Boolean).join(' ')||'ยังยืนยันไม่ได้'}</div></div><div className="metric-card"><div className="metric-label">Confidence</div><div className="metric-value text-lg">{Number(a.confidence||0).toFixed(0)}%</div></div></section>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card-luxe p-4 sm:p-5"><h2 className="flex items-center gap-2 font-semibold text-gold"><CheckCircle2 size={17}/>ข้อเท็จจริงที่ยืนยัน</h2><div className="mt-3 space-y-2">{(a.verified_facts??[]).map((x:any,i:number)=><div key={i} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-sm">{x.fact}</p><p className="mt-1 text-[10px] text-emerald-300">{(x.source_ids??[]).join(', ')}</p></div>)}{!(a.verified_facts??[]).length&&<p className="text-xs text-muted-foreground">ยังไม่มีข้อมูลที่ยืนยันได้</p>}</div></div>
            <div className="card-luxe p-4 sm:p-5"><h2 className="flex items-center gap-2 font-semibold text-gold"><FlaskConical size={17}/>สมมติฐานอาการเสีย</h2><div className="mt-3 space-y-2">{(a.hypotheses??[]).map((x:any,i:number)=><div key={i} className="rounded-xl border border-amber-500/20 p-3"><p className="text-sm font-medium">P{x.priority}: {x.cause}</p><p className="mt-1 text-xs text-muted-foreground">{x.reason}</p></div>)}</div></div>
          </section>
          <section className="card-luxe p-4 sm:p-5"><h2 className="flex items-center gap-2 font-semibold text-gold"><Wrench size={17}/>ขั้นตอนตรวจหน้างาน</h2><div className="mt-4 space-y-3">{(a.inspection_steps??[]).map((x:any)=><article key={x.step} className="rounded-2xl border border-border p-4"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold font-bold text-black">{x.step}</span><div><p className="font-semibold">{x.title}</p><p className="mt-1 text-sm text-muted-foreground">{x.instruction}</p><p className="mt-2 text-xs text-red-300">ความปลอดภัย: {x.safety}</p>{x.expected&&<p className="mt-1 text-xs text-emerald-300">ค่าที่คาดหวัง: {x.expected}</p>}{x.if_abnormal&&<p className="mt-1 text-xs text-gold">ถ้าผิดปกติ: {x.if_abnormal}</p>}</div></div></article>)}</div></section>
          <section className="grid gap-4 lg:grid-cols-2"><div className="card-luxe p-4"><h2 className="font-semibold text-gold">อะไหล่และ Part Number</h2><div className="mt-3 space-y-2">{(a.parts??[]).map((x:any,i:number)=><div key={i} className="rounded-xl border border-border p-3"><p className="text-sm font-medium">{x.name}</p><p className="text-xs text-muted-foreground">Part: {x.part_number??'ยังไม่มีหลักฐาน'} · ราคา: {x.price!=null?`฿${Number(x.price).toLocaleString()}`:'ยังไม่มีหลักฐาน'}</p></div>)}</div></div><div className="card-luxe p-4"><h2 className="font-semibold text-gold">ข้อมูลที่ยังขาด</h2><ul className="mt-3 space-y-2">{(a.needs_evidence??[]).map((x:string,i:number)=><li key={i} className="flex gap-2 text-sm"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300"/>{x}</li>)}</ul></div></section>
        </>}
        <section className="card-luxe p-4 sm:p-5"><div className="panel-title"><h2>แหล่งข้อมูล</h2><span className="text-xs text-muted-foreground">{result.evidence.length} แหล่ง</span></div><div className="mt-3 space-y-2">{result.evidence.map((e:any,i:number)=><a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 hover:border-gold"><div><p className="text-sm font-medium">S{i+1} · {e.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{e.source} · {e.evidenceLevel==='scraped'?'เปิดอ่านหน้าแล้ว':'ผลค้นหา/ข้อความตัวอย่าง'}</p></div><ExternalLink size={15} className="shrink-0 text-gold"/></a>)}</div></section>
      </>}
    </div>
  </PageShell>;
}
