'use client';

import React, { useState } from 'react';
import { formatVndShort } from '../../lib/format';
import { 
  FileText, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Eye, 
  Video, 
  Sparkles, 
  CheckSquare, 
  MessageSquare,
  Share2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Flame,
  Award,
  AlertCircle
} from 'lucide-react';
import { ScriptReviewItem, ContentItemModel, PublicationItemModel } from '../../lib/types';
import { INITIAL_SCRIPTS, INITIAL_CONTENT_ITEMS, INITIAL_PUBLICATIONS } from '../../lib/mockData';
import { ScriptReviewModal } from '../ScriptReviewModal';

interface ContentViewProps {
  onScriptApprovedNotification?: (dealCode: string) => void;
  onNavigateToAngles?: () => void;
}

export const ContentView: React.FC<ContentViewProps> = ({ onScriptApprovedNotification, onNavigateToAngles }) => {
  const [scripts, setScripts] = useState<ScriptReviewItem[]>(INITIAL_SCRIPTS);
  const [contentItems, setContentItems] = useState<ContentItemModel[]>(INITIAL_CONTENT_ITEMS);
  const [publications, setPublications] = useState<PublicationItemModel[]>(INITIAL_PUBLICATIONS);
  const [selectedScript, setSelectedScript] = useState<ScriptReviewItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'CONTENT_ITEMS' | 'SCRIPTS' | 'DRAFT_VIDEOS' | 'PUBLICATIONS' | 'PILLARS'>('CONTENT_ITEMS');

  const handleApprove = (scriptId: string) => {
    setScripts(prev => prev.map(item => item.id === scriptId ? { ...item, status: 'APPROVED', remainingHours: 0 } : item));
    const targetScript = scripts.find(s => s.id === scriptId);
    if (onScriptApprovedNotification && targetScript) {
      onScriptApprovedNotification(targetScript.dealCode);
    }
  };

  const handleRequestRevision = (scriptId: string, notes: string) => {
    setScripts(prev => prev.map(item => item.id === scriptId ? {
      ...item,
      status: 'REVISION_REQUESTED',
      feedbackNotes: notes
    } : item));
  };

  return (
    <div className="space-y-4">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('CONTENT_ITEMS')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'CONTENT_ITEMS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>1. Kho Sản Phẩm Nội Dung & QC ({contentItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SCRIPTS')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'SCRIPTS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>2. Hàng Chờ Duyệt Kịch Bản ({scripts.filter(s => s.status === 'PENDING').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('DRAFT_VIDEOS')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'DRAFT_VIDEOS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>3. Video nháp KOC gửi về</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PUBLICATIONS')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'PUBLICATIONS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>4. Bài Đăng Live & Đối Soát Mã Ads ({publications.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PILLARS')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'PILLARS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>5. Trụ Cột & Góc Tiếp Cận Theo SP</span>
        </button>
      </div>

      {/* View 0: Content Items Master Grid */}
      {activeSubTab === 'CONTENT_ITEMS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Kho sản phẩm nội dung — Quản trị tách biệt với booking</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  1 Booking Deal có thể tạo nhiều Content Items (nội dung phái sinh, góc quay khác nhau) mà không làm méo mó số liệu CPA
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {contentItems.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-purple-700 font-semibold text-xs">{item.contentCode}</span>
                      <span className="text-slate-500 text-xs">• BO: <strong className="text-blue-600 font-mono">{item.dealCode}</strong></span>
                      <span className="text-slate-900 font-semibold text-sm">{item.creatorName}</span>
                      <span className="badge-purple px-2 py-0.5 rounded text-2xs font-semibold">{item.pillar}</span>
                      <span className="badge-blue px-2 py-0.5 rounded text-2xs font-mono">{item.format}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                        item.qcStatus === 'PASS' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        QC: {item.qcStatus === 'PASS' ? '✓ Đạt Chuẩn Xuất Bản' : 'Cần Thẩm Định'}
                      </span>
                      <span className="text-2xs text-slate-500">Sửa: {item.revisionCount}/2 lần</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="text-slate-600 font-medium">Góc tiếp cận: <strong className="text-slate-900">{item.angle}</strong></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-2xs">
                      <div><span className="text-purple-700 font-semibold">Hook:</span> <span className="text-slate-700">{item.scriptHook}</span></div>
                      <div><span className="text-rose-700 font-semibold">Nỗi đau:</span> <span className="text-slate-700">{item.scriptPainPoint}</span></div>
                      <div><span className="text-emerald-700 font-semibold">Giải pháp/USP:</span> <span className="text-slate-700">{item.scriptUsp}</span></div>
                      <div><span className="text-blue-700 font-semibold">CTA:</span> <span className="text-slate-700">{item.scriptCta}</span></div>
                    </div>
                    {item.qcChecklistNotes && (
                      <div className="pt-2 border-t border-slate-200 text-2xs text-emerald-700">
                        <strong>Ghi chú QC:</strong> {item.qcChecklistNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 1: Scripts Review Queue */}
      {activeSubTab === 'SCRIPTS' && (
        <div className="card-enterprise overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Hàng chờ thẩm định kịch bản KOC (SLA: 24h)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nhấp vào kịch bản để xem toàn văn 4 phần và thẩm định checklist</p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {scripts.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedScript(item)}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer group"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
                      {item.kocName}
                    </span>
                    <span className="badge-purple px-2 py-0.5 rounded text-2xs font-semibold">
                      {item.pillar}
                    </span>
                    <span className="badge-blue px-2 py-0.5 rounded text-2xs font-mono">
                      {item.dealCode}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Hook 3s: &ldquo;{item.hook}&rdquo;
                  </div>
                  <div className="text-xs text-slate-600">
                    USP: {item.solutionAndUsp}
                  </div>
                  <div className="text-2xs text-slate-500 pt-0.5">
                    Nộp bởi: <strong className="text-slate-700">{item.submittedBy}</strong> • {item.submittedAt}
                    {item.feedbackNotes && (
                      <span className="text-amber-700 block mt-1 font-semibold">Ghi chú sửa: {item.feedbackNotes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'PENDING' ? (
                    <>
                      <span className="badge-amber px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        SLA còn {item.remainingHours}h
                      </span>
                      <button
                        onClick={() => setSelectedScript(item)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Thẩm định kịch bản
                      </button>
                    </>
                  ) : item.status === 'APPROVED' ? (
                    <span className="badge-emerald px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Đã phê duyệt (ký HĐ)
                    </span>
                  ) : (
                    <span className="badge-amber px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Yêu cầu chỉnh sửa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: Draft Videos Review */}
      {activeSubTab === 'DRAFT_VIDEOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Chanh Beauty Review — Video Nháp 60s UV Test</span>
              <span className="badge-amber px-2 py-0.5 rounded text-2xs font-semibold">Chờ nghiệm thu</span>
            </div>
            <div className="aspect-video bg-slate-900 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-purple-400 mb-2 opacity-80" />
              <p className="font-semibold text-white">Video nháp v1: Test Camera UV 8h ngoài trời</p>
              <p className="text-2xs text-slate-400 mt-1">KOC đã gắn sticker giỏ hàng và hashtag #UpBeauty #MegaSale1010</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Thời lượng: <strong className="text-slate-900">62 giây</strong> (Full HD)</span>
              <button
                onClick={() => alert('Đã duyệt video nháp! Chuyển trạng thái cho Booking duyệt link lên sóng TikTok Shop.')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Duyệt video cho lên sóng</span>
              </button>
            </div>
          </div>

          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Minh Đan Daily — Video Review thu đông</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">Đã lên sóng Official</span>
            </div>
            <div className="aspect-video bg-slate-900 rounded-xl border border-emerald-500/30 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
              <p className="font-semibold text-white">TikTok: @danxinhdaily/video/74182910293847</p>
              <p className="text-2xs text-emerald-400 mt-1">Lượt xem hiện tại: 42.000 views • GMV: 68.000.000&nbsp;₫</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Nghiệm thu: <strong className="text-slate-900">Đạt 100% KPI</strong></span>
              <span className="text-xs text-emerald-700 font-semibold">Đủ điều kiện tất toán đợt 2</span>
            </div>
          </div>
        </div>
      )}

      {/* View 3: 3 Master Pillars */}
      {activeSubTab === 'PILLARS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-enterprise p-5 border-blue-200 bg-blue-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">Pillar 1: Educational (35%)</span>
              <span className="badge-blue px-2 py-0.5 rounded text-2xs font-semibold">TikTok / Reels</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Giáo dục & đập Tan hoài Nghi</h4>
            <p className="text-xs text-slate-600">
              Thử nghiệm camera UV trước & sau khi thoa; Bác sĩ giải thích cơ chế bảo vệ màng lọc quang phổ rộng.
            </p>
            <div className="pt-2 border-t border-slate-200 text-2xs text-slate-500">
              Đã bàn giao: <strong className="text-slate-800">14 Kịch bản</strong> sang Booking
            </div>
          </div>

          <div className="card-enterprise p-5 border-purple-200 bg-purple-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Pillar 2: Social Proof (45%)</span>
              <span className="badge-purple px-2 py-0.5 rounded text-2xs font-semibold">TikTok / Threads</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Trải nghiệm thực tế & KOC Review</h4>
            <p className="text-xs text-slate-600">
              Cảm nhận chất kem mịn màng không vón cục; Thử thách 8 tiếng kiềm dầu ngoài trời nắng gắt.
            </p>
            <div className="pt-2 border-t border-slate-200 text-2xs text-slate-500">
              Đang điều phối: <strong className="text-slate-800">26 KOCs</strong> quay sample
            </div>
          </div>

          <div className="card-enterprise p-5 border-emerald-200 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Pillar 3: Commercial (20%)</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">Live TikTok / Shopee</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Chốt đơn & Flash Promotion</h4>
            <p className="text-xs text-slate-600">
              Voucher độc quyền D-Day 10.10 mua 1 tặng 1 kèm quà tặng fullsize độc quyền trong phiên Livestream.
            </p>
            <div className="pt-2 border-t border-slate-200 text-2xs text-slate-500">
              Đã hoàn thành: <strong className="text-slate-800">Banner & PDP Store</strong>
            </div>
          </div>
        </div>
      )}

      {/* View 4: Publications (Bài Đăng Thực Tế & Đối Soát Mã Ads) */}
      {activeSubTab === 'PUBLICATIONS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Bài đăng thực tế & bàn giao mã Spark Ads — Đo lường hiệu quả độc lập</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đối soát link video lên sóng, mã ủy quyền Spark Ads 30 ngày và doanh thu GMV thực tế phát sinh
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                  <tr>
                    <th className="p-3.5 pl-6 w-[220px] min-w-[220px]">Mã & KOC Live</th>
                    <th className="p-3.5 w-[200px] min-w-[200px]">Link bài đăng & kênh</th>
                    <th className="p-3.5 w-[220px] min-w-[220px]">Mã ủy quyền Spark Ads</th>
                    <th className="p-3.5 w-[140px] min-w-[140px] font-mono">Views / Likes</th>
                    <th className="p-3.5 w-[160px] min-w-[160px] font-mono">GMV thực nhận</th>
                    <th className="p-3.5 w-[140px] min-w-[140px]">Hiệu quả (ROI)</th>
                    <th className="p-3.5 pr-6 text-right w-[140px] min-w-[140px] sticky right-0 bg-slate-50 border-l border-slate-200">Đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {publications.map((pub) => (
                    <tr key={pub.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-3.5 pl-6">
                        <span className="font-mono text-emerald-700 font-semibold block text-2xs">{pub.publicationCode}</span>
                        <span className="font-semibold text-slate-900 text-xs">{pub.creatorName}</span>
                        <div className="text-2xs text-slate-500">Content: {pub.contentCode}</div>
                      </td>
                      <td className="p-3.5">
                        <a
                          href={pub.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-2xs"
                        >
                          <span>{pub.platform} Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-2xs text-slate-500 block mt-0.5">Ngày live: {pub.publishedAt}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {pub.sparkAdsCode ? (
                          <div className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                            {pub.sparkAdsCode} ({pub.sparkAdsExpiryDays} ngày)
                          </div>
                        ) : (
                          <span className="text-2xs text-slate-400">Chưa cấp</span>
                        )}
                        <span className="text-2xs text-slate-500 block mt-0.5">
                          {pub.isMediaHandedOff ? '✓ Đã bàn giao team Media Ads' : 'Chưa bàn giao Ads'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-slate-900">{(pub.viewsCount / 1000).toFixed(0)}k views</div>
                        <div className="text-2xs text-slate-500">{(pub.likesCount / 1000).toFixed(1)}k likes</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-emerald-600 whitespace-nowrap">
                          {(pub.affiliateGmv / 1000000).toLocaleString('vi-VN')}&nbsp;M&nbsp;₫
                        </div>
                        <div className="text-2xs text-slate-500">{pub.itemsSold} món bán</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          ROI: {pub.roi}x
                        </span>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          CP: {formatVndShort(pub.costAttributed)}
                        </div>
                      </td>
                      <td className="p-3.5 pr-6 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Đã đối soát
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 5: Master Pillars & Product Angles */}
      {activeSubTab === 'PILLARS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-2xs border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chuẩn Hóa Kiến Trúc Nội Dung UpBase</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Trụ Cột Nội Dung (Master Pillars) & Góc Tiếp Cận Theo Sản Phẩm (Content Angles)
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Trụ cột (Pillar) định hình phong cách kênh tổng thể. Mỗi sản phẩm đẩy của từng gian hàng cần được xây dựng các <strong>Content Angles cụ thể</strong> (Hook 3s, nỗi đau, giải pháp) thuộc các Pillar này để cung cấp sẵn cho đội ngũ Booking & KOC.
                </p>
              </div>

              {onNavigateToAngles && (
                <button
                  onClick={onNavigateToAngles}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-95 transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Mở Màn Hình Setup Content Angle</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3 Master Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    PIL-02 · PROBLEM_SOLUTION
                  </span>
                  <span className="text-2xs text-rose-600 font-semibold">Tỷ lệ chuyển đổi cao</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Nỗi Đau - Giải Pháp (Problem - Solution)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đặt vấn đề (Pain Point) nhức nhối của khách hàng và đưa sản phẩm vào như một cứu cánh tất yếu. Thường dùng format Before/After và tình huống hoảng loạn.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-rose-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.500.000 đ / video</div>
                  <div><strong>Format đề xuất:</strong> POV nửa đêm, Review Voice, Before/After</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    PIL-01 · DIRECT_REVIEW
                  </span>
                  <span className="text-2xs text-blue-600 font-semibold">Xây dựng uy tín</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Review Trực Tiếp (Direct Review)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  KOC trải nghiệm thực tế sản phẩm, chiếm &gt;70% thời lượng video. Tập trung vào texture, thành phần, cảm nhận khi thoa/uống và kết quả thực chứng.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-blue-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.500.000 đ / video</div>
                  <div><strong>Format đề xuất:</strong> Talking Head, Review Voice, Macro cận cảnh</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    PIL-03 · UNBOXING
                  </span>
                  <span className="text-2xs text-emerald-600 font-semibold">Tự nhiên & Chân thực</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Unboxing & Trải Nghiệm (UGC Unbox)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đập hộp bao bì, âm thanh ASMR chân thực, tạo cảm giác người tiêu dùng tự đặt mua và hào hứng mở kiện hàng. Phù hợp cho Affiliate và Nano Creator.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-emerald-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.000.000 đ / video</div>
                  <div><strong>Format đề xuất:</strong> Unbox Voice, ASMR, Ảnh lướt</div>
                </div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Đã có phân hệ riêng: Thiết Lập Content Angle Theo Từng Sản Phẩm
                  </div>
                  <div className="text-2xs text-slate-600">
                    Cấu hình ma trận phủ kịch bản (Product x Pillar Matrix), gợi ý Hook 3s bằng AI và kết nối trực tiếp vào luồng Booking Deals.
                  </div>
                </div>
              </div>
              {onNavigateToAngles && (
                <button
                  onClick={onNavigateToAngles}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition whitespace-nowrap"
                >
                  Truy cập ngay →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Script Review Modal */}
      <ScriptReviewModal
        isOpen={!!selectedScript}
        onClose={() => setSelectedScript(null)}
        script={selectedScript}
        onApproveScript={handleApprove}
        onRequestRevision={handleRequestRevision}
      />
    </div>
  );
};
