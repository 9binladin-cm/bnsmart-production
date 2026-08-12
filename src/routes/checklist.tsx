import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { ListChecks, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/checklist")({
  ssr: false,
  validateSearch: z.object({ jobId: z.string().optional() }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Checklist,
});

function Checklist() {
  const { jobId } = Route.useSearch();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | undefined>(jobId);
  const [items, setItems] = useState<any[]>([]);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    supabase.from("jobs").select("id,title").order("created_at", { ascending: false }).then(({ data }) => {
      setJobs(data ?? []);
      if (!selected && data?.[0]) setSelected(data[0].id);
    });
  }, []);
  useEffect(() => {
    if (!selected) return;
    supabase.from("checklist_items").select("*").eq("job_id", selected).order("created_at").then(({ data }) => setItems(data ?? []));
  }, [selected]);

  async function toggle(id: string, checked: boolean) {
    await supabase.from("checklist_items").update({ checked }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, checked } : i));
  }
  async function add() {
    if (!newLabel.trim() || !selected) return;
    const { data: user } = await supabase.auth.getUser();
    const { data } = await supabase.from("checklist_items").insert({
      user_id: user.user!.id, job_id: selected, label: newLabel,
    }).select().single();
    if (data) setItems([...items, data]);
    setNewLabel("");
  }
  async function remove(id: string) {
    await supabase.from("checklist_items").delete().eq("id", id);
    setItems(items.filter(i => i.id !== id));
  }

  return (
    <PageShell title="Checklist" subtitle="อุปกรณ์ / วัสดุประจำงาน">
      {jobs.length === 0 ? (
        <div className="card-luxe p-8 text-center">
          <ListChecks size={36} className="mx-auto text-gold" />
          <p className="mt-3 text-sm">สร้างงานก่อนเพื่อใช้ Checklist</p>
        </div>
      ) : (
        <>
          <select value={selected ?? ""} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl border border-border bg-input/40 px-3 py-2.5">
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>

          <ul className="mt-4 space-y-2">
            {items.map(i => (
              <li key={i.id} className="card-luxe flex items-center gap-3 p-3">
                <input type="checkbox" checked={i.checked} onChange={(e) => toggle(i.id, e.target.checked)}
                  className="h-5 w-5 accent-[var(--gold)]" />
                <span className={`min-w-0 flex-1 text-sm ${i.checked ? "line-through opacity-60" : ""}`}>{i.label}</span>
                <button onClick={() => remove(i.id)} className="text-destructive"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="เพิ่มรายการ…"
              className="flex-1 rounded-xl border border-border bg-input/40 px-3 py-2" />
            <button onClick={add} className="btn-gold flex items-center gap-1"><Plus size={14} /> เพิ่ม</button>
          </div>
        </>
      )}
    </PageShell>
  );
}
