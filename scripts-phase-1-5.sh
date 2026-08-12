#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "สร้าง .env จาก .env.example แล้ว กรุณาใส่ค่า Supabase ก่อนรันใหม่"
  exit 1
fi

command -v npm >/dev/null 2>&1 || { echo "ไม่พบ npm กรุณาติดตั้ง Node.js 22+"; exit 1; }

npm install
npm run build

echo "Phase 1-5 build สำเร็จ"
echo "รันระบบด้วย: npm run dev"
