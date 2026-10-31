/**
 * Phần dùng chung (chạy được cả trên trình duyệt) của luồng hợp đồng Google Doc:
 * bóc mã tài liệu từ link, tách điều khoản, so bản sửa với mẫu đã điền và phân điều khoản
 * cho Pháp chế hoặc Kế toán. Phần gọi Google (đọc file, bình luận, xuất file) ở googleDocsServer.ts.
 */

import type {
  ClauseReviewTarget,
  GoogleDocClauseDiff,
  GoogleDocsReviewRouting,
} from './googleDocsTypes';

export function extractGoogleDocId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // Dạng URL tiêu chuẩn: https://docs.google.com/document/d/{docId}/edit...
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }

  // Dạng URL dạng u/0/d/{docId}
  const matchAlt = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchAlt && matchAlt[1]) {
    return matchAlt[1];
  }

  // Dạng bare ID (độ dài >= 20 ký tự)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function googleDocsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) ||
      process.env.GOOGLE_DOCS_API_KEY,
  );
}

/** Tách danh sách đoạn văn thành các khối điều khoản (Điều 1, Điều 2...) */
export interface ContractClauseBlock {
  clauseNumber: string;
  title: string;
  content: string;
  paragraphs: string[];
}

export function parseClausesFromParagraphs(paragraphs: string[]): ContractClauseBlock[] {
  const blocks: ContractClauseBlock[] = [];
  let currentClause: ContractClauseBlock = {
    clauseNumber: 'MỞ ĐẦU',
    title: 'Căn cứ và thông tin các bên',
    content: '',
    paragraphs: [],
  };

  const clauseRegex = /^(Điều\s+\d+[\.:]?)\s*(.*)$/iu;

  for (const rawP of paragraphs) {
    const p = rawP.trim();
    if (!p) continue;

    const match = p.match(clauseRegex);
    if (match) {
      if (currentClause.paragraphs.length > 0 || currentClause.clauseNumber !== 'MỞ ĐẦU') {
        currentClause.content = currentClause.paragraphs.join('\n');
        blocks.push(currentClause);
      }
      currentClause = {
        clauseNumber: match[1].replace(/[\.:]$/, '').trim().replace(/^điều/iu, 'Điều'),
        title: match[2]?.trim() || match[1],
        content: '',
        paragraphs: [p],
      };
    } else {
      currentClause.paragraphs.push(p);
    }
  }

  if (currentClause.paragraphs.length > 0) {
    currentClause.content = currentClause.paragraphs.join('\n');
    blocks.push(currentClause);
  }

  return blocks;
}

/** Từ khóa phân loại thẩm định điều khoản */
const FINANCE_KEYWORDS = [
  'giá trị',
  'thanh toán',
  'tạm ứng',
  'quyết toán',
  'đơn giá',
  'chi phí',
  'ngân sách',
  'thuế',
  'tncn',
  'vat',
  'hóa đơn',
  'chuyển khoản',
  'tài khoản ngân hàng',
  'stk',
  'phạt chậm thanh toán',
  'hoàn tiền',
  'đối soát',
  'hoa hồng',
  'chiết khấu',
  'thưởng',
  'tiền mặt',
];

const LEGAL_KEYWORDS = [
  'sở hữu trí tuệ',
  'bản quyền',
  'quyền tác giả',
  'thương hiệu',
  'bảo mật',
  'độc quyền',
  'chấm dứt',
  'đơn phương',
  'phạt vi phạm',
  'bồi thường',
  'thiệt hại',
  'bất khả kháng',
  'tranh chấp',
  'tòa án',
  'trọng tài',
  'luật áp dụng',
  'hình ảnh',
  'khiếu nại',
  'vi phạm hợp đồng',
  'hiệu lực',
];

export function classifyClauseTarget(text: string, title: string): ClauseReviewTarget {
  const combined = `${title} ${text}`.toLowerCase();
  
  let financeHits = 0;
  for (const kw of FINANCE_KEYWORDS) {
    if (combined.includes(kw)) financeHits++;
  }

  let legalHits = 0;
  for (const kw of LEGAL_KEYWORDS) {
    if (combined.includes(kw)) legalHits++;
  }

  if (financeHits > 0 && legalHits > 0) {
    return financeHits >= legalHits * 2 ? 'FINANCE' : legalHits >= financeHits * 2 ? 'LEGAL' : 'BOTH';
  }
  if (financeHits > 0) return 'FINANCE';
  if (legalHits > 0) return 'LEGAL';
  
  return 'LEGAL'; // Mặc định các điều khoản khác cần Pháp chế rà soát
}

