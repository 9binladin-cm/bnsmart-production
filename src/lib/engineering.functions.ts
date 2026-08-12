import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ModeSchema = z.enum(["standard", "jom_yut"]);
const DEFAULT_LOCATION = "อำเภอบางใหญ่ จังหวัดนนทบุรี";
const ONLINE_DOMAINS = [
  "homepro.co.th",
  "thaiwatsadu.com",
  "dohome.co.th",
  "globalhouse.co.th",
  "scg.com",
  "shopee.co.th",
  "lazada.co.th",
];

type SearchItem = {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  price?: number | null;
  currency?: string;
  imageUrl?: string;
  rating?: number | null;
  position?: number;
  evidenceLevel: "search" | "scraped" | "manufacturer";
};

type LocalPlace = {
  title: string;
  address?: string;
  phone?: string;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
};

function ensureEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${name} ใน Environment Variables`);
  return value;
}

function text(value: unknown, max = 8000): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; }
}

function parsePrice(value: unknown): number | null {
  const raw = String(value ?? "").replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function assertPublicHttpUrl(raw: string): URL {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("รองรับเฉพาะ URL แบบ HTTP/HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local") || isPrivateIpv4(host)) {
    throw new Error("ไม่อนุญาต URL ภายในเครือข่าย");
  }
  return url;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 20000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    if (!response.ok) throw new Error(`External API ${response.status}: ${body.slice(0, 240)}`);
    try { return JSON.parse(body); } catch { throw new Error("External API ส่ง JSON ไม่ถูกต้อง"); }
  } finally {
    clearTimeout(timer);
  }
}


async function fetchRaw(url: string, init: RequestInit, timeoutMs = 20000): Promise<{ text: string; json: any | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    if (!response.ok) throw new Error(`External API ${response.status}: ${body.slice(0, 240)}`);
    let json: any | null = null;
    try { json = JSON.parse(body); } catch {}
    return { text: body, json };
  } finally {
    clearTimeout(timer);
  }
}

async function serper(path: "search" | "shopping" | "places" | "images", payload: Record<string, unknown>): Promise<any> {
  const apiKey = ensureEnv("SERPER_API_KEY");
  return fetchJson(`https://google.serper.dev/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify(payload),
  });
}

function normalizeOrganic(data: any): SearchItem[] {
  return (Array.isArray(data?.organic) ? data.organic : []).map((row: any, i: number) => ({
    title: text(row.title, 300),
    url: text(row.link, 2000),
    source: domainOf(text(row.link, 2000)),
    snippet: text(row.snippet, 1000),
    position: Number(row.position ?? i + 1),
    evidenceLevel: "search" as const,
  })).filter((row: SearchItem) => row.title && row.url);
}

function normalizeShopping(data: any): SearchItem[] {
  const rows = Array.isArray(data?.shopping) ? data.shopping : [];
  return rows.map((row: any, i: number) => ({
    title: text(row.title, 300),
    url: text(row.link ?? row.productLink, 2000),
    source: text(row.source, 160) || domainOf(text(row.link ?? row.productLink, 2000)),
    snippet: text(row.delivery ?? row.snippet, 600),
    price: parsePrice(row.price),
    currency: "THB",
    imageUrl: text(row.imageUrl, 2000) || undefined,
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : null,
    position: Number(row.position ?? i + 1),
    evidenceLevel: "search" as const,
  })).filter((row: SearchItem) => row.title && row.url);
}

function normalizePlaces(data: any): LocalPlace[] {
  const rows = Array.isArray(data?.places) ? data.places : [];
  return rows.slice(0, 5).map((row: any) => ({
    title: text(row.title, 240),
    address: text(row.address, 500) || undefined,
    phone: text(row.phoneNumber, 80) || undefined,
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : null,
    latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
    longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
    website: text(row.website, 2000) || undefined,
  }));
}

async function brightDataMarkdown(urlValue: string): Promise<{ url: string; markdown: string }> {
  const url = assertPublicHttpUrl(urlValue).toString();
  const apiKey = ensureEnv("BRIGHT_DATA_API_TOKEN");
  const zone = ensureEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE");
  const response = await fetchRaw("https://api.brightdata.com/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ zone, url, format: "raw", data_format: "markdown", country: "th" }),
  }, 45000);
  const data = response.json;
  const body = data?.body ?? data?.content ?? response.text;
  return { url, markdown: text(body, 12000) };
}

function extractJsonObject(raw: string): any {
  const stripped = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1));
  throw new Error("AI ไม่ได้ส่งผลลัพธ์ JSON ที่ตรวจสอบได้");
}

