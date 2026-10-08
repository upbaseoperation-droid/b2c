'use client';

import React, { useState, useEffect } from 'react';
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

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-review-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150">
        {/* Header - Enterprise Light */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="script-review-title" className="text-sm font-semibold text-slate-900">
                  Thẩm định kịch bản KOC (SLA: 24h)
                </h3>
                <span className="px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-purple-100 text-purple-700 border border-purple-200">
                  {script.dealCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                KOC: <strong className="text-slate-900">{script.kocName}</strong> • {script.campaignTitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
            <span>
              Phân loại: <strong className="text-purple-700">{script.pillar}</strong>
            </span>
            <span>
              Thời lượng dự kiến: <strong className="text-slate-900">{script.videoDuration}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              SLA còn {script.remainingHours > 0 ? `${script.remainingHours}h` : 'Đã nghiệm thu'}
            </span>
          </div>

          {/* 4 Structural Script Sections */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-800">
              Nội dung kịch bản chi tiết (cấu trúc 4 phần chuẩn TikTok Shop)
            </h4>

            {/* Section 1: Hook */}
            <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">1. Đoạn mở đầu (0 — 3 giây: Hook)</span>
                <span className="text-2xs text-slate-500 font-medium">Giữ chân người xem lướt qua</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed italic">
                &ldquo;{script.hook}&rdquo;
              </p>
            </div>

            {/* Section 2: Pain Point */}
            <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700">2. Nỗi đau khách hàng (3 — 15 giây: Pain point)</span>
                <span className="text-2xs text-slate-500 font-medium">Kích hoạt cảm xúc đồng cảm</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">
                {script.painPoint}
              </p>
            </div>

            {/* Section 3: Solution & USP */}
            <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">3. GIẢI PHÁP &amp; USP SẢN PHẨM (15 — 45 GIÂY)</span>
                <span className="text-2xs text-slate-500 font-medium">Lợi điểm độc nhất &amp; Thành phần</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">
                {script.solutionAndUsp}
              </p>
            </div>

            {/* Section 4: CTA */}
            <div className="p-3.5 bg-purple-50/50 rounded-lg border border-purple-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700">4. Kêu gọi hành động (45 — 60 giây: CTA)</span>
                <span className="text-2xs text-slate-500 font-medium">Gắn giỏ hàng &amp; Voucher chớp nhoáng</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">
                {script.callToAction}
              </p>
            </div>
          </div>

          {/* Quality Audit Checklist */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              Checklist Kiểm Duyệt Tiêu Chuẩn Nền Tảng &amp; Thương Hiệu
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkUsp}
                  onChange={(e) => setCheckUsp(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Đúng thông điệp USP &amp; Brand Guidelines</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkNoBannedKeywords}
                  onChange={(e) => setCheckNoBannedKeywords(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Không vi phạm từ cấm TikTok (trị dứt điểm...)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkCallToAction}
                  onChange={(e) => setCheckCallToAction(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Có lời kêu gọi nhấp giỏ hàng góc trái rõ ràng</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkDuration}
                  onChange={(e) => setCheckDuration(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Thời lượng quay thực tế đạt chuẩn (60 - 90s)</span>
              </label>
            </div>
          </div>

          {/* Revision Input Box if toggled */}
          {isRevisionMode && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-300 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  Nhập ghi chú phản hồi yêu cầu sửa kịch bản cho KOC
                </span>
                <button
                  onClick={() => setIsRevisionMode(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Hủy
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="VD: Đoạn hook 3s đầu cần đẩy năng lượng cao hơn; bổ sung nhấn mạnh vào chứng nhận màng lọc Tinosorb châu âu..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleSendRevision}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition shadow-xs"
              >
                Gửi yêu cầu chỉnh sửa cho booking phản hồi KOC
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions - Enterprise Light */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Trạng thái hiện tại: <strong className="text-slate-900">{script.status === 'PENDING' ? 'Chờ Phê Duyệt' : script.status === 'APPROVED' ? 'Đã Phê Duyệt' : 'Yêu Cầu Sửa'}</strong>
          </span>

          <div className="flex items-center gap-2">
            {!isRevisionMode && script.status === 'PENDING' && (
              <button
                onClick={() => setIsRevisionMode(true)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Yêu cầu chỉnh sửa</span>
              </button>
            )}

            {script.status === 'PENDING' && (
              <button
                onClick={handleApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Duyệt Kịch Bản (Pass SLA) &amp; Kích Hoạt Ký HĐ</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
