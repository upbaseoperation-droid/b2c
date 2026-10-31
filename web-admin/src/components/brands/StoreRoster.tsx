'use client';

/**
 * Danh sách gian hàng của một thương hiệu trong hồ sơ: mỗi gian một mục gồm định danh, nhân sự (Dữ liệu gốc),
 * kế hoạch tháng, chỉ tiêu video và thực tế tháng. Chỉ hiện trường có nguồn thật; thiếu thì "—".
 */

import React from 'react';
import { FileSpreadsheet, Video } from 'lucide-react';
import type { BrandDetail, StorePortfolioItem } from '../../lib/types';
import type { StoreMonthlyPlanReport } from '../../lib/monthlyProfileMetrics';
import { formatNumber, formatVndShort } from '../../lib/format';
import { isBackupEffective, storeCoBookings, storeLeader, storeMainBooking } from '../../lib/storePositions';
import { Button, ChannelTag, Person, Status, channelOf } from '../ui';

type MasterStore = NonNullable<BrandDetail['stores']>[number];

const isPlaceholder = (name?: string) => !name || /^chưa/i.test(name.trim());
const realName = (name?: string) => (isPlaceholder(name) ? '' : name!.trim());
const money = (n?: number) => (n && n > 0 ? formatVndShort(n) : '—');
const count = (n?: number) => (n && n > 0 ? formatNumber(n) : '—');

const ACCOUNT_STATUS: Record<string, { label: string; tone: 'info' | 'neutral' }> = {
  ACTIVE: { label: 'Đang chạy', tone: 'info' },
  ONBOARDING: { label: 'Nháp', tone: 'neutral' },
  MAINTENANCE: { label: 'Tạm dừng', tone: 'neutral' },
  OFFBOARDED: { label: 'Đã hủy', tone: 'neutral' },
};

/** Gói dịch vụ lấy từ tên vận hành Brand_Sàn_Gói (VD: 4PM_TikTok_E2E-S → E2E-S). */
const servicePackageOf = (store: StorePortfolioItem) =>
  store.servicePackage || (store.storeName.split('_').length >= 3 ? store.storeName.split('_').pop() : '');

