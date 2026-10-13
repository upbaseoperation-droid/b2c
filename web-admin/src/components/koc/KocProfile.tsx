'use client';

/**
 * Hồ sơ một KOC — dùng chung cho trang chi tiết (Danh bạ KOC) và modal (màn Booking).
 * Bố cục hai cột: trái là thông tin để quyết định book (chỉ số, booking), phải là thông tin
 * tra cứu (liên hệ, pháp lý, ghi chú). Thiếu dữ liệu thì hiện “—” hoặc trạng thái rỗng, không điền số mẫu.
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, FileScan, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import type { BookingDealItem, KocItem, UserProfile } from '../../lib/types';
import { formatDate, formatNumber, formatVndShort } from '../../lib/format';
import { Avatar, Button, CHANNELS, DataTable, EmptyState, Field, Modal, Panel, Person, SectionHeader, Stat, StatRow, Status, Textarea } from '../ui';
import type { Column } from '../ui';
import {
  LEGAL_TYPE_LABEL,
  canRevealSensitive,
  dealStatusOf,
  dealStepOf,
  dealsOfKoc,
  formatFollowers,
  hasLegalId,
  isDealOpen,
  legalIdOf,
  legalTypeOf,
  mask,
  picOfDeal,
  type DuplicateMatch,
} from './kocUtils';

const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(' ');
/** Ngày ISO hoặc dd/mm/yyyy → dd/mm */
const shortDate = (s: string) => {
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : null;
  if (d && !isNaN(d.getTime())) return formatDate(d).slice(0, 5);
  return s.length >= 5 ? s.slice(0, 5) : s;
};
const pct = (n: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n)}%`;

export interface KocProfileProps {
  koc: KocItem;
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  duplicates?: DuplicateMatch[];
  /** `page`: hai cột, có đầu trang. `modal`: một cột, tên KOC nằm ở tiêu đề modal. */
  layout?: 'page' | 'modal';
  /** Điều hướng trong trang chi tiết. */
  nav?: { onBack: () => void; onPrev?: () => void; onNext?: () => void; position?: number; total?: number };
  onOpenKoc?: (kocId: string) => void;
  onCreateBooking?: (koc: KocItem) => void;
  onUpdateMetrics?: (koc: KocItem) => void;
  onScanDocs?: (koc: KocItem) => void;
}

export function classificationOf(k: KocItem): string {
  return [k.salaryGrade, k.segment, k.tepKenh || k.creatorCategory, k.kocCategory, k.location, k.isWinnerTop20 && 'Nhóm top 20 GMV']
    .filter(Boolean)
    .join(' · ');
}

export function KocProfile({
  koc,
  deals,
  currentUser,
  duplicates = [],
  layout = 'page',
  nav,
  onOpenKoc,
  onCreateBooking,
  onUpdateMetrics,
  onScanDocs,
}: KocProfileProps) {
  const isPage = layout === 'page';
  const kocDeals = useMemo(
    () => dealsOfKoc(deals, koc).sort((a, b) => Number(isDealOpen(b)) - Number(isDealOpen(a))),
    [deals, koc],
  );
  const missingDocs = !hasLegalId(koc);
  const handle = koc.channelId.replace(/^@/, '');

  return (
    <div className="space-y-6">
      {isPage && nav && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.onBack} className="-ml-2.5">
            Danh bạ KOC
          </Button>
          {(nav.onPrev || nav.onNext) && (
            <div className="flex items-center gap-1.5 text-2xs text-ink-3">
              {nav.position && nav.total ? <span className="tabular-nums mr-1">{nav.position} / {nav.total}</span> : null}
              <IconButton label="KOC trước" onClick={nav.onPrev}><ChevronLeft className="w-4 h-4" /></IconButton>
              <IconButton label="KOC sau" onClick={nav.onNext}><ChevronRight className="w-4 h-4" /></IconButton>
            </div>
          )}
        </div>
      )}

      {/* Đầu hồ sơ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {isPage && <Avatar name={koc.stageName} src={koc.avatarUrl} size={48} />}
          <div className="min-w-0 grid gap-1">
            {isPage && (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">{koc.stageName}</h2>
                {missingDocs && <Status tone="warning">Thiếu giấy tờ</Status>}
                {duplicates.length > 0 && <Status tone="warning">Nghi trùng</Status>}
              </div>
            )}
            <p className="text-[13px] text-ink-2">
              <a
                href={koc.channelLink || `https://www.tiktok.com/@${handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                @{handle}
                <ExternalLink className="w-3 h-3" />
              </a>
              {isPage && <span className="text-ink-3"> · {classificationOf(koc)}</span>}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              <span>{koc.brandName || 'Chưa gán nhãn hàng'}</span>
              {koc.bookingPic ? <Person name={koc.bookingPic} sub="PIC phụ trách" size={20} /> : <span className="text-ink-3">Chưa có PIC</span>}
            </div>
          </div>
        </div>
        {onCreateBooking && (
          <Button variant="primary" icon={Plus} onClick={() => onCreateBooking(koc)}>
            Tạo booking
          </Button>
        )}
      </header>

      {duplicates.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warning-soft text-[13px] text-ink">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
          <p>
            Có thể trùng với{' '}
            {duplicates.slice(0, 3).map((d, i) => (
              <React.Fragment key={d.kocId}>
                {i > 0 && ', '}
                {onOpenKoc ? (
                  <button type="button" onClick={() => onOpenKoc(d.kocId)} className="font-medium text-accent hover:underline">
                    {d.stageName}
                  </button>
                ) : (
                  <span className="font-medium">{d.stageName}</span>
                )}{' '}
                <span className="text-ink-2">(cùng {d.fields.join(', ')})</span>
              </React.Fragment>
            ))}
            {duplicates.length > 3 && ` và ${duplicates.length - 3} hồ sơ khác`}
            . Kiểm tra trước khi tạo booking hoặc hợp đồng.
          </p>
        </div>
      )}

      <div className={cx('grid gap-6 items-start', isPage && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
        <div className="grid gap-6 min-w-0">
          <MetricsPanel koc={koc} onUpdate={onUpdateMetrics} />
          <BookingPanel koc={koc} deals={kocDeals} currentUser={currentUser} />
        </div>
        <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0">
          <ContactPanel koc={koc} />
          <LegalPanel koc={koc} currentUser={currentUser} onScanDocs={onScanDocs} />
          <NotesPanel koc={koc} />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Chỉ số */

function MetricsPanel({ koc, onUpdate }: { koc: KocItem; onUpdate?: (k: KocItem) => void }) {
  const shares = [
    { label: 'Video', value: koc.gmvShareVideo, color: CHANNELS.tiktok.color },
    { label: 'Livestream', value: koc.gmvShareLive, color: CHANNELS.live.color },
    { label: 'Thẻ sản phẩm', value: koc.gmvShareProductCard, color: CHANNELS.other.color },
  ].filter((s): s is { label: string; value: number; color: string } => typeof s.value === 'number' && s.value > 0);
  const shareTotal = shares.reduce((s, x) => s + x.value, 0);

  const gender = [
    typeof koc.femaleRatio === 'number' && `Nữ ${pct(koc.femaleRatio)}`,
    typeof koc.maleRatio === 'number' && `Nam ${pct(koc.maleRatio)}`,
  ].filter(Boolean);
  const ages = [
    typeof koc.age18_24 === 'number' && `18–24 tuổi ${pct(koc.age18_24)}`,
    typeof koc.age25_34 === 'number' && `25–34 tuổi ${pct(koc.age25_34)}`,
    typeof koc.age35Plus === 'number' && `Từ 35 tuổi ${pct(koc.age35Plus)}`,
  ].filter(Boolean);

  return (
    <section className="grid gap-4">
      <SectionHeader
        title="Chỉ số kênh"
        description={koc.metricsUpdatedAt ? `Cập nhật ${formatDate(koc.metricsUpdatedAt)}` : 'Chưa có ngày cập nhật'}
        actions={onUpdate && <Button size="sm" icon={RefreshCw} onClick={() => onUpdate(koc)}>Cập nhật chỉ số</Button>}
      />
      <div className="grid gap-5">
        <StatRow>
          <Stat label="Followers" value={formatFollowers(koc.followers)} note={koc.avgViews ? `View trung bình ${formatNumber(koc.avgViews)}` : undefined} />
          <Stat label="Giá mỗi video" value={koc.rateCardVideo ? formatVndShort(koc.rateCardVideo) : '—'} note={`Khung ${koc.salaryGrade}`} />
          <Stat
            label="Doanh số kênh"
            value={koc.recentRevenue ? formatVndShort(koc.recentRevenue) : '—'}
            note={koc.itemsSold ? `${formatNumber(koc.itemsSold)} đơn` : koc.recentRevenue ? undefined : 'Chưa có dữ liệu'}
          />
          <Stat
            label="Giá trị đơn trung bình"
            value={koc.aov ? formatVndShort(koc.aov) : '—'}
            note={typeof koc.gpm === 'number' ? `GPM ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(koc.gpm)}` : 'Chưa có dữ liệu'}
          />
        </StatRow>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
          <div className="grid gap-2">
            <dt className="text-2xs text-ink-3">Doanh số theo định dạng</dt>
            <dd>
              {shares.length === 0 ? (
                <span className="text-ink-3">Chưa có dữ liệu</span>
              ) : (
                <div className="grid gap-2">
                  <div className="flex h-2 gap-[2px] rounded-full overflow-hidden bg-sunken" role="img" aria-label={shares.map((s) => `${s.label} ${pct(s.value)}`).join(', ')}>
                    {shares.map((s) => (
                      <span key={s.label} className="h-full" style={{ width: `${(s.value / shareTotal) * 100}%`, background: s.color }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {shares.map((s) => (
                      <span key={s.label} className="inline-flex items-center gap-1.5 text-2xs text-ink-2">
                        <span className="w-2 h-2 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
                        {s.label} <span className="text-ink-3 tabular-nums">{pct(s.value)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </dd>
          </div>
          <div className="grid gap-2">
            <dt className="text-2xs text-ink-3">Khán giả</dt>
            <dd className="text-ink-2 grid gap-0.5">
              {gender.length === 0 && ages.length === 0 ? (
                <span className="text-ink-3">Chưa có dữ liệu</span>
              ) : (
                <>
                  {gender.length > 0 && <span>{gender.join(' · ')}</span>}
                  {ages.length > 0 && <span>{ages.join(' · ')}</span>}
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Booking */

function BookingPanel({ koc, deals, currentUser }: { koc: KocItem; deals: BookingDealItem[]; currentUser?: UserProfile }) {
  const [askDeal, setAskDeal] = useState<BookingDealItem | null>(null);
  const counted = deals.filter((d) => d.status !== 'CANCELLED');
  const cost = counted.reduce((s, d) => s + (d.totalValue || 0), 0);
  const gmv = counted.reduce((s, d) => s + (d.gmv30 || 0), 0);
  const openCount = deals.filter(isDealOpen).length;
  const me = currentUser?.name.trim().toLowerCase();

  const columns: Column<BookingDealItem>[] = [
    {
      key: 'deal',
      header: 'Booking',
      width: 200,
      render: (d) => (
        <div className="min-w-0 max-w-[230px]">
          <span className="block truncate text-ink" title={d.productName}>{d.brandName}{d.productName ? ` · ${d.productName}` : ''}</span>
          <span className="block font-code text-2xs text-ink-3">{d.dealCode}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 150,
      render: (d) => {
        const s = dealStatusOf(d);
        const step = isDealOpen(d) ? [dealStepOf(d), d.deadlinePost && `hạn ${shortDate(d.deadlinePost)}`].filter(Boolean).join(' · ') : '';
        return (
          <div className="grid gap-1 justify-items-start">
            <Status tone={s.tone}>{s.label}</Status>
            {step && <span className="text-2xs text-ink-3">{step}</span>}
          </div>
        );
      },
    },
    {
      key: 'pic',
      header: 'PIC',
      width: 140,
      render: (d) => {
        const pic = picOfDeal(d);
        if (!pic) return <span className="text-ink-3">—</span>;
        const canAsk = isDealOpen(d) && pic.trim().toLowerCase() !== me;
        return (
          <div className="grid gap-1 justify-items-start">
            <Person name={pic} size={20} />
            {canAsk && (
              <button type="button" onClick={() => setAskDeal(d)} className="inline-flex items-center gap-1 text-2xs text-accent hover:underline">
                <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
                Hỏi {pic.split(' ').pop()}
              </button>
            )}
          </div>
        );
      },
    },
    { key: 'cost', header: 'Giá', align: 'right', width: 70, render: (d) => (d.totalValue ? formatVndShort(d.totalValue) : '—') },
    { key: 'gmv', header: 'GMV 30 ngày', align: 'right', width: 100, render: (d) => (d.gmv30 ? formatVndShort(d.gmv30) : <span className="text-ink-3">—</span>) },
  ];

  const summary =
    counted.length === 0
      ? undefined
      : [
          `${counted.length} booking`,
          openCount > 0 && `${openCount} đang chạy`,
          gmv > 0 && `GMV 30 ngày ${formatVndShort(gmv)}`,
          gmv > 0 && cost > 0 && `ROI ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(gmv / cost)}`,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <Panel title="Booking" description={summary} flush>
      <DataTable
        columns={columns}
        rows={deals}
        rowKey={(d) => d.id}
        empty={
          <EmptyState
            title="Chưa có booking nào trên hệ thống"
            description={
              koc.totalPastDeals
                ? `Dữ liệu cũ ghi nhận ${koc.totalPastDeals} booking${koc.totalPastGmv ? `, GMV ${formatVndShort(koc.totalPastGmv)}` : ''}.`
                : 'Booking của KOC này sẽ hiện ở đây kèm trạng thái và GMV.'
            }
          />
        }
      />
      <AskColleagueModal key={askDeal?.id || 'none'} deal={askDeal} koc={koc} currentUser={currentUser} onClose={() => setAskDeal(null)} />
    </Panel>
  );
}

function AskColleagueModal({ deal, koc, currentUser, onClose }: { deal: BookingDealItem | null; koc: KocItem; currentUser?: UserProfile; onClose: () => void }) {
  const pic = deal ? picOfDeal(deal) : '';
  const initial = deal
    ? `Chào ${pic}, ${currentUser?.name || 'mình'} bên Booking B2C. Mình thấy bạn đang chạy booking ${deal.dealCode} (${deal.brandName}) với ${koc.stageName}. Bạn cho mình hỏi KOC phản hồi và giữ tiến độ thế nào, chất lượng video ra sao? Nếu đợt này bên bạn book thêm thì mình ghép chung để thương lượng giá nhé.`
    : '';
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <Modal
      open={!!deal}
      onClose={onClose}
      title={`Hỏi ${pic} về KOC`}
      description="Sao chép tin nhắn rồi gửi qua Lark."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            icon={copied ? Check : Copy}
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}
          </Button>
        </>
      }
    >
      <Field label="Tin nhắn" htmlFor="ask-colleague">
        <Textarea id="ask-colleague" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}

/* ------------------------------------------------------- Cột tra cứu */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink break-words">{children || <span className="text-ink-3">—</span>}</dd>
    </div>
  );
}

function ContactPanel({ koc }: { koc: KocItem }) {
  return (
    <AsideSection title="Liên hệ & nhận mẫu">
      <dl className="grid gap-3">
        <InfoRow label="Số điện thoại">{koc.phone}</InfoRow>
        <InfoRow label="Zalo">{koc.zalo && koc.zalo !== koc.phone ? koc.zalo : koc.zalo ? 'Cùng số điện thoại' : ''}</InfoRow>
        <InfoRow label="Email">{koc.email}</InfoRow>
        <InfoRow label="Địa chỉ nhận mẫu">{koc.shippingAddress}</InfoRow>
      </dl>
    </AsideSection>
  );
}

function LegalPanel({ koc, currentUser, onScanDocs }: { koc: KocItem; currentUser?: UserProfile; onScanDocs?: (k: KocItem) => void }) {
  const [revealed, setRevealed] = useState(false);
  const allowed = canRevealSensitive(currentUser, koc);
  const type = legalTypeOf(koc);
  const legalId = legalIdOf(koc);
  const show = (v: string) => (revealed ? v : mask(v));
  const scanButton = onScanDocs && (
    <Button size="sm" icon={FileScan} onClick={() => onScanDocs(koc)}>
      {legalId ? 'Đọc lại giấy tờ' : 'Đọc ảnh giấy tờ'}
    </Button>
  );

  if (!legalId) {
    return (
      <AsideSection title="Pháp lý & thanh toán">
        <p className="text-[13px] text-ink-2">Chưa có giấy tờ. Cần CCCD (cá nhân) hoặc giấy đăng ký kinh doanh để lập hợp đồng và thanh toán.</p>
        {scanButton && <div className="mt-3">{scanButton}</div>}
      </AsideSection>
    );
  }

  return (
    <AsideSection
      title="Pháp lý & thanh toán"
      actions={
        allowed && (
          <Button size="sm" variant="ghost" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Ẩn số' : 'Hiện số'}
          </Button>
        )
      }
    >
      <dl className="grid gap-3">
        <InfoRow label="Loại hồ sơ">{LEGAL_TYPE_LABEL[type]}</InfoRow>
        <InfoRow label={type === 'INDIVIDUAL' ? 'Họ tên' : 'Tên đơn vị'}>{type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName}</InfoRow>
        <InfoRow label={type === 'INDIVIDUAL' ? 'Số CCCD' : 'Mã số thuế'}>
          <SensitiveValue value={show(legalId)} copyValue={revealed ? legalId : undefined} />
        </InfoRow>
        {type === 'INDIVIDUAL' && (koc.issueDate || koc.issuePlace) && (
          <InfoRow label="Ngày cấp, nơi cấp">{[koc.issueDate, koc.issuePlace].filter(Boolean).join(' · ')}</InfoRow>
        )}
        {revealed && koc.permanentAddress && <InfoRow label="Địa chỉ trên giấy tờ">{koc.permanentAddress}</InfoRow>}
        <InfoRow label="Tài khoản nhận tiền">
          {koc.bankAccount ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <SensitiveValue value={show(koc.bankAccount)} copyValue={revealed ? koc.bankAccount : undefined} />
              {koc.bankName && <span className="text-ink-3">· {koc.bankName}</span>}
            </span>
          ) : (
            ''
          )}
        </InfoRow>
      </dl>
      <div className="grid gap-2 justify-items-start mt-4">
        <span className="text-2xs text-ink-3">
          {allowed ? 'Số đầy đủ chỉ hiện khi bạn bấm “Hiện số”.' : 'Trưởng nhóm, trưởng phòng và PIC phụ trách xem được số đầy đủ.'}
        </span>
        {scanButton}
      </div>
    </AsideSection>
  );
}

function SensitiveValue({ value, copyValue }: { value: string; copyValue?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-code tabular-nums">
      {value}
      {copyValue && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(copyValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="p-0.5 rounded text-ink-3 hover:text-ink"
          aria-label="Sao chép"
          title="Sao chép"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}

function NotesPanel({ koc }: { koc: KocItem }) {
  const notes = [
    koc.contentNote && { label: 'Ghi chú nội dung', text: koc.contentNote },
    koc.accountComment && { label: 'Nhận xét của trưởng nhóm', text: koc.accountComment },
    koc.brandRejectReason && { label: 'Lý do brand từ chối', text: koc.brandRejectReason },
  ].filter((n): n is { label: string; text: string } => !!n);
  return (
    <AsideSection title="Ghi chú">
      {notes.length === 0 ? (
        <p className="text-[13px] text-ink-3">Chưa có ghi chú cho KOC này.</p>
      ) : (
        <dl className="grid gap-3">
          {notes.map((n) => (
            <InfoRow key={n.label} label={n.label}>
              <span className="text-ink-2 leading-relaxed">{n.text}</span>
            </InfoRow>
          ))}
        </dl>
      )}
    </AsideSection>
  );
}

/** Một mục trong cột tra cứu. Cả cột chung một khung, các mục ngăn bằng đường kẻ. */
function AsideSection({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 mb-3 min-h-7">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!onClick}
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-line-strong text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
