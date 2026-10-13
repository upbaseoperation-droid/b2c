'use client';

/**
 * Hộp thoại sửa từng mục hồ sơ thương hiệu. Mỗi hộp thoại gửi cả mục lên máy chủ khi lưu.
 * Danh sách (sản phẩm, câu hỏi khó, pháp lý, tài liệu) dùng chung `ItemDialog` theo mô tả trường.
 */

import React, { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import type { BrandContentRules, BrandEntity, BrandPositioning, BrandRatecardRow, ToneTag } from '../../lib/brands/types';
import { formatNumber } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { formatFileSize, TONE_LABEL, uploadBrandFileClient, type UploadedBrandFileResult } from './brandUi';

const GRADES = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];
const moneyInput = (raw: string) => { const d = raw.replace(/\D/g, ''); return d ? formatNumber(Number(d)) : ''; };
const toNumber = (s: string) => (s.replace(/\D/g, '') ? Number(s.replace(/\D/g, '')) : undefined);

function Footer({ busy, onClose, onSave, label = 'Lưu' }: { busy: boolean; onClose: () => void; onSave: () => void; label?: string }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>Hủy</Button>
      <Button variant="primary" disabled={busy} onClick={onSave}>{label}</Button>
    </>
  );
}

/* --------------------------------------------------------- Định vị */

export function PositioningDialog({ open, value, busy, onClose, onSave }: { open: boolean; value?: BrandPositioning; busy: boolean; onClose: () => void; onSave: (v: BrandPositioning) => void }) {
  const [v, setV] = useState<BrandPositioning>(value || { slogan: '', story: '', toneOfVoice: '', targetAudience: '' });
  const set = <K extends keyof BrandPositioning>(k: K, x: BrandPositioning[K]) => setV(p => ({ ...p, [k]: x }));
  return (
    <Modal open={open} onClose={onClose} title="Sửa định vị & thông điệp" size="lg" footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(v)} />}>
      <Field label="Khẩu hiệu" htmlFor="bp-slogan"><Input id="bp-slogan" maxLength={200} value={v.slogan} onChange={e => set('slogan', e.target.value)} /></Field>
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <Field label="Phong cách" htmlFor="bp-tone">
          <Select id="bp-tone" value={v.toneTag || ''} onChange={e => set('toneTag', (e.target.value || undefined) as ToneTag | undefined)}>
            <option value="">Chưa chọn</option>
            {(Object.keys(TONE_LABEL) as ToneTag[]).map(t => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Giọng văn" htmlFor="bp-voice" hint="Cách KOC nên nói về nhãn: xưng hô, mức độ trang trọng, điều cần tránh.">
          <Textarea id="bp-voice" rows={2} maxLength={1000} value={v.toneOfVoice} onChange={e => set('toneOfVoice', e.target.value)} />
        </Field>
      </div>
      <Field label="Khách hàng mục tiêu" htmlFor="bp-aud"><Textarea id="bp-aud" rows={2} maxLength={1500} value={v.targetAudience} onChange={e => set('targetAudience', e.target.value)} /></Field>
      <Field label="Câu chuyện thương hiệu" htmlFor="bp-story"><Textarea id="bp-story" rows={4} maxLength={3000} value={v.story} onChange={e => set('story', e.target.value)} /></Field>
    </Modal>
  );
}

/* --------------------------------------------------------- Pháp nhân */

