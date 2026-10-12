'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  ExternalLink,
  Plus,
  X,
  FileCheck,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Tag
} from 'lucide-react';
import {
  BrandKnowledgeBase,
  BrandDocumentFile,
  BrandFileCategory,
  BrandFileStatus,
  ExtractedBrandInfo
} from '../../lib/types';
import {
  SAMPLE_BRAND_DOCUMENTS,
  extractInformationFromBrandFile,
  applyExtractedDataToBrandKnowledgeBase
} from '../../lib/brandDocumentExtractor';

interface BrandDocumentsTabProps {
  currentBrand: BrandKnowledgeBase;
  onUpdateBrand: (updated: BrandKnowledgeBase) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const BrandDocumentsTab: React.FC<BrandDocumentsTabProps> = ({
  currentBrand,
  onUpdateBrand,
  onNotify
}) => {
  // Danh sách tệp của nhãn hàng hiện tại
  const brandDocuments: BrandDocumentFile[] = currentBrand.documents || [];

  // Bộ lọc danh mục & Tìm kiếm
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trạng thái Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadCategory, setUploadCategory] = useState<BrandFileCategory>('BRAND_GUIDELINE');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái Modal Trích xuất thông tin
  const [inspectingDoc, setInspectingDoc] = useState<BrandDocumentFile | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [activeExtractedData, setActiveExtractedData] = useState<ExtractedBrandInfo | null>(null);
  const [syncSuccessSummary, setSyncSuccessSummary] = useState<string[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Lọc tệp tài liệu
  const filteredDocuments = brandDocuments.filter((doc) => {
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.fileName.toLowerCase().includes(q);
      const matchNotes = (doc.notes || '').toLowerCase().includes(q);
      const matchUploader = doc.uploadedBy.toLowerCase().includes(q);
      if (!matchName && !matchNotes && !matchUploader) return false;
    }
    return true;
  });

