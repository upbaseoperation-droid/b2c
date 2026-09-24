'use client';

import React, { useState } from 'react';
import { X, CheckCircle, RotateCcw, Clock, ShieldAlert, Sparkles, Video, FileText, CheckSquare, MessageSquare } from 'lucide-react';
import { ScriptReviewItem } from '../lib/types';

interface ScriptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: ScriptReviewItem | null;
  onApproveScript: (scriptId: string) => void;
  onRequestRevision: (scriptId: string, notes: string) => void;
}

export const ScriptReviewModal: React.FC<ScriptReviewModalProps> = ({
  isOpen,
  onClose,
  script,
  onApproveScript,
  onRequestRevision,
}) => {
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isRevisionMode, setIsRevisionMode] = useState(false);

  // Checklists
  const [checkUsp, setCheckUsp] = useState(true);
  const [checkNoBannedKeywords, setCheckNoBannedKeywords] = useState(true);
  const [checkCallToAction, setCheckCallToAction] = useState(true);
  const [checkDuration, setCheckDuration] = useState(true);

  if (!isOpen || !script) return null;

  const handleApprove = () => {
    onApproveScript(script.id);
    onClose();
  };

  const handleSendRevision = () => {
    if (!feedbackNotes.trim()) {
      alert('Vui lòng nhập ghi chú phản hồi để KOC biết cần chỉnh sửa điểm nào!');
      return;
    }
    onRequestRevision(script.id, feedbackNotes);
    setIsRevisionMode(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Thẩm Định Kịch Bản KOC (SLA: 24h)</h3>
                <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                  {script.dealCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                KOC: <strong className="text-white">{script.kocName}</strong> • {script.campaignTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#0b1120] rounded-md border border-[#1e293b] text-xs">
            <span className="text-slate-300">
              🏷️ Phân loại: <strong className="text-purple-400">{script.pillar}</strong>
            </span>
            <span className="text-slate-300">
              ⏱️ Thời lượng dự kiến: <strong className="text-white">{script.videoDuration}</strong>
            </span>
            <span className="badge-amber px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              SLA còn {script.remainingHours > 0 ? `${script.remainingHours}h` : 'Đã nghiệm thu'}
            </span>
          </div>

          {/* 4 Structural Script Sections */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nội Dung Kịch Bản Chi Tiết (Cấu Trúc 4 Phần Chuẩn TikTok Shop)
            </h4>

            {/* Section 1: Hook */}
            <div className="p-3.5 bg-[#0f172a] rounded-xl border border-blue-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">1. ĐOẠN MỞ ĐẦU (0 — 3 GIÂY: HOOK)</span>
                <span className="text-[10px] text-slate-400">Giữ chân người xem lướt qua</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed italic">
                &ldquo;{script.hook}&rdquo;
              </p>
            </div>

            {/* Section 2: Pain Point */}
            <div className="p-3.5 bg-[#0f172a] rounded-xl border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">2. NỖI ĐAU KHÁCH HÀNG (3 — 15 GIÂY: PAIN POINT)</span>
                <span className="text-[10px] text-slate-400">Kích hoạt cảm xúc đồng cảm</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {script.painPoint}
              </p>
            </div>

            {/* Section 3: Solution & USP */}
            <div className="p-3.5 bg-[#0f172a] rounded-xl border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">3. GIẢI PHÁP & USP SẢN PHẨM (15 — 45 GIÂY)</span>
                <span className="text-[10px] text-slate-400">Lợi điểm độc nhất & Thành phần</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {script.solutionAndUsp}
              </p>
            </div>

            {/* Section 4: CTA */}
            <div className="p-3.5 bg-[#0f172a] rounded-xl border border-purple-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">4. KÊU GỌI HÀNH ĐỘNG (45 — 60 GIÂY: CTA)</span>
                <span className="text-[10px] text-slate-400">Gắn giỏ hàng & Voucher chớp nhoáng</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {script.callToAction}
              </p>
            </div>
          </div>

          {/* Quality Audit Checklist */}
          <div className="card-enterprise p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              Checklist Kiểm Duyệt Tiêu Chuẩn Nền Tảng & Thương Hiệu
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkUsp}
                  onChange={(e) => setCheckUsp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Đúng thông điệp USP & Brand Guidelines</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkNoBannedKeywords}
                  onChange={(e) => setCheckNoBannedKeywords(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Không vi phạm từ cấm TikTok (trị dứt điểm, cam kết...)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkCallToAction}
                  onChange={(e) => setCheckCallToAction(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Có lời kêu gọi nhấp giỏ hàng góc trái rõ ràng</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkDuration}
                  onChange={(e) => setCheckDuration(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Thời lượng quay thực tế đạt chuẩn (60 - 90s)</span>
              </label>
            </div>
          </div>

          {/* Revision Input Box if toggled */}
          {isRevisionMode && (
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Nhập Ghi Chú Phản Hồi Yêu Cầu Sửa Kịch Bản Cho KOC
                </span>
                <button
                  onClick={() => setIsRevisionMode(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="VD: Đoạn hook 3s đầu cần đẩy năng lượng cao hơn; bổ sung nhấn mạnh vào chứng nhận màng lọc Tinosorb Châu Âu..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSendRevision}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition"
              >
                Gửi Yêu Cầu Chỉnh Sửa Cho Booking Phản Hồi KOC
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#0c121e] border-t border-[#1e293b] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Trạng thái hiện tại: <strong className="text-white">{script.status === 'PENDING' ? 'Chờ Phê Duyệt' : script.status === 'APPROVED' ? 'Đã Phê Duyệt' : 'Yêu Cầu Sửa'}</strong>
          </span>

          <div className="flex items-center gap-2">
            {!isRevisionMode && script.status === 'PENDING' && (
              <button
                onClick={() => setIsRevisionMode(true)}
                className="px-4 py-2 bg-[#131d31] hover:bg-[#1a2844] text-slate-300 font-semibold text-xs rounded-xl border border-[#233554] transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Yêu Cầu Chỉnh Sửa
              </button>
            )}

            {script.status === 'PENDING' && (
              <button
                onClick={handleApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Duyệt Kịch Bản (Pass SLA) & Kích Hoạt Ký Hợp Đồng
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
