import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { ContractCategory, ContractField, DocBlock, DocParagraph, DocTable, DocTableCell, FieldGroup, FieldKind, FieldSource, LegalTemplate, TemplateVersionHistoryItem } from './types';
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
const dataRoot = () => process.env.CONTRACT_DATA_DIR || path.join(process.cwd(), '.contract-data');
const archiveDirectory = () => path.resolve(dataRoot(), 'sources');
const customTemplateDirectory = () => path.resolve(dataRoot(), 'templates');
const catalogFile = () => path.resolve(dataRoot(), 'catalog.json');

export interface CatalogOverride {
  id: string;
  name: string;
  filename: string;
  subject: string;
  kind: 'CONTRACT' | 'ACCEPTANCE';
  category: ContractCategory;
  version: string;
  description?: string;
  active: boolean;
  defaultReviewRoles: ('LEGAL' | 'FINANCE' | 'LEAD')[];
  customFile?: string;
  updatedAt: string;
  updatedBy: string;
  history: TemplateVersionHistoryItem[];
}

function defaultCategoryFor(id: string, kind: 'CONTRACT' | 'ACCEPTANCE'): ContractCategory {
  if (id.startsWith('CTV-')) return 'CTV_FRAMEWORK';
  if (kind === 'ACCEPTANCE') return 'ACCEPTANCE_SETTLEMENT';
  return 'BOOKING_VIDEO';
}

function defaultReviewRolesFor(kind: 'CONTRACT' | 'ACCEPTANCE'): ('LEGAL' | 'FINANCE' | 'LEAD')[] {
  return kind === 'ACCEPTANCE' ? ['FINANCE', 'LEAD'] : ['LEGAL', 'FINANCE'];
}

function defaultDescriptionFor(id: string, subject: string, kind: 'CONTRACT' | 'ACCEPTANCE'): string {
  if (id.startsWith('CTV-')) {
    return kind === 'CONTRACT'
      ? 'Hợp đồng nguyên tắc theo tháng dành cho Cộng tác viên (CTV) sản xuất video kênh nội bộ.'
      : 'Biên bản nghiệm thu tổng hợp số lượng video đạt chuẩn trong tháng của CTV để tất toán thù lao.';
  }
  return kind === 'CONTRACT'
    ? `Mẫu hợp đồng dịch vụ sản xuất & đăng tải video quảng cáo áp dụng cho đối tác là ${subject.toLowerCase()}.`
    : `Biên bản nghiệm thu link bài đăng, mã Spark Ads và giá trị thanh toán thực tế cho đối tác ${subject.toLowerCase()}.`;
}

