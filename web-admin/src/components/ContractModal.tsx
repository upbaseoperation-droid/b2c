'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  CheckCircle, 
  Check,
  FileText, 
  ShieldCheck, 
  QrCode,
  Sparkles,
  Building2,
  FileCheck,
  Edit3,
  Columns,
  RotateCcw,
  Save,
  UserCheck,
  CreditCard,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  BookingDealItem, 
  OcrLegalExtractionResult, 
  ContractTemplateType, 
  ManualContractFormData 
} from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';
import { LegalOcrModal } from './LegalOcrModal';
import { ConfirmDialog } from './ui';

interface ContractModalProps {
  deal: BookingDealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApproveAdvance?: (dealId: string) => void;
  onApproveFinal?: (dealId: string) => void;
  initialOcrResult?: OcrLegalExtractionResult | null;
  onSaveDeal?: (updatedDeal: BookingDealItem) => void;
  initialViewMode?: 'SPLIT' | 'FORM' | 'PREVIEW';
}

const POPULAR_BANKS = [
  'Techcombank',
  'Vietcombank',
  'MB Bank',
  'VPBank',
  'ACB',
  'BIDV',
  'VietinBank',
  'TPBank',
  'Sacombank',
  'VIB',
  'HDBank',
  'Agribank'
];

const BANK_BINS: Record<string, string> = {
  'Techcombank': '970407',
  'Vietcombank': '970436',
  'MB Bank': '970422',
  'VPBank': '970432',
  'ACB': '970416',
  'BIDV': '970418',
  'VietinBank': '970415',
  'TPBank': '970423',
  'Sacombank': '970403',
  'VIB': '970441',
  'Agribank': '970405',
};

