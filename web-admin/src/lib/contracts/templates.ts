import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { ContractField, FieldGroup, FieldKind, FieldSource, LegalTemplate } from './types';
import { requireCondition } from './domain';
import prisma from '../prisma';
const SOURCES = [
  ['IND-HD', 'Hợp đồng video · Cá nhân', 'Cá nhân', 'CONTRACT', '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx'],
  ['IND-BBNT', 'Nghiệm thu video · Cá nhân', 'Cá nhân', 'ACCEPTANCE', '1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx'],
  ['HKD-HD', 'Hợp đồng video · Hộ kinh doanh', 'Hộ kinh doanh', 'CONTRACT', '2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx'],
  ['HKD-BBNT', 'Nghiệm thu video · Hộ kinh doanh', 'Hộ kinh doanh', 'ACCEPTANCE', '2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx'],
  ['COM-HD', 'Hợp đồng video · Công ty', 'Công ty', 'CONTRACT', '3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx'],
  ['COM-BBNT', 'Nghiệm thu video · Công ty', 'Công ty', 'ACCEPTANCE', '3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx'],
  ['CTV-HD', 'Hợp đồng nguyên tắc · CTV tháng', 'CTV tháng', 'CONTRACT', '4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx'],
  ['CTV-BBNT', 'Nghiệm thu · CTV tháng', 'CTV tháng', 'ACCEPTANCE', '4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx'],
] as const;
export const decodeXml = (text: string) => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, v: string) => v.startsWith('#x') ? String.fromCodePoint(parseInt(v.slice(2), 16)) : v.startsWith('#') ? String.fromCodePoint(Number(v.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[v] || ''));
const encodeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const paragraphText = (xml: string) => [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => decodeXml(m[1])).join('');
const paragraphs = (xml: string) => [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];
function replaceRange(xml: string, start: number, end: number, value: string) {
  let offset = 0; let inserted = false;
  const replaced = xml.replace(/<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs: string, raw: string) => {
    const text = decodeXml(raw); const a = offset; offset += text.length;
    if (end <= a || start >= offset) return match;
    const prefix = text.slice(0, Math.max(0, start - a)); const suffix = text.slice(Math.max(0, end - a));
    const next = prefix + (inserted ? '' : value) + suffix; inserted = true;
    return `<w:t${attrs.includes('xml:space') ? attrs : attrs + ' xml:space="preserve"'}>${encodeXml(next)}</w:t>`;
  });
  if (start === end && !inserted) return replaced.replace('</w:p>', `<w:r><w:t xml:space="preserve">${encodeXml(value)}</w:t></w:r></w:p>`);
  return replaced;
}
/** Chữ giữ chỗ trong ô bảng của mẫu (“Tên Công ty”, “Số… cấp ngày … tại…”, “Liệt kê đơn giá”): cả ô là chỗ điền. */
const PLACEHOLDER = /^(Tên (Công ty|Hộ kinh doanh)|MST |Địa chỉ (công ty|hộ kinh doanh)|Họ và tên$|số\s?…|Số\s?…|…|\.{3}|Liệt kê )/i;
const PARTY_REQUIRED = /^(BÊN B|CCCD|Mã số thuế|Địa chỉ|Số điện thoại|Email|Chủ hộ|Người đại diện)/i;
/** Tên ngắn của một dòng bảng: phần đầu trước dấu phẩy, “…” hoặc ngoặc. */
const shortName = (text: string) => text.split(/[,…:(]|\.{2,}/)[0].trim().slice(0, 60);
function extractFields(xml: string, part: string): ContractField[] {
  const result: ContractField[] = []; const ps = paragraphs(xml); let previous = '';
  const cellFields = new Map<number, Omit<ContractField, 'key' | 'part' | 'paragraph'>>();
  const firstParagraph = (offset: number, length: number) => ps.findIndex(p => p.index! >= offset && p.index! < offset + length);
  for (const table of xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    const rows = [...table[0].matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)].map(row => ({
      cells: [...row[0].matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)].map(c => ({ xml: c[0], offset: table.index! + row.index! + c.index!, text: paragraphText(c[0]).trim() })),
    }));
    // Bảng có hàng tiêu đề (STT | Hạng mục | Đơn giá…): nhãn ô = tên dòng · tên cột.
    const header = rows[0] && rows[0].cells.filter(c => c.text).length >= 3 ? rows[0].cells.map(c => c.text.replace(/\s*\((VNĐ|VND)\)\s*$/i, '').trim()) : null;
    rows.forEach(({ cells }, r) => {
      const filled = cells.filter(c => c.text);
      const context = filled.map(c => c.text).filter(t => t !== ':').join(' · ');
      if (!context || context.length > 600) return;
      if (filled.length === 1 && /^Sau đây gọi tắt là/.test(filled[0].text)) return;
      const add = (cellIndex: number, title: string, required: boolean) => {
        const cell = cells[cellIndex]; const first = firstParagraph(cell.offset, cell.xml.length); if (first < 0) return;
        const placeholder = !!cell.text;
        cellFields.set(first, { label: title, context, required, ...(placeholder ? { start: 0, end: paragraphText(ps[first][0]).length } : {}) });
      };
      const fillable = (c: { text: string }) => !c.text || PLACEHOLDER.test(c.text);
      if (cells.length >= 3 && cells[1].text === ':') {
        if (fillable(cells[2])) add(2, cells[0].text, PARTY_REQUIRED.test(cells[0].text));
        return;
      }
      if (header && r > 0 && cells.length === header.length) {
        const rowName = cells[1]?.text && !PLACEHOLDER.test(cells[1].text) ? shortName(cells[1].text) : `Dòng ${cells[0].text || r}`;
        cells.forEach((c, i) => { if (i > 0 && fillable(c)) add(i, i === 1 ? `Dòng ${cells[0].text || r} · ${header[i]}` : `${rowName} · ${header[i]}`, false); });
        return;
      }
      if (cells.length >= 2 && cells[0].text && cells.slice(1).every(fillable)) {
        add(cells.length - 1, cells[0].text, /chưa bao gồm thuế|thực nhận|còn lại/i.test(cells[0].text));
      } else if (cells.length >= 3 && cells[1].text && fillable(cells[cells.length - 1])) {
        add(cells.length - 1, `${cells[0].text ? `${cells[0].text} · ` : ''}${cells[1].text}`, /chưa bao gồm thuế|thực nhận|còn lại/i.test(cells[1].text));
      }
    });
  }
  ps.forEach((p, index) => {
    const text = paragraphText(p[0]); const cell = cellFields.get(index);
    if (cell) result.push({ key: `${part}:p${index}:cell`, part, paragraph: index, ...cell });
    // Các token rõ ràng và chỗ trống thuộc dòng khai báo; không coi dấu … trong văn xuôi là trường.
    const pattern = /\[[^\]\r\n]{1,60}\]|\.{3,}|_{3,}|…+/g;
    if (!cell && /\[|Hôm nay|tháng.*\/2026|điền|trong.{0,12}ngày|ngày.{0,12}tháng|tạm ứng|thanh toán|hoa hồng|mã code|Sản xuất và đăng tải|gắn link\/giỏ hàng|Sử dụng hình ảnh trong|Tham dự sự kiện|Đăng 1 post/i.test(text)) {
      for (const match of text.matchAll(pattern)) {
        const token = match[0]; const start = match.index!;
        const key = token.startsWith('[') ? `token:${token}` : `${part}:p${index}:${start}`;
        result.push({ key, part, paragraph: index, start, end: start + token.length, label: token.startsWith('[') ? token.slice(1, -1) : `${text.slice(Math.max(0, start - 35), start)} [điền] ${text.slice(start + token.length, start + token.length + 25)}`, context: text || previous, required: token.startsWith('[') || /^Hôm nay/.test(text) });
      }
    }
    if (text.trim()) previous = text;
  });
  return result;
}

