import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { DOC_LABELS } from "@/lib/doc-utils";
import { FileText, Plus } from "lucide-react";

export const Route = createFileRoute("/documents/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Docs,
});

function Docs() {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("documents").select("*").order("created_at", { ascending: false }).then(({ data }) => setDocs(data ?? []));
  }, []);
  return (
    <PageShell title="เอกสารธุรกิจ" subtitle="7 ประเภทเอกสารสำหรับช่างมืออาชีพ">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(DOC_LABELS).map(([k, v]) => (
          <Link key={k} to="/documents/new" search={{ type: k }} className="card-luxe flex flex-col items-start gap-2 p-4 hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-primary-foreground"><FileText size={18} /></span>
            <span className="text-sm font-semibold">{v.th}</span>
            <span className="text-[11px] text-muted-foreground">{v.en}</span>
          </Link>
        ))}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-gold">เอกสารที่บันทึกล่าสุด</h3>
      {docs.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">ยังไม่มีเอกสารที่บันทึก</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link to="/documents/new" search={{ docId: d.id, type: d.doc_type }} className="card-luxe flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{DOC_LABELS[d.doc_type]?.th ?? d.doc_type} · {d.doc_no}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleString("th-TH")}</p>
                </div>
                <Plus size={16} className="rotate-45 text-gold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