export function EntityDialog({ open, value, fallbackCompany, busy, onClose, onSave }: { open: boolean; value?: BrandEntity; fallbackCompany: string; busy: boolean; onClose: () => void; onSave: (v: BrandEntity) => void }) {
  const [v, setV] = useState<BrandEntity>(value || { companyName: fallbackCompany, taxCode: '', contactPerson: '', originCountry: '' });
  const set = (k: keyof BrandEntity, x: string) => setV(p => ({ ...p, [k]: x }));
  return (
    <Modal open={open} onClose={onClose} title="Sửa pháp nhân" description="Dùng khi lập hợp đồng ba bên và đối soát hóa đơn." footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(v)} />}>
      <Field label="Tên công ty" htmlFor="be-co"><Input id="be-co" maxLength={200} value={v.companyName} onChange={e => set('companyName', e.target.value)} /></Field>
      <Field label="Mã số thuế" htmlFor="be-tax" hint="10 chữ số, hoặc thêm “-” và 3 số chi nhánh."><Input id="be-tax" inputMode="numeric" maxLength={14} value={v.taxCode} onChange={e => set('taxCode', e.target.value)} className="font-code" /></Field>
      <Field label="Người liên hệ phía nhãn" htmlFor="be-ct"><Input id="be-ct" maxLength={200} value={v.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></Field>
      <Field label="Xuất xứ" htmlFor="be-org"><Input id="be-org" maxLength={100} value={v.originCountry} onChange={e => set('originCountry', e.target.value)} placeholder="Nhật Bản, Việt Nam…" /></Field>
    </Modal>
  );
}

/* --------------------------------------------------------- Trần thù lao */

