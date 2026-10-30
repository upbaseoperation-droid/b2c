'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  FileScan,
  FileText,
  HardDrive,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import type { LegalDocAttachment, LegalDocCategory, OcrExtractedFields } from '../../lib/types';
import type { LegalProfileSigningHistorySummary } from '../../lib/contracts/legalProfileHistory';
import { Button, Modal, Status } from '../ui';

export const LEGAL_DOC_CATEGORY_LABEL: Record<LegalDocCategory, string> = {
  CCCD_FRONT: 'CCCD mặt trước',
  CCCD_BACK: 'CCCD mặt sau',
  CCCD_SCAN: 'Bản scan CCCD 2 mặt',
  DKKD: 'Giấy phép ĐKKD / HKD',
  AUTHORIZATION: 'Giấy ủy quyền ký HĐ',
  TAX_COMMITMENT: 'Cam kết / Hồ sơ thuế',
};

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUploadDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export interface LegalAttachmentsPanelProps {
  attachments: LegalDocAttachment[];
  onChange?: (next: LegalDocAttachment[]) => void;
  entitySlug?: string;
  legalType?: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  editable?: boolean;
  compact?: boolean;
  defaultExpandPreview?: boolean;
  onExtractOcrFields?: (fields: OcrExtractedFields, docTypeLabel?: string) => void;
  title?: string;
}

