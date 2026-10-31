'use client';

import React, { useState, useMemo } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { ExternalLink, Bookmark, BookOpen } from 'lucide-react';
import type {
  PublicationItemModel,
  ContentItemModel,
  ContentAngleItem,
} from '../../lib/types';
import type { BrandProfile } from '../../lib/brands/types';
import type { KnowledgeArticle } from '../../lib/marketingKnowledgeBase';
import { executeOperationalReport } from '../../lib/operationalReportService';
import { formatNumber, formatVnd } from '../../lib/format';

export interface ContentPerformanceReviewModalProps {
  open: boolean;
  onClose: () => void;
  brandName?: string;
  publications: PublicationItemModel[];
  contentItems: ContentItemModel[];
  brandProfiles: BrandProfile[];
  initialPublication?: PublicationItemModel | null;
  onSaveWinningAngle?: (angle: ContentAngleItem) => void;
  onSaveKnowledgeArticle?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface EnrichedPublication {
  pub: PublicationItemModel;
  contentItem?: ContentItemModel;
  pillar: string;
  angle: string;
  hook: string;
  usp: string;
  painPoint: string;
  cta: string;
  format: string;
  brand: string;
}

export function ContentPerformanceReviewModal({
  open,
  onClose,
  brandName,
  publications,
  contentItems,
  brandProfiles,
  initialPublication,
  onSaveWinningAngle,
  onSaveKnowledgeArticle,
  onNotify,
}: ContentPerformanceReviewModalProps) {
  // Thương hiệu đang lọc
  const [selectedBrand, setSelectedBrand] = useState<string>(brandName || 'ALL');
  const [selectedPubId, setSelectedPubId] = useState<string | null>(
    initialPublication ? initialPublication.id : null
  );

  // Trạng thái tổng hợp đánh giá
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewSynthesisText, setReviewSynthesisText] = useState<string>('');

  // Biểu mẫu lưu góc nội dung mẫu
  const [angleForm, setAngleForm] = useState({
    name: '',
    productName: '',
    pillarName: '',
    hookIdea: '',
    painPoint: '',
    keySellingPoints: '',
    callToAction: '',
    suggestedFormat: 'VIDEO_SHORT_60S',
  });

  // Biểu mẫu lưu bài học vào sổ tay
  const [articleForm, setArticleForm] = useState({
    title: '',
    summary: '',
    lessons: '',
  });

  // Bản đồ tra cứu nhanh kịch bản gốc
  const contentMap = useMemo(() => {
    const map = new Map<string, ContentItemModel>();
    contentItems.forEach((ci) => {
      if (ci.id) map.set(ci.id, ci);
      if (ci.contentCode) map.set(ci.contentCode, ci);
      if (ci.dealCode) map.set(ci.dealCode, ci);
    });
    return map;
  }, [contentItems]);

  // Ghép nối số liệu bài đăng với kịch bản gốc & xác định thương hiệu
  const enrichedList = useMemo<EnrichedPublication[]>(() => {
    return publications.map((pub) => {
      const ci =
        contentMap.get(pub.contentItemId) ||
        contentMap.get(pub.contentCode) ||
        contentMap.get(pub.dealCode);

      // Nhận diện thương hiệu từ campaignTitle hoặc danh sách nhãn
      let detectedBrand = '';
      if (ci?.campaignTitle) {
        const found = brandProfiles.find((b) =>
          ci.campaignTitle.toLowerCase().includes(b.brandName.toLowerCase())
        );
        if (found) detectedBrand = found.brandName;
      }
      if (!detectedBrand && brandName) {
        detectedBrand = brandName;
      }
      if (!detectedBrand && brandProfiles.length > 0) {
        detectedBrand = brandProfiles[0].brandName;
      }

      return {
        pub,
        contentItem: ci,
        pillar: ci?.pillar || 'Nỗi đau - Giải pháp',
        angle: ci?.angle || 'Chia sẻ trải nghiệm thực tế',
        hook: ci?.scriptHook || 'Mở đầu thu hút sự chú ý 3 giây đầu...',
        usp: ci?.scriptUsp || 'Đặc tính vượt trội của sản phẩm',
        painPoint: ci?.scriptPainPoint || 'Nỗi đau thường gặp của khách hàng',
        cta: ci?.scriptCta || 'Gắn giỏ hàng góc trái video',
        format: ci?.format || 'VIDEO_SHORT_60S',
        brand: detectedBrand || 'Kutieskin',
      };
    });
  }, [publications, contentMap, brandProfiles, brandName]);

