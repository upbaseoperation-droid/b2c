'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, FileText } from 'lucide-react';
import type { BrandProfile } from '../../lib/brands/types';
import type { ContentSlot } from '../../lib/contentPlanRules';
import { FUNNEL_STAGE_OPTIONS, formatBriefCode, inferSlotFunnelStage } from '../../lib/contentPlanRules';
import { formatVnd } from '../../lib/format';
import { Button, Modal, Status, Tabs } from '../ui';

interface StandardBriefPreviewModalProps {
  open: boolean;
  onClose: () => void;
  profile: BrandProfile;
  slots?: ContentSlot[];
  cycleMonth?: string;
  storeName?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type BriefSlideTab = 'ALL' | 'SLIDE_1_2' | 'SLIDE_3' | 'SLIDE_4' | 'SLIDE_5';

export function buildStandardBriefMarkdown(
  profile: BrandProfile,
  slots: ContentSlot[] = [],
  cycleMonth = '10/2026',
  storeName?: string,
): string {
  const pos = profile.positioning;
  const wf = profile.workflowRules;
  const rules = profile.contentRules;
  const mainProduct = profile.products[0];
  const canvaLink =
    wf?.canvaBriefUrl ||
    profile.documents.find(d => d.category === 'BRIEF' && d.url.includes('canva.com'))?.url ||
    '';

  const lines: string[] = [
    `# BRIEF HỢP TÁC TRUYỀN THÔNG — ${profile.brandName.toUpperCase()} (${cycleMonth})`,
    ``,
    `## SLIDE 1: TÊN CHIẾN DỊCH CHUẨN UPBASE`,
    `- **Phương án 1:** CÙNG ${profile.brandName.toUpperCase()} ĐỒNG HÀNH LAN TỎA GIÁ TRỊ THƯƠNG HIỆU / SẢN PHẨM ${mainProduct ? mainProduct.name.toUpperCase() : ''}`,
    `- **Phương án 2:** CHIẾN DỊCH TRUYỀN THÔNG CÙNG NHÃN HÀNG ${profile.brandName.toUpperCase()}${storeName ? ` (${storeName})` : ''}`,
    ``,
    `## SLIDE 2: OUTLINE & ĐỊNH HƯỚNG CHIẾN LƯỢC`,
    `1. Mục tiêu chiến dịch & Thông điệp trọng tâm (Big Idea / Key Message / Key Visual)`,
    `2. Thông tin thương hiệu, thành tựu & hồ sơ sản phẩm (USP, Thành phần, Giấy công bố)`,
    `3. Yêu cầu nội dung hợp tác theo Trụ cột (Content Pillar) & Giai đoạn Phễu (Funnel)`,
    `4. Quy chuẩn quay dựng, Từ khóa cấm & Barem kiểm duyệt Kịch bản / Demo`,
    `5. Quy trình hợp tác 8 bước, Hợp đồng & Thanh toán`,
    ``,
    `- **Mục tiêu truyền thông (Communication Objective):** ${pos?.communicationGap || 'Giúp tệp khách hàng mục tiêu vượt qua rào cản nghi ngờ chất lượng thông qua trải nghiệm kiểm chứng thực tế, thúc đẩy hành động mua hàng tại gian hàng chính hãng.'}`,
    `- **Big Idea:** ${pos?.bigIdea || pos?.slogan || `Trải nghiệm chính hãng cùng ${profile.brandName}`}`,
    `- **Key Message:** ${pos?.keyMessage || pos?.slogan || `Chọn đúng giải pháp từ ${profile.brandName}`}`,
    `- **Định hướng hình ảnh chủ đạo (Key Visual):** ${pos?.keyVisualDirection || 'Bối cảnh sáng sạch tự nhiên, quay cận cảnh chất sản phẩm trên da thật, không dùng filter làm lệch màu.'}`,
    `- **Định vị theo Brand Guideline (Brand Says):** ${pos?.brandSays || pos?.story || '—'}`,
    `- **Nhận thức thực tế của khách hàng (Consumer Says):** ${pos?.consumerSays || '—'}`,
    ``,
    `## SLIDE 3: THÔNG TIN THƯƠNG HIỆU & SẢN PHẨM`,
    `### 3.1. Câu chuyện thương hiệu & Thành tựu nổi bật (200–300 từ)`,
    `${pos?.story || ''}`,
    ...(pos?.achievements?.length ? pos.achievements.map(a => `- ${a}`) : []),
    ``,
    `### 3.2. Khách hàng mục tiêu (Target Audience)`,
    `- **Tệp khách hàng:** ${pos?.targetAudience || '—'}`,
    `- **Nỗi đau chính (Pain Points):** ${(pos?.painPoints || []).join('; ') || '—'}`,
    `- **Rào cản mua hàng (Barriers to Trial):** ${(pos?.barriersToTrial || []).join('; ') || '—'}`,
    `- **Bằng chứng tin cậy (Reason to Believe):** ${(pos?.rtbs || []).join('; ') || '—'}`,
    ``,
    `### 3.3. Danh mục Sản phẩm, Thành phần & Điểm nổi bật (USP)`,
    ...profile.products.flatMap((p, idx) => [
      `#### ${idx + 1}. ${p.name} (${p.skuCode || 'SKU'}) — Quy cách: ${p.size || 'Tiêu chuẩn'}`,
      `- **Giá niêm yết:** ${p.priceVnd ? formatVnd(p.priceVnd) : '—'} | **Giá chiến dịch:** ${p.dealPriceVnd ? formatVnd(p.dealPriceVnd) : '—'}`,
      `- **Điểm nổi bật cần nhấn mạnh (USP):** ${(p.usps || []).join('; ') || '—'}`,
      `- **Cơ chế & Công dụng:** ${p.mechanism || '—'}`,
      `- **Thành phần chính:** ${(p.ingredients || []).join('; ') || '—'}`,
      `- **Hướng dẫn sử dụng / Bước dùng trong Routine:** ${p.usageInstruction || '—'}`,
      `- **Đối tượng sử dụng:** ${p.targetUser || '—'} | **Lưu ý:** ${p.contraindications || '—'}`,
      `- **Link sản phẩm gắn giỏ:** ${p.pdpUrl || '—'}`,
    ]),
    ``,
    `### 3.4. Hồ sơ Công bố & Pháp lý Sản phẩm`,
    ...(profile.legal.length
      ? profile.legal.map(l => `- **${l.title}** (Số: ${l.docNumber || '—'} · Cấp bởi: ${l.authority || '—'}) — Khuyến cáo bắt buộc: "${l.disclaimer || 'Đọc kỹ hướng dẫn sử dụng trước khi dùng'}"`)
      : [`- Đầy đủ phiếu công bố lưu hành chính ngạch tại Việt Nam.`]),
    ``,
    `## SLIDE 4: YÊU CẦU VỀ NỘI DUNG HỢP TÁC & BAREM KIỂM DUYỆT`,
    `### 4.1. Định hướng Content Pillar / Angle theo Giai đoạn Phễu (Funnel)`,
  ];

  if (slots.length > 0) {
    slots.forEach((s, idx) => {
      const code = formatBriefCode(s, idx);
      const stage = s.funnelStage || inferSlotFunnelStage(s.row, s.pillar);
      lines.push(
        `- **[${code}] ${s.pillar} (${stage} · Hạng ${s.row || 'KOC'} · SL: ${s.targetQty || 1} video):**`,
        `  - Sản phẩm: ${s.product || '—'}`,
        `  - Góc nội dung (Angle): ${s.angle || '—'}`,
        `  - Hook 3–5s gợi ý: ${s.hook || '—'}`,
        `  - Giải pháp / USP cần nêu: ${s.usp || '—'}`,
        `  - CTA điều hướng: ${s.cta || rules?.defaultCta || '—'}`,
      );
    });
  } else {
    (pos?.contentPillars || []).forEach(p => lines.push(`- ${p}`));
  }

  lines.push(
    ``,
    `### 4.2. Quy chuẩn Hình ảnh, Giá Truyền Thông & Quay dựng (Moodboard)`,
    `- **Nên làm (Visual Do):** ${(rules?.visualDo || []).join('; ') || 'Quay đủ sáng tự nhiên, cận cảnh chất sản phẩm và trước/sau khi dùng.'}`,
    `- **Không được làm (Visual Don't):** ${(rules?.visualDont || []).join('; ') || 'Không quay thiếu sáng, không dùng filter làm bệt màu, không để lộ sản phẩm đối thủ.'}`,
    `- **Thời lượng & Khung hình:** ${rules?.videoDurationRule || '45–90 giây; lộ diện sản phẩm trong 5 giây đầu.'}`,
    `- **Hashtag bắt buộc:** ${(rules?.mandatoryHashtags || []).join(' ') || '—'}`,
    `- **Quy định giá sàn truyền thông:** ${rules?.minAdvertisedPriceRule || 'Truyền thông đúng khung giá Deal chiến dịch.'}`,
    `- **Cơ chế khuyến mãi & quà tặng chủ đạo:** ${rules?.keyPromotionMechanic || 'Theo chương trình ưu đãi của gian hàng chính hãng.'}`,
    ...(wf?.targetAudienceDemographics ? [`- **Nhân khẩu học khán giả kênh KOC:** ${wf.targetAudienceDemographics}`] : []),
    ...(wf?.kocPersonaAndVisualCriteria ? [`- **Yêu cầu hình ảnh & bối cảnh KOC:** ${wf.kocPersonaAndVisualCriteria}`] : []),
    ``,
    `### 4.3. Bảng Từ khóa Vi phạm & Từ Thay thế`,
    ...(rules?.banned?.length
      ? rules.banned.map(b => `- **Cấm dùng:** "${b.phrase}" → **Thay bằng:** "${b.replacement || 'Mô tả theo công dụng giấy công bố'}" *(Lý do: ${b.reason})*`)
      : [`- Tuân thủ từ điển ngôn từ chuẩn TikTok Shop / Shopee.`]),
    ``,
    `### 4.4. Barem Kiểm duyệt Kịch bản / Demo (7 Hạng mục)`,
    `1. **Hình ảnh:** Độ phân giải Full HD 1080p, rõ nét, không dùng filter làm biến dạng màu sắc sản phẩm.`,
    `2. **Bối cảnh (Indoor / Outdoor):** Phòng gọn gàng, sạch sẽ, tone màu sáng hoặc ngoại cảnh đủ ánh sáng tự nhiên.`,
    `3. **Trang phục:** Lịch sự, phù hợp tệp khách hàng của thương hiệu, không phản cảm.`,
    `4. **Text trên màn hình:** Đúng chính tả tên thương hiệu ${profile.brandName}, không viết tắt từ nhạy cảm, không che khuất giỏ hàng.`,
    `5. **Âm thanh:** Giọng thu rõ ràng, không lẫn tạp âm; sử dụng nhạc thương mại hợp lệ trên TikTok.`,
    `6. **Thời lượng:** ${rules?.videoDurationRule || 'Đảm bảo thời lượng 45–90s, giữ nhịp tự nhiên.'}`,
    `7. **Tuyên bố miễn trừ / Khuyến cáo (Disclaimer):** ${profile.legal.find(l => l.disclaimer)?.disclaimer || 'Đúng theo quy định ngành hàng.'}`,
    ``,
    `## SLIDE 5: HÌNH THỨC, QUY TRÌNH HỢP TÁC 8 BƯỚC & THANH TOÁN`,
    `### 5.1. Quy trình hợp tác 8 bước chuẩn UpBase`,
    `1. **Bước 1 — Chốt Timeline:** Thống nhất lịch gửi kịch bản, quay demo và lịch đăng (On-air).`,
    `2. **Bước 2 — Ký Hợp đồng & Gửi hàng mẫu:** Kho xuất hàng mẫu trong **${wf?.samplePrepSlaHours ?? 48} giờ** từ khi nhận đủ địa chỉ.`,
    `3. **Bước 3 — Gửi Kịch bản:** KOC gửi kịch bản chi tiết theo Pillar/Angle đã thống nhất.`,
    `4. **Bước 4 — Gửi Video Demo:** KOC gửi video hoàn chỉnh để kiểm duyệt trước khi đăng (tối đa **${wf?.maxFreeRevisions ?? 2} vòng** sửa miễn phí; SLA phản hồi **${wf?.autoAirAfterHours ?? 72} giờ**).`,
    `5. **Bước 5 — On-Air:** Đăng tải video gắn đúng link giỏ hàng và Hashtag bắt buộc.`,
    `6. **Bước 6 — Hỗ trợ Push Ads:** Cung cấp mã quảng cáo Spark Ads tối thiểu **${wf?.adsCodeDurationDays ?? 60} ngày** và giữ video công khai tối thiểu **${wf?.minVideoRetentionDays ?? 90} ngày**.`,
    `7. **Bước 7 — Thanh toán:** UpBase thanh toán trong vòng **3–10 ngày** làm việc sau khi hoàn tất nghiệm thu và biên bản.`,
    `8. **Bước 8 — Hỗ trợ Chứng từ Thuế TNCN:** Cung cấp chứng từ khấu trừ thuế TNCN theo quy định.`,
    ``,
    `### 5.2. Quy định Hợp đồng & Thuế`,
    `- Các khoản **tạm ứng > 2.000.000đ** (bao gồm thuế TNCN): Bắt buộc ký hợp đồng trước khi tạm ứng.`,
    `- Các khoản **tổng thanh toán > 10.000.000đ** (bao gồm thuế TNCN): Bắt buộc ký hợp đồng dịch vụ với KOC.`,
    `- Đối với **Hộ kinh doanh (HKD)**: KOC cung cấp thông tin đăng ký kinh doanh và mức % GTGT + % TNCN để hỗ trợ khai báo.`,
    ...(canvaLink ? [``, `### 5.3. Tài liệu tham khảo đính kèm`, `- **Canva Brief hình ảnh gốc:** ${canvaLink}`] : []),
  );

  return lines.join('\n');
}

export const StandardBriefPreviewModal: React.FC<StandardBriefPreviewModalProps> = ({
  open,
  onClose,
  profile,
  slots = [],
  cycleMonth = '10/2026',
  storeName,
  onNotify,
}) => {
  const [activeSlide, setActiveSlide] = useState<BriefSlideTab>('ALL');
  const [copied, setCopied] = useState(false);

  const pos = profile.positioning;
  const wf = profile.workflowRules;
  const rules = profile.contentRules;
  const mainProduct = profile.products[0];
  const canvaUrl =
    wf?.canvaBriefUrl ||
    profile.documents.find(d => d.category === 'BRIEF' && d.url.includes('canva.com'))?.url;

  const fullMarkdown = useMemo(
    () => buildStandardBriefMarkdown(profile, slots, cycleMonth, storeName),
    [profile, slots, cycleMonth, storeName],
  );

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(fullMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    onNotify?.(`Đã sao chép toàn bộ Brief 5 phần của ${profile.brandName}`, 'success');
  };

  const handleDownloadBrief = () => {
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Brief-Chuan-5-Phan-${profile.key}-${cycleMonth.replace('/', '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Đã tải file Brief 5 phần (${profile.brandName})`, 'success');
  };

  const showSlide12 = activeSlide === 'ALL' || activeSlide === 'SLIDE_1_2';
  const showSlide3 = activeSlide === 'ALL' || activeSlide === 'SLIDE_3';
  const showSlide4 = activeSlide === 'ALL' || activeSlide === 'SLIDE_4';
  const showSlide5 = activeSlide === 'ALL' || activeSlide === 'SLIDE_5';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Brief chuẩn 5 phần — ${profile.brandName} (${cycleMonth})`}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            {canvaUrl && (
              <a
                href={canvaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                Mở Canva Brief gốc
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Download} onClick={handleDownloadBrief}>
              Tải bản Brief (.md)
            </Button>
            <Button variant="primary" icon={copied ? Check : Copy} onClick={handleCopyBrief}>
              {copied ? 'Đã sao chép' : 'Sao chép gửi KOC'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs<BriefSlideTab>
          value={activeSlide}
          onChange={setActiveSlide}
          items={[
            { key: 'ALL', label: 'Toàn bộ 5 phần' },
            { key: 'SLIDE_1_2', label: 'Slide 1–2: Tên & Chiến lược' },
            { key: 'SLIDE_3', label: 'Slide 3: Thương hiệu & SKU', count: profile.products.length },
            { key: 'SLIDE_4', label: 'Slide 4: Pillar, Từ cấm & Barem', count: slots.length || pos?.contentPillars?.length || 0 },
            { key: 'SLIDE_5', label: 'Slide 5: Quy trình 8 bước & HĐ' },
          ]}
        />

        {/* SLIDE 1 & 2: TÊN BRIEF, OUTLINE & MỤC TIÊU CHIẾN DỊCH */}
        {showSlide12 && (
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Slide 1 &amp; 2 · Tên Chiến Dịch, Outline &amp; Định Hướng Master Plan
              </span>
              <Status tone="info">{storeName || `Chu kỳ ${cycleMonth}`}</Status>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <div className="text-[11px] font-semibold uppercase text-ink-3">Tên Brief chuẩn 1</div>
                <div className="mt-1 text-xs font-semibold text-ink">
                  CÙNG {profile.brandName.toUpperCase()} ĐỒNG HÀNH LAN TỎA GIÁ TRỊ THƯƠNG HIỆU / {mainProduct ? mainProduct.name.toUpperCase() : 'SẢN PHẨM CHỦ LỰC'}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <div className="text-[11px] font-semibold uppercase text-ink-3">Tên Brief chuẩn 2</div>
                <div className="mt-1 text-xs font-semibold text-ink">
                  CHIẾN DỊCH TRUYỀN THÔNG CÙNG NHÃN HÀNG {profile.brandName.toUpperCase()}{storeName ? ` — ${storeName}` : ''}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-primary/20 bg-primary-soft/20 p-3">
                <div className="text-[11px] font-semibold uppercase text-primary">Big Idea xuyên suốt</div>
                <div className="mt-1 text-xs font-semibold text-ink">
                  {pos?.bigIdea || pos?.slogan || `Trải nghiệm chính hãng cùng ${profile.brandName}`}
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary-soft/20 p-3">
                <div className="text-[11px] font-semibold uppercase text-primary">Key Message trọng tâm</div>
                <div className="mt-1 text-xs font-semibold text-ink">
                  {pos?.keyMessage || pos?.slogan || '—'}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-canvas/60 p-3">
                <div className="text-[11px] font-semibold uppercase text-ink-3">Key Visual Direction</div>
                <div className="mt-1 text-xs text-ink">
                  {pos?.keyVisualDirection || 'Quay không gian sáng sạch, cận cảnh chất sản phẩm trên da thật.'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 pt-1">
              <div className="rounded-lg border border-line bg-canvas/40 p-3">
                <div className="text-[11px] font-semibold text-ink-2">Brand Says (Định vị theo Brand Guideline)</div>
                <div className="mt-1 text-xs text-ink">{pos?.brandSays || pos?.story || '—'}</div>
              </div>
              <div className="rounded-lg border border-line bg-canvas/40 p-3">
                <div className="text-[11px] font-semibold text-ink-2">Consumer Says (Nhận thức thực tế trên sàn)</div>
                <div className="mt-1 text-xs text-ink">{pos?.consumerSays || '—'}</div>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning-soft/20 p-3">
                <div className="text-[11px] font-semibold text-warning">Communication Objective (Dịch chuyển nhận thức)</div>
                <div className="mt-1 text-xs text-ink">{pos?.communicationGap || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: THÔNG TIN THƯƠNG HIỆU, THÀNH TỰU & SẢN PHẨM */}
        {showSlide3 && (
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Slide 3 · Thông Tin Thương Hiệu, Thành Tựu &amp; Hồ Sơ Sản Phẩm
              </span>
              <span className="text-xs text-ink-3">Xuất xứ: {profile.entity?.originCountry || 'Chính ngạch'}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas/40 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-ink">Lịch sử phát triển, Giải thưởng &amp; Thành tựu (Giới hạn 200–300 từ)</div>
                <div className="text-xs text-ink-2 leading-relaxed">{pos?.story || '—'}</div>
                {pos?.achievements && pos.achievements.length > 0 && (
                  <ul className="space-y-1 pt-1 text-xs text-ink">
                    {pos.achievements.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
                <div className="text-xs font-semibold text-ink">Chân dung Khách hàng mục tiêu (Target Audience) &amp; Bằng chứng</div>
                <div className="text-xs text-ink"><span className="font-medium text-ink-2">Tệp khách:</span> {pos?.targetAudience || '—'}</div>
                <div className="text-xs text-ink"><span className="font-medium text-ink-2">Nỗi đau (Pain points):</span> {(pos?.painPoints || []).join(' · ') || '—'}</div>
                <div className="text-xs text-ink"><span className="font-medium text-ink-2">Rào cản (Barriers):</span> {(pos?.barriersToTrial || []).join(' · ') || '—'}</div>
                <div className="text-xs text-ink"><span className="font-medium text-ink-2">Bằng chứng (RTB):</span> {(pos?.rtbs || []).join(' · ') || '—'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink">Danh mục Sản phẩm chủ lực, Thành phần &amp; Điểm nổi bật (USP)</div>
              <div className="grid gap-2.5 md:grid-cols-2">
                {profile.products.map(p => (
                  <div key={p.id} className="rounded-lg border border-line bg-canvas/30 p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-ink">{p.name}</div>
                        <div className="text-[11px] font-code text-ink-3">
                          {p.skuCode} · {p.size} · Giá: {p.priceVnd ? formatVnd(p.priceVnd) : '—'}
                          {p.dealPriceVnd ? ` (Deal: ${formatVnd(p.dealPriceVnd)})` : ''}
                        </div>
                      </div>
                      {p.commissionOrganicPct !== undefined && (
                        <Status tone="ok">HH {p.commissionOrganicPct}%</Status>
                      )}
                    </div>
                    <div className="text-xs text-ink">
                      <span className="font-semibold text-ink-2">USP:</span> {(p.usps || []).join('; ') || '—'}
                    </div>
                    <div className="text-xs text-ink-2">
                      <span className="font-semibold">Thành phần &amp; Cơ chế:</span> {(p.ingredients || []).join(', ') || '—'} — {p.mechanism || '—'}
                    </div>
                    {(p.usageInstruction || p.targetUser) && (
                      <div className="text-xs text-ink-2">
                        {p.usageInstruction && <><span className="font-semibold">Cách dùng:</span> {p.usageInstruction} </>}
                        {p.targetUser && <><span className="font-semibold">· Đối tượng:</span> {p.targetUser}</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {profile.legal.length > 0 && (
              <div className="rounded-lg border border-line bg-canvas/40 p-3">
                <div className="text-xs font-semibold text-ink mb-1.5">Giấy công bố sản phẩm &amp; Văn bản pháp lý</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {profile.legal.map(l => (
                    <div key={l.id} className="flex items-start justify-between gap-2 rounded border border-line bg-surface px-2.5 py-2 text-xs">
                      <div>
                        <div className="font-medium text-ink">{l.title}</div>
                        <div className="text-[11px] text-ink-3">Số: {l.docNumber || '—'} · {l.authority || 'Cơ quan cấp phép'}</div>
                      </div>
                      {l.url && (
                        <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline shrink-0">
                          Xem bản scan
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SLIDE 4: CONTENT PILLAR, QUY CHUẨN QUAY DỰNG, TỪ CẤM & BAREM CHECK */}
        {showSlide4 && (
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Slide 4 · Yêu Cầu Nội Dung (Pillar / Funnel), Từ Khóa Cấm &amp; Barem Duyệt Kịch Bản
              </span>
              <span className="text-xs text-ink-3">
                {slots.length > 0 ? `${slots.length} dòng Brief trong kế hoạch` : 'Định hướng chuẩn thương hiệu'}
              </span>
            </div>

            {slots.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas text-[11px] font-semibold uppercase text-ink-3 border-b border-line">
                    <tr>
                      <th className="px-2.5 py-2">Mã Brief</th>
                      <th className="px-2.5 py-2">Giai đoạn Phễu</th>
                      <th className="px-2.5 py-2">Content Pillar &amp; Sản phẩm</th>
                      <th className="px-2.5 py-2">Vấn đề / Góc nội dung (Angle)</th>
                      <th className="px-2.5 py-2">Hook 3–5s &amp; Giải pháp sản phẩm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {slots.map((s, idx) => {
                      const stage = s.funnelStage || inferSlotFunnelStage(s.row, s.pillar);
                      const stageMeta = FUNNEL_STAGE_OPTIONS.find(f => f.value === stage);
                      return (
                        <tr key={s.id} className="hover:bg-canvas/40">
                          <td className="px-2.5 py-2 font-code font-semibold text-ink whitespace-nowrap">
                            {formatBriefCode(s, idx)}
                            <div className="text-[10px] font-normal text-ink-3">{s.row || '—'} · {s.targetQty || 1} video</div>
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <Status
                              tone={stage === 'AWARENESS' ? 'info' : stage === 'CONSIDERATION' ? 'warn' : stage === 'CONVERSION' ? 'ok' : 'neutral'}
                            >
                              {stageMeta?.shortLabel || stage}
                            </Status>
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-semibold text-ink">{s.pillar}</div>
                            <div className="text-[11px] text-ink-2">{s.product || '—'}</div>
                          </td>
                          <td className="px-2.5 py-2 text-ink">{s.angle || '—'}</td>
                          <td className="px-2.5 py-2">
                            {s.hook && <div className="text-ink"><span className="font-medium text-ink-2">Hook:</span> {s.hook}</div>}
                            {s.usp && <div className="text-ink-2 mt-0.5"><span className="font-medium">USP:</span> {s.usp}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-canvas/40 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-ink">Định hướng Tuyến nội dung theo Phễu (Content Pillars)</div>
                <ul className="space-y-1 text-xs text-ink">
                  {(pos?.contentPillars || []).map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas/40 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-ink">Quy chuẩn Bối cảnh, Ánh sáng &amp; Góc quay (Moodboard)</div>
                <div className="text-xs text-ok">
                  <span className="font-semibold">Bắt buộc có (Do):</span> {(rules?.visualDo || []).join(' · ') || 'Đủ sáng tự nhiên, quay cận cảnh chất sản phẩm và trước/sau khi dùng.'}
                </div>
                <div className="text-xs text-danger">
                  <span className="font-semibold">Cấm vi phạm (Don&apos;t):</span> {(rules?.visualDont || []).join(' · ') || 'Không quay thiếu sáng, không dùng filter làm lệch màu, không lộ đối thủ.'}
                </div>
                <div className="text-xs text-ink-2">
                  <span className="font-semibold">Thời lượng &amp; Hashtag:</span> {rules?.videoDurationRule || '45–90s'} · {(rules?.mandatoryHashtags || []).join(' ')}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-canvas/40 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-ink">Bảng Từ khóa Vi phạm &amp; Cách nói Thay thế</div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {(rules?.banned || []).map(b => (
                    <div key={b.id} className="flex items-start justify-between gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-xs">
                      <span className="font-semibold text-danger line-through">{b.phrase}</span>
                      <span className="text-ok font-medium">→ {b.replacement || 'Mô tả theo giấy công bố'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-canvas/30 p-3">
              <div className="text-xs font-semibold text-ink mb-2">Barem Check Kịch bản / Video Demo chuẩn B2C (7 Hạng mục)</div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
                <div className="rounded border border-line bg-surface p-2">
                  <div className="font-semibold text-ink">1. Hình ảnh &amp; Chất sản phẩm</div>
                  <div className="text-[11px] text-ink-2 mt-0.5">Full HD rõ nét, không dùng filter làm lệch màu, có cảnh test texture/before-after.</div>
                </div>
                <div className="rounded border border-line bg-surface p-2">
                  <div className="font-semibold text-ink">2. Bối cảnh &amp; Trang phục</div>
                  <div className="text-[11px] text-ink-2 mt-0.5">Indoor/Outdoor gọn gàng, sáng sạch; trang phục lịch sự đúng tệp khách hàng.</div>
                </div>
                <div className="rounded border border-line bg-surface p-2">
                  <div className="font-semibold text-ink">3. Text, Âm thanh &amp; Thời lượng</div>
                  <div className="text-[11px] text-ink-2 mt-0.5">Đúng tên {profile.brandName}, không che giỏ hàng, giọng thu rõ, nhạc hợp lệ.</div>
                </div>
                <div className="rounded border border-line bg-surface p-2">
                  <div className="font-semibold text-ink">4. Câu khuyến cáo (Disclaimer)</div>
                  <div className="text-[11px] text-ink-2 mt-0.5">{profile.legal.find(l => l.disclaimer)?.disclaimer || 'Đọc kỹ hướng dẫn sử dụng trước khi dùng.'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: QUY TRÌNH HỢP TÁC 8 BƯỚC & QUY ĐỊNH HỢP ĐỒNG / THUẾ */}
        {showSlide5 && (
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Slide 5 · Quy Trình Hợp Tác 8 Bước, Bản Quyền Ads &amp; Quy Định Hợp Đồng
              </span>
              <span className="text-xs text-ink-3">Đầu mối duyệt: {wf?.brandApproverName || 'Phòng B2C UpBase'}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
              {[
                { step: 'Bước 1 · Chốt Timeline', desc: 'Thống nhất lịch gửi kịch bản, nhận mẫu, quay demo và ngày đăng (On-air).' },
                { step: 'Bước 2 · Ký HĐ & Gửi mẫu', desc: `Ký hợp đồng điện tử; kho gửi hàng mẫu trong ${wf?.samplePrepSlaHours ?? 48}h từ khi có địa chỉ.` },
                { step: 'Bước 3 · Gửi Kịch bản', desc: 'KOC gửi kịch bản chữ theo đúng Pillar, Hook 3s và từ vựng cho phép.' },
                { step: 'Bước 4 · Gửi Video Demo', desc: `Gửi bản dựng trước ngày đăng; tối đa ${wf?.maxFreeRevisions ?? 2} vòng sửa; SLA duyệt ${wf?.autoAirAfterHours ?? 72}h.` },
                { step: 'Bước 5 · On-Air', desc: 'Đăng video công khai gắn đúng link giỏ hàng gian hàng và Hashtag bắt buộc.' },
                { step: 'Bước 6 · Hỗ trợ Push Ads', desc: `Cấp mã quảng cáo Spark Ads ${wf?.adsCodeDurationDays ?? 60} ngày; giữ video tối thiểu ${wf?.minVideoRetentionDays ?? 90} ngày.` },
                { step: 'Bước 7 · Thanh toán', desc: 'Thanh toán trong 3–10 ngày làm việc sau khi hoàn tất nghiệm thu hợp đồng.' },
                { step: 'Bước 8 · Chứng từ TNCN', desc: 'UpBase hỗ trợ khấu trừ, kê khai và cấp chứng từ thuế TNCN theo quy định.' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-line bg-canvas/40 p-2.5">
                  <div className="font-semibold text-ink">{item.step}</div>
                  <div className="mt-1 text-[11px] text-ink-2 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning-soft/20 p-3 text-xs space-y-1">
              <div className="font-semibold text-ink">Quy định bắt buộc về Hợp đồng &amp; Thuế TNCN / Hộ kinh doanh</div>
              <ul className="space-y-1 text-ink-2">
                <li>• Khoản <strong>tạm ứng &gt; 2.000.000đ</strong> (gồm thuế TNCN): Bắt buộc hoàn tất ký hợp đồng với KOC trước khi giải ngân tạm ứng.</li>
                <li>• Khoản <strong>tổng thanh toán &gt; 10.000.000đ</strong> (gồm thuế TNCN): Bắt buộc ký hợp đồng dịch vụ chuẩn Pháp chế UpBase.</li>
                <li>• Hợp đồng <strong>Hộ kinh doanh (HKD)</strong>: Cần cung cấp giấy ĐKKD và xác nhận mức % GTGT + % TNCN để hạch toán.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
