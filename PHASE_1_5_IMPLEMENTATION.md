# Day Neramit — Phase 1–5 Implementation

วันที่อัปเดต: 1 สิงหาคม 2569

## Phase 1 — Core Workflow

Workflow ที่เชื่อมแล้ว:

`Customer → Booking → Site Survey → JOB → Quotation`

การเปลี่ยนแปลงหลัก:

- เพิ่ม responsive application shell แบบ Luxury Gold Black LED
- ใช้โลโก้ `/public/dayneramit-logo.jpg` ตามไฟล์ต้นฉบับที่ได้รับ
- เปลี่ยนฟอนต์ UI เป็น Kanit ผ่าน Google Fonts
- เพิ่ม Sidebar สำหรับ Desktop และ Bottom Navigation สำหรับ Mobile
- เพิ่ม Dashboard ที่อ่านสถิติจริงจาก Supabase
- เพิ่มฐานข้อมูลและ Foreign Key สำหรับ Booking, Survey, JOB และ Quotation

## Phase 2 — Booking & Calendar

- Calendar แบบ Month View ที่ใช้งานได้บน Mobile
- เลือกวันแล้วแสดงรายการ Booking ของวันนั้น
- Create/Edit/Delete และสถานะ Booking
- เลือกลูกค้าจาก Customer CRM
- ตรวจเวลานัดหมายชนกันก่อนบันทึก
- แจ้งเตือนล่วงหน้า
- Google Calendar deep link
- Apple/Samsung/Outlook ผ่านไฟล์ ICS
- สร้าง Site Survey จาก Booking
- แก้ timezone จาก `datetime-local` ด้วย Local Date Parser

## Phase 3 — Customer CRM

- เพิ่ม/แก้ไข/ค้นหาลูกค้า
- รองรับข้อมูลบริษัท โทรศัพท์ LINE อีเมล ที่อยู่ หมายเหตุ และ GPS
- ดึงที่อยู่ลูกค้าไป Booking และ Site Survey
- สร้าง Booking หรือ Survey จากการ์ดลูกค้า

## Phase 4 — Site Survey

- ผูก Booking และ Customer
- GPS หน้างาน
- Checklist แบบเพิ่ม/ลบ/ติ๊กสถานะ
- อาการหรือปัญหาที่พบ
- สภาพหน้างานและข้อจำกัด
- แนวทางเสนอแนะ
- ถ่ายหรืออัปโหลดรูป พร้อมบีบอัดก่อนส่ง Supabase Storage
- สร้าง JOB จาก Survey
- ไม่เก็บต้นทุนวัสดุและแรงงานใน Survey ตามข้อกำหนด

## Phase 5 — Quotation

- เพิ่มหน้า Quotation List
- แสดงจำนวนเอกสาร JOB ที่เชื่อม และมูลค่ารวม
- สร้างใบเสนอราคาจาก JOB ที่มาจาก Site Survey
- เอกสารเก็บ `survey_id` และ `job_id` เพื่อ Trace ย้อนกลับ
- เมื่อบันทึก Quotation สถานะ JOB เปลี่ยนเป็น `quoted`
- แก้การเปิดเอกสารเดิมไม่ให้ข้อมูลลูกค้าใน Payload ถูกเขียนทับ

## Database Migration

ไฟล์:

`supabase/migrations/20260801223000_phase_1_5_core_workflow.sql`

Migration นี้เพิ่ม:

- ฟิลด์ CRM ใน `customers`
- ฟิลด์ reminder/notes ใน `bookings`
- ตาราง `site_surveys`
- การเชื่อม `jobs.booking_id`, `jobs.survey_id`, `documents.survey_id`
- Index ที่จำเป็น
- Updated-at triggers
- แก้ชนิด `jobs.status` เดิมจาก text เป็น enum อย่างปลอดภัย
- RLS สำหรับ Site Survey

## ตรวจสอบที่ดำเนินการแล้ว

- ตรวจ Syntax TypeScript/TSX ทั้งโปรเจกต์ 87 ไฟล์: ผ่าน
- ตรวจ Local Imports: ผ่าน
- ไม่รวม `.env` ในไฟล์ส่งมอบ

## คำสั่งติดตั้งและทดสอบ

```bash
cp .env.example .env
# ใส่ค่า Supabase จริงใน .env
npm install
npm run build
npm run dev
```

จากนั้นใช้ Supabase CLI หรือ Dashboard รัน Migration ก่อนทดสอบข้อมูลจริง
