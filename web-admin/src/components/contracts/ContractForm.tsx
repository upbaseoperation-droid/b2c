'use client';

/**
 * Tạo hoặc sửa hồ sơ theo mẫu pháp chế. Chọn booking thì tự chọn mẫu theo loại hồ sơ KOC
 * và điền sẵn các ô có dữ liệu (Bên B, số hợp đồng, ngày ký, sản phẩm, giá). Người tạo kiểm tra lại trước khi lưu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Columns2, Download } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, LegalTemplate } from '../../lib/contracts/types';
import { Button, Field, Input, Panel, Segmented, Select, Textarea } from '../ui';
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
  const [template, setTemplate] = useState<LegalTemplate | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showSplitPreview, setShowSplitPreview] = useState(true);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  const deal = deals.find(d => d.id === dealId);
  const koc = findKoc(kocs, deal);

  // Tải mẫu (kèm vị trí ô). Hồ sơ đang sửa dùng đúng bản mẫu đã khóa của hồ sơ.
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${templateId}${record ? `?record=${encodeURIComponent(record.id)}` : ''}`)
      .then(r => {
        if (cancelled) return;
        setTemplate(r.template); setLoadError('');
        if (!record) {
          const result = prefill(uniqueFields(r.template), {}, { koc, deal });
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
    else if (template) { const result = prefill(fields, values, { koc: k, deal: d }); setValues(result.values); setPrefilled(new Set([...prefilled, ...result.filled])); }
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

  const templates = data.templates.filter(t => t.kind === kind);
  const parents = data.records.filter(r => !isAcceptance(r.templateId) && r.id !== record?.id && (!dealId || !r.dealId || r.dealId === dealId));
  const dealOptions = [...deals].sort((a, b) => a.dealCode.localeCompare(b.dealCode));

  return (
    <form
      className="space-y-6"
      onSubmit={e => {
        e.preventDefault();
        onSave({ title: title.trim(), brand: brand.trim(), partner: partner.trim(), templateId, parentId, values, dealId: deal?.id, dealCode: deal?.dealCode, kocId: koc?.id });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel} className="-ml-2.5">Hợp đồng</Button>
          <span className="text-ink-3">/</span>
          <h2 className="text-base font-semibold text-ink truncate">{editing ? `Sửa ${record!.title} · tạo phiên bản ${record!.version + 1}` : 'Tạo hợp đồng'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button variant="primary" type="submit" disabled={busy || !template || !title.trim() || !brand.trim() || !partner.trim()}>
            {editing ? 'Lưu phiên bản mới' : 'Lưu nháp'}
          </Button>
        </div>
      </div>

      <Panel title="Thông tin chung" description={editing ? 'Không đổi được mẫu của hồ sơ đã tạo.' : 'Chọn booking để tự chọn mẫu theo loại hồ sơ của KOC và điền sẵn thông tin.'}>
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
              {(editing ? data.templates : templates).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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

      {loadError && <p role="alert" className="text-[13px] text-critical">{loadError}</p>}

      {template && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-2">
              Đã điền <span className="font-semibold text-ink tabular-nums">{requiredDone}/{required.length}</span> ô bắt buộc. Lưu nháp được khi chưa điền hết; đủ ô bắt buộc mới gửi duyệt được.
            </p>
            <div className="flex items-center gap-2">
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
    </form>
  );
}
