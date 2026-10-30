// Đối chiếu nội dung bài đăng (caption, lời thoại, giỏ hàng) với brief của việc Self-channel.
// Máy chỉ đề xuất kết quả và bằng chứng; người dùng quyết định nghiệm thu.
import type { SelfChannelJob, SelfContentCheck, SelfContentCheckItem } from './selfChannelBoardRules';

export interface SelfContentEvidence {
  caption: string;
  hashtags: string[];
  transcript: string;
  /** null nếu nền tảng không cho biết */
  hasProductLink: boolean | null;
  productMentions: number;
  policyViolations: Array<{ word: string; category?: string; suggestion?: string }>;
  durationSeconds: number | null;
}

export const fold = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const tokens = (s: string): string[] =>
  Array.from(new Set(fold(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3)));

/** Tỷ lệ từ khóa của `needle` xuất hiện trong `haystack` (0..1). 0 nếu needle trống. */
export function overlapRatio(needle: string, haystack: string): number {
  const need = tokens(needle);
  if (need.length === 0) return 0;
  const hay = fold(haystack);
  return need.filter(t => hay.includes(t)).length / need.length;
}

export function splitTerms(raw?: string): string[] {
  return (raw || '')
    .split(/[,;\n|]/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

function quoteAround(text: string, term: string): string {
  const at = fold(text).indexOf(fold(term));
  if (at < 0) return '';
  const from = Math.max(0, at - 30);
  return `…${text.slice(from, at + term.length + 30).replace(/\s+/g, ' ').trim()}…`;
}

const item = (key: string, label: string, status: SelfContentCheckItem['status'], detail: string, evidence?: string): SelfContentCheckItem => ({
  key,
  label,
  status,
  detail,
  ...(evidence ? { evidence } : {}),
});

/** Kiểm tra bằng luật từ khóa: không cần khóa mô hình, luôn chạy được. */
export function buildSelfContentRuleItems(
  job: Pick<SelfChannelJob, 'hook' | 'usp' | 'cta' | 'forbiddenClaims' | 'productName' | 'cartUrl'>,
  ev: SelfContentEvidence
): SelfContentCheckItem[] {
  const items: SelfContentCheckItem[] = [];
  const text = `${ev.caption}\n${ev.transcript}`.trim();
  const hasText = text.length > 0;
  const noText = 'Không đọc được caption / lời thoại của bài, cần xem video để xác nhận.';

  // Từ cấm: từ brief của việc + từ vi phạm chính sách máy chủ đã phát hiện
  const banned = splitTerms(job.forbiddenClaims);
  const hits = banned.filter(t => fold(text).includes(fold(t)));
  const policyHits = ev.policyViolations.map(v => v.word).filter(w => !hits.some(h => fold(h) === fold(w)));
  if (hits.length || policyHits.length) {
    const all = [...hits, ...policyHits];
    items.push(item('forbidden', 'Từ cấm của Brand', 'FAIL', `Bài chứa từ cấm: ${all.join(', ')}.`, quoteAround(text, all[0])));
  } else if (!hasText) {
    items.push(item('forbidden', 'Từ cấm của Brand', 'WARN', noText));
  } else {
    items.push(item('forbidden', 'Từ cấm của Brand', 'PASS', banned.length ? 'Không thấy từ cấm trong caption và lời thoại.' : 'Việc chưa khai báo từ cấm.'));
  }

  // Sản phẩm
  const product = (job.productName || '').trim();
  if (product) {
    const ratio = overlapRatio(product, text);
    if (ev.productMentions > 0 || ratio >= 0.5) {
      items.push(item('product', 'Nhắc đúng sản phẩm', 'PASS', `Thấy sản phẩm "${product}" trong bài.`));
    } else if (!hasText) {
      items.push(item('product', 'Nhắc đúng sản phẩm', 'WARN', noText));
    } else {
      items.push(item('product', 'Nhắc đúng sản phẩm', 'WARN', `Chưa thấy tên sản phẩm "${product}" trong caption / lời thoại.`));
    }
  }

  // Hook: đối chiếu với đoạn mở đầu (lời thoại nếu có, không thì caption)
  const hook = (job.hook || '').trim();
  if (hook) {
    const opening = (ev.transcript || ev.caption).split(/\s+/).slice(0, 30).join(' ');
    const ratio = overlapRatio(hook, opening);
    if (!opening) items.push(item('hook', 'Mở đầu đúng hook', 'WARN', noText));
    else if (ratio >= 0.5) items.push(item('hook', 'Mở đầu đúng hook', 'PASS', 'Phần mở đầu khớp hook trong brief.', opening.slice(0, 120)));
    else items.push(item('hook', 'Mở đầu đúng hook', 'WARN', `Phần mở đầu chỉ khớp ${Math.round(ratio * 100)}% hook trong brief.`, opening.slice(0, 120)));
  }

  // Điểm chính (USP)
  const usp = (job.usp || '').trim();
  if (usp) {
    const ratio = overlapRatio(usp, text);
    if (!hasText) items.push(item('usp', 'Nêu điểm chính sản phẩm', 'WARN', noText));
    else if (ratio >= 0.4) items.push(item('usp', 'Nêu điểm chính sản phẩm', 'PASS', 'Bài có nhắc điểm chính trong brief.'));
    else items.push(item('usp', 'Nêu điểm chính sản phẩm', 'WARN', `Bài chỉ nhắc ${Math.round(ratio * 100)}% điểm chính trong brief.`));
  }

  // Giỏ hàng / kêu gọi hành động
  const cartRequired = Boolean((job.cartUrl || '').trim());
  if (ev.hasProductLink === true) {
    items.push(item('cta', 'Gắn giỏ hàng / kêu gọi mua', 'PASS', 'Bài đã gắn giỏ hàng sản phẩm.'));
  } else if (ev.hasProductLink === false && cartRequired) {
    items.push(item('cta', 'Gắn giỏ hàng / kêu gọi mua', 'FAIL', 'Việc yêu cầu gắn giỏ hàng nhưng bài chưa gắn.'));
  } else if (job.cta && overlapRatio(job.cta, text) >= 0.5) {
    items.push(item('cta', 'Gắn giỏ hàng / kêu gọi mua', 'PASS', 'Lời kêu gọi trong bài khớp CTA của brief.'));
  } else if (cartRequired || (job.cta || '').trim()) {
    items.push(item('cta', 'Gắn giỏ hàng / kêu gọi mua', 'WARN', ev.hasProductLink === null ? 'Không xác định được bài có gắn giỏ hàng hay không.' : 'Chưa thấy lời kêu gọi theo CTA của brief.'));
  }

  return items;
}

export function combineContentVerdict(items: SelfContentCheckItem[]): SelfContentCheck['verdict'] {
  if (items.some(i => i.status === 'FAIL')) return 'FAIL';
  if (items.some(i => i.status === 'WARN')) return 'REVIEW';
  return 'PASS';
}

/** Nội dung gửi mô hình: brief + bằng chứng đã đọc từ bài. Không chứa thông tin cá nhân của CTV. */
export function buildSelfContentModelInput(
  job: Pick<SelfChannelJob, 'productName' | 'angle' | 'pillar' | 'hook' | 'usp' | 'cta' | 'forbiddenClaims'>,
  ev: SelfContentEvidence,
  ruleItems: SelfContentCheckItem[]
): string {
  return [
    `Sản phẩm: ${job.productName || '—'}`,
    `Trụ cột: ${job.pillar || '—'} | Góc nội dung: ${job.angle || '—'}`,
    `Hook trong brief: ${job.hook || '—'}`,
    `Điểm chính trong brief: ${job.usp || '—'}`,
    `Kêu gọi hành động trong brief: ${job.cta || '—'}`,
    `Từ cấm: ${job.forbiddenClaims || '—'}`,
    '',
    `Caption bài đăng: ${ev.caption || '(không đọc được)'}`,
    `Hashtag: ${ev.hashtags.join(' ') || '—'}`,
    `Lời thoại / phụ đề: ${ev.transcript.slice(0, 3000) || '(không đọc được)'}`,
    `Gắn giỏ hàng: ${ev.hasProductLink === null ? 'không rõ' : ev.hasProductLink ? 'có' : 'không'}`,
    '',
    'Kết quả kiểm tra từ khóa đã có:',
    ...ruleItems.map(i => `- [${i.status}] ${i.label}: ${i.detail}`),
  ].join('\n');
}

/** Đọc JSON mô hình trả về; sai định dạng thì bỏ qua (không làm hỏng kết quả luật). */
export function parseSelfContentModelOutput(text: string): { items: SelfContentCheckItem[]; suggestion?: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as { items?: unknown; suggestion?: unknown };
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .map((x): SelfContentCheckItem | null => {
        const o = x as Partial<SelfContentCheckItem>;
        if (!o?.label || !['PASS', 'WARN', 'FAIL'].includes(String(o.status))) return null;
        return {
          key: `model-${String(o.key || o.label).slice(0, 24)}`,
          label: String(o.label).slice(0, 80),
          status: o.status as SelfContentCheckItem['status'],
          detail: String(o.detail || '').slice(0, 400),
          ...(o.evidence ? { evidence: String(o.evidence).slice(0, 240) } : {}),
        };
      })
      .filter((x): x is SelfContentCheckItem => x !== null)
      .slice(0, 8);
    return { items, suggestion: typeof raw.suggestion === 'string' ? raw.suggestion.slice(0, 600) : undefined };
  } catch {
    return null;
  }
}
