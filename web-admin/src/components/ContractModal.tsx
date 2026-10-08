'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  CheckCircle, 
  FileText, 
  ShieldCheck, 
  QrCode,
  ExternalLink,
  Sparkles,
  Building2,
  FileCheck
} from 'lucide-react';
import { BookingDealItem, OcrLegalExtractionResult } from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';
import { jsPDF } from 'jspdf';
import { LegalOcrModal } from './LegalOcrModal';

interface ContractModalProps {
  deal: BookingDealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApproveAdvance?: (dealId: string) => void;
  onApproveFinal?: (dealId: string) => void;
  initialOcrResult?: OcrLegalExtractionResult | null;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  deal,
  isOpen,
  onClose,
  onApproveAdvance,
  onApproveFinal,
  initialOcrResult = null,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [ocrData, setOcrData] = useState<OcrLegalExtractionResult | null>(initialOcrResult);

  // Sync initialOcrResult when changed
  useEffect(() => {
    if (initialOcrResult) {
      setOcrData(initialOcrResult);
    }
  }, [initialOcrResult]);

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

  if (!isOpen || !deal) return null;

  const koc = INITIAL_KOCS.find(k => k.id === deal.kocId) || {
    realName: deal.kocStageName,
    cccd: '001201019876',
    bankAccount: '19036789123456',
    bankName: 'Techcombank'
  };

  // Generate VietQR dynamic payment URL
  const qrBankBin = '970407'; // Techcombank BIN code
  const qrAccountNumber = koc.bankAccount || '19036789123456';
  const isAdvancePending = deal.status !== 'ADVANCE_PAID' && deal.status !== 'FINAL_PAID';
  const qrAmount = isAdvancePending ? deal.advanceAmount : deal.finalAmount;
  const qrTransferDescription = `${deal.dealCode} ${isAdvancePending ? 'COC' : 'TAT TOAN'}`.slice(0, 50);
  const qrUrl = `https://img.vietqr.io/image/${qrBankBin}-${qrAccountNumber}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrTransferDescription)}&accountName=${encodeURIComponent(koc.realName || deal.kocStageName)}`;

  // Export contract as formatted PDF
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', 105, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('Doc lap - Tu do - Hanh phuc', 105, 26, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(75, 29, 135, 29);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('HOP DONG DICH VU QUANG BA NOI DUNG KOC', 105, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ma so deal: ${deal.dealCode} | Ngay lap: 22/09/2026`, 105, 46, { align: 'center' });

