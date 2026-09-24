'use client';

import React, { useState } from 'react';
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
}

export const ContentView: React.FC<ContentViewProps> = ({ onScriptApprovedNotification }) => {
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
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'DRAFT_VIDEOS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>3. Video Nháp KOC Gửi Về</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PUBLICATIONS')}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'PILLARS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>5. 3 Master Pillars</span>
        </button>
      </div>

      {/* View 0: Content Items Master Grid */}
      {activeSubTab === 'CONTENT_ITEMS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Kho Sản Phẩm Nội Dung (Content Items) — Quản Trị Tách Biệt Với Booking</span>
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
                      <span className="font-mono text-purple-700 font-bold text-xs">{item.contentCode}</span>
                      <span className="text-slate-500 text-xs">• BO: <strong className="text-blue-600 font-mono">{item.dealCode}</strong></span>
                      <span className="text-slate-900 font-bold text-sm">{item.creatorName}</span>
                      <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold">{item.pillar}</span>
                      <span className="badge-blue px-2 py-0.5 rounded text-[10px] font-mono">{item.format}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.qcStatus === 'PASS' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        QC: {item.qcStatus === 'PASS' ? '✓ Đạt Chuẩn Xuất Bản' : '⏳ Cần Thẩm Định'}
                      </span>
                      <span className="text-[11px] text-slate-500">Sửa: {item.revisionCount}/2 lần</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="text-slate-600 font-medium">🎯 Góc tiếp cận (Angle): <strong className="text-slate-900">{item.angle}</strong></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div><span className="text-purple-700 font-bold">🎣 Hook:</span> <span className="text-slate-700">{item.scriptHook}</span></div>
                      <div><span className="text-rose-700 font-bold">💥 Nỗi đau:</span> <span className="text-slate-700">{item.scriptPainPoint}</span></div>
                      <div><span className="text-emerald-700 font-bold">✨ Giải pháp/USP:</span> <span className="text-slate-700">{item.scriptUsp}</span></div>
                      <div><span className="text-blue-700 font-bold">🚀 CTA:</span> <span className="text-slate-700">{item.scriptCta}</span></div>
                    </div>
                    {item.qcChecklistNotes && (
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-emerald-700">
                        🛡️ <strong>Ghi chú QC:</strong> {item.qcChecklistNotes}
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
              <h3 className="text-sm font-bold text-slate-900">Hàng Chờ Thẩm Định Kịch Bản KOC (SLA: 24h)</h3>
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
                    <span className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
                      {item.kocName}
                    </span>
                    <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold">
                      {item.pillar}
                    </span>
                    <span className="badge-blue px-2 py-0.5 rounded text-[10px] font-mono">
                      {item.dealCode}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Hook 3s: &ldquo;{item.hook}&rdquo;
                  </div>
                  <div className="text-xs text-slate-600">
                    USP: {item.solutionAndUsp}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-0.5">
                    Nộp bởi: <strong className="text-slate-700">{item.submittedBy}</strong> • {item.submittedAt}
                    {item.feedbackNotes && (
                      <span className="text-amber-700 block mt-1 font-semibold">⚠️ Ghi chú sửa: {item.feedbackNotes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'PENDING' ? (
                    <>
                      <span className="badge-amber px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        SLA còn {item.remainingHours}h
                      </span>
                      <button
                        onClick={() => setSelectedScript(item)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Thẩm Định Kịch Bản
                      </button>
                    </>
                  ) : item.status === 'APPROVED' ? (
                    <span className="badge-emerald px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Đã Phê Duyệt (Ký HĐ)
                    </span>
                  ) : (
                    <span className="badge-amber px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Yêu Cầu Chỉnh Sửa
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
              <span className="font-bold text-slate-900 text-sm">Chanh Beauty Review — Video Nháp 60s UV Test</span>
              <span className="badge-amber px-2 py-0.5 rounded text-[10px] font-bold">Chờ Nghiệm Thu (SLA 12h)</span>
            </div>
            <div className="aspect-video bg-slate-900 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-purple-400 mb-2 opacity-80" />
              <p className="font-bold text-white">Video Nháp v1: Test Camera UV 8h Ngoài Trời</p>
              <p className="text-[11px] text-slate-400 mt-1">KOC đã gắn sticker giỏ hàng và hashtag #UpBeauty #MegaSale1010</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Thời lượng: <strong className="text-slate-900">62 giây</strong> (Full HD)</span>
              <button
                onClick={() => alert('✅ Đã duyệt video nháp! Chuyển trạng thái cho Booking duyệt link lên sóng TikTok Shop.')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Duyệt Video Cho Lên Sóng</span>
              </button>
            </div>
          </div>

          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Minh Đan Daily — Video Review Thu Đông</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-[10px] font-bold">Đã Lên Sóng Official</span>
            </div>
            <div className="aspect-video bg-slate-900 rounded-xl border border-emerald-500/30 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
              <p className="font-bold text-white">TikTok: @danxinhdaily/video/74182910293847</p>
              <p className="text-[11px] text-emerald-400 mt-1">Lượt xem hiện tại: 42.000 views • GMV: 68.000.000&nbsp;₫</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Nghiệm thu: <strong className="text-slate-900">Đạt 100% KPI</strong></span>
              <span className="text-xs text-emerald-700 font-bold">Đủ điều kiện Tất Toán Đợt 2</span>
            </div>
          </div>
        </div>
      )}

      {/* View 3: 3 Master Pillars */}
      {activeSubTab === 'PILLARS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-enterprise p-5 border-blue-200 bg-blue-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pillar 1: Educational (35%)</span>
              <span className="badge-blue px-2 py-0.5 rounded text-[10px] font-bold">TikTok / Reels</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Giáo Dục & Đập Tan Hoài Nghi</h4>
            <p className="text-xs text-slate-600">
              Thử nghiệm camera UV trước & sau khi thoa; Bác sĩ giải thích cơ chế bảo vệ màng lọc quang phổ rộng.
            </p>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              Đã bàn giao: <strong className="text-slate-800">14 Kịch bản</strong> sang Booking
            </div>
          </div>

          <div className="card-enterprise p-5 border-purple-200 bg-purple-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Pillar 2: Social Proof (45%)</span>
              <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold">TikTok / Threads</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Trải Nghiệm Thực Tế & KOC Review</h4>
            <p className="text-xs text-slate-600">
              Cảm nhận chất kem mịn màng không vón cục; Thử thách 8 tiếng kiềm dầu ngoài trời nắng gắt.
            </p>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              Đang điều phối: <strong className="text-slate-800">26 KOCs</strong> quay sample
            </div>
          </div>

          <div className="card-enterprise p-5 border-emerald-200 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Pillar 3: Commercial (20%)</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-[10px] font-bold">Live TikTok / Shopee</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Chốt Đơn & Flash Promotion</h4>
            <p className="text-xs text-slate-600">
              Voucher độc quyền D-Day 10.10 mua 1 tặng 1 kèm quà tặng fullsize độc quyền trong phiên Livestream.
            </p>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
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
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Bài Đăng Thực Tế & Bàn Giao Mã Spark Ads — Đo Lường Hiệu Quả Độc Lập</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đối soát link video lên sóng, mã ủy quyền Spark Ads 30 ngày và doanh thu GMV thực tế phát sinh
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3.5 pl-6 w-[220px] min-w-[220px]">Mã & KOC Live</th>
                    <th className="p-3.5 w-[200px] min-w-[200px]">Link Bài Đăng & Kênh</th>
                    <th className="p-3.5 w-[220px] min-w-[220px]">Mã Ủy Quyền Spark Ads</th>
                    <th className="p-3.5 w-[140px] min-w-[140px] font-mono">Views / Likes</th>
                    <th className="p-3.5 w-[160px] min-w-[160px] font-mono">GMV Thực Nhận</th>
                    <th className="p-3.5 w-[140px] min-w-[140px]">Hiệu Quả (ROI)</th>
                    <th className="p-3.5 pr-6 text-right w-[140px] min-w-[140px] sticky right-0 bg-slate-50 border-l border-slate-200">Đối Soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {publications.map((pub) => (
                    <tr key={pub.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-3.5 pl-6">
                        <span className="font-mono text-emerald-700 font-bold block text-[11px]">{pub.publicationCode}</span>
                        <span className="font-bold text-slate-900 text-xs">{pub.creatorName}</span>
                        <div className="text-[10px] text-slate-500">Content: {pub.contentCode}</div>
                      </td>
                      <td className="p-3.5">
                        <a
                          href={pub.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>🎵 {pub.platform} Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Ngày live: {pub.publishedAt}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {pub.sparkAdsCode ? (
                          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                            🔑 {pub.sparkAdsCode} ({pub.sparkAdsExpiryDays} ngày)
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Chưa cấp</span>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {pub.isMediaHandedOff ? '✓ Đã bàn giao team Media Ads' : 'Chưa bàn giao Ads'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-slate-900">{(pub.viewsCount / 1000).toFixed(0)}k views</div>
                        <div className="text-[10px] text-slate-500">{(pub.likesCount / 1000).toFixed(1)}k likes</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-emerald-600 whitespace-nowrap">
                          {(pub.affiliateGmv / 1000000).toLocaleString('vi-VN')}&nbsp;M&nbsp;₫
                        </div>
                        <div className="text-[10px] text-slate-500">{pub.itemsSold} món bán</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          ROI: {pub.roi}x
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          CP: {(pub.costAttributed / 1000000).toFixed(1)}M
                        </div>
                      </td>
                      <td className="p-3.5 pr-6 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ ĐÃ ĐỐI SOÁT
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
