'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Building2, 
  RefreshCw, 
  ArrowRight,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  Info
} from 'lucide-react';
import { OcrLegalExtractionResult, OcrExtractedFields } from '../lib/types';
import { SAMPLE_OCR_PRESETS } from '../lib/ocrPresets';

interface LegalOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToContract: (ocrResult: OcrLegalExtractionResult) => void;
  initialPreset?: 'CCCD_INDIVIDUAL' | 'BUSINESS_COMPANY' | 'BUSINESS_HOUSEHOLD';
}

export const LegalOcrModal: React.FC<LegalOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyToContract,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<OcrLegalExtractionResult | null>(null);
  const [editableFields, setEditableFields] = useState<OcrExtractedFields>({});
  const [activeTab, setActiveTab] = useState<'AUTO' | 'CCCD' | 'BUSINESS'>('AUTO');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFieldChange = (key: keyof OcrExtractedFields, value: string) => {
    setEditableFields(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLoadPreset = async (presetKey: 'CCCD_INDIVIDUAL' | 'BUSINESS_COMPANY' | 'BUSINESS_HOUSEHOLD') => {
    setIsScanning(true);
    setSelectedFile(null);
    setPreviewUrl(null);

    try {
      const res = await fetch('/api/ocr/extract-legal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetKey })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setExtractionResult(data.data);
        setEditableFields(data.data.fields || {});
      } else {
        setExtractionResult(SAMPLE_OCR_PRESETS[presetKey]);
        setEditableFields(SAMPLE_OCR_PRESETS[presetKey].fields || {});
      }
    } catch (err) {
      console.error('OCR Preset error:', err);
      setExtractionResult(SAMPLE_OCR_PRESETS[presetKey]);
      setEditableFields(SAMPLE_OCR_PRESETS[presetKey].fields || {});
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImageLoadError(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Read base64 and trigger OCR
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await processImageUpload(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const processImageUpload = async (base64Image: string, fileName: string) => {
    setIsScanning(true);
    setExtractionResult(null);
    setEditableFields({});

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s client timeout

    try {
      const res = await fetch('/api/ocr/extract-legal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: base64Image,
          fileName,
          documentTypeHint: activeTab === 'AUTO' ? undefined : (activeTab === 'CCCD' ? 'CCCD' : 'BUSINESS_LICENSE')
        })
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.success && data.data) {
        setExtractionResult({
          ...data.data,
          fileName
        });
        setEditableFields(data.data.fields || {});
      } else {
        alert(data.error || 'Không thể bóc tách tài liệu từ ảnh');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[Upload OCR error]:', err);
      if (err.name === 'AbortError') {
        alert('Quá trình nhận diện vượt quá 20 giây. Vui lòng thử lại với ảnh rõ nét hoặc dung lượng nhỏ hơn.');
      } else {
        alert('Đã xảy ra lỗi khi bóc tách OCR từ ảnh: ' + (err?.message || 'Lỗi kết nối'));
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (!extractionResult) return;
    onApplyToContract({
      ...extractionResult,
      fields: editableFields
    });
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
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Tesseract OCR Bóc Tách Giấy Tờ Pháp Lý (CCCD / ĐKKD)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Ngoại Tuyến 100%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Động cơ Tesseract OCR nội bộ (vie + eng) quét ảnh trực tiếp trên máy chủ — Không gửi ảnh ra ngoài — Tự động điền &amp; cho phép chỉnh sửa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Tesseract Local Engine</span>
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Dữ liệu mẫu thử nghiệm:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleLoadPreset('CCCD_INDIVIDUAL')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                  extractionResult?.documentType === 'CCCD' && !selectedFile
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mẫu CCCD KOC
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('BUSINESS_COMPANY')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                  extractionResult?.documentType === 'BUSINESS_LICENSE' && !selectedFile
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mẫu ĐKKD Công Ty
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('BUSINESS_HOUSEHOLD')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                  extractionResult?.documentType === 'BUSINESS_HOUSEHOLD' && !selectedFile
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mẫu Hộ Kinh Doanh
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Bảo mật thông tin nhân thân theo Luật An ninh mạng Việt Nam
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Left Column: Upload / Preview Area */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Tải lên bản chụp CCCD hoặc Giấy phép ĐKKD thực tế
              </label>
              <p className="text-[11px] text-slate-500">
                Chụp ảnh rõ nét, vuông góc, không bị lóa hoặc che góc giấy tờ
              </p>
            </div>

            {/* Target Hint Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('AUTO')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition text-center ${
                  activeTab === 'AUTO' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Tự động
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CCCD')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition text-center ${
                  activeTab === 'CCCD' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                CCCD Cá Nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('BUSINESS')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition text-center ${
                  activeTab === 'BUSINESS' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                ĐKKD / Hộ KD
              </button>
            </div>

            {/* Upload Dropzone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition relative overflow-hidden group ${
                previewUrl 
                  ? 'border-blue-400 bg-blue-50/20' 
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*,.pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />

              {previewUrl && !imageLoadError && !selectedFile?.name.toLowerCase().endsWith('.pdf') ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Preview tài liệu" 
                    className="w-full h-full object-contain"
                    onError={() => setImageLoadError(true)}
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-emerald-950/40 pointer-events-none flex flex-col items-center justify-center gap-2">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce" />
                      <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        Đang quét ký tự Tesseract...
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 text-white rounded text-[10px] font-medium backdrop-blur-xs">
                    Nhấp để đổi ảnh khác
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4">
                  <FileText className="w-12 h-12 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-800 text-center truncate max-w-full px-2">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                  {isScanning && (
                    <div className="absolute inset-0 bg-emerald-950/40 pointer-events-none flex flex-col items-center justify-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        Đang quét ký tự Tesseract...
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 text-white rounded text-[10px] font-medium backdrop-blur-xs">
                    Nhấp để đổi tệp khác
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Kéo &amp; thả ảnh vào đây hoặc <span className="text-blue-600 underline">chọn từ máy tính</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Hỗ trợ ảnh chụp CCCD 2 mặt, Giấy phép ĐKKD Công ty hoặc Hộ kinh doanh
                  </p>
                </div>
              )}
            </div>

            {/* Quick Upload Info / File Name */}
            {extractionResult?.fileName && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">
                    {extractionResult.fileName}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                  {Math.round((extractionResult.confidence || 0.85) * 100)}% Tin cậy
                </span>
              </div>
            )}

            {/* Validation Tips Box */}
            {extractionResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Nhật ký kiểm định OCR:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                  {extractionResult.validationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw Text Preview Collapsible */}
            {extractionResult?.rawTextPreview && (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Xem văn bản thô bóc tách từ ảnh
                  </span>
                  {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showRawText && (
                  <pre className="p-3 bg-slate-900 text-emerald-400 text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                    {extractionResult.rawTextPreview}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Structured Extraction & Form Editing */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* If no result yet */}
            {!extractionResult && !isScanning && (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Chưa có dữ liệu giấy tờ nào được bóc tách
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Vui lòng tải ảnh CCCD / ĐKKD ở khung bên trái hoặc nhấp vào một trong các nút mẫu thử nghiệm phía trên để xem demo.
                </p>
              </div>
            )}

            {isScanning && (
              <div className="p-12 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-center space-y-3 animate-pulse">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-emerald-950">
                  Đang nhận diện ký tự bằng Tesseract Local Engine...
                </h4>
                <p className="text-xs text-emerald-700 max-w-sm mx-auto leading-relaxed">
                  Động cơ Tesseract OCR (vie + eng) đang xử lý ảnh ngoại tuyến trên máy chủ UpBase, bóc tách Số CCCD/MST, Họ tên, Ngày sinh và Địa chỉ...
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bảo mật nội bộ 100% — Không gửi dữ liệu ra bên ngoài
                </div>
              </div>
            )}

            {extractionResult && (
              <>
                {/* Document Type Badge & Status */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {extractionResult.documentType === 'CCCD' ? 'ID' : 'DN'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {extractionResult.documentTypeLabel}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {extractionResult.documentType === 'CCCD' ? 'Cá nhân (Căn cước công dân)' : 'Pháp nhân kinh doanh / Hộ kinh doanh'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Đã trích xuất
                  </div>
                </div>

                {/* Form Editing Notice */}
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    Dữ liệu được trích xuất tự động từ ảnh. Bạn có thể <strong>chỉnh sửa trực tiếp</strong> các ô bên dưới nếu ảnh chụp bị mờ hoặc có sai sót trước khi bấm lưu.
                  </span>
                </div>

                {/* Extracted Fields Form */}
                <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Thông Tin Pháp Lý Bóc Tách Được:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Cho phép chỉnh sửa</span>
                  </h4>

                  {/* Individual (CCCD) Fields */}
                  {extractionResult.documentType === 'CCCD' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Số CCCD / Số Định Danh (12 số) <span className="text-rose-500">*</span>:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editableFields.idNumber || ''}
                            onChange={(e) => handleFieldChange('idNumber', e.target.value)}
                            placeholder="Ví dụ: 001201004567"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <button 
                            type="button"
                            onClick={() => handleCopy(editableFields.idNumber || '', 'idNumber')}
                            className="p-2 text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title="Sao chép"
                          >
                            {copiedKey === 'idNumber' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Họ và Tên In Hoa <span className="text-rose-500">*</span>:
                        </label>
                        <input
                          type="text"
                          value={editableFields.fullName || ''}
                          onChange={(e) => handleFieldChange('fullName', e.target.value)}
                          placeholder="NGUYỄN VĂN A"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Ngày Sinh:</label>
                          <input
                            type="text"
                            value={editableFields.dob || ''}
                            onChange={(e) => handleFieldChange('dob', e.target.value)}
                            placeholder="DD/MM/YYYY"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Giới Tính:</label>
                          <select
                            value={editableFields.gender || 'Nữ'}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                          >
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Nơi Thường Trú (Địa chỉ ghi Hợp đồng) <span className="text-rose-500">*</span>:
                        </label>
                        <textarea
                          rows={2}
                          value={editableFields.permanentAddress || ''}
                          onChange={(e) => handleFieldChange('permanentAddress', e.target.value)}
                          placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành phố"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Ngày Cấp CCCD:</label>
                        <input
                          type="text"
                          value={editableFields.issueDate || ''}
                          onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nơi Cấp:</label>
                        <input
                          type="text"
                          value={editableFields.issuePlace || 'Cục Cảnh sát QLHC về TTXH'}
                          onChange={(e) => handleFieldChange('issuePlace', e.target.value)}
                          placeholder="Cục Cảnh sát QLHC về TTXH"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Business / Company Fields */}
                  {(extractionResult.documentType === 'BUSINESS_LICENSE' || extractionResult.documentType === 'BUSINESS_HOUSEHOLD') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Tên Đơn Vị (Công Ty / Hộ Kinh Doanh) <span className="text-rose-500">*</span>:
                        </label>
                        <input
                          type="text"
                          value={editableFields.companyName || ''}
                          onChange={(e) => handleFieldChange('companyName', e.target.value)}
                          placeholder="CÔNG TY TNHH..."
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Mã Số Doanh Nghiệp / MST <span className="text-rose-500">*</span>:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editableFields.taxCode || ''}
                            onChange={(e) => handleFieldChange('taxCode', e.target.value)}
                            placeholder="0109876543"
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <button 
                            type="button"
                            onClick={() => handleCopy(editableFields.taxCode || '', 'taxCode')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg"
                          >
                            {copiedKey === 'taxCode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Người Đại Diện Pháp Luật:</label>
                        <input
                          type="text"
                          value={editableFields.legalRepresentative || ''}
                          onChange={(e) => handleFieldChange('legalRepresentative', e.target.value)}
                          placeholder="Họ và tên người đại diện"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Địa Chỉ Trụ Sở Chính (Xuất VAT):
                        </label>
                        <textarea
                          rows={2}
                          value={editableFields.headquartersAddress || ''}
                          onChange={(e) => handleFieldChange('headquartersAddress', e.target.value)}
                          placeholder="Địa chỉ trụ sở chính theo ĐKKD"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Ngày Đăng Ký:</label>
                        <input
                          type="text"
                          value={editableFields.registrationDate || ''}
                          onChange={(e) => handleFieldChange('registrationDate', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Vốn Điều Lệ:</label>
                        <input
                          type="text"
                          value={editableFields.charterCapital || ''}
                          onChange={(e) => handleFieldChange('charterCapital', e.target.value)}
                          placeholder="Ví dụ: 1.000.000.000 VNĐ"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommended Template Card */}
                {extractionResult.recommendedTemplate && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-600" />
                        Biểu Mẫu Chuẩn Theo Quy Định UpBase 2026:
                      </span>
                      <span className="font-mono text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded font-bold">
                        {extractionResult.recommendedTemplate.templateCode}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {extractionResult.recommendedTemplate.templateName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          File mẫu: {extractionResult.recommendedTemplate.sampleFileName}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-blue-950 pt-1">
                      <span className="font-semibold block">Quy chuẩn thẩm định pháp lý UpBase:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-blue-900/90">
                        {extractionResult.recommendedTemplate.legalRules.map((rule, idx) => (
                          <li key={idx}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            Dữ liệu sau khi kiểm tra có thể bấm lưu trực tiếp vào Master Data hoặc Hợp Đồng.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!extractionResult}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Áp Dụng Dữ Liệu Vào Hồ Sơ KOC</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
