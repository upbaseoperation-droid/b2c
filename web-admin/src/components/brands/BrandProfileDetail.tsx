'use client';

/**
 * Hồ sơ một nhãn hàng. Cột chính: định vị, sản phẩm chủ lực, quy chuẩn nội dung, câu hỏi khó, pháp lý.
 * Cột phụ: pháp nhân, thông tin từ Dữ liệu gốc, booking đang chạy, trần thù lao, tài liệu, lịch sử.
 * Mục trống hiện trạng thái rỗng và nút thêm; không điền nội dung mẫu.
 */

import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus } from 'lucide-react';
import type { BookingDealItem } from '../../lib/types';
import type { BrandPermissions, BrandProfile, BrandSection } from '../../lib/brands/types';
import { SECTION_LABEL } from '../../lib/brands/types';
import { formatVnd, formatVndShort } from '../../lib/format';
import { ActionMenu, Avatar, Button, ConfirmDialog, EmptyState, Person, SectionHeader, Status } from '../ui';
import { ContentRulesDialog, EntityDialog, ItemDialog, PositioningDialog, RatecardDialog, type ItemField } from './BrandEditors';
import { DOC_CATEGORY_LABEL, TONE_LABEL, dateTime, isExpired, real, type BrandRow } from './brandUi';

type Save = (section: BrandSection, data: unknown, summary?: string) => Promise<boolean>;
type ListKey = 'products' | 'faqs' | 'legal' | 'documents';

const PRODUCT_FIELDS: ItemField[] = [
  { key: 'name', label: 'Tên sản phẩm', required: true, wide: true },
  { key: 'skuCode', label: 'Mã SKU' },
  { key: 'size', label: 'Quy cách', hint: 'Ví dụ 120g, 500ml, 60 viên.' },
  { key: 'priceVnd', label: 'Giá niêm yết', kind: 'money' },
  { key: 'pdpUrl', label: 'Link trang sản phẩm', kind: 'url' },
  { key: 'usps', label: 'Điểm nổi bật KOC cần nói', kind: 'lines' },
  { key: 'mechanism', label: 'Cơ chế tác động', kind: 'long' },
  { key: 'ingredients', label: 'Thành phần chính', kind: 'lines', hint: 'Mỗi dòng: tên thành phần: công dụng.' },
  { key: 'targetUser', label: 'Phù hợp với' },
  { key: 'contraindications', label: 'Không dùng cho' },
];
const FAQ_FIELDS: ItemField[] = [
  { key: 'question', label: 'Câu hỏi của người xem', required: true, wide: true },
  { key: 'answer', label: 'Câu trả lời gợi ý cho KOC', kind: 'long', required: true },
  { key: 'mention', label: 'Nên nhắc', kind: 'lines' },
  { key: 'avoid', label: 'Không được nói', kind: 'lines' },
];
const LEGAL_FIELDS: ItemField[] = [
  { key: 'title', label: 'Tên văn bản', required: true, wide: true, hint: 'Ví dụ: Phiếu công bố mỹ phẩm, Giấy xác nhận nội dung quảng cáo.' },
  { key: 'docNumber', label: 'Số văn bản' },
  { key: 'authority', label: 'Cơ quan cấp' },
  { key: 'issueDate', label: 'Ngày cấp', hint: 'dd/mm/yyyy' },
  { key: 'validUntil', label: 'Hiệu lực đến', hint: 'dd/mm/yyyy, để trống nếu không thời hạn.' },
  { key: 'disclaimer', label: 'Câu cảnh báo bắt buộc khi truyền thông', kind: 'long' },
  { key: 'url', label: 'Link bản scan', kind: 'url', wide: true },
];
const DOC_FIELDS: ItemField[] = [
  { key: 'title', label: 'Tên tài liệu', required: true, wide: true },
  { key: 'category', label: 'Loại', kind: 'select', options: Object.entries(DOC_CATEGORY_LABEL).map(([value, label]) => ({ value, label })) },
  { key: 'url', label: 'Link (Lark, Google Drive…)', kind: 'url', required: true },
  { key: 'note', label: 'Ghi chú', kind: 'long' },
];
const LIST_META: Record<ListKey, { section: BrandSection; fields: ItemField[]; noun: string }> = {
  products: { section: 'PRODUCTS', fields: PRODUCT_FIELDS, noun: 'sản phẩm' },
  faqs: { section: 'FAQS', fields: FAQ_FIELDS, noun: 'câu hỏi' },
  legal: { section: 'LEGAL', fields: LEGAL_FIELDS, noun: 'văn bản pháp lý' },
  documents: { section: 'DOCUMENTS', fields: DOC_FIELDS, noun: 'tài liệu' },
};