      // Parties
      doc.setFont('helvetica', 'bold');
      doc.text('BEN A (BEN THUE): CONG TY CO PHAN UPBASE ASIA', 20, 58);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Dai dien phu trach: ${deal.assignedStaff}`, 25, 64);
      doc.text('- Phong ban: Marketing B2C Operations', 25, 70);

      // Determine Party B information based on OCR extraction if available
      const isOcrCompany = ocrData && (ocrData.documentType === 'BUSINESS_LICENSE' || ocrData.documentType === 'BUSINESS_HOUSEHOLD');
      const partyBTitle = isOcrCompany ? 'BEN B (BEN CUNG CAP DICH VU - DOANH NGHIEP):' : 'BEN B (BEN CUNG CAP DICH VU - KOC):';
      const partyBName = isOcrCompany 
        ? (ocrData.fields.companyName || deal.kocStageName)
        : (ocrData?.fields.fullName || koc.realName || deal.kocStageName);
      const partyBId = isOcrCompany
        ? `MST / DKKD: ${ocrData.fields.taxCode || '0109876543'}`
        : `So CCCD: ${ocrData?.fields.idNumber || koc.cccd}`;
      const partyBAddress = isOcrCompany
        ? `Dia chi tru so: ${ocrData.fields.headquartersAddress || 'Ha Noi'}`
        : `Dia chi thuong tru: ${ocrData?.fields.permanentAddress || 'Ha Noi'}`;

      doc.setFont('helvetica', 'bold');
      doc.text(partyBTitle, 20, 82);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Ten: ${partyBName}`, 25, 88);
      doc.text(`- ${partyBId}`, 25, 94);
      if (isOcrCompany && ocrData?.fields.legalRepresentative) {
        doc.text(`- Nguoi dai dien: ${ocrData.fields.legalRepresentative} (${ocrData.fields.legalRepTitle || 'Dai dien'})`, 25, 100);
        doc.text(`- ${partyBAddress.slice(0, 75)}`, 25, 106);
        doc.text(`- So tai khoan: ${koc.bankAccount} tai Ngan hang ${koc.bankName}`, 25, 112);
      } else {
        doc.text(`- ${partyBAddress.slice(0, 75)}`, 25, 100);
        doc.text(`- So tai khoan: ${koc.bankAccount} tai Ngan hang ${koc.bankName}`, 25, 106);
      }

      // Terms
      doc.setFont('helvetica', 'bold');
      doc.text('DIEU 1: PHAM VI CONG VIEC', 20, 122);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Chien dich: ${deal.campaignTitle}`, 25, 128);
      doc.text(`- Nhan hang: ${deal.brandName} (San pham: ${deal.productName || 'Chinh hang'})`, 25, 134);
      doc.text(`- Han chot dang video: ${deal.deadlinePost}`, 25, 140);

      doc.setFont('helvetica', 'bold');
      doc.text('DIEU 2: PHI DICH VU VA THANH TOAN', 20, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Tong gia tri hop dong: ${deal.totalValue.toLocaleString('vi-VN')} VND`, 25, 156);
      doc.text(`  + Dot 1 (Tam ung sau duyet kich ban): ${deal.advanceAmount.toLocaleString('vi-VN')} VND`, 25, 162);
      doc.text(`  + Dot 2 (Tat toan sau khi video len song): ${deal.finalAmount.toLocaleString('vi-VN')} VND`, 25, 168);

      // Signatures
      doc.setFont('helvetica', 'bold');
      doc.text('DAI DIEN BEN A', 45, 195, { align: 'center' });
      doc.text('DAI DIEN BEN B', 160, 195, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.text('(Ky dien tu)', 45, 201, { align: 'center' });
      doc.text('(Ky, ghi ro ho ten)', 160, 201, { align: 'center' });

      doc.save(`HopDong_${deal.dealCode}.pdf`);
    } catch (err) {
      console.error('Lỗi khi xuất PDF, sử dụng chức năng in:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isOcrCompany = ocrData && (ocrData.documentType === 'BUSINESS_LICENSE' || ocrData.documentType === 'BUSINESS_HOUSEHOLD');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150">
        {/* Modal Top Bar - Enterprise Light */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-semibold shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="contract-modal-title" className="text-sm font-semibold text-slate-900">
                  Văn Bản Hợp Đồng KOC &amp; Cổng Chi Tiền
                </h3>
                {ocrData && (
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                    isOcrCompany 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <CheckCircle className="w-3 h-3" />
                    Đã Khớp OCR ({ocrData.documentType === 'CCCD' ? 'CCCD' : 'ĐKKD'})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Mã văn bản: <strong className="font-mono text-blue-700">{deal.dealCode}</strong> — Sinh bởi Upbase Ops Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* OCR Scanner Button */}
            <button
              onClick={() => setIsOcrOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 hover: text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Tải ảnh CCCD hoặc Giấy phép kinh doanh để bóc tách tự động"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{ocrData ? 'Quét Lại OCR' : 'Bóc Tách OCR'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Đang xuất...' : 'Tải PDF'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bản Cứng</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Contract View */}
        <div className="p-8 bg-white text-slate-900 font-sans leading-relaxed text-xs space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Recommended Template Banner if OCR applied */}
          {ocrData && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Đang áp dụng mẫu chuẩn: <strong>{ocrData.recommendedTemplate.templateName}</strong> ({ocrData.recommendedTemplate.templateCode})
                </span>
              </div>
              <span className="text-2xs font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-semibold">
                {ocrData.recommendedTemplate.sampleFileName}
              </span>
            </div>
          )}

          <div className="text-center pb-4 border-b border-slate-200">
            <h4 className="font-semibold text-sm text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
            <p className="text-xs italic text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
            <div className="mt-3 font-semibold text-base text-blue-900">
              {isOcrCompany 
                ? 'HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ NỘI DUNG — PHÁP NHÂN DOANH NGHIỆP' 
                : 'HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ NỘI DUNG (KOC MARKETING)'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Số: {deal.dealCode} / 2026 / HĐDV-UPBASE | Ngày: 22/09/2026
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800">BÊN A (BÊN THUÊ DỊCH VỤ): CÔNG TY CỔ PHẦN UPBASE ASIA</p>
              <p className="text-slate-600 mt-0.5">• Địa chỉ: Tầng 5, Tòa nhà Upbase, Cầu Giấy, Hà Nội</p>
              <p className="text-slate-600">• Đại diện phụ trách: <strong className="text-slate-900">{deal.assignedStaff}</strong> (Phòng Marketing B2C)</p>
            </div>

            {/* Party B: Dynamically rendered based on OCR */}
            <div className={`p-3.5 rounded-lg border ${
              ocrData ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50 border border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">
                  {isOcrCompany 
                    ? 'BÊN B (BÊN CUNG CẤP DỊCH VỤ - PHÁP NHÂN DOANH NGHIỆP / HKD):' 
                    : 'BÊN B (BÊN CUNG CẤP DỊCH VỤ - KOC / CÁ NHÂN):'}
                </p>
                {ocrData && (
                  <span className="text-2xs font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded">
                    Dữ liệu bóc tách từ {ocrData.fileName || 'ảnh'}
                  </span>
                )}
              </div>

              {isOcrCompany ? (
                <div className="mt-1 space-y-0.5 text-slate-700">
                  <p>• Tên đơn vị: <strong className="text-slate-900">{ocrData?.fields.companyName || deal.kocStageName}</strong></p>
                  <p>• Mã số thuế / ĐKDN: <strong className="font-mono text-slate-900">{ocrData?.fields.taxCode || '0109876543'}</strong></p>
                  <p>• Người đại diện: <strong className="text-slate-900">{ocrData?.fields.legalRepresentative}</strong> (Chức vụ: {ocrData?.fields.legalRepTitle || 'Giám đốc'})</p>
                  <p>• Địa chỉ trụ sở chính: {ocrData?.fields.headquartersAddress || 'Hà Nội'}</p>
                  <p>• Tài khoản ngân hàng: <strong className="font-mono text-slate-800">{koc.bankAccount}</strong> tại <strong className="text-slate-900">{koc.bankName}</strong></p>
                </div>
              ) : (
                <div className="mt-1 space-y-0.5 text-slate-700">
                  <p>• Họ và tên: <strong className="text-slate-900">{ocrData?.fields.fullName || koc.realName || deal.kocStageName}</strong> (Kênh: <strong className="text-blue-700">{deal.kocStageName}</strong>)</p>
                  <p>• Số CCCD / Định danh: <strong className="font-mono text-slate-900">{ocrData?.fields.idNumber || koc.cccd}</strong> {ocrData?.fields.issueDate && <span className="text-slate-500">(Cấp ngày: {ocrData.fields.issueDate} tại {ocrData.fields.issuePlace})</span>}</p>
                  {ocrData?.fields.permanentAddress && (
                    <p>• Nơi thường trú: {ocrData.fields.permanentAddress}</p>
                  )}
                  <p>• Tài khoản ngân hàng: <strong className="font-mono text-slate-800">{koc.bankAccount}</strong> tại ngân hàng <strong className="text-slate-900">{koc.bankName}</strong></p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <p className="font-semibold text-slate-900">ĐIỀU 1: PHẠM VI DỊCH VỤ &amp; QUYỀN SỞ HỮU</p>
              <p className="text-slate-700 mt-0.5">
                Bên B nhận thực hiện sản xuất và đăng tải 01 Video sáng tạo nội dung cho chiến dịch <strong>{deal.campaignTitle}</strong>:
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-1 space-y-1">
                <li>Video có thời lượng tối thiểu 60 giây, đảm bảo độ phân giải Full HD (1080p).</li>
                <li>Nội dung kịch bản phải được Content Team Upbase duyệt qua hệ thống trước khi quay (SLA 24h).</li>
                <li>Gắn đúng giỏ hàng chính hãng và các hashtag bắt buộc của nhãn hàng.</li>
                <li>Bên A được toàn quyền sử dụng hình ảnh và video của Bên B để chạy quảng cáo (Spark Ads) trong 180 ngày.</li>
                <li>Hạn chót hoàn thành nghiệm thu lên sóng: <strong className="text-blue-700">{deal.deadlinePost}</strong>.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-900">ĐIỀU 2: PHÍ DỊCH VỤ &amp; PHƯƠNG THỨC THANH TOÁN 2 ĐỢT</p>
              <table className="w-full border-collapse border border-slate-300 mt-1.5 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700 font-semibold">
                    <th className="border border-slate-300 p-2">Đợt thanh toán</th>
                    <th className="border border-slate-300 p-2">Số tiền (VNĐ)</th>
                    <th className="border border-slate-300 p-2">Điều kiện giải ngân</th>
                    <th className="border border-slate-300 p-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold text-emerald-700">Đợt 1: Tạm ứng</td>
                    <td className="border border-slate-300 p-2 font-semibold text-emerald-700 font-mono">{deal.advanceAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="border border-slate-300 p-2">Sau khi ký HĐ &amp; duyệt kịch bản sơ bộ (Cho phép gửi mẫu)</td>
                    <td className="border border-slate-300 p-2 font-semibold">
                      {deal.status === 'ADVANCE_PAID' || deal.status === 'VIDEO_SUBMITTED' || deal.status === 'FINAL_PAID'
                        ? 'Đã Giải Ngân' : 'Chờ Duyệt Chi Lark'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold text-blue-700">Đợt 2: Quyết toán</td>
                    <td className="border border-slate-300 p-2 font-semibold text-blue-700 font-mono">{deal.finalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="border border-slate-300 p-2">Sau khi video lên sóng &amp; gửi link nghiệm thu hợp lệ</td>
                    <td className="border border-slate-300 p-2 font-semibold">
                      {deal.status === 'FINAL_PAID' ? 'Đã Tất Toán' : 'Sau Nghiệm Thu Video'}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/70">
                    <td className="border border-slate-300 p-2 font-semibold text-slate-900">TỔNG GIÁ TRỊ</td>
                    <td colSpan={3} className="border border-slate-300 p-2 font-semibold text-blue-900 font-mono text-sm">
                      {deal.totalValue.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick VietQR Code Box */}
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
                <img
                  src={qrUrl}
                  alt="VietQR Chuyển Khoản"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-emerald-800 text-xs flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Mã VietQR &amp; Thông Tin Chi Tiền (Đồng Bộ Lark Approval)
                </span>
                <p className="text-slate-600 text-2xs">
                  Quét bằng App Ngân hàng bất kỳ để tự động điền STK, Số tiền và Nội dung chuyển khoản chuẩn.
                </p>
                <div className="font-mono text-xs text-slate-800 bg-white/80 border border-emerald-200 px-2.5 py-1 rounded-md">
                  Nội dung CK: <strong>{qrTransferDescription}</strong> • Số tiền: <strong className="text-emerald-700">{qrAmount.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Signature row */}
          <div className="flex justify-between pt-6 text-xs border-t border-slate-200 mt-4">
            <div className="text-center">
              <p className="font-semibold text-slate-800">ĐẠI DIỆN BÊN A (UPBASE)</p>
              <p className="text-2xs text-slate-500 italic">(Đã ký số điện tử qua hệ thống)</p>
              <div className="mt-8 font-semibold text-blue-800">{deal.assignedStaff}</div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">ĐẠI DIỆN BÊN B (KOC)</p>
              <p className="text-2xs text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
              <div className="mt-8 font-semibold text-slate-800">{koc.realName || deal.kocStageName}</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions - Enterprise Light */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Trạng thái hiện tại: <strong className="text-slate-900">{deal.statusLabel}</strong>
          </span>

          <div className="flex items-center gap-2">
            {onApproveAdvance && deal.status !== 'ADVANCE_PAID' && deal.status !== 'FINAL_PAID' && deal.status !== 'VIDEO_SUBMITTED' && (
              <button
                onClick={() => {
                  onApproveAdvance(deal.id);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Duyệt Chi Cọc {deal.advanceAmount.toLocaleString('vi-VN')} đ</span>
              </button>
            )}

            {onApproveFinal && (deal.status === 'VIDEO_SUBMITTED' || deal.status === 'ADVANCE_PAID') && (
              <button
                onClick={() => {
                  onApproveFinal(deal.id);
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Duyệt Chi Tất Toán {deal.finalAmount.toLocaleString('vi-VN')} đ</span>
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

      {/* Embedded Legal OCR Scanner Modal */}
      <LegalOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onApplyToContract={(res) => {
          setOcrData(res);
          setIsOcrOpen(false);
        }}
      />
    </div>
  );
};
