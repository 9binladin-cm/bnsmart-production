import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { searchMaterials } from "@/lib/engineering.functions";
import { toast } from "sonner";
import { ExternalLink, MapPin, Search, ShieldCheck, Sparkles, Store, Wrench } from "lucide-react";

export const Route = createFileRoute("/materials")({
  ssr: false,
  validateSearch: z.object({ jobId: z.string().optional() }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: MaterialsPage,
});

type Result = Awaited<ReturnType<typeof searchMaterials>>;

function formatMoney(value: number | null | undefined) {
  if (value == null) return "ตรวจสอบราคา";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(value);
}

function MaterialsPage() {
  const { jobId: initialJobId } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("อำเภอบางใหญ่ จังหวัดนนทบุรี");
  const [mode, setMode] = useState<"standard" | "jom_yut">("standard");
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [jobs, setJobs] = useState<any[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (supabase as any).from("jobs").select("id,title,status").order("created_at", { ascending: false }).limit(100)
      .then(({ data }: any) => setJobs(data ?? []));
  }, []);

  const cheapest = useMemo(() => {
    const priced = (result?.products ?? []).filter((p: any) => typeof p.price === "number");
    return priced.sort((a: any, b: any) => a.price - b.price)[0];
  }, [result]);

  async function runSearch() {
    if (query.trim().length < 2) return toast.error("กรอกชื่อสินค้า รุ่น หรือ Part Number");
    setLoading(true);
    try {
      const data = await searchMaterials({ data: { query: query.trim(), location, mode, detailUrls: [] } });
      setResult(data);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await (supabase as any).from("material_searches").insert({
          user_id: userData.user.id,
          job_id: jobId || null,
          query: query.trim(),
          mode,
          location,
          results: data,
          evidence_count: data.scraped?.length ?? 0,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function addToJob(item: any) {
    if (!jobId) return toast.error("เลือก JOB ก่อนเพิ่มวัสดุ");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await (supabase as any).from("job_materials").insert({
      user_id: userData.user.id,
      job_id: jobId,
      name: item.title,
      quantity: 1,
      actual_quantity: 0,
      unit: "ชิ้น",
      unit_cost: item.price ?? 0,
      source_name: item.source,
      source_url: item.url,
      source_type: item.evidenceLevel === "scraped" ? "brightdata" : "serper",
      evidence: { title: item.title, snippet: item.snippet ?? null, searched_at: result?.searchedAt ?? null },
      status: "planned",
    });
    if (error) return toast.error(error.message);
    toast.success("เพิ่มวัสดุเข้า JOB แล้ว");
  }

  return (
    <PageShell title="Material Intelligence" subtitle="ค้นหา เปรียบเทียบ และส่งวัสดุเข้า JOB จากข้อมูลจริง">
      <div className="space-y-4">
        <section className="card-luxe p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_220px]">
            <label>
              <span className="form-label">สินค้า / รุ่น / Part Number</span>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-gold" size={17} />
                <input className="form-control pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="เช่น Hitachi WM-P250GX, ท่อ PVC 2 นิ้ว" onKeyDown={(e) => e.key === "Enter" && runSearch()} />
              </div>
            </label>
            <label>
              <span className="form-label">พื้นที่ค้นหาร้านออฟไลน์</span>
              <input className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label>
              <span className="form-label">JOB ปลายทาง</span>
              <select className="form-control" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">ยังไม่เพิ่มเข้า JOB</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className={`section-tab ${mode === "standard" ? "is-active" : ""}`} onClick={() => setMode("standard")}>
              Serper Standard
            </button>
            <button className={`section-tab ${mode === "jom_yut" ? "is-active" : ""}`} onClick={() => setMode("jom_yut")}>
              <Sparkles size={13} className="inline" /> จอมยุทธ์ Bright Data
            </button>
            <button className="btn-gold ml-auto" onClick={runSearch} disabled={loading}>
              {loading ? "กำลังค้นหา…" : "ค้นหาข้อมูลจริง"}
            </button>
          </div>
        </section>

        {result && (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <div className="metric-card">
                <div className="metric-label"><ShieldCheck size={17} className="text-gold" />โหมดหลักฐาน</div>
                <div className="metric-value text-xl">{result.mode === "jom_yut" ? "Scraped" : "Search"}</div>
                <div className="metric-note">เปิดอ่านสำเร็จ {result.scraped?.length ?? 0} หน้า</div>
              </div>
              <div className="metric-card">
                <div className="metric-label"><Store size={17} className="text-gold" />สินค้าออนไลน์</div>
                <div className="metric-value">{result.products.length}</div>
                <div className="metric-note">รวมผลและตัดรายการซ้ำแล้ว</div>
              </div>
              <div className="metric-card">
                <div className="metric-label"><MapPin size={17} className="text-gold" />ร้านบางใหญ่</div>
                <div className="metric-value">{result.localStores.length}</div>
                <div className="metric-note">สูงสุด 5 ร้านในพื้นที่</div>
              </div>
            </section>

            {cheapest && (
              <section className="card-luxe border-gold/40 p-4">
                <p className="text-xs text-muted-foreground">ราคาต่ำสุดที่พบจากผลค้นหาครั้งนี้</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gold">{cheapest.title}</p>
                    <p className="text-sm">{formatMoney(cheapest.price)} · {cheapest.source}</p>
                  </div>
                  <button className="btn-gold" onClick={() => addToJob(cheapest)}>เพิ่มเข้า JOB</button>
                </div>
              </section>
            )}

            <section className="card-luxe p-4 sm:p-5">
              <div className="panel-title"><h2>ผลสินค้าออนไลน์</h2><span className="text-xs text-muted-foreground">ตรวจราคาและสต็อกก่อนซื้อทุกครั้ง</span></div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.products.map((item: any, i: number) => (
                  <article key={`${item.url}-${i}`} className="rounded-2xl border border-border bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-gold">{formatMoney(item.price)}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] ${item.evidenceLevel === "scraped" ? "border-emerald-500/40 text-emerald-300" : "border-gold/30 text-gold"}`}>
                        {item.evidenceLevel === "scraped" ? "เปิดหน้าแล้ว" : "ผลค้นหา"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{item.snippet || item.source}</p>
                    <div className="mt-3 flex gap-2">
                      <a href={item.url} target="_blank" rel="noreferrer" className="icon-button h-10 w-10" aria-label="เปิดแหล่งข้อมูล"><ExternalLink size={15} /></a>
                      <button className="flex-1 rounded-xl border border-gold/30 px-3 text-xs text-gold hover:bg-gold/10" onClick={() => addToJob(item)}>
                        <Wrench size={14} className="mr-1 inline" /> เพิ่มเข้า JOB
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card-luxe p-4 sm:p-5">
              <div className="panel-title"><h2>ร้านออฟไลน์ อ.บางใหญ่</h2><span className="text-xs text-muted-foreground">5 ร้านแรกจาก Places</span></div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {result.localStores.map((shop: any, i: number) => (
                  <article key={`${shop.title}-${i}`} className="rounded-2xl border border-border p-4">
                    <Store size={20} className="text-gold" />
                    <p className="mt-2 text-sm font-semibold">{shop.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{shop.address || "ไม่พบที่อยู่"}</p>
                    {shop.phone && <p className="mt-2 text-xs text-gold">{shop.phone}</p>}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
