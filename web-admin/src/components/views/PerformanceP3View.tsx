'use client';

import React, { useMemo, useState } from 'react';
import {
  Button,
  ChannelTag,
  Chips,
  ConfirmDialog,
  DataTable,
  FilterBar,
  Panel,
  Person,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';
import {
  StaffP3Record,
  StoreDifficultyConfig,
  StoreDifficultyTier,
  StorePortfolioItem,
  BookingDealItem,
  UserProfile,
  normalizeStoreCoefficient,
  formatStoreCoefficient,
  getStoreTierByCoefficient,
} from '@/lib/types';
import { MOCK_P3_STAFF_RECORDS, MOCK_STORE_DIFFICULTIES } from '@/lib/mockData';
import { formatVnd } from '../../lib/format';
import { AiStaffReviewModal } from '../AiStaffReviewModal';

export interface PerformanceP3ViewProps {
  storePortfolios?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateStoreDifficulty?: (storeId: string, multiplier: number, tier: 'Cơ bản' | 'Tiêu chuẩn' | 'Vừa' | 'Khó') => void;
}

export default function PerformanceP3View({
  storePortfolios = [],
  onNotify,
  onUpdateStoreDifficulty,
}: PerformanceP3ViewProps = {}) {
  const [activeTab, setActiveTab] = useState<'CALC' | 'STORE_MATRIX'>('CALC');
  const [staffRecords, setStaffRecords] = useState<StaffP3Record[]>(MOCK_P3_STAFF_RECORDS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');

  const initialMergedStores = useMemo<StoreDifficultyConfig[]>(() => {
    if (storePortfolios.length === 0) return MOCK_STORE_DIFFICULTIES;
    return storePortfolios.map((st) => {
      const normalized = normalizeStoreCoefficient(st.difficultyTier, st.difficultyMultiplier);
      return {
        id: st.id,
        storeName: st.storeName,
        platform: (st.platform === 'Shopee Mall' ? 'Shopee' : st.platform) as 'TikTok Shop' | 'Lazada' | 'Shopee',
        brandName: st.brandName,
        category: st.category || 'Tiêu dùng & Bán lẻ',
        monthlyTargetGmv: st.monthlyTargetGmv || 500000000,
        difficultyTier: normalized.tier,
        multiplier: normalized.multiplier,
        assignedPic: st.b2cOwnerName || st.accountOwnerName || 'Khánh Vy',
        accountOwner: st.accountOwnerName,
        b2cOwner: st.b2cOwnerName,
        activeKocsCount: st.activeBookingsCount || 8,
        notes: st.assignmentNotes || 'Đồng bộ từ Dữ liệu gốc Gian hàng',
        coefficientApprovalStatus: st.coefficientApprovalStatus || 'APPROVED_START_OF_MONTH',
        coefficientApprovedBy: st.coefficientApprovedBy || 'Đặng Thị Yến Nhi',
        coefficientApprovedAt: st.coefficientApprovedAt || '2026-10-01',
        coefficientPeriodMonth: st.coefficientPeriodMonth || '10/2026',
        coefficientAdjustedPlanCode: st.coefficientAdjustedPlanCode,
        coefficientAdjustmentReason: st.coefficientAdjustmentReason,
      };
    });
  }, [storePortfolios]);

  const [storeConfigs, setStoreConfigs] = useState<StoreDifficultyConfig[]>(initialMergedStores);
  const [prevPortfolios, setPrevPortfolios] = useState(storePortfolios);
  if (storePortfolios !== prevPortfolios) {
    setPrevPortfolios(storePortfolios);
    if (storePortfolios.length > 0) {
      setStoreConfigs(initialMergedStores);
    }
  }
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'Booking' | 'Content' | 'Brand'>('ALL');
  const [aiReviewStaff, setAiReviewStaff] = useState<string | null>(null);
  const [approvingRecord, setApprovingRecord] = useState<StaffP3Record | null>(null);

  // KPI summaries
  const totalBonusFund = staffRecords.reduce((sum, r) => sum + r.estimatedBonusVnd, 0);
  const totalWorkloadPoints = staffRecords.reduce((sum, r) => sum + r.calculatedWorkloadPoints, 0);
  const approvedCount = staffRecords.filter((r) => r.approvalStatus === 'ĐÃ_DUYỆT').length;
  const pendingCount = staffRecords.filter((r) => r.approvalStatus === 'CHỜ_DUYỆT').length;

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffRecords.filter((r) => {
      if (selectedRole !== 'ALL' && r.role !== selectedRole) return false;
      if (q) {
        const matchName = r.staffName.toLowerCase().includes(q);
        const matchStore = r.assignedStore.toLowerCase().includes(q);
        if (!matchName && !matchStore) return false;
      }
      return true;
    });
  }, [staffRecords, selectedRole, searchQuery]);

  const filteredStores = useMemo(() => {
    const q = storeSearchQuery.trim().toLowerCase();
    if (!q) return storeConfigs;
    return storeConfigs.filter(
      (s) =>
        s.storeName.toLowerCase().includes(q) ||
        (s.brandName || "").toLowerCase().includes(q) ||
        s.assignedPic.toLowerCase().includes(q)
    );
  }, [storeConfigs, storeSearchQuery]);

  const handleApprove = (id: string) => {
    setStaffRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, approvalStatus: 'ĐÃ_DUYỆT' };
        }
        return r;
      })
    );
  };

  const handleUpdateStoreMultiplier = (storeId: string, newMultiplier: number) => {
    const tier: StoreDifficultyTier = getStoreTierByCoefficient(newMultiplier);

    setStoreConfigs((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          return { ...s, multiplier: newMultiplier, difficultyTier: tier };
        }
        return s;
      })
    );

    if (onUpdateStoreDifficulty) {
      onUpdateStoreDifficulty(storeId, newMultiplier, tier);
    }
    if (onNotify) {
      onNotify(`Đã cập nhật hệ số gian hàng (${tier} — ${formatStoreCoefficient(newMultiplier)}) theo Bảng 2`);
    }
  };

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Tổng quỹ thưởng P3"
          value={formatVnd(totalBonusFund)}
          note="Dự toán ngân sách tháng"
        />
        <Stat
          label="Tổng điểm khối lượng"
          value={`${totalWorkloadPoints.toFixed(1)} điểm`}
          note="Đã quy đổi theo hệ số gian hàng"
        />
        <Stat
          label="Hồ sơ đã duyệt"
          value={`${approvedCount} / ${staffRecords.length}`}
          note="Trưởng phòng đã xác nhận"
        />
        <Stat
          label="Chờ duyệt thưởng"
          value={`${pendingCount} hồ sơ`}
          note="Cần Trưởng phòng xác nhận"
        />
      </StatRow>

      <Tabs
        items={[
          { key: 'CALC', label: 'Bảng tính thưởng P3', count: staffRecords.length },
          { key: 'STORE_MATRIX', label: 'Bảng 2. Hệ số gian hàng', count: storeConfigs.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'CALC' ? (
        <Panel flush>
          <FilterBar
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Tìm nhân sự, gian hàng phụ trách..." }}
            filters={
              <span className="text-xs text-ink-3 tabular-nums">
                {filteredStaff.length} nhân sự
              </span>
            }
            chips={<Chips
              value={selectedRole}
              onChange={setSelectedRole}
              items={[
                { key: 'ALL', label: 'Tất cả', count: staffRecords.length },
                {
                  key: 'Booking',
                  label: 'Booking',
                  count: staffRecords.filter((r) => r.role === 'Booking').length,
                },
                {
                  key: 'Content',
                  label: 'Content',
                  count: staffRecords.filter((r) => r.role === 'Content').length,
                },
                {
                  key: 'Brand',
                  label: 'Brand',
                  count: staffRecords.filter((r) => r.role === 'Brand').length,
                },
              ]}
            />}
          />

          <DataTable
            rows={filteredStaff}
            rowKey={(item) => item.id}
            columns={[
              {
                key: 'staff',
                header: 'Nhân sự',
                width: 210,
                render: (item) => (
                  <Person name={item.staffName} sub={`${item.role} · ${item.level}`} />
                ),
              },
              {
                key: 'store',
                header: 'Gian hàng & hệ số',
                width: 240,
                render: (item) => (
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate max-w-[230px]" title={item.assignedStore}>
                      {item.assignedStore}
                    </div>
                    <div className="text-xs text-ink-3 font-mono">
                      Hệ số {formatStoreCoefficient(item.storeMultiplier)} · {getStoreTierByCoefficient(item.storeMultiplier)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'cases',
                header: 'Số ca hoàn thành',
                align: 'right',
                render: (item) => <span className="text-ink">{item.completedCases} ca</span>,
              },
              {
                key: 'multipliers',
                header: 'Chất lượng & SLA',
                align: 'right',
                render: (item) => (
                  <div>
                    <div className="text-ink">
                      CL {item.qualityMultiplier} · SLA {item.slaMultiplier}
                    </div>
                    <div className="text-xs text-ink-3 font-sans">
                      {item.slaMultiplier >= 1.05
                        ? 'Vượt SLA'
                        : item.slaMultiplier < 1.0
                        ? 'Có lỗi SLA'
                        : 'Đạt chuẩn'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'workload',
                header: 'Điểm khối lượng',
                align: 'right',
                render: (item) => (
                  <span className="font-medium text-ink">
                    {item.calculatedWorkloadPoints.toFixed(1)} điểm
                  </span>
                ),
              },
              {
                key: 'bonus',
                header: 'Thưởng P3',
                align: 'right',
                render: (item) => (
                  <div>
                    <div className="font-semibold text-ink">
                      {formatVnd(item.estimatedBonusVnd)}
                    </div>
                    <div className="text-xs text-ink-3">
                      {formatVnd(item.baseP3UnitRate)}/điểm
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                width: 130,
                render: (item) =>
                  item.approvalStatus === 'ĐÃ_DUYỆT' ? (
                    <Status tone="positive">Đã duyệt</Status>
                  ) : (
                    <Status tone="warning">Chờ duyệt</Status>
                  ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                width: 210,
                render: (item) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAiReviewStaff(item.staffName)}
                    >
                      Nhận xét
                    </Button>
                    {item.approvalStatus === 'CHỜ_DUYỆT' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setApprovingRecord(item)}
                      >
                        Duyệt thưởng
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      ) : (
        <Panel flush>
          <FilterBar
            search={{ value: storeSearchQuery, onChange: setStoreSearchQuery, placeholder: "Tìm gian hàng, thương hiệu, PIC..." }}
            filters={
              <span className="text-xs text-ink-3 tabular-nums">
                {filteredStores.length} gian hàng
              </span>
            }
          />

          <DataTable
            rows={filteredStores}
            rowKey={(store) => store.id}
            columns={[
              {
                key: 'storeName',
                header: 'Gian hàng & sàn',
                render: (store) => (
                  <div>
                    <div className="font-medium text-ink">{store.storeName}</div>
                    <ChannelTag channel={store.platform} className="mt-0.5" />
                  </div>
                ),
              },
              {
                key: 'brandName',
                header: 'Thương hiệu & ngành hàng',
                render: (store) => (
                  <div>
                    <div className="font-medium text-ink">{store.brandName}</div>
                    <div className="text-xs text-ink-3">{store.category}</div>
                  </div>
                ),
              },
              {
                key: 'assignedPic',
                header: 'Chuyên viên phụ trách',
                render: (store) => <span className="text-ink">{store.assignedPic}</span>,
              },
              {
                key: 'monthlyTargetGmv',
                header: 'Chỉ tiêu GMV tháng',
                align: 'right',
                render: (store) => (
                  <span className="font-medium text-ink">{formatVnd(store.monthlyTargetGmv)}</span>
                ),
              },
              {
                key: 'difficultyTier',
                header: 'Mức độ',
                render: (store) => <span className="text-ink-2">{store.difficultyTier}</span>,
              },
              {
                key: 'multiplier',
                header: 'Hệ số gian hàng',
                align: 'right',
                width: 180,
                render: (store) => (
                  <Select
                    aria-label={`Hệ số ${store.storeName}`}
                    value={String(store.multiplier)}
                    onChange={(e) =>
                      handleUpdateStoreMultiplier(store.id, parseFloat(e.target.value))
                    }
                    className="w-auto font-mono"
                  >
                    <option value="0.8">0,80 (Cơ bản)</option>
                    <option value="1">1,00 (Tiêu chuẩn)</option>
                    <option value="1.25">1,25 (Vừa)</option>
                    <option value="1.5">1,50 (Khó)</option>
                  </Select>
                ),
              },
            ]}
          />
        </Panel>
      )}

      {aiReviewStaff && (
        <AiStaffReviewModal
          isOpen={Boolean(aiReviewStaff)}
          onClose={() => setAiReviewStaff(null)}
          initialStaffName={aiReviewStaff}
        />
      )}

      <ConfirmDialog
        open={Boolean(approvingRecord)}
        onOpenChange={(open) => !open && setApprovingRecord(null)}
        title="Xác nhận phê duyệt thưởng hiệu suất P3"
        description={`Bạn có chắc chắn muốn phê duyệt khoản tiền thưởng P3 trị giá ${
          approvingRecord ? formatVnd(approvingRecord.estimatedBonusVnd) : ''
        } (${approvingRecord?.calculatedWorkloadPoints} điểm) cho nhân sự ${
          approvingRecord?.staffName
        } (${approvingRecord?.role} - ${approvingRecord?.level})?`}
        confirmLabel="Duyệt chi thưởng"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => {
          if (approvingRecord) {
            handleApprove(approvingRecord.id);
            if (onNotify) {
              onNotify(
                `Đã phê duyệt thưởng P3 (${formatVnd(approvingRecord.estimatedBonusVnd)}) cho ${
                  approvingRecord.staffName
                }`,
                'success'
              );
            }
            setApprovingRecord(null);
          }
        }}
      />
    </div>
  );
}
