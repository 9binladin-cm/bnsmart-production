import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/jobs/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: JobsList,
});

function JobsList() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("jobs").select("*, customers(name)").order("created_at", { ascending: false })
      .then(({ data }) => { setJobs(data ?? []); setLoading(false); });
  }, []);

  return (
    <PageShell title="Jobs" subtitle="ประวัติงานทั้งหมด">
      {loading ? (
        <div className="card-luxe p-6 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : jobs.length === 0 ? (
        <div className="card-luxe p-10 text-center">
          <Briefcase className="mx-auto text-gold" size={36} />
          <p className="mt-3 font-medium">ยังไม่มีงาน</p>
          <p className="mt-1 text-xs text-muted-foreground">ไปที่ "เข้าประเมินงาน" เพื่อเริ่มสร้างงานแรก</p>
          <Link to="/assess" className="btn-gold mt-5 inline-block">เริ่มประเมินงาน</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="card-luxe flex items-center justify-between p-4 transition hover:-translate-y-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{j.title}</p>
                    <StatusBadge status={j.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {j.customers?.name ?? "—"} · {new Date(j.created_at).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-gold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
