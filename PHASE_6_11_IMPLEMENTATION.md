# Day Neramit — Phase 6–11 Implementation

วันที่อัปเดต: 2 สิงหาคม 2569

## สถานะรวม

ดำเนินการต่อจาก Phase 1–5 โดยเพิ่มโมดูลปฏิบัติงาน ต้นทุน การเงิน รับประกัน KPI ระบบค้นหาวัสดุ และ AI Engineering แบบ Evidence-First พร้อมมาตรการ Production Hardening

## Phase 6 — JOB Management, Material & Labor

- ปรับหน้า JOB Detail เป็นแท็บ ภาพรวม / วัสดุ / แรงงาน / ค่าใช้จ่าย / เอกสาร
- บันทึกวัสดุที่วางแผน ซื้อ รับ ใช้ คืน หรือยกเลิก
- แยกจำนวนที่วางแผนและจำนวนใช้จริง
- เก็บร้านค้า URL แหล่งข้อมูล และ Evidence ของราคา
- บันทึกค่าแรงรายชั่วโมง รายวัน หรือเหมาจ่าย พร้อม OT เดินทาง และอาหาร
- บันทึกค่าใช้จ่ายอื่น
- คำนวณต้นทุนรวม ราคาขาย กำไร รับเงิน และยอดค้างจากข้อมูลจริง
- เพิ่ม Progress และ Completed timestamp

## Phase 7 — Receipt / Invoice / Payment

- เพิ่มหน้า `/finance`
- บันทึกรับชำระ แยกเงินสด โอน พร้อมเพย์ บัตร เช็ค และอื่น ๆ
- เชื่อม JOB, Customer และเอกสาร
- ติดตามยอดรับจริงและยอดคงค้าง
- เชื่อมการสร้างใบรับเงิน ใบเสร็จ และใบส่งมอบ

## Phase 8 — Warranty & Claim

- เพิ่มหน้า `/warranty`
- สร้างระยะรับประกันจาก JOB
- รองรับ Serial Number เงื่อนไข วันเริ่ม และวันสิ้นสุด
- เปิดเคลม ติดตามตรวจสอบ อนุมัติ ปฏิเสธ แก้ไข หรือยกเลิก
- แสดงรายการใกล้หมดอายุภายใน 30 วัน

## Phase 9 — Dashboard & KPI

- Dashboard อ่านยอดรับจริง ต้นทุนรวม กำไร และยอดค้าง
- เพิ่มหน้า `/reports`
- กราฟรายรับรายเดือน
- ตารางกำไรแยก JOB จากวัสดุ แรงงาน และค่าใช้จ่ายจริง
- KPI อัตรากำไร งานเสร็จ และงานทั้งหมด

## Phase 10 — Material Intelligence & AI Engineering

### Standard

- `/materials` ใช้ Serper Search, Shopping และ Places
- ค้นหา HomePro, ไทวัสดุ, ดูโฮม, โกลบอลเฮ้าส์, SCG, Shopee และ Lazada
- ค้นหาร้านออฟไลน์ใน อ.บางใหญ่ จ.นนทบุรี สูงสุด 5 ร้าน
- เพิ่มผลสินค้าเข้า JOB พร้อม URL และหลักฐานจากผลค้นหา

### จอมยุทธ์

- ใช้ Bright Data Web Unlocker เปิดอ่านหน้าเว็บที่เลือก
- รองรับ Markdown extraction เพื่อนำมาวิเคราะห์
- `/engineering` รับรุ่น ข้อความ Nameplate อาการเสีย หรือรูปภาพ
- ค้นหา Service Manual, Parts Catalog, Exploded View, Datasheet และ Troubleshooting
- แยก Verified facts, Parts, Engineering defaults, Hypotheses, Inspection steps และ Repair options
- ทุกข้อเท็จจริงต้องมี Source ID; ข้อมูลที่ไม่มีหลักฐานคืนค่า null/ต้องหาหลักฐานเพิ่ม
- จำกัดการใช้ API แบบรายผู้ใช้: Standard 20–30 ครั้ง/ชั่วโมง และจอมยุทธ์ 6 ครั้ง/ชั่วโมง

> AI อาจตีความเอกสารผิดได้ ระบบจึงไม่ถือข้อความ AI เป็นหลักฐานเดี่ยว และแสดง Sources เพื่อให้ช่างตรวจสอบก่อนซ่อมหรือสั่งอะไหล่

## Phase 11 — Production Hardening

- เพิ่ม CSRF middleware สำหรับ Server Functions
- Server Functions ที่ใช้ AI และ External API บังคับ Supabase Authentication
- Secrets อ่านเฉพาะใน Server handler และไม่มี VITE_ prefix
- เพิ่ม SSRF guard ป้องกัน URL ภายในเครือข่าย
- Timeout และ error handling สำหรับ External API
- RLS ทุกตารางใหม่
- Audit log สำหรับ JOB ต้นทุน การเงิน และ Warranty
- Security Headers: CSP, frame denial, nosniff, referrer policy และ permissions policy
- Service Worker cache เฉพาะ App Shell/Static Assets ไม่ cache API หรือ Server Functions
- Offline page และ PWA manifest
- GitHub Actions: project guard, lint, typecheck และ build

## Migration

ใช้ไฟล์:

`supabase/migrations/20260802013000_phase_6_11_operations_ai_hardening.sql`

ตารางใหม่:

- `job_materials`
- `job_labor_entries`
- `job_expenses`
- `payments`
- `warranty_records`
- `warranty_claims`
- `material_searches`
- `engineering_cases`
- `audit_logs`
- `api_usage_events`

View/Functions:

- `job_financial_summary`
- `job_financials(job_id)`
- `consume_api_quota(provider, mode, hourly_limit)`

## Environment Variables

```env
LOVABLE_API_KEY=
SERPER_API_KEY=
BRIGHT_DATA_API_TOKEN=
BRIGHT_DATA_WEB_UNLOCKER_ZONE=
SUPABASE_SERVICE_ROLE_KEY=
```

ห้ามส่งค่าเหล่านี้ไป Browser และห้าม Commit `.env`

## คำสั่งติดตั้ง

```bash
chmod +x scripts-phase-6-11.sh
./scripts-phase-6-11.sh
```

## สิ่งที่ต้องทดสอบด้วยบัญชีจริง

- Migration บน Supabase staging
- RLS ระหว่างผู้ใช้คนละบัญชี
- Serper quota และรูปแบบผลลัพธ์จริง
- Bright Data zone, premium-domain billing และหน้าเว็บแต่ละร้าน
- AI Gateway multimodal สำหรับ Signed URL ของรูป
- Mobile camera, GPS และ PWA บน Samsung Browser, Chrome และ Safari
- PDF/Receipt กับข้อมูลการเงินจริง