export const LegalAttachmentsPanel: React.FC<LegalAttachmentsPanelProps> = ({
  attachments = [],
  onChange,
  entitySlug = 'koc-legal',
  legalType = 'INDIVIDUAL',
  editable = false,
  compact = false,
  defaultExpandPreview = false,
  onExtractOcrFields,
  title = 'Tệp đính kèm CCCD & ĐKKD (Cloudflare R2)',
}) => {
  const [uploadingCategory, setUploadingCategory] = useState<LegalDocCategory | null>(null);
  const [pendingCategory, setPendingCategory] = useState<LegalDocCategory>('CCCD_FRONT');
  const [autoReadOnUpload, setAutoReadOnUpload] = useState<boolean>(false);
  const [readingDocId, setReadingDocId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [noticeMsg, setNoticeMsg] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<LegalDocAttachment | null>(null);
  const [inlinePreviewOpen, setInlinePreviewOpen] = useState<boolean>(defaultExpandPreview);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasCccd = attachments.some((a) =>
    ['CCCD_FRONT', 'CCCD_BACK', 'CCCD_SCAN'].includes(a.docType),
  );
  const hasDkkd = attachments.some((a) => a.docType === 'DKKD');

  const triggerUploadForCategory = (cat: LegalDocCategory, withOcr = false) => {
    setPendingCategory(cat);
    setAutoReadOnUpload(withOcr);
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const runOcrForFile = async (file: File, docLabel: string) => {
    if (!onExtractOcrFields) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      if (!base64) return;
      try {
        const res = await fetch('/api/ocr/extract-legal-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, fileName: file.name }),
        });
        const json = await res.json();
        if (json.success && json.data?.fields) {
          onExtractOcrFields(json.data.fields as OcrExtractedFields, json.data.documentTypeLabel || docLabel);
          setNoticeMsg(`Đã lưu tệp lên Cloudflare R2 và điền thông tin từ ${docLabel}.`);
        }
      } catch {
        // Không chặn luồng lưu R2 nếu đọc ảnh lỗi
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onChange) return;

    setUploadingCategory(pendingCategory);
    setErrorMsg('');
    setNoticeMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', pendingCategory);
      formData.append('entitySlug', entitySlug || 'koc-legal');
      formData.append('label', LEGAL_DOC_CATEGORY_LABEL[pendingCategory]);

      const res = await fetch('/api/contracts/legal-docs', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.attachment) {
        throw new Error(json.error || 'Không thể tải tệp lên Cloudflare R2.');
      }

      const uploaded: LegalDocAttachment = json.attachment;
      const nextList = [
        ...attachments.filter((item) => item.id !== uploaded.id),
        uploaded,
      ];
      onChange(nextList);

      const storageLabel = uploaded.storage === 'R2' ? 'Cloudflare R2' : 'Kho dự phòng R2';
      setNoticeMsg(`Đã tải "${uploaded.fileName}" (${uploaded.label}) lên ${storageLabel}.`);

      if (autoReadOnUpload && onExtractOcrFields && file.type.startsWith('image/')) {
        await runOcrForFile(file, uploaded.label);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Lỗi khi tải tệp lên Cloudflare R2.');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteAttachment = async (doc: LegalDocAttachment) => {
    if (!onChange) return;
    setErrorMsg('');
    try {
      await fetch(`/api/contracts/legal-docs?key=${encodeURIComponent(doc.fileKey)}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      onChange(attachments.filter((item) => item.id !== doc.id));
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không xóa được tệp đính kèm.');
    }
  };

  const handleReadExistingAttachment = async (doc: LegalDocAttachment) => {
    if (!onExtractOcrFields) return;
    setReadingDocId(doc.id);
    setErrorMsg('');
    try {
      const presetKey =
        doc.docType === 'DKKD'
          ? legalType === 'HOUSEHOLD'
            ? 'BUSINESS_HOUSEHOLD'
            : 'BUSINESS_COMPANY'
          : 'CCCD_INDIVIDUAL';
      const res = await fetch('/api/ocr/extract-legal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: doc.fileName, presetKey }),
      });
      const json = await res.json();
      if (json.success && json.data?.fields) {
        onExtractOcrFields(json.data.fields as OcrExtractedFields, doc.label);
        setNoticeMsg(`Đã trích xuất thông tin từ "${doc.fileName}" vào hồ sơ.`);
      } else {
        setErrorMsg(json.error || 'Không đọc được thông tin từ tệp này.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Lỗi khi đọc thông tin tệp.');
    } finally {
      setReadingDocId(null);
    }
  };

  const quickButtons: Array<{ cat: LegalDocCategory; label: string }> =
    legalType === 'INDIVIDUAL'
      ? [
          { cat: 'CCCD_FRONT', label: 'Tải CCCD mặt trước' },
          { cat: 'CCCD_BACK', label: 'Tải CCCD mặt sau' },
          { cat: 'DKKD', label: 'Tải ĐKKD (nếu có)' },
          { cat: 'AUTHORIZATION', label: 'Tải Giấy ủy quyền' },
        ]
      : [
          { cat: 'DKKD', label: 'Tải Giấy phép ĐKKD / HKD' },
          { cat: 'CCCD_FRONT', label: 'CCCD Đại diện (Mặt trước)' },
          { cat: 'CCCD_BACK', label: 'CCCD Đại diện (Mặt sau)' },
          { cat: 'AUTHORIZATION', label: 'Tải Giấy ủy quyền ký HĐ' },
        ];

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3 text-xs">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,image/*,application/pdf"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Tiêu đề & Trạng thái đủ giấy tờ trên Cloudflare R2 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Cloud className="w-4 h-4 text-accent shrink-0" />
          <span className="font-semibold text-ink">{title}</span>
          <Status tone={attachments.length > 0 ? 'positive' : 'warning'}>
            {attachments.length > 0
              ? `Đã đính kèm ${attachments.length} tệp`
              : 'Chưa đính kèm CCCD / ĐKKD'}
          </Status>
          {legalType !== 'INDIVIDUAL' && (
            <Status tone={hasDkkd ? 'positive' : 'warning'}>
              {hasDkkd ? 'Đã có ĐKKD' : 'Cần bổ sung ĐKKD'}
            </Status>
          )}
          {hasCccd && (
            <Status tone="info">Đã có CCCD</Status>
          )}
        </div>

        <div className="flex items-center gap-2">
          {attachments.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              icon={Eye}
              onClick={() => setInlinePreviewOpen((v) => !v)}
            >
              {inlinePreviewOpen ? 'Thu gọn ảnh CCCD/ĐKKD' : 'Xem ảnh CCCD/ĐKKD trực tiếp'}
            </Button>
          )}
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-ink-2 bg-sunken px-2 py-0.5 rounded border border-line">
            <Cloud className="w-3 h-3 text-accent" />
            Lưu trữ Cloudflare R2
          </span>
        </div>
      </div>

      {/* Thanh nút tải nhanh CCCD / ĐKKD */}
      {editable && onChange && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {quickButtons.map((btn) => {
            const isBusy = uploadingCategory === btn.cat;
            const alreadyHas = attachments.some((a) => a.docType === btn.cat);
            return (
              <Button
                key={btn.cat}
                size="sm"
                variant={alreadyHas ? 'secondary' : 'primary'}
                icon={Upload}
                disabled={uploadingCategory !== null}
                onClick={() => triggerUploadForCategory(btn.cat, false)}
              >
                {isBusy ? 'Đang tải lên R2...' : alreadyHas ? `Đổi ${btn.label}` : btn.label}
              </Button>
            );
          })}
          {onExtractOcrFields && (
            <Button
              size="sm"
              variant="secondary"
              icon={FileScan}
              disabled={uploadingCategory !== null}
              onClick={() =>
                triggerUploadForCategory(
                  legalType === 'INDIVIDUAL' ? 'CCCD_FRONT' : 'DKKD',
                  true,
                )
              }
            >
              Tải lên R2 &amp; Đọc ảnh giấy tờ
            </Button>
          )}
        </div>
      )}

      {noticeMsg && (
        <div className="rounded-lg bg-positive-soft border border-positive/30 px-3 py-1.5 text-2xs text-positive font-medium flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {noticeMsg}
          </span>
          <button
            type="button"
            onClick={() => setNoticeMsg('')}
            className="text-ink-3 hover:text-ink"
          >
            Đóng
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-critical-soft border border-critical/30 px-3 py-1.5 text-2xs text-critical font-medium">
          {errorMsg}
        </div>
      )}

      {/* Danh sách tệp CCCD & ĐKKD đã đính kèm */}
      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-sunken/40 px-3.5 py-3 text-2xs text-ink-3 flex flex-wrap items-center justify-between gap-2">
          <span>
            Chưa có tệp ảnh/PDF CCCD hoặc Giấy phép ĐKKD trong hồ sơ pháp lý này.
          </span>
          {editable && onChange && (
            <Button
              size="sm"
              variant="secondary"
              icon={Upload}
              onClick={() =>
                triggerUploadForCategory(
                  legalType === 'INDIVIDUAL' ? 'CCCD_FRONT' : 'DKKD',
                  false,
                )
              }
            >
              Chọn tệp tải lên R2
            </Button>
          )}
        </div>
      ) : (
        <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'}>
          {attachments.map((doc) => {
            const isDkkd = doc.docType === 'DKKD';
            const isImage =
              doc.mimeType?.startsWith('image/') ||
              /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(doc.fileName);
            return (
              <div
                key={doc.id}
                className="rounded-lg border border-line bg-sunken/40 p-2.5 space-y-2 hover:border-line-strong transition-colors"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0 mt-0.5">
                      {isDkkd ? (
                        <Building2 className="w-4 h-4 text-accent" />
                      ) : (
                        <FileText className="w-4 h-4 text-positive" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-ink text-xs">
                          {doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType] || 'Giấy tờ pháp lý'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface border border-line text-2xs font-mono text-ink-2">
                          {doc.storage === 'R2' ? (
                            <>
                              <Cloud className="w-3 h-3 text-accent" />
                              R2
                            </>
                          ) : (
                            <>
                              <HardDrive className="w-3 h-3 text-ink-3" />
                              R2 Local
                            </>
                          )}
                        </span>
                      </div>
                      <div
                        className="text-2xs text-ink-2 truncate max-w-[240px]"
                        title={`${doc.fileName} (${doc.fileKey})`}
                      >
                        {doc.fileName}
                      </div>
                      <div className="text-2xs text-ink-3 flex flex-wrap items-center gap-1.5">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>·</span>
                        <span>{formatUploadDate(doc.uploadedAt)}</span>
                        {doc.uploadedBy && (
                          <>
                            <span>·</span>
                            <span>{doc.uploadedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => setPreviewDoc(doc)}
                    >
                      Phóng to
                    </Button>
                    {editable && onExtractOcrFields && isImage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={FileScan}
                        disabled={readingDocId === doc.id}
                        onClick={() => void handleReadExistingAttachment(doc)}
                      >
                        {readingDocId === doc.id ? 'Đang đọc...' : 'Đọc ảnh'}
                      </Button>
                    )}
                    <a
                      href={`${doc.url}${doc.url.includes('?') ? '&' : '?'}download=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-7 px-2 rounded-lg border border-line bg-surface text-ink-2 hover:text-ink hover:bg-sunken text-2xs"
                      title="Tải tệp gốc về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {editable && onChange && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteAttachment(doc)}
                        className="inline-flex items-center justify-center h-7 px-1.5 rounded-lg text-ink-3 hover:text-critical hover:bg-critical-soft/40"
                        title="Xóa tệp khỏi hồ sơ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {inlinePreviewOpen && (
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="rounded-lg border border-line bg-surface p-2 flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden"
                    title="Bấm để mở xem kích thước lớn"
                  >
                    {doc.mimeType === 'application/pdf' ||
                    doc.fileName.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={doc.url}
                        title={doc.fileName}
                        className="w-full h-44 rounded border border-line bg-surface pointer-events-none"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={doc.url}
                        alt={doc.label}
                        className="max-h-44 w-auto object-contain rounded"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hộp thoại Xem đối chiếu trực tiếp CCCD / ĐKKD trên Cloudflare R2 */}
      {previewDoc && (
        <Modal
          open
          onClose={() => setPreviewDoc(null)}
          title={`Đối chiếu giấy tờ pháp lý: ${previewDoc.label} — ${previewDoc.fileName}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full text-xs">
              <div className="flex items-center gap-2 text-ink-2 font-mono text-2xs truncate">
                <Cloud className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">Khóa lưu trữ R2: {previewDoc.fileKey}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${previewDoc.url}${previewDoc.url.includes('?') ? '&' : '?'}download=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-ink font-medium text-xs hover:bg-sunken"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải tệp gốc ({formatFileSize(previewDoc.fileSize)})
                </a>
                <Button variant="primary" onClick={() => setPreviewDoc(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-sunken border border-line">
              <div className="flex flex-wrap items-center gap-2">
                <Status tone="positive">{previewDoc.label}</Status>
                <span className="font-semibold text-ink">{previewDoc.fileName}</span>
                <span className="text-ink-3">({formatFileSize(previewDoc.fileSize)})</span>
              </div>
              <div className="text-2xs text-ink-2">
                Tải lên ngày {formatUploadDate(previewDoc.uploadedAt)}
                {previewDoc.uploadedBy ? ` bởi ${previewDoc.uploadedBy}` : ''}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-sunken/50 p-3 flex items-center justify-center min-h-[360px] overflow-auto">
              {previewDoc.mimeType === 'application/pdf' ||
              previewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.fileName}
                  className="w-full h-[480px] rounded-lg border border-line bg-surface"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.url}
                  alt={previewDoc.label}
                  className="max-w-full max-h-[480px] object-contain rounded-lg border border-line bg-surface shadow-xs"
                />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export function LegalProfileSigningHistoryBanner({
  summary,
  onOpenPriorContract,
}: {
  summary: LegalProfileSigningHistorySummary;
  onOpenPriorContract?: (contractId: string) => void;
}) {
  if (summary.status === 'SIGNED_VERIFIED' || summary.status === 'FINANCE_VERIFIED') {
    const match = summary.latestMatch;
    return (
      <div className="rounded-xl border border-positive/40 bg-positive-soft/70 p-3.5 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-positive">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Gợi ý Kế toán: {summary.headline}</span>
          </div>
          <Status tone="positive">
            {summary.status === 'SIGNED_VERIFIED'
              ? 'Đã từng ký · Khớp 100% Hồ sơ pháp lý (Miễn kiểm tra lại từ đầu)'
              : 'Kế toán đã xác thực Hồ sơ pháp lý này'}
          </Status>
        </div>

        <p className="text-ink-2 leading-relaxed">{summary.detailMessage}</p>

        {match && (
          <div className="rounded-lg border border-positive/30 bg-surface px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-mono font-semibold text-ink bg-sunken px-1.5 py-0.5 rounded border border-line">
                  {match.id}
                </span>
                <span className="font-semibold text-ink truncate">{match.title}</span>
                {match.dealCode && (
                  <span className="text-2xs text-ink-3 font-mono">· Booking {match.dealCode}</span>
                )}
              </div>
              <div className="text-2xs text-ink-2">
                Trạng thái HĐ đối chứng:{' '}
                <strong className="text-positive">
                  {match.isFullySigned ? 'Đã ký hoàn tất 2 bên' : 'Đã duyệt Kế toán (FINAL)'}
                </strong>
                {match.financeApprover ? ` · Người duyệt trước: ${match.financeApprover}` : ''}
                {summary.matchedContracts.length > 1
                  ? ` · Tổng cộng ${summary.matchedContracts.length} hợp đồng trùng khớp hồ sơ pháp lý`
                  : ''}
              </div>
            </div>
            {onOpenPriorContract && (
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                onClick={() => onOpenPriorContract(match.id)}
              >
                Xem HĐ đã ký trước
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (summary.status === 'PROFILE_CHANGED') {
    const prior = summary.priorKocContract;
    return (
      <div className="rounded-xl border border-critical/40 bg-critical-soft/70 p-3.5 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-critical">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Cảnh báo Kế toán: {summary.headline}</span>
          </div>
          <Status tone="critical">Thay đổi STK / MST — Cần kiểm tra lại CCCD &amp; ĐKKD</Status>
        </div>
        <p className="text-ink-2 leading-relaxed">{summary.detailMessage}</p>
        {prior && onOpenPriorContract && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              icon={FileText}
              onClick={() => onOpenPriorContract(prior.id)}
            >
              Đối chiếu với HĐ cũ ({prior.id})
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-warning-soft/60 p-3.5 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-warning-strong">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Lưu ý Kế toán: {summary.headline}</span>
        </div>
        <Status tone="warning">Ký lần đầu — Cần đối chiếu CCCD / ĐKKD</Status>
      </div>
      <p className="text-ink-2 leading-relaxed">{summary.detailMessage}</p>
    </div>
  );
}
