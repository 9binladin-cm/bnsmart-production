import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const required = [
  'src/routes/materials.tsx','src/routes/engineering.tsx','src/routes/finance.tsx',
  'src/routes/warranty.tsx','src/routes/reports.tsx',
  'supabase/migrations/20260802013000_phase_6_11_operations_ai_hardening.sql',
  'public/offline.html','public/pwa-192x192.png','public/pwa-512x512.png','public/pwa-maskable-512x512.png'
];
const errors=[];
for(const file of required){try{const s=await stat(path.join(root,file));if(!s.isFile())errors.push(`${file} is not a file`);}catch{errors.push(`missing ${file}`)}}
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','dist','.output'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p)}return out}
for(const file of await walk(path.join(root,'src'))){if(!/\.(ts|tsx)$/.test(file))continue;const text=await readFile(file,'utf8');if(/(?:SERPER_API_KEY|BRIGHT_DATA_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*['\"][^'\"]{8,}['\"]/.test(text))errors.push(`possible embedded secret in ${path.relative(root,file)}`);if(text.includes('localhost')&&file.endsWith('engineering.functions.ts')===false)errors.push(`localhost reference in ${path.relative(root,file)}`)}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Project guard passed: ${required.length} deliverables found, no embedded integration secrets.`);
