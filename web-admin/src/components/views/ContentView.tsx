'use client';

import React, { useState } from 'react';
import { formatVndShort } from '../../lib/format';
import { ConfirmDialog, Tabs } from '../ui';
import { 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Eye, 
  Video, 
  Layers, 
  Share2,
  ExternalLink,
  FileText
} from 'lucide-react';
import { ScriptReviewItem, ContentItemModel, PublicationItemModel } from '../../lib/types';
import { INITIAL_SCRIPTS, INITIAL_CONTENT_ITEMS, INITIAL_PUBLICATIONS } from '../../lib/mockData';
import { ScriptReviewModal } from '../ScriptReviewModal';
import { OperationalReportDrawer } from '../OperationalReportDrawer';

interface ContentViewProps {
  onScriptApprovedNotification?: (dealCode: string) => void;
  onNavigateToAngles?: () => void;
}

type ContentSubTab = 'CONTENT_ITEMS' | 'SCRIPTS' | 'DRAFT_VIDEOS' | 'PUBLICATIONS' | 'PILLARS';

export const ContentView: React.FC<ContentViewProps> = ({ onScriptApprovedNotification, onNavigateToAngles }) => {
  const [scripts, setScripts] = useState<ScriptReviewItem[]>(INITIAL_SCRIPTS);
  const [contentItems] = useState<ContentItemModel[]>(INITIAL_CONTENT_ITEMS);
  const [publications] = useState<PublicationItemModel[]>(INITIAL_PUBLICATIONS);
  const [selectedScript, setSelectedScript] = useState<ScriptReviewItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ContentSubTab>('CONTENT_ITEMS');
  const [approvingDraftVideo, setApprovingDraftVideo] = useState<string | null>(null);
  const [approvedDraftVideos, setApprovedDraftVideos] = useState<Set<string>>(new Set());
  const [isScriptReportOpen, setIsScriptReportOpen] = useState(false);

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
      {/* Navigation Sub-Tabs and Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1">
        <Tabs<ContentSubTab>
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            { key: 'CONTENT_ITEMS', label: 'Kho nội dung', count: contentItems.length },
            { key: 'SCRIPTS', label: 'Chờ duyệt kịch bản', count: scripts.filter(s => s.status === 'PENDING').length },
            { key: 'DRAFT_VIDEOS', label: 'Video nháp KOC' },
            { key: 'PUBLICATIONS', label: 'Đối soát bài đăng', count: publications.length },
            { key: 'PILLARS', label: 'Trụ cột nội dung' },
          ]}
        />

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => setIsScriptReportOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Báo cáo rà soát kịch bản & từ cấm</span>
          </button>
          {onNavigateToAngles && (
            <button
              onClick={onNavigateToAngles}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-soft text-accent hover:bg-sunken border border-line transition flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Thiết lập góc tiếp cận SP</span>
            </button>
          )}
        </div>
      </div>

      {/* View 0: Content Items Master Grid */}
      {activeSubTab === 'CONTENT_ITEMS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Kho sản phẩm nội dung — Quản trị tách biệt với booking</span>
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {contentItems.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-code text-accent font-semibold text-xs">{item.contentCode}</span>
                      <span className="text-ink-3 text-xs">· BO: <strong className="text-ink font-code">{item.dealCode}</strong></span>
                      <span className="text-ink font-semibold text-sm">{item.creatorName}</span>
                      <span className="text-2xs text-ink-3">· {item.pillar} · {item.format}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                        item.qcStatus === 'PASS' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        QC: {item.qcStatus === 'PASS' ? 'Đạt chuẩn xuất bản' : 'Cần thẩm định'}
                      </span>
                      <span className="text-2xs text-slate-500">Sửa: {item.revisionCount}/2 lần</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="text-slate-600 font-medium">Góc tiếp cận: <strong className="text-slate-900">{item.angle}</strong></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-2xs">
                      <div><span className="text-accent font-semibold">Mở đầu:</span> <span className="text-slate-700">{item.scriptHook}</span></div>
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
              <h3 className="text-sm font-semibold text-slate-900">Hàng chờ thẩm định kịch bản KOC</h3>
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
                    <span className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                      {item.kocName}
                    </span>
                    <span className="text-2xs text-ink-3">
                      · {item.pillar} · <span className="font-code text-ink-2">{item.dealCode}</span>
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Mở đầu 3s: &ldquo;{item.hook}&rdquo;
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
                        className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Thẩm định kịch bản
                      </button>
                    </>
                  ) : item.status === 'APPROVED' ? (
                    <span className="badge-emerald px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Đã duyệt
                    </span>
                  ) : (
                    <span className="badge-amber px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Cần sửa
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
              <span className="font-semibold text-slate-900 text-sm">Chanh Beauty Review — Video nháp 60s UV Test</span>
              <span className="badge-amber px-2 py-0.5 rounded text-2xs font-semibold">Chờ nghiệm thu</span>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-xl flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-accent mb-2 opacity-80" />
              <p className="font-semibold text-ink">Video nháp v1: Test Camera UV 8h ngoài trời</p>
              <p className="text-2xs text-ink-3 mt-1">KOC đã gắn nhãn giỏ hàng và hashtag #UpBeauty #MegaSale1010</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Thời lượng: <strong className="text-slate-900">62 giây</strong></span>
              {approvedDraftVideos.has('DF-VID-1') ? (
                <span className="badge-emerald px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã duyệt lên sóng</span>
                </span>
              ) : (
                <button
                  onClick={() => setApprovingDraftVideo('DF-VID-1')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Duyệt video lên sóng</span>
                </button>
              )}
            </div>
          </div>

          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Minh Đan Daily — Video review thu đông</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">Đã lên sóng</span>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-xl flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-positive mb-2 opacity-80" />
              <p className="font-semibold text-ink">TikTok: @danxinhdaily/video/74182910293847</p>
              <p className="text-2xs text-positive mt-1">Lượt xem hiện tại: 42.000 • GMV: 68.000.000&nbsp;₫</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Nghiệm thu: <strong className="text-slate-900">Đạt chỉ tiêu</strong></span>
              <span className="text-xs text-emerald-700 font-semibold">Đủ điều kiện tất toán đợt 2</span>
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
                  <span>Bài đăng thực tế & bàn giao mã Spark Ads</span>
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                  <tr>
                    <th className="p-3.5 pl-6 w-[220px] min-w-[220px]">Mã & KOC</th>
                    <th className="p-3.5 w-[200px] min-w-[200px]">Link bài đăng & kênh</th>
                    <th className="p-3.5 w-[220px] min-w-[220px]">Mã ủy quyền Spark Ads</th>
                    <th className="p-3.5 w-[140px] min-w-[140px] font-mono">Lượt xem / Thích</th>
                    <th className="p-3.5 w-[160px] min-w-[160px] font-mono">GMV thực nhận</th>
                    <th className="p-3.5 w-[140px] min-w-[140px]">Hiệu quả</th>
                    <th className="p-3.5 pr-6 text-right w-[140px] min-w-[140px] sticky right-0 bg-slate-50 border-l border-slate-200">Đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {publications.map((pub) => (
                    <tr key={pub.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-3.5 pl-6">
                        <span className="font-mono text-emerald-700 font-semibold block text-2xs">{pub.publicationCode}</span>
                        <span className="font-semibold text-slate-900 text-xs">{pub.creatorName}</span>
                        <div className="text-2xs text-slate-500">Mã nội dung: {pub.contentCode}</div>
                      </td>
                      <td className="p-3.5">
                        <a
                          href={pub.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-2xs"
                        >
                          <span>{pub.platform}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-2xs text-slate-500 block mt-0.5">Ngày đăng: {pub.publishedAt}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {pub.sparkAdsCode ? (
                          <div className="text-2xs font-medium text-ink">
                            {pub.sparkAdsCode} ({pub.sparkAdsExpiryDays} ngày)
                          </div>
                        ) : (
                          <span className="text-2xs text-slate-400">Chưa cấp</span>
                        )}
                        <span className="text-2xs text-slate-500 block mt-0.5">
                          {pub.isMediaHandedOff ? 'Đã bàn giao nhóm Ads' : 'Chưa bàn giao Ads'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-slate-900">{(pub.viewsCount / 1000).toFixed(0)}k xem</div>
                        <div className="text-2xs text-slate-500">{(pub.likesCount / 1000).toFixed(1)}k thích</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-emerald-600 whitespace-nowrap">
                          {formatVndShort(pub.affiliateGmv)}
                        </div>
                        <div className="text-2xs text-slate-500">{pub.itemsSold} món bán</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-xs font-semibold text-ink">
                          ROI: {pub.roi}x
                        </span>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          CP: {formatVndShort(pub.costAttributed)}
                        </div>
                      </td>
                      <td className="p-3.5 pr-6 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã đối soát
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
                <div className="inline-flex items-center gap-1.5 text-accent font-medium text-2xs">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Chuẩn hóa kiến trúc nội dung Upbase</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Trụ cột nội dung & góc tiếp cận theo sản phẩm
                </h3>
                
              </div>

              {onNavigateToAngles && (
                <button
                  onClick={onNavigateToAngles}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span>Thiết lập góc tiếp cận</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3 Master Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-code text-2xs font-medium text-ink-3">
                    PIL-02 · PROBLEM_SOLUTION
                  </span>
                  <span className="text-2xs text-rose-600 font-semibold">Tỷ lệ chuyển đổi cao</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Nỗi đau & giải pháp</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đặt vấn đề nhức nhối của khách hàng và đưa sản phẩm vào như giải pháp phù hợp. Thường dùng cấu trúc trước/sau khi dùng.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-rose-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.500.000 đ / video</div>
                  <div><strong>Định dạng đề xuất:</strong> Góc nhìn cá nhân, lồng tiếng, trước/sau</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-code text-2xs font-medium text-ink-3">
                    PIL-01 · DIRECT_REVIEW
                  </span>
                  <span className="text-2xs text-blue-600 font-semibold">Xây dựng uy tín</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Review trực tiếp</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  KOC trải nghiệm thực tế sản phẩm, chiếm &gt;70% thời lượng video. Tập trung vào kết cấu, thành phần, cảm nhận khi dùng và kết quả thực tế.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-blue-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.500.000 đ / video</div>
                  <div><strong>Định dạng đề xuất:</strong> Chia sẻ trực tiếp, lồng tiếng, quay cận cảnh</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-code text-2xs font-medium text-ink-3">
                    PIL-03 · UNBOXING
                  </span>
                  <span className="text-2xs text-emerald-600 font-semibold">Tự nhiên & chân thực</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Mở hộp & trải nghiệm</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mở hộp bao bì, âm thanh chân thực, tạo cảm giác người tiêu dùng tự đặt mua và mở kiện hàng. Phù hợp cho Affiliate và KOC nhỏ.
                </p>
                <div className="text-2xs text-slate-500 space-y-1 pt-2 border-t border-emerald-200/60">
                  <div><strong>Định mức thù lao:</strong> 1.000.000 đ / video</div>
                  <div><strong>Định dạng đề xuất:</strong> Mở hộp lồng tiếng, âm thanh thực, ảnh cuộn</div>
                </div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="mt-6 p-4 rounded-xl bg-accent-soft border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Thiết lập góc tiếp cận theo từng sản phẩm
                  </div>
                  <div className="text-2xs text-slate-600">
                    Cấu hình ma trận kịch bản theo sản phẩm, gợi ý mở đầu 3 giây và kết nối trực tiếp vào luồng booking.
                  </div>
                </div>
              </div>
              {onNavigateToAngles && (
                <button
                  onClick={onNavigateToAngles}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition whitespace-nowrap"
                >
                  Mở thiết lập →
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

      {/* Confirm Approve Draft Video Dialog */}
      <ConfirmDialog
        open={Boolean(approvingDraftVideo)}
        onOpenChange={(open) => !open && setApprovingDraftVideo(null)}
        title="Xác nhận phê duyệt video nháp"
        description="Bạn có chắc chắn muốn phê duyệt video nháp này? Trạng thái sẽ được chuyển sang đội ngũ booking để kiểm tra link lên sóng và hoàn tất nghiệm thu hợp đồng."
        confirmLabel="Phê duyệt lên sóng"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => {
          if (approvingDraftVideo) {
            setApprovedDraftVideos(prev => new Set([...prev, approvingDraftVideo]));
            setApprovingDraftVideo(null);
          }
        }}
      />

      <OperationalReportDrawer
        isOpen={isScriptReportOpen}
        onClose={() => setIsScriptReportOpen(false)}
        purposeId="SCRIPT_REVIEW"
        moduleTitle="Báo Cáo Rà Soát Kịch Bản, Từ Cấm Sàn & Tiến Độ Sản Xuất Video"
        moduleSubtitle={`Tổng kho nội dung: ${contentItems.length} mã | Kịch bản chờ duyệt: ${scripts.filter(s => s.status === 'PENDING').length}/${scripts.length} | Bài đăng đối soát: ${publications.length}`}
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Kho Nội Dung, Kịch Bản & Video KOC]`,
          `- Tổng số kịch bản đang theo dõi: ${scripts.length} (Chờ duyệt: ${scripts.filter(s => s.status === 'PENDING').length}, Đã duyệt: ${scripts.filter(s => s.status === 'APPROVED').length}, Yêu cầu sửa: ${scripts.filter(s => s.status === 'REVISION_REQUESTED').length})`,
          ...scripts.slice(0, 6).map(
            s => `- Kịch bản ${s.dealCode} | KOC: ${s.kocName} | Trụ cột: ${s.pillar} | Trạng thái: ${s.status} | SLA còn: ${s.remainingHours}h | Hook 3s: "${s.hook}" | USP: ${s.solutionAndUsp}`
          ),
          ...publications.slice(0, 5).map(
            p => `- Bài đăng ${p.publicationCode} (${p.contentCode}) | KOC: ${p.creatorName} | Kênh: ${p.platform} | Lượt xem: ${p.viewsCount.toLocaleString('vi-VN')} | GMV: ${formatVndShort(p.affiliateGmv)}`
          ),
        ].join('\n')}
        customSystemPrompt="Rà soát toàn bộ kịch bản chờ duyệt để phát hiện từ ngữ nhạy cảm/vi phạm chính sách sàn (cam kết 100%, trị dứt điểm, thuốc đặc trị, trắng tức thì...), kiểm tra kịch bản sắp trễ SLA 24h, và đánh giá chất lượng mở đầu (Hook 3s) kèm khuyến nghị chỉnh sửa cụ thể cho từng KOC."
      />
    </div>
  );
};
