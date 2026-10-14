'use client';

import React, { useRef, useState } from 'react';
import { formatVnd, formatVndShort } from '../lib/format';
import { Button, EmptyState, ConfirmDialog, Modal, Status, useFlipList } from './ui';
import { 
  Target, 
  DollarSign, 
  Video, 
  Plus, 
  Send, 
  Trash2,
  Zap
} from 'lucide-react';
import { 
  StaffDetailedPlanItem, 
  MonthlyStaffAllocation, 
  KocItem, 
  KocTier, 
  SalaryGrade,
  TepKenh
} from '../lib/types';
import { INITIAL_CONTENT_ANGLES } from '../lib/contentAngleData';
import { INITIAL_PUSH_PRODUCTS } from '../lib/mockData';
import { findBrandProfile, getBrandRatecardCeiling, useBrandProfiles } from '../lib/brands/useBrandProfiles';

interface MyPlanWorkspaceProps {
  currentStaffName: string;
  allocation: MonthlyStaffAllocation | null;
  planItems: StaffDetailedPlanItem[];
  kocs: KocItem[];
  onAddPlanItem: (newItem: Omit<StaffDetailedPlanItem, 'id' | 'updatedAt'>) => void;
  onUpdatePlanItem?: (item: StaffDetailedPlanItem) => void;
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
  onDeletePlanItem,
  onSubmitPlanToLead,
  onConvertItemToDeal
}) => {
  const staffItems = planItems.filter(i => i.staffName === currentStaffName);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'ALL' | 'W1' | 'W2' | 'W3' | 'W4'>('ALL');
  const [deletingSlotItem, setDeletingSlotItem] = useState<StaffDetailedPlanItem | null>(null);

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

  // Product & Content Angle state for slot
  const [formProduct, setFormProduct] = useState('Kem Bôi Dịu Da Kutieskin 30g');
  const [formAngleId, setFormAngleId] = useState('');
  const [formAngleName, setFormAngleName] = useState('');
  const [formHook, setFormHook] = useState('');

  const { profiles } = useBrandProfiles();
  const activeBrandProfile = React.useMemo(
    () => findBrandProfile(profiles, formBrand),
    [profiles, formBrand],
  );
  const formRatecardCeiling = React.useMemo(
    () => getBrandRatecardCeiling(activeBrandProfile, formSalaryGrade),
    [activeBrandProfile, formSalaryGrade],
  );
  const isFormOverCeiling = typeof formRatecardCeiling === 'number' && formBudget > formRatecardCeiling;

  const relevantAngles = React.useMemo(() => {
    return INITIAL_CONTENT_ANGLES.filter(a => 
      a.productName.toLowerCase().includes(formProduct.toLowerCase()) || 
      a.brandName.toLowerCase().includes(formBrand.toLowerCase())
    );
  }, [formProduct, formBrand]);

  const handleSelectAngle = (angleId: string) => {
    setFormAngleId(angleId);
    const matched = INITIAL_CONTENT_ANGLES.find(a => a.id === angleId);
    if (matched) {
      setFormAngleName(matched.name);
      setFormHook(matched.hookIdea);
      setFormPillar(matched.pillarName);
    } else {
      setFormAngleName('');
      setFormHook('');
    }
  };

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
      productName: formProduct,
      contentAngleId: formAngleId || undefined,
      contentAngleName: formAngleName || undefined,
      contentHook: formHook || undefined,
      budgetEstimated: Number(formBudget) || 0,
      targetGmv: Number(formGmv) || 0,
      status: 'DRAFT',
      leadNotes: formHook ? `Góc: ${formAngleName} | Hook: "${formHook.slice(0, 45)}..."` : 'Đang chuẩn bị đề xuất kịch bản'
    });

    setIsAddModalOpen(false);
    setFormKocName('');
    setFormChannelId('');
    setFormAngleId('');
    setFormAngleName('');
    setFormHook('');
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
  const planBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(planBodyRef, filteredItems.map(i => i.id).join('|'));

  const approvedCount = staffItems.filter(i => i.status === 'APPROVED' || i.status === 'CONVERTED').length;
  const pendingCount = staffItems.filter(i => i.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. MASTER ALLOCATION BRIEF FROM MANAGER                                    */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-5 bg-surface border border-line shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-ink tracking-tight">
                Kế hoạch tháng của {currentStaffName}
              </h2>
              <span className="text-2xs px-2 py-0.5 rounded font-mono font-semibold bg-accent-soft text-accent">
                {allocation?.month || '2026/09'}
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-1">
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
          <div className="p-3.5 rounded-md bg-sunken border border-line shadow-2xs">
            <div className="flex justify-between items-center text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-accent" />
                Số Video Giao
              </span>
              <span className={`font-mono font-semibold ${fillRateVideos >= 90 ? 'text-positive' : 'text-warning'}`}>
                {fillRateVideos}% lấp đầy
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-ink">
              {plannedVideos} <span className="text-xs text-ink-3 font-normal">/ {targetVideos} video</span>
            </div>
            <div className="w-full bg-line h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`data-bar h-full ${fillRateVideos >= 90 ? 'bg-positive' : 'bg-warning'}`}
                style={{ width: `${Math.min(100, fillRateVideos)}%` }}
              />
            </div>
          </div>

          {/* Col 2 */}
          <div className="p-3.5 rounded-md bg-sunken border border-line shadow-2xs">
            <div className="flex justify-between items-center text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-accent" />
                Ngân sách được giao
              </span>
              <span className="font-mono font-semibold text-accent">
                {fillRateBudget}%
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-accent">
              {formatVndShort(plannedBudget)} <span className="text-xs text-ink-3 font-normal">/ {formatVndShort(targetBudget)}</span>
            </div>
            <div className="text-2xs text-ink-3 mt-2">
              Khoảng trống còn lại: <strong className="text-ink">{formatVnd(Math.max(0, targetBudget - plannedBudget))}</strong>
            </div>
          </div>

          {/* Col 3 */}
          <div className="p-3.5 rounded-md bg-sunken border border-line shadow-2xs">
            <div className="flex justify-between items-center text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-positive" />
                Target GMV Tháng
              </span>
              <span className="font-mono font-semibold text-positive">
                {formatVndShort(plannedGmv)}
              </span>
            </div>
            <div className="text-xl font-semibold font-mono text-positive">
              {formatVndShort(targetGmv)}
            </div>
            <div className="text-2xs text-ink-3 mt-2">
              Cam kết GMV đóng góp cho phòng Marketing B2C
            </div>
          </div>

          {/* Col 4 */}
          <div className="p-3.5 rounded-md bg-sunken border border-line shadow-2xs">
            <span className="text-xs text-ink-3 block font-medium mb-1">
              Brand & chỉ đạo của trưởng phòng:
            </span>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {(allocation?.assignedBrands || ['Senka', 'Cure']).map(b => (
                <span key={b} className="px-1.5 py-0.2 rounded bg-surface text-ink-2 text-2xs font-semibold border border-line">
                  {b}
                </span>
              ))}
            </div>
            <p className="text-2xs text-ink-2 italic line-clamp-2">
              &ldquo;{allocation?.managerNote || 'Tập trung đẩy mạnh KOC Macro cho đợt Mega Day tuần 3.'}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DETAILED PLAN SLOTS TABLE                                              */}
      {/* ========================================================================= */}
      <div className="card-enterprise overflow-hidden bg-surface border border-line">
        <div className="px-5 py-3 border-b border-line bg-sunken flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-ink">
              Slot KOC · {staffItems.length}
            </h3>
            <Status tone="positive">{approvedCount} đã duyệt</Status>
            {pendingCount > 0 && (
              <Status tone="warning">{pendingCount} chờ duyệt</Status>
            )}
          </div>

          {/* Week Filter */}
          <div className="flex items-center gap-1 bg-surface border border-line rounded-md p-1 text-xs">
            {(['ALL', 'W1', 'W2', 'W3', 'W4'] as const).map(w => (
              <button
                key={w}
                onClick={() => setSelectedWeekFilter(w)}
                className={`px-2.5 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedWeekFilter === w ? 'bg-primary text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
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
              <tr className="bg-sunken text-ink-2 border-b border-line font-semibold">
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
            <tbody ref={planBodyRef} className="divide-y divide-line">
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
                  <tr key={item.id} data-flip={item.id} className="hover:bg-sunken/50 transition-colors">
                    {/* Week */}
                    <td className="p-3 pl-4">
                      <span className="font-semibold font-mono px-2 py-0.5 rounded bg-sunken text-ink-2 border border-line text-2xs">
                        {item.targetWeek}
                      </span>
                    </td>

                    {/* Brand */}
                    <td className="p-3 font-semibold text-ink">
                      {item.brandName}
                    </td>

                    {/* KOC Info */}
                    <td className="p-3">
                      <div className="font-semibold text-ink text-xs">{item.kocStageName}</div>
                      {item.channelId && (
                        <div className="text-2xs text-ink-3 font-mono">{item.channelId}</div>
                      )}
                    </td>

                    {/* Tier */}
                    <td className="p-3">
                      <span className="text-2xs font-semibold px-1.5 py-0.5 rounded border border-line bg-sunken text-ink-2 inline-block">
                        {item.salaryGrade} ({item.tier.replace('TIER_', '')})
                      </span>
                      {item.tepKenh && (
                        <div className="text-2xs text-ink-3 mt-0.5">{item.tepKenh}</div>
                      )}
                    </td>

                    {/* Pillar & Angle */}
                    <td className="p-3 text-ink-2 text-2xs">
                      <div className="font-medium text-ink">{item.contentPillar}</div>
                      {item.contentAngleName && (
                        <div className="text-accent font-medium text-2xs mt-0.5 flex items-center gap-1" title={item.contentHook}>
                          <span className="truncate max-w-[130px]">{item.contentAngleName}</span>
                        </div>
                      )}
                      {item.productName && (
                        <div className="text-ink-3 text-2xs truncate max-w-[130px]">{item.productName}</div>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="p-3 text-right font-mono font-semibold text-ink">
                      {item.budgetEstimated === 0 ? 'FOC (0đ)' : formatVnd(item.budgetEstimated)}
                    </td>

                    {/* GMV */}
                    <td className="p-3 text-right font-mono font-semibold text-positive">
                      {formatVnd(item.targetGmv)}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      {item.status === 'APPROVED' ? (
                        <Status tone="positive">Đã duyệt</Status>
                      ) : item.status === 'CONVERTED' ? (
                        <Status tone="info">Đã lên deal</Status>
                      ) : item.status === 'SUBMITTED' ? (
                        <Status tone="warning">Chờ duyệt</Status>
                      ) : item.status === 'REVISION_REQUESTED' ? (
                        <Status tone="critical">Cần sửa</Status>
                      ) : (
                        <Status tone="neutral">Bản nháp</Status>
                      )}
                    </td>

                    {/* Lead Notes */}
                    <td className="p-3 max-w-[180px]">
                      <p className="text-2xs text-ink-3 truncate hover:text-clip" title={item.leadNotes}>
                        {item.leadNotes || '—'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={Zap}
                            onClick={() => onConvertItemToDeal(item)}
                            title="Chuyển slot này sang booking thực tế để ký hợp đồng và tạm ứng"
                          >
                            Lên deal
                          </Button>
                        )}
                        <button
                          onClick={() => setDeletingSlotItem(item)}
                          title="Xóa slot khỏi plan"
                          aria-label={`Xóa slot KOC ${item.kocStageName}`}
                          className="h-7 w-7 rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft transition flex items-center justify-center"
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
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm slot KOC vào kế hoạch tháng"
        size="lg"
      >
        <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
          {/* Quick Pick from Master KOC Directory */}
          <div>
            <label className="text-ink-2 font-semibold block mb-1">
              Gợi ý chọn nhanh từ danh bạ KOC:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-sunken rounded-lg border border-line">
              {kocs.slice(0, 8).map(koc => (
                <button
                  type="button"
                  key={koc.id}
                  onClick={() => handleSelectExistingKoc(koc)}
                  className="px-2 py-0.5 rounded bg-surface hover:bg-accent-soft text-ink-2 hover:text-accent text-xs font-medium border border-line shadow-2xs transition"
                >
                  {koc.stageName} ({koc.salaryGrade})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Tên KOC / Stage Name:</label>
              <input
                type="text"
                required
                placeholder="VD: Chloe nguyễn, bác sĩ hằng..."
                value={formKocName}
                onChange={(e) => setFormKocName(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Kênh TikTok:</label>
              <input
                type="text"
                placeholder="VD: @chloenguyen.official"
                value={formChannelId}
                onChange={(e) => setFormChannelId(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Nhãn hàng:</label>
              <select
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
              >
                {(allocation?.assignedBrands || ['Senka', 'Cure Natural Aqua Gel']).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Tuần lên sóng:</label>
              <select
                value={formWeek}
                onChange={(e) => setFormWeek(e.target.value as 'W1' | 'W2' | 'W3' | 'W4')}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink font-semibold focus:border-accent focus:outline-none"
              >
                <option value="W1">Tuần 1 (W1: Mở màn)</option>
                <option value="W2">Tuần 2 (W2: Tăng tốc)</option>
                <option value="W3">Tuần 3 (W3: Mega D-Day)</option>
                <option value="W4">Tuần 4 (W4: Về đích)</option>
              </select>
            </div>
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Tier KOC:</label>
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
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
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
              <label className="text-ink-2 font-semibold block mb-1">Góc Quay / Content Pillar:</label>
              <select
                value={formPillar}
                onChange={(e) => setFormPillar(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
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
              <label className="text-ink-2 font-semibold block mb-1">Tệp kênh (25 tệp):</label>
              <select
                value={formTepKenh}
                onChange={(e) => setFormTepKenh(e.target.value as TepKenh)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none"
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

          {/* Product & Content Angle Selection */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-sunken rounded-xl border border-line">
            <div>
              <label className="text-ink font-semibold block mb-1">Sản phẩm đẩy của gian hàng:</label>
              <select
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink focus:border-accent focus:outline-none truncate"
              >
                {INITIAL_PUSH_PRODUCTS.map(p => (
                  <option key={p.id} value={p.productName}>{p.productName}</option>
                ))}
                <option value="Combo Sản Phẩm Chủ Lực">Combo Sản Phẩm Chủ Lực</option>
              </select>
            </div>

            <div>
              <label className="text-ink font-semibold block mb-1 flex items-center justify-between">
                <span>Góc tiếp cận (Content Angle):</span>
                {relevantAngles.length > 0 && (
                  <span className="text-2xs text-accent font-semibold font-mono">({relevantAngles.length} góc)</span>
                )}
              </label>
              <select
                value={formAngleId}
                onChange={(e) => handleSelectAngle(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-ink font-medium focus:border-accent focus:outline-none truncate"
              >
                <option value="">-- Chọn góc kịch bản có sẵn --</option>
                {relevantAngles.map(a => (
                  <option key={a.id} value={a.id}>[{a.pillarName}] {a.name}</option>
                ))}
              </select>
            </div>

            {formHook && (
              <div className="col-span-2 pt-2 border-t border-line text-xs">
                <div className="text-2xs font-semibold text-accent flex items-center gap-1 mb-0.5">
                  Hook 3 giây đầu gợi ý cho KOC:
                </div>
                <p className="italic text-ink-2 text-2xs">&ldquo;{formHook}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-ink-2 font-semibold">Dự toán chi phí Cast ({formSalaryGrade}):</label>
                {typeof formRatecardCeiling === 'number' && (
                  <span className="text-2xs text-ink-3 font-mono">
                    Trần: {formatVndShort(formRatecardCeiling)}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(Number(e.target.value))}
                className={`w-full bg-surface border rounded-lg p-2 font-mono font-semibold focus:outline-none ${
                  isFormOverCeiling
                    ? 'border-danger text-danger focus:border-danger'
                    : 'border-line-strong text-accent focus:border-accent'
                }`}
              />
            </div>
            <div>
              <label className="text-ink-2 font-semibold block mb-1">Target GMV kỳ vọng (VND):</label>
              <input
                type="number"
                value={formGmv}
                onChange={(e) => setFormGmv(Number(e.target.value))}
                className="w-full bg-surface border border-line-strong rounded-lg p-2 text-positive font-mono font-semibold focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {isFormOverCeiling && formRatecardCeiling && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-700">
              <span>
                Vượt trần định mức <strong>{formSalaryGrade}</strong> của nhãn <strong>{formBrand}</strong> (+{formatVnd(formBudget - formRatecardCeiling)}).
              </span>
              <button
                type="button"
                onClick={() => setFormBudget(formRatecardCeiling)}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-2xs font-semibold shrink-0 transition"
              >
                Áp mức trần ({formatVndShort(formRatecardCeiling)})
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary">
              Lưu vào kế hoạch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Slot Dialog */}
      <ConfirmDialog
        open={Boolean(deletingSlotItem)}
        onOpenChange={(open) => !open && setDeletingSlotItem(null)}
        title="Xác nhận xóa slot KOC khỏi kế hoạch"
        description={`Bạn có chắc chắn muốn xóa slot KOC "${deletingSlotItem?.kocStageName || 'chưa gán'}" (Brand: ${deletingSlotItem?.brandName || '—'}, Tuần ${deletingSlotItem?.targetWeek || '—'})? Thao tác này sẽ xóa slot và giải phóng định mức ngân sách của tuần.`}
        confirmLabel="Xóa slot"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (deletingSlotItem) {
            onDeletePlanItem(deletingSlotItem.id);
            setDeletingSlotItem(null);
          }
        }}
      />

    </div>
  );
};
