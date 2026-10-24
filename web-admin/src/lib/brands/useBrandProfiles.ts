'use client';

/**
 * Hook & bộ nhớ đệm dùng chung cho Hồ sơ thương hiệu (/api/brands/profiles).
 * Giúp đồng bộ tức thời dữ liệu 42 thương hiệu B2C (Từ cấm, Trần thù lao KL1-KL7, SKU chủ lực, Pháp lý, Kho tệp R2)
 * giữa các màn hình: Hồ sơ thương hiệu, Chiến dịch thương hiệu (BrandView), Duyệt kịch bản (ContentView) và Tạo Deal Booking.
 */

import { useCallback, useEffect, useState } from 'react';
import type { BrandDetail, BrandKnowledgeBase, SalaryGrade } from '../types';
import type { BrandProfile, BrandSection } from './types';
import { brandKey } from './types';
import type { BrandAccess } from '../../components/brands/brandUi';

interface BrandProfilesCacheState {
  profiles: BrandProfile[];
  access?: BrandAccess;
}

let sharedCache: BrandProfilesCacheState | null = null;
let cachedUserId: string | undefined = undefined;
let inflightPromise: Promise<BrandProfilesCacheState> | null = null;
let cacheGeneration = 0;
const listeners = new Set<(state: BrandProfilesCacheState) => void>();

export function clearBrandProfilesCache() {
  cacheGeneration += 1;
  sharedCache = null;
  cachedUserId = undefined;
  inflightPromise = null;
  for (const listener of listeners) listener({ profiles: [] });
}

function notifyListeners(state: BrandProfilesCacheState) {
  sharedCache = state;
  for (const listener of listeners) {
    listener(state);
  }
}

export async function fetchBrandProfilesShared(force = false, forUserId?: string): Promise<BrandProfilesCacheState> {
  const userChanged = Boolean(forUserId && cachedUserId && forUserId !== cachedUserId);
  if (!force && !userChanged && sharedCache) return sharedCache;
  if (!force && !userChanged && inflightPromise) return inflightPromise;

  const generation = cacheGeneration;
  inflightPromise = fetch('/api/brands/profiles', { cache: 'no-store' })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Không tải được hồ sơ thương hiệu.');
      if (generation !== cacheGeneration) throw new Error('Phạm vi tài khoản đã thay đổi. Tải lại hồ sơ.');
      if (forUserId) cachedUserId = forUserId;
      const nextState: BrandProfilesCacheState = {
        profiles: Array.isArray(data.profiles) ? data.profiles : [],
        access: data.access,
      };
      notifyListeners(nextState);
      return nextState;
    })
    .finally(() => {
      if (generation === cacheGeneration) inflightPromise = null;
    });

  return inflightPromise;
}

export async function saveBrandProfileSectionShared(params: {
  brandName: string;
  revision: number;
  section: BrandSection;
  data: unknown;
  summary?: string;
}): Promise<BrandProfile> {
  const generation = cacheGeneration;
  const res = await fetch('/api/brands/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Không lưu được hồ sơ thương hiệu.') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const updated = body.profile as BrandProfile;
  if (generation !== cacheGeneration) return updated;
  const currentProfiles = sharedCache?.profiles || [];
  const nextProfiles = [...currentProfiles.filter(p => p.key !== updated.key), updated];
  notifyListeners({
    profiles: nextProfiles,
    access: sharedCache?.access,
  });
  return updated;
}

export function updateSharedProfilesCache(profiles: BrandProfile[], access?: BrandAccess) {
  notifyListeners({
    profiles,
    access: access ?? sharedCache?.access,
  });
}

export function getSharedProfilesSnapshot(): BrandProfilesCacheState | null {
  return sharedCache;
}

