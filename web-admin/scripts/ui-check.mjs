#!/usr/bin/env node
/**
 * Kiểm tra giao diện theo DESIGN_SYSTEM.md và UI_SYNC_PLAN.md §6. Quét src/components và src/app,
 * bỏ qua src/components/ui/ và các màn ẩn (scripts/lib/ui-scope.mjs).
 *
 *   npm run ui:check                  so với ui-baseline.json; lỗi nếu có file nào tăng số vi phạm
 *   npm run ui:check -- --report      in bảng chỉ số (UI_SYNC_PLAN.md §7), không so baseline
 *   npm run ui:check -- --update      ghi lại baseline, chỉ cho phép GIẢM
 *   npm run ui:check -- --update --accept-increase   ghi baseline kể cả khi tăng (cần lý do trong PR)
 *   npm run ui:check -- --where=rule  in từng dòng vi phạm của một luật
 *
 * Quy tắc "chỉ được giảm": số vi phạm của mỗi (file, luật) không được vượt baseline. File chưa có
 * trong baseline coi như baseline 0, tức là code mới phải sạch ngay. Khi một mục về 0 và được ghi
 * lại, luật đó thành lỗi cứng cho file đó.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, defaultFiles, isSkipped } from './lib/ui-scope.mjs';
import { BOUND, CLASS_RULES, ICON_12_RE } from './lib/ui-patterns.mjs';

const BASELINE = path.join(ROOT, 'ui-baseline.json');


/**
 * Mỗi luật: re chạy trên TỪNG DÒNG (bỏ dòng có `ui-check-ignore`), hoặc multiline chạy trên cả file.
 * `metric: true` chỉ để báo cáo, không tính vào so baseline.
 */
const pick = (...names) => Object.fromEntries(names.map((n) => [n, CLASS_RULES[n]]));

