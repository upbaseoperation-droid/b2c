const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Đọc nội dung thẻ <meta property|name="key" content="...">, không phụ thuộc thứ tự thuộc tính. */
export function readMeta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i');
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;
  const content = tag.match(/content=(["'])([\s\S]*?)\1/i)?.[2];
  return content === undefined ? null : decodeHtmlEntities(content);
}

/**
 * Đổi số rút gọn sang số nguyên: "60M" → 60000000, "1.3K" → 1300, "1,2 N" → 1200, "12,345" → 12345.
 */
export function parseCompactNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase().replace(/\s+/g, '');
  const match = text.match(/^([\d.,]+)(k|n|m|tr|b|t)?$/);
  if (!match) return null;
  const [, numberPart, suffix] = match;
  const multiplier =
    suffix === 'k' || suffix === 'n'
      ? 1_000
      : suffix === 'm' || suffix === 'tr'
        ? 1_000_000
        : suffix === 'b' || suffix === 't'
          ? 1_000_000_000
          : 1;

  let normalized: string;
  if (multiplier === 1) {
    normalized = numberPart.replace(/[.,]/g, '');
  } else {
    normalized = numberPart.replace(',', '.');
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * multiplier) : null;
}

export function extractHashtags(text: string): string[] {
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(tags.map((t) => t.toLowerCase()))];
}

export function extractMentions(text: string): string[] {
  const mentions = text.match(/(?<![\p{L}\p{N}_.])@[\p{L}\p{N}_.]+/gu) ?? [];
  return [...new Set(mentions.map((m) => m.replace(/\.+$/, '').toLowerCase()))];
}

/** Bỏ dấu tiếng Việt và viết thường để so khớp từ khoá. */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function normalizeHandle(handle: string | null | undefined): string {
  return (handle ?? '').trim().replace(/^@+/, '').replace(/\/+$/, '').toLowerCase();
}

export function unixSecondsToIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds < 1_000_000_000) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Lấy giá trị số đầu tiên của "key":123 sau vị trí `from` trong chuỗi JSON nhúng. */
export function readJsonNumber(source: string, key: string, from = 0): number | null {
  const pattern = new RegExp(`"${key}":(\\d+)`, 'g');
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  return match ? Number(match[1]) : null;
}

/** Lấy chuỗi JSON "key":"..." (đã unescape) đầu tiên sau vị trí `from`. */
export function readJsonString(source: string, key: string, from = 0): string | null {
  const pattern = new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}
