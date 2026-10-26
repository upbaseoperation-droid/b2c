// ============================================================================
// HÀM LƯU TRỮ VÀ XÂY DỰNG NGỮ CẢNH NỘI DUNG DÙNG CHUNG (B2C MARKETING)
// ============================================================================

import { ContentAngleItem, PublicationItemModel } from './types';
import { BrandProfile } from './brands/types';
import { KnowledgeArticle } from './marketingKnowledgeBase';
import { pushSharedStateToDb } from './sharedStateClient';
import { getVietnamDateYmd, getVietnamIsoString, formatVnd } from './format';

export const SAVED_BRAND_ANGLES_STORAGE_KEY = 'upbase_b2c_saved_brand_angles_v1';
export const SAVED_BRAND_ANGLES_UPDATED_EVENT = 'upbase:saved-brand-angles-updated';
export const SAVED_BRAND_ANGLES_EVENT = SAVED_BRAND_ANGLES_UPDATED_EVENT;

export const CUSTOM_ARTICLES_STORAGE_KEY = 'upbase_b2c_custom_knowledge_articles_v1';
export const CUSTOM_ARTICLES_UPDATED_EVENT = 'upbase:knowledge-articles-updated';

/**
 * Tải danh sách góc nội dung đã lưu của nhãn hàng từ bộ nhớ trình duyệt
 */
export function loadSavedBrandAngles(brandName?: string): ContentAngleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_BRAND_ANGLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = parsed as ContentAngleItem[];
    if (!brandName || !brandName.trim()) return list;
    const search = brandName.trim().toLowerCase();
    return list.filter(item => (item.brandName || '').toLowerCase() === search);
  } catch (err) {
    console.warn('Lỗi khi tải danh sách góc nội dung đã lưu:', err);
    return [];
  }
}

/**
 * Lưu hoặc cập nhật một góc nội dung vào danh sách của nhãn hàng
 */
export function saveBrandAngleItem(item: ContentAngleItem): ContentAngleItem[] {
  if (typeof window === 'undefined') return [item];
  try {
    const list = loadSavedBrandAngles();
    const existingIndex = list.findIndex(i => i.id === item.id || (i.code && i.code === item.code));
    let nextList: ContentAngleItem[];
    if (existingIndex >= 0) {
      nextList = [...list];
      nextList[existingIndex] = {
        ...nextList[existingIndex],
        ...item,
        updatedAt: getVietnamIsoString(),
      };
    } else {
      nextList = [
        {
          ...item,
          createdAt: item.createdAt || getVietnamIsoString(),
          updatedAt: getVietnamIsoString(),
        },
        ...list,
      ];
    }
    localStorage.setItem(SAVED_BRAND_ANGLES_STORAGE_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new CustomEvent(SAVED_BRAND_ANGLES_UPDATED_EVENT, { detail: nextList }));
    return nextList;
  } catch (err) {
    console.warn('Lỗi khi lưu góc nội dung nhãn hàng:', err);
    return [item];
  }
}

/**
 * Xóa một góc nội dung khỏi bộ nhớ
 */
export function deleteBrandAngleItem(id: string): ContentAngleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = loadSavedBrandAngles();
    const nextList = list.filter(i => i.id !== id);
    localStorage.setItem(SAVED_BRAND_ANGLES_STORAGE_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new CustomEvent(SAVED_BRAND_ANGLES_UPDATED_EVENT, { detail: nextList }));
    return nextList;
  } catch (err) {
    console.warn('Lỗi khi xóa góc nội dung:', err);
    return [];
  }
}

export interface ContentReviewArticleInput {
  title: string;
  summary: string;
  brandName: string;
  tags: string[];
  sections: {
    heading: string;
    bullets: string[];
    callout?: string;
  }[];
}

/**
 * Lưu bài viết đánh giá nội dung bài đăng vào Sổ tay quy trình B2C
 */
