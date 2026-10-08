'use client';

import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: { updatedDeals: number; totalGmvAdded: number }) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{ updatedDeals: number; totalGmvAdded: number } | null>(null);

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateImport = () => {
    setIsProcessing(true);
    setSuccessData(null);

    // Simulate backend fast parsing in 1.2 seconds
    setTimeout(() => {
      setIsProcessing(false);
      const result = {
        updatedDeals: 42,
        totalGmvAdded: 385000000
      };
      setSuccessData(result);
      onImportSuccess(result);
    }, 1200);
  };

  const handleClose = () => {
    setSuccessData(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-excel-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header - Enterprise Light Theme */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-semibold shadow-2xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 id="import-excel-title" className="text-sm font-semibold text-slate-900">
                Nhập báo cáo doanh số
              </h3>
              <p className="text-xs text-slate-500">Kéo thả file Excel đối soát từ TikTok Shop / Shopee</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!successData ? (
            <>
              {/* Dropzone - Clean Light */}
              <div
                onClick={handleSimulateImport}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition group"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mb-3" />
                    <span className="text-xs font-semibold text-slate-900">Đang phân tích &amp; khớp mã KOC...</span>
                    <span className="text-2xs text-slate-500 mt-1">Đang xử lý dữ liệu đối soát an toàn</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">Kéo thả file Excel/CSV báo cáo vào đây</span>
                    <span className="text-2xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Hỗ trợ file xuất từ TikTok Shop Seller Center, Shopee Affiliate, hoặc B2C Booking.xlsx
                    </span>
                    <button
                      type="button"
                      className="mt-4 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
                    >
                      Bấm để chọn file hoặc kiểm tra thử
                    </button>
                  </>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Cơ chế đối soát thông minh:</span>
                </div>
                <p>• Hệ thống tự động nhận diện cột `ID kênh`, `Mã BO` hoặc `Link kênh` để cập nhật GMV.</p>
                <p>• Tự động cộng điểm vào bảng vàng thi đua cho nhân sự phụ trách deal.</p>
              </div>
            </>
          ) : (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">Đồng bộ báo cáo thành công!</h4>
                <p className="text-xs text-slate-500 mt-0.5">Dữ liệu đã được nạp tức thì vào bộ nhớ đối soát</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-xs text-slate-600 block">Deals KOC cập nhật</span>
                  <span className="text-lg font-semibold text-slate-900">{successData.updatedDeals} KOCs</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 block">Tổng doanh số GMV mới</span>
                  <span className="text-lg font-semibold text-emerald-700">+{successData.totalGmvAdded.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Xem thay đổi trên bảng thi đua</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
