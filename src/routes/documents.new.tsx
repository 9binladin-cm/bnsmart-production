import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { DocumentPreview, type DocData, type DocVisibility } from "@/components/DocumentPreview";
import { DEFAULT_PROFILE } from "@/lib/brand";
import { BANK_OPTIONS, DOC_LABELS, SERVICE_ICONS, TEXT_PRESETS, getDocTypeConfig } from "@/lib/doc-utils";
import { standardizeText } from "@/lib/ai.functions";
import { autoCropQr } from "@/lib/qr-crop";
import { toast } from "sonner";
import { Download, Printer, Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/documents/new")({
  ssr: false,
  validateSearch: z.object({
    jobId: z.string().optional(),
    type: z.string().default("quotation"),
    docId: z.string().optional(),
    surveyId: z.string().optional(),
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: NewDoc,
});

const VIS_LABELS: { key: keyof DocVisibility; label: string }[] = [
  { key: "services", label: "แถบไอคอนบริการ" },
  { key: "issuer", label: "ข้อมูลผู้ออกเอกสาร" },
  { key: "customer", label: "ข้อมูลลูกค้า" },
  { key: "items", label: "ตารางรายการ" },
  { key: "notes", label: "หมายเหตุ" },
  { key: "totals", label: "สรุปยอดเงิน" },
  { key: "contact", label: "ช่องทางการติดต่อ" },
  { key: "payment_terms", label: "เงื่อนไขการชำระเงิน" },
  { key: "bank", label: "บัญชีธนาคาร" },
  { key: "qr", label: "QR ชำระเงิน" },
  { key: "signature", label: "ลายเซ็น" },
  { key: "footer_banner", label: "แถบตกแต่งด้านล่าง" },
];

function NewDoc() {
  const { jobId, type, docId, surveyId } = Route.useSearch();
  const initialCfg = getDocTypeConfig(type);
  const [data, setData] = useState<DocData>({
    doc_type: type,
    doc_no: `${initialCfg.docNoPrefix}-${Date.now().toString().slice(-8)}`,
    language: "th",
    theme: "gold",
    issue_date: new Date().toISOString().slice(0, 10),
    profile: { ...DEFAULT_PROFILE },
    customer: {},
    items: [],
    vat: false,
    notes: TEXT_PRESETS.notes[0],
    payment_terms: TEXT_PRESETS.payment_terms[0],
    services: SERVICE_ICONS.map((s) => s.key),
    visibility: { ...initialCfg.defaultSections },
    warranty_days: type === "warranty" ? 180 : undefined,
  });
  const [linkedSurveyId, setLinkedSurveyId] = useState<string | null>(surveyId ?? null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Auto-fit preview to container width; document stays 210mm for PDF
  useLayoutEffect(() => {
    function fit() {
      if (!previewWrapRef.current) return;
      const containerW = previewWrapRef.current.clientWidth;
      // 210mm ≈ 794px at 96dpi
      const s = Math.min(1, containerW / 794);
      setScale(s);
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").maybeSingle();
      const profile = { ...DEFAULT_PROFILE, ...(prof ?? {}) };
      let customer: any = {};
      let items: DocData["items"] = [];
      if (jobId) {
        const { data: job } = await supabase.from("jobs").select("*, customers(*), work_points(*)").eq("id", jobId).single();
        if (job) {
          customer = job.customers ?? {};
          if (job.survey_id) setLinkedSurveyId(job.survey_id);
          items = (job.work_points ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => {
            const mats = Array.isArray(p.materials)
              ? p.materials
                  .map((m: any) => typeof m === "string" ? m : `${m.name}${m.qty ? ` × ${m.qty}` : ""}${m.purpose ? ` — ${m.purpose}` : ""}${m.status === "buy" ? " 🛒" : ""}`)
                  .filter(Boolean)
                  .join("\n")
              : (p.materials ?? "");
            return {
              title: p.title,
              description: [p.description, p.approach, mats && `วัสดุ:\n${mats}`].filter(Boolean).join("\n"),
              quantity: Number(p.quantity),
              unit: p.unit,
              unit_price: Number(p.unit_price),
            };
          });
        }
      }
      if (surveyId && !jobId) {
        const { data: survey } = await supabase
          .from("site_surveys")
          .select("*, customers(*)")
          .eq("id", surveyId)
          .single();
        if (survey) {
          customer = survey.customers ?? customer;
          items = [{
            title: survey.title,
            description: [survey.issue_summary, survey.site_conditions, survey.recommendations].filter(Boolean).join("\n\n"),
            quantity: 1,
            unit: "งาน",
            unit_price: 0,
          }];
          setLinkedSurveyId(survey.id);
        }
      }
      if (docId) {
        const { data: d } = await supabase.from("documents").select("*").eq("id", docId).single();
        if (d) {
          const payload = (d.payload ?? {}) as any;
          const resolvedCustomer = Object.keys(customer).length > 0 ? customer : (payload.customer ?? {});
          setLinkedSurveyId(d.survey_id ?? surveyId ?? null);
          setData((prev) => ({
            ...prev,
            ...payload,
            doc_type: d.doc_type,
            doc_no: d.doc_no ?? prev.doc_no,
            language: d.language as any,
            theme: d.theme as any,
            issue_date: d.issue_date,
            profile,
            customer: resolvedCustomer,
          }));
        }
      } else {
        setData((prev) => ({ ...prev, profile, customer, items, qr_url: prev.qr_url ?? profile.bank_qr_url ?? undefined }));
      }
    })();
  }, [jobId, docId, surveyId]);

  async function save() {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { profile, ...payload } = data;
      const row = {
        user_id: user.user!.id,
        job_id: jobId ?? null,
        survey_id: linkedSurveyId,
        doc_type: data.doc_type,
        doc_no: data.doc_no ?? null,
        language: data.language,
        theme: data.theme,
        issue_date: data.issue_date,
        due_date: data.due_date ?? null,
        payload: payload as any,
      };
      const q = docId
        ? supabase.from("documents").update(row).eq("id", docId)
        : supabase.from("documents").insert(row);
      const { error } = await q;
      if (error) throw error;
      if (data.doc_type === "quotation" && jobId) {
        const { error: jobError } = await supabase.from("jobs").update({ status: "quoted" }).eq("id", jobId);
        if (jobError) console.warn("update job quotation status failed", jobError);
      }
      toast.success("บันทึกเอกสารแล้ว");
    } catch (err: any) { toast.error(err.message); }
  }

  async function downloadPdf() {
    if (!previewRef.current) return;
    toast.loading("กำลังสร้าง PDF…", { id: "pdf" });
    try {
      const node = previewRef.current.querySelector("#doc-page") as HTMLElement;
      if (!node) throw new Error("ไม่พบเอกสารสำหรับสร้าง PDF");
      // html2canvas-pro supports modern CSS (oklch, color-mix) that Tailwind v4 emits.
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      // Neutralize transform:scale on the preview wrapper so capture matches true A4 size.
      const wrapper = previewRef.current as HTMLElement | null;
      const prevTransform = wrapper?.style.transform ?? "";
      const prevMinH = node.style.minHeight;
      if (wrapper) wrapper.style.transform = "none";
      // Let the doc collapse to its actual content height so short docs = 1 page.
      node.style.minHeight = "auto";
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 15000,
        });
      } finally {
        if (wrapper) wrapper.style.transform = prevTransform;
        node.style.minHeight = prevMinH;
      }
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const pageW = 210, pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= pageH + 1) {
        const img = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(img, "JPEG", 0, 0, imgW, imgH);
      } else {
        // Slice the canvas into page-sized chunks (avoids blank pages).
        const pxPerMm = canvas.width / pageW;
        const pagePx = Math.floor(pageH * pxPerMm);
        let y = 0;
        let first = true;
        while (y < canvas.height) {
          const sliceH = Math.min(pagePx, canvas.height - y);
          const c = document.createElement("canvas");
          c.width = canvas.width; c.height = sliceH;
          c.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const img = c.toDataURL("image/jpeg", 0.95);
          const hMM = (sliceH / pxPerMm);
          if (!first) pdf.addPage();
          pdf.addImage(img, "JPEG", 0, 0, imgW, hMM);
          y += sliceH;
          first = false;
        }
      }
      const filename = `${DOC_LABELS[data.doc_type]?.th ?? "document"}-${data.doc_no ?? Date.now()}.pdf`;
      pdf.save(filename);
      toast.success("ดาวน์โหลด PDF แล้ว", { id: "pdf" });
    } catch (err: any) {
      console.error("PDF export failed", err);
      toast.error(err?.message ?? "สร้าง PDF ไม่สำเร็จ", { id: "pdf" });
    }
  }

  function updateItem(i: number, patch: Partial<DocData["items"][number]>) {
    setData({ ...data, items: data.items.map((x, j) => j === i ? { ...x, ...patch } : x) });
  }

  function toggleVis(k: keyof DocVisibility) {
    const cfg = getDocTypeConfig(data.doc_type);
    const cur = { ...cfg.defaultSections, ...(data.visibility ?? {}) };
    setData({ ...data, visibility: { ...cur, [k]: !cur[k] } });
  }

  // When user switches document type, re-apply that type's professional defaults
  // (sections + signer/labels via preview) and update the doc-number prefix.
  function changeDocType(next: string) {
    const cfg = getDocTypeConfig(next);
    setData((prev) => ({
      ...prev,
      doc_type: next,
      visibility: { ...cfg.defaultSections },
      doc_no: `${cfg.docNoPrefix}-${Date.now().toString().slice(-8)}`,
      warranty_days: next === "warranty" ? (prev.warranty_days ?? 180) : prev.warranty_days,
    }));
  }

  async function standardize(context: string, text: string, apply: (t: string) => void) {
    if (!text.trim()) { toast.error("ยังไม่มีข้อความให้ปรับ"); return; }
    toast.loading("กำลังปรับข้อความ…", { id: "ai" });
    try {
      const res = await standardizeText({ data: { text, context, language: data.language } });
      apply(res.text);
      toast.success("ปรับมาตรฐานข้อความแล้ว", { id: "ai" });
    } catch (e: any) {
      toast.error(e.message ?? "AI ไม่พร้อมใช้งาน", { id: "ai" });
    }
  }

  function toggleService(k: string) {
    const cur = data.services ?? SERVICE_ICONS.map((s) => s.key);
    setData({ ...data, services: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  }

  async function uploadTo(field: "logo_url" | "qr_url" | "signature_url", file: File) {
    toast.loading("กำลังอัปโหลด…", { id: "upl" });
    try {
      const { data: user, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user.user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
      const processed = field === "qr_url" ? await autoCropQr(file).catch(() => file) : file;
      const contentType = processed.type || file.type || "image/png";
      const ext = (contentType.split("/")[1] || "png").replace("jpeg", "jpg");
      const safeName = `${Date.now()}.${ext}`;
      const path = `${user.user.id}/${field}/${safeName}`;
      const { error } = await supabase.storage
        .from("dayneramit")
        .upload(path, processed, { contentType, upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage
        .from("dayneramit")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("สร้างลิงก์รูปไม่สำเร็จ");
      setData((prev) => ({ ...prev, [field]: signed.signedUrl }));
      toast.success("อัปโหลดสำเร็จ", { id: "upl" });
    } catch (e: any) {
      console.error("upload failed", e);
      toast.error(e?.message ?? "อัปโหลดไม่สำเร็จ", { id: "upl" });
    }
  }

  const scaledHeight = 1123 * scale; // A4 height at 96dpi

  return (
    <PageShell
      title={DOC_LABELS[data.doc_type]?.th ?? "เอกสาร"}
      subtitle="แก้ไข → บันทึก → ดาวน์โหลด PDF (เอกสารคงขนาด A4)"
      back={jobId ? "/jobs/" + jobId : "/documents"}
      actions={
        <button onClick={save} className="grid h-10 w-10 place-items-center rounded-full bg-gold text-primary-foreground" aria-label="บันทึก"><Save size={16} /></button>
      }
    >
      {/* Basic controls */}
      <div className="card-luxe space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs"><span className="text-muted-foreground">ประเภทเอกสาร</span>
            <select value={data.doc_type} onChange={(e) => changeDocType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2">

              {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
            </select>
          </label>
          <label className="text-xs"><span className="text-muted-foreground">เลขที่เอกสาร</span>
            <input value={data.doc_no ?? ""} onChange={(e) => setData({ ...data, doc_no: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2" />
          </label>
          <label className="text-xs"><span className="text-muted-foreground">ภาษา</span>
            <select value={data.language} onChange={(e) => setData({ ...data, language: e.target.value as any })}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2">
              <option value="th">ไทย</option><option value="en">English</option>
            </select>
          </label>
          <label className="text-xs"><span className="text-muted-foreground">วันที่</span>
            <input type="date" value={data.issue_date} onChange={(e) => setData({ ...data, issue_date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!data.vat} onChange={(e) => setData({ ...data, vat: e.target.checked })} />
          รวมภาษีมูลค่าเพิ่ม 7%
        </label>
      </div>

      {/* Section visibility toggles */}
      <div className="card-luxe mt-4 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gold">แสดง/ซ่อน ส่วนต่างๆ ในเอกสาร</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {VIS_LABELS.map((v) => (
            <label key={v.key} className="flex items-center gap-2 rounded-lg border border-border px-2 py-2">
              <input type="checkbox" checked={data.visibility?.[v.key] ?? true} onChange={() => toggleVis(v.key)} />
              <span>{v.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Service icons */}
      <div className="card-luxe mt-4 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gold">ไอคอนบริการที่แสดง</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {SERVICE_ICONS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 rounded-lg border border-border px-2 py-2">
              <input type="checkbox" checked={(data.services ?? []).includes(s.key)} onChange={() => toggleService(s.key)} />
              <span>{s.icon} {s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Bank picker */}
      <div className="card-luxe mt-4 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gold">ธนาคารสำหรับรับชำระเงิน</h3>
        <select value={data.profile.bank_name ?? ""} onChange={(e) => setData({ ...data, profile: { ...data.profile, bank_name: e.target.value } })}
          className="w-full rounded-lg border border-border bg-input/40 px-2 py-2 text-sm">
          {BANK_OPTIONS.map((b) => <option key={b.key} value={b.name}>{b.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label><span className="text-muted-foreground">เลขที่บัญชี</span>
            <input value={data.profile.bank_account_no ?? ""} onChange={(e) => setData({ ...data, profile: { ...data.profile, bank_account_no: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2" /></label>
          <label><span className="text-muted-foreground">ชื่อบัญชี</span>
            <input value={data.profile.bank_account_name ?? ""} onChange={(e) => setData({ ...data, profile: { ...data.profile, bank_account_name: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2" /></label>
        </div>
      </div>

      {/* Preset text blocks */}
      <div className="card-luxe mt-4 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gold">ชุดข้อความสำเร็จรูป (เลือกแล้วแก้ไขได้)</h3>

        <PresetBlock
          label="Tagline (ใต้ชื่อบริษัท)"
          value={data.profile.tagline ?? ""}
          presets={TEXT_PRESETS.tagline}
          onChange={(t) => setData({ ...data, profile: { ...data.profile, tagline: t } })}
          onStandardize={(t, apply) => standardize("Tagline โปรโมทธุรกิจงานช่าง", t, apply)}
          rows={2}
        />
        <PresetBlock
          label="หมายเหตุ"
          value={data.notes ?? ""}
          presets={TEXT_PRESETS.notes}
          onChange={(t) => setData({ ...data, notes: t })}
          onStandardize={(t, apply) => standardize("หมายเหตุในเอกสาร", t, apply)}
          rows={5}
        />
        <PresetBlock
          label="เงื่อนไขการชำระเงิน"
          value={data.payment_terms ?? ""}
          presets={TEXT_PRESETS.payment_terms}
          onChange={(t) => setData({ ...data, payment_terms: t })}
          onStandardize={(t, apply) => standardize("เงื่อนไขการชำระเงิน", t, apply)}
          rows={4}
        />

        {data.doc_type === "warranty" && (
          <>
            <label className="block text-xs"><span className="text-muted-foreground">ระยะเวลารับประกัน (วัน)</span>
              <input type="number" value={data.warranty_days || ""} placeholder="180" onChange={(e) => setData({ ...data, warranty_days: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-input/40 px-2 py-2" />
            </label>
            <PresetBlock
              label="ข้อความรับประกัน"
              value={data.notes ?? ""}
              presets={TEXT_PRESETS.warranty_note}
              onChange={(t) => setData({ ...data, notes: t })}
              rows={3}
            />
          </>
        )}
      </div>

      {/* Uploads */}
      <div className="card-luxe mt-4 p-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <UploadBtn label="โลโก้" onFile={(f) => uploadTo("logo_url", f)} url={data.logo_url} />
          <UploadBtn label="QR ชำระเงิน" onFile={(f) => uploadTo("qr_url", f)} url={data.qr_url} />
          <UploadBtn label="ลายเซ็น" onFile={(f) => uploadTo("signature_url", f)} url={data.signature_url} />
        </div>
      </div>

      {/* Items */}
      <div className="card-luxe mt-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gold">รายการในเอกสาร</h3>
          <button onClick={() => setData({ ...data, items: [...data.items, { title: "", quantity: 1, unit: "งาน", unit_price: 0 }] })}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:border-gold">+ เพิ่มรายการ</button>
        </div>
        <ul className="mt-3 space-y-2">
          {data.items.map((it, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1">
                <input value={it.title} onChange={(e) => updateItem(i, { title: e.target.value })} placeholder="รายการ (เช่น ล้างแอร์)"
                  className="w-full rounded-lg border border-border bg-input/40 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => standardize("ชื่อรายการงานช่างในเอกสาร (สั้น กระชับ)", it.title, (t) => updateItem(i, { title: t }))}
                  className="shrink-0 rounded-lg border border-gold/60 bg-gold/10 px-2 py-1.5 text-[11px] text-gold" title="ปรับมาตรฐาน">
                  <Sparkles size={12} />
                </button>
              </div>
              <div className="mt-2 flex items-start gap-1">
                <textarea value={it.description ?? ""} onChange={(e) => updateItem(i, { description: e.target.value })} rows={2} placeholder="รายละเอียด"
                  className="w-full rounded-lg border border-border bg-input/40 px-2 py-1.5 text-xs" />
                <button type="button" onClick={() => standardize("รายละเอียดงานช่างในเอกสาร", it.description ?? "", (t) => updateItem(i, { description: t }))}
                  className="shrink-0 rounded-lg border border-gold/60 bg-gold/10 px-2 py-1.5 text-[11px] text-gold" title="ปรับมาตรฐาน">
                  <Sparkles size={12} />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <input type="number" value={it.quantity || ""} placeholder="จำนวน" onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })} className="rounded-lg border border-border bg-input/40 px-2 py-1.5" />
                <input value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} className="rounded-lg border border-border bg-input/40 px-2 py-1.5" />
                <input type="number" value={it.unit_price || ""} placeholder="ราคา" onChange={(e) => updateItem(i, { unit_price: e.target.value === "" ? 0 : Number(e.target.value) })} className="rounded-lg border border-border bg-input/40 px-2 py-1.5" />
                <button onClick={() => setData({ ...data, items: data.items.filter((_, j) => j !== i) })} className="rounded-lg border border-border py-1 text-destructive">ลบ</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm hover:border-gold"><Printer size={16} /> พิมพ์</button>
        <button onClick={downloadPdf} className="btn-gold flex items-center justify-center gap-2"><Download size={16} /> ดาวน์โหลด PDF</button>
      </div>

      {/* Auto-fit preview (document itself stays A4) */}
      <div className="mt-6">
        <p className="mb-2 text-xs text-muted-foreground">พรีวิว A4 (ย่ออัตโนมัติสำหรับหน้าจอ • เอกสารจริงคงขนาดเต็ม)</p>
        <div ref={previewWrapRef} className="rounded-2xl bg-white/5 p-2 overflow-hidden" style={{ height: scaledHeight + 20 }}>
          <div ref={previewRef} data-doc-scaler style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }}>
            <DocumentPreview data={data} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PresetBlock({ label, value, presets, onChange, onStandardize, rows = 3 }: {
  label: string;
  value: string;
  presets: string[];
  onChange: (t: string) => void;
  onStandardize?: (t: string, apply: (n: string) => void) => void;
  rows?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {onStandardize && (
            <button
              type="button"
              onClick={() => onStandardize(value, onChange)}
              className="flex items-center gap-1 rounded-lg border border-gold/60 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/20"
              title="ปรับเป็นภาษามาตรฐานทางเอกสาร"
            >
              <Sparkles size={11} /> ปรับมาตรฐาน
            </button>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
            className="rounded-lg border border-border bg-input/40 px-2 py-1 text-[11px] max-w-[45%]"
          >
            <option value="">— ชุดข้อความ —</option>
            {presets.map((p, i) => (
              <option key={i} value={p}>{`ชุดที่ ${i + 1}: ${p.slice(0, 40).replace(/\n/g, " ")}${p.length > 40 ? "…" : ""}`}</option>
            ))}
          </select>
        </div>
      </div>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-input/40 px-2 py-2 text-xs" />
    </div>
  );
}

function UploadBtn({ label, url, onFile }: { label: string; url?: string; onFile: (f: File) => void }) {
  return (
    <label className="cursor-pointer rounded-lg border border-dashed border-border px-2 py-2 text-center hover:border-gold">
      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="text-[11px]">{url ? "✓ " : ""}{label}</div>
    </label>
  );
}
