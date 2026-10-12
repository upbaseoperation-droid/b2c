'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  RotateCcw,
  Clock,
  Tag,
  Sparkles,
  Filter,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Tv,
  Users
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  PlanDiscussionMessage, 
  PlanDiscussionRole, 
  PlanDiscussionType,
  UserProfile
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';

interface PlanDiscussionHubProps {
  plan: InputPlanBreakdownState;
  currentRole: PlanDiscussionRole;
  currentUser?: UserProfile;
  onSendMessage: (msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onNotify?: (msg: string) => void;
}

export const PlanDiscussionHub: React.FC<PlanDiscussionHubProps> = ({
  plan,
  currentRole,
  currentUser,
  onSendMessage,
  onNotify
}) => {
  const [commentText, setCommentText] = useState('');
  const [activeAuthorRole, setActiveAuthorRole] = useState<PlanDiscussionRole>(currentRole || 'BOOKING');
  const [messageType, setMessageType] = useState<PlanDiscussionType>('COMMENT');
  const [filterType, setFilterType] = useState<'ALL' | 'GROWTH' | 'MEDIA' | 'BOOKING' | 'LEAD' | 'REVISION' | 'APPROVAL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Tự động đồng bộ vai trò gửi khi currentRole thay đổi
  useEffect(() => {
    if (currentRole) {
      setActiveAuthorRole(currentRole);
    }
  }, [currentRole]);

  const discussions = plan.discussions || [];

  // Filter messages
  const filteredMessages = discussions.filter(m => {
    if (filterType === 'GROWTH' && m.authorRole !== 'GROWTH') return false;
    if (filterType === 'MEDIA' && m.authorRole !== 'MEDIA') return false;
    if (filterType === 'BOOKING' && m.authorRole !== 'BOOKING') return false;
    if (filterType === 'LEAD' && m.authorRole !== 'LEAD') return false;
    if (filterType === 'REVISION' && m.type !== 'REVISION_REQUEST') return false;
    if (filterType === 'APPROVAL' && !['PRE_APPROVAL_PASS', 'FINAL_APPROVAL_PASS'].includes(m.type)) return false;
    if (selectedTag && (!m.tags || !m.tags.includes(selectedTag))) return false;
    return true;
  });

  // Gợi ý nhanh theo vai trò
  const quickChips = [
    activeAuthorRole === 'GROWTH'
      ? `Growth xác nhận giao số tổng ${formatVndShort(plan.totalTargetBudget)} và gói Ads ${formatVndShort(plan.budgetAdsTotal || 0)}`
      : activeAuthorRole === 'MEDIA'
      ? 'Media xác nhận nhận gói Ads tổng, cam kết ROAS tối thiểu 4.5x'
      : activeAuthorRole === 'LEAD'
      ? 'Trưởng phòng đồng thuận cơ cấu 3 bên, phê duyệt và đóng băng v1.0'
      : 'Booking đã phân rã chi tiết KOC theo khung KL1-KL7',
    'Đã phân rã khớp 100% ngân sách trần nhãn hàng',
    'Gói tổng Ads giao cho Media chủ động phân bổ Spark Ads và chuyển đổi',
    'Cần tăng slot TikTok Shop cho các ngày Mega & Payday',
    'Đã điều chỉnh cơ cấu KOC theo yêu cầu của Growth',
    'Xác nhận hero SKU tháng này là Sữa Rửa Mặt và Nước Hoa Hồng'
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    let authorName = currentUser?.name || plan.pic || 'Khánh Vy';
    let authorTitle = 'Booking Specialist';

    if (activeAuthorRole === 'GROWTH') {
      authorName = (currentUser?.role === 'GROWTH_MEMBER' ? currentUser.name : null) || plan.growthPic || 'Trần Thị Ánh';
      authorTitle = 'Growth PIC / Chiến lược & PnL';
    } else if (activeAuthorRole === 'MEDIA') {
      authorName = (currentUser?.role === 'MEDIA_MEMBER' ? currentUser.name : null) || plan.mediaPic || 'Phan Thành Đạt';
      authorTitle = 'Media PIC / Quảng cáo & Ads';
    } else if (activeAuthorRole === 'LEAD') {
      authorName = (['ADMIN', 'MANAGER'].includes(currentUser?.role || '') ? currentUser?.name : null) || plan.approvedBy || 'Vân Ngọc';
      authorTitle = 'Trưởng Phòng B2C';
    } else if (activeAuthorRole === 'BOOKING') {
      authorName = (currentUser?.role === 'BOOKING_MEMBER' ? currentUser.name : null) || plan.pic || 'Khánh Vy';
      authorTitle = 'Booking Specialist PIC';
    }

    // Auto extract tags or default
    const tags: string[] = [];
    if (commentText.includes('ngân sách') || commentText.includes('chi phí') || commentText.includes('trần')) tags.push('Ngân Sách');
    if (commentText.includes('Ads') || commentText.includes('ads') || commentText.includes('Media') || commentText.includes('ROAS')) tags.push('Media Ads');
    if (commentText.includes('TikTok') || commentText.includes('tiktok')) tags.push('TikTok Shop');
    if (commentText.includes('Shopee') || commentText.includes('sàn')) tags.push('Shopee Video');
    if (commentText.includes('CIR') || commentText.includes('ROI') || commentText.includes('GMV')) tags.push('Chỉ Số KPI');
    if (commentText.includes('KOC') || commentText.includes('KOL') || commentText.includes('creator')) tags.push('Cơ Cấu Creator');

    onSendMessage({
      authorName,
      authorRole: activeAuthorRole,
      authorTitle,
      content: commentText.trim(),
      type: messageType,
      tags: tags.length > 0 ? tags : ['Trao Đổi']
    });

    setCommentText('');
    setMessageType('COMMENT');
    if (onNotify) onNotify('Đã lưu nội dung trao đổi vào Kế hoạch!');
  };

  const getRoleBadge = (role: PlanDiscussionRole) => {
    switch (role) {
      case 'GROWTH':
        return (
          <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Growth (Chiến lược & PnL)
          </span>
        );
      case 'MEDIA':
        return (
          <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Media (Quảng cáo & Ads)
          </span>
        );
      case 'BOOKING':
        return (
          <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Booking B2C
          </span>
        );
      case 'LEAD':
        return (
          <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Trưởng Phòng B2C
          </span>
        );
      case 'SYSTEM':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Hệ Thống
          </span>
        );
    }
  };