/** So khớp các điều khoản giữa Google Doc và Template chuẩn */
export function compareDocWithTemplate(
  docParagraphs: string[],
  templateParagraphs: string[],
): {
  clauseDiffs: GoogleDocClauseDiff[];
  reviewRouting: GoogleDocsReviewRouting;
} {
  const docClauses = parseClausesFromParagraphs(docParagraphs);
  const tplClauses = parseClausesFromParagraphs(templateParagraphs);

  const tplMap = new Map<string, ContractClauseBlock>();
  tplClauses.forEach(c => {
    tplMap.set(c.clauseNumber.toUpperCase(), c);
  });

  const diffs: GoogleDocClauseDiff[] = [];
  const handledTpl = new Set<string>();

  // Phần mở đầu là thông tin hai bên, khác nhau theo từng hồ sơ nên không so.
  for (const docC of docClauses) {
    const key = docC.clauseNumber.toUpperCase();
    if (key === 'MỞ ĐẦU') continue;
    const tplC = tplMap.get(key);

    if (!tplC) {
      // Điều khoản được thêm mới
      const targetRole = classifyClauseTarget(docC.content, docC.title);
      diffs.push({
        clauseNumber: docC.clauseNumber,
        title: docC.title,
        changeType: 'ADDED',
        targetRole,
        modifiedText: docC.content,
        explanation: `Điều khoản mới được bổ sung trên Google Docs, cần ${targetRole === 'FINANCE' ? 'Kế toán' : targetRole === 'LEGAL' ? 'Pháp chế' : 'cả Pháp chế và Kế toán'} thẩm định.`,
      });
    } else {
      handledTpl.add(key);
      const cleanDocText = docC.content.replace(/\s+/g, ' ').trim();
      const cleanTplText = tplC.content.replace(/\s+/g, ' ').trim();

      if (cleanDocText !== cleanTplText) {
        // Điều khoản có chỉnh sửa
        const targetRole = classifyClauseTarget(`${docC.content} ${tplC.content}`, `${docC.title} ${tplC.title}`);
        diffs.push({
          clauseNumber: docC.clauseNumber,
          title: docC.title || tplC.title,
          changeType: 'MODIFIED',
          targetRole,
          originalText: tplC.content,
          modifiedText: docC.content,
          explanation: `Có thay đổi câu chữ so với mẫu chuẩn. Phân luồng thẩm định: ${targetRole === 'FINANCE' ? 'Kế toán (TCKT)' : targetRole === 'LEGAL' ? 'Pháp chế' : 'Pháp chế & Kế toán'}.`,
        });
      }
    }
  }

  // Kiểm tra các điều khoản bị lược bỏ
  for (const tplC of tplClauses) {
    const key = tplC.clauseNumber.toUpperCase();
    if (!handledTpl.has(key) && key !== 'MỞ ĐẦU') {
      const targetRole = classifyClauseTarget(tplC.content, tplC.title);
      diffs.push({
        clauseNumber: tplC.clauseNumber,
        title: tplC.title,
        changeType: 'REMOVED',
        targetRole,
        originalText: tplC.content,
        explanation: `Điều khoản trong mẫu chuẩn đã bị xóa bỏ trên Google Docs. Phân luồng: ${targetRole === 'FINANCE' ? 'Kế toán' : 'Pháp chế'}.`,
      });
    }
  }

  const legalClauses = diffs.filter(d => d.targetRole === 'LEGAL' || d.targetRole === 'BOTH').map(d => d.clauseNumber);
  const financeClauses = diffs.filter(d => d.targetRole === 'FINANCE' || d.targetRole === 'BOTH').map(d => d.clauseNumber);

  const summary = diffs.length === 0
    ? 'Nội dung trên Google Docs khớp hoàn toàn với mẫu chuẩn hệ thống.'
    : `Phát hiện ${diffs.length} điều khoản có sửa đổi/bổ sung (${financeClauses.length} điều khoản liên quan Kế toán, ${legalClauses.length} điều khoản liên quan Pháp chế).`;

  return {
    clauseDiffs: diffs,
    reviewRouting: {
      requiresLegal: legalClauses.length > 0,
      requiresFinance: financeClauses.length > 0,
      legalClauses,
      financeClauses,
      clauseDiffs: diffs,
      summary,
      analyzedAt: new Date().toISOString(),
    },
  };
}

/**
 * So sánh giữa Bản đẩy lên ban đầu (initialSnapshot) và Bản chốt cuối (finalSnapshot / approvedSnapshot).
 * Dùng được cho cả Hợp đồng sửa từ mẫu UpBase và Hợp đồng theo Form riêng của KOC.
 */
export function compareInitialAndFinalDoc(
  finalParagraphs: string[],
  initialParagraphs: string[],
): GoogleDocClauseDiff[] {
  if (!initialParagraphs.length || !finalParagraphs.length) return [];
  const rawDiffs = compareDocWithTemplate(finalParagraphs, initialParagraphs).clauseDiffs;
  return rawDiffs.map(d => ({
    ...d,
    explanation:
      d.changeType === 'ADDED'
        ? `Điều khoản mới được bổ sung thêm trong quá trình đàm phán (so với bản đẩy lên ban đầu).`
        : d.changeType === 'REMOVED'
        ? `Điều khoản có trong bản đẩy lên ban đầu đã được lược bỏ sau khi đàm phán.`
        : `Điều khoản được điều chỉnh trong quá trình đàm phán giữa bản ban đầu và bản chốt cuối (${d.targetRole === 'FINANCE' ? 'Kế toán' : d.targetRole === 'LEGAL' ? 'Pháp chế' : 'Pháp chế & Kế toán'}).`,
  }));
}
