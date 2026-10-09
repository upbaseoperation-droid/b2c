'use client';

import React, { useState } from 'react';
import { ChannelTag, Avatar, ConfirmDialog } from '../ui';
import { 
  Award, 
  Coins, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Sliders, 
  UserCheck, 
  HelpCircle,
  FileCheck,
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { StaffP3Record, StoreDifficultyConfig, StorePortfolioItem, BookingDealItem, UserProfile } from '@/lib/types';
import { MOCK_P3_STAFF_RECORDS, MOCK_STORE_DIFFICULTIES } from '@/lib/mockData';
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
  deals = [],
  currentUser,
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

  React.useEffect(() => {
    if (storePortfolios.length > 0) {
      setStoreConfigs(storePortfolios.map(st => ({
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
      })));
    }
  }, [storePortfolios]);
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
      onNotify(`Đã cập nhật hệ số độ khó (x${newMultiplier}) và đồng bộ với Master Data`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Đánh Giá Hiệu Suất 4P & Tính Thưởng P3</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              Công thức chuẩn Upbase
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Minh bạch tính điểm Workload theo hệ số độ khó Store và tỷ lệ tuân thủ SLA, xóa bỏ cào bằng giữa các nhân sự.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('CALC')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              activeTab === 'CALC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bảng tính thưởng P3
          </button>
          <button
            onClick={() => setActiveTab('STORE_MATRIX')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              activeTab === 'STORE_MATRIX' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hệ số độ khó Store
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tổng quỹ thưởng P3</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-semibold text-slate-900 font-mono whitespace-nowrap">{totalBonusFund.toLocaleString('vi-VN')}&nbsp;₫</div>
          <div className="text-2xs text-emerald-600 font-medium mt-0.5">Dự toán ngân sách tháng</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tổng điểm Workload</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{totalWorkloadPoints.toFixed(1)} pts</div>
          <div className="text-2xs text-slate-500 mt-0.5">Đã quy đổi theo độ khó Store</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Hồ sơ đã duyệt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-semibold text-emerald-600">{approvedCount} / {staffRecords.length}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Lead đã thẩm định</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Chờ duyệt thưởng</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-semibold text-amber-600">{pendingCount} hồ sơ</div>
          <div className="text-2xs text-slate-500 mt-0.5">Cần Lead xác nhận</div>
        </div>
      </div>

      {activeTab === 'CALC' ? (
        <div className="space-y-4">
          {/* Formula Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">Công thức tính điểm P3 chuẩn (4P Marketing B2C):</span>
              <div className="font-mono text-slate-600 mt-1 bg-white px-2.5 py-1.5 rounded border border-slate-200 inline-block">
                Điểm Workload = Số Ca Hoàn Thành × Hệ Số Độ Khó Store (1.0 - 1.6) × Hệ Số Chất Lượng (0.9 - 1.15) × Hệ Số SLA (0.8 - 1.2)
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Tiền thưởng = Điểm Workload × Đơn giá điểm theo Level (Intern: 30.000&nbsp;₫, Junior: 35.000&nbsp;₫, Senior: 40.000&nbsp;₫).
              </p>
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Lọc theo bộ phận:</span>
              {(['ALL', 'Booking', 'Content', 'Brand'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2.5 py-1 text-xs rounded transition ${
                    selectedRole === role ? 'bg-blue-600 text-white font-semibold shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role === 'ALL' ? 'Tất cả' : role}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              Hiển thị <strong>{filteredStaff.length}</strong> nhân sự
            </div>
          </div>

          {/* Staff P3 Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-3 px-3">Nhân sự & Level</th>
                    <th className="py-3 px-3">Store phụ trách & hệ số</th>
                    <th className="py-3 px-3 text-center">Số ca đã làm</th>
                    <th className="py-3 px-3 text-center">Chất lượng & SLA</th>
                    <th className="py-3 px-3 text-right">Điểm Workload</th>
                    <th className="py-3 px-3 text-right">Thưởng P3 (VND)</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Role */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 font-medium text-slate-900"><Avatar name={item.staffName} size={22} />{item.staffName}</div>
                        <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-medium">{item.role}</span>
                          <span>• {item.level}</span>
                        </div>
                      </td>

                      {/* Store & Multiplier */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 line-clamp-1 max-w-[220px]" title={item.assignedStore}>
                          {item.assignedStore}
                        </div>
                        <div className="text-2xs mt-0.5">
                          <span className={`inline-block px-1.5 py-0.2 font-semibold rounded ${
                            item.storeMultiplier >= 1.6 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            item.storeMultiplier >= 1.4 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            Hệ số Store: x{item.storeMultiplier}
                          </span>
                        </div>
                      </td>

                      {/* Completed Cases */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-slate-900">{item.completedCases}</span>
                        <div className="text-2xs text-slate-400">cases/jobs</div>
                      </td>

                      {/* Quality & SLA Multipliers */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono text-2xs text-slate-700">
                          CL: <span className="font-semibold text-emerald-600">{item.qualityMultiplier}</span> | SLA: <span className="font-semibold text-blue-600">{item.slaMultiplier}</span>
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5">
                          {item.slaMultiplier >= 1.05 ? 'Vượt SLA' : item.slaMultiplier < 1.0 ? 'Có lỗi SLA' : 'Đạt chuẩn'}
                        </div>
                      </td>

                      {/* Workload Points */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-slate-900 text-sm">{item.calculatedWorkloadPoints.toFixed(1)}</div>
                        <div className="text-2xs text-slate-400 font-mono">pts</div>
                      </td>

                      {/* Bonus VND */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-emerald-600 text-sm font-mono whitespace-nowrap">
                          {item.estimatedBonusVnd.toLocaleString('vi-VN')}&nbsp;₫
                        </div>
                        <div className="text-2xs text-slate-400 font-mono">
                          {item.baseP3UnitRate.toLocaleString('vi-VN')}&nbsp;₫/điểm
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {item.approvalStatus === 'ĐÃ_DUYỆT' ? (
                          <span className="badge-emerald inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Đã Duyệt
                          </span>
                        ) : (
                          <span className="badge-amber inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold">
                            <AlertCircle className="w-3 h-3" /> Chờ Duyệt
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAiReviewStaff(item.staffName)}
                            className="btn-sm bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition flex items-center gap-1 shadow-2xs font-semibold"
                            title="AI Nhận xét hiệu suất &amp; đề xuất thưởng P3"
                          >
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>AI Review</span>
                          </button>
                          {item.approvalStatus === 'CHỜ_DUYỆT' ? (
                            <button
                              onClick={() => setApprovingRecord(item)}
                              className="btn-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-2xs"
                            >
                              Duyệt thưởng
                            </button>
                          ) : (
                            <span className="text-2xs text-slate-400 italic">Đã chốt</span>
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
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Nguyên tắc phân tầng độ khó Store:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2">
              <div className="bg-white p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800">Cơ bản</div>
                <div className="text-2xs text-slate-500 mt-0.5">Sản phẩm đơn lẻ, tệp KOC quen thuộc, Brand duyệt nhanh.</div>
              </div>
              <div className="bg-white p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800">Tiêu chuẩn</div>
                <div className="text-2xs text-slate-500 mt-0.5">Store ổn định, quy trình đàm phán và gửi mẫu chuẩn mực.</div>
              </div>
              <div className="bg-white p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800">Vừa</div>
                <div className="text-2xs text-slate-500 mt-0.5">Dược mỹ phẩm trị mụn, yêu cầu chuyên môn cao, nhiều SKU.</div>
              </div>
              <div className="bg-white p-2 border border-slate-200 rounded">
                <div className="font-semibold text-rose-700">Khó</div>
                <div className="text-2xs text-slate-500 mt-0.5">Casting khắt khe, Brand quốc tế duyệt lâu, tỷ lệ từ chối cao.</div>
              </div>
            </div>
          </div>

          {/* Store Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-3">Tên Store & kênh</th>
                  <th className="py-3 px-3">Ngành hàng</th>
                  <th className="py-3 px-3">PIC phụ trách</th>
                  <th className="py-3 px-3 text-right">Chỉ tiêu GMV tháng</th>
                  <th className="py-3 px-3 text-center">Tầng độ khó</th>
                  <th className="py-3 px-3 text-center">Hệ số quy đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeConfigs.map(store => (
                  <tr key={store.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{store.storeName}</div>
                      <ChannelTag channel={store.platform} className="mt-0.5" />
                    </td>
                    <td className="py-3 px-3 text-slate-700">{store.category}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{store.assignedPic}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono whitespace-nowrap">
                      {store.monthlyTargetGmv.toLocaleString('vi-VN')}&nbsp;₫
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-2xs font-semibold rounded ${
                        store.difficultyTier === 'Khó' ? 'bg-rose-100 text-rose-800' :
                        store.difficultyTier === 'Vừa' ? 'bg-amber-100 text-amber-800' :
                        store.difficultyTier === 'Tiêu chuẩn' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {store.difficultyTier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={store.multiplier}
                        onChange={(e) => handleUpdateStoreMultiplier(store.id, parseFloat(e.target.value))}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
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

      {/* AI Staff Performance Review Modal */}
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
        description={`Bạn có chắc chắn muốn phê duyệt khoản tiền thưởng P3 trị giá ${approvingRecord?.estimatedBonusVnd.toLocaleString('vi-VN')} ₫ (${approvingRecord?.calculatedWorkloadPoints} điểm) cho nhân sự ${approvingRecord?.staffName} (${approvingRecord?.role} - ${approvingRecord?.level})?`}
        confirmLabel="Duyệt chi thưởng"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => {
          if (approvingRecord) {
            handleApprove(approvingRecord.id);
            if (onNotify) {
              onNotify(`Đã phê duyệt thưởng P3 (${approvingRecord.estimatedBonusVnd.toLocaleString('vi-VN')} ₫) cho ${approvingRecord.staffName}`, 'success');
            }
            setApprovingRecord(null);
          }
        }}
      />
    </div>
  );
}
