'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileScan,
  FileText,
  Maximize2,
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
  flush?: boolean;
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
  flush = false,
  defaultExpandPreview = false,
  onExtractOcrFields,
  title = 'Giấy tờ pháp lý (CCCD / ĐKKD)',
}) => {
  const [uploadingCategory, setUploadingCategory] = useState<LegalDocCategory | null>(null);
  const [pendingCategory, setPendingCategory] = useState<LegalDocCategory>('CCCD_FRONT');
  const [autoReadOnUpload, setAutoReadOnUpload] = useState<boolean>(false);
  const [readingDocId, setReadingDocId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [noticeMsg, setNoticeMsg] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<LegalDocAttachment | null>(null);
  const [inlinePreviewOpen, setInlinePreviewOpen] = useState<boolean>(defaultExpandPreview);
  const [selectedDocId, setSelectedDocId] = useState<string>(attachments[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDoc =
    attachments.find((a) => a.id === selectedDocId) || attachments[0] || null;

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
          onExtractOcrFields(
            json.data.fields as OcrExtractedFields,
            json.data.documentTypeLabel || docLabel,
          );
          setNoticeMsg(`Đã lưu và điền thông tin từ ${docLabel}.`);
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
        throw new Error(json.error || 'Không tải được tệp giấy tờ. Vui lòng thử lại.');
      }

      const uploaded: LegalDocAttachment = json.attachment;
      const nextList = [
        ...attachments.filter((item) => item.id !== uploaded.id && item.docType !== uploaded.docType),
        uploaded,
      ];
      onChange(nextList);
      setSelectedDocId(uploaded.id);
      setInlinePreviewOpen(true);
      setNoticeMsg(`Đã lưu "${uploaded.label}".`);

      if (autoReadOnUpload && onExtractOcrFields && file.type.startsWith('image/')) {
        await runOcrForFile(file, uploaded.label);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không tải được tệp giấy tờ. Vui lòng thử lại.');
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
      const next = attachments.filter((item) => item.id !== doc.id);
      onChange(next);
      if (selectedDocId === doc.id) {
        setSelectedDocId(next[0]?.id || '');
      }
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
        setNoticeMsg(`Đã điền thông tin từ "${doc.label}".`);
      } else {
        setErrorMsg(json.error || 'Không đọc được thông tin từ tệp này.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Lỗi khi đọc thông tin tệp.');
    } finally {
      setReadingDocId(null);
    }
  };

  const uploadSlots: Array<{ cat: LegalDocCategory; shortLabel: string }> =
    legalType === 'INDIVIDUAL'
      ? [
          { cat: 'CCCD_FRONT', shortLabel: 'CCCD trước' },
          { cat: 'CCCD_BACK', shortLabel: 'CCCD sau' },
          { cat: 'DKKD', shortLabel: 'ĐKKD' },
        ]
      : [
          { cat: 'DKKD', shortLabel: 'Giấy ĐKKD' },
          { cat: 'CCCD_FRONT', shortLabel: 'CCCD trước' },
          { cat: 'CCCD_BACK', shortLabel: 'CCCD sau' },
          { cat: 'AUTHORIZATION', shortLabel: 'Ủy quyền' },
        ];

  return (
    <div
      className={
        flush
          ? 'border-t border-line bg-sunken/20 px-4 py-3 space-y-2.5 text-xs'
          : 'rounded-xl border border-line bg-surface p-3.5 space-y-3 text-xs'
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,image/*,application/pdf"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Thanh tiêu đề & nút tải giấy tờ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{title}</span>
          <span className="text-2xs text-ink-3">
            ({attachments.length > 0 ? `${attachments.length} tệp` : 'Chưa đính kèm'})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {editable &&
            onChange &&
            uploadSlots.map((slot) => {
              const isBusy = uploadingCategory === slot.cat;
              const exists = attachments.some((a) => a.docType === slot.cat);
              return (
                <button
                  key={slot.cat}
                  type="button"
                  disabled={uploadingCategory !== null}
                  onClick={() => triggerUploadForCategory(slot.cat, false)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:text-ink hover:bg-sunken transition-colors"
                >
                  <Upload className="w-3 h-3 text-ink-3 shrink-0" />
                  {isBusy ? 'Đang tải...' : exists ? `Đổi ${slot.shortLabel}` : `Tải ${slot.shortLabel}`}
                </button>
              );
            })}

          {editable && onChange && onExtractOcrFields && (
            <button
              type="button"
              disabled={uploadingCategory !== null}
              onClick={() =>
                triggerUploadForCategory(
                  legalType === 'INDIVIDUAL' ? 'CCCD_FRONT' : 'DKKD',
                  true,
                )
              }
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-surface text-2xs font-medium text-accent hover:bg-sunken transition-colors"
            >
              <FileScan className="w-3 h-3 shrink-0" />
              Đọc ảnh CCCD
            </button>
          )}
        </div>
      </div>

      {noticeMsg && (
        <div className="rounded-md bg-positive-soft px-2.5 py-1.5 text-2xs text-positive font-medium flex items-center justify-between gap-2">
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
        <div className="rounded-md bg-critical-soft px-2.5 py-1.5 text-2xs text-critical font-medium">
          {errorMsg}
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-sunken/30 px-3 py-3 text-2xs text-ink-3 flex flex-wrap items-center justify-between gap-2">
          <span>Chưa có tệp CCCD hoặc Giấy phép ĐKKD đính kèm.</span>
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
              Tải ảnh giấy tờ
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Danh sách tệp gọn trên một hàng chọn */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {attachments.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                const isDkkd = doc.docType === 'DKKD';
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      if (defaultExpandPreview) {
                        setInlinePreviewOpen(true);
                      } else {
                        setPreviewDoc(doc);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-2xs font-medium transition-colors ${
                      isSelected && inlinePreviewOpen
                        ? 'border-primary bg-primary text-white'
                        : 'border-line bg-surface text-ink hover:bg-sunken'
                    }`}
                  >
                    {isDkkd ? (
                      <Building2 className="w-3 h-3 shrink-0" />
                    ) : (
                      <FileText className="w-3 h-3 shrink-0" />
                    )}
                    <span>{doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType]}</span>
                  </button>
                );
              })}
            </div>

            {activeDoc && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(activeDoc)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:text-ink hover:bg-sunken"
                >
                  <Maximize2 className="w-3 h-3" />
                  Phóng to
                </button>
                {editable && onExtractOcrFields && (
                  <button
                    type="button"
                    disabled={readingDocId === activeDoc.id}
                    onClick={() => void handleReadExistingAttachment(activeDoc)}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:text-ink hover:bg-sunken"
                    title="Đọc thông tin từ giấy tờ này"
                  >
                    <FileScan className="w-3 h-3" />
                    Đọc ảnh
                  </button>
                )}
                <a
                  href={`${activeDoc.url}${activeDoc.url.includes('?') ? '&' : '?'}download=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-line bg-surface text-ink-2 hover:text-ink hover:bg-sunken"
                  title="Tải tệp gốc"
                >
                  <Download className="w-3 h-3" />
                </a>
                {editable && onChange && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteAttachment(activeDoc)}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft/40"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Khung xem trực tiếp hoặc danh sách gọn */}
          {inlinePreviewOpen && activeDoc ? (
            <div className="rounded-lg border border-line bg-sunken/40 overflow-hidden">
              <div
                onClick={() => setPreviewDoc(activeDoc)}
                className={`p-3 flex items-center justify-center cursor-pointer hover:bg-sunken/70 transition-colors ${
                  compact ? 'min-h-[180px]' : 'min-h-[260px]'
                }`}
                title="Bấm vào ảnh để phóng to"
              >
                {activeDoc.mimeType === 'application/pdf' ||
                activeDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={activeDoc.url}
                    title={activeDoc.fileName}
                    className="w-full h-64 rounded border border-line bg-surface pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeDoc.url}
                    alt={activeDoc.label}
                    className={`${compact ? 'max-h-48' : 'max-h-72'} w-auto object-contain rounded border border-line bg-surface`}
                  />
                )}
              </div>
              <div className="px-3 py-1.5 border-t border-line bg-surface flex items-center justify-between gap-2 text-2xs text-ink-3">
                <span className="truncate font-code text-ink-2">
                  {activeDoc.fileName} · {formatFileSize(activeDoc.fileSize)} · {formatUploadDate(activeDoc.uploadedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(activeDoc)}
                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  Xem toàn màn hình
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-lg border border-line bg-surface">
              {attachments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-canvas cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-ink block truncate">
                      {doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType]}
                    </span>
                    <span className="text-2xs text-ink-3 font-code block truncate">
                      {doc.fileName} · {formatFileSize(doc.fileSize)} · {formatUploadDate(doc.uploadedAt)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-accent shrink-0">
                    <Eye className="w-3 h-3" />
                    Xem
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {previewDoc && (
        <LegalDocPreviewModal
          attachments={attachments}
          activeDoc={previewDoc}
          onSelectDoc={(doc) => {
            setPreviewDoc(doc);
            setSelectedDocId(doc.id);
          }}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

export function LegalDocPreviewModal({
  attachments,
  activeDoc,
  onSelectDoc,
  onClose,
  profileLabel,
}: {
  attachments: LegalDocAttachment[];
  activeDoc: LegalDocAttachment;
  onSelectDoc?: (doc: LegalDocAttachment) => void;
  onClose: () => void;
  profileLabel?: string;
}) {
  const docList = attachments.length > 0 ? attachments : [activeDoc];
  const isPdf =
    activeDoc.mimeType === 'application/pdf' ||
    activeDoc.fileName.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      open
      onClose={onClose}
      title={`${activeDoc.label || LEGAL_DOC_CATEGORY_LABEL[activeDoc.docType]}${
        profileLabel ? ` · ${profileLabel}` : ''
      }`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full text-xs">
          <span className="text-2xs font-code text-ink-3 truncate">
            {activeDoc.fileName} · {formatFileSize(activeDoc.fileSize)} · {formatUploadDate(activeDoc.uploadedAt)}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={activeDoc.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line-strong bg-surface text-ink font-medium text-2xs hover:bg-sunken"
            >
              <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
              Mở tab mới
            </a>
            <a
              href={`${activeDoc.url}${activeDoc.url.includes('?') ? '&' : '?'}download=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line-strong bg-surface text-ink font-medium text-2xs hover:bg-sunken"
            >
              <Download className="w-3.5 h-3.5 text-ink-3" />
              Tải tệp gốc
            </a>
            <Button size="sm" variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {docList.length > 1 && onSelectDoc && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
            <div className="flex flex-wrap items-center gap-1.5">
              {docList.map((doc) => {
                const isSelected = doc.id === activeDoc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onSelectDoc(doc)}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-2xs font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-line bg-surface text-ink hover:bg-sunken'
                    }`}
                  >
                    <span>{doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType]}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-2xs text-ink-3">{docList.length} tệp</span>
          </div>
        )}

        <div className="rounded-lg border border-line bg-sunken/40 p-3 flex items-center justify-center min-h-[380px] overflow-auto">
          {isPdf ? (
            <iframe
              src={activeDoc.url}
              title={activeDoc.fileName}
              className="w-full h-[500px] rounded border border-line bg-surface"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeDoc.url}
              alt={activeDoc.label}
              className="max-w-full max-h-[500px] object-contain rounded border border-line bg-surface"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

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
      <div className="rounded-lg border border-line bg-sunken/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-positive shrink-0" />
          <span className="font-semibold text-positive">{summary.headline}</span>
          <span className="text-ink-2 truncate">
            · Khớp CCCD/MST &amp; số tài khoản với HĐ đã ký{match ? ` (${match.id})` : ''} — miễn kiểm tra lại từ đầu.
          </span>
        </div>
        {match && onOpenPriorContract && (
          <button
            type="button"
            onClick={() => onOpenPriorContract(match.id)}
            className="text-2xs font-medium text-accent hover:underline shrink-0"
          >
            Xem HĐ cũ ({match.id}) →
          </button>
        )}
      </div>
    );
  }

  if (summary.status === 'PROFILE_CHANGED') {
    const prior = summary.priorKocContract;
    return (
      <div className="rounded-lg border border-line bg-sunken/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-critical shrink-0" />
          <span className="font-semibold text-critical">{summary.headline}</span>
          <span className="text-ink-2 truncate">· {summary.detailMessage}</span>
        </div>
        {prior && onOpenPriorContract && (
          <button
            type="button"
            onClick={() => onOpenPriorContract(prior.id)}
            className="text-2xs font-medium text-critical hover:underline shrink-0"
          >
            Đối chiếu HĐ cũ ({prior.id}) →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-sunken/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span className="font-semibold text-ink">{summary.headline}</span>
        <span className="text-ink-2 truncate">
          · Chưa có hợp đồng đã ký với bộ hồ sơ pháp lý này — cần đối chiếu ảnh CCCD / ĐKKD.
        </span>
      </div>
    </div>
  );
}