  // Xử lý nạp file từ máy tính
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedUploadFile(file);
    }
  };

  // Xác nhận tải tệp lên kho lưu trữ
  const handleConfirmUpload = async (autoExtract: boolean = false) => {
    if (!selectedUploadFile) {
      onNotify?.('Vui lòng chọn tệp tài liệu để tải lên kho.', 'warning');
      return;
    }

    setIsUploading(true);

    try {
      // Đọc nội dung sơ bộ nếu là file văn bản
      let textContent = '';
      if (selectedUploadFile.type.includes('text') || selectedUploadFile.name.endsWith('.txt') || selectedUploadFile.name.endsWith('.md')) {
        textContent = await selectedUploadFile.text();
      }

      // Xác định định dạng tệp
      let fileType: BrandDocumentFile['fileType'] = 'pdf';
      const ext = selectedUploadFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
      else if (ext === 'docx' || ext === 'doc') fileType = 'docx';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) fileType = 'image';

      // Tính dung lượng file
      const sizeMb = (selectedUploadFile.size / (1024 * 1024)).toFixed(1);
      const sizeKb = Math.round(selectedUploadFile.size / 1024);
      const fileSizeFormatted = selectedUploadFile.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

      // Tạo tệp tài liệu mới
      const newDocId = `doc-${Date.now()}`;
      const newDoc: BrandDocumentFile = {
        id: newDocId,
        brandId: currentBrand.id,
        brandName: currentBrand.brandName,
        fileName: selectedUploadFile.name,
        fileSizeFormatted,
        fileType,
        category: uploadCategory,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Nhân viên vận hành',
        status: 'CHƯA_ĐỌC',
        notes: uploadNotes || 'Tài liệu vừa tải lên kho'
      };

      // Nếu người dùng chọn "Tải lên & Đọc tệp ngay"
      if (autoExtract) {
        newDoc.status = 'ĐANG_ĐỌC';
        const extracted = await extractInformationFromBrandFile({
          fileName: selectedUploadFile.name,
          category: uploadCategory,
          brandName: currentBrand.brandName,
          fileTextContent: textContent
        });
        newDoc.extractedData = extracted;
        newDoc.status = 'ĐÃ_TRÍCH_XUẤT';
      }

      const updatedDocs = [newDoc, ...brandDocuments];
      const updatedBrand: BrandKnowledgeBase = {
        ...currentBrand,
        documents: updatedDocs
      };

      onUpdateBrand(updatedBrand);
      setIsUploadModalOpen(false);
      setSelectedUploadFile(null);
      setUploadNotes('');

      onNotify?.(`Đã tải tệp "${newDoc.fileName}" vào kho lưu trữ của ${currentBrand.brandName}`, 'success');

      // Nếu tự động trích xuất, mở luôn bảng đối soát
      if (autoExtract && newDoc.extractedData) {
        setInspectingDoc(newDoc);
        setActiveExtractedData(newDoc.extractedData);
      }
    } catch (err: any) {
      console.error('Lỗi tải tệp:', err);
      onNotify?.(`Lỗi lưu tệp: ${err.message || 'Không thể xử lý tệp'}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Thao tác Đọc & Trích xuất thông tin từ tệp trong kho
  const handleStartExtraction = async (doc: BrandDocumentFile) => {
    setInspectingDoc(doc);
    setIsExtracting(true);
    setSyncSuccessSummary(null);

    try {
      // Giả lập tiến trình đọc tài liệu (1.2 giây)
      await new Promise((r) => setTimeout(r, 650));

      const extracted = await extractInformationFromBrandFile({
        fileName: doc.fileName,
        category: doc.category,
        brandName: currentBrand.brandName,
        presetDocumentId: doc.id
      });

      setActiveExtractedData(extracted);

      // Cập nhật trạng thái file trong kho thành ĐÃ_TRÍCH_XUẤT
      const updatedDocs = brandDocuments.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              status: 'ĐÃ_TRÍCH_XUẤT' as BrandFileStatus,
              extractedData: extracted
            }
          : d
      );

      onUpdateBrand({
        ...currentBrand,
        documents: updatedDocs
      });

      onNotify?.(`Đã trích xuất thông tin tệp "${doc.fileName}" thành công`, 'success');
    } catch (err: any) {
      console.error('Lỗi trích xuất:', err);
      onNotify?.('Lỗi trong quá trình đọc tài liệu', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Thao tác Đồng bộ thông tin đã trích xuất vào Hồ sơ Nhãn hàng
  const handleApplyToBrandKnowledge = () => {
    if (!activeExtractedData || !inspectingDoc) return;

    const { updatedBrand, summaryChanges } = applyExtractedDataToBrandKnowledgeBase(
      currentBrand,
      activeExtractedData
    );

    // Đánh dấu tệp thành ĐÃ_ĐỒNG_BỘ
    const updatedDocs = (updatedBrand.documents || []).map((d) =>
      d.id === inspectingDoc.id ? { ...d, status: 'ĐÃ_ĐỒNG_BỘ' as BrandFileStatus } : d
    );
    updatedBrand.documents = updatedDocs;

    onUpdateBrand(updatedBrand);
    setSyncSuccessSummary(summaryChanges);
    onNotify?.(`Đã đồng bộ ${summaryChanges.length} hạng mục vào hồ sơ ${currentBrand.brandName}!`, 'success');
  };

  // Thao tác Xóa tệp
  const handleDeleteDoc = (docId: string, docName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${docName}" khỏi kho tài liệu?`)) return;

    const updatedDocs = brandDocuments.filter((d) => d.id !== docId);
    onUpdateBrand({
      ...currentBrand,
      documents: updatedDocs
    });
    onNotify?.(`Đã xóa tệp "${docName}" khỏi kho`, 'info');
  };

  // Render icon định dạng file
  const renderFileIcon = (fileType: BrandDocumentFile['fileType']) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'docx':
        return <FileCode className="w-5 h-5 text-blue-600" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  // Render badge trạng thái
  const renderStatusBadge = (status: BrandFileStatus) => {
    switch (status) {
      case 'ĐÃ_ĐỒNG_BỘ':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã Đồng Bộ
          </span>
        );
      case 'ĐÃ_TRÍCH_XUẤT':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
            <FileCheck className="w-3 h-3 text-blue-600" /> Đã Trích Xuất
          </span>
        );
      case 'ĐANG_ĐỌC':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" /> Đang Đọc
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Chưa Đọc
          </span>
        );
    }
  };

  // Tên loại tài liệu hiển thị
  const getCategoryLabel = (category: BrandFileCategory) => {
    switch (category) {
      case 'BRAND_GUIDELINE':
        return 'Quy chuẩn thương hiệu';
      case 'LEGAL_CERTIFICATE':
        return 'Hồ sơ pháp lý / BYT';
      case 'CLINICAL_TRIAL':
        return 'Thử nghiệm lâm sàng';
      case 'PRODUCT_CATALOG':
        return 'Hồ sơ sản phẩm SKU';
      case 'CAMPAIGN_BRIEF':
        return 'Brief chiến dịch';
      case 'ASSET_MEDIA':
        return 'Bộ thiết kế & Media';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER: KHO LƯU TRỮ TÀI LIỆU NHÃN HÀNG */}
      <div className="card-enterprise p-5 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Kho Tài Liệu &amp; Tệp Đính Kèm — {currentBrand.brandName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {brandDocuments.length} tệp tài liệu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lưu trữ tập trung các văn bản Brand Guideline, hồ sơ công bố Bộ Y tế, phiếu kiểm nghiệm lâm sàng và danh mục sản phẩm. Hỗ trợ đọc tệp và trích xuất thông tin tự động vào hồ sơ nhãn hàng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Tệp Lên Kho</span>
            </button>
          </div>
        </div>

        {/* METRICS & QUICK FILTER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 lg:pb-0">
            <span className="text-slate-400 text-xs flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Phân loại:
            </span>
            {[
              { key: 'ALL', label: 'Tất cả tệp' },
              { key: 'BRAND_GUIDELINE', label: 'Brand Guideline' },
              { key: 'LEGAL_CERTIFICATE', label: 'Công bố BYT' },
              { key: 'CLINICAL_TRIAL', label: 'Thử nghiệm lâm sàng' },
              { key: 'PRODUCT_CATALOG', label: 'Hồ sơ sản phẩm' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1 rounded-md font-semibold transition whitespace-nowrap ${
                  selectedCategory === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên file, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* DANH SÁCH TÀI LIỆU TRONG KHO */}
      <div className="card-enterprise overflow-hidden bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
              <th className="py-2.5 px-4">Tên tệp &amp; Định dạng</th>
              <th className="py-2.5 px-3">Phân loại tài liệu</th>
              <th className="py-2.5 px-3">Dung lượng</th>
              <th className="py-2.5 px-3">Ngày nạp &amp; Người tải</th>
              <th className="py-2.5 px-3">Trạng thái xử lý</th>
              <th className="py-2.5 px-4 text-right">Thao Tác Nghiệp Vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>Chưa có tệp nào trong mục này của {currentBrand.brandName}.</p>
                  <p className="text-2xs text-slate-400 mt-1">Bấm &ldquo;Tải Tệp Lên Kho&rdquo; để nạp văn bản mới.</p>
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1 rounded bg-slate-100 border border-slate-200 shrink-0">
                        {renderFileIcon(doc.fileType)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{doc.fileName}</p>
                        {doc.notes && (
                          <p className="text-2xs text-slate-500 font-normal mt-0.5">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                      {getCategoryLabel(doc.category)}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600">
                    {doc.fileSizeFormatted}
                  </td>

                  <td className="py-3 px-3 text-slate-600 text-2xs">
                    <p className="font-medium text-slate-800">{doc.uploadDate}</p>
                    <p className="text-slate-500">{doc.uploadedBy}</p>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    {renderStatusBadge(doc.status)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartExtraction(doc)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs ${
                          doc.status === 'ĐÃ_TRÍCH_XUẤT' || doc.status === 'ĐÃ_ĐỒNG_BỘ'
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{doc.status === 'CHƯA_ĐỌC' ? 'Đọc & Trích Xuất' : 'Xem Kết Quả Trích Xuất'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Xóa tệp khỏi kho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TẢI TỆP TÀI LIỆU LÊN KHO                                        */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Tải Tệp Tài Liệu Lên Kho — {currentBrand.brandName}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Vùng kéo thả hoặc chọn file */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Chọn tệp tài liệu từ máy tính *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  {selectedUploadFile ? (
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{selectedUploadFile.name}</p>
                      <p className="text-2xs text-slate-500 font-mono mt-0.5">
                        Dung lượng: {(selectedUploadFile.size / 1024).toFixed(0)} KB • Định dạng: {selectedUploadFile.type || 'Tài liệu'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-slate-700">Kéo thả tệp vào đây hoặc bấm để chọn tệp</p>
                      <p className="text-2xs text-slate-400 mt-1">Hỗ trợ PDF, Word, Excel, Hình ảnh giấy phép (Tối đa 25MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Loại tài liệu */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phân loại tài liệu nghiệp vụ *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as BrandFileCategory)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="BRAND_GUIDELINE">Bộ quy chuẩn thương hiệu &amp; Tone of Voice (Brand Guideline)</option>
                  <option value="LEGAL_CERTIFICATE">Hồ sơ pháp lý / Giấy công bố Bộ Y tế / Giấy phép quảng cáo</option>
                  <option value="CLINICAL_TRIAL">Báo cáo thử nghiệm lâm sàng &amp; Chứng nhận an toàn da liễu</option>
                  <option value="PRODUCT_CATALOG">Bảng thông số kỹ thuật sản phẩm &amp; Hero SKU</option>
                  <option value="CAMPAIGN_BRIEF">Tài liệu brief chiến dịch &amp; Định hướng nội dung</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú tóm tắt (không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="VD: Bản cập nhật quý 4/2026 kèm quy định từ cấm mới..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!selectedUploadFile || isUploading}
                  onClick={() => handleConfirmUpload(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded transition"
                >
                  Lưu Vào Kho
                </button>
                <button
                  type="button"
                  disabled={!selectedUploadFile || isUploading}
                  onClick={() => handleConfirmUpload(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition flex items-center gap-1.5 shadow-xs"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Tải &amp; Đọc...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Tải Lên &amp; Đọc Tệp Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BẢNG TRÍCH XUẤT THÔNG TIN TÀI LIỆU & ĐỒNG BỘ VÀO HỒ SƠ BRAND    */}
      {/* ========================================================================= */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-blue-100 text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Bảng Trích Xuất Dữ Liệu Tài Liệu: {inspectingDoc.fileName}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-2xs font-semibold border border-blue-200">
                      {getCategoryLabel(inspectingDoc.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhãn hàng: <strong>{currentBrand.brandName}</strong> • Dung lượng: {inspectingDoc.fileSizeFormatted}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartExtraction(inspectingDoc)}
                  disabled={isExtracting}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition flex items-center gap-1.5"
                  title="Đọc lại tệp"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                  <span>Đọc lại</span>
                </button>

                <button
                  onClick={() => setInspectingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {isExtracting ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">Đang đọc và phân tích cấu trúc văn bản tài liệu...</p>
                  <p className="text-xs text-slate-500">Hệ thống đang bóc tách số công bố, điều khoản pháp lý và danh mục từ khóa</p>
                </div>
              ) : activeExtractedData ? (
                <div className="space-y-5">
                  {/* Băng thông báo Đồng bộ thành công (nếu vừa bấm đồng bộ) */}
                  {syncSuccessSummary && (
                    <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Đã đồng bộ thành công vào Hồ Sơ Nhãn Hàng {currentBrand.brandName}!</span>
                      </div>
                      <ul className="text-2xs space-y-1 list-disc list-inside text-emerald-800">
                        {syncSuccessSummary.map((change, idx) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Thanh tóm tắt độ tin cậy trích xuất */}
                  <div className="p-4 rounded-md bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-blue-900">
                        Kết quả bóc tách thông tin tài liệu tự động
                      </p>
                      <p className="text-2xs text-slate-600">
                        Độ chuẩn hóa khớp với hồ sơ: <strong>{activeExtractedData.confidenceScore || 96}%</strong> • Thời gian thực hiện: {activeExtractedData.extractedAt}
                      </p>
                    </div>

                    <button
                      onClick={handleApplyToBrandKnowledge}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>Đồng Bộ Vào Hồ Sơ Nhãn Hàng</span>
                    </button>
                  </div>

                  {/* 2 CỘT CHI TIẾT: NỘI DUNG GỐC & CÁC TRƯỜNG DỮ LIỆU ĐÃ TRÍCH XUẤT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Cột trái: Văn bản quét gốc (5 Cột) */}
                    <div className="lg:col-span-5 space-y-3">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span>Nội dung văn bản quét được:</span>
                      </h4>
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200 font-mono text-2xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {activeExtractedData.rawTextPreview || 'Không có đoạn trích văn bản'}
                      </div>
                    </div>

                    {/* Cột phải: Các trường dữ liệu bóc tách được (7 Cột) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Nhóm 1: Thông tin thương hiệu & Định vị */}
                      {(activeExtractedData.slogan || activeExtractedData.toneOfVoice || activeExtractedData.targetAudience) && (
                        <div className="card-inner-box p-3.5 space-y-2 bg-white border border-slate-200">
                          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                            <span>Định vị thương hiệu &amp; Giọng văn</span>
                          </h5>
                          {activeExtractedData.slogan && (
                            <p className="text-2xs text-slate-700">
                              <strong>Slogan trích xuất:</strong> &ldquo;{activeExtractedData.slogan}&rdquo;
                            </p>
                          )}
                          {activeExtractedData.toneOfVoice && (
                            <p className="text-2xs text-slate-700">
                              <strong>Giọng văn quy chuẩn:</strong> {activeExtractedData.toneOfVoice}
                            </p>
                          )}
                          {activeExtractedData.targetAudience && (
                            <p className="text-2xs text-slate-700">
                              <strong>Đối tượng mục tiêu:</strong> {activeExtractedData.targetAudience}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Nhóm 2: Hồ sơ pháp lý & Công bố BYT */}
                      {(activeExtractedData.certNumber || activeExtractedData.issuingAuthority || activeExtractedData.mandatoryDisclaimer) && (
                        <div className="card-inner-box p-3.5 space-y-2 bg-white border border-emerald-200">
                          <h5 className="font-semibold text-emerald-900 flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Hồ sơ pháp lý &amp; Tuyên bố bắt buộc</span>
                          </h5>
                          {activeExtractedData.certNumber && (
                            <p className="text-2xs text-slate-800">
                              <strong>Số giấy phép / Công bố:</strong>{' '}
                              <span className="font-mono font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-200">
                                {activeExtractedData.certNumber}
                              </span>
                            </p>
                          )}
                          {activeExtractedData.issuingAuthority && (
                            <p className="text-2xs text-slate-700">
                              <strong>Cơ quan ban hành:</strong> {activeExtractedData.issuingAuthority}
                            </p>
                          )}
                          {activeExtractedData.mandatoryDisclaimer && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-2xs text-amber-900 space-y-1">
                              <p className="font-semibold">Câu tuyên bố bắt buộc (Disclaimer):</p>
                              <p className="italic">&ldquo;{activeExtractedData.mandatoryDisclaimer}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nhóm 3: Thành phần hoạt chất & Lâm sàng */}
                      {activeExtractedData.ingredients && activeExtractedData.ingredients.length > 0 && (
                        <div className="card-inner-box p-3.5 space-y-2 bg-white border border-slate-200">
                          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                            <Award className="w-3.5 h-3.5 text-purple-600" />
                            <span>Thành phần hoạt chất nhận diện ({activeExtractedData.ingredients.length})</span>
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                            {activeExtractedData.ingredients.map((ing, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                                <p className="font-semibold text-slate-900">{ing.name}</p>
                                <p className="text-slate-500">{ing.benefit}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nhóm 4: Từ khóa Blacklist & Whitelist */}
                      {activeExtractedData.blacklistKeywords && activeExtractedData.blacklistKeywords.length > 0 && (
                        <div className="card-inner-box p-3.5 space-y-2 bg-white border border-rose-200">
                          <h5 className="font-semibold text-rose-900 flex items-center gap-1.5 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Từ cấm kỵ (Blacklist) phát hiện ({activeExtractedData.blacklistKeywords.length})</span>
                          </h5>
                          <div className="space-y-1.5 text-2xs">
                            {activeExtractedData.blacklistKeywords.map((kw, idx) => (
                              <div key={idx} className="p-2 bg-rose-50/50 rounded border border-rose-100 flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-rose-800">&ldquo;{kw.keyword}&rdquo;: </span>
                                  <span className="text-slate-600">{kw.rationale}</span>
                                  {kw.alternativeSuggestion && (
                                    <p className="text-emerald-700 font-medium mt-0.5">
                                      ↳ Đề xuất: &ldquo;{kw.alternativeSuggestion}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nhóm 5: Quy chuẩn hình ảnh Do's & Don'ts */}
                      {((activeExtractedData.visualDos && activeExtractedData.visualDos.length > 0) ||
                        (activeExtractedData.visualDonts && activeExtractedData.visualDonts.length > 0)) && (
                        <div className="card-inner-box p-3.5 space-y-2 bg-white border border-slate-200">
                          <h5 className="font-semibold text-slate-800 text-xs">Quy chuẩn hình ảnh bóc tách:</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                            {activeExtractedData.visualDos && activeExtractedData.visualDos.length > 0 && (
                              <div className="p-2 rounded bg-emerald-50/40 border border-emerald-100 space-y-1">
                                <p className="font-semibold text-emerald-800">Khuyến khích (Do&apos;s):</p>
                                {activeExtractedData.visualDos.map((d, idx) => (
                                  <p key={idx} className="text-slate-700">• {d}</p>
                                ))}
                              </div>
                            )}
                            {activeExtractedData.visualDonts && activeExtractedData.visualDonts.length > 0 && (
                              <div className="p-2 rounded bg-rose-50/40 border border-rose-100 space-y-1">
                                <p className="font-semibold text-rose-800">Cấm kỵ (Don&apos;ts):</p>
                                {activeExtractedData.visualDonts.map((d, idx) => (
                                  <p key={idx} className="text-slate-700">• {d}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p>Chưa có dữ liệu trích xuất cho tệp này.</p>
                  <button
                    onClick={() => handleStartExtraction(inspectingDoc)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white font-semibold rounded text-xs"
                  >
                    Bắt đầu đọc tệp ngay
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
              <span className="text-2xs text-slate-500">
                Toàn bộ dữ liệu được lưu cục bộ trong kho hồ sơ thương hiệu Upbase
              </span>

              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="px-4 py-1.5 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100 transition text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
