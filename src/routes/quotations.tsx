import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FilePenLine, FileText, Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { formatThaiDate } from "@/lib/date-time";

export const Route = createFileRoute("/quotations")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: QuotationsPage,
});

type Quotation = Tables<"documents"> & { jobs?: { title: string; customers?: { name: string } | null } | null };

function getPayloadCustomer(payload: Json): string | null {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return null;
  const customer = payload.customer;
  if (!customer || Array.isArray(customer) || typeof customer !== "object") return null;
  return typeof customer.name === "string" ? customer.name : null;
}

function getPayloadTotal(payload: Json): number {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return 0;
  const items = payload.items;
  if (!Array.isArray(items)) return 0;
  return items.reduce<number>((sum, item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return sum;
    const quantity = Number(item.quantity ?? 0);
    const price = Number(item.unit_price ?? 0);
    return sum + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(price) ? price : 0);
  }, 0);
}

function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*, jobs(title, customers(name))")
      .eq("doc_type", "quotation")
      .order("created_at", { ascending: false });
    if (error) toast.error(`โหลดใบเสนอราคาไม่สำเร็จ: ${error.message}`);
    setQuotations((data ?? []) as Quotation[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalValue = useMemo(() => quotations.reduce((sum, quotation) => sum + getPayloadTotal(quotation.payload), 0), [quotations]);
  const linkedJobs = useMemo(() => quotations.filter((quotation) => quotation.job_id).length, [quotations]);

  return (
    <PageShell
      title="Quotation"
      subtitle="สร้างและจัดการใบเสนอราคา โดยดึงข้อมูลจาก JOB ที่สร้างจาก Site Survey"
      actions={<Link to="/documents/new" search={{ type: "quotation" }} className="btn-gold !min-h-10 !px-3"><Plus size={16} /><span className="hidden sm:inline">สร้างใบเสนอราคา</span></Link>}
    >
      <section className="metric-grid">
        <div className="metric-card"><div className="metric-label"><ReceiptText size={17} className="text-gold" />ใบเสนอราคาทั้งหมด</div><div className="metric-value">{quotations.length}</div><div className="metric-note">เอกสารในระบบ</div></div>
        <div className="metric-card"><div className="metric-label"><FileText size={17} className="text-gold" />ผูกกับ JOB</div><div className="metric-value">{linkedJobs}</div><div className="metric-note">ตรวจสอบย้อนกลับได้</div></div>
        <div className="metric-card"><div className="metric-label"><FilePenLine size={17} className="text-gold" />มูลค่ารวม</div><div className="metric-value">฿{totalValue.toLocaleString("th-TH")}</div><div className="metric-note">ก่อน VAT ตามเอกสาร</div></div>
      </section>

      <section className="card-luxe mt-4 p-4 sm:p-5">
        <div className="panel-title"><h2>รายการใบเสนอราคา</h2><span className="text-xs text-muted-foreground">ล่าสุดก่อน</span></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-muted-foreground"><tr className="border-b border-border"><th className="pb-3 font-normal">เลขที่เอกสาร</th><th className="pb-3 font-normal">ลูกค้า / JOB</th><th className="pb-3 font-normal">วันที่ออก</th><th className="pb-3 text-right font-normal">ยอดรวม</th><th className="pb-3 text-right font-normal">จัดการ</th></tr></thead>
            <tbody>
              {quotations.map((quotation) => {
                const customer = quotation.jobs?.customers?.name ?? getPayloadCustomer(quotation.payload) ?? "ไม่ระบุลูกค้า";
                return (
                  <tr key={quotation.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium text-gold-soft">{quotation.doc_no || "ยังไม่มีเลขเอกสาร"}</td>
                    <td className="py-3"><p>{customer}</p><p className="text-[10px] text-muted-foreground">{quotation.jobs?.title ?? "ไม่ได้ผูก JOB"}</p></td>
                    <td className="py-3 text-muted-foreground">{formatThaiDate(quotation.issue_date)}</td>
                    <td className="py-3 text-right font-semibold text-gold">฿{getPayloadTotal(quotation.payload).toLocaleString("th-TH")}</td>
                    <td className="py-3 text-right"><Link to="/documents/new" search={{ docId: quotation.id, type: "quotation", jobId: quotation.job_id ?? undefined }} className="rounded-lg border border-border px-3 py-1.5 hover:border-gold">เปิดเอกสาร</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && quotations.length === 0 && <div className="empty-state"><ReceiptText className="mx-auto text-gold" size={34} /><p className="mt-3 font-medium">ยังไม่มีใบเสนอราคา</p><p className="mt-1 text-xs text-muted-foreground">สร้างจาก Site Survey → JOB หรือสร้างเอกสารใหม่</p></div>}
        </div>
      </section>
    </PageShell>
  );
}
