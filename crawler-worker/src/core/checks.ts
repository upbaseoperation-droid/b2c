import { foldText, normalizeHandle } from './text.ts';
import type { LinkCheckItem, LinkCheckResult, LinkExpectation, Verdict } from './types.ts';

type CheckInput = Pick<
  LinkCheckResult,
  | 'platform'
  | 'contentId'
  | 'status'
  | 'statusDetail'
  | 'author'
  | 'publishedAt'
  | 'caption'
  | 'hashtags'
  | 'metrics'
  | 'hasProductLink'
> &
  Partial<Pick<LinkCheckResult, 'productTitle' | 'productUrl' | 'productId' | 'cartProducts' | 'cartDiagnosis'>>;

function extractProductIdFromToken(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\d{15,22}$/.test(trimmed)) return trimmed;
  const m =
    trimmed.match(/\/(?:view\/)?product\/(\d{15,22})(?:[/?#]|$)/i) ||
    trimmed.match(/[?&](?:product_id|item_id)=(\d{15,22})(?:[&#]|$)/i) ||
    trimmed.match(/-i\.\d+\.(\d+)(?:[/?#]|$)/i) ||
    trimmed.match(/\/product\/\d+\/(\d+)(?:[/?#]|$)/i) ||
    trimmed.split(/[?#]/)[0].match(/\/(\d{17,21})\/?$/);
  return m?.[1];
}

function normalizeCartUrl(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
}

/** Đối chiếu bài đăng với điều kiện nghiệm thu. Không có dữ liệu → WARN (cần người kiểm tra), không tự đánh FAIL. */
export function buildChecks(input: CheckInput, expect: LinkExpectation = {}): LinkCheckItem[] {
  const checks: LinkCheckItem[] = [];

  if (!input.platform) {
    checks.push({
      key: 'link_format',
      label: 'Định dạng link',
      status: 'FAIL',
      detail: 'Không nhận ra nền tảng. Hỗ trợ TikTok, Shopee Video, Facebook, Instagram.',
    });
    return checks;
  }

  checks.push(
    input.contentId
      ? { key: 'link_format', label: 'Định dạng link', status: 'PASS', detail: `Link có ID bài đăng ${input.contentId}.` }
      : {
          key: 'link_format',
          label: 'Định dạng link',
          status: 'FAIL',
          detail: 'Link không chứa ID bài đăng (link kênh hoặc link rút gọn không mở được). Cần link dài của đúng bài air.',
        }
  );

  const availability: Record<LinkCheckResult['status'], LinkCheckItem> = {
    LIVE: { key: 'availability', label: 'Trạng thái bài', status: 'PASS', detail: 'Bài đang hiển thị công khai.' },
    UNAVAILABLE: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'FAIL',
      detail: input.statusDetail || 'Bài đã bị xoá, ẩn hoặc chuyển riêng tư.',
    },
    INVALID_LINK: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'FAIL',
      detail: input.statusDetail || 'Link không hợp lệ.',
    },
    BLOCKED: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'WARN',
      detail: input.statusDetail || 'Nền tảng tạm chặn truy cập tự động. Thử lại sau hoặc cấu hình proxy.',
    },
    ERROR: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'WARN',
      detail: input.statusDetail || 'Không tải được trang bài đăng.',
    },
  };
  checks.push(availability[input.status]);
  if (input.status !== 'LIVE') return checks;

  if (expect.handle) {
    const expected = normalizeHandle(expect.handle);
    const actualHandle = normalizeHandle(input.author.handle);
    const actualName = normalizeHandle(input.author.name);
    if (!actualHandle && !actualName) {
      checks.push({ key: 'channel', label: 'Đúng kênh KOC', status: 'WARN', detail: 'Không đọc được kênh đăng bài.' });
    } else if (actualHandle === expected || (!actualHandle && actualName === expected)) {
      checks.push({ key: 'channel', label: 'Đúng kênh KOC', status: 'PASS', detail: `Đăng trên kênh @${expected}.` });
    } else {
      checks.push({
        key: 'channel',
        label: 'Đúng kênh KOC',
        status: 'FAIL',
        detail: `Bài thuộc kênh ${input.author.handle ? `@${input.author.handle}` : input.author.name}, không phải @${expected}.`,
      });
    }
  }

  if (expect.airFrom || expect.airTo) {
    const day = input.publishedAt?.slice(0, 10);
    const range = `${expect.airFrom ?? '…'} → ${expect.airTo ?? '…'}`;
    if (!day) {
      checks.push({
        key: 'air_date',
        label: 'Ngày air',
        status: 'WARN',
        detail: `Nền tảng không công khai ngày đăng. Cần đối chiếu tay với lịch ${range}.`,
      });
    } else if ((expect.airFrom && day < expect.airFrom) || (expect.airTo && day > expect.airTo)) {
      checks.push({ key: 'air_date', label: 'Ngày air', status: 'FAIL', detail: `Air ngày ${day}, ngoài lịch ${range}.` });
    } else {
      checks.push({ key: 'air_date', label: 'Ngày air', status: 'PASS', detail: `Air ngày ${day}, đúng lịch ${range}.` });
    }
  }

  const captionFolded = foldText(input.caption);

  if (expect.requiredHashtags?.length) {
    const have = new Set(input.hashtags.map((h) => foldText(h)));
    const missing = expect.requiredHashtags
      .map((h) => `#${h.trim().replace(/^#+/, '')}`)
      .filter((h) => !have.has(foldText(h)));
    checks.push(
      missing.length === 0
        ? { key: 'hashtags', label: 'Hashtag bắt buộc', status: 'PASS', detail: 'Có đủ hashtag bắt buộc.' }
        : {
            key: 'hashtags',
            label: 'Hashtag bắt buộc',
            status: input.caption ? 'FAIL' : 'WARN',
            detail: input.caption ? `Thiếu ${missing.join(', ')}.` : 'Không đọc được caption để kiểm tra hashtag.',
          }
    );
  }

  if (expect.requiredKeywords?.length) {
    const missing = expect.requiredKeywords.filter((k) => k.trim() && !captionFolded.includes(foldText(k.trim())));
    checks.push(
      missing.length === 0
        ? { key: 'keywords', label: 'Brand / key message', status: 'PASS', detail: 'Caption có nhắc brand / key message.' }
        : {
            key: 'keywords',
            label: 'Brand / key message',
            status: 'WARN',
            detail: input.caption
              ? `Caption chưa nhắc: ${missing.join(', ')} (có thể KOC nói trong video, cần xem lại).`
              : 'Không đọc được caption.',
          }
    );
  }

  if (expect.expectedProductUrl && expect.expectedProductUrl.trim()) {
    const tokens = expect.expectedProductUrl
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const actualList =
      input.cartProducts && input.cartProducts.length > 0
        ? input.cartProducts
        : input.hasProductLink && (input.productUrl || input.productId || input.productTitle)
        ? [
            {
              productId: input.productId || extractProductIdFromToken(input.productUrl) || '',
              title: input.productTitle || 'Sản phẩm trong giỏ hàng',
              productUrl: input.productUrl || '',
            },
          ]
        : [];

    if (!input.hasProductLink && actualList.length === 0) {
      checks.push({
        key: 'cart_link_match',
        label: 'Đối chiếu link giỏ hàng',
        status: 'FAIL',
        detail: `Bài chưa gắn giỏ hàng để đối chiếu với link mẫu (${tokens.join(', ')}).`,
      });
    } else {
      const matched = actualList.filter((act) => {
        const actPid = act.productId || extractProductIdFromToken(act.productUrl) || '';
        const actNorm = normalizeCartUrl(act.productUrl);
        return tokens.some((tok) => {
          const expPid = extractProductIdFromToken(tok);
          const expNorm = normalizeCartUrl(tok);
          return (
            (expPid && actPid && expPid === actPid) ||
            (expNorm && actNorm && (actNorm === expNorm || actNorm.includes(expNorm) || expNorm.includes(actNorm)))
          );
        });
      });

      if (matched.length > 0) {
        checks.push({
          key: 'cart_link_match',
          label: 'Đối chiếu link giỏ hàng',
          status: 'PASS',
          detail: `Khớp đúng link giỏ hàng mẫu: ${matched.map((m) => `${m.title} (${m.productId || m.productUrl})`).join('; ')}.`,
        });
      } else {
        checks.push({
          key: 'cart_link_match',
          label: 'Đối chiếu link giỏ hàng',
          status: 'FAIL',
          detail: `Lệch link giỏ hàng: KOC đang gắn ${actualList.map((a) => `"${a.title}" (${a.productId || a.productUrl})`).join(', ')}, không khớp link mẫu.`,
        });
      }
    }
  } else if (expect.requireProductLink) {
    checks.push(
      input.hasProductLink === true
        ? { key: 'product_link', label: 'Gắn link sản phẩm', status: 'PASS', detail: 'Bài có gắn giỏ hàng / link sản phẩm.' }
        : input.hasProductLink === false
          ? { key: 'product_link', label: 'Gắn link sản phẩm', status: 'FAIL', detail: 'Bài chưa gắn giỏ hàng / link sản phẩm.' }
          : {
              key: 'product_link',
              label: 'Gắn link sản phẩm',
              status: 'WARN',
              detail: 'Nền tảng không công khai thông tin gắn sản phẩm. Cần kiểm tra tay.',
            }
    );
  }

  if (expect.minViews && expect.minViews > 0) {
    const views = input.metrics.views;
    checks.push(
      views === null
        ? { key: 'min_views', label: 'View tối thiểu', status: 'WARN', detail: 'Nền tảng không công khai lượt xem.' }
        : views >= expect.minViews
          ? { key: 'min_views', label: 'View tối thiểu', status: 'PASS', detail: `${views.toLocaleString('vi-VN')} view.` }
          : {
              key: 'min_views',
              label: 'View tối thiểu',
              status: 'WARN',
              detail: `${views.toLocaleString('vi-VN')} / ${expect.minViews.toLocaleString('vi-VN')} view cam kết.`,
            }
    );
  }

  return checks;
}

export function verdictOf(checks: LinkCheckItem[]): Verdict {
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.status === 'WARN')) return 'REVIEW';
  return 'PASS';
}
