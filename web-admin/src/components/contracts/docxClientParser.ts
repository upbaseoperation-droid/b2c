import JSZip from 'jszip';
import type { DocBlock, DocParagraph, DocTable, DocTableCell } from '../../lib/contracts/types';

const decodeXml = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, v: string) =>
    v.startsWith('#x')
      ? String.fromCodePoint(parseInt(v.slice(2), 16))
      : v.startsWith('#')
        ? String.fromCodePoint(Number(v.slice(1)))
        : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[v] || '',
  );

const paragraphText = (xml: string) =>
  [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => decodeXml(m[1])).join('');

const paragraphs = (xml: string) => [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];

function parseDocParagraph(pXml: string, part: string, paragraph: number): DocParagraph {
  const text = paragraphText(pXml);
  const pPr = pXml.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/)?.[1] || '';
  const jc = pPr.match(/<w:jc\b[^>]*w:val="([^"]+)"/i)?.[1]?.toLowerCase();
  const trimmed = text.trim();
  const align: DocParagraph['align'] =
    jc === 'center'
      ? 'center'
      : jc === 'right'
        ? 'right'
        : jc === 'both' || jc === 'distribute'
          ? 'justify'
          : /^(CỘNG HÒA|Độc lập\s*-\s*Tự do|HỢP ĐỒNG|BIÊN BẢN|Số:\s)/i.test(trimmed)
            ? 'center'
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

function extractBlocksClient(xml: string, part: string): DocBlock[] {
  const root: DocBlock[] = [];
  const stack: Array<{ table: DocTable; row?: DocTableCell[]; cell?: DocTableCell }> = [];
  const allTables: DocTable[] = [];
  let paragraphIndex = 0;
  const tokenRegex =
    /<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:tbl\b[^>]*>|<\/w:tbl>|<w:tr\b[^>]*>|<\/w:tr>|<w:tc\b[^>]*>|<\/w:tc>|<w:tcPr\b[^>]*>[\s\S]*?<\/w:tcPr>/g;
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

export async function parseDocxInBrowser(base64Docx: string): Promise<{
  blocks: DocBlock[];
  paragraphs: string[];
}> {
  const clean = base64Docx.includes(',') ? base64Docx.split(',')[1] : base64Docx;
  const zip = await JSZip.loadAsync(clean, { base64: true });
  const parts = Object.keys(zip.files)
    .filter(p => /^word\/(document|header\d+|footer\d+)\.xml$/.test(p))
    .sort();
  if (!parts.includes('word/document.xml')) {
    throw new Error('File tải lên không phải định dạng Word (.docx) hợp lệ.');
  }
  const texts: string[] = [];
  const blocksByPart = new Map<string, DocBlock[]>();
  for (const part of parts) {
    const xml = await zip.file(part)!.async('string');
    texts.push(...paragraphs(xml).map(p => paragraphText(p[0])));
    blocksByPart.set(part, extractBlocksClient(xml, part));
  }
  const orderedParts = [
    ...parts.filter(p => p.startsWith('word/header')),
    ...parts.filter(p => p === 'word/document.xml'),
    ...parts.filter(p => p.startsWith('word/footer')),
  ];
  return {
    blocks: orderedParts.flatMap(p => blocksByPart.get(p) || []),
    paragraphs: texts,
  };
}