async function readCatalogOverrides(): Promise<Record<string, CatalogOverride>> {
  try {
    const raw = await readFile(catalogFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCatalogOverrides(map: Record<string, CatalogOverride>) {
  await mkdir(path.dirname(catalogFile()), { recursive: true });
  await writeFile(catalogFile(), JSON.stringify(map, null, 2), 'utf8');
}

async function readSourceBuffer(id: string, override?: CatalogOverride): Promise<{ buffer: Buffer; filename: string; name: string; subject: string; kind: 'CONTRACT' | 'ACCEPTANCE'; version: string }> {
  const builtIn = SOURCES.find(s => s[0] === id);
  requireCondition(builtIn || override, 'Không tìm thấy mẫu pháp chế.', 404);
  const name = override?.name || builtIn![1];
  const filename = override?.filename || builtIn![4];
  const subject = override?.subject || builtIn![2];
  const kind = override?.kind || builtIn![3];
  const version = override?.version || 'Ver052026';
  if (override?.customFile) {
    const buffer = await readFile(path.join(customTemplateDirectory(), override.customFile));
    return { buffer, filename, name, subject, kind, version };
  }
  const directory = process.env.CONTRACT_TEMPLATE_DIR || path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'Quản lý hợp đồng');
  const buffer = await readFile(path.join(/*turbopackIgnore: true*/ directory, builtIn![4]));
  return { buffer, filename, name, subject, kind, version };
}

export async function archiveTemplate(id: string, hash: string) {
  const { template } = await loadTemplate(id); requireCondition(template.hash === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  const overrides = await readCatalogOverrides();
  const { buffer } = await readSourceBuffer(id, overrides[id]);
  requireCondition(createHash('sha256').update(buffer).digest('hex') === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  if (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres') {
    await mkdir(archiveDirectory(), { recursive: true });
    await writeFile(path.join(archiveDirectory(), `${hash}.docx`), buffer, { flag: 'wx', mode: 0o600 }).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; });
  } else await prisma.$executeRaw`INSERT INTO "ContractTemplateSnapshot" (hash, "templateId", file) VALUES (${hash}, ${id}, ${buffer}) ON CONFLICT (hash) DO NOTHING`;
}
function parseDocParagraph(pXml: string, part: string, paragraph: number): DocParagraph {
  const text = paragraphText(pXml);
  const pPr = pXml.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/)?.[1] || '';
  const jc = pPr.match(/<w:jc\b[^>]*w:val="([^"]+)"/i)?.[1]?.toLowerCase();
  const trimmed = text.trim();
  const align: DocParagraph['align'] =
    jc === 'center' ? 'center'
    : jc === 'right' ? 'right'
    : jc === 'both' || jc === 'distribute' ? 'justify'
    : /^(CỘNG HÒA|Độc lập\s*-\s*Tự do|HỢP ĐỒNG|BIÊN BẢN|Số:\s)/i.test(trimmed) ? 'center'
    : undefined;
  const runs = [...pXml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)]
    .map(r => {
      const rPr = r[1].match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/)?.[1] || '';
      return {
        text: paragraphText(r[0]),
        bold: /<w:b\b(?![^>]*w:val="(?:false|0)")/i.test(rPr),
        italic: /<w:i\b(?![^>]*w:val="(?:false|0)")/i.test(rPr),
      };
    })
    .filter(r => r.text.length > 0);
  const nonEmptyRuns = runs.filter(r => r.text.trim().length > 0);
  const bold =
    /<w:b\b(?![^>]*w:val="(?:false|0)")/i.test(pPr) ||
    (nonEmptyRuns.length > 0 && nonEmptyRuns.every(r => r.bold)) ||
    /^(CỘNG HÒA|HỢP ĐỒNG|BIÊN BẢN|ĐIỀU \d+|BÊN SỬ DỤNG|BÊN CUNG ỨNG|ĐẠI DIỆN BÊN)/i.test(trimmed);
  const italic =
    /<w:i\b(?![^>]*w:val="(?:false|0)")/i.test(pPr) ||
    (nonEmptyRuns.length > 0 && nonEmptyRuns.every(r => r.italic));
  let boldPrefix: number | undefined;
  if (!bold && runs.length > 1 && runs[0].bold) {
    let len = 0;
    for (const r of runs) {
      if (r.bold || !r.text.trim()) len += r.text.length;
      else break;
    }
    if (len > 0 && len < text.length) boldPrefix = len;
  }
  return {
    kind: 'p',
    part,
    paragraph,
    text,
    ...(align ? { align } : {}),
    ...(bold ? { bold: true } : {}),
    ...(italic ? { italic: true } : {}),
    ...(boldPrefix ? { boldPrefix } : {}),
  };
}

function cellDirectText(cell: DocTableCell): string {
  return cell.blocks
    .filter((b): b is DocParagraph => b.kind === 'p')
    .map(p => p.text.trim())
    .filter(Boolean)
    .join(' ');
}

function classifyTable(table: DocTable): DocTable['variant'] {
  const firstRowTexts = (table.rows[0] || []).map(cellDirectText);
  if (firstRowTexts.some(t => /^ĐẠI DIỆN BÊN/i.test(t))) return 'signature';
  if (
    firstRowTexts.some(t => /^(BÊN SỬ DỤNG DỊCH VỤ|BÊN CUNG ỨNG DỊCH VỤ|BÊN A|BÊN B)$/i.test(t)) ||
    table.rows.some(r => r.length >= 2 && cellDirectText(r[1]) === ':')
  ) {
    return 'party';
  }
  return 'grid';
}

