#!/usr/bin/env node
/**
 * Đổi tự động kiểu giao diện cũ sang chuẩn trong DESIGN_SYSTEM.md (UI_SYNC_PLAN.md §5, bước 1).
 *
 *   node scripts/ui-codemod.mjs                       chạy thử: in số lượng và diff, không ghi file
 *   node scripts/ui-codemod.mjs --write               ghi file
 *   node scripts/ui-codemod.mjs --only=color,spacing  chỉ chạy một số luật
 *   node scripts/ui-codemod.mjs src/components/koc    chỉ quét một thư mục hoặc file
 *   node scripts/ui-codemod.mjs --verbose             in toàn bộ diff (mặc định 60 dòng)
 *
 * Luật: color · textsize · tracking · icon · spacing
 * Bỏ qua: src/components/ui/, màn ẩn (UI_SYNC_PLAN.md §2.2), hợp đồng in (ContractModal.tsx),
 * và dòng có chú thích `ui-codemod-ignore`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, isSkipped, walk } from './lib/ui-scope.mjs';

/* ------------------------------------------------------------------- màu */

const NEUTRAL = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const FAMILY_TOKEN = {
  blue: 'accent', indigo: 'accent', violet: 'accent', purple: 'accent', fuchsia: 'accent', sky: 'accent', cyan: 'accent', pink: 'accent',
  emerald: 'positive', green: 'positive', teal: 'positive', lime: 'positive',
  amber: 'warning', yellow: 'warning', orange: 'warning',
  red: 'critical', rose: 'critical',
};
const FAMILIES = [...NEUTRAL, ...Object.keys(FAMILY_TOKEN)];

const TEXT_UTILS = new Set(['text', 'placeholder', 'fill', 'stroke']);
const LINE_UTILS = /^(border(-[trblxy])?|divide|ring)$/;

/** Trả về tên token mới, hoặc null nếu cần người xem tay. Bảng theo DESIGN_SYSTEM.md §2. */
function mapColor(family, shade, util) {
  const n = Number(shade);
  const isText = TEXT_UTILS.has(util);
  const isLine = LINE_UTILS.test(util);
  const isBg = util === 'bg';
  if (!isText && !isLine && !isBg) return null;

  if (NEUTRAL.includes(family)) {
    if (isText) return n <= 300 ? null : n <= 500 ? 'ink-3' : n <= 700 ? 'ink-2' : 'ink';
    if (isLine) return n <= 200 ? 'line' : 'line-strong';
    if (n === 50) return 'canvas';
    if (n <= 200) return 'sunken';
    if (n <= 300) return 'line-strong';
    return n <= 500 ? 'ink-3' : n <= 700 ? 'ink-2' : 'ink';
  }

  const tok = FAMILY_TOKEN[family];
  if (!tok) return null;
  const hover = tok === 'accent' ? 'accent-hover' : tok;
  if (isText) return n <= 300 ? null : n <= 600 ? tok : hover;
  if (isLine) return n <= 100 ? `${tok}-soft` : n <= 300 ? `${tok}/30` : tok;
  if (n <= 200) return `${tok}-soft`;
  if (n <= 400) return null;
  return n <= 600 ? tok : hover;
}

const COLOR_RE = new RegExp(
  '(?<=^|[\\s"\'`{(])((?:[a-z0-9\\[\\]_-]+:)*)' +
    '(text|bg|border(?:-[trblxy])?|divide|ring|fill|stroke|placeholder)-' +
    `(${FAMILIES.join('|')})-(\\d{2,3})(\\/\\d+)?(?![\\w-])`,
  'g',
);

/* ------------------------------------------------------------------ luật */

const SPACING_RE = new RegExp(
  '(?<=^|[\\s"\'`{(])((?:[a-z0-9\\[\\]_-]+:)*)(-?)' +
    '(px|py|pt|pb|pl|pr|ps|pe|p|mx|my|mt|mb|ml|mr|ms|me|m|gap-x|gap-y|gap|space-x|space-y)-(1\\.5|2\\.5|3\\.5)(?![\\d.])',
  'g',
);
const SPACING_MAP = { '1.5': '2', '2.5': '3', '3.5': '4' };

const TEXT_PX = { 10: 'text-2xs', 11: 'text-2xs', 12: 'text-2xs', 13: 'text-xs', 14: 'text-sm' };