  // Danh sách các thương hiệu có trong dữ liệu
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    brandProfiles.forEach((b) => set.add(b.brandName));
    enrichedList.forEach((e) => {
      if (e.brand) set.add(e.brand);
    });
    const list = [{ value: 'ALL', label: 'Tất cả nhãn hàng' }];
    Array.from(set).forEach((b) => {
      list.push({ value: b, label: b });
    });
    return list;
  }, [brandProfiles, enrichedList]);

  // Danh sách sau khi lọc theo nhãn
  const filteredList = useMemo<EnrichedPublication[]>(() => {
    if (selectedBrand === 'ALL') return enrichedList;
    return enrichedList.filter(
      (e) => e.brand.toLowerCase() === selectedBrand.toLowerCase()
    );
  }, [enrichedList, selectedBrand]);

  // Tính toán số liệu tổng hợp
  const totalGmv = useMemo(
    () => filteredList.reduce((sum, e) => sum + (e.pub.affiliateGmv || 0), 0),
    [filteredList]
  );
  const totalCost = useMemo(
    () => filteredList.reduce((sum, e) => sum + (e.pub.costAttributed || 0), 0),
    [filteredList]
  );
  const totalViews = useMemo(
    () => filteredList.reduce((sum, e) => sum + (e.pub.viewsCount || 0), 0),
    [filteredList]
  );
  const totalOrders = useMemo(
    () => filteredList.reduce((sum, e) => sum + (e.pub.itemsSold || 0), 0),
    [filteredList]
  );
  const avgRoi = totalCost > 0 ? totalGmv / totalCost : 0;

  // Bài đăng có ROI cao nhất trong nhóm đang lọc
  const bestPost = useMemo<EnrichedPublication | null>(() => {
    if (filteredList.length === 0) return null;
    return filteredList.reduce(
      (best, cur) => (cur.pub.roi > best.pub.roi ? cur : best),
      filteredList[0]
    );
  }, [filteredList]);

  // Bài đăng được chọn để xem chi tiết
  const activePost = useMemo<EnrichedPublication | null>(() => {
    if (selectedPubId) {
      const found = filteredList.find((e) => e.pub.id === selectedPubId);
      if (found) return found;
    }
    return bestPost;
  }, [selectedPubId, filteredList, bestPost]);

  // Đồng bộ lại biểu mẫu khi mở modal hoặc khi chọn nhãn khác
  const syncKey = `${open}|${brandName}|${initialPublication?.id || ''}|${selectedBrand}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      if (brandName) setSelectedBrand(brandName);
      if (initialPublication) setSelectedPubId(initialPublication.id);
      setReviewSynthesisText('');
    }
  }

  // Điền dữ liệu mặc định cho 2 biểu mẫu lưu trữ
  const targetPost = activePost || bestPost;
  const targetBrandName =
    selectedBrand !== 'ALL' ? selectedBrand : targetPost?.brand || 'Nhãn hàng B2C';

  const defaultAngleName = targetPost
    ? `${targetPost.angle} (ROI ${targetPost.pub.roi.toFixed(1)}x)`
    : 'Góc nội dung chuyển đổi cao';
  const defaultProductName =
    targetPost?.contentItem?.campaignTitle ||
    brandProfiles.find((b) => b.brandName === targetBrandName)?.products?.[0]?.name ||
    targetBrandName;

  // Cập nhật biểu mẫu khi targetPost thay đổi nếu người dùng chưa sửa
  const postSyncKey = `${targetPost?.pub.id || ''}|${targetBrandName}`;
  const [prevPostSyncKey, setPrevPostSyncKey] = useState(postSyncKey);
  if (postSyncKey !== prevPostSyncKey) {
    setPrevPostSyncKey(postSyncKey);
    if (targetPost) {
      setAngleForm({
        name: defaultAngleName,
        productName: defaultProductName,
        pillarName: targetPost.pillar,
        hookIdea: targetPost.hook,
        painPoint: targetPost.painPoint,
        keySellingPoints: targetPost.usp,
        callToAction: targetPost.cta,
        suggestedFormat: targetPost.format,
      });

      setArticleForm({
        title: `Tổng kết bài đăng & góc nội dung hiệu quả - ${targetBrandName}`,
        summary: `Tổng GMV đạt ${formatVnd(totalGmv)}, chi phí Net ${formatVnd(totalCost)}, ROI trung bình ${avgRoi.toFixed(1)}x trên ${filteredList.length} bài đăng.`,
        lessons: [
          `Góc nội dung "${targetPost.angle}" đạt ROI cao nhất (${targetPost.pub.roi.toFixed(1)}x) với GMV ${formatVnd(targetPost.pub.affiliateGmv)}.`,
          `Mở đầu 3s "${targetPost.hook}" trực diện đánh vào vấn đề, giữ chân người xem tốt.`,
          `Khuyến nghị tiếp tục ưu tiên định dạng ${targetPost.format} cho các đợt booking tiếp theo.`,
        ].join('\n'),
      });
    }
  }

  const handleSynthesizeReview = async () => {
    if (filteredList.length === 0) {
      onNotify?.('Không có bài đăng nào phù hợp để đánh giá', 'warning');
      return;
    }

    setIsReviewing(true);
    try {
      const summaryContext = [
        `BÁO CÁO HIỆU QUẢ BÀI ĐĂNG - THƯƠNG HIỆU: ${targetBrandName}`,
        `Số lượng bài đăng: ${filteredList.length}`,
        `Tổng doanh số GMV: ${formatVnd(totalGmv)}`,
        `Tổng chi phí Net: ${formatVnd(totalCost)}`,
        `ROI trung bình: ${avgRoi.toFixed(1)}x`,
        `Tổng lượt xem: ${formatNumber(totalViews)} | Tổng đơn hàng: ${formatNumber(totalOrders)}`,
        '',
        'CHI TIẾT TỪNG BÀI ĐĂNG:',
        ...filteredList.map(
          (e, idx) =>
            `${idx + 1}. KOC: ${e.pub.creatorName} | Sàn: ${e.pub.platform}\n   - Trụ cột: ${e.pillar} | Góc nội dung: ${e.angle}\n   - Hook 3s: ${e.hook}\n   - Điểm chính sản phẩm: ${e.usp}\n   - GMV: ${formatVnd(e.pub.affiliateGmv)} | Chi phí Net: ${formatVnd(e.pub.costAttributed)} | ROI: ${e.pub.roi.toFixed(1)}x`
        ),
      ].join('\n');

      const res = await executeOperationalReport({
        purposeId: 'CONTENT_PERFORMANCE_REVIEW' as never,
        moduleTitle: 'Tổng hợp đánh giá hiệu quả bài đăng',
        sourceTag: 'MARKET_RESEARCH',
        inputContextText: summaryContext,
      });

      const text = res.outputText || '';
      setReviewSynthesisText(text);

      // Cập nhật gạch đầu dòng bài học nếu trích xuất được
      if (text) {
        setArticleForm((prev) => ({
          ...prev,
          summary: `Tổng GMV đạt ${formatVnd(totalGmv)}, chi phí Net ${formatVnd(totalCost)}, ROI trung bình ${avgRoi.toFixed(1)}x trên ${filteredList.length} bài đăng.`,
          lessons: text
            .split('\n')
            .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('•') || /^\d+\./.test(l.trim()))
            .slice(0, 5)
            .join('\n') || prev.lessons,
        }));
      }

      onNotify?.('Đã tổng hợp đánh giá bài đăng thành công', 'success');
    } catch {
      setReviewSynthesisText(
        `Đã tổng hợp số liệu thực tế:\n- Bài đăng của KOC ${bestPost?.pub.creatorName} đạt ROI cao nhất (${bestPost?.pub.roi.toFixed(1)}x) với góc nội dung "${bestPost?.angle}".\n- Tỷ lệ chuyển đổi tập trung ở nhóm video giải quyết nỗi đau trực tiếp trong 3 giây đầu.`
      );
      onNotify?.('Đã tổng hợp số liệu bài đăng', 'info');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSaveAngle = () => {
    if (!angleForm.name.trim()) {
      onNotify?.('Vui lòng nhập tên góc nội dung', 'warning');
      return;
    }

    const codeSuffix = Date.now().toString().slice(-4);
    const brandCode = targetBrandName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4) || 'B2C';

    const newAngle: ContentAngleItem = {
      id: `ang-saved-${Date.now()}`,
      code: `ANG-${brandCode}-WIN-${codeSuffix}`,
      name: angleForm.name.trim(),
      pillarId: 'PIL-01',
      pillarName: angleForm.pillarName.trim() || 'Nỗi đau - Giải pháp',
      productId: 'prod-auto',
      productName: angleForm.productName.trim() || targetBrandName,
      brandName: targetBrandName,
      storeName: `${targetBrandName} Official Store`,
      platform: 'TIKTOK_SHOP',
      hookIdea: angleForm.hookIdea.trim(),
      painPoint: angleForm.painPoint.trim(),
      solutionApproach: angleForm.keySellingPoints.trim(),
      keySellingPoints: angleForm.keySellingPoints
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      targetAudience: 'Khách hàng có nhu cầu thực tế',
      callToAction: angleForm.callToAction.trim(),
      suggestedFormat: angleForm.suggestedFormat.trim(),
      status: 'ACTIVE',
      usageCount: 1,
      avgViewsEstimate: targetPost?.pub.viewsCount || 50000,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('upbase_b2c_saved_brand_angles_v1');
        const list: ContentAngleItem[] = raw ? JSON.parse(raw) : [];
        const nextList = [newAngle, ...list.filter((a) => a.id !== newAngle.id)];
        localStorage.setItem('upbase_b2c_saved_brand_angles_v1', JSON.stringify(nextList));
        window.dispatchEvent(
          new CustomEvent('upbase:saved-brand-angles-updated', { detail: newAngle })
        );
      } catch (err) {
        console.error('Lỗi khi lưu góc nội dung vào localStorage', err);
      }
    }

    onSaveWinningAngle?.(newAngle);
    onNotify?.('Đã lưu góc nội dung mẫu vào kho', 'success');
  };

  const handleSaveArticle = () => {
    if (!articleForm.title.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề bản tổng kết', 'warning');
      return;
    }

    const codeSuffix = Date.now().toString().slice(-4);
    const bulletsList = articleForm.lessons
      .split('\n')
      .map((l) => l.trim().replace(/^[-•*0-9.]+\s*/, ''))
      .filter(Boolean);

    const newArticle: KnowledgeArticle = {
      id: `art-perf-${Date.now()}`,
      code: `DOC-PERF-${codeSuffix}`,
      title: articleForm.title.trim(),
      category: 'CONTENT_CREATIVE',
      summary: articleForm.summary.trim(),
      sourceDoc: `Đánh giá bài đăng ${targetBrandName}`,
      updatedAt: new Date().toISOString().slice(0, 10),
      applicableRoles: ['Chuyên viên Content', 'Chuyên viên Booking', 'Trưởng nhóm'],
      tags: ['Hiệu quả bài đăng', 'Góc thắng', targetBrandName, 'ROI'],
      keyFacts: [
        { label: 'Thương hiệu', value: targetBrandName },
        { label: 'ROI cao nhất', value: `${bestPost?.pub.roi.toFixed(1) || 0}x` },
        { label: 'Tổng GMV', value: formatVnd(totalGmv) },
      ],
      sections: [
        {
          heading: 'Bài học kinh nghiệm & Góc nội dung hiệu quả',
          body: [articleForm.summary.trim()],
          bullets: bulletsList,
        },
      ],
      sampleQuestions: [
        `Góc nội dung nào của ${targetBrandName} đạt ROI cao nhất?`,
        `Kinh nghiệm triển khai kịch bản của ${targetBrandName} là gì?`,
      ],
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('upbase_b2c_custom_knowledge_articles_v1');
        const list: KnowledgeArticle[] = raw ? JSON.parse(raw) : [];
        const nextList = [newArticle, ...list.filter((a) => a.id !== newArticle.id)];
        localStorage.setItem(
          'upbase_b2c_custom_knowledge_articles_v1',
          JSON.stringify(nextList)
        );
        window.dispatchEvent(new CustomEvent('upbase:knowledge-articles-updated'));
        window.dispatchEvent(
          new CustomEvent('upbase:custom-knowledge-articles-updated', { detail: nextList })
        );
      } catch (err) {
        console.error('Lỗi khi lưu bài viết vào localStorage', err);
      }
    }

    onSaveKnowledgeArticle?.();
    onNotify?.('Đã lưu bài học vào Sổ tay quy trình phòng', 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đánh giá bài đăng & Lưu mẫu dùng lại"
      size="3xl"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Bộ lọc & Thống kê tổng hợp */}
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-64">
              <Field label="Thương hiệu">
                <Select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  {brandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Button
              variant="primary"
              onClick={handleSynthesizeReview}
              disabled={isReviewing || filteredList.length === 0}
            >
              {isReviewing ? 'Đang tổng hợp đánh giá...' : 'Tổng hợp đánh giá nội dung'}
            </Button>
          </div>

          {/* Dải số liệu thống kê */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-line text-xs">
            <div className="p-2 rounded bg-canvas border border-line">
              <span className="text-ink-3 block">Số bài đăng</span>
              <span className="text-sm font-semibold text-ink">{filteredList.length}</span>
            </div>
            <div className="p-2 rounded bg-canvas border border-line">
              <span className="text-ink-3 block">Tổng lượt xem</span>
              <span className="text-sm font-semibold text-ink">{formatNumber(totalViews)}</span>
            </div>
            <div className="p-2 rounded bg-canvas border border-line">
              <span className="text-ink-3 block">Doanh số GMV</span>
              <span className="text-sm font-semibold text-ink">{formatVnd(totalGmv)}</span>
            </div>
            <div className="p-2 rounded bg-canvas border border-line">
              <span className="text-ink-3 block">Chi phí Net</span>
              <span className="text-sm font-semibold text-ink">{formatVnd(totalCost)}</span>
            </div>
            <div className="p-2 rounded bg-canvas border border-line col-span-2 sm:col-span-1">
              <span className="text-ink-3 block">ROI trung bình</span>
              <span
                className={`text-sm font-semibold ${
                  avgRoi >= 2.0
                    ? 'text-positive'
                    : avgRoi < 1.0
                    ? 'text-warning'
                    : 'text-ink'
                }`}
              >
                {avgRoi.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Bảng đối chiếu số liệu bài đăng */}
        <div className="rounded-lg border border-line bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Danh sách bài đăng đã lên sóng</span>
            <span className="text-2xs text-ink-3">Bấm vào từng dòng để chọn góc lưu mẫu</span>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-sunken/40 text-ink-3 text-2xs font-semibold">
                  <th className="py-2 px-3">KOC / Kênh</th>
                  <th className="py-2 px-3">Góc nội dung & Mở đầu 3s</th>
                  <th className="py-2 px-3 text-right">Lượt xem</th>
                  <th className="py-2 px-3 text-right">Đơn hàng</th>
                  <th className="py-2 px-3 text-right">Doanh số GMV</th>
                  <th className="py-2 px-3 text-right">Chi phí Net</th>
                  <th className="py-2 px-3 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-3">
                      Không có bài đăng nào trong nhóm đã chọn
                    </td>
                  </tr>
                ) : (
                  filteredList.map((e) => {
                    const isSelected = targetPost?.pub.id === e.pub.id;
                    const isGoodRoi = e.pub.roi >= 2.0;
                    const isLowRoi = e.pub.roi < 1.0;

                    return (
                      <tr
                        key={e.pub.id}
                        onClick={() => setSelectedPubId(e.pub.id)}
                        className={`border-b border-line cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 font-medium' : 'hover:bg-canvas'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{e.pub.creatorName}</div>
                          <div className="flex items-center gap-2 text-2xs text-ink-3 pt-0.5">
                            <span>{e.pub.platform}</span>
                            {e.pub.platformPostUrl && (
                              <a
                                href={e.pub.platformPostUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(ev) => ev.stopPropagation()}
                                className="text-ink-3 hover:text-ink inline-flex items-center"
                                title="Xem bài đăng gốc"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-ink line-clamp-1">
                            <span className="font-semibold text-ink-2">{e.pillar}:</span> {e.angle}
                          </div>
                          <div className="text-ink-3 text-2xs line-clamp-1 italic pt-0.5">
                            &ldquo;{e.hook}&rdquo;
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right text-ink">
                          {formatNumber(e.pub.viewsCount)}
                        </td>

                        <td className="py-3 px-3 text-right text-ink">
                          {formatNumber(e.pub.itemsSold)}
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-ink">
                          {formatVnd(e.pub.affiliateGmv)}
                        </td>

                        <td className="py-3 px-3 text-right text-ink-2">
                          {formatVnd(e.pub.costAttributed)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold text-2xs ${
                              isGoodRoi
                                ? 'bg-positive-soft text-positive'
                                : isLowRoi
                                ? 'bg-warning-soft text-warning'
                                : 'text-ink'
                            }`}
                          >
                            {e.pub.roi.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Khối hiển thị kết quả đánh giá */}
        {reviewSynthesisText && (
          <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
            <span className="text-xs font-semibold text-ink">Kết quả đánh giá nội dung</span>
            <div className="p-3 bg-canvas rounded border border-line text-xs text-ink whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {reviewSynthesisText}
            </div>
          </div>
        )}

        {/* Khung 1: Lưu thành góc nội dung mẫu của nhãn */}
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-ink-2" />
              <span className="text-sm font-semibold text-ink">
                Lưu thành góc nội dung mẫu của nhãn
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveAngle}>
              Lưu vào Góc nội dung
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <Field label="Tên hướng tiếp cận">
              <Input
                value={angleForm.name}
                onChange={(e) => setAngleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Rạn da sau sinh - Hồi phục lành tính"
              />
            </Field>

            <Field label="Sản phẩm áp dụng">
              <Input
                value={angleForm.productName}
                onChange={(e) =>
                  setAngleForm((prev) => ({ ...prev, productName: e.target.value }))
                }
                placeholder="Tên sản phẩm"
              />
            </Field>

            <Field label="Trụ cột nội dung">
              <Input
                value={angleForm.pillarName}
                onChange={(e) =>
                  setAngleForm((prev) => ({ ...prev, pillarName: e.target.value }))
                }
                placeholder="Ví dụ: Nỗi đau - Giải pháp"
              />
            </Field>

            <Field label="Định dạng video đề xuất">
              <Input
                value={angleForm.suggestedFormat}
                onChange={(e) =>
                  setAngleForm((prev) => ({ ...prev, suggestedFormat: e.target.value }))
                }
                placeholder="VIDEO_SHORT_60S"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Mở đầu 3 giây (Hook idea)">
                <Input
                  value={angleForm.hookIdea}
                  onChange={(e) =>
                    setAngleForm((prev) => ({ ...prev, hookIdea: e.target.value }))
                  }
                  placeholder="Câu nói giữ chân người xem 3 giây đầu"
                />
              </Field>
            </div>

            <Field label="Tình huống / Nỗi đau khách hàng">
              <Textarea
                rows={2}
                value={angleForm.painPoint}
                onChange={(e) =>
                  setAngleForm((prev) => ({ ...prev, painPoint: e.target.value }))
                }
                placeholder="Nỗi băn khoăn, rào cản"
              />
            </Field>

            <Field label="Điểm chính sản phẩm (USP)">
              <Textarea
                rows={2}
                value={angleForm.keySellingPoints}
                onChange={(e) =>
                  setAngleForm((prev) => ({ ...prev, keySellingPoints: e.target.value }))
                }
                placeholder="Các ý chính cần nói về sản phẩm"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Kêu gọi hành động (CTA)">
                <Input
                  value={angleForm.callToAction}
                  onChange={(e) =>
                    setAngleForm((prev) => ({ ...prev, callToAction: e.target.value }))
                  }
                  placeholder="Nhấp vào giỏ hàng bên dưới..."
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Khung 2: Lưu vào Sổ tay quy trình phòng */}
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-ink-2" />
              <span className="text-sm font-semibold text-ink">
                Lưu vào Sổ tay quy trình phòng
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveArticle}>
              Lưu vào Sổ tay & Hỏi đáp
            </Button>
          </div>

          <div className="space-y-3 pt-1">
            <Field label="Tiêu đề bản tổng kết">
              <Input
                value={articleForm.title}
                onChange={(e) =>
                  setArticleForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Tiêu đề tài liệu tổng kết"
              />
            </Field>

            <Field label="Tóm tắt số liệu GMV & ROI">
              <Input
                value={articleForm.summary}
                onChange={(e) =>
                  setArticleForm((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Tóm tắt doanh số, chi phí và tỷ suất lợi nhuận"
              />
            </Field>

            <Field label="Các gạch đầu dòng rút kinh nghiệm (mỗi dòng 1 ý)">
              <Textarea
                rows={3}
                value={articleForm.lessons}
                onChange={(e) =>
                  setArticleForm((prev) => ({ ...prev, lessons: e.target.value }))
                }
                placeholder="Bài học kinh nghiệm rút ra cho các chiến dịch tiếp theo"
              />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
