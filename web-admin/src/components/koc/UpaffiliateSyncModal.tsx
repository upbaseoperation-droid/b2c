'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import type { KocItem } from '../../lib/types';
import { formatNumber } from '../../lib/format';
import {
  computeKocUpaffiliateSyncMetrics,
  formatSyncDateTime,
  getUpaffiliateCreatorId,
  getUpaffiliateSyncStatus,
  SCHEDULE_MODE_LABELS,
  SYNC_DIRECTION_LABELS,
  type UpaffiliateSyncConfig,
  type UpaffiliateSyncDirection,
  type UpaffiliateSyncRunLog,
  type UpaffiliateSyncScheduleMode,
} from '../../lib/upaffiliateKocSyncService';
import { getKocLegalProfiles, LEGAL_TYPE_LABEL } from './kocUtils';
import {
  Button,
  Field,
  Input,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';

interface UpaffiliateSyncModalProps {
  open: boolean;
  onClose: () => void;
  kocs: KocItem[];
  config: UpaffiliateSyncConfig;
  logs: UpaffiliateSyncRunLog[];
  stagingPendingCount: number;
  isSyncing: boolean;
  onRunSync: (
    mode: 'INCREMENTAL' | 'FULL_PULL' | 'PUSH_PENDING',
  ) => Promise<void>;
  onSaveConfig: (patch: Partial<UpaffiliateSyncConfig>) => Promise<void>;
  onOpenStagingModal?: () => void;
}

type ModalTab = 'OVERVIEW' | 'SCHEDULE_CONFIG' | 'SYNC_LOGS';

export const UpaffiliateSyncModal: React.FC<UpaffiliateSyncModalProps> = ({
  open,
  onClose,
  kocs,
  config,
  logs,
  stagingPendingCount,
  isSyncing,
  onRunSync,
  onSaveConfig,
  onOpenStagingModal,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('OVERVIEW');
  const [draftConfig, setDraftConfig] = useState<UpaffiliateSyncConfig>(config);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [prevOpenConfig, setPrevOpenConfig] = useState<{
    open: boolean;
    config: UpaffiliateSyncConfig;
  }>({ open, config });
  if (open !== prevOpenConfig.open || config !== prevOpenConfig.config) {
    setPrevOpenConfig({ open, config });
    if (open) {
      setDraftConfig(config);
    }
  }

  const metrics = useMemo(() => computeKocUpaffiliateSyncMetrics(kocs), [kocs]);

  const pendingItemsList = useMemo(
    () =>
      kocs
        .filter((k) => {
          const st = getUpaffiliateSyncStatus(k);
          return st === 'LOCAL_MODIFIED' || st === 'PENDING_PUSH';
        })
        .slice(0, 15),
    [kocs],
  );

  const handleSaveSchedule = async () => {
    setIsSavingConfig(true);
    try {
      await onSaveConfig(draftConfig);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kết nối & Đồng bộ Định kỳ Dữ liệu KOC qua UpAffiliate"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 text-xs text-ink-2">
            <Status tone={config.enabled ? 'positive' : 'neutral'}>
              {config.enabled
                ? `Đang bật lịch: ${SCHEDULE_MODE_LABELS[config.scheduleMode]}`
                : 'Đang tắt tự động'}
            </Status>
            <span className="font-code text-ink-3">
              Cursor: {config.lastSyncCursor || 'UPA-CUR-INIT'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenStagingModal && stagingPendingCount > 0 && (
              <Button variant="secondary" onClick={onOpenStagingModal}>
                Bảng tạm chờ đẩy ({stagingPendingCount})
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="primary"
              icon={RefreshCw}
              disabled={isSyncing}
              onClick={() => void onRunSync('INCREMENTAL')}
            >
              {isSyncing ? 'Đang đồng bộ UpAffiliate...' : 'Đồng bộ ngay (2 chiều)'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs<ModalTab>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'OVERVIEW',
              label: 'Tổng quan & Đồng bộ 2 Bảng KOC',
            },
            {
              key: 'SCHEDULE_CONFIG',
              label: 'Cấu hình Lịch Đồng bộ Định kỳ',
            },
            {
              key: 'SYNC_LOGS',
              label: 'Nhật ký Phiên Đồng bộ',
              count: logs.length,
            },
          ]}
        />

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4">
            <StatRow>
              <Stat
                label="Bảng 1: KOC Cũ kèm lịch sử"
                value={`${formatNumber(metrics.cooperatedSynced)} KOC`}
                note="Đồng bộ BO, GMV, ROI & biên độ giá từ UpAffiliate"
                tone="positive"
              />
              <Stat
                label="Bảng 2: KOC Mới / Tiềm năng"
                value={`${formatNumber(metrics.newSynced)} KOC`}
                note={
                  stagingPendingCount > 0
                    ? `Kèm ${stagingPendingCount} KOC ở Bảng tạm chờ đẩy`
                    : 'Đồng bộ chỉ số kênh & trạng thái tiếp cận'
                }
              />
              <Stat
                label="Hồ sơ pháp lý & Thụ hưởng (1–N)"
                value={`${formatNumber(metrics.legalProfilesTotal)} hồ sơ`}
                note={`${formatNumber(metrics.multiLegalKocCount)} KOC có ≥ 2 pháp nhân`}
                tone="warning"
              />
              <Stat
                label="Lịch đồng bộ định kỳ"
                value={SCHEDULE_MODE_LABELS[config.scheduleMode]}
                note={`Gần nhất: ${formatSyncDateTime(config.lastSyncedAt)}`}
              />
            </StatRow>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-line bg-surface flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink inline-flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-accent" />
                      Đồng bộ Vi sai (Delta Cursor)
                    </span>
                    <Status tone="positive">Khuyên dùng</Status>
                  </div>
                  <div className="text-xs text-ink-2">
                    Chỉ kéo các KOC và Hồ sơ pháp lý 1–N có thay đổi từ mốc{' '}
                    <span className="font-code text-ink">
                      {config.lastSyncCursor || 'UPA-CUR-INIT'}
                    </span>{' '}
                    và đẩy các cập nhật tại Ops Hub lên UpAffiliate.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  disabled={isSyncing}
                  onClick={() => void onRunSync('INCREMENTAL')}
                >
                  Chạy đồng bộ Delta
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-line bg-surface flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink inline-flex items-center gap-2">
                      <ArrowDownToLine className="w-4 h-4 text-positive" />
                      Kéo toàn phần từ UpAffiliate
                    </span>
                    <Status tone="info">Full Snapshot</Status>
                  </div>
                  <div className="text-xs text-ink-2">
                    Đối soát toàn bộ 2 bảng KOC, danh sách pháp nhân{' '}
                    <span className="font-code text-ink">creator_legal_profile</span>,
                    số HĐNT và lịch sử nghiệm thu BO/Deal.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowDownToLine}
                  disabled={isSyncing}
                  onClick={() => void onRunSync('FULL_PULL')}
                >
                  Kéo toàn bộ về Ops Hub
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-line bg-surface flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink inline-flex items-center gap-2">
                      <ArrowUpFromLine className="w-4 h-4 text-warning" />
                      Đẩy KOC Mới &amp; Pháp lý lên UpAffiliate
                    </span>
                    <Status
                      tone={
                        metrics.pendingPushCount +
                          metrics.localModifiedCount +
                          stagingPendingCount >
                        0
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {metrics.pendingPushCount +
                        metrics.localModifiedCount +
                        stagingPendingCount}{' '}
                      chờ đẩy
                    </Status>
                  </div>
                  <div className="text-xs text-ink-2">
                    Đẩy các KOC mới thêm, KOC trong bảng tạm và các Hồ sơ pháp lý
                    1–N vừa cập nhật tại B2C Ops Hub sang UpAffiliate.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowUpFromLine}
                  disabled={isSyncing}
                  onClick={() => void onRunSync('PUSH_PENDING')}
                >
                  Đẩy bản ghi chờ lên UpAffiliate
                </Button>
              </div>
            </div>

            <Panel
              title="Ánh xạ dữ liệu UpAffiliate và B2C"
              actions={
                <span className="text-2xs font-code text-ink-3">
                  Phiên đồng bộ kế tiếp: {formatSyncDateTime(config.nextScheduledSyncAt)}
                </span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-sunken text-ink-2 border-b border-line">
                    <tr>
                      <th className="py-2 px-3">Thực thể UpAffiliate (Nguồn gốc)</th>
                      <th className="py-2 px-3">Bảng dữ liệu tại B2C Ops Hub</th>
                      <th className="py-2 px-3">Khóa đối soát</th>
                      <th className="py-2 px-3">Quy tắc đồng bộ định kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="py-3 px-3 font-code text-ink font-medium">
                        creator + job_summary (deals &gt; 0)
                      </td>
                      <td className="py-3 px-3 font-medium text-ink">
                        1. Bảng KOC Cũ kèm lịch sử (COOPERATED)
                      </td>
                      <td className="py-3 px-3 font-code text-ink-2">
                        upaffiliateCreatorId + @channelId
                      </td>
                      <td className="py-3 px-3 text-ink-2">
                        Cập nhật tổng số chiến dịch, GMV, chi phí Cast, ROI, biên độ giá Min–Max và các Brand/PIC từng hợp tác.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-code text-ink font-medium">
                        creator_legal_profile + payment_account (1:N)
                      </td>
                      <td className="py-3 px-3 font-medium text-ink">
                        Hồ sơ pháp lý &amp; Thụ hưởng (1–N)
                      </td>
                      <td className="py-3 px-3 font-code text-ink-2">
                        upaffiliateLegalProfileId + CCCD/MST
                      </td>
                      <td className="py-3 px-3 text-ink-2">
                        Đồng bộ danh sách pháp nhân (Cá nhân / HKD / Công ty), tài khoản ngân hàng thụ hưởng và số Hợp đồng nguyên tắc (HĐNT).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-code text-ink font-medium">
                        creator_discovery / KOC_Tiem_Nang (deals = 0)
                      </td>
                      <td className="py-3 px-3 font-medium text-ink">
                        2. Bảng KOC Mới / Tiềm năng (NEW)
                      </td>
                      <td className="py-3 px-3 font-code text-ink-2">
                        @channelId (chuẩn hóa)
                      </td>
                      <td className="py-3 px-3 text-ink-2">
                        Đồng bộ chỉ số kênh 30d, độ sẵn sàng booking; tự động chuyển sang Bảng 1 khi phát sinh đơn BO nghiệm thu đầu tiên.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>

            {pendingItemsList.length > 0 && (
              <Panel
                title={`Hàng đợi Bản ghi KOC / Hồ sơ pháp lý Vừa sửa tại Ops Hub (${pendingItemsList.length})`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-sunken text-ink-2 border-b border-line">
                      <tr>
                        <th className="py-2 px-3">Mã UpAffiliate</th>
                        <th className="py-2 px-3">KOC / Kênh</th>
                        <th className="py-2 px-3">Bảng dữ liệu</th>
                        <th className="py-2 px-3">Hồ sơ pháp lý (1–N)</th>
                        <th className="py-2 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pendingItemsList.map((k) => {
                        const profiles = getKocLegalProfiles(k);
                        const st = getUpaffiliateSyncStatus(k);
                        return (
                          <tr key={k.id}>
                            <td className="py-2 px-3 font-code text-ink-2">
                              {getUpaffiliateCreatorId(k)}
                            </td>
                            <td className="py-2 px-3 font-medium text-ink">
                              {k.stageName}{' '}
                              <span className="font-code text-ink-3">@{k.channelId}</span>
                            </td>
                            <td className="py-2 px-3">
                              {k.datasetType === 'NEW'
                                ? 'Bảng 2: KOC Mới'
                                : 'Bảng 1: KOC Hợp tác'}
                            </td>
                            <td className="py-2 px-3">
                              {profiles.length > 0
                                ? `${profiles.length} hồ sơ (${profiles
                                    .map((p) => LEGAL_TYPE_LABEL[p.legalType])
                                    .join(', ')})`
                                : 'Chưa khai báo'}
                            </td>
                            <td className="py-2 px-3">
                              <Status tone={st === 'PENDING_PUSH' ? 'warning' : 'info'}>
                                {st === 'PENDING_PUSH'
                                  ? 'KOC mới chờ đẩy'
                                  : 'Vừa cập nhật pháp lý/hồ sơ'}
                              </Status>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </div>
        )}

        {activeTab === 'SCHEDULE_CONFIG' && (
          <div className="space-y-4">
            <Panel title="Thiết lập Chu kỳ & Chiều Đồng bộ Định kỳ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Trạng thái kích hoạt lịch định kỳ">
                  <Select
                    value={draftConfig.enabled ? 'ENABLED' : 'DISABLED'}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        enabled: e.target.value === 'ENABLED',
                      }))
                    }
                  >
                    <option value="ENABLED">Bật đồng bộ định kỳ tự động</option>
                    <option value="DISABLED">
                      Tạm dừng lịch tự động (Chỉ đồng bộ khi bấm nút)
                    </option>
                  </Select>
                </Field>

                <Field label="Tần suất chạy định kỳ (Cron Schedule)">
                  <Select
                    value={draftConfig.scheduleMode}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        scheduleMode: e.target.value as UpaffiliateSyncScheduleMode,
                      }))
                    }
                  >
                    <option value="EVERY_1H">{SCHEDULE_MODE_LABELS.EVERY_1H}</option>
                    <option value="EVERY_6H">{SCHEDULE_MODE_LABELS.EVERY_6H}</option>
                    <option value="DAILY_02AM">{SCHEDULE_MODE_LABELS.DAILY_02AM}</option>
                    <option value="MANUAL_ONLY">{SCHEDULE_MODE_LABELS.MANUAL_ONLY}</option>
                  </Select>
                </Field>

                <Field label="Chiều đồng bộ dữ liệu">
                  <Select
                    value={draftConfig.syncDirection}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        syncDirection: e.target.value as UpaffiliateSyncDirection,
                      }))
                    }
                  >
                    <option value="BIDIRECTIONAL">
                      {SYNC_DIRECTION_LABELS.BIDIRECTIONAL}
                    </option>
                    <option value="PULL_FROM_UPAFFILIATE">
                      {SYNC_DIRECTION_LABELS.PULL_FROM_UPAFFILIATE}
                    </option>
                    <option value="PUSH_TO_UPAFFILIATE">
                      {SYNC_DIRECTION_LABELS.PUSH_TO_UPAFFILIATE}
                    </option>
                  </Select>
                </Field>

                <Field label="Điểm cuối kết nối UpAffiliate (Endpoint URL)">
                  <Input
                    value={draftConfig.endpointUrl}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        endpointUrl: e.target.value,
                      }))
                    }
                    placeholder="https://api.upaffiliate.vn/v1/kol-connector/koc-master-sync"
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Phạm vi Dữ liệu Đồng bộ trong Mỗi Chu kỳ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.scope.cooperatedKocs}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        scope: { ...prev.scope, cooperatedKocs: e.target.checked },
                      }))
                    }
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-ink">
                      Đồng bộ Bảng 1: KOC Cũ kèm lịch sử (COOPERATED)
                    </div>
                    <div className="text-ink-2 mt-0.5">
                      Cập nhật thông tin kênh, bậc lương KL1–KL7 và danh sách Brand/PIC đã hợp tác.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.scope.legalProfiles1toN}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        scope: { ...prev.scope, legalProfiles1toN: e.target.checked },
                      }))
                    }
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-ink">
                      Đồng bộ 1–N Hồ sơ pháp lý &amp; Thụ hưởng (creator_legal_profile)
                    </div>
                    <div className="text-ink-2 mt-0.5">
                      Đồng bộ toàn bộ pháp nhân Cá nhân / Hộ kinh doanh / Công ty, STK thụ hưởng và Hợp đồng nguyên tắc (HĐNT).
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.scope.newPotentialKocs}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        scope: { ...prev.scope, newPotentialKocs: e.target.checked },
                      }))
                    }
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-ink">
                      Đồng bộ Bảng 2: KOC Mới / Tiềm năng &amp; Bảng tạm
                    </div>
                    <div className="text-ink-2 mt-0.5">
                      Đẩy KOC mới khám phá từ Ops Hub lên UpAffiliate và nhận lại mã định danh UPA-NEW.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.scope.autoPromoteNewToCooperated}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        scope: {
                          ...prev.scope,
                          autoPromoteNewToCooperated: e.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-ink">
                      Tự động chuyển KOC Mới sang Bảng KOC Hợp tác khi phát sinh BO
                    </div>
                    <div className="text-ink-2 mt-0.5">
                      Khi KOC ở Bảng 2 phát sinh đơn nghiệm thu đầu tiên trên UpAffiliate, tự động nâng cấp sang Bảng 1.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="primary"
                  icon={Settings2}
                  disabled={isSavingConfig}
                  onClick={() => void handleSaveSchedule()}
                >
                  {isSavingConfig ? 'Đang lưu cấu hình...' : 'Lưu Cấu hình Lịch Đồng bộ'}
                </Button>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'SYNC_LOGS' && (
          <Panel title="Lịch sử Các Phiên Đồng bộ Định kỳ & Thủ công với UpAffiliate">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-3">
                Chưa có bản ghi lịch sử đồng bộ nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-sunken text-ink-2 border-b border-line">
                    <tr>
                      <th className="py-3 px-3">Thời điểm</th>
                      <th className="py-3 px-3">Phương thức kích hoạt</th>
                      <th className="py-3 px-3 text-right">KOC Cũ</th>
                      <th className="py-3 px-3 text-right">KOC Mới</th>
                      <th className="py-3 px-3 text-right">Hồ sơ pháp lý (1–N)</th>
                      <th className="py-3 px-3 text-right">Đẩy lên UPA</th>
                      <th className="py-3 px-3">Mã Cursor</th>
                      <th className="py-3 px-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-hover">
                        <td className="py-3 px-3 font-code text-ink whitespace-nowrap">
                          {formatSyncDateTime(log.completedAt)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">
                            {log.triggerType === 'SCHEDULED_CRON'
                              ? 'Lịch định kỳ tự động'
                              : log.triggerType === 'STAGING_PUSH'
                                ? 'Đẩy từ Bảng tạm'
                                : 'Đồng bộ thủ công'}
                          </div>
                          <div className="text-2xs text-ink-3">{log.triggeredBy}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-code tabular-nums">
                          {formatNumber(log.summary.pulledCooperatedCount)}
                        </td>
                        <td className="py-3 px-3 text-right font-code tabular-nums">
                          {formatNumber(log.summary.pulledNewCount)}
                        </td>
                        <td className="py-3 px-3 text-right font-code tabular-nums">
                          {formatNumber(log.summary.syncedLegalProfilesCount)}
                        </td>
                        <td className="py-3 px-3 text-right font-code tabular-nums">
                          {formatNumber(
                            log.summary.pushedNewKocsCount +
                              log.summary.pushedLegalProfilesCount,
                          )}
                        </td>
                        <td className="py-3 px-3 font-code text-2xs text-ink-2">
                          {log.cursorAfter}
                        </td>
                        <td className="py-3 px-3">
                          <Status
                            tone={
                              log.status === 'SUCCESS'
                                ? 'positive'
                                : log.status === 'PARTIAL_WARNING'
                                  ? 'warning'
                                  : 'critical'
                            }
                          >
                            {log.status === 'SUCCESS'
                              ? `Thành công (${log.summary.durationMs}ms)`
                              : 'Cảnh báo'}
                          </Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </Modal>
  );
};