  const getTypeBadge = (type: PlanDiscussionType) => {
    switch (type) {
      case 'REVISION_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Yêu Cầu Hiệu Chỉnh
          </span>
        );
      case 'PRE_APPROVAL_PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <BadgeCheck className="w-3 h-3 text-teal-600" />
            Sơ Duyệt Đạt
          </span>
        );
      case 'FINAL_APPROVAL_PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Phê Duyệt Chính Thức
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-600">
            <Clock className="w-3 h-3 text-slate-500" />
            Trạng Thái
          </span>
        );
      case 'COMMENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            <MessageSquare className="w-3 h-3 text-slate-400" />
            Thảo luận
          </span>
        );
    }
  };

  const isManagerOrLead = currentRole === 'LEAD' || ['ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* HEADER: SỔ BIÊN BẢN & LỊCH SỬ TRAO ĐỔI 4 BÊN */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-900">
                Sổ Biên Bản & Lịch Sử Trao Đổi 4 Bên
              </h3>
              <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {discussions.length} Trao Đổi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận đối thoại giữa Growth, Marketing B2C, Media và Trưởng phòng để lưu vết thẩm định và cơ sở phê duyệt.
            </p>
          </div>
        </div>

        {/* 4 ĐẦU MỐI PHỐI HỢP: GROWTH - MEDIA - BOOKING - LEAD */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-2xs shadow-2xs flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Growth:</span>
            <strong className="text-amber-800 font-semibold">{plan.growthPic || 'Trần Thị Ánh'}</strong>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Media:</span>
            <strong className="text-blue-800 font-semibold">{plan.mediaPic || 'Phan Thành Đạt'}</strong>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Booking:</span>
            <strong className="text-indigo-800 font-semibold">{plan.pic || 'Khánh Vy'}</strong>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Trưởng phòng:</span>
            <strong className="text-purple-800 font-semibold">{plan.approvedBy || 'Vân Ngọc'}</strong>
          </div>
        </div>
      </div>

      {/* GÓC NHÌN RÀ SOÁT CỦA TRƯỞNG PHÒNG */}
      {isManagerOrLead && (
        <div className="mx-4 sm:mx-5 mt-4 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-purple-950 flex items-center gap-2">
                <span>Góc nhìn Trưởng phòng B2C: Rà soát & Đối soát biên bản 3 bên</span>
                <span className="text-2xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">Chế độ quản lý</span>
              </div>
              <p className="text-2xs text-purple-700 mt-0.5">
                Rà soát sự thống nhất giữa ngân sách PnL từ Growth ({formatVndShort(plan.totalTargetBudget)}), hạn mức Ads từ Media ({formatVndShort(plan.budgetAdsTotal || 0)}), và cơ cấu KOC từ Booking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const leadName = currentUser?.name || 'Vân Ngọc';
              onSendMessage({
                authorName: leadName,
                authorRole: 'LEAD',
                authorTitle: 'Trưởng Phòng B2C',
                content: `Trưởng phòng B2C (${leadName}) đã rà soát toàn bộ lịch sử trao đổi của Growth, Media và Booking B2C. Kế hoạch đảm bảo các chỉ tiêu SLA, phân bổ ngân sách trần và gói Ads hợp lệ.`,
                type: 'COMMENT',
                tags: ['Rà Soát Trưởng Phòng', 'Đồng Thuận 3 Bên']
              });
              if (onNotify) onNotify('Đã ghi nhận Trưởng phòng hoàn thành rà soát lịch sử trao đổi!');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ghi nhận: Đã Rà Soát Lịch Sử Trao Đổi</span>
          </button>
        </div>
      )}

      {/* BỘ LỌC TIN NHẮN THEO PHÒNG BAN */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs bg-white mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Lọc:</span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({discussions.length})
          </button>
          <button
            onClick={() => setFilterType('GROWTH')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'GROWTH' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Growth ({discussions.filter(m => m.authorRole === 'GROWTH').length})
          </button>
          <button
            onClick={() => setFilterType('MEDIA')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'MEDIA' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Media ({discussions.filter(m => m.authorRole === 'MEDIA').length})
          </button>
          <button
            onClick={() => setFilterType('BOOKING')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'BOOKING' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Booking B2C ({discussions.filter(m => m.authorRole === 'BOOKING').length})
          </button>
          <button
            onClick={() => setFilterType('LEAD')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'LEAD' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trưởng phòng ({discussions.filter(m => m.authorRole === 'LEAD').length})
          </button>
          <button
            onClick={() => setFilterType('REVISION')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'REVISION' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Yêu Cầu Hiệu Chỉnh ({discussions.filter(m => m.type === 'REVISION_REQUEST').length})
          </button>
          <button
            onClick={() => setFilterType('APPROVAL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filterType === 'APPROVAL' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mốc Phê Duyệt ({discussions.filter(m => ['PRE_APPROVAL_PASS', 'FINAL_APPROVAL_PASS'].includes(m.type)).length})
          </button>
        </div>

        {selectedTag && (
          <div className="flex items-center gap-1 text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            <span>Tag: #{selectedTag}</span>
            <button onClick={() => setSelectedTag('')} className="text-slate-400 hover:text-slate-700 ml-1">✕</button>
          </div>
        )}
      </div>

      {/* FEED: TIMELINE DANH SÁCH TRAO ĐỔI */}
      <div className="p-4 sm:p-5 space-y-4 max-h-[460px] overflow-y-auto bg-slate-50/30">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600">
              Chưa có trao đổi nào trong nhóm lọc này
            </div>
            <p className="text-2xs text-slate-400 max-w-sm mx-auto">
              Growth, Media, Booking và Trưởng phòng có thể trao đổi ý kiến, đối soát hạn mức hoặc đề xuất điều chỉnh cơ cấu bằng khung gửi phía dưới.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isGrowth = msg.authorRole === 'GROWTH';
            const isMedia = msg.authorRole === 'MEDIA';
            const isBooking = msg.authorRole === 'BOOKING';
            const isLead = msg.authorRole === 'LEAD';

            return (
              <div
                key={msg.id || index}
                className={`p-4 rounded-2xl border transition-all ${
                  msg.type === 'REVISION_REQUEST'
                    ? 'bg-rose-50/50 border-rose-200'
                    : msg.type === 'PRE_APPROVAL_PASS'
                    ? 'bg-teal-50/50 border-teal-200'
                    : msg.type === 'FINAL_APPROVAL_PASS'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isGrowth
                    ? 'bg-white border-amber-200/80 shadow-2xs'
                    : isMedia
                    ? 'bg-white border-blue-200/80 shadow-2xs'
                    : isBooking
                    ? 'bg-white border-indigo-200/80 shadow-2xs'
                    : isLead
                    ? 'bg-white border-purple-200/80 shadow-2xs'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar initials */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                        isGrowth
                          ? 'bg-amber-100 text-amber-800'
                          : isMedia
                          ? 'bg-blue-100 text-blue-800'
                          : isBooking
                          ? 'bg-indigo-100 text-indigo-800'
                          : isLead
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {msg.authorName?.charAt(0) || 'U'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">
                          {msg.authorName}
                        </span>
                        {getRoleBadge(msg.authorRole)}
                        {getTypeBadge(msg.type)}
                      </div>
                      <div className="text-2xs text-slate-400 mt-0.5">
                        {msg.authorTitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-2xs text-slate-400 shrink-0">
                    {new Date(msg.timestamp).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Message Content */}
                <div className="mt-2.5 text-xs text-slate-800 leading-relaxed pl-9 whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Tags if any */}
                {msg.tags && msg.tags.length > 0 && (
                  <div className="mt-2.5 pl-9 flex items-center gap-1.5 flex-wrap">
                    {msg.tags.map(tg => (
                      <button
                        key={tg}
                        onClick={() => setSelectedTag(tg === selectedTag ? '' : tg)}
                        className={`text-2xs px-2 py-0.5 rounded-full font-medium transition-all ${
                          selectedTag === tg
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        #{tg}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* KHUNG GỬI PHẢN HỒI / TRAO ĐỔI MỚI */}
      <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3">
        {/* Quick Chips gợi ý */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-2xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Gợi ý nhanh:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCommentText(prev => prev ? `${prev} ${chip}` : chip)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shrink-0 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium">Gửi với tư cách:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex-wrap gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveAuthorRole('GROWTH')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeAuthorRole === 'GROWTH'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Growth PIC ({plan.growthPic?.split(' ')[0] || 'Ánh'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAuthorRole('MEDIA')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeAuthorRole === 'MEDIA'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Media PIC ({plan.mediaPic?.split(' ')[0] || 'Đạt'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAuthorRole('BOOKING')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeAuthorRole === 'BOOKING'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Booking PIC ({plan.pic?.split(' ')[0] || 'Vy'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAuthorRole('LEAD')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeAuthorRole === 'LEAD'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trưởng Phòng ({plan.approvedBy?.split(' ')[0] || 'Ngọc'})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Phân loại:</span>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as PlanDiscussionType)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="COMMENT">Thảo luận chung</option>
                <option value="REVISION_REQUEST">Yêu Cầu Hiệu Chỉnh</option>
                <option value="BUDGET_ADJUST">Góp ý ngân sách / kênh</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`Nhập ý kiến trao đổi và ghi nhận biên bản đối soát cho kế hoạch ${plan.brandName}...`}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs text-slate-400">
              Nhấn gửi Trao đổi để lưu vĩnh viễn vào biên bản làm việc kế hoạch tháng.
            </span>
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Trao đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
