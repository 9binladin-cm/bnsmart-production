import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/" }); });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("ยินดีต้อนรับ");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("สมัครสมาชิกสำเร็จ");
      }
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-luxe w-full max-w-sm p-7">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size={88} className="drop-shadow-[0_0_30px_rgba(201,162,74,0.45)]" />
          <h1 className="mt-3 text-xl font-bold text-gold">ช่างเดย์เนรมิตร</h1>
          <p className="text-[11px] tracking-widest text-muted-foreground">SMART REPAIR & RENOVATION</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl border border-border bg-muted/40 p-1 text-sm">
          <button onClick={() => setMode("in")} className={`rounded-lg py-2 font-medium transition ${mode === "in" ? "bg-gold text-primary-foreground" : "text-muted-foreground"}`}>เข้าสู่ระบบ</button>
          <button onClick={() => setMode("up")} className={`rounded-lg py-2 font-medium transition ${mode === "up" ? "bg-gold text-primary-foreground" : "text-muted-foreground"}`}>สมัครสมาชิก</button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">อีเมล</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 outline-none focus:border-gold" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">รหัสผ่าน</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 outline-none focus:border-gold" />
          </label>
          <button disabled={loading} className="btn-gold mt-2 w-full disabled:opacity-60">
            {loading ? "กำลังดำเนินการ…" : mode === "in" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>
      </div>
    </div>
  );
}
