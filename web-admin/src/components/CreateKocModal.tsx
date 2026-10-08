'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  DollarSign, 
  Smartphone, 
  CreditCard, 
  Check, 
  Sparkles, 
  HelpCircle, 
  Hash, 
  Award, 
  Truck, 
  MapPin, 
  Mail, 
  Users, 
  ShoppingBag, 
  Building2, 
  FileText 
} from 'lucide-react';
import { 
  KocItem, 
  SalaryGrade, 
  CreatorNiche, 
  CreatorSegment, 
  KocCategory, 
  TepKenh, 
  KocTier,
  getSalaryGradeFromRate,
  getSegmentFromSalaryGrade
} from '../lib/types';

interface CreateKocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKocCreated: (newKoc: KocItem) => void;
}

export const CreateKocModal: React.FC<CreateKocModalProps> = ({
  isOpen,
  onClose,
  onKocCreated
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
  // 1. Channel & Stage Name
  const [stageName, setStageName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [realName, setRealName] = useState('');
  const [bookingFormat, setBookingFormat] = useState<'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần'>('Booking Video KOC');
  
  // 2. Rate Card & 4 Phân Loại Cốt Lõi (Sheet 3.1 & 3.2 & 5.4 & 5.6)
  const [rateCardVideo, setRateCardVideo] = useState<number>(3000000);
  const [salaryGrade, setSalaryGrade] = useState<SalaryGrade>('KL4');
  const [segment, setSegment] = useState<CreatorSegment>('Mid Creator');
  const [tepKenh, setTepKenh] = useState<TepKenh>('Review Nữ');
  const [kocCategory, setKocCategory] = useState<KocCategory>('Personal care');
  const [tier, setTier] = useState<KocTier>('TIER_3_MICRO');

  // 3. E-Commerce & Performance
  const [followers, setFollowers] = useState<number>(50000);
  const [avgViews, setAvgViews] = useState<number>(20000);
  const [gmvBestCase, setGmvBestCase] = useState<number>(15000000);
  const [aov, setAov] = useState<number>(250000);

  // 4. Follower Demographics
  const [niche, setNiche] = useState('');
  const [femaleRatio, setFemaleRatio] = useState<number>(85);
  const [ageGroup, setAgeGroup] = useState<'18-24' | '25-34' | '35+'>('18-24');

  // 5. Contact & Shipping Logistics for Sample
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [shippingAddress, setShippingAddress] = useState('');
  const [bookingPic, setBookingPic] = useState('Khánh Vy');
  const [brandName, setBrandName] = useState('Kutieskin Mama');
  const [contentNote, setContentNote] = useState('');

  // 6. Legal & Banking
  const [cccd, setCccd] = useState('');
  const [bankName, setBankName] = useState('Techcombank');
  const [bankAccount, setBankAccount] = useState('');

  if (!isOpen) return null;

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
      alert('Vui lòng nhập Tên KOC / Kênh TikTok!');
      return;
    }

    const formattedChannel = channelId.startsWith('@') ? channelId : `@${channelId}`;

    const newKoc: KocItem = {
      id: `koc-${Date.now()}`,
      channelId: formattedChannel,
      channelLink: `https://www.tiktok.com/@${formattedChannel.replace('@', '')}`,
      stageName: stageName.trim(),
      realName: realName.trim() || stageName.trim(),
      tier: tier,
      tierLabel: tier === 'TIER_1_CELEB' ? 'Tier 1 (Celeb)' :
                 tier === 'TIER_2_MACRO' ? 'Tier 2 (Macro)' :
                 tier === 'TIER_3_MICRO' ? 'Tier 3 (Micro)' : 'Tier 4 (Affiliate)',
      // 4 Phân loại cốt lõi
      salaryGrade: salaryGrade,
      segment: segment,
      tepKenh: tepKenh,
      creatorCategory: tepKenh,
      kocCategory: kocCategory,
      niche: niche.trim() || `${tepKenh} - ${kocCategory}`,
      followers: Number(followers) || 10000,
      avgViews: Number(avgViews) || 5000,
      rateCardVideo: Number(rateCardVideo) || 500000,
      bookingFormat: bookingFormat,
      
      // Shipping & Logistics
      phone: phone.trim() || '0987654321',
      zalo: zalo.trim() || phone.trim() || '0987654321',
      email: email.trim() || `${formattedChannel.replace('@', '')}@booking.creator.vn`,
      location: location,
      shippingAddress: shippingAddress.trim() || `${realName.trim() || stageName.trim()} — ${phone.trim() || '0987654321'} — ${location}`,
      bookingPic: bookingPic,
      brandName: brandName,
      contentNote: contentNote.trim() || `Tệp ${tepKenh}, ngành hàng ${kocCategory}, thế mạnh review thực tế và tạo video chuyển đổi cao.`,

      // E-Commerce
      gmvBestCase: Number(gmvBestCase) || Number(rateCardVideo) * 3,
      aov: Number(aov) || 250000,
      gpm: 28.5,
      itemsSold: Math.round((Number(gmvBestCase) || 15000000) / (Number(aov) || 250000)),
      gmvShareVideo: 70,
      gmvShareLive: 20,
      gmvShareProductCard: 10,

      // Demographics
      femaleRatio: femaleRatio,
      maleRatio: 100 - femaleRatio,
      age18_24: ageGroup === '18-24' ? 65 : 25,
      age25_34: ageGroup === '25-34' ? 60 : 30,
      age35Plus: ageGroup === '35+' ? 50 : 10,

      // Legal & Banking
      cccd: cccd.trim() || '001203948576',
      bankName: bankName,
      bankAccount: bankAccount.trim() || '190384759201',
      
      // Operation status
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      statusKoc: 'SẴN_SÀNG',
      reliabilityScore: 10.0,
      totalPastDeals: 0,
      totalPastCost: 0,
      totalPastGmv: 0,
      historicalRoi: 0,
      isWinnerTop20: false
    };

    onKocCreated(newKoc);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ"
        className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit mb-1">
              <UserPlus className="w-3.5 h-3.5" />
              Thêm KOC mới vào danh mục Upbase
            </span>
            <h3 className="text-lg font-semibold text-slate-900">
              Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ
            </h3>
            <p className="text-xs text-slate-500">
              Đầy đủ thông tin kênh, phân khung lương (KL1 - KL7), hậu cần nhận mẫu gửi hàng, nhân khẩu học & tài khoản ngân hàng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Channel & Stage Name & Booking Format */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              1. Thông tin nhận diện kênh & định dạng booking:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Tên kênh / KOC <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hải yến Beauty, Chanh Review..."
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  TikTok Handle / Kênh ID <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: @haiyen.beauty"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Định dạng booking:</label>
                <select
                  value={bookingFormat}
                  onChange={(e) => setBookingFormat(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Booking Video KOC">Booking Video KOC</option>
                  <option value="Booking Livestream KOC">Booking Livestream KOC</option>
                  <option value="Affiliate Thuần">Affiliate Thuần</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Rate Card & Auto Salary Grade Calculation */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                2. Báo giá video & tự động gán khung lương (KL):
              </span>
              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                {salaryGrade} • {tier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Báo giá video net (VNĐ):</label>
                <input
                  type="number"
                  step={100000}
                  value={rateCardVideo}
                  onChange={(e) => handleRateCardChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-700 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">1. Khung Lương (KL):</label>
                <select
                  value={salaryGrade}
                  onChange={(e) => handleSalaryGradeChange(e.target.value as SalaryGrade)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                <label className="text-slate-600 font-medium block mb-1">2. Segment Creator:</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CreatorSegment)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Massive Creator">Massive Creator (TAP, KL1-3)</option>
                  <option value="Mid Creator">Mid Creator (KL4-5)</option>
                  <option value="Key Creator">Key Creator (KL6)</option>
                  <option value="Top Creator">Top Creator (KL7)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Kỷ lục GMV:</label>
                <input
                  type="number"
                  step={1000000}
                  value={gmvBestCase}
                  onChange={(e) => setGmvBestCase(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-700 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Creator Niche & Follower Demographics */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-pink-600" />
              3. Tệp kênh (25 tệp) & KOC Category (9 ngành) & khán giả:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-600 font-medium block mb-1">3. Tệp kênh (25 tệp):</label>
                <select
                  value={tepKenh}
                  onChange={(e) => setTepKenh(e.target.value as TepKenh)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                <label className="text-slate-600 font-medium block mb-1">4. KOC Category (Ngành):</label>
                <select
                  value={kocCategory}
                  onChange={(e) => setKocCategory(e.target.value as KocCategory)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Personal care">Personal care (Mỹ phẩm/Skincare)</option>
                  <option value="Mom and baby">Mom and baby (mẹ & bé)</option>
                  <option value="Reviewer">Reviewer (Đánh giá chuyên sâu)</option>
                  <option value="Lifestyle">Lifestyle (Đời sống)</option>
                  <option value="Fashion">Fashion (Thời trang)</option>
                  <option value="ELHA">ELHA (Điện & Gia dụng)</option>
                  <option value="F&B">F&B (thực phẩm & ẩm thực)</option>
                  <option value="Social / Comedian">Social / Comedian (Giải trí)</option>
                  <option value="Travel/Hospitality">Travel/Hospitality (Du lịch)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Followers Kênh:</label>
                <input
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Tỉ trọng Follower nữ (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={femaleRatio}
                  onChange={(e) => setFemaleRatio(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-pink-600 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Nhóm tuổi khán giả chính:</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="18-24">18 - 24 Tuổi</option>
                  <option value="25-34">25 - 34 tuổi (dân VP, sức mua cao)</option>
                  <option value="35+">&gt; 35 Tuổi (Mẹ bỉm, gia đình)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Sample Logistics & Operational PIC */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              4. Hậu cần gửi mẫu & nhân sự booking phụ trách:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Khu vực địa lý:</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Miền Bắc">Miền bắc (tỉnh khác)</option>
                  <option value="Miền Trung">Miền Trung</option>
                  <option value="Miền Nam">Miền nam (tỉnh khác)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Nhân sự PIC phụ trách:</label>
                <select
                  value={bookingPic}
                  onChange={(e) => setBookingPic(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-amber-700 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Khánh Vy">Khánh Vy</option>
                  <option value="Lê Thị Thùy Linh">Lê Thị Thùy Linh</option>
                  <option value="Đinh Thị Bích Liên">Đinh Thị Bích Liên</option>
                  <option value="Trần Thị Hồng">Trần Thị Hồng</option>
                  <option value="Nguyễn Văn An">Nguyễn Văn An</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Gian hàng phù hợp đề xuất:</label>
                <select
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-700 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-slate-600 font-medium block mb-1">
                Thông tin nhận hàng chi tiết (tên người nhận, SĐT, địa chỉ giao mẫu vật lý):
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Hải Yến — 0987654321 — Tầng 5, tòa Charmvit, 117 Trần Duy Hưng, Hà Nội"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 5: Legal & Payment Data */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-blue-700 font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              5. Pháp lý & thanh toán (tự động sinh hợp đồng & VietQR cọc 50%):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Họ & tên thật (trên CCCD):</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Thị Hải Yến"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Số điện thoại / Zalo:</label>
                <input
                  type="text"
                  placeholder="0987654321"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (!zalo) setZalo(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Số CCCD (12 số):</label>
                <input
                  type="text"
                  placeholder="001203004567"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Ngân hàng thụ hưởng:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                <label className="text-slate-600 font-medium block mb-1">Số tài khoản ngân hàng (STK):</label>
                <input
                  type="text"
                  placeholder="VD: 190394857281"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-700 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu KOC & đưa vào danh mục</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