export function StoreRoster({
  reports,
  stores,
  masterStores,
  month,
  isStoreMasterMonth,
  onOpenPlan,
  onOpenBooking,
  onOpenStore,
}: {
  reports: StoreMonthlyPlanReport[];
  stores: StorePortfolioItem[];
  masterStores: MasterStore[];
  month: string;
  /** Tháng mà ngân sách, chỉ tiêu ghi trên gian (Dữ liệu gốc) có hiệu lực. */
  isStoreMasterMonth: boolean;
  onOpenPlan?: (sr: StoreMonthlyPlanReport) => void;
  onOpenBooking?: (sr: StoreMonthlyPlanReport) => void;
  onOpenStore?: (storeName: string) => void;
}) {
  return (
    <ul className="divide-y divide-line">
      {reports.map(sr => {
        const store = stores.find(s => s.id === sr.storeId || s.storeName === sr.storeName);
        const master = masterStores.find(ms => ms.storeName === sr.storeName || ms.storeId === store?.storeOperationId);
        const status = ACCOUNT_STATUS[store?.accountStatus || ''];
        const pkg = store ? servicePackageOf(store) : '';
        const main = store ? realName(storeMainBooking(store)) : '';
        const co = store ? storeCoBookings(store).filter(n => !isPlaceholder(n)) : [];
        const leader = store ? realName(storeLeader(store)) : '';
        const backup = store && isBackupEffective(store) ? realName(store.backupOwnerName) : '';
        const spendTone = sr.isOverbudget ? 'text-critical' : sr.isUnbudgetedSpend ? 'text-warning' : 'text-ink';

        return (
          <li key={sr.storeId} className="px-4 py-4 grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 grid gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-ink">{sr.storeName}</span>
                  <ChannelTag channel={channelOf(sr.platform)} />
                  {status && <Status tone={status.tone}>{status.label}</Status>}
                </div>
                <p className="text-2xs text-ink-3 flex flex-wrap gap-x-2">
                  {store?.storeOperationId && <span className="font-code">{store.storeOperationId}</span>}
                  {pkg && <span>Gói {pkg}</span>}
                  {store?.difficultyTier && (
                    <span>
                      Độ khó {store.difficultyTier.toLowerCase()} × {String(store.difficultyMultiplier).replace('.', ',')}
                    </span>
                  )}
                  {master?.requiresSparkAds !== undefined && (
                    <span>{master.requiresSparkAds ? 'Cần mã Spark Ads' : 'Không cần mã Spark Ads'}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onOpenPlan && (
                  <Button size="sm" variant="secondary" icon={FileSpreadsheet} onClick={() => onOpenPlan(sr)}>
                    Kế hoạch
                  </Button>
                )}
                {onOpenBooking && (
                  <Button size="sm" variant="secondary" icon={Video} onClick={() => onOpenBooking(sr)}>
                    Booking ({sr.bookings.length})
                  </Button>
                )}
                {onOpenStore && (
                  <Button size="sm" variant="ghost" onClick={() => onOpenStore(sr.storeName)}>
                    Hồ sơ gian
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
              <Group title="Nhân sự">
                <Row label="Booking chính">{main ? <Person name={main} size={18} /> : <Missing>Chưa phân công</Missing>}</Row>
                {co.length > 0 && (
                  <Row label="Cùng làm">
                    <span className="grid gap-1 justify-items-end">{co.map(n => <Person key={n} name={n} size={18} />)}</span>
                  </Row>
                )}
                <Row label="Trưởng nhóm">{leader ? <Person name={leader} size={18} /> : <span className="text-ink-3" title="Không có trưởng nhóm, kế hoạch trình thẳng Trưởng phòng">Không có</span>}</Row>
                {backup && <Row label={`Dự phòng${store?.backupTo ? ` đến ${store.backupTo}` : ''}`}><Person name={backup} size={18} /></Row>}
                <Row label="Kênh brand">{realName(store?.contentPic) ? <Person name={store!.contentPic!} size={18} /> : '—'}</Row>
                <Row label="Account">{realName(store?.accountOwnerName) ? <Person name={store!.accountOwnerName} size={18} /> : '—'}</Row>
              </Group>

              <Group title={`Ngân sách Net ${month}`}>
                <Row label="Tổng" strong>{money(sr.planBudgetNet)}</Row>
                <Row label="Affiliate">{money(sr.planAffBudgetNet)}</Row>
                <Row label="Kênh brand">{money(sr.planSelfBudgetNet)}</Row>
                {isStoreMasterMonth && <Row label="Livestream">{money(store?.budgetLive)}</Row>}
                <Row label="Gross">{money(sr.planBudgetGross)}</Row>
              </Group>

              <Group title={`Chỉ tiêu video ${month}`}>
                <Row label="Tổng" strong>{count(sr.planTotalVideos)}</Row>
                <Row label="Affiliate">{count(sr.planAffiliateVideos)}</Row>
                <Row label="Kênh brand">{count(sr.planSelfChannelVideos)}</Row>
                <Row label="Gửi mẫu FOC">{count(sr.planFocVideos)}</Row>
                {isStoreMasterMonth && <Row label="Phiên livestream">{count(store?.targetLiveSessions)}</Row>}
              </Group>

              <Group title={`Thực tế ${month}`}>
                {sr.hasData ? (
                  <>
                    <Row label="NMV" strong>
                      {formatVndShort(sr.reportNmv)}
                      {sr.planNmv > 0 && <span className="text-ink-3 font-normal"> · {sr.nmvAchievementPct}%</span>}
                    </Row>
                    <Row label="Đã chi">
                      <span className={spendTone}>
                        {formatVndShort(sr.reportSpentNet)}
                        {sr.isUnbudgetedSpend ? ' · ngoài kế hoạch' : sr.isOverbudget ? ' · vượt ngân sách' : sr.planBudgetNet > 0 ? ` · ${sr.budgetBurnPct}%` : ''}
                      </span>
                    </Row>
                    <Row label="Deal">{formatNumber(sr.bookings.length)}</Row>
                    <Row label="Lên sóng">{formatNumber(sr.reportAiredCount)}</Row>
                    <Row label="Trạng thái">{sr.planStatusLabel}</Row>
                  </>
                ) : (
                  <p className="text-xs text-ink-3">Chưa có dữ liệu tháng này</p>
                )}
              </Group>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-2 min-w-0">
      <h4 className="text-2xs font-medium text-ink-3">{title}</h4>
      <dl className="grid gap-2">{children}</dl>
    </section>
  );
}

function Row({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs min-w-0">
      <dt className="text-ink-3 shrink-0">{label}</dt>
      <dd className={`text-right tabular-nums min-w-0 ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>{children}</dd>
    </div>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-warning">{children}</span>;
}
