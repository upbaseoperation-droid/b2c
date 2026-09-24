'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, QrCode, Download, DollarSign, CheckCircle } from 'lucide-react';
import { BookingDealItem, KocItem } from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';
import { jsPDF } from 'jspdf';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: BookingDealItem | null;
  onApproveAdvance?: (dealId: string) => void;
  onApproveFinal?: (dealId: string) => void;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  deal,
  onApproveAdvance,
  onApproveFinal,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !deal) return null;

  const koc = INITIAL_KOCS.find(k => k.id === deal.kocId) || {
    realName: deal.kocStageName,
    cccd: '001201004567',
    bankName: 'Techcombank',
    bankAccount: '1903456789012',
    phone: '0987654321',
  };

  // Generate VietQR Link
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
  const bankCode = koc.bankName.toUpperCase().includes('TECH') ? 'TCB' :
                   koc.bankName.toUpperCase().includes('MB') ? 'MB' :
                   koc.bankName.toUpperCase().includes('VIETCOM') ? 'VCB' : 'ACB';
  const qrAmount = deal.status === 'ADVANCE_PAID' ? deal.finalAmount : deal.advanceAmount;
  const qrTransferDescription = `UPBASE ${deal.dealCode}`.substring(0, 25);
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${koc.bankAccount}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrTransferDescription)}&accountName=${encodeURIComponent(koc.realName || deal.kocStageName)}`;

  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Title
      doc.setFontSize(14);
      doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Doc lap - Tu do - Hanh phuc', 105, 26, { align: 'center' });
      doc.line(75, 28, 135, 28);

      doc.setFontSize(16);
      doc.text('HOP DONG DICH VU QUANG BA NOI DUNG (KOC MARKETING)', 105, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`So: ${deal.dealCode} / 2026 / HDDV-UPBASE - Ngay: 22/09/2026`, 105, 47, { align: 'center' });

      // Party A
      doc.setFontSize(11);
      doc.text('BEN A (BEN THUE DICH VU): CONG TY CO PHAN UPBASE ASIA', 20, 60);
      doc.setFontSize(9);
      doc.text('Dia chi: Tang 5, Toa nha Upbase, Cau Giay, Ha Noi', 25, 66);
      doc.text(`Dai dien phu trach: ${deal.assignedStaff} (Phong Marketing B2C)`, 25, 72);

      // Party B
      doc.setFontSize(11);
      doc.text('BEN B (BEN CUNG CAP DICH VU - KOC):', 20, 84);
      doc.setFontSize(9);
      doc.text(`Ho va ten: ${koc.realName || deal.kocStageName} (Kenh: ${deal.kocStageName})`, 25, 90);
      doc.text(`So CCCD / Ho chieu: ${koc.cccd}`, 25, 96);
      doc.text(`Tai khoan Ngan hang: ${koc.bankAccount} tai ${koc.bankName}`, 25, 102);

      // Section 1: Scope
      doc.setFontSize(11);
      doc.text('DIEU 1: PHAM VI DICH VU & NGHIEM THU VIDEO', 20, 114);
      doc.setFontSize(9);
      doc.text(`- Chien dich ap dung: ${deal.campaignTitle}`, 25, 120);
      doc.text('- Thoi luong video: Toi thieu 60 giay tren nen tang TikTok / Shopee.', 25, 126);
      doc.text('- Kich ban phai duoc Content Team Upbase phe duyet truoc khi quay (SLA 24h).', 25, 132);
      doc.text(`- Han chot dang tai nghiem thu: ${deal.deadlinePost}`, 25, 138);

      // Section 2: Payout
      doc.setFontSize(11);
      doc.text('DIEU 2: PHI DICH VU & PHUONG THUC THANH TOAN', 20, 150);
      doc.setFontSize(9);
      doc.text(`- Tong gia tri hop dong: ${deal.totalValue.toLocaleString('vi-VN')} VND`, 25, 156);
      doc.text(`- Dot 1 (Tam ung khi ky HD): ${deal.advanceAmount.toLocaleString('vi-VN')} VND`, 25, 162);
      doc.text(`- Dot 2 (Quyet toan sau khi video len song): ${deal.finalAmount.toLocaleString('vi-VN')} VND`, 25, 168);

      // Signatures
      doc.setFontSize(10);
      doc.text('DAI DIEN BEN A (UPBASE)', 40, 200, { align: 'center' });
      doc.setFontSize(8);
      doc.text('(Da ky dien tu qua he thong Ops Hub)', 40, 205, { align: 'center' });
      doc.text(deal.assignedStaff, 40, 230, { align: 'center' });

      doc.setFontSize(10);
      doc.text('DAI DIEN BEN B (KOC)', 160, 200, { align: 'center' });
      doc.setFontSize(8);
      doc.text('(Ky, ghi ro ho ten)', 160, 205, { align: 'center' });
      doc.text(koc.realName || deal.kocStageName, 160, 230, { align: 'center' });

      doc.save(`HopDong_${deal.dealCode}.pdf`);
    } catch (err) {
      console.error('Lỗi khi xuất PDF, sử dụng chức năng in:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">Văn Bản Hợp Đồng KOC Điện Tử & Cổng Chi Tiền</h3>
              <p className="text-xs text-slate-400">Mã văn bản: {deal.dealCode} — Tự động sinh bởi Upbase Ops Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-md flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải File PDF'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-md border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bản Cứng
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Contract View */}
        <div className="p-8 bg-white text-slate-900 font-sans leading-relaxed text-sm space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="text-center pb-4 border-b border-slate-300">
            <h4 className="font-bold text-base tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
            <p className="text-xs italic">Độc lập - Tự do - Hạnh phúc</p>
            <div className="mt-4 font-bold text-lg text-blue-900 font-sans tracking-wide">
              HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ NỘI DUNG (KOC MARKETING)
            </div>
            <div className="text-xs text-slate-500 font-sans">
              Số: {deal.dealCode} / 2026 / HĐDV-UPBASE | Ngày: 22/09/2026
            </div>
          </div>

          <div className="font-sans text-xs space-y-2 pt-2">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">BÊN A (BÊN THUÊ DỊCH VỤ): CÔNG TY CỔ PHẦN UPBASE ASIA</p>
              <p>• Địa chỉ: Tầng 5, Tòa nhà Upbase, Cầu Giấy, Hà Nội</p>
              <p>• Đại diện phụ trách: <strong>{deal.assignedStaff}</strong> (Phòng Marketing B2C)</p>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">BÊN B (BÊN CUNG CẤP DỊCH VỤ - KOC):</p>
              <p>• Họ và tên: <strong>{koc.realName || deal.kocStageName}</strong> (Kênh truyền thông: <strong>{deal.kocStageName}</strong>)</p>
              <p>• Số CCCD/Hộ chiếu: <strong>{koc.cccd}</strong></p>
              <p>• Tài khoản nhận thanh toán: <strong>{koc.bankAccount}</strong> tại ngân hàng <strong>{koc.bankName}</strong></p>
            </div>
          </div>

          <div className="font-sans text-xs space-y-3 pt-2">
            <div>
              <p className="font-bold text-slate-900 uppercase">ĐIỀU 1: PHẠM VI DỊCH VỤ & QUYỀN SỞ HỮU</p>
              <p className="text-slate-700">
                Bên B nhận thực hiện sản xuất và đăng tải 01 Video sáng tạo nội dung cho chiến dịch <strong>{deal.campaignTitle}</strong>:
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-1 space-y-1">
                <li>Video có thời lượng tối thiểu 60 giây, đảm bảo độ phân giải Full HD (1080p), ánh sáng và âm thanh đạt chuẩn.</li>
                <li>Nội dung kịch bản phải được Content Team Upbase duyệt qua hệ thống trước khi quay (SLA 24h).</li>
                <li>Gắn đúng giỏ hàng chính hãng và các hashtag bắt buộc của nhãn hàng.</li>
                <li>Bên A được toàn quyền sử dụng hình ảnh và video của Bên B để chạy quảng cáo (Spark Ads) trong 180 ngày.</li>
                <li>Hạn chót hoàn thành nghiệm thu lên sóng: <strong>{deal.deadlinePost}</strong>.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-900 uppercase">ĐIỀU 2: PHÍ DỊCH VỤ & PHƯƠNG THỨC THANH TOÁN 2 ĐỢT</p>
              <table className="w-full border-collapse border border-slate-300 mt-1 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 p-2">Đợt thanh toán</th>
                    <th className="border border-slate-300 p-2">Số tiền (VNĐ)</th>
                    <th className="border border-slate-300 p-2">Điều kiện giải ngân</th>
                    <th className="border border-slate-300 p-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-700">Đợt 1: Tạm ứng</td>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-700">{deal.advanceAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="border border-slate-300 p-2">Sau khi ký HĐ & duyệt kịch bản sơ bộ (Cho phép gửi mẫu)</td>
                    <td className="border border-slate-300 p-2 font-semibold">
                      {deal.status === 'ADVANCE_PAID' || deal.status === 'VIDEO_SUBMITTED' || deal.status === 'FINAL_PAID'
                        ? '✅ Đã Giải Ngân' : '⏳ Chờ Duyệt Chi Lark (Lark Approval)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold text-blue-700">Đợt 2: Quyết toán</td>
                    <td className="border border-slate-300 p-2 font-bold text-blue-700">{deal.finalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="border border-slate-300 p-2">Sau khi video lên sóng & gửi link nghiệm thu hợp lệ</td>
                    <td className="border border-slate-300 p-2 font-semibold">
                      {deal.status === 'FINAL_PAID' ? '✅ Đã Tất Toán' : '⏳ Sau Nghiệm Thu Video'}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-slate-300 p-2 font-bold text-slate-900">TỔNG GIÁ TRỊ</td>
                    <td colSpan={3} className="border border-slate-300 p-2 font-bold text-blue-900 text-sm">
                      {deal.totalValue.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick VietQR Code Box */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center">
                {/* Embedded dynamic VietQR Image */}
                <img
                  src={qrUrl}
                  alt="VietQR Chuyển Khoản"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to QR icon if offline
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Mã VietQR & Thông Tin Chi Tiền (Đồng Bộ Lark Approval)
                </span>
                <p className="text-slate-600">
                  Quét bằng App Ngân hàng bất kỳ để tự động điền STK, Số tiền và Nội dung chuyển khoản chuẩn.
                </p>
                <div className="font-mono text-[11px] text-slate-800 bg-white/70 px-2 py-1 rounded">
                  Nội dung CK: <strong>{qrTransferDescription}</strong> • Số tiền: <strong>{qrAmount.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Signature row */}
          <div className="flex justify-between pt-6 font-sans text-xs border-t border-slate-200 mt-4">
            <div className="text-center">
              <p className="font-bold text-slate-800">ĐẠI DIỆN BÊN A (UPBASE)</p>
              <p className="text-[11px] text-slate-500 italic">(Đã ký số điện tử qua hệ thống)</p>
              <div className="mt-8 font-semibold text-blue-800">{deal.assignedStaff}</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800">ĐẠI DIỆN BÊN B (KOC)</p>
              <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
              <div className="mt-8 font-semibold text-slate-800">{koc.realName || deal.kocStageName}</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 bg-[#0c121e] border-t border-[#1e293b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Trạng thái hiện tại: <strong className="text-white">{deal.statusLabel}</strong>
          </span>

          <div className="flex items-center gap-2">
            {onApproveAdvance && deal.status !== 'ADVANCE_PAID' && deal.status !== 'FINAL_PAID' && deal.status !== 'VIDEO_SUBMITTED' && (
              <button
                onClick={() => {
                  onApproveAdvance(deal.id);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đồng Bộ Duyệt Chi Lark Cọc {deal.advanceAmount.toLocaleString('vi-VN')} đ
              </button>
            )}

            {onApproveFinal && (deal.status === 'VIDEO_SUBMITTED' || deal.status === 'ADVANCE_PAID') && (
              <button
                onClick={() => {
                  onApproveFinal(deal.id);
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                Đồng Bộ Duyệt Chi Lark Tất Toán {deal.finalAmount.toLocaleString('vi-VN')} đ (Đợt 2)
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