export function extractBlocks(xml: string, part: string): DocBlock[] {
  const root: DocBlock[] = [];
  const stack: Array<{ table: DocTable; row?: DocTableCell[]; cell?: DocTableCell }> = [];
  const allTables: DocTable[] = [];
  let paragraphIndex = 0;
  const tokenRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:tbl\b[^>]*>|<\/w:tbl>|<w:tr\b[^>]*>|<\/w:tr>|<w:tc\b[^>]*>|<\/w:tc>|<w:tcPr\b[^>]*>[\s\S]*?<\/w:tcPr>/g;
  for (const match of xml.matchAll(tokenRegex)) {
    const token = match[0];
    if (token.startsWith('<w:p')) {
      const p = parseDocParagraph(token, part, paragraphIndex++);
      const top = stack.at(-1);
      if (top?.cell) top.cell.blocks.push(p);
      else root.push(p);
    } else if (token.startsWith('<w:tbl')) {
      const table: DocTable = { kind: 'table', part, variant: 'grid', rows: [] };
      allTables.push(table);
      const top = stack.at(-1);
      if (top?.cell) top.cell.blocks.push(table);
      else root.push(table);
      stack.push({ table });
    } else if (token === '</w:tbl>') {
      stack.pop();
    } else if (token.startsWith('<w:tr')) {
      const top = stack.at(-1);
      if (top) {
        const row: DocTableCell[] = [];
        top.table.rows.push(row);
        top.row = row;
      }
    } else if (token === '</w:tr>') {
      const top = stack.at(-1);
      if (top) top.row = undefined;
    } else if (token.startsWith('<w:tcPr')) {
      const top = stack.at(-1);
      const span = token.match(/<w:gridSpan\b[^>]*w:val="(\d+)"/i);
      if (top?.cell && span && Number(span[1]) > 1) top.cell.colSpan = Number(span[1]);
    } else if (token.startsWith('<w:tc')) {
      const top = stack.at(-1);
      if (top?.row) {
        const cell: DocTableCell = { blocks: [] };
        top.row.push(cell);
        top.cell = cell;
      }
    } else if (token === '</w:tc>') {
      const top = stack.at(-1);
      if (top) top.cell = undefined;
    }
  }
  for (const t of allTables) t.variant = classifyTable(t);
  return root;
}

export async function loadTemplate(id: string, expectedHash?: string): Promise<{ template: LegalTemplate; zip: JSZip }> {
  const overrides = await readCatalogOverrides();
  const override = overrides[id];
  const source = SOURCES.find(s => s[0] === id);
  requireCondition(source || override, 'Không tìm thấy mẫu pháp chế.', 404);
  const name = override?.name || source![1];
  const filename = override?.filename || source![4];
  const subject = override?.subject || source![2];
  const kind = override?.kind || source![3];
  const version = override?.version || 'Ver052026';
  const category = override?.category || defaultCategoryFor(id, kind);
  const description = override?.description || defaultDescriptionFor(id, subject, kind);
  const active = override?.active !== undefined ? override.active : true;
  const defaultReviewRoles = override?.defaultReviewRoles?.length ? override.defaultReviewRoles : defaultReviewRolesFor(kind);
  const updatedAt = override?.updatedAt || '2026-05-01T08:00:00.000Z';
  const updatedBy = override?.updatedBy || 'Phòng Pháp chế';

  let buffer: Buffer;
  try {
    const loaded = await readSourceBuffer(id, override);
    buffer = loaded.buffer;
  } catch (e) {
    if (!expectedHash) throw e;
    buffer = Buffer.alloc(0);
  }
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
  const blocksByPart = new Map<string, DocBlock[]>();
  const parts = Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p)).sort();
  for (const part of parts) {
    const xml = await zip.file(part)!.async('string');
    fields.push(...describeFields(extractFields(xml, part), subject));
    texts.push(...paragraphs(xml).map(p => paragraphText(p[0])));
    blocksByPart.set(part, extractBlocks(xml, part));
  }
  const orderedParts = [
    ...parts.filter(p => p.startsWith('word/header')),
    ...parts.filter(p => p === 'word/document.xml'),
    ...parts.filter(p => p.startsWith('word/footer')),
  ];
  const blocks = orderedParts.flatMap(p => blocksByPart.get(p) || []);
  const hash = createHash('sha256').update(buffer).digest('hex');
  const history: TemplateVersionHistoryItem[] = override?.history?.length
    ? override.history
    : [{ version, hash, filename, updatedAt, updatedBy, note: 'Phiên bản chuẩn ban hành bởi Pháp chế' }];
  return {
    zip,
    template: {
      id,
      name,
      filename,
      subject,
      kind,
      version,
      hash,
      fields,
      paragraphs: texts,
      blocks,
      category,
      description,
      active,
      defaultReviewRoles,
      updatedAt,
      updatedBy,
      fieldCount: fields.length,
      requiredFieldCount: fields.filter(f => f.required).length,
      history,
    },
  };
}

