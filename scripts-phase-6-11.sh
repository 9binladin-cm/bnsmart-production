#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "[ERROR] บรรทัด $LINENO: $BASH_COMMAND" >&2' ERR

command -v node >/dev/null || { echo "ต้องติดตั้ง Node.js 22+" >&2; exit 1; }
command -v npm >/dev/null || { echo "ไม่พบ npm" >&2; exit 1; }

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "สร้าง .env แล้ว กรุณาใส่ Supabase, Serper, Lovable และ Bright Data keys"
fi

npm ci --ignore-scripts || npm install --ignore-scripts
npm run check:project
npm run typecheck
npm run build

cat <<'EOF'

Phase 6–11 build ผ่านแล้ว
ขั้นตอนฐานข้อมูล:
1) เชื่อม Supabase CLI: npx supabase link --project-ref <PROJECT_REF>
2) ตรวจ SQL: npx supabase db lint
3) ใช้ Migration: npx supabase db push
4) เริ่มระบบ: npm run dev

ข้อสำคัญ:
- SERPER_API_KEY และ BRIGHT_DATA_* ต้องอยู่ฝั่ง Server เท่านั้น
- โหมดจอมยุทธ์จำกัด 6 ครั้ง/ชั่วโมง/ผู้ใช้จาก Database quota
- ทดสอบ RLS ด้วยบัญชีผู้ใช้จริงก่อน Deploy
EOF
