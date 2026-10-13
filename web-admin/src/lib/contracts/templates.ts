import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { ContractField, LegalTemplate } from './types';
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
function extractFields(xml: string, part: string): ContractField[] {
  const result: ContractField[] = []; const ps = paragraphs(xml); let previous = '';
  const blankParagraphs = new Map<number, string>();
  for (const row of xml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)) {
    const cells = [...row[0].matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)];
    const context = cells.map(c => paragraphText(c[0]).trim()).filter(t => t && t !== ':').join(' · ');
    if (!context || context.length > 180) continue;
    cells.forEach((cell, i) => {
      if (i === 0 || paragraphText(cell[0]).trim()) return;
      const cellOffset = row.index! + cell.index!;
      const first = ps.findIndex(p => p.index! >= cellOffset && p.index! < cellOffset + cell[0].length);
      if (first >= 0) blankParagraphs.set(first, context);
    });
  }
  ps.forEach((p, index) => {
    const text = paragraphText(p[0]); const blank = blankParagraphs.get(index);
    if (blank) result.push({ key: `${part}:p${index}:cell`, part, paragraph: index, label: blank, context: blank, required: /BÊN B|CCCD|MST|Mã số thuế|Địa chỉ|Email|điện thoại/i.test(blank) });
    // Các token rõ ràng và chỗ trống thuộc dòng khai báo; không coi dấu … trong văn xuôi là trường.
    const pattern = /\[[^\]\r\n]{1,60}\]|\.{3,}|_{3,}|…+/g;
    if (/\[|Hôm nay|tháng.*\/2026|điền|trong.{0,12}ngày|ngày.{0,12}tháng|tạm ứng|thanh toán|hoa hồng|mã code|Sản xuất và đăng tải|gắn link\/giỏ hàng|Sử dụng hình ảnh trong|Tham dự sự kiện|Đăng 1 post/i.test(text)) {
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
const archiveDirectory = () => path.resolve(process.env.CONTRACT_DATA_DIR || path.join(process.cwd(), '.contract-data'), 'sources');
export async function archiveTemplate(id: string, hash: string) {
  const { zip, template } = await loadTemplate(id); requireCondition(template.hash === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  // Dùng đúng bytes gốc, không giải nén/đóng gói lại để hash không đổi.
  void zip;
  const source = SOURCES.find(s => s[0] === id)!;
  const buffer = await readFile(path.join(process.env.CONTRACT_TEMPLATE_DIR || path.resolve(process.cwd(), '..', 'Quản lý hợp đồng'), source[4]));
  requireCondition(createHash('sha256').update(buffer).digest('hex') === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  if (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres') {
    await mkdir(archiveDirectory(), { recursive: true });
    await writeFile(path.join(archiveDirectory(), `${hash}.docx`), buffer, { flag: 'wx', mode: 0o600 }).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; });
  } else await prisma.$executeRaw`INSERT INTO "ContractTemplateSnapshot" (hash, "templateId", file) VALUES (${hash}, ${id}, ${buffer}) ON CONFLICT (hash) DO NOTHING`;
}
export async function loadTemplate(id: string, expectedHash?: string): Promise<{ template: LegalTemplate; zip: JSZip }> {
  const source = SOURCES.find(s => s[0] === id); requireCondition(source, 'Không tìm thấy mẫu pháp chế.', 404);
  const directory = process.env.CONTRACT_TEMPLATE_DIR || path.resolve(process.cwd(), '..', 'Quản lý hợp đồng');
  let buffer: Buffer;
  try { buffer = await readFile(path.join(directory, source[4])); }
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
    const xml = await zip.file(part)!.async('string'); fields.push(...extractFields(xml, part)); texts.push(...paragraphs(xml).map(p => paragraphText(p[0])));
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
