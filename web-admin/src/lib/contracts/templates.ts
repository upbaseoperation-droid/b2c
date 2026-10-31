import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { OFFICIAL_3STAGE_TEMPLATE_IDS, type AcceptanceScreenshotItem, type ContractCategory, type ContractField, type DocBlock, type DocParagraph, type DocTable, type DocTableCell, type FieldGroup, type FieldKind, type FieldSource, type LegalTemplate, type TemplateVersionHistoryItem } from './types';
export { OFFICIAL_3STAGE_TEMPLATE_IDS };
import { requireCondition } from './domain';
import prisma from '../prisma';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from './builtInTemplatesSnapshot';
import { loadTemplateFromContractService } from './contractSystemClient';
import { normalizeTemplateFieldsToApiKeys } from './contractSystemRules';
const SOURCES = [
  ['IND-HD', 'Hợp đồng video · Cá nhân', 'Cá nhân', 'CONTRACT', '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx'],
  ['IND-BBNT', 'Nghiệm thu video · Cá nhân', 'Cá nhân', 'ACCEPTANCE', '1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx'],
  ['HKD-HD', 'Hợp đồng video · Hộ kinh doanh', 'Hộ kinh doanh', 'CONTRACT', '2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx'],
  ['HKD-BBNT', 'Nghiệm thu video · Hộ kinh doanh', 'Hộ kinh doanh', 'ACCEPTANCE', '2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx'],
  ['COM-HD', 'Hợp đồng video · Công ty', 'Công ty', 'CONTRACT', '3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx'],
  ['COM-BBNT', 'Nghiệm thu video · Công ty', 'Công ty', 'ACCEPTANCE', '3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx'],
  ['CTV-HD', 'Hợp đồng nguyên tắc · CTV tháng', 'CTV tháng', 'CONTRACT', '4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx'],
  ['CTV-BBNT', 'Nghiệm thu · CTV tháng', 'CTV tháng', 'ACCEPTANCE', '4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx'],
  ['IND-LIVE-HD', 'Hợp đồng livestream · Cá nhân', 'Cá nhân', 'CONTRACT', '1. Hợp đồng booking Livestream cá nhân.docx'],
  ['IND-LIVE-BBNT', 'Nghiệm thu livestream · Cá nhân', 'Cá nhân', 'ACCEPTANCE', '2. BBNT booking Livestream cá nhân.docx'],
  ['HKD-LIVE-HD', 'Hợp đồng livestream · Hộ kinh doanh', 'Hộ kinh doanh', 'CONTRACT', '1. Hợp đồng booking Livestream HKD.docx'],
  ['HKD-LIVE-BBNT', 'Nghiệm thu livestream · Hộ kinh doanh', 'Hộ kinh doanh', 'ACCEPTANCE', '2. BBNT booking Livestream HKD.docx'],
  ['COM-LIVE-HD', 'Hợp đồng livestream · Công ty', 'Công ty', 'CONTRACT', '1. Hợp đồng booking Livestream công ty.docx'],
  ['COM-LIVE-BBNT', 'Nghiệm thu livestream · Công ty', 'Công ty', 'ACCEPTANCE', '2. BBNT booking Livestream công ty.docx'],
  ['IND-HDNT', 'Hợp đồng nguyên tắc video · Cá nhân', 'Cá nhân', 'CONTRACT', '1.1 HĐNT cá nhân booking Video.docx'],
  ['IND-SOW', 'SOW booking video · Cá nhân', 'Cá nhân', 'CONTRACT', '2.1 SOW cá nhân booking Video.docx'],
  ['IND-VID-BBNT', 'Nghiệm thu video (bản mới) · Cá nhân', 'Cá nhân', 'ACCEPTANCE', '3.1 BBNT cá nhân booking Video.docx'],
  ['HKD-HDNT', 'Hợp đồng nguyên tắc video · Hộ kinh doanh', 'Hộ kinh doanh', 'CONTRACT', '1.3 HĐNT HKD booking Video.docx'],
  ['HKD-SOW', 'SOW booking video · Hộ kinh doanh', 'Hộ kinh doanh', 'CONTRACT', '2.3 SOW HKD booking Video.docx'],
  ['HKD-VID-BBNT', 'Nghiệm thu video (bản mới) · Hộ kinh doanh', 'Hộ kinh doanh', 'ACCEPTANCE', '3.3 BBNT HKD booking Video.docx'],
  ['COM-HDNT', 'Hợp đồng nguyên tắc video · Công ty', 'Công ty', 'CONTRACT', '1.2 HĐNT công ty booking Video.docx'],
  ['COM-SOW', 'SOW booking video · Công ty', 'Công ty', 'CONTRACT', '2.2 SOW công ty booking Video.docx'],
  ['COM-VID-BBNT', 'Nghiệm thu video (bản mới) · Công ty', 'Công ty', 'ACCEPTANCE', '3.2 BBNT công ty booking Video.docx'],
  ['CTV-HDNT', 'Hợp đồng nguyên tắc CTV kênh (bản mới)', 'CTV tháng', 'CONTRACT', '1. HĐNT booking video CTV Kênh.docx'],
  ['CTV-VID-BBNT', 'Nghiệm thu CTV kênh theo tháng (bản mới)', 'CTV tháng', 'ACCEPTANCE', '2. BBNT booking video CTV Kênh.docx'],
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
  if (start === end && !inserted) {
    const plain = paragraphText(replaced);
    const sep = plain.endsWith(':') ? ' ' : '';
    return replaced.replace('</w:p>', `<w:r><w:t xml:space="preserve">${encodeXml(sep + value)}</w:t></w:r></w:p>`);
  }
  return replaced;
}
/** Chữ giữ chỗ trong ô bảng của mẫu (“Tên Công ty”, “Số… cấp ngày … tại…”, “Liệt kê đơn giá”): cả ô là chỗ điền. */
const PLACEHOLDER = /^(Tên (Công ty|Hộ kinh doanh)|MST |Địa chỉ (công ty|hộ kinh doanh)|Họ và tên$|\(?Nếu có\)?$|số\s?…|Số\s?…|Điều\s*…|Nội dung review sửa đổi|…|\.{3}|Liệt kê )/i;
const PARTY_REQUIRED = /^(BÊN B|CCCD|Mã số thuế|Địa chỉ|Số điện thoại|Email|Chủ hộ|Người đại diện)/i;
/** Tên ngắn của một dòng bảng: phần đầu trước dấu phẩy, “…” hoặc ngoặc. */
const shortName = (text: string) => text.split(/[,…:(]|\.{2,}/)[0].trim().slice(0, 60);
function extractFields(xml: string, part: string): ContractField[] {
  const result: ContractField[] = []; const ps = paragraphs(xml); let previous = '';
  const cellFields = new Map<number, Omit<ContractField, 'key' | 'part' | 'paragraph'>>();
  const firstParagraph = (offset: number, length: number) => ps.findIndex(p => p.index! >= offset && p.index! < offset + length);
  for (const table of xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    const rows = [...table[0].matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)].map(row => ({
      cells: [...row[0].matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)].map(c => ({
        xml: c[0],
        offset: table.index! + row.index! + c.index!,
        text: paragraphText(c[0]).trim(),
        vMergeContinue: /<w:vMerge\b(?![^>]*w:val="restart")/i.test(c[0]),
      })),
    }));
    // Bảng có hàng tiêu đề (STT | Hạng mục | Đơn giá…): nhãn ô = tên dòng · tên cột.
    const header = rows[0] && rows[0].cells.filter(c => c.text).length >= 3 ? rows[0].cells.map(c => c.text.replace(/\s*\((VNĐ|VND)\)\s*$/i, '').replace(/\/+$/, '').trim()) : null;
    rows.forEach(({ cells }, r) => {
      const filled = cells.filter(c => c.text);
      const context = filled.map(c => c.text).filter(t => t !== ':').join(' · ').slice(0, 900);
      if (!context) return;
      if (filled.length === 1 && /^Sau đây gọi tắt là/.test(filled[0].text)) return;
      const add = (cellIndex: number, title: string, required: boolean) => {
        const cell = cells[cellIndex]; const first = firstParagraph(cell.offset, cell.xml.length); if (first < 0) return;
        const placeholder = !!cell.text;
        cellFields.set(first, { label: title, context, required, ...(placeholder ? { start: 0, end: paragraphText(ps[first][0]).length } : {}) });
      };
      const fillable = (c: { text: string; vMergeContinue?: boolean }) => !c.vMergeContinue && (!c.text || PLACEHOLDER.test(c.text));
      if (cells.length >= 3 && cells[1].text === ':') {
        const isOptionalHint = /^\(?Nếu có\)?$/i.test(cells[2].text);
        if (fillable(cells[2])) add(2, cells[0].text, PARTY_REQUIRED.test(cells[0].text) && !isOptionalHint);
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
        const colSuffix = header && /Phí dịch vụ|Thành tiền/i.test(header[header.length - 1]) ? ` · ${header[header.length - 1]}` : '';
        add(cells.length - 1, `${cells[0].text ? `${cells[0].text} · ` : ''}${shortName(cells[1].text)}${colSuffix}`, /chưa bao gồm thuế|thực nhận|còn lại/i.test(cells[1].text));
      }
    });
  }
  ps.forEach((p, index) => {
    const text = paragraphText(p[0]); const cell = cellFields.get(index);
    if (cell) result.push({ key: `${part}:p${index}:cell`, part, paragraph: index, ...cell });
    const pFields: ContractField[] = [];
    if (!cell && /^(?:Tên chủ tài khoản|Số tài khoản|(?:Tại\s+)?Ngân hàng)\s*:\s*$/i.test(text)) {
      if (/^Tên chủ tài khoản/i.test(text)) {
        pFields.push({ key: 'token:[Tên chủ tài khoản]', part, paragraph: index, start: text.length, end: text.length, label: 'Tên chủ tài khoản', context: text, required: true });
      } else if (/^Số tài khoản/i.test(text)) {
        pFields.push({ key: 'token:[Số tài khoản]', part, paragraph: index, start: text.length, end: text.length, label: 'Số tài khoản', context: text, required: true });
      } else if (/Ngân hàng/i.test(text)) {
        pFields.push({ key: 'token:[Tại Ngân hàng]', part, paragraph: index, start: text.length, end: text.length, label: 'Tại Ngân hàng', context: text, required: true });
      }
    }
    const platformLinkMatch = !cell && text.match(/^(TikTok|Shopee|Facebook|Instagram|YouTube|Threads\/nền tảng khác)\s*:\s*(Link)\s*$/i);
    if (platformLinkMatch) {
      const linkStart = text.lastIndexOf(platformLinkMatch[2]);
      const platformName = platformLinkMatch[1];
      pFields.push({
        key: `${part}:p${index}:${linkStart}`,
        part,
        paragraph: index,
        start: linkStart,
        end: linkStart + platformLinkMatch[2].length,
        label: `Link kênh ${platformName} đăng tải`,
        context: text,
        required: false,
      });
    }
    if (!cell && /\/(?:HĐNT|HĐDV|SOW|BBNT)\/UPBASE-/i.test(text)) {
      const isRefLine = /Kèm theo|Căn cứ/i.test(text);
      for (const m of text.matchAll(/ddmmyy(?=\/(?:HĐNT|HĐDV|SOW|BBNT)\/UPBASE-)/g)) {
        const afterKind = text.slice(m.index! + 6, m.index! + 12);
        const tokenKey =
          isRefLine && afterKind.startsWith('/HĐNT/')
            ? 'token:[Ngày HĐNT]'
            : isRefLine && afterKind.startsWith('/SOW/')
              ? 'token:[Ngày SOW]'
              : 'token:[dd.mm.yy]';
        const tokenLabel = tokenKey.slice('token:['.length, -1);
        pFields.push({ key: tokenKey, part, paragraph: index, start: m.index!, end: m.index! + 6, label: tokenLabel, context: text || previous, required: true });
      }
      for (const m of text.matchAll(/UPBASE-(BRAND)-/g)) {
        const brandStart = m.index! + 'UPBASE-'.length;
        pFields.push({ key: 'token:[BRAND]', part, paragraph: index, start: brandStart, end: brandStart + 5, label: 'BRAND', context: text || previous, required: true });
      }
      for (const m of text.matchAll(/UPBASE-(?:BRAND-)?(ID KOC)/g)) {
        const idStart = m.index! + m[0].length - 'ID KOC'.length;
        pFields.push({ key: 'token:[ID KOC]', part, paragraph: index, start: idStart, end: idStart + 6, label: 'ID KOC', context: text || previous, required: true });
      }
    }
    // Các token rõ ràng và chỗ trống thuộc dòng khai báo; không coi dấu … trong văn xuôi là trường.
    const pattern = /\[[^\]\r\n]{1,60}\]|\.{3,}|_{3,}|…+/g;
    if (!cell && /\[|Hôm nay|tháng.*\/202|điền|trong.{0,12}ngày|ngày.{0,12}tháng|tạm ứng|thanh toán|hoa hồng|mã code|Sản xuất và đăng tải|gắn link\/giỏ hàng|Sử dụng hình ảnh|Tham dự sự kiện|Đăng 1 post|Là tài khoản mạng xã hội|Thời gian đăng tải|Ngày đăng tải|Thực hiện phiên livestream|Triển khai trên nền tảng|Cho phép Bên A sử dụng hình ảnh|Theo ủy quyền số|Sản phẩm được quảng cáo|Số lượng video|Thời lượng video|Nội dung được cung cấp|Định dạng file bàn giao|Thời hạn bàn giao|Số lượng phiên bản|Thời lượng từng phiên bản|chỉnh sửa tối đa|Thời hạn sử dụng|phục vụ việc quay|link video|cấp code chạy ad|nội dung sản xuất trong/i.test(text)) {
      for (const match of text.matchAll(pattern)) {
        const token = match[0]; const start = match.index!;
        const key = token.startsWith('[') ? `token:${token}` : `${part}:p${index}:${start}`;
        pFields.push({ key, part, paragraph: index, start, end: start + token.length, label: token.startsWith('[') ? token.slice(1, -1) : `${text.slice(Math.max(0, start - 35), start)} [điền] ${text.slice(start + token.length, start + token.length + 25)}`, context: text || previous, required: (token.startsWith('[') || /^Hôm nay/.test(text)) && !/Theo ủy quyền số/i.test(text) });
      }
    }
    if (pFields.length > 0) {
      pFields.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
      result.push(...pFields);
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
  [/^CCCD/i, s => (s === 'Công ty' ? 'Mã số thuế / Số ĐKKD' : 'Số CCCD'), 'cccd', 'text'],
  [/^Mã số thuế/i, () => 'Mã số thuế', 'taxCode', 'text'],
  [/^Địa chỉ/i, () => 'Địa chỉ', 'address', 'long'],
  [/^Số điện thoại/i, () => 'Số điện thoại', 'phone', 'text'],
  [/^Email/i, () => 'Email', 'email', 'text'],
  [/^Chủ hộ/i, () => 'Họ tên chủ hộ', 'ownerName', 'text'],
  [/^Người đại diện/i, () => 'Người đại diện', 'representative', 'text'],
  [/^Chức vụ/i, () => 'Chức vụ người đại diện', undefined, 'text'],
  [/^Tên\/Nghệ danh/i, () => 'Tên/Nghệ danh KOL/KOC/Talent', 'ownerName', 'text'],
];
type ProseRule = [RegExp, string[], FieldGroup, FieldKind[], Array<FieldSource | undefined>];
const PROSE: ProseRule[] = [
  [/^Hôm nay, ngày/, ['Ngày ký', 'Tháng ký', 'Năm ký (chữ số cuối, ví dụ 6 cho 2026)'], 'DATE', ['number', 'number', 'number'], ['signDay', 'signMonth', 'signYearDigit']],
  [/Là tài khoản mạng xã hội có link/i, ['Link kênh mạng xã hội'], 'PARTY', ['text'], ['channelLink']],
  [/Theo ủy quyền số/i, ['Số văn bản ủy quyền (nếu có)', 'Ngày ủy quyền'], 'PARTY', ['text', 'date'], []],
  [/^(?:Thời gian|Ngày) đăng tải \(air video\)/i, ['Thời gian đăng tải (air video)'], 'SCOPE', ['date'], ['airDate']],
  [/đẩy doanh số bán hàng với sản phẩm/, ['Sản phẩm', 'Nhãn hiệu', 'Thời gian đăng tải (air video)'], 'SCOPE', ['text', 'text', 'date'], ['product', 'brand', 'airDate']],
  [/Sản phẩm được quảng cáo/i, ['Sản phẩm được quảng cáo (tên sản phẩm + nhãn hiệu)'], 'SCOPE', ['text'], ['product']],
  [/^Số lượng video/i, ['Số lượng video'], 'SCOPE', ['number'], ['quantity']],
  [/^Thời lượng video/i, ['Thời lượng video (giây)'], 'SCOPE', ['number'], []],
  [/Nội dung được cung cấp/i, ['Nội dung cung cấp (Post-only, nếu có)'], 'SCOPE', ['text'], []],
  [/Định dạng file bàn giao/i, ['Định dạng file bàn giao (Production-only, nếu có)'], 'SCOPE', ['text'], []],
  [/^Thời hạn bàn giao/i, ['Thời gian đăng tải / bàn giao video (air video)'], 'SCOPE', ['date'], ['airDate']],
  [/^Số lượng phiên bản/i, ['Số lượng phiên bản cắt ngắn (nếu có)'], 'SCOPE', ['number'], []],
  [/^Thời lượng từng phiên bản/i, ['Thời lượng từng phiên bản cắt ngắn (nếu có)'], 'SCOPE', ['text'], []],
  [/chỉnh sửa tối đa/i, ['Số vòng chỉnh sửa video tối đa'], 'SCOPE', ['number'], []],
  [/phục vụ việc quay, sản xuất nội dung trong thời hạn/i, ['Thời hạn hoàn trả sản phẩm mẫu (ngày)'], 'SCOPE', ['number'], []],
  [/^link video/i, ['Link video nghiệm thu (Link Air)'], 'SCOPE', ['text'], []],
  [/gắn link\/giỏ hàng sản phẩm/, ['Sản phẩm gắn giỏ hàng'], 'SCOPE', ['text'], ['product']],
  [/mã code để chạy quảng cáo|cấp code chạy ad/i, ['Số ngày cấp mã quảng cáo'], 'SCOPE', ['number'], []],
  [/Sử dụng hình ảnh và video trong|Thời hạn sử dụng:\s*…\s*ngày|Quyền sử dụng hình ảnh và nội dung sản xuất trong/i, ['Số ngày sử dụng hình ảnh và video'], 'SCOPE', ['number'], []],
  [/Sử dụng hình ảnh trong/, ['Số ngày sử dụng hình ảnh', 'Ngày bắt đầu sử dụng hình ảnh'], 'SCOPE', ['number', 'date'], []],
  [/Thực hiện phiên livestream/i, ['Sản phẩm livestream', 'Nhãn hiệu', 'Nền tảng livestream', 'Kênh livestream', 'Khung giờ livestream', 'Ngày phát sóng livestream', 'Thời lượng lên hình tối thiểu (phút)'], 'SCOPE', ['text', 'text', 'text', 'text', 'text', 'date', 'number'], ['product', 'brand', undefined, 'channelLink', undefined, 'airDate', undefined]],
  [/Triển khai trên nền tảng/i, ['Nền tảng livestream', 'Kênh livestream', 'Khung giờ livestream', 'Ngày phát sóng livestream', 'Thời lượng lên hình tối thiểu (phút)'], 'SCOPE', ['text', 'text', 'text', 'date', 'number'], [undefined, 'channelLink', undefined, 'airDate', undefined]],
  [/Cho phép Bên A sử dụng hình ảnh/i, ['Thời hạn sử dụng hình ảnh livestream (tháng)'], 'SCOPE', ['number'], []],
  [/Hoa hồng organic/i, ['Hoa hồng organic (%)'], 'MONEY', ['number'], []],
  [/Hoa hồng chạy ads/i, ['Hoa hồng chạy ads (%)'], 'MONEY', ['number'], []],
  [/hưởng hoa hồng affiliate với tỷ lệ/i, ['Hoa hồng affiliate livestream (%)'], 'MONEY', ['number'], []],
  [/Tham dự sự kiện/, ['Số giờ tham dự sự kiện', 'Ngày tham dự sự kiện'], 'SCOPE', ['number', 'date'], []],
  [/Đăng 1 post trên Facebook/, ['Trang Facebook đăng bài'], 'SCOPE', ['text'], []],
  [/Lần 1.*tạm ứng/, ['Số tiền tạm ứng lần 1', 'Hạn tạm ứng (ngày làm việc)'], 'MONEY', ['money', 'number'], ['advanceAmount', undefined]],
  [/Lần 2|thanh toán (?:số tiền|phần giá trị) còn lại trong vòng/i, ['Hạn thanh toán lần 2 (ngày làm việc)'], 'MONEY', ['number'], []],
  [/tổng giá trị là/, ['Số tiền còn phải thanh toán', 'Số tiền bằng chữ'], 'MONEY', ['money', 'text'], ['remainingAmount', 'amountInWords']],
  [/Phí dịch vụ Bên A phải thanh toán/, ['Phí dịch vụ phải thanh toán'], 'MONEY', ['money'], ['netTotal']],
  [/THÁNG\s*(?:\.{2,}|…)|tháng\s*(?:\.{2,}|…)/i, ['Tháng nghiệm thu', 'Năm nghiệm thu (chữ số cuối)'], 'DATE', ['number', 'number'], ['signMonth', 'signYearDigit']],
];
function describeFields(fields: ContractField[], subject: string): ContractField[] {
  const titles = new Map<string, number>(); const byKey = new Map<string, string>();
  const rawDescribed = describeEach(fields, subject).map(f => {
    if (!f.title) return f;
    let title = f.title.length > 70 && f.title.includes("(") ? f.title.slice(0, f.title.indexOf("(")).trim() : f.title;
    if (byKey.has(f.key)) return { ...f, title: byKey.get(f.key) };
    const n = (titles.get(title) || 0) + 1; titles.set(title, n); if (n > 1) title = `${title} (${n})`;
    byKey.set(f.key, title); return { ...f, title };
  });
  return normalizeTemplateFieldsToApiKeys(rawDescribed);
}
function describeEach(fields: ContractField[], subject: string): ContractField[] {
  const seenInParagraph = new Map<string, number>();
  return fields.map((f): ContractField => {
    if (f.key === 'token:[dd.mm.yy]') return { ...f, title: 'Ngày lập (dd.mm.yy) trong số hợp đồng', group: 'NUMBER', kind: 'text', source: 'docDate' };
    if (f.key === 'token:[Ngày HĐNT]') return { ...f, title: 'Ngày lập HĐNT gốc (dd.mm.yy)', group: 'NUMBER', kind: 'text', source: 'parentContractDate' };
    if (f.key === 'token:[Ngày SOW]') return { ...f, title: 'Ngày lập Phụ lục SOW (dd.mm.yy)', group: 'NUMBER', kind: 'text', source: 'parentSowDate' };
    if (f.key === 'token:[BRAND]') return { ...f, title: 'Mã nhãn hàng (BRAND) trong số hợp đồng', group: 'NUMBER', kind: 'text', source: 'brand' };
    if (f.key === 'token:[ID KOC]') return { ...f, title: 'Mã KOC trong số hợp đồng', group: 'NUMBER', kind: 'text', source: 'kocId' };
    if (f.key === 'token:[Tên chủ tài khoản]') return { ...f, title: 'Tên chủ tài khoản ngân hàng', group: 'PARTY', kind: 'text', source: 'bankAccountName' };
    if (f.key === 'token:[Số tài khoản]') return { ...f, title: 'Số tài khoản ngân hàng', group: 'PARTY', kind: 'text', source: 'bankAccountNumber' };
    if (f.key === 'token:[Tại Ngân hàng]') return { ...f, title: 'Tại Ngân hàng', group: 'PARTY', kind: 'text', source: 'bankName' };
    if (/^Link kênh .* đăng tải$/i.test(f.label)) {
      const isTiktok = /TikTok/i.test(f.label);
      return { ...f, title: f.label, group: 'SCOPE', kind: 'text', ...(isTiktok ? { source: 'channelLink' } : {}) };
    }
    if (f.key.endsWith(':cell')) {
      const party = !f.label.includes(' · ') && PARTY_TITLES.find(([re]) => re.test(f.label));
      if (party) return { ...f, title: party[1](subject), group: 'PARTY', kind: party[3], source: party[2] };
      if (/Nội dung điều chỉnh\/áp dụng theo SOW|^Điều\s*…/i.test(f.label)) {
        return { ...f, title: 'Điều khoản điều chỉnh / ngoại lệ áp dụng theo SOW', group: 'OTHER', kind: 'long', required: false };
      }
      const isSettlementRow = /^(Tổng giá trị|Thuế TNCN|Thuế VAT|Giá trị đã tạm ứng|Chi phí phát sinh|Giá trị Bên A còn phải thanh toán)/i.test(f.label);
      if (isSettlementRow) {
        const title = f.label.replace(/^\d+(\.\d+)? · /, '').replace(/ · (Chi phí|Nội dung|Thành tiền.*|Phí dịch vụ.*)$/i, '');
        const net = (/chưa bao gồm thuế|thực nhận|^Tổng giá trị nghiệm thu$/i.test(title)) && !/VAT/i.test(f.label);
        const source: FieldSource | undefined =
          /^Thuế TNCN/i.test(title) ? 'pitAmount'
          : /^Thuế VAT/i.test(title) ? 'vatAmount'
          : /^Giá trị đã tạm ứng/i.test(title) ? 'advanceAmount'
          : /^Chi phí phát sinh/i.test(title) ? 'adjustmentAmount'
          : /^Giá trị Bên A còn phải thanh toán/i.test(title) ? 'remainingAmount'
          : net ? 'netTotal'
          : /chưa bao gồm thuế VAT/i.test(title) ? 'lineTotal'
          : /đã bao gồm (?:thuế|VAT|toàn bộ các khoản thuế)|Tổng giá trị Hợp đồng/i.test(f.label) ? 'grossTotal'
          : undefined;
        return { ...f, title, group: 'MONEY', kind: 'money', source };
      }
      const column = f.label.includes(' · ') ? f.label.split(' · ').pop()! : '';
      const firstRow = /^(Hạng mục video|Sản xuất và đăng tải|Thực hiện phiên livestream|Link video|Dòng 1 )/i.test(f.label);
      if (/Đơn giá|Mức giá/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'money', source: firstRow ? 'unitPrice' : undefined };
      if (/Số lượng/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'number', source: firstRow ? 'quantity' : undefined };
      if (/Thành tiền|Phí dịch vụ/i.test(column)) return { ...f, title: f.label, group: 'SCOPE', kind: 'money', source: firstRow ? 'lineTotal' : undefined };
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
  exemptLegalReview?: boolean;
  scope?: 'GLOBAL' | 'KOC_CUSTOM';
  kocId?: string;
  kocName?: string;
  approvedByLegal?: string;
  approvedAt?: string;
  originalContractId?: string;
  customType?: 'UPBASE_AMENDED' | 'KOC_FORM';
  legalNotes?: string;
  customFile?: string;
  updatedAt: string;
  updatedBy: string;
  history: TemplateVersionHistoryItem[];
}

function defaultCategoryFor(id: string, kind: 'CONTRACT' | 'ACCEPTANCE'): ContractCategory {
  if (id.startsWith('CTV-')) return 'CTV_FRAMEWORK';
  if (id.includes('-LIVE-') || id.endsWith('-SOW')) return 'LIVESTREAM_APPENDIX';
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
  if (id.endsWith('-SOW')) return `Phụ lục SOW của booking video (mỗi job hoặc mỗi tháng một phụ lục) đi kèm hợp đồng nguyên tắc, áp dụng cho đối tác là ${subject.toLowerCase()}.`;
  if (id.endsWith('-HDNT')) return `Hợp đồng nguyên tắc booking video (ký một lần khi bắt đầu hợp tác) dành cho đối tác là ${subject.toLowerCase()}.`;
  if (id.includes('-LIVE-')) {
    return kind === 'CONTRACT'
      ? `Mẫu hợp đồng booking livestream affiliate áp dụng cho đối tác là ${subject.toLowerCase()}, ký theo từng booking (hợp đồng sự vụ).`
      : `Biên bản nghiệm thu các phiên livestream và giá trị thanh toán thực tế cho đối tác ${subject.toLowerCase()}.`;
  }
  return kind === 'CONTRACT'
    ? `Mẫu hợp đồng dịch vụ sản xuất & đăng tải video quảng cáo áp dụng cho đối tác là ${subject.toLowerCase()}.`
    : `Biên bản nghiệm thu link bài đăng, mã Spark Ads và giá trị thanh toán thực tế cho đối tác ${subject.toLowerCase()}.`;
}

let cachedCatalogOverrides: { data: Record<string, CatalogOverride>; expiresAt: number } | null = null;
const parsedTemplateCache = new Map<string, { template: LegalTemplate; buffer?: Buffer }>();
let cachedCatalogResult: LegalTemplate[] | null = null;

function invalidateTemplateCaches() {
  cachedCatalogOverrides = null;
  parsedTemplateCache.clear();
  cachedCatalogResult = null;
}

async function readCatalogOverrides(): Promise<Record<string, CatalogOverride>> {
  const now = Date.now();
  if (cachedCatalogOverrides && cachedCatalogOverrides.expiresAt > now) {
    return cachedCatalogOverrides.data;
  }
  try {
    const raw = await readFile(catalogFile(), 'utf8');
    const parsed = JSON.parse(raw);
    const data = parsed && typeof parsed === 'object' ? parsed : {};
    cachedCatalogOverrides = { data, expiresAt: now + 30_000 };
    return data;
  } catch {
    const empty: Record<string, CatalogOverride> = {};
    cachedCatalogOverrides = { data: empty, expiresAt: now + 30_000 };
    return empty;
  }
}

async function writeCatalogOverrides(map: Record<string, CatalogOverride>) {
  invalidateTemplateCaches();
  await mkdir(path.dirname(catalogFile()), { recursive: true });
  await writeFile(catalogFile(), JSON.stringify(map, null, 2), 'utf8');
  cachedCatalogOverrides = { data: map, expiresAt: Date.now() + 30_000 };
}

export function resolveTemplateDir(): string {
  if (process.env.CONTRACT_TEMPLATE_DIR && existsSync(process.env.CONTRACT_TEMPLATE_DIR)) {
    return process.env.CONTRACT_TEMPLATE_DIR;
  }
  const candidates = [
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'Quản lý hợp đồng'),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'Quản lý hợp đồng'),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'B2C', 'Quản lý hợp đồng'),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'public', 'contracts'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'Quản lý hợp đồng');
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
  const directory = resolveTemplateDir();
  const buffer = await readFile(path.join(/*turbopackIgnore: true*/ directory, builtIn![4]));
  return { buffer, filename, name, subject, kind, version };
}

export async function archiveTemplate(id: string, hash: string) {
  const { template, zip } = await loadTemplate(id, hash); requireCondition(template.hash === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  const overrides = await readCatalogOverrides();
  let buffer: Buffer;
  try {
    const loaded = await readSourceBuffer(id, overrides[id]);
    buffer = loaded.buffer;
    requireCondition(createHash('sha256').update(buffer).digest('hex') === hash, 'Mẫu nguồn đã thay đổi trong lúc tạo hồ sơ.', 409);
  } catch (e) {
    if (template.remoteTemplateId || (OFFICIAL_TEMPLATES_SNAPSHOT[id] && !overrides[id]?.customFile && OFFICIAL_TEMPLATES_SNAPSHOT[id].hash === hash)) {
      buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    } else {
      throw e;
    }
  }
  if (process.env.CONTRACT_DATA_DIR || !process.env.DATABASE_URL || (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres')) {
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
      const vm = token.match(/<w:vMerge\b([^>]*)\/?>/i);
      if (top?.cell && vm) {
        top.cell.vMerge = /w:val="restart"/i.test(vm[1] || '') ? 'restart' : 'continue';
      }
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

function renderDocBlocksToXml(blocks: DocBlock[]): string {
  return blocks
    .map(b => {
      if (b.kind === 'p') {
        const pPr = b.align ? `<w:pPr><w:jc w:val="${b.align === 'justify' ? 'both' : b.align}"/></w:pPr>` : '';
        const rPr = b.bold || b.italic ? `<w:rPr>${b.bold ? '<w:b/>' : ''}${b.italic ? '<w:i/>' : ''}</w:rPr>` : '';
        return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${encodeXml(b.text)}</w:t></w:r></w:p>`;
      }
      const rowsXml = b.rows
        .map(row => {
          const cellsXml = row
            .map(cell => {
              const spanXml = cell.colSpan && cell.colSpan > 1 ? `<w:gridSpan w:val="${cell.colSpan}"/>` : '';
              const vmXml =
                cell.vMerge === 'restart'
                  ? '<w:vMerge w:val="restart"/>'
                  : cell.vMerge === 'continue'
                    ? '<w:vMerge/>'
                    : '';
              const tcPr = spanXml || vmXml ? `<w:tcPr>${spanXml}${vmXml}</w:tcPr>` : '';
              return `<w:tc>${tcPr}${renderDocBlocksToXml(cell.blocks)}</w:tc>`;
            })
            .join('');
          return `<w:tr>${cellsXml}</w:tr>`;
        })
        .join('');
      return `<w:tbl>${rowsXml}</w:tbl>`;
    })
    .join('');
}

function buildFallbackZipFromSnapshot(snap: LegalTemplate): JSZip {
  const fallbackZip = new JSZip();
  fallbackZip.file(
    'word/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  );
  const blocks = snap.blocks || [];
  const byPart = new Map<string, DocBlock[]>();
  for (const b of blocks) {
    const part = b.part || 'word/document.xml';
    const list = byPart.get(part) || [];
    list.push(b);
    byPart.set(part, list);
  }
  if (!byPart.has('word/document.xml')) {
    byPart.set(
      'word/document.xml',
      (snap.paragraphs || []).map((t, idx) => ({ kind: 'p' as const, part: 'word/document.xml', paragraph: idx, text: t })),
    );
  }
  for (const [part, partBlocks] of byPart.entries()) {
    const bodyXml = renderDocBlocksToXml(partBlocks);
    fallbackZip.file(
      part,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`,
    );
  }
  return fallbackZip;
}

export async function loadTemplate(id: string, expectedHash?: string, options?: { skipRemote?: boolean }): Promise<{ template: LegalTemplate; zip: JSZip }> {
  const overrides = await readCatalogOverrides();
  const override = overrides[id];
  const cacheKey = `${id}::${expectedHash || 'latest'}::${override?.updatedAt || ''}::${override?.customFile || ''}`;
  const cached = parsedTemplateCache.get(cacheKey);
  if (cached) {
    const zip = cached.buffer
      ? await JSZip.loadAsync(cached.buffer)
      : buildFallbackZipFromSnapshot(cached.template);
    return { zip, template: cached.template };
  }

  const source = SOURCES.find(s => s[0] === id);
  if (!options?.skipRemote && !override?.customFile && !process.env.CONTRACT_TEMPLATE_DIR) {
    const remoteTpl = await loadTemplateFromContractService(id);
    if (remoteTpl) {
      const merged: LegalTemplate = {
        ...remoteTpl,
        name: override?.name || remoteTpl.name,
        subject: override?.subject || remoteTpl.subject,
        kind: override?.kind || remoteTpl.kind,
        category: override?.category || remoteTpl.category,
        description: override?.description || remoteTpl.description,
        active: override?.active !== undefined ? override.active : remoteTpl.active,
        defaultReviewRoles: override?.defaultReviewRoles?.length ? override.defaultReviewRoles : remoteTpl.defaultReviewRoles,
        exemptLegalReview: override?.exemptLegalReview !== undefined ? override.exemptLegalReview : remoteTpl.exemptLegalReview,
        legalNotes: override?.legalNotes || remoteTpl.legalNotes,
        hash: expectedHash || remoteTpl.hash,
      };
      parsedTemplateCache.set(cacheKey, { template: merged });
      return { zip: buildFallbackZipFromSnapshot(merged), template: merged };
    }
  }
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
  const exemptLegalReview = override?.exemptLegalReview !== undefined ? override.exemptLegalReview : true;
  const scope = override?.scope || 'GLOBAL';
  const kocId = override?.kocId;
  const kocName = override?.kocName;
  const approvedByLegal = override?.approvedByLegal;
  const approvedAt = override?.approvedAt;
  const originalContractId = override?.originalContractId;
  const customType = override?.customType;
  const legalNotes = override?.legalNotes;
  const updatedAt = override?.updatedAt || '2026-05-01T08:00:00.000Z';
  const updatedBy = override?.updatedBy || 'Phòng Pháp chế';

  let buffer: Buffer;
  try {
    const loaded = await readSourceBuffer(id, override);
    buffer = loaded.buffer;
  } catch (e) {
    if (OFFICIAL_TEMPLATES_SNAPSHOT[id] && !override?.customFile && (!expectedHash || expectedHash === OFFICIAL_TEMPLATES_SNAPSHOT[id].hash)) {
      const snap = OFFICIAL_TEMPLATES_SNAPSHOT[id];
      const normalizedSnapFields = normalizeTemplateFieldsToApiKeys(snap.fields || []);
      const fallbackZip = buildFallbackZipFromSnapshot(snap);
      const templateObj: LegalTemplate = {
        ...snap,
        fields: normalizedSnapFields,
        fieldCount: normalizedSnapFields.length,
        requiredFieldCount: normalizedSnapFields.filter(f => f.required).length,
        name,
        filename,
        subject,
        kind,
        version,
        category,
        description,
        active,
        defaultReviewRoles,
        exemptLegalReview,
        scope,
        kocId,
        kocName,
        approvedByLegal,
        approvedAt,
        originalContractId,
        customType,
        legalNotes,
        updatedAt,
        updatedBy,
        history: override?.history?.length ? override.history : snap.history,
      };
      parsedTemplateCache.set(cacheKey, { template: templateObj });
      return {
        zip: fallbackZip,
        template: templateObj,
      };
    }
    if (!expectedHash) throw e;
    buffer = Buffer.alloc(0);
  }
  if (expectedHash && createHash('sha256').update(buffer).digest('hex') !== expectedHash) {
    requireCondition(/^[a-f0-9]{64}$/.test(expectedHash), 'Phiên bản nguồn không hợp lệ.', 409);
    if (OFFICIAL_TEMPLATES_SNAPSHOT[id]?.hash === expectedHash && !override?.customFile) {
      const snap = OFFICIAL_TEMPLATES_SNAPSHOT[id];
      const normalizedSnapFields = normalizeTemplateFieldsToApiKeys(snap.fields || []);
      const templateObj: LegalTemplate = {
        ...snap,
        fields: normalizedSnapFields,
        fieldCount: normalizedSnapFields.length,
        requiredFieldCount: normalizedSnapFields.filter(f => f.required).length,
        name,
        filename,
        subject,
        kind,
        version,
        category,
        description,
        active,
        defaultReviewRoles,
        exemptLegalReview,
        scope,
        kocId,
        kocName,
        approvedByLegal,
        approvedAt,
        originalContractId,
        customType,
        legalNotes,
        updatedAt,
        updatedBy,
        history: override?.history?.length ? override.history : snap.history,
      };
      parsedTemplateCache.set(cacheKey, { template: templateObj });
      return {
        zip: buildFallbackZipFromSnapshot(snap),
        template: templateObj,
      };
    }
    if (process.env.CONTRACT_DATA_DIR || !process.env.DATABASE_URL || (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres')) {
      try { buffer = await readFile(path.join(archiveDirectory(), `${expectedHash}.docx`)); }
      catch { requireCondition(false, 'Không tìm thấy bản mẫu gốc đã lưu cho phiên bản này.', 409); }
    } else {
      const rows = await prisma.$queryRaw<Array<{ file: Buffer }>>`SELECT file FROM "ContractTemplateSnapshot" WHERE hash=${expectedHash} AND "templateId"=${id}`;
      requireCondition(rows.length === 1, 'Không tìm thấy bản mẫu gốc đã lưu cho phiên bản này.', 409); buffer = rows[0].file;
    }
    requireCondition(createHash('sha256').update(buffer).digest('hex') === expectedHash, 'Bản mẫu lưu trữ không khớp phiên bản.', 409);
  }
  const zip = await JSZip.loadAsync(buffer);
  const rawFields: ContractField[] = []; const texts: string[] = [];
  const blocksByPart = new Map<string, DocBlock[]>();
  const parts = Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p)).sort();
  for (const part of parts) {
    const xml = await zip.file(part)!.async('string');
    rawFields.push(...describeFields(extractFields(xml, part), subject));
    texts.push(...paragraphs(xml).map(p => paragraphText(p[0])));
    blocksByPart.set(part, extractBlocks(xml, part));
  }
  const fields = normalizeTemplateFieldsToApiKeys(rawFields);
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
  const templateObj: LegalTemplate = {
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
    exemptLegalReview,
    scope,
    kocId,
    kocName,
    approvedByLegal,
    approvedAt,
    originalContractId,
    customType,
    legalNotes,
    updatedAt,
    updatedBy,
    fieldCount: fields.length,
    requiredFieldCount: fields.filter(f => f.required).length,
    history,
  };
  parsedTemplateCache.set(cacheKey, { template: templateObj, buffer });
  return {
    zip,
    template: templateObj,
  };
}

export async function templateCatalog() {
  if (cachedCatalogResult) {
    return cachedCatalogResult;
  }
  const overrides = await readCatalogOverrides();
  const builtInIds = SOURCES.map(s => s[0] as string);
  const customIds = Object.keys(overrides).filter(id => !builtInIds.includes(id));
  const allIds = [...builtInIds, ...customIds];
  const catalog = await Promise.all(
    allIds.map(async id => {
      const override = overrides[id];
      const source = SOURCES.find(s => s[0] === id);
      const snap = OFFICIAL_TEMPLATES_SNAPSHOT[id];
      // Nhánh siêu tốc: Với 25 mẫu chuẩn đã có trong OFFICIAL_TEMPLATES_SNAPSHOT và không dùng customFile riêng,
      // lấy ngay metadata từ snapshot + override mà không cần giải nén 25 file .docx bằng JSZip trên mỗi lần mở màn hình.
      if (snap && source && !override?.customFile && !process.env.CONTRACT_TEMPLATE_DIR) {
        const name = override?.name || source[1];
        const filename = override?.filename || source[4];
        const subject = override?.subject || source[2];
        const kind = override?.kind || source[3];
        const version = override?.version || snap.version || 'Ver052026';
        const category = override?.category || defaultCategoryFor(id, kind);
        const description = override?.description || defaultDescriptionFor(id, subject, kind);
        const active = override?.active !== undefined ? override.active : true;
        const defaultReviewRoles = override?.defaultReviewRoles?.length ? override.defaultReviewRoles : defaultReviewRolesFor(kind);
        const exemptLegalReview = override?.exemptLegalReview !== undefined ? override.exemptLegalReview : true;
        const scope = override?.scope || 'GLOBAL';
        const updatedAt = override?.updatedAt || snap.updatedAt || '2026-05-01T08:00:00.000Z';
        const updatedBy = override?.updatedBy || snap.updatedBy || 'Phòng Pháp chế';
        const normalizedSnapFields = normalizeTemplateFieldsToApiKeys(snap.fields || []);
        return {
          ...snap,
          name,
          filename,
          subject,
          kind,
          version,
          category,
          description,
          active,
          defaultReviewRoles,
          exemptLegalReview,
          scope,
          kocId: override?.kocId,
          kocName: override?.kocName,
          approvedByLegal: override?.approvedByLegal,
          approvedAt: override?.approvedAt,
          originalContractId: override?.originalContractId,
          customType: override?.customType,
          legalNotes: override?.legalNotes,
          updatedAt,
          updatedBy,
          fieldCount: normalizedSnapFields.length,
          requiredFieldCount: normalizedSnapFields.filter(f => f.required).length,
          history: override?.history?.length ? override.history : snap.history,
          paragraphs: [],
          fields: [],
          blocks: [],
        };
      }
      const { template } = await loadTemplate(id);
      return { ...template, paragraphs: [], fields: [], blocks: [] };
    }),
  );
  cachedCatalogResult = catalog;
  return catalog;
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
    exemptLegalReview?: boolean;
    scope?: 'GLOBAL' | 'KOC_CUSTOM';
    kocId?: string;
    kocName?: string;
    approvedByLegal?: string;
    approvedAt?: string;
    originalContractId?: string;
    customType?: 'UPBASE_AMENDED' | 'KOC_FORM';
    legalNotes?: string;
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
    exemptLegalReview: input.exemptLegalReview !== undefined ? input.exemptLegalReview : (template.exemptLegalReview ?? true),
    scope: input.scope || prev?.scope || template.scope || 'GLOBAL',
    kocId: input.kocId !== undefined ? input.kocId : (prev?.kocId || template.kocId),
    kocName: input.kocName !== undefined ? input.kocName : (prev?.kocName || template.kocName),
    approvedByLegal: input.approvedByLegal !== undefined ? input.approvedByLegal : (prev?.approvedByLegal || template.approvedByLegal),
    approvedAt: input.approvedAt !== undefined ? input.approvedAt : (prev?.approvedAt || template.approvedAt),
    originalContractId: input.originalContractId !== undefined ? input.originalContractId : (prev?.originalContractId || template.originalContractId),
    customType: input.customType !== undefined ? input.customType : (prev?.customType || template.customType),
    legalNotes: input.legalNotes !== undefined ? input.legalNotes : (prev?.legalNotes || template.legalNotes),
    customFile: prev?.customFile,
    updatedAt: now,
    updatedBy: actorName,
    history,
  };
  await writeCatalogOverrides(overrides);
  return (await loadTemplate(id)).template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const overrides = await readCatalogOverrides();
  const builtIn = SOURCES.find(s => s[0] === id);
  if (builtIn) {
    overrides[id] = {
      ...(overrides[id] || {
        id,
        name: builtIn[1],
        filename: builtIn[4],
        subject: builtIn[2],
        kind: builtIn[3],
        category: defaultCategoryFor(id, builtIn[3]),
        version: 'Ver052026',
        defaultReviewRoles: defaultReviewRolesFor(builtIn[3]),
        exemptLegalReview: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Phòng Pháp chế',
        history: [],
      }),
      active: false,
    };
    await writeCatalogOverrides(overrides);
    return;
  }
  if (overrides[id]) {
    delete overrides[id];
    await writeCatalogOverrides(overrides);
  }
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
    exemptLegalReview?: boolean;
    scope?: 'GLOBAL' | 'KOC_CUSTOM';
    kocId?: string;
    kocName?: string;
    approvedByLegal?: string;
    approvedAt?: string;
    originalContractId?: string;
    customType?: 'UPBASE_AMENDED' | 'KOC_FORM';
    legalNotes?: string;
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
    exemptLegalReview: input.exemptLegalReview !== undefined ? input.exemptLegalReview : (existingTemplate?.exemptLegalReview ?? true),
    scope: input.scope || prev?.scope || existingTemplate?.scope || 'GLOBAL',
    kocId: input.kocId !== undefined ? input.kocId : (prev?.kocId || existingTemplate?.kocId),
    kocName: input.kocName !== undefined ? input.kocName : (prev?.kocName || existingTemplate?.kocName),
    approvedByLegal: input.approvedByLegal !== undefined ? input.approvedByLegal : (prev?.approvedByLegal || existingTemplate?.approvedByLegal),
    approvedAt: input.approvedAt !== undefined ? input.approvedAt : (prev?.approvedAt || existingTemplate?.approvedAt),
    originalContractId: input.originalContractId !== undefined ? input.originalContractId : (prev?.originalContractId || existingTemplate?.originalContractId),
    customType: input.customType !== undefined ? input.customType : (prev?.customType || existingTemplate?.customType),
    legalNotes: input.legalNotes !== undefined ? input.legalNotes : (prev?.legalNotes || existingTemplate?.legalNotes),
    customFile: customFilename,
    updatedAt: now,
    updatedBy: actorName,
    history,
  };
  await writeCatalogOverrides(overrides);
  return (await loadTemplate(id)).template;
}

async function embedAcceptanceScreenshotsIntoDocxZip(
  zip: JSZip,
  screenshots: AcceptanceScreenshotItem[],
) {
  const validShots = (screenshots || []).filter(
    s => typeof s?.imageDataUrl === 'string' && s.imageDataUrl.startsWith('data:image/'),
  );
  if (validShots.length === 0) return;
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;

  const inspectionMeta = validShots.find(s => s.inspectionMeta)?.inspectionMeta;
  const fmtInt = (n?: number) =>
    typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('vi-VN').format(n) : '0';

  const relEntries: string[] = [];
  const paragraphsXml: string[] = [];

  if (inspectionMeta) {
    paragraphsXml.push(
      `<w:p><w:pPr><w:spacing w:before="220" w:after="80"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        'THÔNG TIN LINK AIR, CHỈ SỐ TƯƠNG TÁC & ĐỐI SOÁT KỊCH BẢN NGHIỆM THU:',
      )}</w:t></w:r></w:p>`,
      `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        '• Link bài đăng (Link Air): ',
      )}</w:t></w:r><w:r><w:t xml:space="preserve">${encodeXml(
        inspectionMeta.resolvedUrl || '',
      )}</w:t></w:r></w:p>`,
      `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        '• Kênh & Thời gian đăng: ',
      )}</w:t></w:r><w:r><w:t xml:space="preserve">${encodeXml(
        `@${inspectionMeta.authorHandle} (${inspectionMeta.authorNickname}) · Mã Video ID: ${
          inspectionMeta.videoId || '—'
        } · Ngày đăng: ${inspectionMeta.publishedTimeFormatted || '—'} · Thời lượng: ${
          inspectionMeta.durationSeconds
        } giây`,
      )}</w:t></w:r></w:p>`,
      `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        '• Chỉ số tương tác tại thời điểm nghiệm thu: ',
      )}</w:t></w:r><w:r><w:t xml:space="preserve">${encodeXml(
        `Lượt xem: ${fmtInt(inspectionMeta.viewsCount)} · Thả tim: ${fmtInt(
          inspectionMeta.likesCount,
        )} · Bình luận: ${fmtInt(inspectionMeta.commentsCount)} · Chia sẻ: ${fmtInt(
          inspectionMeta.sharesCount,
        )} · Lượt lưu: ${fmtInt(inspectionMeta.savesCount)} (ER: ${
          inspectionMeta.engagementRate
        }%)`,
      )}</w:t></w:r></w:p>`,
      `<w:p><w:pPr><w:spacing w:before="40" w:after="80"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        '• Giỏ hàng & Đối soát kịch bản: ',
      )}</w:t></w:r><w:r><w:t xml:space="preserve">${encodeXml(
        `${
          inspectionMeta.hasCartAnchor
            ? `Đã gắn giỏ hàng (${inspectionMeta.cartAnchorTitle || 'Sản phẩm chiến dịch'})`
            : 'Chưa gắn giỏ hàng'
        } · ${inspectionMeta.scriptSummaryNote}${
          inspectionMeta.hashtags.length > 0
            ? ` · Hashtag: ${inspectionMeta.hashtags.slice(0, 6).join(' ')}`
            : ''
        }`,
      )}</w:t></w:r></w:p>`,
    );
  }

  paragraphsXml.push(
    `<w:p><w:pPr><w:spacing w:before="180" w:after="100"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
      'HÌNH ẢNH CHỤP MÀN HÌNH VIDEO LÚC SẢN PHẨM XUẤT HIỆN (MINH CHỨNG NGHIỆM THU):',
    )}</w:t></w:r></w:p>`,
  );

  validShots.forEach((shot, idx) => {
    const match = shot.imageDataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/i);
    const noteText = shot.note || shot.captionQuote || '';
    const captionLine = `Ảnh ${idx + 1} [Mốc ${shot.timeLabel || '00:00'}]${
      shot.matchedTerm ? ` · Từ khóa/SP: ${shot.matchedTerm}` : ''
    }${noteText ? ` — ${noteText}` : ''}`;

    paragraphsXml.push(
      `<w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${encodeXml(
        captionLine,
      )}</w:t></w:r></w:p>`,
    );

    if (!match) return;
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === 'png' ? 'png' : 'jpg';
    const mediaFilename = `acceptance_screenshot_${idx + 1}.${ext}`;
    const rId = `rIdUpbaseShot${idx + 1}`;
    const docPrId = 9100 + idx;
    const imgBuf = Buffer.from(match[2], 'base64');
    if (imgBuf.byteLength < 32) return;

    zip.file(`word/media/${mediaFilename}`, imgBuf);
    relEntries.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaFilename}"/>`,
    );

    const cx = 2286000; // ~6.0 cm
    const cy = 4064000; // ~10.6 cm (tỉ lệ 9:16 khung hình dọc TikTok)
    paragraphsXml.push(
      `<w:p><w:pPr><w:spacing w:before="40" w:after="140"/></w:pPr><w:r><w:drawing>` +
        `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
        `<wp:extent cx="${cx}" cy="${cy}"/>` +
        `<wp:docPr id="${docPrId}" name="Screenshot ${idx + 1}" descr="${encodeXml(captionLine)}"/>` +
        `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
        `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
        `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${mediaFilename}"/><pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
        `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
    );
  });

  if (relEntries.length > 0) {
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
      let ctXml = await ctFile.async('string');
      if (!/Extension="jpg"/i.test(ctXml)) {
        ctXml = ctXml.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>');
      }
      if (!/Extension="png"/i.test(ctXml)) {
        ctXml = ctXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
      }
      zip.file('[Content_Types].xml', ctXml);
    }

    const relsPath = 'word/_rels/document.xml.rels';
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      const relsXml = await relsFile.async('string');
      const updatedRels = relsXml.replace('</Relationships>', `${relEntries.join('')}</Relationships>`);
      zip.file(relsPath, updatedRels);
    } else {
      zip.file(
        relsPath,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relEntries.join('')}</Relationships>`,
      );
    }
  }

  const docXml = await docFile.async('string');
  const injectedBlock = paragraphsXml.join('');
  // Chèn ngay trước bảng chữ ký cuối cùng (nếu có ĐẠI DIỆN BÊN A), hoặc trước <w:sectPr / </w:body>
  const tblMatches = [...docXml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)];
  const lastTbl = tblMatches.at(-1);
  let nextDocXml: string;
  if (lastTbl && lastTbl.index !== undefined && /ĐẠI DIỆN BÊN A|BÊN A/i.test(paragraphText(lastTbl[0]))) {
    nextDocXml = docXml.slice(0, lastTbl.index) + injectedBlock + docXml.slice(lastTbl.index);
  } else if (docXml.includes('<w:sectPr')) {
    const sectIdx = docXml.lastIndexOf('<w:sectPr');
    nextDocXml = docXml.slice(0, sectIdx) + injectedBlock + docXml.slice(sectIdx);
  } else {
    nextDocXml = docXml.replace('</w:body>', `${injectedBlock}</w:body>`);
  }
  zip.file('word/document.xml', nextDocXml);
}

