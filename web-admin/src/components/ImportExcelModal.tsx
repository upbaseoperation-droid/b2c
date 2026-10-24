'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from './ui';
import { UploadCloud, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { formatVnd } from '../lib/format';

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

  const handleClose = useCallback(() => {
    setSuccessData(null);
    onClose();
  }, [onClose]);

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

  return (
    <Modal open={isOpen} onClose={handleClose} title="Nhập báo cáo doanh số" size="md">
      <div className="space-y-4">
        {!successData ? (
          <>
            {/* Dropzone */}
            <div
              onClick={handleSimulateImport}
              className="border-2 border-dashed border-line-strong hover:border-primary rounded-xl p-5 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-sunken hover:bg-hover transition group"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center py-4">
                  <Loader2 className="w-9 h-9 text-primary animate-spin mb-3" />
                  <span className="text-xs font-semibold text-ink">Đang phân tích &amp; khớp mã KOC...</span>
                  <span className="text-2xs text-muted mt-1">Đang xử lý dữ liệu đối soát an toàn</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-success-soft text-success flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-ink">Kéo thả file Excel/CSV báo cáo vào đây</span>
                  <span className="text-2xs text-muted mt-1 max-w-xs leading-relaxed">
                    Hỗ trợ file xuất từ TikTok Shop Seller Center, Shopee Affiliate, hoặc B2C Booking.xlsx
                  </span>
                  <span className="mt-4 inline-block px-4 py-2 bg-surface hover:bg-hover text-ink-2 text-xs font-semibold rounded-lg border border-line-strong transition">
                    Bấm để chọn file hoặc kiểm tra thử
                  </span>
                </>
              )}
            </div>

            <div className="p-3 bg-sunken rounded-lg border border-line text-xs text-ink-2 space-y-1">
              <p>• Khớp cột `ID kênh`, `Mã BO` hoặc `Link kênh` để cập nhật GMV.</p>
              <p>• Cập nhật chỉ số hiệu suất nhân sự.</p>
            </div>
          </>
        ) : (
          <div className="py-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-ink">Đã đồng bộ dữ liệu báo cáo</h4>
              <p className="text-xs text-muted mt-0.5">Dữ liệu đã được nạp vào bộ nhớ đối soát</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-success-soft rounded-xl border border-success-line">
              <div>
                <span className="text-xs text-ink-2 block">Deals KOC cập nhật</span>
                <span className="text-lg font-semibold text-ink tabular-nums">{successData.updatedDeals} KOC</span>
              </div>
              <div>
                <span className="text-xs text-ink-2 block">Tổng doanh số GMV mới</span>
                <span className="text-lg font-semibold text-success tabular-nums">+{formatVnd(successData.totalGmvAdded)}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-primary hover:bg-primary-hover text-primary-fg font-semibold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-2"
            >
              <span>Xem thay đổi trên bảng thi đua</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