export function subscribeSharedProfiles(cb: (state: BrandProfilesCacheState) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useBrandProfiles(userId?: string) {
  const [state, setState] = useState<BrandProfilesCacheState | null>(() => sharedCache);
  const [loading, setLoading] = useState<boolean>(() => !sharedCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userChanged = Boolean(userId && cachedUserId && userId !== cachedUserId);
    queueMicrotask(() => {
      if (cancelled) return;
      if (!sharedCache || userChanged) {
        setLoading(true);
      } else {
        setState(sharedCache);
        setLoading(false);
      }
    });
    const handleUpdate = (next: BrandProfilesCacheState) => {
      setState(next);
      setLoading(false);
      setError(null);
    };
    listeners.add(handleUpdate);

    fetchBrandProfilesShared(userChanged, userId)
      .then(next => {
        if (!cancelled) {
          setState(next);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      listeners.delete(handleUpdate);
    };
  }, [userId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchBrandProfilesShared(true);
      setState(next);
      setError(null);
      return next;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profiles: state?.profiles || [],
    access: state?.access,
    loading,
    error,
    reload,
    saveSection: saveBrandProfileSectionShared,
  };
}

/**
 * Tìm hồ sơ thương hiệu theo tên nhãn hoặc tên chiến dịch/gian hàng (hỗ trợ cả các biến thể như "Kutieskin Mama" -> "Kutieskin").
 */
export function findBrandProfile(profiles: BrandProfile[], queryName?: string | null): BrandProfile | undefined {
  if (!queryName || !profiles.length) return undefined;
  const targetKey = brandKey(queryName);
  if (!targetKey) return undefined;

  const exact = profiles.find(p => p.key === targetKey);
  if (exact) return exact;

  // Khớp tiền tố hoặc chứa từ khóa thương hiệu (ví dụ "Kutieskin Mama" -> "kutieskin", "Chiến dịch Senka" -> "senka")
  return profiles.find(
    p => targetKey.includes(p.key) || p.key.includes(targetKey),
  );
}

/**
 * Lấy mức trần thù lao KOC (VNĐ) theo bậc lương KL1-KL7 từ hồ sơ thương hiệu.
 */
export function getBrandRatecardCeiling(profile: BrandProfile | undefined, grade?: SalaryGrade | string): number | undefined {
  if (!profile || !grade) return undefined;
  const normalized = grade.trim().toUpperCase();
  const row = profile.ratecard.find(r => r.grade.toUpperCase() === normalized);
  return row?.maxBudget && row.maxBudget > 0 ? row.maxBudget : undefined;
}

/**
 * Chuyển đổi BrandProfile (từ /api/brands/profiles) sang cấu trúc BrandKnowledgeBase để bộ quét kịch bản sử dụng trực tiếp.
 */
export function brandProfileToKnowledgeBase(profile: BrandProfile, master?: BrandDetail): BrandKnowledgeBase {
  const toneMap: Record<string, BrandKnowledgeBase['toneTag']> = {
    EXPERT: 'BÁC_SĨ_CHUYÊN_GIA',
    MOM: 'MẸ_BỈM_CHÂN_THỰC',
    GENZ: 'GEN_Z_TRENDING',
    PREMIUM: 'SANG_TRỌNG_CAO_CẤP',
  };

  return {
    id: `kb-${profile.key}`,
    brandName: profile.brandName,
    category: master?.category || 'Nhãn hàng B2C',
    companyName: profile.entity?.companyName || master?.companyName || '',
    taxCode: profile.entity?.taxCode || '',
    originCountry: profile.entity?.originCountry || 'Việt Nam',
    foundedYear: 2020,
    contactPerson: profile.entity?.contactPerson || master?.accountPic || 'Đặng Thị Yến Nhi',
    slogan: profile.positioning?.slogan || '',
    brandStory: profile.positioning?.story || '',
    colors: [],
    toneOfVoice: profile.positioning?.toneOfVoice || '',
    toneTag: (profile.positioning?.toneTag && toneMap[profile.positioning.toneTag]) || 'BÁC_SĨ_CHUYÊN_GIA',
    targetPersonaSummary: profile.positioning?.targetAudience || '',
    skus: profile.products.map(prod => ({
      id: prod.id,
      skuCode: prod.skuCode || `${profile.key.toUpperCase()}-01`,
      name: prod.name,
      category: master?.category || 'Sản phẩm chủ lực',
      priceVnd: prod.priceVnd || 0,
      volumeOrWeight: prod.size || 'Tiêu chuẩn',
      targetSkinOrUser: prod.targetUser || 'Mọi đối tượng phù hợp',
      keyActiveIngredients: (prod.ingredients || []).map(ing => {
        const [name, ...rest] = ing.split(':');
        return {
          name: (name || ing).trim(),
          percentage: '',
          benefit: rest.join(':').trim() || 'Thành phần chính hãng đạt chuẩn kiểm định',
        };
      }),
      scientificMechanism: prod.mechanism || 'Hiệu quả thực tế được kiểm chứng trên gian hàng chính hãng.',
      clinicalTrials: (prod.usps || []).join(' · ') || 'Đã kiểm nghiệm an toàn và hiệu quả theo tiêu chuẩn công bố.',
      uniqueSellingPoints: prod.usps?.length ? prod.usps : [`Sản phẩm chính hãng ${profile.brandName}`],
      usageInstructions: 'Sử dụng đều đặn theo hướng dẫn trên bao bì sản phẩm.',
      contraindications: prod.contraindications || 'Bảo quản nơi khô ráo, thoáng mát.',
      pdpUrl: prod.pdpUrl || '',
      sampleStockCount: 50,
    })),
    blacklistKeywords: (profile.contentRules?.banned || []).map(b => ({
      id: b.id,
      keyword: b.phrase,
      category: /đối thủ|so sánh|dìm/i.test(b.reason || '') ? 'COMPETITOR' : 'LEGAL_MEDICAL',
      severity: /đối thủ|so sánh/i.test(b.reason || '') ? 'COMPETITOR_WARNING' : 'CRITICAL_BANNED',
      rationale: b.reason || 'Từ cấm theo quy chuẩn thương hiệu & pháp lý sàn TMĐT.',
      alternativeSuggestion: b.replacement || undefined,
      addedBy: profile.updatedBy || 'Phòng B2C',
      addedAt: profile.updatedAt || '2026-10-01',
    })),
    whitelistKeywords: (profile.contentRules?.preferred || []).map(w => ({
      id: w.id,
      phrase: w.phrase,
      category: 'USP_CLAIM' as const,
      exampleUsage: w.phrase,
      benefitNotes: w.note || 'Tăng tỷ lệ chuyển đổi và độ tin cậy cho gian hàng chính hãng.',
    })),
    visualDoList: profile.contentRules?.visualDo || [],
    visualDontList: profile.contentRules?.visualDont || [],
    logoAssetRules: 'Sử dụng đúng bộ nhận diện và tài liệu trong Kho tệp Cloudflare R2 của thương hiệu.',
    logoDownloadUrls: profile.documents
      .filter(d => d.category === 'ASSET' || d.category === 'GUIDELINE')
      .map(d => ({ format: d.title, url: d.url })),
    certifications: profile.legal.map(l => ({
      id: l.id,
      docType: 'CÔNG_BỐ_MỸ_PHẨM' as const,
      docNumber: l.docNumber || 'Đang cập nhật',
      docTitle: l.title,
      issuingAuthority: l.authority || 'Cơ quan có thẩm quyền',
      issueDate: l.issueDate || '',
      validUntil: l.validUntil || undefined,
      mandatoryDisclaimerText: l.disclaimer || undefined,
      summaryKeyFindings: l.disclaimer || l.title,
      verificationUrl: l.url || undefined,
    })),
    objectionFaqs: profile.faqs.map(f => ({
      id: f.id,
      question: f.question,
      targetConcern: 'HIỆU_QUẢ_CHẬM' as const,
      recommendedAnswerForKoc: f.answer,
      dontSayWords: f.avoid || [],
      doMentionPoints: f.mention || [],
    })),
    crisisProtocols: [],
    publicShareSlug: `${profile.key}-official`,
    ratecardCeiling: profile.ratecard.map(r => ({
      grade: (r.grade as SalaryGrade) || 'KL2',
      maxBudget: r.maxBudget || 0,
      description: 'Định mức trần phê duyệt theo Hồ sơ thương hiệu',
    })),
    lastUpdated: profile.updatedAt || '2026-10-05',
    updatedBy: profile.updatedBy || 'Đặng Thị Yến Nhi',
  };
}