export function saveContentReviewToKnowledgeBase(article: ContentReviewArticleInput): KnowledgeArticle {
  const dateStr = getVietnamDateYmd();
  const brandCode =
    (article.brandName || 'BRAND')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4) || 'REV';
  const newArticleId = `art-review-${brandCode.toLowerCase()}-${Date.now()}`;
  const newArticleCode = `KB-${brandCode}-${Date.now().toString().slice(-4)}`;

  const createdArticle: KnowledgeArticle = {
    id: newArticleId,
    code: newArticleCode,
    title: article.title,
    category: 'CONTENT_CREATIVE',
    summary: article.summary,
    sourceDoc: `Đánh giá hiệu quả bài đăng (${article.brandName})`,
    updatedAt: dateStr,
    applicableRoles: ['Content Creator', 'Booking Specialist', 'Marketing Lead'],
    tags: Array.from(new Set([article.brandName, 'Hiệu quả bài đăng', 'Góc nội dung', ...(article.tags || [])])),
    relatedTab: 'content',
    relatedTabLabel: 'Kịch bản & video',
    keyFacts: [
      { label: 'Nhãn hàng', value: article.brandName },
      { label: 'Phân loại', value: 'Đánh giá thực tế' },
      { label: 'Ngày lưu', value: dateStr },
    ],
    sections: (article.sections || []).map(s => ({
      heading: s.heading,
      body: [],
      bullets: s.bullets,
      callout: s.callout
        ? {
            tone: 'info',
            title: 'Lưu ý vận hành',
            text: s.callout,
          }
        : undefined,
    })),
    sampleQuestions: [
      `Góc nội dung nào hiệu quả nhất của ${article.brandName}?`,
      `Bài đăng của ${article.brandName} cần tránh điều gì?`,
    ],
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CUSTOM_ARTICLES_STORAGE_KEY);
      const existing: KnowledgeArticle[] = raw ? JSON.parse(raw) : [];
      const updatedList = [
        createdArticle,
        ...existing.filter(a => a.id !== createdArticle.id),
      ];
      localStorage.setItem(CUSTOM_ARTICLES_STORAGE_KEY, JSON.stringify(updatedList));
      pushSharedStateToDb('custom-knowledge-articles-v1', updatedList);
      window.dispatchEvent(
        new CustomEvent(CUSTOM_ARTICLES_UPDATED_EVENT, { detail: updatedList })
      );
      window.dispatchEvent(
        new CustomEvent('upbase:custom-knowledge-articles-updated', { detail: updatedList })
      );
    } catch (err) {
      console.warn('Lỗi khi lưu bài viết vào Sổ tay quy trình:', err);
    }
  }

  return createdArticle;
}

export interface BrandContentContextParams {
  profile?: BrandProfile;
  productName?: string;
  pillar?: string;
  funnelStage?: string;
  kocName?: string;
  kocTier?: string;
  topPublications?: PublicationItemModel[];
}

/**
 * Ghép đầy đủ thông tin Định vị, USP sản phẩm, Từ cấm, Cảnh báo pháp lý,
 * Hashtag bắt buộc, KOC và các bài đăng có ROI cao thành văn bản ngữ cảnh gọn gàng.
 */