export async function renderTemplate(
  id: string,
  expectedHash: string,
  values: Record<string, string>,
  acceptanceScreenshots?: AcceptanceScreenshotItem[],
) {
  const { template, zip } = await loadTemplate(id, expectedHash); requireCondition(template.hash === expectedHash, 'File nguồn không khớp phiên bản.', 409);
  const paymentOpt = values['meta:paymentScheduleOption'];
  const texts: string[] = [];
  for (const part of Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p)).sort()) {
    const xml = await zip.file(part)!.async('string'); let index = 0;
    let filled = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraph => {
      const paragraphIndex = index++;
      const fields = template.fields.filter(f => f.part === part && f.paragraph === paragraphIndex).sort((a, b) => (b.start || 0) - (a.start || 0));
      let next = paragraph;
      for (const field of fields) {
        const legacyTokenKey =
          field.key === 'CONTRACT_DATE_CODE' ? 'token:[dd.mm.yy]'
          : field.key === 'KOC_CODE' ? 'token:[ID KOC]'
          : field.key === 'BRAND_CODE' ? 'token:[BRAND]'
          : field.key === 'BANK_ACCOUNT_NAME' ? 'token:[Tên chủ tài khoản]'
          : field.key === 'BANK_ACCOUNT_NUMBER' ? 'token:[Số tài khoản]'
          : field.key === 'BANK_NAME' ? 'token:[Tại Ngân hàng]'
          : field.key === 'MASTER_CONTRACT_DATE' ? 'token:[Ngày HĐNT]'
          : field.key === 'PARENT_SOW_DATE' ? 'token:[Ngày SOW]'
          : '';
        const legacyRangeKey =
          field.start !== undefined && field.end !== undefined
            ? `${field.part}:p${field.paragraph}:${field.start}:${field.end}`
            : '';
        const legacyCellKey = `${field.part}:p${field.paragraph}:cell`;
        const value =
          values[field.key] ||
          (legacyTokenKey ? values[legacyTokenKey] : '') ||
          (legacyRangeKey ? values[legacyRangeKey] : '') ||
          values[legacyCellKey] ||
          '';
        if (!value?.trim()) continue;
        if (field.start !== undefined && field.end !== undefined) {
          next = replaceRange(next, field.start, field.end, value);
        } else {
          next = next.split(`{{${field.key}}}`).join(encodeXml(value));
          if (legacyTokenKey) {
            const rawTokenLabel = legacyTokenKey.replace(/^token:/, '');
            next = next.split(rawTokenLabel).join(encodeXml(value));
          }
        }
      }
      return next;
    });
    if (part === 'word/document.xml' && (paymentOpt === 'ONE_TIME' || paymentOpt === 'TWO_TIMES' || paymentOpt === 'BY_SOW')) {
      filled = filled.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, tblXml => {
        const rowMatches = [...tblXml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)];
        if (rowMatches.length < 2) return tblXml;
        const rowFirstCells = rowMatches.map(rm => {
          const firstCell = rm[0].match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/)?.[0] || '';
          return paragraphText(firstCell).trim();
        });
        const isPaymentChoiceTbl = rowFirstCells.every(txt =>
          /^Thanh toán\s*(0?1\s*lần|0?2\s*lần|theo\s*SOW)/i.test(txt),
        );
        if (!isPaymentChoiceTbl) return tblXml;
        const targetPattern =
          paymentOpt === 'TWO_TIMES'
            ? /Thanh toán\s*0?2\s*lần/i
            : paymentOpt === 'BY_SOW'
              ? /Thanh toán\s*theo\s*SOW/i
              : /Thanh toán\s*0?1\s*lần/i;
        const hasTarget = rowFirstCells.some(txt => targetPattern.test(txt));
        const effectivePattern = hasTarget ? targetPattern : /Thanh toán\s*0?1\s*lần/i;
        let nextTbl = tblXml;
        for (let i = rowMatches.length - 1; i >= 0; i--) {
          if (!effectivePattern.test(rowFirstCells[i])) {
            const rm = rowMatches[i];
            if (rm.index !== undefined) {
              nextTbl = nextTbl.slice(0, rm.index) + nextTbl.slice(rm.index + rm[0].length);
            }
          }
        }
        return nextTbl;
      });
    }
    texts.push(...paragraphs(filled).map(p => paragraphText(p[0])));
    zip.file(part, filled);
  }
  if (acceptanceScreenshots && acceptanceScreenshots.length > 0) {
    await embedAcceptanceScreenshotsIntoDocxZip(zip, acceptanceScreenshots);
  }
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), paragraphs: texts, template };
}

