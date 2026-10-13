'use client';

import React, { useState, useEffect } from 'react';
import { Presence } from './ui';
import {
  X,
  AlertTriangle,
  UserPlus,
  DollarSign,
  CreditCard,
  Check,
  Truck,
  Users,
  FileText,
} from 'lucide-react';
import {
  KocItem,
  SalaryGrade,
  CreatorSegment,
  KocCategory,
  TepKenh,
  KocTier,
  getSalaryGradeFromRate,
  getSegmentFromSalaryGrade,
} from '../lib/types';

interface CreateKocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKocCreated: (newKoc: KocItem) => void;
  existingKocs?: KocItem[];
}

function createKocId(): string {
  return `koc-${Date.now()}`;
}

export const CreateKocModal: React.FC<CreateKocModalProps> = ({
  isOpen,
  onClose,
  onKocCreated,
  existingKocs = [],
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [stageName, setStageName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [realName, setRealName] = useState('');
  const [bookingFormat, setBookingFormat] = useState<'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần'>('Booking Video KOC');
  const [formError, setFormError] = useState<string | null>(null);

  // Rate Card & 4 Phân Loại Cốt Lõi
  const [rateCardVideo, setRateCardVideo] = useState<number>(3000000);
  const [salaryGrade, setSalaryGrade] = useState<SalaryGrade>('KL4');
  const [segment, setSegment] = useState<CreatorSegment>('Mid Creator');
  const [tepKenh, setTepKenh] = useState<TepKenh>('Review Nữ');
  const [kocCategory, setKocCategory] = useState<KocCategory>('Personal care');
  const [tier, setTier] = useState<KocTier>('TIER_3_MICRO');

  // E-Commerce & Performance
  const [followers, setFollowers] = useState<number>(50000);
  const [gmvBestCase, setGmvBestCase] = useState<number>(15000000);

  // Follower Demographics
  const [femaleRatio, setFemaleRatio] = useState<number>(85);
  const [ageGroup, setAgeGroup] = useState<'18-24' | '25-34' | '35+'>('18-24');

  // Contact & Shipping Logistics for Sample
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [shippingAddress, setShippingAddress] = useState('');
  const [bookingPic, setBookingPic] = useState('Khánh Vy');
  const [brandName, setBrandName] = useState('Kutieskin Mama');

  // Legal & Banking
  const [legalType, setLegalType] = useState<'INDIVIDUAL' | 'BUSINESS_HOUSEHOLD' | 'BUSINESS_COMPANY'>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [cccd, setCccd] = useState('');
  const [bankName, setBankName] = useState('Techcombank');
  const [bankAccount, setBankAccount] = useState('');

  // Kiểm tra trùng lặp KOC thời gian thực
  const duplicateMatch = (() => {
    if (!existingKocs || existingKocs.length === 0) return null;
    const cleanHandle = channelId.trim().toLowerCase().replace('@', '');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanCccd = cccd.trim();
    const cleanTax = taxCode.trim();

    for (const k of existingKocs) {
      const kHandle = (k.channelId || '').toLowerCase().replace('@', '');
      const kPhone = (k.phone || '').replace(/\D/g, '');
      const kCccd = k.cccd ? k.cccd.trim() : '';
      const kTax = k.taxCode ? k.taxCode.trim() : '';

      if (cleanHandle && cleanHandle.length >= 3 && kHandle === cleanHandle) {
        return {
          type: 'TRÙNG_KÊNH' as const,
          reason: `Trùng ID kênh TikTok (@${kHandle})`,
          koc: k,
        };
      }
      if (cleanPhone && cleanPhone.length >= 9 && kPhone === cleanPhone) {
        return {
          type: 'TRÙNG_SĐT' as const,
          reason: `Trùng số điện thoại / Zalo (${k.phone})`,
          koc: k,
        };
      }
      if (cleanCccd && cleanCccd.length >= 9 && kCccd === cleanCccd) {
        return {
          type: 'TRÙNG_CCCD' as const,
          reason: `Trùng số CCCD / Định danh (${k.cccd})`,
          koc: k,
        };
      }
      if (cleanTax && cleanTax.length >= 9 && (kTax === cleanTax || kCccd === cleanTax)) {
        return {
          type: 'TRÙNG_MST' as const,
          reason: `Trùng Mã số thuế (${kTax || kCccd})`,
          koc: k,
        };
      }
    }
    return null;
  })();

  if (!isOpen) return <Presence show={false} />;

  // Auto detect Salary Grade (Khung lương) & Segment based on Rate card
  const handleRateCardChange = (value: number) => {
    setRateCardVideo(value);
    const kl = getSalaryGradeFromRate(value);
    setSalaryGrade(kl);
    const seg = getSegmentFromSalaryGrade(kl);
    setSegment(seg);
    if (value <= 3000000) {
      setTier('TIER_4_AFFILIATE');
    } else if (value <= 10000000) {
      setTier('TIER_3_MICRO');
    } else if (value <= 30000000) {
      setTier('TIER_2_MACRO');
    } else {
      setTier('TIER_1_CELEB');
    }
  };

  const handleSalaryGradeChange = (kl: SalaryGrade) => {
    setSalaryGrade(kl);
    setSegment(getSegmentFromSalaryGrade(kl));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || !channelId.trim()) {
      setFormError('Vui lòng nhập đầy đủ Tên KOC và Tên Kênh TikTok!');
      return;
    }
    setFormError(null);

    const formattedChannel = channelId.startsWith('@') ? channelId : `@${channelId}`;

    const newKoc: KocItem = {
      id: createKocId(),
      channelId: formattedChannel,
      channelLink: `https://www.tiktok.com/@${formattedChannel.replace('@', '')}`,
      stageName: stageName.trim(),
      realName: realName.trim(),
      tier: tier,
      tierLabel:
        tier === 'TIER_1_CELEB'
          ? 'Tier 1 (Celeb)'
          : tier === 'TIER_2_MACRO'
            ? 'Tier 2 (Macro)'
            : tier === 'TIER_3_MICRO'
              ? 'Tier 3 (Micro)'
              : 'Tier 4 (Affiliate)',
      // 4 Phân loại cốt lõi
      salaryGrade: salaryGrade,
      segment: segment,
      tepKenh: tepKenh,
      creatorCategory: tepKenh,
      kocCategory: kocCategory,
      niche: '',
      followers: Number(followers) || 0,
      avgViews: 20000,
      rateCardVideo: Number(rateCardVideo) || 0,
      bookingFormat: bookingFormat,

      // Shipping & Logistics
      phone: phone.trim(),
      zalo: zalo.trim() || phone.trim(),
      location: location,
      shippingAddress: shippingAddress.trim() || undefined,
      bookingPic: bookingPic,
      brandName: brandName,

      // E-Commerce
      gmvBestCase: Number(gmvBestCase) || undefined,
      aov: 250000,

      // Demographics
      femaleRatio: femaleRatio,
      maleRatio: 100 - femaleRatio,

      // Legal & Banking
      cccd: cccd.trim(),
      taxCode: legalType !== 'INDIVIDUAL' ? taxCode.trim() : cccd.trim() || undefined,
      companyName: legalType !== 'INDIVIDUAL' ? companyName.trim() : undefined,
      legalRepresentative:
        legalType !== 'INDIVIDUAL' ? legalRepresentative.trim() || realName.trim() : undefined,
      ocrDocumentType:
        legalType === 'INDIVIDUAL'
          ? 'CCCD'
          : legalType === 'BUSINESS_HOUSEHOLD'
            ? 'BUSINESS_HOUSEHOLD'
            : 'BUSINESS_LICENSE',
      isOcrVerified: Boolean(cccd.trim() || taxCode.trim()),
      bankName: bankName,
      bankAccount: bankAccount.trim(),

      // Operation status
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      statusKoc: 'SẴN_SÀNG',
      reliabilityScore: 10.0,
      totalPastDeals: 0,
      totalPastCost: 0,
      totalPastGmv: 0,
      historicalRoi: 0,
      isWinnerTop20: false,
    };

    onKocCreated(newKoc);
    onClose();
  };

  return (
    <Presence show>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-(--motion-base)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div data-motion-panel
        role="dialog"
        aria-modal="true"
        aria-label="Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ"
        className="bg-surface border border-line rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-ink animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success-line w-fit mb-1">
              <UserPlus className="w-3.5 h-3.5" />
              Thêm KOC mới vào danh mục Upbase
            </span>
            <h3 className="text-lg font-semibold text-ink">
              Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ
            </h3>
            <p className="text-xs text-muted">
              Đầy đủ thông tin kênh, phân khung lương (KL1 - KL7), hậu cần nhận mẫu gửi hàng, nhân khẩu học &amp; tài khoản ngân hàng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="w-8 h-8 rounded-lg bg-sunken hover:bg-hover text-muted hover:text-ink flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-danger-soft border border-danger-line text-danger rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} className="text-danger font-semibold hover:opacity-80">×</button>
            </div>
          )}
          {duplicateMatch && (
            <div className="p-3 bg-warn-soft border border-warn-line rounded-xl text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-warn font-semibold">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0" />
                <span>Cảnh báo trùng hồ sơ KOC: {duplicateMatch.reason}</span>
              </div>
              <p className="text-ink-2 text-2xs leading-relaxed">
                KOC <strong>{duplicateMatch.koc.stageName}</strong> (@{duplicateMatch.koc.channelId}) đã tồn tại trong danh bạ hệ thống!
                <br />
                • Nhân sự phụ trách: <strong className="text-ink">{duplicateMatch.koc.bookingPic || 'Chưa gán'}</strong>
                {' '}• Nhãn hàng: <strong>{duplicateMatch.koc.brandName || 'Chung'}</strong>
                {' '}• Trạng thái: <span className="font-semibold text-ink">{duplicateMatch.koc.statusKoc || 'Sẵn sàng'}</span>
              </p>
              <div className="text-2xs text-warn font-medium">
                Vui lòng liên hệ với nhân sự phụ trách để tránh 2 người cùng liên hệ một KOC gây xung đột giá cast và mất uy tín.
              </div>
            </div>
          )}

          {/* Section 1: Channel & Stage Name & Booking Format */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Thông tin nhận diện kênh &amp; định dạng booking
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-ink-2 font-semibold block mb-1">
                  Tên kênh / KOC <span className="text-danger">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hải yến Beauty, Chanh Review..."
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="text-ink-2 font-semibold block mb-1">
                  TikTok Handle / Kênh ID <span className="text-danger">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: @haiyen.beauty"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="text-ink-2 font-semibold block mb-1">Định dạng booking:</label>
                <select
                  value={bookingFormat}
                  onChange={(e) => setBookingFormat(e.target.value as 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần')}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Booking Video KOC">Booking Video KOC</option>
                  <option value="Booking Livestream KOC">Booking Livestream KOC</option>
                  <option value="Affiliate Thuần">Affiliate Thuần</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Rate Card & Auto Salary Grade Calculation */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-ink font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                Báo giá video &amp; tự động gán khung lương (KL)
              </span>
              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-info-soft text-info border border-info-line">
                {salaryGrade} • {tier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Báo giá video net (VNĐ):</label>
                <input
                  type="number"
                  step={100000}
                  value={rateCardVideo}
                  onChange={(e) => handleRateCardChange(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Khung lương (KL):</label>
                <select
                  value={salaryGrade}
                  onChange={(e) => handleSalaryGradeChange(e.target.value as SalaryGrade)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="TAP UpAffiliate">TAP UpAffiliate (0đ)</option>
                  <option value="KL1">KL1 (&lt; 500k)</option>
                  <option value="KL2">KL2 (500k - 1.5tr)</option>
                  <option value="KL3">KL3 (1.5tr - 3tr)</option>
                  <option value="KL4">KL4 (3tr - 5tr)</option>
                  <option value="KL5">KL5 (5tr - 10tr)</option>
                  <option value="KL6">KL6 (10tr - 30tr)</option>
                  <option value="KL7">KL7 (&gt; 30tr)</option>
                  <option value="TAP đối tác ngoài">TAP Ngoài</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Phân nhóm Creator:</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CreatorSegment)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Massive Creator">Massive Creator (TAP, KL1-3)</option>
                  <option value="Mid Creator">Mid Creator (KL4-5)</option>
                  <option value="Key Creator">Key Creator (KL6)</option>
                  <option value="Top Creator">Top Creator (KL7)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Kỷ lục GMV:</label>
                <input
                  type="number"
                  step={1000000}
                  value={gmvBestCase}
                  onChange={(e) => setGmvBestCase(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-success font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Creator Niche & Follower Demographics */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Tệp kênh (25 tệp), ngành hàng (9 ngành) &amp; khán giả
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Tệp kênh (25 tệp):</label>
                <select
                  value={tepKenh}
                  onChange={(e) => setTepKenh(e.target.value as TepKenh)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Review Nữ">Review Nữ</option>
                  <option value="Review Nam">Review Nam</option>
                  <option value="Unboxing">Unboxing</option>
                  <option value="Seller">Seller</option>
                  <option value="Mẹ bé (bầu)">Mẹ bé (bầu)</option>
                  <option value="Mẹ bé (bé)">Mẹ bé (bé)</option>
                  <option value="Gia đình">Gia đình</option>
                  <option value="Couple">Couple</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Health">Health</option>
                  <option value="Makeup Artist">Makeup Artist</option>
                  <option value="Tóc">Tóc</option>
                  <option value="Bác sỹ/chuyên gia">Bác sỹ / chuyên gia</option>
                  <option value="Gym">Gym</option>
                  <option value="Eat Clean">Eat Clean</option>
                  <option value="Thời trang (review)">Thời trang (review)</option>
                  <option value="Thời trang (có kiến thức)">Thời trang (kiến thức)</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Nhà cửa đời sống">Nhà cửa đời sống</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Thú cưng">Thú cưng</option>
                  <option value="POV">POV</option>
                  <option value="Dance">Dance</option>
                  <option value="Cosplay">Cosplay</option>
                  <option value="Tin tức">Tin tức</option>
                  <option value="LGBT">LGBT</option>
                  <option value="KOL">KOL</option>
                  <option value="Nữ xinh">Nữ xinh</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Ngành hàng (Category):</label>
                <select
                  value={kocCategory}
                  onChange={(e) => setKocCategory(e.target.value as KocCategory)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Personal care">Personal care (Mỹ phẩm/Skincare)</option>
                  <option value="Mom and baby">Mom and baby (mẹ &amp; bé)</option>
                  <option value="Reviewer">Reviewer (Đánh giá chuyên sâu)</option>
                  <option value="Lifestyle">Lifestyle (Đời sống)</option>
                  <option value="Fashion">Fashion (Thời trang)</option>
                  <option value="ELHA">ELHA (Điện &amp; Gia dụng)</option>
                  <option value="F&B">F&amp;B (thực phẩm &amp; ẩm thực)</option>
                  <option value="Social / Comedian">Social / Comedian (Giải trí)</option>
                  <option value="Travel/Hospitality">Travel/Hospitality (Du lịch)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Followers kênh:</label>
                <input
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Tỉ trọng Follower nữ (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={femaleRatio}
                  onChange={(e) => setFemaleRatio(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Nhóm tuổi khán giả chính:</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as '18-24' | '25-34' | '35+')}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="18-24">18 - 24 Tuổi</option>
                  <option value="25-34">25 - 34 tuổi (dân VP, sức mua cao)</option>
                  <option value="35+">&gt; 35 Tuổi (Mẹ bỉm, gia đình)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Sample Logistics & Operational PIC */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-success" />
              Hậu cần gửi mẫu &amp; nhân sự booking phụ trách
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Khu vực địa lý:</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Miền Bắc">Miền bắc (tỉnh khác)</option>
                  <option value="Miền Trung">Miền Trung</option>
                  <option value="Miền Nam">Miền nam (tỉnh khác)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Nhân sự PIC phụ trách:</label>
                <select
                  value={bookingPic}
                  onChange={(e) => setBookingPic(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Khánh Vy">Khánh Vy</option>
                  <option value="Lê Thị Thùy Linh">Lê Thị Thùy Linh</option>
                  <option value="Đinh Thị Bích Liên">Đinh Thị Bích Liên</option>
                  <option value="Trần Thị Hồng">Trần Thị Hồng</option>
                  <option value="Nguyễn Văn An">Nguyễn Văn An</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Gian hàng phù hợp đề xuất:</label>
                <select
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Kutieskin Mama">Kutieskin Mama</option>
                  <option value="Bye Bye Blemish">Bye Bye Blemish</option>
                  <option value="pHCare">pHCare</option>
                  <option value="EUPC">EUPC</option>
                  <option value="Natural Care">Natural Care</option>
                  <option value="Babe">Babe</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-ink-2 font-medium block mb-1">
                Thông tin nhận hàng chi tiết (tên người nhận, SĐT, địa chỉ giao mẫu vật lý):
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Hải Yến — 0987654321 — Tầng 5, tòa Charmvit, 117 Trần Duy Hưng, Hà Nội"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section 5: Legal & Payment Data */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Pháp lý &amp; thanh toán (tự động sinh hợp đồng &amp; VietQR cọc 50%)
            </span>

            {/* Legal Entity Type Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <span className="text-2xs font-medium text-muted">Hình thức pháp lý ký kết &amp; thuế:</span>
              <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setLegalType('INDIVIDUAL')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'INDIVIDUAL'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Cá nhân (CCCD · Thuế 10%)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalType('BUSINESS_HOUSEHOLD')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'BUSINESS_HOUSEHOLD'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Hộ kinh doanh (HKD)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalType('BUSINESS_COMPANY')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'BUSINESS_COMPANY'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Công ty / MCN (Xuất VAT)
                </button>
              </div>
            </div>

            {/* Dynamic fields based on legalType */}
            {legalType === 'INDIVIDUAL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-ink-2 font-medium block mb-1">Họ &amp; tên thật (trên CCCD):</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Thị Hải Yến"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-ink-2 font-medium block mb-1">Số điện thoại / Zalo:</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!zalo) setZalo(e.target.value);
                    }}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-ink-2 font-medium block mb-1">Số CCCD (12 số):</label>
                  <input
                    type="text"
                    placeholder="001203004567"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      {legalType === 'BUSINESS_COMPANY' ? 'Tên công ty / pháp nhân (theo ĐKKD):' : 'Tên hộ kinh doanh cá thể:'}
                    </label>
                    <input
                      type="text"
                      placeholder={legalType === 'BUSINESS_COMPANY' ? 'CÔNG TY TNHH TRUYỀN THÔNG CREATOR VIỆT' : 'HỘ KINH DOANH VY STUDIO & MEDIA'}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      Mã số thuế (MST doanh nghiệp / HKD):
                    </label>
                    <input
                      type="text"
                      placeholder={legalType === 'BUSINESS_COMPANY' ? '0109876543' : '8491238475-001'}
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      {legalType === 'BUSINESS_COMPANY' ? 'Người đại diện theo pháp luật:' : 'Tên chủ hộ kinh doanh:'}
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Lê Quang Huy"
                      value={legalRepresentative}
                      onChange={(e) => {
                        setLegalRepresentative(e.target.value);
                        if (!realName) setRealName(e.target.value);
                      }}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">Số CCCD người đại diện / chủ hộ:</label>
                    <input
                      type="text"
                      placeholder="001201019876"
                      value={cccd}
                      onChange={(e) => setCccd(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">Số điện thoại liên hệ:</label>
                    <input
                      type="text"
                      placeholder="0987654321"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (!zalo) setZalo(e.target.value);
                      }}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Ngân hàng thụ hưởng:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Techcombank">Techcombank</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="VPBank">VPBank</option>
                  <option value="ACB">ACB</option>
                  <option value="TPBank">TPBank</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="BIDV">BIDV</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Số tài khoản ngân hàng (STK):</label>
                <input
                  type="text"
                  placeholder="VD: 190394857281"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-success font-mono font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-ink bg-sunken hover:bg-hover transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-primary-fg bg-primary hover:bg-primary-hover transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu KOC &amp; đưa vào danh mục</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </Presence>
  );
};


