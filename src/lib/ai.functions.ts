import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Standardize free-form text into professional Thai/English document wording
// using Lovable AI Gateway (no user API key needed).
export const standardizeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
      text: z.string().min(1).max(4000),
      context: z.string().max(120).optional(), // e.g. "รายการงาน", "หมายเหตุ", "เงื่อนไขการชำระเงิน"
      language: z.enum(["th", "en"]).default("th"),
    }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const sys = data.language === "th"
      ? `คุณคือผู้เชี่ยวชาญด้านเอกสารธุรกิจงานช่างและงานบริการ ทั้งในและต่างประเทศ
หน้าที่: แปลงข้อความสั้นๆ ไม่เป็นทางการของผู้ใช้ ให้เป็นภาษามาตรฐานทางเอกสารที่สุภาพ กระชับ เป็นมืออาชีพ
- คงความหมายเดิม ห้ามเพิ่มข้อมูล/ตัวเลข/ราคา ที่ผู้ใช้ไม่ได้ระบุ
- ใช้คำศัพท์วิชาชีพงานช่าง (เช่น "ล้างแอร์" → "ล้างทำความสะอาดเครื่องปรับอากาศ พร้อมฆ่าเชื้อและเช็คระบบ")
- ถ้าเป็นรายการหลายบรรทัด ให้จัดเป็น bullet ด้วย "• "
- ตอบเฉพาะข้อความที่ปรับแล้ว ห้ามมีคำอธิบาย ห้ามใส่เครื่องหมายคำพูด ห้ามใส่ Markdown code fence`
      : `You are a professional documentation specialist for trade/service businesses.
Rewrite the user's informal text into standard, polished document wording.
- Preserve original meaning. Do not invent facts, numbers, or prices.
- Use proper industry terminology.
- Multi-line inputs should be formatted as "• " bullets.
- Reply with the rewritten text only. No quotes, no markdown, no explanation.`;

    const user = `บริบท (context): ${data.context ?? "ข้อความในเอกสาร"}
ข้อความต้นฉบับ:
"""
${data.text}
"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const out = json?.choices?.[0]?.message?.content?.trim() ?? "";
    return { text: out.replace(/^["'`]+|["'`]+$/g, "") };
  });