// Helper to remove accents for standard PDF Helvetica font
function stripVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export const ContractModal: React.FC<ContractModalProps> = ({
  deal,
  isOpen,
  onClose,
  onApproveAdvance,
  onApproveFinal,
  initialOcrResult = null,
  onSaveDeal,
  initialViewMode = 'SPLIT'
}) => {
  const [viewMode, setViewMode] = useState<'SPLIT' | 'FORM' | 'PREVIEW'>(initialViewMode);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [ocrData, setOcrData] = useState<OcrLegalExtractionResult | null>(initialOcrResult);
  const [confirmAction, setConfirmAction] = useState<'ADVANCE' | 'FINAL' | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form state
  const buildInitialFormData = (
    currentDeal: BookingDealItem | null, 
    ocr: OcrLegalExtractionResult | null
  ): ManualContractFormData => {
    const koc = INITIAL_KOCS.find(k => k.id === currentDeal?.kocId) || {
      realName: currentDeal?.kocStageName || 'Nguyễn Thu Trang',
      cccd: currentDeal?.kocIdCardNumber || '001201019876',
      bankAccount: currentDeal?.kocBankAccount || '19036789123456',
      bankName: currentDeal?.kocBankName || 'Techcombank'
    };

    const isCompany = ocr?.documentType === 'BUSINESS_LICENSE' || ocr?.documentType === 'BUSINESS_HOUSEHOLD';
    const totalVal = currentDeal?.totalValue || 5000000;
    const advVal = currentDeal?.advanceAmount || Math.round(totalVal * 0.2);
    const finVal = currentDeal?.finalAmount || (totalVal - advVal);

    return {
      templateType: isCompany ? 'BUSINESS_ENTERPRISE' : 'KOC_INDIVIDUAL',
      contractCode: currentDeal?.dealCode || `BO26_${Date.now().toString().slice(-4)}`,
      signDate: currentDeal?.contractCreatedAt || '22/09/2026',
      effectiveDate: currentDeal?.deadlinePost || '2026-10-15',

      // Bên A
      partyAName: 'CÔNG TY CỔ PHẦN UPBASE ASIA',
      partyARepresentative: currentDeal?.assignedStaff || 'Phạm Thị Thùy Dung',
      partyAPosition: 'Trưởng nhóm Booking MKT (B2C Operations)',
      partyAAddress: 'Tầng 5, Tòa nhà Upbase, Cầu Giấy, Hà Nội',
      partyAPhone: '024.7300.6868',
      partyATaxCode: '0108998822',

      // Bên B
      partyBType: isCompany ? 'BUSINESS' : 'INDIVIDUAL',
      partyBName: isCompany 
        ? (ocr?.fields.companyName || currentDeal?.kocStageName || 'CÔNG TY TNHH CREATOR VIỆT')
        : (ocr?.fields.fullName || currentDeal?.kocStageName || koc.realName),
      partyBStageName: currentDeal?.kocStageName || '@koc_creator',
      partyBIdNumber: isCompany 
        ? (ocr?.fields.taxCode || '0109876543')
        : (ocr?.fields.idNumber || currentDeal?.kocIdCardNumber || koc.cccd || '001201019876'),
      partyBIssueDate: ocr?.fields.issueDate || '25/08/2021',
      partyBIssuePlace: ocr?.fields.issuePlace || 'Cục Cảnh sát QLHC về TTXH',
      partyBAddress: isCompany 
        ? (ocr?.fields.headquartersAddress || 'Tầng 6, Số 8 Tôn Thất Thuyết, Mỹ Đình 2, Nam Từ Liêm, Hà Nội')
        : (ocr?.fields.permanentAddress || 'Phòng 1204, Imperia Garden, 203 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội'),
      partyBPhone: (koc as { phone?: string })?.phone || '0988.123.456',
      partyBEmail: (koc as { email?: string })?.email || 'koc.booking@gmail.com',
      partyBRepresentative: ocr?.fields.legalRepresentative || '',
      partyBRepTitle: ocr?.fields.legalRepTitle || 'Giám đốc',

      // Ngân hàng Bên B
      bankAccount: currentDeal?.kocBankAccount || koc.bankAccount || '19036789123456',
      bankName: currentDeal?.kocBankName || koc.bankName || 'Techcombank',
      bankAccountName: currentDeal?.kocBankHolder || koc.realName || currentDeal?.kocStageName || 'NGUYEN THU TRANG',

      // Điều 1: Phạm vi công việc
      campaignTitle: currentDeal?.campaignTitle || 'Chiến Dịch Tháng 10/2026',
      brandName: currentDeal?.brandName || 'Kutieskin',
      productName: currentDeal?.productName || 'Kem bôi dịu da Kutieskin 30g',
      deliverablesText: '01 Video sáng tạo nội dung thời lượng ≥ 60s, chuẩn Full HD 1080p, gắn giỏ hàng chính hãng',
      videoCount: 1,
      sparkAdsDays: 180,
      deadlinePost: currentDeal?.deadlinePost || '2026-10-15',
      scriptSlaHours: 24,
      customClauses: 'Video duy trì hiển thị công khai tối thiểu 180 ngày. Cấp mã Spark Ads ngay khi video lên sóng hợp lệ.',

      // Điều 2: Tài chính
      totalValue: totalVal,
      advanceRatePercent: Math.round((advVal / (totalVal || 1)) * 100) || 20,
      advanceAmount: advVal,
      advanceCondition: 'Sau khi ký HĐ & duyệt kịch bản sơ bộ (Cho phép gửi mẫu thử)',
      finalAmount: finVal,
      finalCondition: 'Sau khi video lên sóng & gửi mã Spark Ads nghiệm thu hợp lệ',
      taxPolicyNote: isCompany 
        ? 'Đơn giá đã bao gồm thuế GTGT (VAT). Bên B có nghĩa vụ xuất hóa đơn điện tử hợp lệ trước khi tất toán.'
        : 'Đã bao gồm thuế TNCN 10% khấu trừ tại nguồn theo quy định của pháp luật hiện hành.'
    };
  };

  const [formData, setFormData] = useState<ManualContractFormData>(() => buildInitialFormData(deal, initialOcrResult));

  // Reset or update formData when deal changes
  useEffect(() => {
    if (deal) {
      setFormData(buildInitialFormData(deal, ocrData));
    }
  }, [deal]);

  // Sync initialOcrResult when changed
  useEffect(() => {
    if (initialOcrResult) {
      setOcrData(initialOcrResult);
      applyOcrToForm(initialOcrResult);
    }
  }, [initialOcrResult]);

  // ESC key to close modal
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

  // Apply OCR data into manual form
  const applyOcrToForm = (ocr: OcrLegalExtractionResult) => {
    const isCompany = ocr.documentType === 'BUSINESS_LICENSE' || ocr.documentType === 'BUSINESS_HOUSEHOLD';
    setFormData(prev => ({
      ...prev,
      templateType: isCompany ? 'BUSINESS_ENTERPRISE' : 'KOC_INDIVIDUAL',
      partyBType: isCompany ? 'BUSINESS' : 'INDIVIDUAL',
      partyBName: isCompany 
        ? (ocr.fields.companyName || prev.partyBName)
        : (ocr.fields.fullName || prev.partyBName),
      partyBIdNumber: isCompany 
        ? (ocr.fields.taxCode || prev.partyBIdNumber)
        : (ocr.fields.idNumber || prev.partyBIdNumber),
      partyBIssueDate: ocr.fields.issueDate || prev.partyBIssueDate,
      partyBIssuePlace: ocr.fields.issuePlace || prev.partyBIssuePlace,
      partyBAddress: isCompany 
        ? (ocr.fields.headquartersAddress || prev.partyBAddress)
        : (ocr.fields.permanentAddress || prev.partyBAddress),
      partyBRepresentative: ocr.fields.legalRepresentative || prev.partyBRepresentative,
      partyBRepTitle: ocr.fields.legalRepTitle || prev.partyBRepTitle,
      taxPolicyNote: isCompany 
        ? 'Đơn giá đã bao gồm thuế GTGT (VAT). Bên B có nghĩa vụ xuất hóa đơn điện tử hợp lệ trước khi tất toán.'
        : 'Đã bao gồm thuế TNCN 10% khấu trừ tại nguồn theo quy định của pháp luật hiện hành.'
    }));
  };

  // Change Template logic
  const handleSelectTemplate = (templateType: ContractTemplateType) => {
    let partyBType = formData.partyBType;
    let taxPolicyNote = formData.taxPolicyNote;
    let deliverablesText = formData.deliverablesText;

    if (templateType === 'KOC_INDIVIDUAL') {
      partyBType = 'INDIVIDUAL';
      taxPolicyNote = 'Đã bao gồm thuế TNCN 10% khấu trừ tại nguồn theo quy định của pháp luật hiện hành.';
      deliverablesText = '01 Video sáng tạo nội dung thời lượng ≥ 60s, chuẩn Full HD 1080p, gắn giỏ hàng chính hãng';
    } else if (templateType === 'BUSINESS_ENTERPRISE') {
      partyBType = 'BUSINESS';
      taxPolicyNote = 'Đơn giá đã bao gồm thuế GTGT (VAT). Bên B có nghĩa vụ xuất hóa đơn điện tử hợp lệ trước khi tất toán.';
      deliverablesText = 'Gói dịch vụ sản xuất và phân phối nội dung video quảng bá nhãn hàng đa kênh';
    } else if (templateType === 'AFFILIATE_LIVESTREAM') {
      taxPolicyNote = 'Bao gồm thù lao cố định (booking fee) và hoa hồng tiếp thị liên kết (Affiliate Commission) theo GMV thực tế đạt được.';
      deliverablesText = '01 Phiên Livestream bán hàng thương mại tối thiểu 120 phút + 01 Video Teaser thông báo lịch Live';
    } else if (templateType === 'ANNEX_SETTLEMENT') {
      taxPolicyNote = 'Quyết toán và thanh lý toàn bộ nghĩa vụ tài chính sau khi nghiệm thu chỉ số lượt xem và mã Spark Ads.';
      deliverablesText = 'Biên bản nghiệm thu hoàn thành các hạng mục theo hợp đồng và đối soát mã Spark Ads hợp lệ';
    }

    setFormData(prev => ({
      ...prev,
      templateType,
      partyBType,
      taxPolicyNote,
      deliverablesText
    }));
  };

  // Recalculate financial breakdown
  const handleTotalValueChange = (newTotal: number) => {
    const advance = Math.round(newTotal * (formData.advanceRatePercent / 100));
    setFormData(prev => ({
      ...prev,
      totalValue: newTotal,
      advanceAmount: advance,
      finalAmount: newTotal - advance
    }));
  };

  const handleAdvanceRateChange = (percent: number) => {
    const advance = Math.round(formData.totalValue * (percent / 100));
    setFormData(prev => ({
      ...prev,
      advanceRatePercent: percent,
      advanceAmount: advance,
      finalAmount: formData.totalValue - advance
    }));
  };

  const handleAdvanceAmountChange = (newAdvance: number) => {
    setFormData(prev => ({
      ...prev,
      advanceAmount: newAdvance,
      advanceRatePercent: prev.totalValue > 0 ? Math.round((newAdvance / prev.totalValue) * 100) : 0,
      finalAmount: Math.max(0, prev.totalValue - newAdvance)
    }));
  };

  // Save changes back to deal state
  const handleSaveToDeal = () => {
    if (!deal) return;
    const updatedDeal: BookingDealItem = {
      ...deal,
      dealCode: formData.contractCode,
      totalValue: formData.totalValue,
      advanceAmount: formData.advanceAmount,
      finalAmount: formData.finalAmount,
      assignedStaff: formData.partyARepresentative,
      deadlinePost: formData.deadlinePost,
      brandName: formData.brandName,
      productName: formData.productName,
      campaignTitle: formData.campaignTitle,
      kocStageName: formData.partyBStageName,
      kocIdCardNumber: formData.partyBIdNumber,
      kocBankAccount: formData.bankAccount,
      kocBankName: formData.bankName,
      kocBankHolder: formData.bankAccountName,
      hasIdCardScan: Boolean(formData.partyBIdNumber),
      contractCreatedAt: formData.signDate
    };
    onSaveDeal?.(updatedDeal);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset to original deal
  const handleResetToDeal = () => {
    setFormData(buildInitialFormData(deal, null));
    setOcrData(null);
  };

  // Generate VietQR dynamic payment URL
  const selectedBankBin = BANK_BINS[formData.bankName] || '970407';
  const isAdvancePending = deal.status !== 'ADVANCE_PAID' && deal.status !== 'FINAL_PAID';
  const qrAmount = isAdvancePending ? formData.advanceAmount : formData.finalAmount;
  const qrTransferDescription = `${formData.contractCode} ${isAdvancePending ? 'COC' : 'TAT TOAN'}`.slice(0, 50);
  const qrUrl = `https://img.vietqr.io/image/${selectedBankBin}-${formData.bankAccount}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrTransferDescription)}&accountName=${encodeURIComponent(formData.bankAccountName)}`;

  // PDF Export
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const safeText = (text: string) => stripVietnameseAccents(text);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Doc lap - Tu do - Hanh phuc', 105, 23, { align: 'center' });

      doc.setLineWidth(0.4);
      doc.line(75, 26, 135, 26);

      // Title based on template
      let docTitle = 'HOP DONG DICH VU QUANG BA NOI DUNG KOC';
      if (formData.templateType === 'BUSINESS_ENTERPRISE') docTitle = 'HOP DONG DICH VU TRUYEN THONG VA QUANG CAO (PHAP NHAN)';
      if (formData.templateType === 'AFFILIATE_LIVESTREAM') docTitle = 'HOP DONG TIEP THI LIEN KET VA LIVESTREAM BAN HANG';
      if (formData.templateType === 'ANNEX_SETTLEMENT') docTitle = 'PHU LUC HOP DONG VA BIEN BAN NGHIEM THU QUYET TOAN';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(safeText(docTitle), 105, 36, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`So: ${formData.contractCode} / 2026 / HDDV-UPBASE | Ngay lap: ${formData.signDate}`, 105, 42, { align: 'center' });

      // Party A
      doc.setFont('helvetica', 'bold');
      doc.text(`BEN A (BEN THUE): ${safeText(formData.partyAName)}`, 20, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Dai dien phu trach: ${safeText(formData.partyARepresentative)} (${safeText(formData.partyAPosition)})`, 25, 58);
      doc.text(`- Dia chi: ${safeText(formData.partyAAddress)}`, 25, 64);
      doc.text(`- Ma so thue: ${formData.partyATaxCode} | Hotline: ${formData.partyAPhone}`, 25, 70);

      // Party B
      const partyBHeader = formData.partyBType === 'BUSINESS'
        ? 'BEN B (BEN CUNG CAP DICH VU - PHAP NHAN DOANH NGHIEP / HKD):'
        : 'BEN B (BEN CUNG CAP DICH VU - CA NHAN KOC):';
      doc.setFont('helvetica', 'bold');
      doc.text(safeText(partyBHeader), 20, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Ten don vi / Ho ten: ${safeText(formData.partyBName)} (Kenh: ${safeText(formData.partyBStageName)})`, 25, 86);
      doc.text(`- ${formData.partyBType === 'BUSINESS' ? 'Ma so thue / DKKD' : 'So CCCD / Dinh danh'}: ${formData.partyBIdNumber} (Cap ngay: ${formData.partyBIssueDate} tai ${safeText(formData.partyBIssuePlace)})`, 25, 92);
      if (formData.partyBType === 'BUSINESS' && formData.partyBRepresentative) {
        doc.text(`- Nguoi dai dien: ${safeText(formData.partyBRepresentative)} (${safeText(formData.partyBRepTitle || 'Dai dien')})`, 25, 98);
        doc.text(`- Dia chi tru so: ${safeText(formData.partyBAddress).slice(0, 75)}`, 25, 104);
        doc.text(`- Tai khoan ngan hang: ${formData.bankAccount} tai ${formData.bankName} (Chu TK: ${safeText(formData.bankAccountName)})`, 25, 110);
      } else {
        doc.text(`- Dia chi thuong tru: ${safeText(formData.partyBAddress).slice(0, 75)}`, 25, 98);
        doc.text(`- Tai khoan ngan hang: ${formData.bankAccount} tai ${formData.bankName} (Chu TK: ${safeText(formData.bankAccountName)})`, 25, 104);
      }

      // Clause 1
      const yClause1 = formData.partyBType === 'BUSINESS' && formData.partyBRepresentative ? 122 : 116;
      doc.setFont('helvetica', 'bold');
      doc.text('DIEU 1: PHAM VI CONG VIEC VA YEU CAU SAN PHAM', 20, yClause1);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Chien dich: ${safeText(formData.campaignTitle)} | Nhan hang: ${safeText(formData.brandName)}`, 25, yClause1 + 6);
      doc.text(`- San pham: ${safeText(formData.productName)}`, 25, yClause1 + 12);
      doc.text(`- Hang muc ban giao: ${safeText(formData.deliverablesText).slice(0, 80)}`, 25, yClause1 + 18);
      doc.text(`- Quyen su dung Spark Ads: ${formData.sparkAdsDays} ngay | Han chot len song: ${formData.deadlinePost}`, 25, yClause1 + 24);

      // Clause 2
      const yClause2 = yClause1 + 36;
      doc.setFont('helvetica', 'bold');
      doc.text('DIEU 2: GIA TRI HOP DONG VA TIEN DO THANH TOAN', 20, yClause2);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Tong gia tri hop dong: ${formData.totalValue.toLocaleString('vi-VN')} VND`, 25, yClause2 + 6);
      doc.text(`  + Dot 1 (Tam ung ${formData.advanceRatePercent}%): ${formData.advanceAmount.toLocaleString('vi-VN')} VND - ${safeText(formData.advanceCondition)}`, 25, yClause2 + 12);
      doc.text(`  + Dot 2 (Tat toan): ${formData.finalAmount.toLocaleString('vi-VN')} VND - ${safeText(formData.finalCondition)}`, 25, yClause2 + 18);
      doc.text(`- Chinh sach thue: ${safeText(formData.taxPolicyNote)}`, 25, yClause2 + 24);

      // Signatures
      const ySign = yClause2 + 45;
      doc.setFont('helvetica', 'bold');
      doc.text('DAI DIEN BEN A', 50, ySign, { align: 'center' });
      doc.text('DAI DIEN BEN B', 155, ySign, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('(Ky so dien tu qua he thong Upbase)', 50, ySign + 5, { align: 'center' });
      doc.text('(Ky, ghi ro ho ten)', 155, ySign + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(safeText(formData.partyARepresentative), 50, ySign + 25, { align: 'center' });
      doc.text(safeText(formData.partyBName), 155, ySign + 25, { align: 'center' });

      doc.save(`HopDong_${formData.contractCode}.pdf`);
    } catch (err) {
      console.error('Lỗi xuất PDF, chuyển sang in bản cứng:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const templateTitleMap: Record<ContractTemplateType, string> = {
    KOC_INDIVIDUAL: 'HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ NỘI DUNG (KOC MARKETING - CÁ NHÂN)',
    BUSINESS_ENTERPRISE: 'HỢP ĐỒNG DỊCH VỤ TRUYỀN THÔNG & QUẢNG CÁO (PHÁP NHÂN DOANH NGHIỆP / HKD)',
    AFFILIATE_LIVESTREAM: 'HỢP ĐỒNG TIẾP THỊ LIÊN KẾT & LIVESTREAM BÁN HÀNG THƯƠNG MẠI',
    ANNEX_SETTLEMENT: 'PHỤ LỤC HỢP ĐỒNG & BIÊN BẢN NGHIỆM THU THANH LÝ QUYẾT TOÁN'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-modal-title"
    >
      <div className={`bg-white border border-slate-200 rounded-2xl w-full ${
        viewMode === 'SPLIT' ? 'max-w-7xl' : viewMode === 'FORM' ? 'max-w-4xl' : 'max-w-3xl'
      } shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] transition-all duration-200`}>
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="contract-modal-title" className="text-sm font-semibold text-slate-900">
                  Soạn Thảo &amp; Phê Duyệt Hợp Đồng KOC
                </h3>
                {ocrData && (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Khớp OCR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Mã HĐ: <strong className="font-mono text-blue-700">{formData.contractCode}</strong> • Phụ trách: <span className="font-medium text-slate-700">{formData.partyARepresentative}</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'SPLIT'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Vừa điền thông tin vừa xem hợp đồng thay đổi theo thời gian thực"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chia Đôi (Điền &amp; Xem)</span>
              <span className="sm:hidden">Chia Đôi</span>
            </button>
            <button
              onClick={() => setViewMode('FORM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'FORM'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Giao diện điền thông tin thủ công toàn màn hình"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Điền Thủ Công</span>
            </button>
            <button
              onClick={() => setViewMode('PREVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'PREVIEW'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Xem bản in hợp đồng hoàn chỉnh"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xem Bản In HĐ</span>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOcrOpen(true)}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Quét ảnh CCCD hoặc Giấy phép kinh doanh để tự động điền vào form"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">{ocrData ? 'Quét Lại OCR' : 'Bóc Tách OCR'}</span>
            </button>

            <button
              onClick={handleSaveToDeal}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Lưu thông tin đã chỉnh sửa vào deal hiện tại"
            >
              {saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Đã Lưu!' : 'Lưu Thay Đổi'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
              title="Tải văn bản hợp đồng dưới dạng tệp PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExportingPdf ? 'Đang xuất...' : 'Tải PDF'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition"
              title="In bản cứng"
            >
              <Printer className="w-4 h-4" />
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

        {/* Template Selector Banner */}
        <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> Chọn Mẫu Hợp Đồng:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'KOC_INDIVIDUAL', label: '1. Cá Nhân KOC (Thuế 10%)', sub: 'CCCD + Khấu trừ 10%' },
              { id: 'BUSINESS_ENTERPRISE', label: '2. Doanh Nghiệp / HKD (VAT)', sub: 'Xuất VAT + MST' },
              { id: 'AFFILIATE_LIVESTREAM', label: '3. Tiếp Thị & Live (GMV)', sub: 'Thù lao + Hoa hồng' },
              { id: 'ANNEX_SETTLEMENT', label: '4. Phụ Lục & Quyết Toán', sub: 'Nghiệm thu + Thanh lý' }
            ].map((tmpl) => {
              const isSelected = formData.templateType === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id as ContractTemplateType)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-blue-100/70 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{tmpl.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleResetToDeal}
              className="px-2 py-1 text-2xs text-slate-500 hover:text-slate-800 hover:bg-white rounded border border-transparent hover:border-slate-200 flex items-center gap-1 transition"
              title="Đặt lại thông tin theo deal gốc"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Modal Main Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* LEFT: Manual Filling Form */}
          {(viewMode === 'SPLIT' || viewMode === 'FORM') && (
            <div className={`${
              viewMode === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
            } p-5 overflow-y-auto space-y-4 max-h-[72vh] bg-slate-50/50`}>
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-semibold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-blue-600" /> Biểu Mẫu Điền Thông Tin Thủ Công
                </span>
                <span className="text-2xs text-slate-500 italic">
                  Dữ liệu nhập tại đây sẽ tự động gắn trực tiếp vào mẫu hợp đồng
                </span>
              </div>

              {/* SECTION 1: Bên A (Upbase) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Bên A (Bên Thuê Dịch Vụ)
                  </h4>
                  <span className="text-2xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">Upbase Asia</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Đại diện ký hợp đồng:</label>
                    <input
                      type="text"
                      value={formData.partyARepresentative}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyARepresentative: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-medium"
                      placeholder="Họ tên nhân sự phụ trách"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Chức vụ / Bộ phận:</label>
                    <input
                      type="text"
                      value={formData.partyAPosition}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyAPosition: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                      placeholder="Chức vụ"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-600 font-medium block mb-1">Địa chỉ trụ sở Bên A:</label>
                    <input
                      type="text"
                      value={formData.partyAAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyAAddress: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Bên B (KOC / Doanh Nghiệp) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Bên B (Bên Cung Cấp Dịch Vụ)
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, partyBType: 'INDIVIDUAL' }))}
                      className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                        formData.partyBType === 'INDIVIDUAL'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Cá nhân KOC
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, partyBType: 'BUSINESS' }))}
                      className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                        formData.partyBType === 'BUSINESS'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Doanh Nghiệp / HKD
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">
                      {formData.partyBType === 'BUSINESS' ? 'Tên Doanh nghiệp / Hộ kinh doanh:' : 'Họ và tên KOC / Cá nhân:'}
                    </label>
                    <input
                      type="text"
                      value={formData.partyBName}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyBName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                      placeholder="Họ tên KOC hoặc Tên công ty"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Kênh truyền thông / Stage Name:</label>
                    <input
                      type="text"
                      value={formData.partyBStageName}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyBStageName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-blue-700 font-semibold focus:outline-none focus:border-blue-500 text-xs"
                      placeholder="@koc_channel"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">
                      {formData.partyBType === 'BUSINESS' ? 'Mã số thuế / Số ĐKKD:' : 'Số CCCD / Định danh (12 số):'}
                    </label>
                    <input
                      type="text"
                      value={formData.partyBIdNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyBIdNumber: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-blue-500 text-xs"
                      placeholder="001201019876 hoặc 0109876543"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Ngày cấp:</label>
                      <input
                        type="text"
                        value={formData.partyBIssueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, partyBIssueDate: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                        placeholder="25/08/2021"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Nơi cấp:</label>
                      <input
                        type="text"
                        value={formData.partyBIssuePlace}
                        onChange={(e) => setFormData(prev => ({ ...prev, partyBIssuePlace: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                        placeholder="Cục CS QLHC..."
                      />
                    </div>
                  </div>

                  {formData.partyBType === 'BUSINESS' && (
                    <>
                      <div>
                        <label className="text-slate-600 font-medium block mb-1">Người đại diện pháp luật:</label>
                        <input
                          type="text"
                          value={formData.partyBRepresentative || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, partyBRepresentative: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                          placeholder="Họ tên người đại diện"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-medium block mb-1">Chức vụ đại diện:</label>
                        <input
                          type="text"
                          value={formData.partyBRepTitle || 'Giám đốc'}
                          onChange={(e) => setFormData(prev => ({ ...prev, partyBRepTitle: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                          placeholder="Giám đốc / Chủ hộ KD"
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="text-slate-600 font-medium block mb-1">
                      {formData.partyBType === 'BUSINESS' ? 'Địa chỉ trụ sở chính:' : 'Nơi thường trú theo CCCD:'}
                    </label>
                    <input
                      type="text"
                      value={formData.partyBAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, partyBAddress: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                      placeholder="Địa chỉ đăng ký thường trú hoặc trụ sở"
                    />
                  </div>
                </div>

                {/* Sub-card: Tài Khoản Ngân Hàng Thụ Hưởng */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-2xs font-semibold text-emerald-800">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Tài Khoản Ngân Hàng Thụ Hưởng (Khớp VietQR)
                    </span>
                    <span className="text-emerald-700">Tự động đồng bộ cổng chi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="text-2xs text-slate-600 font-medium block mb-1">Số tài khoản (STK):</label>
                      <input
                        type="text"
                        value={formData.bankAccount}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:border-emerald-500 text-xs"
                        placeholder="Số tài khoản ngân hàng"
                      />
                    </div>

                    <div>
                      <label className="text-2xs text-slate-600 font-medium block mb-1">Tên ngân hàng:</label>
                      <select
                        value={formData.bankName}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        {POPULAR_BANKS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-2xs text-slate-600 font-medium block mb-1">Chủ tài khoản (In hoa):</label>
                      <input
                        type="text"
                        value={formData.bankAccountName}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value.toUpperCase() }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 text-xs uppercase"
                        placeholder="NGUYEN VAN A"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Điều 1: Phạm Vi Dịch Vụ & Sản Phẩm */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Điều 1: Phạm Vi Dịch Vụ &amp; Cam Kết
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Chiến dịch:</label>
                    <input
                      type="text"
                      value={formData.campaignTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaignTitle: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Nhãn hàng (Brand):</label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Sản phẩm thực hiện:</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-600 font-medium block mb-1">Mô tả sản phẩm bàn giao (Deliverables):</label>
                    <input
                      type="text"
                      value={formData.deliverablesText}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliverablesText: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Hạn chót đăng bài (Deadline):</label>
                    <input
                      type="date"
                      value={formData.deadlinePost}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadlinePost: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-blue-700 font-semibold focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Quyền Spark Ads (ngày):</label>
                    <div className="flex items-center gap-1.5">
                      {[90, 180, 365].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sparkAdsDays: days }))}
                          className={`px-2 py-1 rounded text-2xs font-semibold ${
                            formData.sparkAdsDays === days
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-600 font-medium block mb-1">Điều khoản cam kết bổ sung:</label>
                    <input
                      type="text"
                      value={formData.customClauses}
                      onChange={(e) => setFormData(prev => ({ ...prev, customClauses: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Điều 2: Tài Chính & Tiến Độ Giải Ngân */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Điều 2: Giá Trị Dịch Vụ &amp; Thanh Toán 2 Đợt
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className="text-2xs text-slate-500">Tỷ lệ cọc nhanh:</span>
                    {[20, 30, 50].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleAdvanceRateChange(pct)}
                        className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                          formData.advanceRatePercent === pct
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Tổng giá trị hợp đồng (VNĐ):</label>
                    <input
                      type="number"
                      value={formData.totalValue}
                      onChange={(e) => handleTotalValueChange(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-900 font-mono font-bold focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-emerald-700 font-medium block mb-1">
                      Đợt 1: Cọc tạm ứng ({formData.advanceRatePercent}%):
                    </label>
                    <input
                      type="number"
                      value={formData.advanceAmount}
                      onChange={(e) => handleAdvanceAmountChange(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-emerald-800 font-mono font-bold focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-indigo-700 font-medium block mb-1">Đợt 2: Tất toán còn lại:</label>
                    <input
                      type="number"
                      value={formData.finalAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, finalAmount: Number(e.target.value) || 0 }))}
                      className="w-full px-2.5 py-1.5 bg-indigo-50/50 border border-indigo-300 rounded-lg text-indigo-800 font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-slate-600 font-medium block mb-1">Ghi chú chính sách thuế &amp; hóa đơn:</label>
                    <input
                      type="text"
                      value={formData.taxPolicyNote}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxPolicyNote: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT: Paper Contract Live Preview */}
          {(viewMode === 'SPLIT' || viewMode === 'PREVIEW') && (
            <div className={`${
              viewMode === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
            } p-6 sm:p-8 overflow-y-auto max-h-[72vh] bg-white text-slate-900 font-sans leading-relaxed text-xs space-y-4`}>
              
              {/* Paper Top Title */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h4 className="font-semibold text-xs text-slate-900 tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
                <p className="text-2xs italic text-slate-600 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-0.5 bg-slate-400 mx-auto mt-1 mb-3" />

                <div className="font-bold text-sm sm:text-base text-blue-900 uppercase">
                  {templateTitleMap[formData.templateType]}
                </div>
                <div className="text-2xs text-slate-500 mt-1 font-mono">
                  Số: {formData.contractCode} / 2026 / HĐDV-UPBASE • Ngày lập: {formData.signDate}
                </div>
              </div>

              {/* Bên A Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800">BÊN A (BÊN THUÊ DỊCH VỤ): {formData.partyAName}</p>
                <p className="text-slate-600 mt-1">• Địa chỉ trụ sở: {formData.partyAAddress}</p>
                <p className="text-slate-600">• Đại diện ký: <strong className="text-slate-900">{formData.partyARepresentative}</strong> — Chức vụ: {formData.partyAPosition}</p>
                <p className="text-slate-600">• Mã số thuế: <strong className="font-mono text-slate-800">{formData.partyATaxCode}</strong> • Điện thoại: {formData.partyAPhone}</p>
              </div>

              {/* Bên B Box */}
              <div className={`p-3.5 rounded-xl border ${
                ocrData ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {formData.partyBType === 'BUSINESS'
                      ? 'BÊN B (BÊN CUNG CẤP DỊCH VỤ - PHÁP NHÂN DOANH NGHIỆP / HKD):'
                      : 'BÊN B (BÊN CUNG CẤP DỊCH VỤ - CÁ NHÂN KOC):'}
                  </p>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {formData.partyBType === 'BUSINESS' ? 'Doanh Nghiệp / VAT' : 'KOC Cá Nhân'}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1 text-slate-700">
                  <p>• Họ tên / Tên đơn vị: <strong className="text-slate-900">{formData.partyBName}</strong> (Kênh tác nghiệp: <strong className="text-blue-700">{formData.partyBStageName}</strong>)</p>
                  <p>• {formData.partyBType === 'BUSINESS' ? 'Mã số thuế / ĐKKD' : 'Số CCCD / Định danh'}: <strong className="font-mono text-slate-900">{formData.partyBIdNumber}</strong> (Cấp ngày: {formData.partyBIssueDate} tại {formData.partyBIssuePlace})</p>
                  {formData.partyBType === 'BUSINESS' && formData.partyBRepresentative && (
                    <p>• Người đại diện pháp luật: <strong className="text-slate-900">{formData.partyBRepresentative}</strong> ({formData.partyBRepTitle || 'Giám đốc'})</p>
                  )}
                  <p>• Địa chỉ: {formData.partyBAddress}</p>
                  <p>• Tài khoản ngân hàng: <strong className="font-mono text-slate-900">{formData.bankAccount}</strong> tại ngân hàng <strong className="text-slate-900">{formData.bankName}</strong> (Chủ TK: <strong className="text-slate-900">{formData.bankAccountName}</strong>)</p>
                </div>
              </div>

              {/* Clause 1: Phạm vi */}
              <div className="space-y-1.5 pt-1">
                <p className="font-semibold text-slate-900">ĐIỀU 1: PHẠM VI DỊCH VỤ &amp; BÀN GIAO</p>
                <p className="text-slate-700">
                  Bên B nhận thực hiện gói sáng tạo nội dung cho chiến dịch <strong>{formData.campaignTitle}</strong> của nhãn hàng <strong>{formData.brandName}</strong> (Sản phẩm: {formData.productName}):
                </p>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">
                  <li>Hạng mục bàn giao: <strong>{formData.deliverablesText}</strong>.</li>
                  <li>Kịch bản sơ bộ phải được Content Team Upbase phê duyệt qua hệ thống trước khi quay (SLA 24h).</li>
                  <li>Bên A được toàn quyền khai thác quảng cáo Spark Ads trong thời hạn <strong>{formData.sparkAdsDays} ngày</strong> kể từ khi video lên sóng.</li>
                  <li>Hạn chót hoàn thành nghiệm thu lên sóng: <strong className="text-blue-700">{formData.deadlinePost}</strong>.</li>
                  {formData.customClauses && <li>{formData.customClauses}</li>}
                </ul>
              </div>

              {/* Clause 2: Tài chính 2 đợt */}
              <div className="space-y-1.5 pt-1">
                <p className="font-semibold text-slate-900">ĐIỀU 2: PHÍ DỊCH VỤ &amp; PHƯƠNG THỨC THANH TOÁN 2 ĐỢT</p>
                <table className="w-full border-collapse border border-slate-300 mt-1 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-left text-slate-700 font-semibold text-2xs">
                      <th className="border border-slate-300 p-2">Đợt thanh toán</th>
                      <th className="border border-slate-300 p-2">Số tiền (VNĐ)</th>
                      <th className="border border-slate-300 p-2">Điều kiện giải ngân</th>
                      <th className="border border-slate-300 p-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-semibold text-emerald-700">
                        Đợt 1: Cọc tạm ứng ({formData.advanceRatePercent}%)
                      </td>
                      <td className="border border-slate-300 p-2 font-semibold text-emerald-700 font-mono">
                        {formData.advanceAmount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="border border-slate-300 p-2">{formData.advanceCondition}</td>
                      <td className="border border-slate-300 p-2 font-semibold">
                        {deal.status === 'ADVANCE_PAID' || deal.status === 'VIDEO_SUBMITTED' || deal.status === 'FINAL_PAID'
                          ? 'Đã Giải Ngân' : 'Chờ Duyệt Chi Lark'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-semibold text-indigo-700">
                        Đợt 2: Tất toán còn lại
                      </td>
                      <td className="border border-slate-300 p-2 font-semibold text-indigo-700 font-mono">
                        {formData.finalAmount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="border border-slate-300 p-2">{formData.finalCondition}</td>
                      <td className="border border-slate-300 p-2 font-semibold">
                        {deal.status === 'FINAL_PAID' ? 'Đã Tất Toán' : 'Sau Nghiệm Thu Video'}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/70">
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">TỔNG GIÁ TRỊ</td>
                      <td colSpan={3} className="border border-slate-300 p-2 font-bold text-blue-900 font-mono text-sm">
                        {formData.totalValue.toLocaleString('vi-VN')} VNĐ
                        <span className="text-2xs font-normal text-slate-500 ml-2">({formData.taxPolicyNote})</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dynamic VietQR Box */}
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
                    Cổng Chi Tiền VietQR (Tự Động Theo Thông Tin Form)
                  </span>
                  <p className="text-slate-600 text-2xs">
                    Ngân hàng: <strong>{formData.bankName}</strong> • STK: <strong className="font-mono text-slate-900">{formData.bankAccount}</strong> • Chủ TK: <strong>{formData.bankAccountName}</strong>
                  </p>
                  <div className="font-mono text-xs text-slate-800 bg-white/80 border border-emerald-200 px-2.5 py-1 rounded-md">
                    Nội dung CK: <strong>{qrTransferDescription}</strong> • Số tiền: <strong className="text-emerald-700">{qrAmount.toLocaleString('vi-VN')} đ</strong>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between pt-6 text-xs border-t border-slate-200 mt-4">
                <div className="text-center">
                  <p className="font-semibold text-slate-800">ĐẠI DIỆN BÊN A (UPBASE)</p>
                  <p className="text-2xs text-slate-500 italic">(Đã ký số điện tử qua hệ thống)</p>
                  <div className="mt-8 font-semibold text-blue-800">{formData.partyARepresentative}</div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800">ĐẠI DIỆN BÊN B</p>
                  <p className="text-2xs text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="mt-8 font-semibold text-slate-800">{formData.partyBName}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span>Trạng thái: <strong className="text-slate-900">{deal.statusLabel}</strong></span>
            <span>•</span>
            <span className="text-blue-700 font-medium">Mẫu: {formData.templateType}</span>
          </div>

          <div className="flex items-center gap-2">
            {onApproveAdvance && deal.status !== 'ADVANCE_PAID' && deal.status !== 'FINAL_PAID' && deal.status !== 'VIDEO_SUBMITTED' && (
              <button
                onClick={() => setConfirmAction('ADVANCE')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Duyệt Chi Cọc {formData.advanceAmount.toLocaleString('vi-VN')} đ</span>
              </button>
            )}

            {onApproveFinal && (deal.status === 'VIDEO_SUBMITTED' || deal.status === 'ADVANCE_PAID') && (
              <button
                onClick={() => setConfirmAction('FINAL')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Duyệt Chi Tất Toán {formData.finalAmount.toLocaleString('vi-VN')} đ</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs for Money Disbursement */}
      <ConfirmDialog
        open={confirmAction === 'ADVANCE'}
        title="Xác nhận duyệt chi tạm ứng cọc"
        message={`Bạn có chắc chắn duyệt chi khoản tạm ứng ${formData.advanceAmount.toLocaleString('vi-VN')} đ (${formData.advanceRatePercent}% giá trị HĐ) cho bên B (${formData.partyBName})? Thao tác này sẽ ghi nhận vào sổ phụ kế toán và mở lệnh giải ngân.`}
        confirmLabel="Xác nhận duyệt chi cọc"
        onConfirm={() => {
          onApproveAdvance?.(deal.id);
          setConfirmAction(null);
          onClose();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'FINAL'}
        title="Xác nhận duyệt chi tất toán hợp đồng"
        message={`Bạn có chắc chắn duyệt chi tất toán khoản ${formData.finalAmount.toLocaleString('vi-VN')} đ cho bên B (${formData.partyBName})? Thao tác này sẽ nghiệm thu hoàn tất và lưu trữ hồ sơ hợp đồng.`}
        confirmLabel="Xác nhận duyệt tất toán"
        onConfirm={() => {
          onApproveFinal?.(deal.id);
          setConfirmAction(null);
          onClose();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Embedded Legal OCR Scanner Modal */}
      <LegalOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onApplyToContract={(res) => {
          setOcrData(res);
          applyOcrToForm(res);
          setIsOcrOpen(false);
        }}
      />
    </div>
  );
};