export async function parseAndStoreCustomDocx(
  base64Docx: string,
  filename: string,
  subject = 'Cá nhân',
): Promise<{
  hash: string;
  filename: string;
  blocks: DocBlock[];
  paragraphs: string[];
  fields: ContractField[];
}> {
  const cleanBase64 = base64Docx.includes(',') ? base64Docx.split(',')[1] : base64Docx;
  const buffer = Buffer.from(cleanBase64, 'base64');
  requireCondition(buffer.byteLength > 200 && buffer.byteLength <= 15 * 1024 * 1024, 'File .docx không hợp lệ hoặc vượt quá 15MB.');

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    requireCondition(false, 'Tệp tải lên không phải định dạng Word (.docx) hợp lệ.');
    throw new Error('Invalid docx');
  }
  requireCondition(Boolean(zip.file('word/document.xml')), 'File .docx thiếu nội dung word/document.xml.');

  const hash = createHash('sha256').update(buffer).digest('hex');
  if (process.env.CONTRACT_DATA_DIR || !process.env.DATABASE_URL || (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres')) {
    await mkdir(archiveDirectory(), { recursive: true });
    await writeFile(path.join(archiveDirectory(), `${hash}.docx`), buffer, { flag: 'wx', mode: 0o600 }).catch(e => {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    });
  } else {
    await prisma.$executeRaw`INSERT INTO "ContractTemplateSnapshot" (hash, "templateId", file) VALUES (${hash}, ${'KOC_CUSTOM_UPLOAD'}, ${buffer}) ON CONFLICT (hash) DO NOTHING`;
  }

  const fields: ContractField[] = [];
  const texts: string[] = [];
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

  return {
    hash,
    filename: filename.trim() || 'hop-dong-koc.docx',
    blocks,
    paragraphs: texts,
    fields,
  };
}

export async function readArchivedDocxBuffer(hash: string): Promise<Buffer | null> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  if (process.env.CONTRACT_DATA_DIR || !process.env.DATABASE_URL || (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres')) {
    try {
      return await readFile(path.join(archiveDirectory(), `${hash}.docx`));
    } catch {
      return null;
    }
  }
  const rows = await prisma.$queryRaw<Array<{ file: Buffer }>>`SELECT file FROM "ContractTemplateSnapshot" WHERE hash=${hash}`;
  return rows[0]?.file || null;
}