export async function templateCatalog() {
  const overrides = await readCatalogOverrides();
  const builtInIds = SOURCES.map(s => s[0] as string);
  const customIds = Object.keys(overrides).filter(id => !builtInIds.includes(id));
  const allIds = [...builtInIds, ...customIds];
  return Promise.all(
    allIds.map(async id => {
      const { template } = await loadTemplate(id);
      return { ...template, paragraphs: [], fields: [], blocks: [] };
    }),
  );
}

export async function saveTemplateMeta(
  id: string,
  actorName: string,
  input: {
    name?: string;
    subject?: string;
    kind?: 'CONTRACT' | 'ACCEPTANCE';
    category?: ContractCategory;
    version?: string;
    description?: string;
    active?: boolean;
    defaultReviewRoles?: ('LEGAL' | 'FINANCE' | 'LEAD')[];
  },
): Promise<LegalTemplate> {
  const { template } = await loadTemplate(id);
  const overrides = await readCatalogOverrides();
  const prev = overrides[id];
  const now = new Date().toISOString();
  const nextVersion = input.version?.trim() || template.version;
  const history: TemplateVersionHistoryItem[] = prev?.history?.length
    ? [...prev.history]
    : [...(template.history || [])];

  if (nextVersion !== template.version && !history.some(h => h.version === nextVersion && h.hash === template.hash)) {
    history.unshift({
      version: nextVersion,
      hash: template.hash,
      filename: template.filename,
      updatedAt: now,
      updatedBy: actorName,
      note: 'Cập nhật thông tin danh mục biểu mẫu',
    });
  }

  overrides[id] = {
    id,
    name: input.name?.trim() || template.name,
    filename: template.filename,
    subject: input.subject?.trim() || template.subject,
    kind: input.kind || template.kind,
    category: input.category || template.category || defaultCategoryFor(id, template.kind),
    version: nextVersion,
    description: input.description !== undefined ? input.description.trim() : template.description,
    active: input.active !== undefined ? input.active : (template.active ?? true),
    defaultReviewRoles: input.defaultReviewRoles?.length ? input.defaultReviewRoles : (template.defaultReviewRoles || defaultReviewRolesFor(template.kind)),
    customFile: prev?.customFile,
    updatedAt: now,
    updatedBy: actorName,
    history,
  };
  await writeCatalogOverrides(overrides);
  return (await loadTemplate(id)).template;
}