async function evidenceAgent(input: {
  task: string;
  modelText?: string;
  symptoms?: string;
  imageUrl?: string;
  evidence: Array<{ title: string; url: string; snippet?: string; content?: string; source: string }>;
}): Promise<any> {
  const apiKey = ensureEnv("LOVABLE_API_KEY");
  const evidencePayload = input.evidence.slice(0, 10).map((e, i) => ({
    id: `S${i + 1}`,
    title: e.title,
    url: e.url,
    source: e.source,
    text: text(e.content || e.snippet, 8000),
  }));
  const system = `คุณคือคณะวิศวกรซ่อมบำรุงแบบ Evidence-First
กฎบังคับ:
1) ใช้ข้อเท็จจริงจาก SOURCES ที่ให้มาเท่านั้น ห้ามเติมข้อมูลจากความจำหรือคาดเดา
2) ทุกข้อเท็จจริงต้องมี source_ids อ้างถึง S1... หากไม่มีหลักฐานให้ใช้ null และระบุ needs_evidence
3) แยก verified_facts, hypotheses และ inspection_steps ชัดเจน สมมติฐานไม่ใช่ข้อเท็จจริง
4) ห้ามระบุปีผลิต อายุอุปกรณ์ Part Number ค่าแรง ค่าวิศวกรรม ค่าแรงดัน ค่า Torque หรือค่ามาตรฐาน หากเอกสารไม่รองรับ
5) ขั้นตอนตรวจต้องเริ่มจากความปลอดภัย ใช้เครื่องมือวัดที่เหมาะสม และให้หยุดทันทีเมื่อเกินขอบเขตผู้ปฏิบัติงาน
6) ตอบ JSON เท่านั้น โครงสร้าง:
{
 "identity":{"equipment_type":string|null,"manufacturer":string|null,"model":string|null,"serial_number":string|null,"manufacture_year":number|null,"age_years":number|null,"source_ids":string[]},
 "verified_facts":[{"fact":string,"source_ids":string[]}],
 "parts":[{"name":string,"part_number":string|null,"compatible_models":string[],"price":number|null,"currency":"THB"|null,"source_ids":string[]}],
 "engineering_defaults":[{"name":string,"value":string|null,"unit":string|null,"source_ids":string[],"needs_evidence":boolean}],
 "hypotheses":[{"cause":string,"reason":string,"priority":1|2|3,"source_ids":string[]}],
 "inspection_steps":[{"step":number,"title":string,"instruction":string,"safety":string,"expected":string|null,"if_abnormal":string|null,"source_ids":string[]}],
 "repair_options":[{"title":string,"procedure":string[],"required_parts":string[],"source_ids":string[],"requires_specialist":boolean}],
 "needs_evidence":string[],
 "confidence":number
}`;
  const userText = `TASK: ${input.task}\nMODEL/NAMEPLATE TEXT: ${input.modelText ?? "ไม่ระบุ"}\nSYMPTOMS: ${input.symptoms ?? "ไม่ระบุ"}\nSOURCES:\n${JSON.stringify(evidencePayload)}`;
  const content: any[] = [{ type: "text", text: userText }];
  if (input.imageUrl) content.push({ type: "image_url", image_url: { url: input.imageUrl } });
  const response = await fetchJson("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content }],
    }),
  }, 60000);
  const raw = response?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI Agent ไม่ส่งผลลัพธ์");
  return extractJsonObject(raw);
}

const MaterialSearchSchema = z.object({
  query: z.string().min(2).max(300),
  location: z.string().min(2).max(200).default(DEFAULT_LOCATION),
  mode: ModeSchema.default("standard"),
  detailUrls: z.array(z.string().url()).max(8).default([]),
});

export const searchMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(MaterialSearchSchema)
  .handler(async ({ data, context }) => {
    const { consumeQuota } = await import("./quota.server");
    await consumeQuota(context.userId, data.mode === "jom_yut" ? "serper+brightdata" : "serper", data.mode, data.mode === "jom_yut" ? 6 : 30);
    const domainQuery = ONLINE_DOMAINS.map((d) => `site:${d}`).join(" OR ");
    const [shopping, organic, places] = await Promise.all([
      serper("shopping", { q: `${data.query} ราคา`, gl: "th", hl: "th", location: data.location, num: 20 }),
      serper("search", { q: `(${domainQuery}) ${data.query}`, gl: "th", hl: "th", location: data.location, num: 20 }),
      serper("places", { q: `${data.query} ร้านวัสดุ อำเภอบางใหญ่ นนทบุรี`, gl: "th", hl: "th", location: data.location, num: 5 }),
    ]);
    const dedupe = new Map<string, SearchItem>();
    [...normalizeShopping(shopping), ...normalizeOrganic(organic)].forEach((item) => {
      const key = `${item.url}|${item.title}`.toLowerCase();
      if (!dedupe.has(key)) dedupe.set(key, item);
    });
    const products = [...dedupe.values()].slice(0, 30);
    let scraped: Array<{ url: string; markdown: string }> = [];
    if (data.mode === "jom_yut") {
      const targets = (data.detailUrls.length ? data.detailUrls : products.map((p) => p.url)).slice(0, 6);
      const settled = await Promise.allSettled(targets.map(brightDataMarkdown));
      scraped = settled.filter((r): r is PromiseFulfilledResult<{ url: string; markdown: string }> => r.status === "fulfilled").map((r) => r.value);
      const scrapedSet = new Set(scraped.map((s) => s.url));
      products.forEach((p) => { if (scrapedSet.has(p.url)) p.evidenceLevel = "scraped"; });
    }
    return {
      query: data.query,
      location: data.location,
      mode: data.mode,
      products,
      localStores: normalizePlaces(places),
      scraped,
      searchedAt: new Date().toISOString(),
      warnings: [
        "ราคาและสต็อกต้องตรวจซ้ำที่หน้าร้านหรือหน้าสินค้าก่อนสั่งซื้อ",
        data.mode === "standard" ? "Standard ใช้ผลค้นหาและข้อความตัวอย่าง ไม่ได้เปิดอ่านทุกหน้า" : "จอมยุทธ์เปิดอ่านหน้าเว็บที่สำเร็จผ่าน Bright Data",
      ],
    };
  });

