'use client';

import React, { useState } from 'react';
import { formatVndShort } from '../lib/format';
import { Button, EmptyState } from './ui';
import { 
  Target, 
  DollarSign, 
  Video, 
  Calendar, 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  ExternalLink,
  Edit3,
  Trash2,
  Zap,
  Info,
  UserCheck,
  Award,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  StaffDetailedPlanItem, 
  MonthlyStaffAllocation, 
  KocItem, 
  KocTier, 
  SalaryGrade,
  TepKenh,
  StaffPlanStatus
} from '../lib/types';

interface MyPlanWorkspaceProps {
  currentStaffName: string;
  allocation: MonthlyStaffAllocation | null;
  planItems: StaffDetailedPlanItem[];
  kocs: KocItem[];
  onAddPlanItem: (newItem: Omit<StaffDetailedPlanItem, 'id' | 'updatedAt'>) => void;
  onUpdatePlanItem: (item: StaffDetailedPlanItem) => void;
  onDeletePlanItem: (itemId: string) => void;
  onSubmitPlanToLead: (staffName: string) => void;
  onConvertItemToDeal: (item: StaffDetailedPlanItem) => void;
}

export const MyPlanWorkspace: React.FC<MyPlanWorkspaceProps> = ({
  currentStaffName,
  allocation,
  planItems,
  kocs,
  onAddPlanItem,
  onUpdatePlanItem,
  onDeletePlanItem,
  onSubmitPlanToLead,
  onConvertItemToDeal
}) => {
  const staffItems = planItems.filter(i => i.staffName === currentStaffName);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'ALL' | 'W1' | 'W2' | 'W3' | 'W4'>('ALL');

  // Form for adding new plan slot
  const [formBrand, setFormBrand] = useState(allocation?.assignedBrands[0] || 'Senka');
  const [formWeek, setFormWeek] = useState<'W1' | 'W2' | 'W3' | 'W4'>('W1');
  const [formTier, setFormTier] = useState<KocTier>('TIER_3_MICRO');
  const [formSalaryGrade, setFormSalaryGrade] = useState<SalaryGrade>('KL4');
  const [formKocName, setFormKocName] = useState('');
  const [formChannelId, setFormChannelId] = useState('');
  const [formTepKenh, setFormTepKenh] = useState<TepKenh>('Beauty');
  const [formPillar, setFormPillar] = useState('Review trực tiếp');
  const [formBudget, setFormBudget] = useState(4000000);
  const [formGmv, setFormGmv] = useState(30000000);

  // Suggested KOCs based on chosen brand/tier
  const handleSelectExistingKoc = (koc: KocItem) => {
    setFormKocName(koc.stageName);
    setFormChannelId(koc.channelId);
    setFormSalaryGrade(koc.salaryGrade);
    setFormTier(koc.tier);
    setFormTepKenh(koc.tepKenh || 'Beauty');
    setFormBudget(koc.rateCardVideo);
    setFormGmv(koc.gmvBestCase || koc.rateCardVideo * 7);
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPlanItem({
      staffName: currentStaffName,
      month: allocation?.month || '2026/09',
      brandName: formBrand,
      tier: formTier,
      salaryGrade: formSalaryGrade,
      targetWeek: formWeek,
      kocStageName: formKocName.trim() || '[Slot trống] Cần tìm KOC',
      channelId: formChannelId.trim() || undefined,
      tepKenh: formTepKenh,
      contentPillar: formPillar,
      budgetEstimated: Number(formBudget) || 0,
      targetGmv: Number(formGmv) || 0,
      status: 'DRAFT',
      leadNotes: 'Đang chuẩn bị đề xuất kịch bản'
    });

    setIsAddModalOpen(false);
    setFormKocName('');
    setFormChannelId('');
  };

  // Metrics
  const targetVideos = allocation?.planVideos || 1;
  const targetBudget = allocation?.planBudget || 1;
  const targetGmv = allocation?.targetGmv || 1;

  const plannedVideos = staffItems.length;
  const plannedBudget = staffItems.reduce((sum, i) => sum + (i.budgetEstimated || 0), 0);
  const plannedGmv = staffItems.reduce((sum, i) => sum + (i.targetGmv || 0), 0);

  const fillRateVideos = Math.round((plannedVideos / targetVideos) * 100);
  const fillRateBudget = Math.round((plannedBudget / targetBudget) * 100);

  const filteredItems = staffItems.filter(i => {
    if (selectedWeekFilter !== 'ALL' && i.targetWeek !== selectedWeekFilter) return false;
    return true;
  });

  const approvedCount = staffItems.filter(i => i.status === 'APPROVED' || i.status === 'CONVERTED').length;
  const pendingCount = staffItems.filter(i => i.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. MASTER ALLOCATION BRIEF FROM MANAGER                                    */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Kế hoạch tháng của {currentStaffName}
              </h2>
              <span className="text-2xs px-2 py-0.5 rounded font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {allocation?.month || '2026/09'}
              </span>
              
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Chia hạn mức trưởng phòng giao thành các slot KOC theo tuần, rồi gửi duyệt để mở khóa hợp đồng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>Thêm KOC</Button>
            <Button variant="primary" icon={Send} onClick={() => onSubmitPlanToLead(currentStaffName)}>Gửi duyệt</Button>
          </div>
        </div>

        {/* 4 Metric Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {/* Col 1 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                Số Video Giao
              </span>
              <span className={`font-mono font-semibold ${fillRateVideos >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fillRateVideos}% lấp đầy
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-slate-900">
              {plannedVideos} <span className="text-xs text-slate-500 font-normal">/ {targetVideos} video</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full ${fillRateVideos >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, fillRateVideos)}%` }}
              />
            </div>
          </div>

          {/* Col 2 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Ngân sách được giao
              </span>
              <span className="font-mono font-semibold text-blue-600">
                {fillRateBudget}%
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-blue-600">
              {formatVndShort(plannedBudget)} <span className="text-xs text-slate-500 font-normal">/ {formatVndShort(targetBudget)}</span>
            </div>
            <div className="text-2xs text-slate-500 mt-2">
              Khoảng trống còn lại: <strong className="text-slate-900">{Math.max(0, targetBudget - plannedBudget).toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>

          {/* Col 3 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                Target GMV Tháng
              </span>
              <span className="font-mono font-semibold text-emerald-600">
                {formatVndShort(plannedGmv)}
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-emerald-600">
              {formatVndShort(targetGmv)}
            </div>
            <div className="text-2xs text-slate-500 mt-2">
              Cam kết GMV đóng góp cho phòng Marketing B2C
            </div>
          </div>

          {/* Col 4 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block font-medium mb-1">
              Brand & chỉ đạo của trưởng phòng:
            </span>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {(allocation?.assignedBrands || ['Senka', 'Cure']).map(b => (
                <span key={b} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-2xs font-semibold border border-slate-200">
                  {b}
                </span>
              ))}
            </div>
            <p className="text-2xs text-slate-600 italic line-clamp-2">
              "{allocation?.managerNote || 'Tập trung đẩy mạnh KOC Macro cho đợt Mega Day tuần 3.'}"
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DETAILED PLAN SLOTS TABLE                                              */}
      {/* ========================================================================= */}
      <div className="card-enterprise overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-900">
              Slot KOC · {staffItems.length}
            </h3>
            <span className="text-2xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {approvedCount} đã duyệt
            </span>
            {pendingCount > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                {pendingCount} chờ duyệt
              </span>
            )}
          </div>

          {/* Week Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md p-1 text-xs">
            {(['ALL', 'W1', 'W2', 'W3', 'W4'] as const).map(w => (
              <button
                key={w}
                onClick={() => setSelectedWeekFilter(w)}
                className={`px-2.5 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedWeekFilter === w ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {w === 'ALL' ? 'Cả tháng' : w}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="p-3 pl-4">Tuần</th>
                <th className="p-3">Nhãn hàng</th>
                <th className="p-3">KOC / Creator</th>
                <th className="p-3">Tier & Khung Lương</th>
                <th className="p-3">Góc Quay / Pillar</th>
                <th className="p-3 text-right">Dự toán Cast</th>
                <th className="p-3 text-right">Target GMV</th>
                <th className="p-3 text-center">Trạng thái Plan</th>
                <th className="p-3">Ghi chú của Lead</th>
                <th className="p-3 pr-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4">
                    <EmptyState
                      title="Kế hoạch chưa có KOC"
                      description="Thêm KOC từ danh bạ để bắt đầu chia slot theo tuần."
                      action={<Button size="sm" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Thêm KOC</Button>}
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Week */}
                    <td className="p-3 pl-4">
                      <span className="font-semibold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-2xs">
                        {item.targetWeek}
                      </span>
                    </td>

                    {/* Brand */}
                    <td className="p-3 font-semibold text-slate-900">
                      {item.brandName}
                    </td>

                    {/* KOC Info */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 text-xs">{item.kocStageName}</div>
                      {item.channelId && (
                        <div className="text-2xs text-slate-500 font-mono">{item.channelId}</div>
                      )}
                    </td>

                    {/* Tier */}
                    <td className="p-3">
                      <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border inline-block ${
                        item.tier === 'TIER_1_CELEB' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        item.tier === 'TIER_2_MACRO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.tier === 'TIER_3_MICRO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {item.salaryGrade} ({item.tier.replace('TIER_', '')})
                      </span>
                      {item.tepKenh && (
                        <div className="text-2xs text-slate-500 mt-0.5">{item.tepKenh}</div>
                      )}
                    </td>

                    {/* Pillar */}
                    <td className="p-3 text-slate-700 text-2xs">
                      {item.contentPillar}
                    </td>

                    {/* Cost */}
                    <td className="p-3 text-right font-mono font-semibold text-cyan-400">
                      {item.budgetEstimated === 0 ? 'FOC (0đ)' : `${item.budgetEstimated.toLocaleString('vi-VN')} đ`}
                    </td>

                    {/* GMV */}
                    <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                      {item.targetGmv.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded border inline-block ${
                        item.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        item.status === 'CONVERTED' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                        item.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        item.status === 'REVISION_REQUESTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        {item.status === 'APPROVED' ? '✓ Đã Duyệt' :
                         item.status === 'CONVERTED' ? '✓ Đã Lên Deal' :
                         item.status === 'SUBMITTED' ? 'Chờ Duyệt' :
                         item.status === 'REVISION_REQUESTED' ? 'Cần Sửa' : 'Bản Nháp'}
                      </span>
                    </td>

                    {/* Lead Notes */}
                    <td className="p-3 max-w-[180px]">
                      <p className="text-2xs text-slate-400 truncate hover:text-clip" title={item.leadNotes}>
                        {item.leadNotes || '—'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => onConvertItemToDeal(item)}
                            title="1-Click chuyển slot này sang Booking Deal thực tế để ký HĐ và cọc"
                            className="btn-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Lên Deal</span>
                          </button>
                        )}
                        <button
                          onClick={() => onDeletePlanItem(item.id)}
                          title="Xóa slot khỏi plan"
                          className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: ADD KOC SLOT TO PLAN                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl p-6 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Thêm slot KOC vào kế hoạch tháng</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              
              {/* Quick Pick from Master KOC Directory */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Gợi ý chọn nhanh từ danh bạ KOC:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {kocs.slice(0, 8).map(koc => (
                    <button
                      type="button"
                      key={koc.id}
                      onClick={() => handleSelectExistingKoc(koc)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium border border-slate-300 shadow-2xs transition"
                    >
                      {koc.stageName} ({koc.salaryGrade})
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tên KOC / Stage Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chloe nguyễn, bác sĩ hằng..."
                    value={formKocName}
                    onChange={(e) => setFormKocName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Kênh TikTok:</label>
                  <input
                    type="text"
                    placeholder="VD: @chloenguyen.official"
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Nhãn hàng:</label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    {(allocation?.assignedBrands || ['Senka', 'Cure Natural Aqua Gel']).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tuần lên sóng:</label>
                  <select
                    value={formWeek}
                    onChange={(e) => setFormWeek(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="W1">Tuần 1 (W1: Mở màn)</option>
                    <option value="W2">Tuần 2 (W2: Tăng tốc)</option>
                    <option value="W3">Tuần 3 (W3: Mega D-Day)</option>
                    <option value="W4">Tuần 4 (W4: Về đích)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tier KOC:</label>
                  <select
                    value={formTier}
                    onChange={(e) => {
                      const t = e.target.value as KocTier;
                      setFormTier(t);
                      if (t === 'TIER_1_CELEB') setFormSalaryGrade('KL7');
                      else if (t === 'TIER_2_MACRO') setFormSalaryGrade('KL6');
                      else if (t === 'TIER_3_MICRO') setFormSalaryGrade('KL4');
                      else setFormSalaryGrade('KL2');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="TIER_1_CELEB">Tier 1: Celeb / Mega</option>
                    <option value="TIER_2_MACRO">Tier 2: Macro KOL</option>
                    <option value="TIER_3_MICRO">Tier 3: Micro KOC</option>
                    <option value="TIER_4_AFFILIATE">Tier 4: Nano &amp; Affiliate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Góc Quay / Content Pillar:</label>
                  <select
                    value={formPillar}
                    onChange={(e) => setFormPillar(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Review trực tiếp">Review trực tiếp</option>
                    <option value="Nỗi đau - Giải pháp">Nỗi đau - Giải pháp</option>
                    <option value="Unboxing">Unboxing</option>
                    <option value="Educate">Educate / Bác sĩ</option>
                    <option value="Daily Vlog">Daily Vlog</option>
                    <option value="FOMO">FOMO giờ vàng</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tệp kênh (25 tệp):</label>
                  <select
                    value={formTepKenh}
                    onChange={(e) => setFormTepKenh(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Beauty">Beauty (Làm đẹp)</option>
                    <option value="Review Nữ">Review Nữ</option>
                    <option value="Review Nam">Review Nam</option>
                    <option value="Mẹ bé (bầu)">Mẹ bé (bầu)</option>
                    <option value="Mẹ bé (bé)">Mẹ bé (bé)</option>
                    <option value="Bác sỹ/chuyên gia">Bác sỹ/chuyên gia</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Unboxing">Unboxing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Dự toán chi phí Cast (VND):</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-blue-700 font-mono font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Target GMV kỳ vọng (VND):</label>
                  <input
                    type="number"
                    value={formGmv}
                    onChange={(e) => setFormGmv(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-emerald-700 font-mono font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                >
                  Lưu vào kế hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