export async function uploadTemplateDocx(
  id: string,
  actorName: string,
  input: {
    base64Docx: string;
    filename: string;
    name?: string;
    subject?: string;
    kind?: 'CONTRACT' | 'ACCEPTANCE';
    category?: ContractCategory;
    version?: string;
    description?: string;
    defaultReviewRoles?: ('LEGAL' | 'FINANCE' | 'LEAD')[];
    note?: string;
  },
): Promise<LegalTemplate> {
  requireCondition(/^[A-Z0-9_-]{3,32}$/i.test(id), 'Mã biểu mẫu chỉ gồm chữ, số, gạch ngang (3–32 ký tự).');
  const buffer = Buffer.from(input.base64Docx, 'base64');
  requireCondition(buffer.byteLength > 200 && buffer.byteLength <= 15 * 1024 * 1024, 'File .docx không hợp lệ hoặc vượt quá 15MB.');

  // Kiểm tra cấu trúc .docx hợp lệ trước khi lưu
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    requireCondition(false, 'Tệp tải lên không phải định dạng Word (.docx) hợp lệ.');
    throw new Error('Invalid docx');
  }
  requireCondition(Boolean(zip.file('word/document.xml')), 'File .docx thiếu nội dung word/document.xml.');

  const overrides = await readCatalogOverrides();
  const prev = overrides[id];
  const builtIn = SOURCES.find(s => s[0] === id);

  // Nếu mẫu đã tồn tại, lưu trữ bản cũ theo hash để các hợp đồng cũ không bị ảnh hưởng
  let existingTemplate: LegalTemplate | null = null;
  if (builtIn || prev) {
    try {
      const loaded = await loadTemplate(id);
      existingTemplate = loaded.template;
      await archiveTemplate(id, existingTemplate.hash);
    } catch {
      // Bỏ qua nếu mẫu mới
    }
  }

  const newHash = createHash('sha256').update(buffer).digest('hex');
  await mkdir(customTemplateDirectory(), { recursive: true });
  await mkdir(archiveDirectory(), { recursive: true });

  const customFilename = `${id}-${newHash.slice(0, 12)}.docx`;
  await writeFile(path.join(customTemplateDirectory(), customFilename), buffer, { mode: 0o600 });
  await writeFile(path.join(archiveDirectory(), `${newHash}.docx`), buffer, { flag: 'wx', mode: 0o600 }).catch(e => {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  });

  const now = new Date().toISOString();
  const kind = input.kind || existingTemplate?.kind || 'CONTRACT';
  const subject = input.subject?.trim() || existingTemplate?.subject || 'Cá nhân';
  const name = input.name?.trim() || existingTemplate?.name || `Mẫu ${kind === 'CONTRACT' ? 'Hợp đồng' : 'Nghiệm thu'} · ${subject}`;
  const version = input.version?.trim() || existingTemplate?.version || 'Ver102026';
  const filename = input.filename?.trim() || existingTemplate?.filename || `${id}.docx`;
  const category = input.category || existingTemplate?.category || defaultCategoryFor(id, kind);
  const description = input.description?.trim() || existingTemplate?.description || defaultDescriptionFor(id, subject, kind);
  const defaultReviewRoles = input.defaultReviewRoles?.length ? input.defaultReviewRoles : (existingTemplate?.defaultReviewRoles || defaultReviewRolesFor(kind));

  const prevHistory = prev?.history?.length ? prev.history : (existingTemplate?.history || []);
  const history: TemplateVersionHistoryItem[] = [
    {
      version,
      hash: newHash,
      filename,
      updatedAt: now,
      updatedBy: actorName,
      note: input.note?.trim() || (existingTemplate ? 'Cập nhật file .docx phiên bản mới' : 'Tạo mới biểu mẫu trong danh mục'),
    },
    ...prevHistory.filter(h => h.hash !== newHash),
  ];

  overrides[id] = {
    id,
    name,
    filename,
    subject,
    kind,
    category,
    version,
    description,
    active: prev?.active ?? true,
    defaultReviewRoles,
    customFile: customFilename,
    updatedAt: now,
    updatedBy: actorName,
    history,
  };
  await writeCatalogOverrides(overrides);
  return (await loadTemplate(id)).template;
}

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