export function RatecardDialog({ open, value, busy, onClose, onSave }: { open: boolean; value: BrandRatecardRow[]; busy: boolean; onClose: () => void; onSave: (v: BrandRatecardRow[]) => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(GRADES.map(g => [g, value.find(r => r.grade === g)?.maxBudget ? formatNumber(value.find(r => r.grade === g)!.maxBudget!) : ''])));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa trần thù lao"
      description="Mức tối đa cho một video theo khung lương KOC. Để trống nếu nhãn không đặt trần riêng cho khung đó."
      footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(GRADES.map(grade => ({ grade, maxBudget: toNumber(v[grade]) })))} />}
    >
      <div className="grid grid-cols-2 gap-3">
        {GRADES.map(g => (
          <Field key={g} label={g} htmlFor={`rc-${g}`}>
            <Input id={`rc-${g}`} inputMode="numeric" className="tabular-nums" placeholder="Số tiền (đ)" value={v[g]} onChange={e => setV(p => ({ ...p, [g]: moneyInput(e.target.value) }))} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Quy chuẩn nội dung */

/** Mỗi dòng một mục; cột ngăn bằng “|”. Giữ id cũ khi cụm từ không đổi. */
export function ContentRulesDialog({ open, value, busy, onClose, onSave }: { open: boolean; value?: BrandContentRules; busy: boolean; onClose: () => void; onSave: (v: BrandContentRules) => void }) {
  const v = value || { banned: [], preferred: [], visualDo: [], visualDont: [] };
  const [banned, setBanned] = useState(v.banned.map(b => [b.phrase, b.replacement, b.reason].join(' | ').replace(/( \| )+$/, '')).join('\n'));
  const [preferred, setPreferred] = useState(v.preferred.map(p => [p.phrase, p.note].join(' | ').replace(/ \| $/, '')).join('\n'));
  const [doList, setDoList] = useState(v.visualDo.join('\n'));
  const [dontList, setDontList] = useState(v.visualDont.join('\n'));
  const rows = (s: string) => s.split('\n').map(l => l.split('|').map(x => x.trim())).filter(c => c[0]);
  const save = () => onSave({
    banned: rows(banned).map(([phrase, replacement = '', reason = '']) => ({ id: v.banned.find(b => b.phrase === phrase)?.id || '', phrase, replacement, reason })),
    preferred: rows(preferred).map(([phrase, note = '']) => ({ id: v.preferred.find(p => p.phrase === phrase)?.id || '', phrase, note })),
    visualDo: doList.split('\n').map(s => s.trim()).filter(Boolean),
    visualDont: dontList.split('\n').map(s => s.trim()).filter(Boolean),
  });
  return (
    <Modal open={open} onClose={onClose} title="Sửa quy chuẩn nội dung" size="lg" footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <Field label="Từ cấm" htmlFor="cr-ban" hint="Mỗi dòng: cụm từ | thay bằng | lý do. Ví dụ: trị dứt điểm | hỗ trợ cải thiện | quảng cáo mỹ phẩm không được nói công dụng điều trị">
        <Textarea id="cr-ban" rows={6} value={banned} onChange={e => setBanned(e.target.value)} />
      </Field>
      <Field label="Cụm từ nên dùng" htmlFor="cr-pref" hint="Mỗi dòng: cụm từ | khi nào dùng.">
        <Textarea id="cr-pref" rows={4} value={preferred} onChange={e => setPreferred(e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Hình ảnh nên có" htmlFor="cr-do" hint="Mỗi dòng một ý."><Textarea id="cr-do" rows={4} value={doList} onChange={e => setDoList(e.target.value)} /></Field>
        <Field label="Hình ảnh không được dùng" htmlFor="cr-dont" hint="Mỗi dòng một ý."><Textarea id="cr-dont" rows={4} value={dontList} onChange={e => setDontList(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Danh sách theo mô tả trường */

export interface ItemField {
  key: string;
  label: string;
  kind?: 'text' | 'long' | 'lines' | 'money' | 'url' | 'select' | 'file';
  required?: boolean;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  wide?: boolean;
}

type Item = Record<string, unknown>;

const toForm = (fields: ItemField[], item?: Item) =>
  Object.fromEntries(fields.map(f => {
    const v = item?.[f.key];
    return [f.key, Array.isArray(v) ? v.join('\n') : f.kind === 'money' && typeof v === 'number' ? formatNumber(v) : typeof v === 'string' ? v : ''];
  })) as Record<string, string>;

const fromForm = (fields: ItemField[], form: Record<string, string>, base?: Item, uploaded?: UploadedBrandFileResult | null): Item => {
  const result: Item = {
    ...(base || {}),
    ...Object.fromEntries(fields.map(f => [f.key, f.kind === 'lines' ? form[f.key].split('\n').map(s => s.trim()).filter(Boolean) : f.kind === 'money' ? toNumber(form[f.key]) : form[f.key].trim()])),
  };
  if (uploaded) {
    result.url = uploaded.url;
    result.fileKey = uploaded.fileKey;
    result.fileName = uploaded.fileName;
    result.fileSize = uploaded.fileSize;
    result.mimeType = uploaded.mimeType;
    result.storage = uploaded.storage;
  } else if (uploaded === null) {
    delete result.fileKey;
    delete result.fileName;
    delete result.fileSize;
    delete result.mimeType;
    result.storage = 'LINK';
  }
  return result;
};

const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,.txt';

/** Thêm hoặc sửa một mục của danh sách. `item` rỗng là thêm mới. */
export function ItemDialog({
  open,
  title,
  fields,
  item,
  busy,
  uploadContext,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: ItemField[];
  item?: Item;
  busy: boolean;
  uploadContext?: { brandName: string; section: 'DOCUMENTS' | 'LEGAL' };
  onClose: () => void;
  onSave: (item: Item) => void;
}) {
  const [form, setForm] = useState(() => toForm(fields, item));
  const [uploadedFile, setUploadedFile] = useState<UploadedBrandFileResult | undefined | null>(() => {
    if (item && typeof item.fileKey === 'string' && item.fileKey) {
      return {
        fileKey: item.fileKey,
        fileName: typeof item.fileName === 'string' ? item.fileName : item.fileKey.split('/').pop() || 'Tệp đính kèm',
        fileSize: typeof item.fileSize === 'number' ? item.fileSize : 0,
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : '',
        storage: item.storage === 'LOCAL' ? 'LOCAL' : 'R2',
        url: typeof item.url === 'string' ? item.url : `/api/brands/files?key=${encodeURIComponent(item.fileKey)}`,
      };
    }
    return undefined;
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = async (file: File | undefined, fieldKey: string) => {
    if (!file || !uploadContext) return;
    setUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadBrandFileClient({
        file,
        brandName: uploadContext.brandName,
        section: uploadContext.section,
      });
      setUploadedFile(stored);
      setForm(p => {
        const next = { ...p, [fieldKey]: stored.url };
        if ('title' in next && !next.title?.trim()) {
          next.title = file.name.replace(/\.[^.]+$/, '');
        }
        return next;
      });
    } catch (e) {
      setUploadError((e as Error).message || 'Không tải được tệp lên.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const missing = fields.filter(f => f.required && !form[f.key]?.trim());
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" footer={<Footer busy={busy || uploading || missing.length > 0} onClose={onClose} onSave={() => onSave(fromForm(fields, form, item, uploadedFile))} />}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(f => {
          const id = `it-${f.key}`;
          const set = (x: string) => setForm(p => ({ ...p, [f.key]: f.kind === 'money' ? moneyInput(x) : x }));
          return (
            <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} htmlFor={id} hint={f.hint ?? (f.kind === 'lines' ? 'Mỗi dòng một ý.' : undefined)} className={f.wide || f.kind === 'long' || f.kind === 'lines' || f.kind === 'file' ? 'md:col-span-2' : undefined}>
              {f.kind === 'file' ? (
                <div className="grid gap-2.5">
                  {uploadContext && (
                    <div
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) void handleSelectFile(dropped, f.key);
                      }}
                      className="rounded-lg border border-dashed border-line-strong bg-canvas/60 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT}
                        className="hidden"
                        onChange={e => void handleSelectFile(e.target.files?.[0], f.key)}
                      />
                      {uploadedFile ? (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-accent shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-ink truncate">{uploadedFile.fileName}</p>
                            <p className="text-2xs text-ink-3">
                              {[
                                formatFileSize(uploadedFile.fileSize),
                                uploadedFile.storage === 'R2' ? 'Đã lưu trên Cloudflare R2' : 'Đã lưu trên kho nội bộ',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">Tải tệp lên hệ thống lưu trữ (Cloudflare R2)</p>
                          <p className="text-2xs text-ink-3">Kéo thả hoặc chọn tệp PDF, Word, Excel, PowerPoint, ảnh, ZIP (tối đa 25 MB)</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={uploading ? Loader2 : Upload}
                          disabled={uploading || busy}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? 'Đang tải…' : uploadedFile ? 'Đổi tệp' : 'Chọn tệp'}
                        </Button>
                        {uploadedFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            disabled={uploading || busy}
                            onClick={() => {
                              setUploadedFile(null);
                              set('');
                            }}
                          >
                            Gỡ tệp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadError && <p className="text-2xs text-critical">{uploadError}</p>}
                  {!uploadedFile && (
                    <Input
                      id={id}
                      value={form[f.key]}
                      onChange={e => {
                        setUploadedFile(null);
                        set(e.target.value);
                      }}
                      type="url"
                      placeholder="Hoặc dán link tài liệu (Lark, Google Drive: https://…)"
                    />
                  )}
                </div>
              ) : f.kind === 'long' || f.kind === 'lines' ? (
                <Textarea id={id} rows={f.kind === 'lines' ? 3 : 3} value={form[f.key]} onChange={e => set(e.target.value)} />
              ) : f.kind === 'select' ? (
                <Select id={id} value={form[f.key]} onChange={e => set(e.target.value)}>
                  {f.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  id={id}
                  value={form[f.key]}
                  onChange={e => set(e.target.value)}
                  inputMode={f.kind === 'money' ? 'numeric' : undefined}
                  type={f.kind === 'url' ? 'url' : 'text'}
                  placeholder={f.kind === 'url' ? 'https://…' : f.kind === 'money' ? 'Số tiền (đ)' : undefined}
                  className={f.kind === 'money' ? 'tabular-nums' : undefined}
                />
              )}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
}

