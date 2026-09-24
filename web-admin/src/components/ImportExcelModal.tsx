'use client';

import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">📥 Nhập Báo Cáo Doanh Số 1 Chạm</h3>
              <p className="text-xs text-slate-400">Zero-API: Kéo thả file Excel từ TikTok Shop / Shopee</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!successData ? (
            <>
              {/* Dropzone */}
              <div
                onClick={handleSimulateImport}
                className="border-2 border-dashed border-[#334155] hover:border-emerald-500 rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#0d1322] hover:bg-[#121b2d] transition group"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                    <span className="text-sm font-semibold text-white">Đang phân tích & khớp mã KOC...</span>
                    <span className="text-xs text-slate-400 mt-1">Đang xử lý 19.000 dòng dữ liệu không giật lag</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">Kéo thả file Excel/CSV báo cáo vào đây</span>
                    <span className="text-xs text-slate-400 mt-1 max-w-xs">
                      Hỗ trợ file xuất từ TikTok Shop Seller Center, Shopee Affiliate, hoặc file B2C_Quản lý Booking.xlsx
                    </span>
                    <button
                      type="button"
                      className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium rounded-lg border border-slate-700 transition"
                    >
                      Bấm để chọn file mẫu hoặc kiểm tra thử
                    </button>
                  </>
                )}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cơ chế đối soát thông minh:</span>
                </div>
                <p>• Hệ thống tự động nhận diện cột `ID kênh`, `Mã BO` hoặc `Link kênh` để cập nhật GMV.</p>
                <p>• Tự động cộng điểm vào Bảng Vàng Thi Đua (Leaderboard) cho nhân sự phụ trách deal.</p>
              </div>
            </>
          ) : (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Đồng Bộ Báo Cáo Thành Công!</h4>
                <p className="text-xs text-slate-400 mt-1">Dữ liệu đã được nạp tức thì vào CSDL</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-[#0d1322] rounded-xl border border-emerald-500/30">
                <div>
                  <span className="text-xs text-slate-400 block">Deals KOC Cập Nhật</span>
                  <span className="text-xl font-bold text-white">{successData.updatedDeals} KOCs</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tổng Doanh Số GMV Mới</span>
                  <span className="text-xl font-bold text-emerald-400">+{successData.totalGmvAdded.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-1.5"
              >
                <span>Xem Thay Đổi Trên Bảng Thi Đua</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
