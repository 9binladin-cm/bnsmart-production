
## สรุปสิ่งที่จะทำ

### 1) PDF มาตรฐาน A4 + Preview เหมาะกับ Mobile
- ล็อกขนาดเอกสารเป็น A4 (794×1123 px @ 96dpi) เสมอ ไม่ว่าอุปกรณ์ไหน
- Mobile preview ใช้ CSS `transform: scale()` ให้พอดีจอ (fit-to-width) — ตัวเอกสารจริงยังเป็น A4
- ตอน export: render node ที่ scale=1 (บังคับ inline style ชั่วคราว) ผ่าน `html2canvas-pro`
- **วิเคราะห์จำนวนหน้าอัตโนมัติ**: วัด content height จริง → หาร A4 height (1123px) → ปัดขึ้น = จำนวนหน้า; งานเดียว/เนื้อหาน้อย = 1 หน้าเท่านั้น
- ใส่ page-break wrapper ป้องกันการตัดกลางแถวตาราง (`break-inside: avoid`)

### 2) ราคาในใบสรุปประเมินงาน
- แก้ `DocumentPreview.tsx`: เมื่อ `docType === "assessment"` และ toggle "แสดงราคา" = OFF → ซ่อนคอลัมน์ ราคา/หน่วย + จำนวนเงิน + แถวรวมท้าย ทุกกรณี (ปัจจุบันหลุด)
- ตรวจสอบ `sections.totals` + prop `showPrices` ให้ทำงานถูกต้อง

### 3) Server Upload ใกล้ไทย
- Lovable Cloud (Supabase) เลือก region ตอน provision ไม่ได้เปลี่ยนภายหลังจาก client
- แก้ perceived speed แทน: 
  - Compress รูปฝั่ง client ก่อนอัปโหลด (resize max 1600px, JPEG quality 0.82) ด้วย Canvas API
  - อัปโหลดขนาน (Promise.all) แทน sequential
  - แสดง progress ต่อไฟล์
- แจ้งผู้ใช้ว่า region ตั้งไว้ ap-southeast (สิงคโปร์) ซึ่งเป็นตัวเลือกใกล้ไทยที่สุดที่รองรับ

### 4) Icon สถานะงานทุกใบ
- เพิ่มคอลัมน์ `status` ในตาราง `jobs` (enum: `draft` | `assessed` | `quoted` | `in_progress` | `delivered` | `completed`)
- Migration + GRANT + RLS
- แสดง badge + ไอคอนสี ในหน้า `/jobs` list และหน้ารายละเอียด
- อัปเดตสถานะอัตโนมัติเมื่อ: บันทึกประเมิน → `assessed`, สร้างใบเสนอราคา → `quoted`, สร้างใบส่งมอบ → `delivered`, สร้างใบรับเงิน → `completed`

### 5) วัสดุ — แยกกลุ่ม + ช่องวัตถุประสงค์ + สต๊อก/ซื้อใหม่/ลบ
- เปลี่ยน schema `work_points.materials` จาก string → JSONB array of:
  ```
  { name, purpose, status: "stock"|"buy"|"delete", qty }
  ```
- UI ในหน้า assess: แต่ละบรรทัดวัสดุมี input `ชื่อ` / `เพื่ออะไร` / radio 3 ตัว (สต๊อก/ซื้อใหม่/ลบ)
- ติ๊ก "ลบ" → แสดง AlertDialog ยืนยันก่อนลบ
- แสดงผลใน PDF: จัดกลุ่มตาม status (มีสต๊อก / ต้องซื้อ) พร้อม badge

### 6) เชื่อม Checklist กับ "ต้องซื้อ"
- เมื่อบันทึกประเมิน: วัสดุที่ status = `buy` → auto-insert ลง `checklist_items` โดยผูก `job_id`
- หน้า Checklist แสดงรายการ "ต้องซื้อ" พร้อม checkbox ซื้อแล้ว/ยัง

### 7) การแจ้งเตือนทุก 1 ชั่วโมง
- ตาราง `reminders` (job_id, next_fire_at, interval='1 hour', active)
- Trigger สร้าง reminder เมื่อ: 
  - สร้าง booking → ใช้ `booking.scheduled_at`
  - กด "เข้าหน้างาน" (check-in ในหน้า assess) → ใช้ `now()`
- Client-side: polling ทุก 60s ตรวจว่าถึงเวลาแจ้งเตือน → Web Notification API + Toast (PWA)
- แสดงว่ายังมี checklist "ต้องซื้อ" ที่ยังไม่ได้ทำ → ย้ำเตือน; เตือนจนกว่าจะกดปิด reminder หรือ checklist หมด

## ไฟล์ที่จะแก้/สร้าง
- `supabase migration`: add `jobs.status`, `work_points.materials` เป็น jsonb, สร้าง `reminders` table
- `src/lib/image-compress.ts` (ใหม่)
- `src/lib/reminders.ts` (ใหม่ — client polling)
- `src/components/StatusBadge.tsx` (ใหม่)
- `src/components/DocumentPreview.tsx` — fix ราคา + page break
- `src/routes/documents.new.tsx` — analyzePages() + scale export
- `src/routes/assess.tsx` — UI วัสดุใหม่ + confirm dialog + compress upload + check-in trigger reminder
- `src/routes/jobs.index.tsx` + `jobs.$jobId.tsx` — status icon
- `src/routes/checklist.tsx` — sync กับ materials `buy`
- `src/routes/bookings.tsx` — สร้าง reminder เมื่อสร้าง booking
- `src/routes/__root.tsx` — mount reminder poller

## หมายเหตุ
- ไม่ต้อง server function สำหรับ reminder (ใช้ client polling + Web Notification เพราะ PWA)
- Region storage: Lovable Cloud จัดการอัตโนมัติ; เน้น compress + parallel upload เพิ่มความเร็ว