export function buildBrandContentContextPrompt(params: BrandContentContextParams): string {
  const { profile, productName, pillar, funnelStage, kocName, kocTier, topPublications } = params;

  const lines: string[] = [];

  // 1. Thông tin nhãn hàng & Định vị
  if (profile) {
    lines.push(`[HỒ SƠ THƯƠNG HIỆU: ${profile.brandName}]`);
    if (profile.positioning?.slogan) {
      lines.push(`- Định vị: ${profile.positioning.slogan}`);
    }
    if (profile.positioning?.story) {
      lines.push(`- Câu chuyện thương hiệu: ${profile.positioning.story}`);
    }
    if (profile.positioning?.toneOfVoice) {
      lines.push(`- Giọng văn: ${profile.positioning.toneOfVoice}`);
    }
    if (profile.positioning?.targetAudience) {
      lines.push(`- Khách hàng mục tiêu: ${profile.positioning.targetAudience}`);
    }
    if (profile.positioning?.bigIdea) {
      lines.push(`- Ý tưởng lớn: ${profile.positioning.bigIdea}`);
    }
    if (profile.positioning?.keyMessage) {
      lines.push(`- Thông điệp chính: ${profile.positioning.keyMessage}`);
    }
    if (profile.positioning?.painPoints && profile.positioning.painPoints.length > 0) {
      lines.push(`- Nỗi đau của khách hàng: ${profile.positioning.painPoints.join('; ')}`);
    }
    if (profile.positioning?.rtbs && profile.positioning.rtbs.length > 0) {
      lines.push(`- Lý do tin tưởng (RTB): ${profile.positioning.rtbs.join('; ')}`);
    }
    lines.push('');
  }

  // 2. Sản phẩm mục tiêu & USP
  const targetProduct = profile?.products?.find(
    p => p.name === productName || p.skuCode === productName || (productName && p.name.includes(productName))
  );

  if (targetProduct || productName) {
    lines.push(`[SẢN PHẨM MỤC TIÊU: ${targetProduct?.name || productName}]`);
    if (targetProduct) {
      if (targetProduct.size) lines.push(`- Quy cách: ${targetProduct.size}`);
      if (targetProduct.dealPriceVnd) {
        lines.push(
          `- Giá bán chiến dịch: ${formatVnd(targetProduct.dealPriceVnd)}${
            targetProduct.priceVnd ? ` (Niêm yết: ${formatVnd(targetProduct.priceVnd)})` : ''
          }`
        );
      } else if (targetProduct.priceVnd) {
        lines.push(`- Giá bán niêm yết: ${formatVnd(targetProduct.priceVnd)}`);
      }
      if (targetProduct.usps && targetProduct.usps.length > 0) {
        lines.push(`- Điểm chính (USP): ${targetProduct.usps.join('; ')}`);
      }
      if (targetProduct.mechanism) {
        lines.push(`- Cơ chế tác động: ${targetProduct.mechanism}`);
      }
      if (targetProduct.ingredients && targetProduct.ingredients.length > 0) {
        lines.push(`- Thành phần chính: ${targetProduct.ingredients.join(', ')}`);
      }
      if (targetProduct.usageInstruction) {
        lines.push(`- Hướng dẫn sử dụng: ${targetProduct.usageInstruction}`);
      }
      if (targetProduct.contraindications) {
        lines.push(`- Lưu ý chống chỉ định: ${targetProduct.contraindications}`);
      }
    }
    lines.push('');
  }

  // 3. Trụ cột nội dung & KOC thực hiện
  const contextDetails: string[] = [];
  if (pillar) contextDetails.push(`Trụ cột: ${pillar}`);
  if (funnelStage) contextDetails.push(`Giai đoạn phễu: ${funnelStage}`);
  if (kocName) contextDetails.push(`KOC thực hiện: ${kocName}${kocTier ? ` (${kocTier})` : ''}`);

  if (contextDetails.length > 0) {
    lines.push(`[ĐỊNH HƯỚNG TRIỂN KHAI]`);
    lines.push(`- ${contextDetails.join(' | ')}`);
    lines.push('');
  }

  // 4. Quy chuẩn nội dung & Kiểm duyệt
  if (profile?.contentRules) {
    const { banned, visualDo, visualDont, mandatoryHashtags, defaultCta } = profile.contentRules;
    lines.push(`[QUY CHUẨN NỘI DUNG NHÃN HÀNG]`);
    if (banned && banned.length > 0) {
      lines.push(
        `- Từ cấm: ${banned
          .map(b => `"${b.phrase}" (thay bằng: "${b.replacement || 'diễn đạt tự nhiên'}")`)
          .join(', ')}`
      );
    }
    if (visualDo && visualDo.length > 0) {
      lines.push(`- Cảnh quay nên làm: ${visualDo.join('; ')}`);
    }
    if (visualDont && visualDont.length > 0) {
      lines.push(`- Cảnh quay cần tránh: ${visualDont.join('; ')}`);
    }
    if (mandatoryHashtags && mandatoryHashtags.length > 0) {
      lines.push(`- Hashtag bắt buộc: ${mandatoryHashtags.join(' ')}`);
    }
    if (defaultCta) {
      lines.push(`- Kêu gọi hành động mặc định: "${defaultCta}"`);
    }
    lines.push('');
  }

  // 5. Cảnh báo pháp lý
  if (profile?.legal && profile.legal.length > 0) {
    const disclaimers = profile.legal.map(l => l.disclaimer).filter(Boolean);
    if (disclaimers.length > 0) {
      lines.push(`[CẢNH BÁO PHÁP LÝ BẮT BUỘC]`);
      disclaimers.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
  }

  // 6. Bài đăng có ROI cao của nhãn
  if (topPublications && topPublications.length > 0) {
    const sorted = [...topPublications]
      .sort((a, b) => (b.roi || 0) - (a.roi || 0))
      .slice(0, 4);

    if (sorted.length > 0) {
      lines.push(`[BÀI ĐĂNG ĐÃ BÁN TỐT CỦA NHÃN]`);
      sorted.forEach((pub, idx) => {
        lines.push(
          `- Bài #${idx + 1} (${pub.creatorName} · ${pub.platform}): Lượt xem: ${
            pub.viewsCount?.toLocaleString('vi-VN') || 0
          } | Đơn hàng: ${pub.itemsSold || 0} | GMV: ${formatVnd(pub.affiliateGmv || 0)} | Chi phí Net: ${formatVnd(
            pub.costAttributed || 0
          )} | ROI: ${(pub.roi || 0).toFixed(2)}x`
        );
      });
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}
