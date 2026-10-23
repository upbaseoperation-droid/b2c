'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
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
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFieldChange = (key: keyof OcrExtractedFields, value: string) => {
    setEditableFields(prev => ({
      ...prev,
      [key]: value,
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
        body: JSON.stringify({ presetKey }),
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
          documentTypeHint: activeTab === 'AUTO' ? undefined : (activeTab === 'CCCD' ? 'CCCD' : 'BUSINESS_LICENSE'),
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.success && data.data) {
        setOcrError(null);
        setExtractionResult({
          ...data.data,
          fileName,
        });
        setEditableFields(data.data.fields || {});
      } else {
        setOcrError(data.error || 'Không thể bóc tách tài liệu từ ảnh');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error('[Upload OCR error]:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setOcrError('Quá trình nhận diện vượt quá 20 giây. Vui lòng thử lại với ảnh rõ nét hoặc dung lượng nhỏ hơn.');
      } else {
        const message = err instanceof Error ? err.message : 'Lỗi kết nối';
        setOcrError('Đã xảy ra lỗi khi bóc tách OCR từ ảnh: ' + message);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (!extractionResult) return;
    onApplyToContract({
      ...extractionResult,
      fields: editableFields,
    });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Đọc ảnh giấy tờ pháp lý"
      size="xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            Dữ liệu sau khi kiểm tra có thể bấm lưu trực tiếp vào Master Data hoặc hợp đồng.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-hover text-ink-2 border border-line-strong rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!extractionResult}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Áp dụng dữ liệu vào hồ sơ KOC</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Preset Selector Bar */}
        <div className="p-3 bg-sunken rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-2">Dữ liệu mẫu thử nghiệm:</span>
            <div className="inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => handleLoadPreset('CCCD_INDIVIDUAL')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                  extractionResult?.documentType === 'CCCD' && !selectedFile
                    ? 'bg-primary text-primary-fg font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Mẫu CCCD KOC
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('BUSINESS_COMPANY')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                  extractionResult?.documentType === 'BUSINESS_LICENSE' && !selectedFile
                    ? 'bg-primary text-primary-fg font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Mẫu ĐKKD công ty
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('BUSINESS_HOUSEHOLD')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                  extractionResult?.documentType === 'BUSINESS_HOUSEHOLD' && !selectedFile
                    ? 'bg-primary text-primary-fg font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Mẫu hộ kinh doanh
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-2xs text-muted flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              Bảo mật thông tin nhân thân theo luật an ninh mạng Việt Nam
            </div>
          </div>
        </div>

        {ocrError && (
          <div className="p-3 bg-danger-soft border border-danger-line text-danger rounded-xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <span>{ocrError}</span>
            </div>
            <button type="button" onClick={() => setOcrError(null)} className="text-danger hover:opacity-80 font-semibold">×</button>
          </div>
        )}

        {/* Modal Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload / Preview Area */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Tải lên bản chụp CCCD hoặc giấy phép ĐKKD thực tế
              </label>
            </div>

            {/* Target Hint Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-sunken rounded-lg text-xs border border-line">
              <button
                type="button"
                onClick={() => setActiveTab('AUTO')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center ${
                  activeTab === 'AUTO' ? 'bg-surface text-primary font-semibold' : 'text-ink-2'
                }`}
              >
                Tự động
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CCCD')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center ${
                  activeTab === 'CCCD' ? 'bg-surface text-primary font-semibold' : 'text-ink-2'
                }`}
              >
                CCCD cá nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('BUSINESS')}
                className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center ${
                  activeTab === 'BUSINESS' ? 'bg-surface text-primary font-semibold' : 'text-ink-2'
                }`}
              >
                ĐKKD / hộ KD
              </button>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors relative overflow-hidden group ${
                previewUrl
                  ? 'border-info-line bg-info-soft/20'
                  : 'border-line-strong hover:border-primary bg-sunken hover:bg-hover'
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
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-line bg-sunken flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview tài liệu"
                    className="w-full h-full object-contain"
                    onError={() => setImageLoadError(true)}
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-ink/40 pointer-events-none flex flex-col items-center justify-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-surface text-ink text-xs font-semibold flex items-center gap-2 border border-line">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        Đang quét ký tự Tesseract...
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-surface/90 text-ink border border-line rounded text-2xs font-medium backdrop-blur-xs">
                    Nhấp để đổi ảnh khác
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-line bg-sunken flex flex-col items-center justify-center p-4">
                  <FileText className="w-12 h-12 text-success mb-2" />
                  <span className="text-xs font-semibold text-ink text-center truncate max-w-full px-2">
                    {selectedFile.name}
                  </span>
                  <span className="text-2xs text-muted mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                  {isScanning && (
                    <div className="absolute inset-0 bg-ink/40 pointer-events-none flex flex-col items-center justify-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-surface text-ink text-xs font-semibold flex items-center gap-2 border border-line">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        Đang quét ký tự Tesseract...
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-surface/90 text-ink border border-line rounded text-2xs font-medium backdrop-blur-xs">
                    Nhấp để đổi tệp khác
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-full bg-info-soft text-primary flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-ink">
                    Kéo &amp; thả ảnh vào đây hoặc <span className="text-primary underline">chọn từ máy tính</span>
                  </div>
                  <p className="text-2xs text-muted max-w-xs mx-auto">
                    Hỗ trợ ảnh chụp CCCD 2 mặt, giấy phép ĐKKD công ty hoặc hộ kinh doanh
                  </p>
                </div>
              )}
            </div>

            {/* Quick Upload Info / File Name */}
            {extractionResult?.fileName && (
              <div className="p-3 rounded-xl bg-sunken border border-line text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-muted shrink-0" />
                  <span className="font-medium text-ink-2 truncate">
                    {extractionResult.fileName}
                  </span>
                </div>
                <span className="text-2xs font-medium text-positive tabular-nums shrink-0">
                  Độ tin cậy {Math.round((extractionResult.confidence || 0.85) * 100)}%
                </span>
              </div>
            )}

            {/* Validation Tips Box */}
            {extractionResult && (
              <div className="p-3.5 rounded-xl bg-sunken border border-line space-y-2 text-xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Nhật ký kiểm tra thông tin:
                </span>
                <ul className="space-y-1 text-2xs text-ink-2 list-disc pl-4">
                  {extractionResult.validationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw Text Preview Collapsible */}
            {extractionResult?.rawTextPreview && (
              <div className="border border-line rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full px-3 py-2 bg-sunken hover:bg-hover flex items-center justify-between font-semibold text-ink-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted" />
                    Xem văn bản thô bóc tách từ ảnh
                  </span>
                  {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showRawText && (
                  <pre className="p-3 bg-sunken text-ink border-t border-line text-2xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
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
              <div className="p-8 rounded-2xl border-2 border-dashed border-line bg-sunken text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-info-soft text-primary flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-ink">
                  Chưa có dữ liệu giấy tờ nào được bóc tách
                </h4>
                <div className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Vui lòng tải ảnh CCCD / ĐKKD ở khung bên trái hoặc nhấp vào một trong các nút mẫu thử nghiệm phía trên để xem demo.
                </div>
              </div>
            )}

            {isScanning && (
              <div className="p-12 rounded-2xl border border-success-line bg-success-soft/50 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-success animate-spin mx-auto" />
                <h4 className="text-sm font-semibold text-ink">
                  Đang đọc thông tin từ ảnh chụp...
                </h4>
                <div className="text-xs text-ink-2 max-w-sm mx-auto leading-relaxed">
                  Hệ thống đang đọc thông tin từ ảnh trên máy chủ Upbase, trích xuất số CCCD/MST, họ tên, ngày sinh và địa chỉ...
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-soft text-success text-2xs font-semibold border border-success-line">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Xử lý nội bộ — Không gửi dữ liệu ra bên ngoài
                </div>
              </div>
            )}

            {extractionResult && (
              <>
                {/* Document Type Badge & Status */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-sunken border border-line">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-semibold text-xs shrink-0">
                      {extractionResult.documentType === 'CCCD' ? 'ID' : 'DN'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-ink block">
                        {extractionResult.documentTypeLabel}
                      </span>
                      <span className="text-2xs text-muted">
                        {extractionResult.documentType === 'CCCD' ? 'Cá nhân (Căn cước công dân)' : 'Pháp nhân kinh doanh / Hộ kinh doanh'}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                    Đã trích xuất
                  </span>
                </div>

                {/* Form Editing Notice */}
                <div className="p-2.5 rounded-xl bg-info-soft border border-info-line text-xs text-info flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-2xs leading-relaxed">
                    Dữ liệu được trích xuất tự động từ ảnh. Bạn có thể <strong>chỉnh sửa trực tiếp</strong> các ô bên dưới nếu ảnh chụp bị mờ hoặc có sai sót trước khi bấm lưu.
                  </span>
                </div>

                {/* Extracted Fields Form */}
                <div className="space-y-3 bg-surface border border-line rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-ink pb-2 border-b border-line flex items-center justify-between">
                    <span>Thông tin pháp lý bóc tách được:</span>
                    <span className="text-2xs text-muted font-normal">Cho phép chỉnh sửa</span>
                  </h4>

                  {/* Individual (CCCD) Fields */}
                  {extractionResult.documentType === 'CCCD' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Số CCCD / số định danh (12 số) <span className="text-danger">*</span>:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editableFields.idNumber || ''}
                            onChange={(e) => handleFieldChange('idNumber', e.target.value)}
                            placeholder="Ví dụ: 001201004567"
                            className="flex-1 px-3 py-2 bg-sunken border border-line-strong rounded-lg font-mono text-ink font-semibold text-sm focus:outline-none focus:border-primary focus:bg-surface"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(editableFields.idNumber || '', 'idNumber')}
                            className="p-2 text-muted hover:text-primary border border-line rounded-lg hover:bg-hover"
                            title="Sao chép"
                          >
                            {copiedKey === 'idNumber' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Họ và tên in hoa <span className="text-danger">*</span>:
                        </label>
                        <input
                          type="text"
                          value={editableFields.fullName || ''}
                          onChange={(e) => handleFieldChange('fullName', e.target.value)}
                          placeholder="NGUYỄN VĂN A"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg font-semibold text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-2xs font-semibold text-ink-2 block mb-1">Ngày sinh:</label>
                          <input
                            type="text"
                            value={editableFields.dob || ''}
                            onChange={(e) => handleFieldChange('dob', e.target.value)}
                            placeholder="DD/MM/YYYY"
                            className="w-full px-2.5 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-2xs font-semibold text-ink-2 block mb-1">Giới tính:</label>
                          <select
                            value={editableFields.gender || 'Nữ'}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            className="w-full px-2 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                          >
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Nơi thường trú (địa chỉ ghi hợp đồng) <span className="text-danger">*</span>:
                        </label>
                        <textarea
                          rows={2}
                          value={editableFields.permanentAddress || ''}
                          onChange={(e) => handleFieldChange('permanentAddress', e.target.value)}
                          placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành phố"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs leading-relaxed focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">Ngày cấp CCCD:</label>
                        <input
                          type="text"
                          value={editableFields.issueDate || ''}
                          onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-2.5 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">Nơi cấp:</label>
                        <input
                          type="text"
                          value={editableFields.issuePlace || 'Cục Cảnh sát QLHC về TTXH'}
                          onChange={(e) => handleFieldChange('issuePlace', e.target.value)}
                          placeholder="Cục Cảnh sát QLHC về TTXH"
                          className="w-full px-2.5 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>
                    </div>
                  )}

                  {/* Business / Company Fields */}
                  {(extractionResult.documentType === 'BUSINESS_LICENSE' || extractionResult.documentType === 'BUSINESS_HOUSEHOLD') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Tên đơn vị (công ty / hộ kinh doanh) <span className="text-danger">*</span>:
                        </label>
                        <input
                          type="text"
                          value={editableFields.companyName || ''}
                          onChange={(e) => handleFieldChange('companyName', e.target.value)}
                          placeholder="CÔNG TY TNHH..."
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg font-semibold text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Mã số doanh nghiệp / MST <span className="text-danger">*</span>:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editableFields.taxCode || ''}
                            onChange={(e) => handleFieldChange('taxCode', e.target.value)}
                            placeholder="0109876543"
                            className="flex-1 px-3 py-1.5 bg-sunken border border-line-strong rounded-lg font-mono text-ink font-semibold focus:outline-none focus:border-primary focus:bg-surface"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(editableFields.taxCode || '', 'taxCode')}
                            className="p-1.5 text-muted hover:text-primary border border-line rounded-lg"
                          >
                            {copiedKey === 'taxCode' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">Người đại diện pháp luật:</label>
                        <input
                          type="text"
                          value={editableFields.legalRepresentative || ''}
                          onChange={(e) => handleFieldChange('legalRepresentative', e.target.value)}
                          placeholder="Họ và tên người đại diện"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg font-semibold text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">
                          Địa chỉ trụ sở chính (xuất VAT):
                        </label>
                        <textarea
                          rows={2}
                          value={editableFields.headquartersAddress || ''}
                          onChange={(e) => handleFieldChange('headquartersAddress', e.target.value)}
                          placeholder="Địa chỉ trụ sở chính theo ĐKKD"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs leading-relaxed focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">Ngày đăng ký:</label>
                        <input
                          type="text"
                          value={editableFields.registrationDate || ''}
                          onChange={(e) => handleFieldChange('registrationDate', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-ink-2 block mb-1">Vốn điều lệ:</label>
                        <input
                          type="text"
                          value={editableFields.charterCapital || ''}
                          onChange={(e) => handleFieldChange('charterCapital', e.target.value)}
                          placeholder="Ví dụ: 1.000.000.000 VNĐ"
                          className="w-full px-3 py-1.5 bg-sunken border border-line-strong rounded-lg text-ink text-xs focus:outline-none focus:border-primary focus:bg-surface"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommended Template Card */}
                {extractionResult.recommendedTemplate && (
                  <div className="p-4 rounded-xl bg-info-soft border border-info-line space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-info flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-primary" />
                        Biểu mẫu chuẩn theo quy định Upbase 2026:
                      </span>
                      <span className="font-mono text-2xs text-ink-2 font-medium">
                        {extractionResult.recommendedTemplate.templateCode}
                      </span>
                    </div>

                    <div className="bg-surface p-2.5 rounded-lg border border-line flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-ink block">
                          {extractionResult.recommendedTemplate.templateName}
                        </span>
                        <span className="text-2xs text-muted font-mono">
                          File mẫu: {extractionResult.recommendedTemplate.sampleFileName}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-2xs text-ink-2 pt-1">
                      <span className="font-semibold block text-ink">Quy chuẩn thẩm định pháp lý Upbase:</span>
                      <ul className="list-disc pl-4 space-y-0.5">
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
      </div>
    </Modal>
  );
};
