'use client';

import React, { useRef, useState } from 'react';
import { ChannelTag, Avatar, ConfirmDialog, Tabs, Status, useFlipList } from '../ui';
import { 
  Coins, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { StaffP3Record, StoreDifficultyConfig, StorePortfolioItem, BookingDealItem, UserProfile } from '@/lib/types';
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
  onUpdateStoreDifficulty
}: PerformanceP3ViewProps = {}) {
  const [activeTab, setActiveTab] = useState<'CALC' | 'STORE_MATRIX'>('CALC');
  const [staffRecords, setStaffRecords] = useState<StaffP3Record[]>(MOCK_P3_STAFF_RECORDS);

  const initialMergedStores = React.useMemo<StoreDifficultyConfig[]>(() => {
    if (storePortfolios.length === 0) return MOCK_STORE_DIFFICULTIES;
    return storePortfolios.map(st => ({
      id: st.id,
      storeName: st.storeName,
      platform: (st.platform === 'Shopee Mall' ? 'Shopee' : st.platform) as 'TikTok Shop' | 'Lazada' | 'Shopee',
      brandName: st.brandName,
      category: st.category || 'Tiêu dùng & Bán lẻ',
      monthlyTargetGmv: st.monthlyTargetGmv || 500000000,
      difficultyTier: st.difficultyTier,
      multiplier: st.difficultyMultiplier,
      assignedPic: st.b2cOwnerName || st.accountOwnerName || 'Khánh Vy',
      accountOwner: st.accountOwnerName,
      b2cOwner: st.b2cOwnerName,
      activeKocsCount: st.activeBookingsCount || 8,
      notes: st.assignmentNotes || 'Đồng bộ từ Dữ liệu gốc Gian hàng'
    }));
  }, [storePortfolios]);

  const [storeConfigs, setStoreConfigs] = useState<StoreDifficultyConfig[]>(initialMergedStores);
  const [prevPortfolios, setPrevPortfolios] = useState(storePortfolios);
  if (storePortfolios !== prevPortfolios) {
    setPrevPortfolios(storePortfolios);
    if (storePortfolios.length > 0) {
      setStoreConfigs(initialMergedStores);
    }
  }
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [aiReviewStaff, setAiReviewStaff] = useState<string | null>(null);
  const [approvingRecord, setApprovingRecord] = useState<StaffP3Record | null>(null);

  // KPI summaries
  const totalBonusFund = staffRecords.reduce((sum, r) => sum + r.estimatedBonusVnd, 0);
  const totalWorkloadPoints = staffRecords.reduce((sum, r) => sum + r.calculatedWorkloadPoints, 0);
  const approvedCount = staffRecords.filter(r => r.approvalStatus === 'ĐÃ_DUYỆT').length;
  const pendingCount = staffRecords.filter(r => r.approvalStatus === 'CHỜ_DUYỆT').length;

  const filteredStaff = staffRecords.filter(r => {
    return selectedRole === 'ALL' || r.role === selectedRole;
  });
  const staffBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(staffBodyRef, filteredStaff.map(r => r.id).join('|'));

  const handleApprove = (id: string) => {
    setStaffRecords(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, approvalStatus: 'ĐÃ_DUYỆT' };
      }
      return r;
    }));
  };

  const handleUpdateStoreMultiplier = (storeId: string, newMultiplier: number) => {
    let tier: 'Cơ bản' | 'Tiêu chuẩn' | 'Vừa' | 'Khó' = 'Cơ bản';
    if (newMultiplier >= 1.6) tier = 'Khó';
    else if (newMultiplier >= 1.4) tier = 'Vừa';
    else if (newMultiplier >= 1.2) tier = 'Tiêu chuẩn';

    setStoreConfigs(prev => prev.map(s => {
      if (s.id === storeId) {
        return { ...s, multiplier: newMultiplier, difficultyTier: tier };
      }
      return s;
    }));

    if (onUpdateStoreDifficulty) {
      onUpdateStoreDifficulty(storeId, newMultiplier, tier);
    }
    if (onNotify) {
      onNotify(`Đã cập nhật hệ số độ khó (x${newMultiplier}) cho gian hàng`);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-line rounded-xl p-3.5">
          <div className="flex items-center justify-between text-ink-3 mb-1">
            <span className="text-xs font-medium">Tổng quỹ thưởng P3</span>
            <Coins className="w-4 h-4 text-warning" />
          </div>
          <div className="text-xl font-semibold text-ink font-mono whitespace-nowrap">{formatVnd(totalBonusFund)}</div>
          <div className="text-2xs text-positive font-medium mt-0.5">Dự toán ngân sách tháng</div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-3.5">
          <div className="flex items-center justify-between text-ink-3 mb-1">
            <span className="text-xs font-medium">Tổng điểm khối lượng việc</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-semibold text-ink">{totalWorkloadPoints.toFixed(1)} điểm</div>
          <div className="text-2xs text-ink-3 mt-0.5">Đã quy đổi theo độ khó gian hàng</div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-3.5">
          <div className="flex items-center justify-between text-ink-3 mb-1">
            <span className="text-xs font-medium">Hồ sơ đã duyệt</span>
            <CheckCircle2 className="w-4 h-4 text-positive" />
          </div>
          <div className="text-xl font-semibold text-positive">{approvedCount} / {staffRecords.length}</div>
          <div className="text-2xs text-ink-3 mt-0.5">Trưởng phòng đã thẩm định</div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-3.5">
          <div className="flex items-center justify-between text-ink-3 mb-1">
            <span className="text-xs font-medium">Chờ duyệt thưởng</span>
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-xl font-semibold text-warning">{pendingCount} hồ sơ</div>
          <div className="text-2xs text-ink-3 mt-0.5">Cần Trưởng phòng xác nhận</div>
        </div>
      </div>

      {/* Subtabs */}
      <Tabs
        items={[
          { key: 'CALC', label: 'Bảng tính thưởng P3', count: staffRecords.length },
          { key: 'STORE_MATRIX', label: 'Hệ số độ khó gian hàng', count: storeConfigs.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'CALC' ? (
        <div className="space-y-4">
          {/* Formula Callout */}
          <div className="bg-canvas border border-line rounded-xl p-3 text-xs text-ink-2 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-ink-3 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-ink">Công thức tính điểm P3 chuẩn (4P Marketing B2C):</span>
              <div className="font-mono text-ink-2 mt-1 bg-surface px-2.5 py-1.5 rounded border border-line inline-block">
                Điểm khối lượng việc = Số ca hoàn thành × Hệ số độ khó gian hàng (1.0 - 1.6) × Hệ số chất lượng (0.9 - 1.15) × Hệ số SLA (0.8 - 1.2)
              </div>
              <p className="text-2xs text-ink-3 mt-1">
                Tiền thưởng = Điểm khối lượng việc × Đơn giá điểm theo bậc ({formatVnd(30000)}, {formatVnd(35000)}, {formatVnd(40000)}).
              </p>
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center justify-between gap-3 bg-surface p-3 border border-line rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-3">Lọc theo bộ phận:</span>
              {(['ALL', 'Booking', 'Content', 'Brand'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    selectedRole === role ? 'bg-primary text-white font-semibold' : 'bg-sunken text-ink-2 hover:text-ink'
                  }`}
                >
                  {role === 'ALL' ? 'Tất cả' : role}
                </button>
              ))}
            </div>

            <div className="text-xs text-ink-3">
              Hiển thị <strong>{filteredStaff.length}</strong> nhân sự
            </div>
          </div>

          {/* Staff P3 Table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-line text-ink-3 font-medium">
                  <tr>
                    <th className="py-3 px-3">Nhân sự & cấp bậc</th>
                    <th className="py-3 px-3">Gian hàng phụ trách & hệ số</th>
                    <th className="py-3 px-3 text-center">Số ca đã làm</th>
                    <th className="py-3 px-3 text-center">Chất lượng & SLA</th>
                    <th className="py-3 px-3 text-right">Điểm khối lượng</th>
                    <th className="py-3 px-3 text-right">Thưởng P3</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody ref={staffBodyRef} className="divide-y divide-line">
                  {filteredStaff.map(item => (
                    <tr key={item.id} data-flip={item.id} className="hover:bg-canvas transition">
                      {/* Name & Role */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 font-medium text-ink"><Avatar name={item.staffName} size={22} />{item.staffName}</div>
                        <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-sunken rounded text-ink-2 font-medium">{item.role}</span>
                          <span>• {item.level}</span>
                        </div>
                      </td>

                      {/* Store & Multiplier */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-ink line-clamp-1 max-w-[220px]" title={item.assignedStore}>
                          {item.assignedStore}
                        </div>
                        <div className="text-2xs mt-0.5">
                          <span className={`inline-block px-1.5 py-0.5 font-semibold rounded ${
                            item.storeMultiplier >= 1.6 ? 'bg-critical-soft text-critical' :
                            item.storeMultiplier >= 1.4 ? 'bg-warning-soft text-warning' :
                            'bg-sunken text-ink-2'
                          }`}>
                            Hệ số gian hàng: x{item.storeMultiplier}
                          </span>
                        </div>
                      </td>

                      {/* Completed Cases */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-ink">{item.completedCases}</span>
                        <div className="text-2xs text-ink-3">ca</div>
                      </td>

                      {/* Quality & SLA Multipliers */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono text-2xs text-ink-2">
                          CL: <span className="font-semibold text-positive">{item.qualityMultiplier}</span> | SLA: <span className="font-semibold text-accent">{item.slaMultiplier}</span>
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">
                          {item.slaMultiplier >= 1.05 ? 'Vượt SLA' : item.slaMultiplier < 1.0 ? 'Có lỗi SLA' : 'Đạt chuẩn'}
                        </div>
                      </td>

                      {/* Workload Points */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-ink text-sm">{item.calculatedWorkloadPoints.toFixed(1)}</div>
                        <div className="text-2xs text-ink-3 font-mono">điểm</div>
                      </td>

                      {/* Bonus VND */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-positive text-sm font-mono whitespace-nowrap">
                          {formatVnd(item.estimatedBonusVnd)}
                        </div>
                        <div className="text-2xs text-ink-3 font-mono">
                          {formatVnd(item.baseP3UnitRate)}/điểm
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {item.approvalStatus === 'ĐÃ_DUYỆT' ? (
                          <Status tone="positive">Đã duyệt</Status>
                        ) : (
                          <Status tone="warning">Chờ duyệt</Status>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAiReviewStaff(item.staffName)}
                            className="btn-sm bg-surface hover:bg-sunken text-ink border border-line-strong rounded-md transition flex items-center gap-1 font-medium"
                            title="Nhận xét hiệu suất và đề xuất thưởng P3"
                          >
                            <Sparkles className="w-3 h-3 text-ink-3" />
                            <span>Gợi ý nhận xét</span>
                          </button>
                          {item.approvalStatus === 'CHỜ_DUYỆT' ? (
                            <button
                              onClick={() => setApprovingRecord(item)}
                              className="btn-sm bg-primary hover:bg-primary-hover text-white font-medium rounded-md transition"
                            >
                              Duyệt thưởng
                            </button>
                          ) : (
                            <span className="text-2xs text-ink-3">Đã chốt</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Store Matrix Tab */
        <div className="space-y-4">
          <div className="bg-canvas border border-line rounded-xl p-3 text-xs text-ink-2">
            <span className="font-semibold text-ink">Nguyên tắc phân tầng độ khó gian hàng:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2">
              <div className="bg-surface p-2 border border-line rounded-md">
                <div className="font-semibold text-ink">Cơ bản</div>
                <div className="text-2xs text-ink-3 mt-0.5">Sản phẩm đơn lẻ, tệp KOC quen thuộc, Brand duyệt nhanh.</div>
              </div>
              <div className="bg-surface p-2 border border-line rounded-md">
                <div className="font-semibold text-ink">Tiêu chuẩn</div>
                <div className="text-2xs text-ink-3 mt-0.5">Gian hàng ổn định, quy trình đàm phán và gửi mẫu chuẩn mực.</div>
              </div>
              <div className="bg-surface p-2 border border-line rounded-md">
                <div className="font-semibold text-ink">Vừa</div>
                <div className="text-2xs text-ink-3 mt-0.5">Dược mỹ phẩm trị mụn, yêu cầu chuyên môn cao, nhiều SKU.</div>
              </div>
              <div className="bg-surface p-2 border border-line rounded-md">
                <div className="font-semibold text-critical">Khó</div>
                <div className="text-2xs text-ink-3 mt-0.5">Tuyển chọn khắt khe, Brand quốc tế duyệt lâu, tỷ lệ từ chối cao.</div>
              </div>
            </div>
          </div>

          {/* Store Table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-ink-3 font-medium">
                <tr>
                  <th className="py-3 px-3">Tên gian hàng & kênh</th>
                  <th className="py-3 px-3">Ngành hàng</th>
                  <th className="py-3 px-3">PIC phụ trách</th>
                  <th className="py-3 px-3 text-right">Chỉ tiêu GMV tháng</th>
                  <th className="py-3 px-3 text-center">Tầng độ khó</th>
                  <th className="py-3 px-3 text-center">Hệ số quy đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {storeConfigs.map(store => (
                  <tr key={store.id} className="hover:bg-canvas transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-ink">{store.storeName}</div>
                      <ChannelTag channel={store.platform} className="mt-0.5" />
                    </td>
                    <td className="py-3 px-3 text-ink-2">{store.category}</td>
                    <td className="py-3 px-3 font-medium text-ink">{store.assignedPic}</td>
                    <td className="py-3 px-3 text-right font-semibold text-ink font-mono whitespace-nowrap">
                      {formatVnd(store.monthlyTargetGmv)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-2xs font-semibold rounded ${
                        store.difficultyTier === 'Khó' ? 'bg-critical-soft text-critical' :
                        store.difficultyTier === 'Vừa' ? 'bg-warning-soft text-warning' :
                        store.difficultyTier === 'Tiêu chuẩn' ? 'bg-accent-soft text-accent' :
                        'bg-sunken text-ink-2'
                      }`}>
                        {store.difficultyTier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={store.multiplier}
                        onChange={(e) => handleUpdateStoreMultiplier(store.id, parseFloat(e.target.value))}
                        className="text-xs font-semibold bg-surface border border-line-strong rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-focus"
                      >
                        <option value="1.0">x1.0 (Cơ bản)</option>
                        <option value="1.2">x1.2 (Tiêu chuẩn)</option>
                        <option value="1.4">x1.4 (Vừa)</option>
                        <option value="1.6">x1.6 (Khó)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Performance Review Modal */}
      {aiReviewStaff && (
        <AiStaffReviewModal
          isOpen={Boolean(aiReviewStaff)}
          onClose={() => setAiReviewStaff(null)}
          initialStaffName={aiReviewStaff}
        />
      )}

      {/* Confirm Approve P3 Bonus Dialog */}
      <ConfirmDialog
        open={Boolean(approvingRecord)}
        onOpenChange={(open) => !open && setApprovingRecord(null)}
        title="Xác nhận phê duyệt thưởng hiệu suất P3"
        description={`Bạn có chắc chắn muốn phê duyệt khoản tiền thưởng P3 trị giá ${approvingRecord ? formatVnd(approvingRecord.estimatedBonusVnd) : ''} (${approvingRecord?.calculatedWorkloadPoints} điểm) cho nhân sự ${approvingRecord?.staffName} (${approvingRecord?.role} - ${approvingRecord?.level})?`}
        confirmLabel="Duyệt chi thưởng"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => {
          if (approvingRecord) {
            handleApprove(approvingRecord.id);
            if (onNotify) {
              onNotify(`Đã phê duyệt thưởng P3 (${formatVnd(approvingRecord.estimatedBonusVnd)}) cho ${approvingRecord.staffName}`, 'success');
            }
            setApprovingRecord(null);
          }
        }}
      />
    </div>
  );
}
