'use client';

/**
 * Tạo hoặc sửa hồ sơ theo mẫu pháp chế. Chọn booking thì tự chọn mẫu theo loại hồ sơ KOC
 * và điền sẵn các ô có dữ liệu (Bên B, số hợp đồng, ngày ký, sản phẩm, giá). Người tạo kiểm tra lại trước khi lưu.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Columns2, Download, FileScan, Upload } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrExtractedFields } from '../../lib/types';
import type { ContractField, ContractRecord, LegalTemplate } from '../../lib/contracts/types';
import { Button, Field, Input, Modal, Panel, Segmented, Select, Textarea } from '../ui';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { GROUP_ORDER, formatMoneyInput, isAcceptance, partnerName, prefill, templateFor, uniqueFields } from './contractUi';

export interface ContractFormInit {
  dealId?: string;
  kind?: 'CONTRACT' | 'ACCEPTANCE';
  parentId?: string;
  templateId?: string;
}

export interface ContractFormPayload {
  title: string; brand: string; partner: string; templateId: string; parentId: string;
  values: Record<string, string>; dealId?: string; dealCode?: string; kocId?: string;
  hasCustomTerms?: boolean; customTermsSummary?: string; internalNotes?: string;
}

const findKoc = (kocs: KocItem[], deal?: BookingDealItem) =>
  deal ? kocs.find(k => k.id === deal.kocId) || kocs.find(k => k.channelId.replace(/^@/, '').toLowerCase() === (deal.kocChannelId || '').replace(/^@/, '').toLowerCase()) : undefined;

export function ContractForm({
  data,
  deals,
  kocs,
  record,
  init,
  busy,
  onCancel,
  onSave,
}: {
  data: ContractBootstrap;
  deals: BookingDealItem[];
  kocs: KocItem[];
  /** Có `record` là sửa (tạo phiên bản mới). */
  record?: ContractRecord;
  init?: ContractFormInit;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: ContractFormPayload) => void;
}) {
  const editing = !!record;
  const initialDeal = deals.find(d => d.id === (record?.dealId || init?.dealId));
  const [dealId, setDealId] = useState(initialDeal?.id || '');
  const [kind, setKind] = useState<'CONTRACT' | 'ACCEPTANCE'>(
    record ? (isAcceptance(record.templateId) ? 'ACCEPTANCE' : 'CONTRACT') : init?.templateId ? (isAcceptance(init.templateId) ? 'ACCEPTANCE' : 'CONTRACT') : init?.kind || 'CONTRACT',
  );
  const [templateId, setTemplateId] = useState(
    record?.templateId || init?.templateId || (initialDeal ? templateFor(findKoc(kocs, initialDeal), init?.kind || 'CONTRACT') : ''),
  );
  const [title, setTitle] = useState(
    record?.title || (initialDeal ? [init?.kind === 'ACCEPTANCE' ? 'Nghiệm thu video' : 'Hợp đồng video', initialDeal.kocStageName, initialDeal.brandName].filter(Boolean).join(' · ') : ''),
  );
  const [brand, setBrand] = useState(record?.brand || initialDeal?.brandName || data.actor.brands[0] || '');
  const [partner, setPartner] = useState(record?.partner || (initialDeal ? partnerName(findKoc(kocs, initialDeal), initialDeal) : ''));
  const [parentId, setParentId] = useState(record?.parentId || init?.parentId || '');
  const [values, setValues] = useState<Record<string, string>>(record?.values || {});
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [hasCustomTerms, setHasCustomTerms] = useState<boolean>(record?.hasCustomTerms ?? false);
  const [customTermsSummary, setCustomTermsSummary] = useState<string>(record?.customTermsSummary || '');
  const [internalNotes, setInternalNotes] = useState<string>(record?.internalNotes || '');
  const [template, setTemplate] = useState<LegalTemplate | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showSplitPreview, setShowSplitPreview] = useState(true);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNotice, setOcrNotice] = useState('');
  const ocrInputRef = useRef<HTMLInputElement | null>(null);

  const deal = deals.find(d => d.id === dealId);
  const koc = findKoc(kocs, deal);
  const targetKocId = koc?.id || deal?.kocId || record?.kocId;
  const kocTemplates = data.templates.filter(
    t => (t.scope === 'KOC_CUSTOM' && t.kocId === targetKocId) || (t.kocId && t.kocId === targetKocId),
  );
  const primaryKocTemplate = kocTemplates[0];
  const kocLegalNotes = primaryKocTemplate?.legalNotes;

  // Tải mẫu (kèm vị trí ô). Hồ sơ đang sửa dùng đúng bản mẫu đã khóa của hồ sơ.
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${templateId}${record ? `?record=${encodeURIComponent(record.id)}` : ''}`)
      .then(r => {
        if (cancelled) return;
        setTemplate(r.template); setLoadError('');
        if (!record) {
          const result = prefill(uniqueFields(r.template), {}, { koc, deal, existingRecords: data.records });
          setValues(result.values); setPrefilled(new Set(result.filled));
        }
      })
      .catch(e => !cancelled && setLoadError((e as Error).message));
    return () => { cancelled = true; };
    // Chỉ tải lại khi đổi mẫu; đổi booking được xử lý ở chooseDeal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const fields = uniqueFields(template);
  const groups = useMemo(
    () => GROUP_ORDER.map(g => ({ ...g, fields: fields.filter(f => (f.group || 'OTHER') === g.key) })).filter(g => g.fields.length),
    [fields],
  );
  const required = fields.filter(f => f.required);
  const requiredDone = required.filter(f => values[f.key]?.trim()).length;

  const autoTitle = (k: KocItem | undefined, d: BookingDealItem | undefined, kd: 'CONTRACT' | 'ACCEPTANCE') =>
    [kd === 'CONTRACT' ? 'Hợp đồng video' : 'Nghiệm thu video', k?.stageName || d?.kocStageName, d?.brandName].filter(Boolean).join(' · ');

  const chooseDeal = (id: string) => {
    const d = deals.find(x => x.id === id); const k = findKoc(kocs, d);
    setDealId(id);
    if (!d) return;
    setBrand(d.brandName); setPartner(partnerName(k, d));
    if (!title.trim() || title === autoTitle(findKoc(kocs, deal), deal, kind)) setTitle(autoTitle(k, d, kind));
    const nextTemplate = templateFor(k, kind);
    if (nextTemplate !== templateId) { setTemplate(null); setValues({}); setTemplateId(nextTemplate); }
    else if (template) { const result = prefill(fields, values, { koc: k, deal: d, existingRecords: data.records }); setValues(result.values); setPrefilled(new Set([...prefilled, ...result.filled])); }
  };

  const chooseKind = (k: 'CONTRACT' | 'ACCEPTANCE') => {
    setKind(k);
    if (title === autoTitle(koc, deal, kind)) setTitle(autoTitle(koc, deal, k));
    const next = deal ? templateFor(koc, k) : '';
    setTemplate(null); setValues({}); setTemplateId(next);
    if (k === 'CONTRACT') setParentId('');
  };

  const setValue = (f: ContractField, raw: string) => {
    const v = f.kind === 'money' ? formatMoneyInput(raw) : raw;
    setValues(prev => ({ ...prev, [f.key]: v }));
    if (prefilled.has(f.key)) setPrefilled(prev => { const n = new Set(prev); n.delete(f.key); return n; });
  };

  const focusFieldInput = (fieldKey: string) => {
    setActiveFieldKey(fieldKey);
    const input = document.getElementById(`ct-f-${fieldKey}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const applyOcrFields = (extracted: OcrExtractedFields, docLabel?: string) => {
    const resolvedPartner =
      extracted.companyName ||
      extracted.fullName ||
      partner;
    if (resolvedPartner) setPartner(resolvedPartner);

    if (fields.length > 0) {
      const nextValues = { ...values };
      const filledKeys = new Set(prefilled);
      const cccdText = [
        extracted.idNumber,
        extracted.issueDate ? `cấp ngày ${extracted.issueDate}` : '',
        extracted.issuePlace ? `tại ${extracted.issuePlace}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const repText = [
        extracted.legalRepresentative || extracted.fullName,
        extracted.legalRepTitle ? `Chức vụ: ${extracted.legalRepTitle}` : '',
      ]
        .filter(Boolean)
        .join(' — ');
      const addrText = extracted.headquartersAddress || extracted.permanentAddress || extracted.originAddress || '';

      for (const f of fields) {
        if (f.source === 'partyName' && resolvedPartner) {
          nextValues[f.key] = resolvedPartner;
          filledKeys.add(f.key);
        } else if (f.source === 'ownerName' && (extracted.fullName || extracted.legalRepresentative)) {
          nextValues[f.key] = extracted.fullName || extracted.legalRepresentative || '';
          filledKeys.add(f.key);
        } else if (f.source === 'representative' && repText) {
          nextValues[f.key] = repText;
          filledKeys.add(f.key);
        } else if (f.source === 'cccd' && cccdText) {
          nextValues[f.key] = cccdText;
          filledKeys.add(f.key);
        } else if (f.source === 'taxCode' && extracted.taxCode) {
          nextValues[f.key] = extracted.taxCode;
          filledKeys.add(f.key);
        } else if (f.source === 'address' && addrText) {
          nextValues[f.key] = addrText;
          filledKeys.add(f.key);
        }
      }
      setValues(nextValues);
      setPrefilled(filledKeys);
    }
    setOcrNotice(`Đã điền thông tin Bên B từ ${docLabel || 'giấy tờ pháp lý'}: ${resolvedPartner}`);
    setOcrOpen(false);
  };

  const runOcrRequest = async (payload: { imageBase64?: string; fileName?: string; presetKey?: string }) => {
    setOcrBusy(true);
    try {
      const res = await fetch('/api/ocr/extract-legal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data?.fields) {
        applyOcrFields(json.data.fields as OcrExtractedFields, json.data.documentTypeLabel);
      } else {
        setLoadError(json.error || 'Không đọc được thông tin từ ảnh giấy tờ.');
      }
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setOcrBusy(false);
    }
  };

  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      runOcrRequest({ imageBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const templates = data.templates.filter(t => t.kind === kind && t.active !== false);
  const parents = data.records.filter(r => !isAcceptance(r.templateId) && r.id !== record?.id && (!dealId || !r.dealId || r.dealId === dealId));
  const dealOptions = [...deals].sort((a, b) => a.dealCode.localeCompare(b.dealCode));

  const docDateVal = values['token:[dd.mm.yy]'] || '';
  const kocIdVal = values['token:[ID KOC]'] || '';
  const duplicateRecord = useMemo(() => {
    if (!docDateVal || !kocIdVal) return null;
    return data.records.find(
      r =>
        r.id !== record?.id &&
        r.values['token:[dd.mm.yy]'] === docDateVal &&
        r.values['token:[ID KOC]'] === kocIdVal,
    );
  }, [data.records, record?.id, docDateVal, kocIdVal]);

  const resolveDuplicateNumber = () => {
    const suffix = deal?.dealCode ? `-${deal.dealCode}` : `-${String(data.records.length + 1).padStart(2, '0')}`;
    setValues(prev => ({
      ...prev,
      'token:[ID KOC]': `${kocIdVal}${suffix}`,
    }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={e => {
        e.preventDefault();
        onSave({
          title: title.trim(),
          brand: brand.trim(),
          partner: partner.trim(),
          templateId,
          parentId,
          values,
          dealId: deal?.id,
          dealCode: deal?.dealCode,
          kocId: koc?.id,
          hasCustomTerms,
          customTermsSummary: customTermsSummary.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel} className="-ml-2.5">Hợp đồng</Button>
          <span className="text-ink-3">/</span>
          <h2 className="text-base font-semibold text-ink truncate">{editing ? `Sửa ${record!.title} · tạo phiên bản ${record!.version + 1}` : 'Tạo hợp đồng'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={FileScan} onClick={() => setOcrOpen(true)}>
            Đọc ảnh CCCD / ĐKKD
          </Button>
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button variant="primary" type="submit" disabled={busy || !template || !title.trim() || !brand.trim() || !partner.trim()}>
            {editing ? 'Lưu phiên bản mới' : 'Lưu nháp'}
          </Button>
        </div>
      </div>

      {ocrNotice && (
        <div role="status" className="rounded-xl bg-positive-soft border border-line px-4 py-2.5 text-xs text-positive font-medium flex items-center justify-between gap-2">
          <span>{ocrNotice}</span>
          <button type="button" onClick={() => setOcrNotice('')} className="text-ink-3 hover:text-ink">Đóng</button>
        </div>
      )}

      {(kocLegalNotes || primaryKocTemplate) && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft/75 p-3.5 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-warning-strong flex items-center gap-1.5">
              ⚖️ Lưu ý của Pháp chế cho KOC {koc?.stageName || partner || 'này'}:
            </span>
            {primaryKocTemplate && templateId !== primaryKocTemplate.id && !editing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setTemplate(null);
                  setValues({});
                  setTemplateId(primaryKocTemplate.id);
                  setHasCustomTerms(false);
                }}
              >
                Dùng mẫu đã duyệt của KOC ({primaryKocTemplate.name})
              </Button>
            )}
          </div>
          {kocLegalNotes && (
            <div className="bg-surface/90 rounded-lg p-2.5 text-ink border border-warning/30 whitespace-pre-wrap leading-relaxed">
              {kocLegalNotes}
            </div>
          )}
          {primaryKocTemplate && (
            <div className="text-2xs text-ink-2 flex flex-wrap items-center gap-2">
              <span>Mẫu riêng: <strong>{primaryKocTemplate.name}</strong></span>
              <span>· Duyệt bởi: {primaryKocTemplate.approvedByLegal || 'Pháp chế'}</span>
              {templateId === primaryKocTemplate.id ? (
                <span className="text-positive font-semibold">✓ Đang áp dụng mẫu này (Miễn duyệt Pháp chế)</span>
              ) : (
                <span className="text-ink-3">· Áp dụng mẫu này để hưởng luồng duyệt nhanh</span>
              )}
            </div>
          )}
        </div>
      )}

      <Panel title="Thông tin chung">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Booking" htmlFor="ct-deal" hint={koc ? `KOC: ${koc.stageName}` : 'Không bắt buộc. Hồ sơ không gắn booking thì tự nhập đối tác.'}>
            <Select id="ct-deal" value={dealId} onChange={e => chooseDeal(e.target.value)} disabled={editing && !!record?.dealId}>
              <option value="">Không gắn booking</option>
              {dealOptions.map(d => <option key={d.id} value={d.id}>{d.dealCode} · {d.kocStageName} · {d.brandName}</option>)}
            </Select>
          </Field>
          <Field label="Loại hồ sơ">
            <div>
              {editing ? (
                <span className="text-[13.5px] text-ink">{kind === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản nghiệm thu'}</span>
              ) : (
                <Segmented items={[{ key: 'CONTRACT', label: 'Hợp đồng' }, { key: 'ACCEPTANCE', label: 'Biên bản nghiệm thu' }]} value={kind} onChange={chooseKind} />
              )}
            </div>
          </Field>
          <Field label="Mẫu pháp chế" htmlFor="ct-template" hint={koc && !editing ? 'Chọn theo loại hồ sơ pháp lý của KOC. Đổi nếu cần.' : undefined}>
            <Select id="ct-template" required value={templateId} disabled={editing} onChange={e => { setTemplate(null); setValues({}); setTemplateId(e.target.value); }}>
              <option value="">Chọn mẫu</option>
              {kocTemplates.length > 0 && (
                <optgroup label={`Mẫu đã duyệt riêng cho KOC (${kocTemplates.length})`}>
                  {kocTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      ⭐ {t.name} ({t.version})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Mẫu chuẩn Upbase">
                {(editing ? data.templates : templates)
                  .filter(t => !kocTemplates.some(kt => kt.id === t.id))
                  .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field label="Tên hồ sơ" htmlFor="ct-title">
            <Input id="ct-title" required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Hợp đồng video · Tên KOC · Nhãn hàng" />
          </Field>
          <Field label="Nhãn hàng" htmlFor="ct-brand">
            <Input id="ct-brand" required maxLength={120} list="ct-brands" value={brand} onChange={e => setBrand(e.target.value)} />
            <datalist id="ct-brands">{data.actor.brands.map(b => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Đối tác (Bên B)" htmlFor="ct-partner">
            <Input id="ct-partner" required maxLength={180} value={partner} onChange={e => setPartner(e.target.value)} />
          </Field>
          {kind === 'ACCEPTANCE' && (
            <Field label="Hợp đồng gốc" htmlFor="ct-parent" hint="Biên bản nghiệm thu đi kèm hợp đồng nào.">
              <Select id="ct-parent" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">Chọn hợp đồng</option>
                {parents.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Panel>

      {duplicateRecord && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-3.5 text-xs text-ink flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-warning-strong">⚠️ Cảnh báo trùng số hợp đồng:</span> Đã tồn tại một hồ sơ hợp đồng khác cùng KOC và ngày lập này ({docDateVal}/{kocIdVal} · "{duplicateRecord.title}").
          </div>
          <Button size="sm" variant="secondary" onClick={resolveDuplicateNumber}>
            Thêm hậu tố chống trùng (-{deal?.dealCode || '02'})
          </Button>
        </div>
      )}

      <Panel title="Quy chuẩn xét duyệt & Điều khoản thỏa thuận">
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-line bg-sunken/40 p-3.5 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCustomTerms}
                onChange={e => setHasCustomTerms(e.target.checked)}
                className="mt-0.5 rounded border-line"
              />
              <div>
                <span className="font-medium text-[13px] text-ink block">
                  Hồ sơ có điều khoản chỉnh sửa riêng hoặc KOC yêu cầu ngoại lệ
                </span>
                <span className="text-2xs text-ink-3 block mt-0.5">
                  {hasCustomTerms
                    ? 'Bắt buộc Pháp chế (chị Liên) duyệt trước khi chuyển sang bước Kế toán và trình ký.'
                    : 'Hồ sơ dùng mẫu chuẩn của Upbase sẽ được áp dụng luồng Miễn duyệt Pháp chế, chuyển thẳng Kế toán soát xét ngân sách.'}
                </span>
              </div>
            </label>
          </div>

          {hasCustomTerms && (
            <Field
              label="Nội dung KOC đề xuất sửa / Thỏa thuận riêng"
              htmlFor="ct-custom-terms"
              hint="Nêu rõ điều khoản thay đổi (bản quyền hình ảnh, tiến độ tạm ứng, số ngày đăng video...) để Pháp chế nắm nhanh bối cảnh."
            >
              <Textarea
                id="ct-custom-terms"
                rows={3}
                value={customTermsSummary}
                onChange={e => setCustomTermsSummary(e.target.value)}
                placeholder="Ví dụ: KOC yêu cầu cọc 30% trước khi quay video; Thời hạn cấp quyền hình ảnh giảm còn 45 ngày..."
              />
            </Field>
          )}

          <Field
            label="Ghi chú thương thảo & Lưu vết thỏa thuận (Lưu nội bộ)"
            htmlFor="ct-notes"
            hint="Ghi lại các trao đổi quan trọng giữa nhân sự booking với KOC để các bên duyệt cùng nắm rõ và lưu vết vĩnh viễn."
          >
            <Textarea
              id="ct-notes"
              rows={2}
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Ví dụ: Đã thống nhất với Lead Marketing về mức tạm ứng qua tin nhắn Lark ngày 14/10..."
            />
          </Field>
        </div>
      </Panel>

      {loadError && <p role="alert" className="text-[13px] text-critical">{loadError}</p>}

      {template && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-2">
              Đã điền <span className="font-semibold text-ink tabular-nums">{requiredDone}/{required.length}</span> ô bắt buộc. Lưu nháp được khi chưa điền hết; đủ ô bắt buộc mới gửi duyệt được.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" icon={FileScan} onClick={() => setOcrOpen(true)}>
                Đọc ảnh CCCD / ĐKKD
              </Button>
              <Button size="sm" variant="secondary" icon={Columns2} onClick={() => setShowSplitPreview(v => !v)}>
                {showSplitPreview ? 'Ẩn khung xem hợp đồng' : 'Xem hợp đồng song song'}
              </Button>
              <a href={`/api/contracts/templates/${template.id}?download=1`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] text-ink-2 hover:bg-sunken">
                <Download className="w-4 h-4 text-ink-3" strokeWidth={1.75} />Tải mẫu gốc
              </a>
            </div>
          </div>

          <div className={`grid gap-6 items-start ${showSplitPreview ? 'xl:grid-cols-[minmax(0,1fr)_minmax(480px,54%)]' : ''}`}>
            <div className="grid gap-6 min-w-0">
              {groups.map(g => (
                <Panel key={g.key} title={g.title}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {g.fields.map(f => {
                      const id = `ct-f-${f.key}`;
                      const hint = prefilled.has(f.key) ? 'Lấy từ hồ sơ KOC / booking. Kiểm tra lại.' : f.title !== f.context && f.context.length < 160 ? f.context : undefined;
                      const label = `${f.title || f.label}${f.required ? ' *' : ''}`;
                      return (
                        <Field key={f.key} label={label} htmlFor={id} hint={hint} className={f.kind === 'long' ? 'md:col-span-2' : undefined}>
                          {f.kind === 'long' ? (
                            <Textarea
                              id={id}
                              rows={2}
                              maxLength={4000}
                              value={values[f.key] || ''}
                              onFocus={() => setActiveFieldKey(f.key)}
                              onChange={e => setValue(f, e.target.value)}
                            />
                          ) : (
                            <Input
                              id={id}
                              maxLength={4000}
                              inputMode={f.kind === 'money' || f.kind === 'number' ? 'numeric' : undefined}
                              placeholder={f.kind === 'date' ? 'dd/mm/yyyy' : f.kind === 'money' ? 'Số tiền (đ)' : undefined}
                              className={f.kind === 'money' || f.kind === 'number' ? 'tabular-nums' : undefined}
                              value={values[f.key] || ''}
                              onFocus={() => setActiveFieldKey(f.key)}
                              onChange={e => setValue(f, e.target.value)}
                            />
                          )}
                        </Field>
                      );
                    })}
                  </div>
                </Panel>
              ))}
            </div>

            {showSplitPreview && (
              <div className="xl:sticky xl:top-4 min-w-0">
                <ContractDocumentViewer
                  title={title || template.name}
                  templateName={`${template.name} · Xem trực tiếp khi nhập`}
                  blocks={template.blocks || []}
                  paragraphs={template.paragraphs}
                  fields={template.fields}
                  values={values}
                  compareValues={record?.values}
                  activeFieldKey={activeFieldKey}
                  onSelectField={focusFieldInput}
                  maxHeight="calc(100vh - 150px)"
                  compactToolbar
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={busy || !title.trim() || !brand.trim() || !partner.trim()}>
              {editing ? 'Lưu phiên bản mới' : 'Lưu nháp'}
            </Button>
          </div>
        </>
      )}

      <Modal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        title="Đọc ảnh CCCD / Giấy phép ĐKKD"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOcrOpen(false)}>Đóng</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-line-strong rounded-xl p-5 text-center bg-canvas/50 space-y-2">
            <input
              ref={ocrInputRef}
              type="file"
              accept="image/*"
              onChange={handleOcrFileChange}
              className="hidden"
            />
            <Button
              variant="primary"
              icon={Upload}
              disabled={ocrBusy}
              onClick={() => ocrInputRef.current?.click()}
            >
              {ocrBusy ? 'Đang đọc ảnh giấy tờ…' : 'Tải ảnh CCCD / ĐKKD từ máy'}
            </Button>
            <p className="text-2xs text-ink-3">
              Hỗ trợ ảnh JPG, PNG chụp rõ nét mặt trước CCCD gắn chip hoặc trang thông tin ĐKKD.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-line">
            <p className="text-xs font-medium text-ink">Hoặc chọn nhanh mẫu giấy tờ có sẵn để điền thử:</p>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'CCCD_INDIVIDUAL' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">CCCD Cá nhân · Nguyễn Thu Trang</span>
                <span className="text-2xs text-ink-3">Số CCCD: 001201019876 · Nơi cấp: Cục Cảnh sát QLHC về TTXH</span>
              </button>
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'BUSINESS_HOUSEHOLD' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">ĐKKD Hộ kinh doanh · Studio Sáng Tạo Hoàng Gia</span>
                <span className="text-2xs text-ink-3">MST: 8129481023 · Chủ hộ: Trần Hoàng Nam</span>
              </button>
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'BUSINESS_COMPANY' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">ĐKKD Công ty · Công ty TNHH Truyền thông &amp; Quảng cáo Creator Việt</span>
                <span className="text-2xs text-ink-3">MST: 0109876543 · Đại diện: Lê Quang Huy (Giám đốc)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </form>
  );
}