const EngineeringSchema = z.object({
  mode: ModeSchema.default("standard"),
  modelText: z.string().max(1000).default(""),
  symptoms: z.string().max(3000).default(""),
  imageUrl: z.string().url().optional(),
  selectedUrls: z.array(z.string().url()).max(10).default([]),
}).refine((d) => d.modelText.trim() || d.symptoms.trim() || d.imageUrl, "ต้องระบุรุ่น อาการ หรือรูปภาพอย่างน้อยหนึ่งอย่าง");

export const researchEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(EngineeringSchema)
  .handler(async ({ data, context }) => {
    const { consumeQuota } = await import("./quota.server");
    await consumeQuota(context.userId, data.mode === "jom_yut" ? "engineering+brightdata" : "engineering", data.mode, data.mode === "jom_yut" ? 6 : 20);
    if (data.imageUrl) assertPublicHttpUrl(data.imageUrl);
    const seed = [data.modelText, data.symptoms].filter(Boolean).join(" ").slice(0, 600);
    const queries = [
      `${seed} official service manual pdf`,
      `${seed} parts catalog exploded view`,
      `${seed} datasheet specifications manufacturer`,
      `${seed} error code troubleshooting`,
    ];
    const searchRows = await Promise.all(queries.map((q) => serper("search", { q, gl: "th", hl: "th", num: 10 })));
    const results = searchRows.flatMap(normalizeOrganic);
    const dedupe = new Map<string, SearchItem>();
    results.forEach((r) => { if (!dedupe.has(r.url)) dedupe.set(r.url, r); });
    const evidenceResults = [...dedupe.values()].slice(0, 24);
    const selected = (data.selectedUrls.length ? data.selectedUrls : evidenceResults.map((r) => r.url)).slice(0, data.mode === "jom_yut" ? 8 : 0);
    let scraped: Array<{ url: string; markdown: string }> = [];
    if (data.mode === "jom_yut") {
      const settled = await Promise.allSettled(selected.map(brightDataMarkdown));
      scraped = settled.filter((r): r is PromiseFulfilledResult<{ url: string; markdown: string }> => r.status === "fulfilled").map((r) => r.value);
    }
    const scrapedByUrl = new Map(scraped.map((s) => [s.url, s.markdown]));
    const evidence = evidenceResults.slice(0, 10).map((r) => ({
      title: r.title,
      url: r.url,
      source: r.source,
      snippet: r.snippet,
      content: scrapedByUrl.get(r.url),
      evidenceLevel: scrapedByUrl.has(r.url) ? "scraped" : "search",
    }));
    let analysis: any = null;
    let agentError: string | null = null;
    try {
      analysis = await evidenceAgent({
        task: "ระบุอุปกรณ์ อะไหล่ ข้อมูลวิศวกรรม วิเคราะห์อาการ สร้างขั้นตอนตรวจและแนวทางซ่อมแบบอ้างอิงหลักฐาน",
        modelText: data.modelText,
        symptoms: data.symptoms,
        imageUrl: data.imageUrl,
        evidence,
      });
    } catch (error) {
      agentError = error instanceof Error ? error.message : "AI Agent ล้มเหลว";
    }
    return {
      mode: data.mode,
      analysis,
      evidence,
      agentError,
      searchedAt: new Date().toISOString(),
      policy: {
        factsRequireSources: true,
        unknownInsteadOfGuess: true,
        hypothesesRequireInspection: true,
      },
    };
  });

export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    serper: Boolean(process.env.SERPER_API_KEY),
    lovableAi: Boolean(process.env.LOVABLE_API_KEY),
    brightData: Boolean(process.env.BRIGHT_DATA_API_TOKEN && process.env.BRIGHT_DATA_WEB_UNLOCKER_ZONE),
    checkedAt: new Date().toISOString(),
  }));