const RULES = {
  ...pick('mau-cu', 'chu-nho', 'viet-hoa-gian-chu'),
  'icon-12': {
    desc: 'Icon 12px (w-3 h-3) trên thành phần viết hoa',
    line: (l) => (/<[A-Z]\w*[^>]*className=/.test(l) ? (l.match(ICON_12_RE) || []).length : 0),
  },
  ...pick('khoang-cach-nua-bac', 'font-mono'),
  'button-tu-viet': { desc: '<button> ngoài ui/, dùng Button', re: /<button(?![\w-])/g },
  'input-tu-viet': { desc: '<input> ngoài ui/, dùng Input', re: /<input(?![\w-])/g },
  'select-tu-viet': { desc: '<select> ngoài ui/, dùng Select hoặc Combobox', re: /<select(?![\w-])/g },
  'textarea-tu-viet': { desc: '<textarea> ngoài ui/, dùng Textarea', re: /<textarea(?![\w-])/g },
  'bang-tu-viet': { desc: '<table> ngoài ui/, dùng DataTable', re: /<table(?![\w-])/g },
  'dinh-dang-so': {
    desc: 'toFixed / toLocaleString trong .tsx, dùng lib/format.ts',
    re: /\.(?:toFixed|toLocaleString)\(/g,
  },
  'nhan-danh-so': {
    desc: 'Nhãn tab hoặc cột bắt đầu bằng số thứ tự hoặc "Bước N"',
    re: /(?<=[>"'`])(?:\d{1,2}\.\s+[A-ZÀ-Ỹ]|Bước\s+\d)/g,
  },
  'chua-ro': { desc: "|| 'Chưa rõ…' thay vì —", re: /\|\|\s*['"`]Chưa rõ/g },
  'cat-danh-sach-chon': {
    desc: '.slice(0, N) ngay trước danh sách <option>',
    multiline: /\.slice\(0,\s*\d+\)\s*\.map\([^]{0,160}?<option/g,
  },
  'du-lieu-nhay-cam-trong-nhan': {
    desc: 'CCCD/MST/STK trong nhãn <option>',
    multiline: /<option[^>]*>[^<]{0,200}?(?:CCCD|MST|STK)\s*:/g,
  },
  'font-semibold': { desc: 'font-semibold (chỉ cho tiêu đề, số chính, cột đầu)', metric: true, re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*font-semibold(?![\\w-])`, 'g') },
};

function scan(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const hits = {};
  const where = {};
  const add = (rule, line, n = 1) => {
    if (!n) return;
    hits[rule] = (hits[rule] || 0) + n;
    (where[rule] ||= []).push(line);
  };
  for (const [name, r] of Object.entries(RULES)) {
    if (r.multiline) {
      for (const m of text.matchAll(r.multiline)) add(name, text.slice(0, m.index).split('\n').length);
    } else {
      lines.forEach((l, i) => {
        if (l.includes('ui-check-ignore')) return;
        const n = r.line ? r.line(l) : (l.match(r.re) || []).length;
        add(name, i + 1, n);
      });
    }
  }
  return { hits, where };
}

/* ------------------------------------------------------------------- chạy */

const args = process.argv.slice(2);
const update = args.includes('--update');
const acceptIncrease = args.includes('--accept-increase');
const reportOnly = args.includes('--report');
const whereArg = args.find((a) => a.startsWith('--where='))?.slice(8);
if (whereArg && !RULES[whereArg]) { console.error(`Luật không có: ${whereArg}. Có: ${Object.keys(RULES).join(', ')}`); process.exit(2); }

const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const current = {};
const wheres = {};
const totals = {};
let scanned = 0;
for (const file of defaultFiles()) {
  if (isSkipped(file)) continue;
  scanned++;
  const { hits, where } = scan(file);
  const key = rel(file);
  for (const [rule, n] of Object.entries(hits)) {
    totals[rule] = (totals[rule] || 0) + n;
    if (RULES[rule].metric) continue;
    (current[key] ||= {})[rule] = n;
    if (rule === whereArg) wheres[key] = where[rule];
  }
}

if (whereArg) {
  for (const [f, ls] of Object.entries(wheres)) console.log(`${f}: dòng ${ls.join(', ')}`);
  process.exit(0);
}

/* ---------------------------------------------------------- đăng ký màn */

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const registryErrors = [];
let registryStats = null;

async function checkRegistry() {
  const err = (m) => registryErrors.push(m);

  let mod;
  // Node in cảnh báo vì package.json không có "type"; registry là file khai báo thuần nên bỏ qua đúng cảnh báo này.
  const emit = process.emitWarning;
  process.emitWarning = (w, ...a) => (JSON.stringify(a).includes('MODULE_TYPELESS_PACKAGE_JSON') ? undefined : emit.call(process, w, ...a));
  try {
    mod = await import(pathToFileURL(path.join(ROOT, 'src/lib/screenRegistry.ts')).href);
  } catch (e) {
    err(`Không nạp được src/lib/screenRegistry.ts (cần Node 22.6+ để đọc TypeScript): ${e.message}`);
    return;
  }
  const { SCREEN_REGISTRY, TEMPLATE_COMPONENT } = mod;

  const typesSrc = read('src/lib/types.ts');
  const union = typesSrc.match(/export type TabKey =([^;]*);/)?.[1] ?? '';
  const tabKeys = [...union.matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
  const navSrc = read('src/lib/navGroups.ts');
  const aliasBlock = navSrc.match(/TAB_ALIASES[^=]*=\s*\{([^}]*)\}/)?.[1] ?? '';
  const aliasKeys = new Set([...aliasBlock.matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"][\w-]+['"]/g)].map((m) => m[1]));
  const execBlock = navSrc.match(/DASHBOARD_EXEC_TAB_KEYS[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '';
  const execKeys = new Set([...execBlock.matchAll(/'([\w-]+)'/g)].map((m) => m[1]));
  // `dashboard-bi` vừa nằm trong TAB_ALIASES vừa là màn thật: khóa đại diện cho cả nhóm báo cáo.
  const ALIAS_BUT_VISIBLE = new Set(['dashboard-bi']);

  if (!tabKeys.length) { err('Không đọc được TabKey từ src/lib/types.ts'); return; }

  const seen = new Map();
  for (const e of SCREEN_REGISTRY) {
    if (seen.has(e.tab)) err(`${e.tab}: khai báo hai lần trong screenRegistry.ts`);
    seen.set(e.tab, e);
    if (!tabKeys.includes(e.tab)) err(`${e.tab}: có trong screenRegistry.ts nhưng không còn trong TabKey (xóa dòng này)`);
  }
  for (const k of tabKeys) if (!seen.has(k)) err(`${k}: tab chưa khai báo trong src/lib/screenRegistry.ts (chọn khuôn, hoặc "own" kèm lý do)`);

  let visible = 0;
  let done = 0;
  for (const e of SCREEN_REGISTRY) {
    if ('hidden' in e) {
      if (e.hidden === 'alias' && !aliasKeys.has(e.tab)) err(`${e.tab}: khai báo hidden "alias" nhưng không có trong TAB_ALIASES`);
      if (e.hidden === 'merged' && !execKeys.has(e.tab)) err(`${e.tab}: khai báo hidden "merged" nhưng không có trong DASHBOARD_EXEC_TAB_KEYS`);
      continue;
    }
    visible++;
    if (aliasKeys.has(e.tab) && !ALIAS_BUT_VISIBLE.has(e.tab)) err(`${e.tab}: có trong TAB_ALIASES nên phải khai báo hidden "alias", không phải màn hiển thị`);
    if (!['list-profile', 'report', 'config', 'own'].includes(e.template)) err(`${e.tab}: template "${e.template}" không hợp lệ`);
    if (e.template === 'own' && (e.reason ?? '').trim().length < 15) err(`${e.tab}: template "own" bắt buộc có reason (≥ 15 ký tự) nói vì sao không theo khuôn`);
    const file = path.join(ROOT, 'src', e.file);
    if (!fs.existsSync(file)) { err(`${e.tab}: file màn không tồn tại: src/${e.file}`); continue; }
    for (const part of e.parts ?? []) {
      if (!fs.existsSync(path.join(ROOT, 'src', part.file))) err(`${e.tab}: phần "${part.name}" trỏ tới file không tồn tại: src/${part.file}`);
      if ((part.reason ?? '').trim().length < 15) err(`${e.tab}: phần "${part.name}" thiếu reason`);
    }
    if (e.status === 'done') {
      done++;
      if (e.template === 'own') continue;
      const comp = TEMPLATE_COMPONENT[e.template];
      if (!new RegExp(`\\b${comp}\\b`).test(fs.readFileSync(file, 'utf8'))) err(`${e.tab}: khai báo status "done" theo khuôn ${e.template} nhưng src/${e.file} không dùng ${comp}`);
    }
  }
  registryStats = { total: tabKeys.length, visible, done };
}

await checkRegistry();

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const sumOf = (o) => Object.values(o).reduce((a, fileRules) => a + Object.values(fileRules).reduce((x, y) => x + y, 0), 0);

function printReport() {
  console.log(`Quét ${scanned} file (bỏ qua ui/ và màn ẩn)\n`);
  console.log('Luật'.padEnd(30) + 'Hiện tại'.padStart(9) + 'Baseline'.padStart(10));
  for (const [name, r] of Object.entries(RULES)) {
    const base = Object.values(baseline).reduce((a, f) => a + (f[name] || 0), 0);
    const baseCol = r.metric ? '—' : String(base);
    console.log(name.padEnd(30) + String(totals[name] || 0).padStart(9) + baseCol.padStart(10) + `   ${r.desc}`);
  }
  if (registryStats) console.log(`\nMàn đã chuyển xong theo khuôn: ${registryStats.done}/${registryStats.visible} màn hiển thị (${registryStats.total} khóa tab)`);
  for (const m of registryErrors) console.log(`  ! ${m}`);
}

if (reportOnly) { printReport(); process.exit(0); }

/* So với baseline */
const increases = [];
const decreases = [];
for (const [file, rules] of Object.entries(current)) {
  for (const [rule, n] of Object.entries(rules)) {
    const b = baseline[file]?.[rule] || 0;
    if (n > b) increases.push({ file, rule, n, b });
    else if (n < b) decreases.push({ file, rule, n, b });
  }
}
for (const [file, rules] of Object.entries(baseline)) {
  for (const [rule, b] of Object.entries(rules)) {
    if (!current[file]?.[rule] && b > 0 && !decreases.some((d) => d.file === file && d.rule === rule)) decreases.push({ file, rule, n: 0, b });
  }
}

if (update) {
  const firstRun = !fs.existsSync(BASELINE);
  if (increases.length && !acceptIncrease && !firstRun) {
    console.error('Không ghi baseline vì có mục TĂNG (thêm --accept-increase nếu thật sự cần, và ghi lý do trong PR):');
    for (const i of increases.slice(0, 30)) console.error(`  ${i.file}  ${i.rule}: ${i.b} → ${i.n}`);
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.keys(current).sort().map((f) => [f, Object.fromEntries(Object.entries(current[f]).sort())]));
  fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Đã ghi ui-baseline.json: ${sumOf(sorted)} vi phạm trong ${Object.keys(sorted).length} file.`);
  process.exit(0);
}

if (registryErrors.length) {
  console.error(`ui:check THẤT BẠI: ${registryErrors.length} lỗi ở src/lib/screenRegistry.ts\n`);
  for (const m of registryErrors) console.error(`  ${m}`);
  console.error('');
}

if (increases.length) {
  console.error(`ui:check THẤT BẠI: ${increases.length} mục vượt baseline. Code mới phải theo DESIGN_SYSTEM.md.\n`);
  for (const i of increases.slice(0, 40)) {
    console.error(`  ${i.file}\n    ${i.rule}: ${i.b} → ${i.n}  (${RULES[i.rule].desc})`);
  }
  if (increases.length > 40) console.error(`  … và ${increases.length - 40} mục nữa`);
  console.error('\nXem từng dòng: npm run ui:check -- --where=<luật>');
  process.exit(1);
}

if (registryErrors.length) process.exit(1);

console.log(`ui:check đạt. Quét ${scanned} file, ${sumOf(current)} vi phạm cũ (baseline ${sumOf(baseline)}).`);
if (decreases.length) console.log(`Có ${decreases.length} mục đã giảm so với baseline; chạy "npm run ui:check -- --update" để khóa mức mới.`);