/* Nhãn hiển thị, nhóm, kiểu ô và dữ liệu điền sẵn. Không đổi `key` để hồ sơ cũ vẫn trỏ đúng ô. */
type PartyRule = [RegExp, (subject: string) => string, FieldSource | undefined, FieldKind];
const PARTY_TITLES: PartyRule[] = [
  [/^BÊN B$/i, s => (s === 'Công ty' ? 'Tên công ty' : s === 'Hộ kinh doanh' ? 'Tên hộ kinh doanh' : 'Họ tên Bên B'), 'partyName', 'text'],
  [/^CCCD chủ hộ/i, () => 'CCCD chủ hộ (số, ngày cấp, nơi cấp)', 'cccd', 'text'],
  [/^CCCD/i, () => 'Số CCCD', 'cccd', 'text'],
  [/^Mã số thuế/i, () => 'Mã số thuế', 'taxCode', 'text'],
  [/^Địa chỉ/i, () => 'Địa chỉ', 'address', 'long'],
  [/^Số điện thoại/i, () => 'Số điện thoại', 'phone', 'text'],
  [/^Email/i, () => 'Email', 'email', 'text'],
  [/^Chủ hộ/i, () => 'Họ tên chủ hộ', 'ownerName', 'text'],
  [/^Người đại diện/i, () => 'Người đại diện', 'representative', 'text'],
  [/^Chức vụ/i, () => 'Chức vụ người đại diện', undefined, 'text'],
];
type ProseRule = [RegExp, string[], FieldGroup, FieldKind[], Array<FieldSource | undefined>];
const PROSE: ProseRule[] = [
  [/^Hôm nay, ngày/, ['Ngày ký', 'Tháng ký', 'Năm ký (chữ số cuối, ví dụ 6 cho 2026)'], 'DATE', ['number', 'number', 'number'], ['signDay', 'signMonth', 'signYearDigit']],
  [/đẩy doanh số bán hàng với sản phẩm/, ['Sản phẩm'], 'SCOPE', ['text'], ['product']],
  [/gắn link\/giỏ hàng sản phẩm/, ['Sản phẩm gắn giỏ hàng'], 'SCOPE', ['text'], ['product']],
  [/mã code để chạy quảng cáo/, ['Số ngày cấp mã quảng cáo'], 'SCOPE', ['number'], []],
  [/Sử dụng hình ảnh trong/, ['Số ngày sử dụng hình ảnh', 'Ngày bắt đầu sử dụng hình ảnh'], 'SCOPE', ['number', 'date'], []],
  [/Tham dự sự kiện/, ['Số giờ tham dự sự kiện', 'Ngày tham dự sự kiện'], 'SCOPE', ['number', 'date'], []],
  [/Đăng 1 post trên Facebook/, ['Trang Facebook đăng bài'], 'SCOPE', ['text'], []],
  [/Hoa hồng organic/, ['Hoa hồng organic (%)'], 'MONEY', ['number'], []],
  [/Hoa hồng chạy ads/, ['Hoa hồng chạy ads (%)'], 'MONEY', ['number'], []],
  [/Lần 1.*tạm ứng/, ['Số tiền tạm ứng lần 1', 'Hạn tạm ứng (ngày làm việc)'], 'MONEY', ['money', 'number'], []],
  [/Lần 2/, ['Hạn thanh toán lần 2 (ngày làm việc)'], 'MONEY', ['number'], []],
  [/tổng giá trị là/, ['Số tiền còn phải thanh toán', 'Số tiền bằng chữ'], 'MONEY', ['money', 'text'], []],
  [/Phí dịch vụ Bên A phải thanh toán/, ['Phí dịch vụ phải thanh toán'], 'MONEY', ['money'], []],
  [/THÁNG …|tháng …/i, ['Tháng nghiệm thu'], 'DATE', ['number'], []],
];
function describeFields(fields: ContractField[], subject: string): ContractField[] {
  const titles = new Map<string, number>(); const byKey = new Map<string, string>();
  return describeEach(fields, subject).map(f => {
    if (!f.title) return f;
    let title = f.title.length > 70 && f.title.includes("(") ? f.title.slice(0, f.title.indexOf("(")).trim() : f.title;
    if (byKey.has(f.key)) return { ...f, title: byKey.get(f.key) };
    const n = (titles.get(title) || 0) + 1; titles.set(title, n); if (n > 1) title = `${title} (${n})`;
    byKey.set(f.key, title); return { ...f, title };
  });
}
function describeEach(fields: ContractField[], subject: string): ContractField[] {
  const seenInParagraph = new Map<string, number>();
  return fields.map((f): ContractField => {
    if (f.key === 'token:[dd.mm.yy]') return { ...f, title: 'Ngày lập (dd.mm.yy) trong số hợp đồng', group: 'NUMBER', kind: 'text', source: 'docDate' };
    if (f.key === 'token:[ID KOC]') return { ...f, title: 'Mã KOC trong số hợp đồng', group: 'NUMBER', kind: 'text', source: 'kocId' };
    if (f.key.endsWith(':cell')) {
      const party = !f.label.includes(' · ') && PARTY_TITLES.find(([re]) => re.test(f.label));
      if (party) return { ...f, title: party[1](subject), group: 'PARTY', kind: party[3], source: party[2] };
      const column = f.label.includes(' · ') ? f.label.split(' · ').pop()! : '';
      const firstRow = /^(Sản xuất và đăng tải|Link video|Dòng 1 )/.test(f.label);
      if (/Đơn giá|Mức giá/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'money', source: firstRow ? 'unitPrice' : undefined };
      if (/Số lượng/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'number', source: firstRow ? 'quantity' : undefined };
      if (/Thành tiền/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'money', source: firstRow ? 'lineTotal' : undefined };
      if (column && !/Chi phí|Nội dung/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'text' };
      const title = f.label.replace(/^\d+(\.\d+)? · /, '').replace(/ · (Chi phí|Nội dung)$/, '');
      const net = /chưa bao gồm thuế|thực nhận/i.test(title) && !/Phụ lục|VAT/.test(title);
      return { ...f, title, group: 'MONEY', kind: 'money', source: net ? 'netTotal' : undefined };
    }
    const id = `${f.part}:${f.paragraph}`; const order = seenInParagraph.get(id) || 0; seenInParagraph.set(id, order + 1);
    const rule = PROSE.find(([re]) => re.test(f.context));
    if (rule) return { ...f, title: rule[1][order] || rule[1][0], group: rule[2], kind: rule[3][order] || rule[3][0], source: rule[4][order] };
    const tidy = f.label.replace(/^\S*\s/, '').replace(/\s\S*$/, '').replace(/\s+/g, ' ').trim();
    return { ...f, title: tidy, group: 'OTHER', kind: 'text' };
  });
}
const archiveDirectory = () => path.resolve(process.env.CONTRACT_DATA_DIR || path.join(process.cwd(), '.contract-data'), 'sources');
export async function archiveTemplate(id: string, hash: string) {
  const { zip, template } = await loadTemplate(id); requireCondition(template.hash === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  // Dùng đúng bytes gốc, không giải nén/đóng gói lại để hash không đổi.
  void zip;
  const source = SOURCES.find(s => s[0] === id)!;
  const buffer = await readFile(path.join(/*turbopackIgnore: true*/ process.env.CONTRACT_TEMPLATE_DIR || path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'Quản lý hợp đồng'), source[4]));
  requireCondition(createHash('sha256').update(buffer).digest('hex') === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  if (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres') {
    await mkdir(archiveDirectory(), { recursive: true });
    await writeFile(path.join(archiveDirectory(), `${hash}.docx`), buffer, { flag: 'wx', mode: 0o600 }).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; });
  } else await prisma.$executeRaw`INSERT INTO "ContractTemplateSnapshot" (hash, "templateId", file) VALUES (${hash}, ${id}, ${buffer}) ON CONFLICT (hash) DO NOTHING`;
}
export async function loadTemplate(id: string, expectedHash?: string): Promise<{ template: LegalTemplate; zip: JSZip }> {
  const source = SOURCES.find(s => s[0] === id); requireCondition(source, 'Không tìm thấy mẫu pháp chế.', 404);
  const directory = process.env.CONTRACT_TEMPLATE_DIR || path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'Quản lý hợp đồng');
  let buffer: Buffer;
  try { buffer = await readFile(path.join(/*turbopackIgnore: true*/ directory, source[4])); }
  catch (e) { if (!expectedHash) throw e; buffer = Buffer.alloc(0); }
  if (expectedHash && createHash('sha256').update(buffer).digest('hex') !== expectedHash) {
    requireCondition(/^[a-f0-9]{64}$/.test(expectedHash), 'Phiên bản nguồn không hợp lệ.', 409);
    if (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres') {
      try { buffer = await readFile(path.join(archiveDirectory(), `${expectedHash}.docx`)); }
      catch { requireCondition(false, 'Không tìm thấy bản mẫu gốc đã lưu cho phiên bản này.', 409); }
    } else {
      const rows = await prisma.$queryRaw<Array<{ file: Buffer }>>`SELECT file FROM "ContractTemplateSnapshot" WHERE hash=${expectedHash} AND "templateId"=${id}`;
      requireCondition(rows.length === 1, 'Không tìm thấy bản mẫu gốc đã lưu cho phiên bản này.', 409); buffer = rows[0].file;
    }
    requireCondition(createHash('sha256').update(buffer).digest('hex') === expectedHash, 'Bản mẫu lưu trữ không khớp phiên bản.', 409);
  }
  const zip = await JSZip.loadAsync(buffer);
  const fields: ContractField[] = []; const texts: string[] = [];
  for (const part of Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p)).sort()) {
    const xml = await zip.file(part)!.async('string'); fields.push(...describeFields(extractFields(xml, part), source[2])); texts.push(...paragraphs(xml).map(p => paragraphText(p[0])));
  }
  return { zip, template: { id, name: source[1], filename: source[4], subject: source[2], kind: source[3], version: 'Ver052026', hash: createHash('sha256').update(buffer).digest('hex'), fields, paragraphs: texts } };
}
export async function templateCatalog() { return Promise.all(SOURCES.map(async s => { const { template } = await loadTemplate(s[0]); return { ...template, paragraphs: [], fields: [] }; })); }
export async function renderTemplate(id: string, expectedHash: string, values: Record<string, string>) {
  const { template, zip } = await loadTemplate(id, expectedHash); requireCondition(template.hash === expectedHash, 'File nguồn không khớp phiên bản.', 409);
  const texts: string[] = [];
  for (const part of Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p)).sort()) {
    const xml = await zip.file(part)!.async('string'); let index = 0;
    const filled = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraph => {
      const paragraphIndex = index++;
      const fields = template.fields.filter(f => f.part === part && f.paragraph === paragraphIndex).sort((a, b) => (b.start || 0) - (a.start || 0));
      let next = paragraph;
      for (const field of fields) { const value = values[field.key]; if (value?.trim()) next = replaceRange(next, field.start || 0, field.end || 0, value); }
      texts.push(paragraphText(next)); return next;
    });
    zip.file(part, filled);
  }
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), paragraphs: texts, template };
}
