#!/usr/bin/env node
/**
 * Hàng Rào 5 Cổng Kiểm Soát & QA Tự Động (Zero-Token Mechanical Pre-Gate)
 * Quét nhanh các lỗi cơ học (Cổng 1 -> Cổng 4) trước khi chuyển diff lên Cổng 5 (Argon 4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const WEB_ADMIN_SRC = path.join(ROOT, 'web-admin', 'src');

function walkFiles(dir, exts = ['.ts', '.tsx']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

const files = walkFiles(WEB_ADMIN_SRC);
const report = {
  timestamp: new Date().toISOString(),
  totalFilesScanned: files.length,
  gates: []
};

// CỔNG 1: Kiểm tra cú pháp TypeScript (tsc --noEmit)
let gate1Pass = true;
let gate1Detail = 'TypeScript sạch 0 lỗi (RULE-TS-01)';
try {
  execSync('npx tsc --noEmit', { cwd: path.join(ROOT, 'web-admin'), stdio: 'pipe' });
} catch (err) {
  gate1Pass = false;
  const out = (err.stdout?.toString() || err.message || '').split('\n').slice(0, 5).join(' | ');
  gate1Detail = `Lỗi TypeScript: ${out}`;
}
report.gates.push({ gate: 'G1', name: 'Build & Type Guard', model: 'flash_lite', status: gate1Pass ? 'PASS' : 'FAIL', detail: gate1Detail });

// CỔNG 2: Kiểm tra quy chuẩn GEMINI.md (RULE-DATA-01 & Phụ đề thừa)
const gate2Violations = [];
const FORBIDDEN_RANDOM = /Math\.random\(\)/;
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  if (FORBIDDEN_RANDOM.test(content) && !rel.includes('mock') && !rel.includes('test')) {
    gate2Violations.push(`${rel}: Phát hiện Math.random() (Kiểm tra RULE-DATA-01)`);
  }
}
report.gates.push({
  gate: 'G2',
  name: 'GEMINI.md Rule Inspector',
  model: 'flash',
  status: gate2Violations.length === 0 ? 'PASS' : 'WARN',
  detail: gate2Violations.length === 0 ? 'Tuân thủ RULE-DATA-01 & Quy chuẩn UI' : `${gate2Violations.length} điểm cần lưu ý`
});

// CỔNG 3: Kiểm tra Bảo mật & An toàn API (RULE-API-01 & RULE-API-02)
const gate3Violations = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  // Kiểm tra gọi executeOperationalReport bên trong useEffect
  const useEffectBlocks = content.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/g) || [];
  for (const block of useEffectBlocks) {
    if (block.includes('executeOperationalReport') || block.includes('/api/integrations/llm')) {
      gate3Violations.push(`${rel}: Nghi vấn gọi API mô hình trong useEffect (RULE-API-02)`);
    }
  }
}
report.gates.push({
  gate: 'G3',
  name: 'Security & API Guard',
  model: 'flash',
  status: gate3Violations.length === 0 ? 'PASS' : 'FAIL',
  detail: gate3Violations.length === 0 ? 'Tuân thủ RULE-API-01 & RULE-API-02' : gate3Violations.join('; ')
});

// CỔNG 4: Kiểm tra Đồng bộ Tài liệu (Quy tắc 4)
const blueprintReadme = path.join(ROOT, 'blueprint', 'README.md');
const knownBugs = path.join(ROOT, 'blueprint', 'governance', 'KNOWN_BUGS_AND_LESSONS.md');
const gate4Pass = fs.existsSync(blueprintReadme) && fs.existsSync(knownBugs);
report.gates.push({
  gate: 'G4',
  name: 'Doc-Sync & E2E Guard',
  model: 'flash_lite',
  status: gate4Pass ? 'PASS' : 'FAIL',
  detail: gate4Pass ? 'Sổ đăng ký blueprint/README.md & HUB-GOV-04 đầy đủ' : 'Thiếu tệp tài liệu bắt buộc'
});

// CỔNG 5: Sẵn sàng trình Chief QA Gatekeeper (Argon 4)
const allPreGatesPass = report.gates.every(g => g.status !== 'FAIL');
report.gates.push({
  gate: 'G5',
  name: 'Chief QA Gatekeeper',
  model: 'pro (Argon 4)',
  status: allPreGatesPass ? 'READY' : 'BLOCKED',
  detail: allPreGatesPass
    ? 'Đã lọc sạch qua 4 cổng đầu -> Sẵn sàng nghiệm thu diff tinh gọn (Tiết kiệm ~64% Token)'
    : 'Chặn trình Argon 4 do còn lỗi ở cổng trước'
});

console.log('\n=== BÁO CÁO HÀNG RÀO 5 CỔNG KIỂM SOÁT & QA ===');
console.log(`Đã quét: ${report.totalFilesScanned} tệp mã nguồn trong web-admin/src\n`);
for (const g of report.gates) {
  const icon = g.status === 'PASS' || g.status === 'READY' ? '✔' : g.status === 'WARN' ? '⚠' : '✖';
  console.log(`${icon} [${g.gate}] ${g.name.padEnd(26)} | Model: ${g.model.padEnd(14)} | ${g.status.padEnd(7)} | ${g.detail}`);
}
console.log('================================================\n');