const RULES = {
  color: (line) => {
    let unmapped = 0;
    const out = line.replace(COLOR_RE, (m, variant, util, family, shade, alpha = '') => {
      const tok = mapColor(family, shade, util);
      if (!tok) { unmapped++; return m; }
      // `accent/30` đã có độ trong suốt riêng; nếu gốc có /NN thì ưu tiên giá trị gốc.
      const base = alpha && tok.includes('/') ? tok.split('/')[0] : tok;
      return `${variant}${util}-${base}${alpha}`;
    });
    return { out, unmapped };
  },

  textsize: (line) => {
    let out = line.replace(/(?<=^|[\s"'`{(])((?:[a-z0-9\[\]_-]+:)*)text-\[(1[0-4])px\](?![\w-])/g, (_, v, px) => `${v}${TEXT_PX[px]}`);
    out = out.replace(/(?<=^|[\s"'`{(])((?:[a-z0-9\[\]_-]+:)*)text-3xs(?![\w-])/g, (_, v) => `${v}text-2xs`);
    return { out };
  },

  tracking: (line) => {
    // Chỉ xóa khi còn lớp khác bên cạnh, để không để lại className rỗng hay đổi nghĩa chuỗi đơn lẻ như 'uppercase'.
    let out = line.replace(/ (?:[a-z0-9\[\]_-]+:)*(?:uppercase|tracking-(?:wide|wider|widest))(?=[\s"'`}])/g, '');
    out = out.replace(/(?<=["'`])(?:uppercase|tracking-(?:wide|wider|widest)) /g, '');
    return { out };
  },

  // Icon 12px → 14px. Chỉ áp cho thẻ viết hoa (thành phần như icon lucide), không áp cho <span>/<div> (chấm trang trí).
  icon: (line) => {
    if (!/<[A-Z]\w*[^>]*className=/.test(line)) return { out: line };
    const out = line.replace(/(?<=^|[\s"'`{(])w-3 h-3(?![\d.\w-])/g, 'w-3.5 h-3.5').replace(/(?<=^|[\s"'`{(])h-3 w-3(?![\d.\w-])/g, 'h-3.5 w-3.5');
    return { out };
  },

  spacing: (line) => ({
    out: line.replace(SPACING_RE, (_, v, neg, util, step) => `${v}${neg}${util}-${SPACING_MAP[step]}`),
  }),
};

/* ------------------------------------------------------------------- chạy */

const args = process.argv.slice(2);
const write = args.includes('--write');
const verbose = args.includes('--verbose');
const onlyArg = args.find((a) => a.startsWith('--only='));
const active = onlyArg ? onlyArg.slice(7).split(',') : Object.keys(RULES);
for (const r of active) if (!RULES[r]) { console.error(`Luật không có: ${r}. Có: ${Object.keys(RULES).join(', ')}`); process.exit(1); }

const targets = args.filter((a) => !a.startsWith('--'));
const files = (targets.length ? targets.map((t) => path.resolve(ROOT, t)) : [path.join(SRC, 'components'), path.join(SRC, 'app')])
  .flatMap((p) => (fs.statSync(p).isDirectory() ? walk(p) : [p]));

const totals = Object.fromEntries(active.map((r) => [r, 0]));
let unmappedTotal = 0;
let skipped = 0;
let changedFiles = 0;
const diffLines = [];
const perFile = [];
const failed = [];

for (const file of files) {
  if (isSkipped(file)) { skipped++; continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const counts = Object.fromEntries(active.map((r) => [r, 0]));

  const next = lines.map((line, i) => {
    if (line.includes('ui-codemod-ignore')) return line;
    let cur = line;
    for (const r of active) {
      const { out, unmapped = 0 } = RULES[r](cur);
      if (out !== cur) { counts[r]++; cur = out; }
      unmappedTotal += unmapped;
    }
    if (cur !== line) diffLines.push(`${path.relative(ROOT, file)}:${i + 1}\n  - ${line.trim()}\n  + ${cur.trim()}`);
    return cur;
  });

  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!n) continue;
  changedFiles++;
  for (const r of active) totals[r] += counts[r];
  perFile.push([path.relative(ROOT, file), n]);
  if (write) {
    const text = next.join('\n');
    try {
      fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
    } catch (err) {
      // File đang bị khóa (trình soạn thảo, dev server). Bỏ qua, chạy lại sau là xong vì luật idempotent.
      failed.push(`${path.relative(ROOT, file)}: ${err.code || err.message}`);
      changedFiles--;
      for (const r of active) totals[r] -= counts[r];
    }
  }
}

const limit = verbose ? diffLines.length : 60;
if (diffLines.length) console.log(diffLines.slice(0, limit).join('\n'));
if (diffLines.length > limit) console.log(`\n… còn ${diffLines.length - limit} dòng đổi nữa (thêm --verbose để xem hết)`);

console.log(`\n${write ? 'ĐÃ GHI' : 'CHẠY THỬ (chưa ghi file)'}: ${changedFiles} file đổi, ${skipped} file bỏ qua (ui/ và màn ẩn)`);
console.log('Số dòng đổi theo luật:');
for (const r of active) console.log(`  ${r.padEnd(9)} ${String(totals[r]).padStart(6)}`);
if (active.includes('color')) console.log(`Màu chưa ánh xạ được, cần xem tay: ${unmappedTotal}`);
console.log('File đổi nhiều nhất:');
for (const [f, n] of perFile.sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${String(n).padStart(5)}  ${f}`);
if (failed.length) console.log(`\nKHÔNG GHI ĐƯỢC ${failed.length} file (chạy lại sau khi đóng file):\n  ${failed.join('\n  ')}`);
if (!write) console.log('\nChạy lại với --write để ghi file.');