export function BrandProfileDetail({
  row,
  can,
  deals,
  busy,
  onBack,
  nav,
  onSave,
  onOpenBooking,
}: {
  row: BrandRow;
  can: BrandPermissions;
  deals: BookingDealItem[];
  busy: boolean;
  onBack: () => void;
  nav?: { onPrev?: () => void; onNext?: () => void; position?: number; total?: number };
  onSave: Save;
  onOpenBooking?: () => void;
}) {
  const p = row.profile; const m = row.master;
  const [dialog, setDialog] = useState<null | 'POSITIONING' | 'ENTITY' | 'RATECARD' | 'CONTENT_RULES'>(null);
  const [item, setItem] = useState<null | { list: ListKey; index: number }>(null);
  const [removing, setRemoving] = useState<null | { list: ListKey; index: number }>(null);
  const [showTaxCode, setShowTaxCode] = useState(false);

  const saveDialog = async (section: BrandSection, data: unknown) => { if (await onSave(section, data)) setDialog(null); };
  const saveList = async (list: ListKey, next: unknown[], summary: string) => {
    const meta = LIST_META[list];
    return onSave(meta.section, { [list]: next }, summary);
  };
  const listOf = (list: ListKey) => p[list] as unknown as Array<Record<string, unknown>>;

  const openDeals = deals.filter(d => d.brandName.trim().toLowerCase() === row.name.trim().toLowerCase() && !['COMPLETED', 'CANCELLED', 'FINAL_PAID'].includes(d.status));
  const openValue = openDeals.reduce((s, d) => s + (d.totalValue || 0), 0);
  const status = !row.saved ? { label: 'Nháp', tone: 'neutral' as const } : row.done === row.total ? { label: 'Hoàn tất', tone: 'positive' as const } : { label: 'Đang chạy', tone: 'info' as const };
  const editBtn = (section: BrandSection, onClick: () => void, label = 'Sửa') => can[section] && <Button size="sm" icon={Pencil} onClick={onClick}>{label}</Button>;
  const addBtn = (list: ListKey) => can[LIST_META[list].section] && <Button size="sm" icon={Plus} onClick={() => setItem({ list, index: -1 })}>Thêm {LIST_META[list].noun}</Button>;
  const itemMenu = (list: ListKey, index: number) =>
    can[LIST_META[list].section] && (
      <ActionMenu items={[{ label: 'Sửa', onSelect: () => setItem({ list, index }) }, { label: 'Xóa', onSelect: () => setRemoving({ list, index }) }]} />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className="-ml-2.5">Hồ sơ thương hiệu</Button>
        {(nav?.onPrev || nav?.onNext) && (
          <div className="flex items-center gap-1.5 text-2xs text-ink-3">
            {nav?.position && nav?.total ? (
              <span className="tabular-nums mr-1">{nav.position} / {nav.total}</span>
            ) : null}
            <button
              type="button"
              disabled={!nav?.onPrev}
              onClick={nav?.onPrev}
              aria-label="Nhãn hàng trước"
              title="Nhãn hàng trước"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-line-strong text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nav?.onNext}
              onClick={nav?.onNext}
              aria-label="Nhãn hàng sau"
              title="Nhãn hàng sau"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-line-strong text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={row.name} size={40} />
          <div className="min-w-0 grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{row.name}</h2>
              <Status tone={status.tone}>{status.label}</Status>
              <span className="text-[13px] text-ink-3 tabular-nums">{row.done}/{row.total} mục</span>
            </div>
            <p className="text-[13px] text-ink-2">{[real(m?.category), p.entity?.companyName || real(m?.companyName), m?.platforms?.join(', ')].filter(Boolean).join(' · ')}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              {real(m?.accountPic) ? (
                <Person name={real(m?.accountPic)} sub="Account PIC" size={20} />
              ) : (
                <span className="text-ink-3">Chưa có Account PIC</span>
              )}
            </div>
          </div>
        </div>
        {row.saved && <p className="text-2xs text-ink-3">Cập nhật {dateTime(p.updatedAt)} · {p.updatedBy}</p>}
      </header>

      <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-8 min-w-0">
          {/* Định vị */}
          <section className="grid gap-3">
            <SectionHeader title={SECTION_LABEL.POSITIONING} actions={editBtn('POSITIONING', () => setDialog('POSITIONING'), p.positioning ? 'Sửa' : 'Thêm')} />
            {p.positioning && (p.positioning.slogan || p.positioning.toneOfVoice || p.positioning.story) ? (
              <div className="bg-surface border border-line rounded-xl px-4 py-4 grid gap-3 text-[13px]">
                {p.positioning.slogan && <p className="text-[15px] text-ink">“{p.positioning.slogan}”</p>}
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Info label="Giọng văn">{[p.positioning.toneTag && TONE_LABEL[p.positioning.toneTag], p.positioning.toneOfVoice].filter(Boolean).join(' · ')}</Info>
                  <Info label="Khách hàng mục tiêu">{p.positioning.targetAudience}</Info>
                </dl>
                {p.positioning.story && <Info label="Câu chuyện thương hiệu"><span className="whitespace-pre-line text-ink-2">{p.positioning.story}</span></Info>}
              </div>
            ) : (
              <Empty text="Chưa có định vị. KOC cần khẩu hiệu, giọng văn và khách hàng mục tiêu để viết kịch bản." />
            )}
          </section>

          {/* Sản phẩm */}
          <section className="grid gap-3">
            <SectionHeader title={SECTION_LABEL.PRODUCTS} description={p.products.length ? `${p.products.length} sản phẩm` : undefined} actions={addBtn('products')} />
            {p.products.length === 0 ? (
              <Empty
                text={(m?.heroProducts.length || 0) > 0
                  ? `Dữ liệu gốc có ${m!.heroProducts.length} sản phẩm (${m!.heroProducts.map(h => h.productName || h.sku).slice(0, 3).join(', ')}) nhưng chưa có mô tả cho KOC.`
                  : 'Chưa có sản phẩm chủ lực.'}
              />
            ) : (
              <ul className="bg-surface border border-line rounded-xl divide-y divide-line">
                {p.products.map((x, i) => (
                  <li key={x.id} className="px-4 py-4 grid gap-2 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{x.name}{x.size && <span className="text-ink-3 font-normal"> · {x.size}</span>}</p>
                        <p className="text-2xs text-ink-3">
                          {[x.skuCode && <span key="s" className="font-code">{x.skuCode}</span>, x.priceVnd && formatVnd(x.priceVnd)].filter(Boolean).reduce<React.ReactNode[]>((a, n, k) => (k ? [...a, ' · ', n] : [n]), [])}
                          {x.pdpUrl && <> · <a href={x.pdpUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">Trang sản phẩm<ExternalLink className="w-3 h-3" /></a></>}
                        </p>
                      </div>
                      {itemMenu('products', i)}
                    </div>
                    {x.usps.length > 0 && <ul className="list-disc pl-5 text-ink-2 grid gap-0.5">{x.usps.map((u, k) => <li key={k}>{u}</li>)}</ul>}
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {x.mechanism && <Info label="Cơ chế tác động">{x.mechanism}</Info>}
                      {x.ingredients.length > 0 && <Info label="Thành phần chính">{x.ingredients.join('; ')}</Info>}
                      {x.targetUser && <Info label="Phù hợp với">{x.targetUser}</Info>}
                      {x.contraindications && <Info label="Không dùng cho">{x.contraindications}</Info>}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quy chuẩn nội dung */}
          <section className="grid gap-3">
            <SectionHeader title={SECTION_LABEL.CONTENT_RULES} actions={editBtn('CONTENT_RULES', () => setDialog('CONTENT_RULES'), p.contentRules ? 'Sửa' : 'Thêm')} />
            {!p.contentRules || (!p.contentRules.banned.length && !p.contentRules.preferred.length && !p.contentRules.visualDo.length && !p.contentRules.visualDont.length) ? (
              <Empty text="Chưa có từ cấm và quy chuẩn hình ảnh. Người duyệt kịch bản sẽ không có căn cứ để yêu cầu sửa." />
            ) : (
              <div className="bg-surface border border-line rounded-xl grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line text-[13px]">
                <div className="px-4 py-4 grid gap-2 content-start">
                  <h4 className="text-2xs text-ink-3">Từ cấm ({p.contentRules.banned.length})</h4>
                  {p.contentRules.banned.length === 0 ? <p className="text-ink-3">—</p> : (
                    <ul className="grid gap-1.5">
                      {p.contentRules.banned.map(b => (
                        <li key={b.id}>
                          <span className="text-critical">{b.phrase}</span>
                          {b.replacement && <span className="text-ink-2"> → {b.replacement}</span>}
                          {b.reason && <span className="block text-2xs text-ink-3">{b.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.contentRules.visualDont.length > 0 && <><h4 className="text-2xs text-ink-3 pt-2">Hình ảnh không được dùng</h4><ul className="list-disc pl-5 text-ink-2">{p.contentRules.visualDont.map((x, k) => <li key={k}>{x}</li>)}</ul></>}
                </div>
                <div className="px-4 py-4 grid gap-2 content-start">
                  <h4 className="text-2xs text-ink-3">Nên dùng ({p.contentRules.preferred.length})</h4>
                  {p.contentRules.preferred.length === 0 ? <p className="text-ink-3">—</p> : (
                    <ul className="grid gap-1.5">
                      {p.contentRules.preferred.map(x => <li key={x.id}><span className="text-positive">{x.phrase}</span>{x.note && <span className="block text-2xs text-ink-3">{x.note}</span>}</li>)}
                    </ul>
                  )}
                  {p.contentRules.visualDo.length > 0 && <><h4 className="text-2xs text-ink-3 pt-2">Hình ảnh nên có</h4><ul className="list-disc pl-5 text-ink-2">{p.contentRules.visualDo.map((x, k) => <li key={k}>{x}</li>)}</ul></>}
                </div>
              </div>
            )}
          </section>

          {/* Câu hỏi khó */}
          <section className="grid gap-3">
            <SectionHeader title={SECTION_LABEL.FAQS} description="Cách KOC trả lời khi người xem hỏi vặn." actions={addBtn('faqs')} />
            {p.faqs.length === 0 ? <Empty text="Chưa có câu hỏi khó." /> : (
              <ul className="bg-surface border border-line rounded-xl divide-y divide-line">
                {p.faqs.map((f, i) => (
                  <li key={f.id} className="px-4 py-3 grid gap-1.5 text-[13px]">
                    <div className="flex items-start justify-between gap-3"><p className="font-medium text-ink">{f.question}</p>{itemMenu('faqs', i)}</div>
                    <p className="text-ink-2 whitespace-pre-line">{f.answer}</p>
                    {(f.mention.length > 0 || f.avoid.length > 0) && (
                      <p className="text-2xs text-ink-3">
                        {f.mention.length > 0 && <>Nên nhắc: {f.mention.join('; ')}</>}
                        {f.mention.length > 0 && f.avoid.length > 0 && ' · '}
                        {f.avoid.length > 0 && <>Không nói: <span className="text-critical">{f.avoid.join('; ')}</span></>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pháp lý */}
          <section className="grid gap-3">
            <SectionHeader title={SECTION_LABEL.LEGAL} description="Công bố sản phẩm, xác nhận quảng cáo, kiểm nghiệm." actions={addBtn('legal')} />
            {p.legal.length === 0 ? <Empty text="Chưa có văn bản pháp lý. Nội dung có công dụng sản phẩm cần có phiếu công bố trước khi duyệt." /> : (
              <ul className="bg-surface border border-line rounded-xl divide-y divide-line">
                {p.legal.map((l, i) => (
                  <li key={l.id} className="px-4 py-3 grid gap-1 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{l.title}</span>
                        {l.validUntil && isExpired(l.validUntil) && <Status tone="critical">Hết hiệu lực</Status>}
                      </div>
                      {itemMenu('legal', i)}
                    </div>
                    <p className="text-2xs text-ink-3">
                      {[l.docNumber && `Số ${l.docNumber}`, l.authority, l.issueDate && `cấp ${l.issueDate}`, l.validUntil && `hiệu lực đến ${l.validUntil}`].filter(Boolean).join(' · ')}
                      {l.url && <> · <a href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Bản scan</a></>}
                    </p>
                    {l.disclaimer && <p className="text-ink-2">Câu cảnh báo bắt buộc: “{l.disclaimer}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0">
          <Aside title={SECTION_LABEL.ENTITY} action={editBtn('ENTITY', () => setDialog('ENTITY'))}>
            <dl className="grid gap-3">
              <Info label="Tên công ty">{p.entity?.companyName || real(m?.companyName)}</Info>
              <Info label="Mã số thuế">
                {p.entity?.taxCode && (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-code tabular-nums">
                      {showTaxCode ? p.entity.taxCode : `•••• ${p.entity.taxCode.slice(-4)}`}
                    </span>
                    {can.ENTITY && (
                      <button
                        type="button"
                        onClick={() => setShowTaxCode(v => !v)}
                        className="text-2xs text-accent hover:underline"
                      >
                        {showTaxCode ? 'Ẩn số' : 'Hiện số'}
                      </button>
                    )}
                  </span>
                )}
              </Info>
              <Info label="Người liên hệ phía nhãn">{p.entity?.contactPerson || real(m?.contactPerson)}</Info>
              <Info label="Xuất xứ">{p.entity?.originCountry}</Info>
            </dl>
          </Aside>

          <Aside title="Phụ trách & ngân sách" note="Từ Dữ liệu gốc. Sửa trong Dữ liệu gốc.">
            <dl className="grid gap-3">
              {(['accountPic', 'growthPic', 'bookingPicLead'] as const).map(k => (
                <Info key={k} label={{ accountPic: 'Account PIC', growthPic: 'Growth PIC', bookingPicLead: 'Trưởng nhóm booking' }[k]}>
                  {real(m?.[k]) && <Person name={real(m?.[k])} size={20} />}
                </Info>
              ))}
              <Info label="Ngân sách booking tháng">{(m?.monthlyBudget || m?.planBudget) ? formatVndShort(m!.monthlyBudget || m!.planBudget) : ''}</Info>
              <Info label="Mục tiêu GMV tháng">{m?.targetGmv ? formatVndShort(m.targetGmv) : ''}</Info>
            </dl>
          </Aside>

          <Aside title="Booking đang chạy" action={onOpenBooking && openDeals.length > 0 && <Button size="sm" variant="ghost" onClick={onOpenBooking}>Mở</Button>}>
            <p className="text-[13px] text-ink">
              {openDeals.length === 0 ? <span className="text-ink-3">Không có booking đang chạy.</span> : <><span className="font-semibold tabular-nums">{openDeals.length}</span> booking · {formatVndShort(openValue)}</>}
            </p>
          </Aside>

          <Aside title={SECTION_LABEL.RATECARD} action={editBtn('RATECARD', () => setDialog('RATECARD'))} note="Mức tối đa cho một video theo khung lương KOC.">
            {p.ratecard.some(r => r.maxBudget) ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                {p.ratecard.map(r => (
                  <React.Fragment key={r.grade}>
                    <dt className="text-ink-2">{r.grade}</dt>
                    <dd className="text-right tabular-nums text-ink">{r.maxBudget ? formatVndShort(r.maxBudget) : <span className="text-ink-3">—</span>}</dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : (
              <p className="text-[13px] text-ink-3">Chưa đặt trần riêng cho nhãn.</p>
            )}
          </Aside>

          <Aside title={SECTION_LABEL.DOCUMENTS} action={addBtn('documents')}>
            {p.documents.length === 0 ? <p className="text-[13px] text-ink-3">Chưa có tài liệu.</p> : (
              <ul className="grid gap-2 text-[13px]">
                {p.documents.map((d, i) => (
                  <li key={d.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-accent hover:underline break-words">{d.title}</a>
                      <span className="block text-2xs text-ink-3">{DOC_CATEGORY_LABEL[d.category]} · {d.addedBy}</span>
                    </div>
                    {itemMenu('documents', i)}
                  </li>
                ))}
              </ul>
            )}
          </Aside>

          <History profile={p} />
        </aside>
      </div>

      {dialog === 'POSITIONING' && <PositioningDialog open value={p.positioning} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('POSITIONING', v)} />}
      {dialog === 'ENTITY' && <EntityDialog open value={p.entity} fallbackCompany={real(m?.companyName)} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('ENTITY', v)} />}
      {dialog === 'RATECARD' && <RatecardDialog open value={p.ratecard} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('RATECARD', { ratecard: v })} />}
      {dialog === 'CONTENT_RULES' && <ContentRulesDialog open value={p.contentRules} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('CONTENT_RULES', v)} />}

      {item && (() => {
        const meta = LIST_META[item.list]; const list = listOf(item.list); const current = item.index >= 0 ? list[item.index] : item.list === 'documents' ? { category: 'GUIDELINE' } : undefined;
        return (
          <ItemDialog
            open
            title={item.index >= 0 ? `Sửa ${meta.noun}` : `Thêm ${meta.noun}`}
            fields={meta.fields}
            item={current}
            busy={busy}
            onClose={() => setItem(null)}
            onSave={async next => {
              const updated = item.index >= 0 ? list.map((x, k) => (k === item.index ? next : x)) : [...list, next];
              const name = String(next.name || next.question || next.title || '');
              if (await saveList(item.list, updated, `${item.index >= 0 ? 'Sửa' : 'Thêm'} ${meta.noun}: ${name}`)) setItem(null);
            }}
          />
        );
      })()}

      <ConfirmDialog
        open={!!removing}
        title={removing ? `Xóa ${LIST_META[removing.list].noun}` : ''}
        description="Mục này bị xóa khỏi hồ sơ. Lịch sử vẫn ghi lại thao tác."
        tone="danger"
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!removing) return;
          const list = listOf(removing.list); const gone = list[removing.index];
          saveList(removing.list, list.filter((_, k) => k !== removing.index), `Xóa ${LIST_META[removing.list].noun}: ${String(gone?.name || gone?.question || gone?.title || '')}`);
        }}
        onOpenChange={o => !o && setRemoving(null)}
      />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="bg-surface border border-dashed border-line-strong rounded-xl"><EmptyState title="Chưa có dữ liệu" description={text} /></div>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink break-words">{children || <span className="text-ink-3">—</span>}</dd>
    </div>
  );
}

function Aside({ title, action, note, children }: { title: string; action?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 min-h-7 mb-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {note && <p className="text-2xs text-ink-3 mb-3">{note}</p>}
      {!note && <div className="mb-2" />}
      {children}
    </section>
  );
}

function History({ profile }: { profile: BrandProfile }) {
  const [all, setAll] = useState(false);
  const items = all ? profile.history : profile.history.slice(0, 5);
  return (
    <Aside title="Lịch sử">
      {profile.history.length === 0 ? <p className="text-[13px] text-ink-3">Chưa có thay đổi.</p> : (
        <ol className="grid gap-2.5">
          {items.map((h, i) => (
            <li key={i} className="grid gap-0.5">
              <span className="text-[13px] text-ink">{h.summary}</span>
              <span className="text-2xs text-ink-3">{h.actorName} · {dateTime(h.at)}</span>
            </li>
          ))}
          {profile.history.length > 5 && (
            <li><button type="button" className="text-[13px] text-accent hover:underline" onClick={() => setAll(v => !v)}>{all ? 'Thu gọn' : `Xem thêm ${profile.history.length - 5}`}</button></li>
          )}
        </ol>
      )}
    </Aside>
  );
}
