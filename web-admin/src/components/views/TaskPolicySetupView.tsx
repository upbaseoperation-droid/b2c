'use client';

import React, { useMemo, useState } from 'react';
import {
  TaskCategoryDifficultyConfig,
  TaskDifficultyCategoryKey,
  TaskDifficultyLevelRule,
} from '../../lib/types';
import {
  SowPointPolicyItem,
  DEFAULT_SOW_POINT_POLICIES,
  DEFAULT_TASK_DIFFICULTY_CONFIGS,
  STORE_SCOPE_TABLE_2,
  TASK_DIFFICULTY_TABLE_3,
  STAFF_LEVEL_TABLE_4,
  TIMELINE_TABLE_5,
  MULTI_PLATFORM_TABLE_6,
  TASK_ROLE_WEIGHT_RULES,
  DIFFICULTY_TIER_BADGE,
} from '../../lib/taskDelegationData';
import {
  ArrowLeft,
  Check,
  Edit3,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Chips,
  Column,
  DataTable,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';

export interface TaskPolicySetupViewProps {
  sowPolicies: SowPointPolicyItem[];
  onSaveSowPolicies: (next: SowPointPolicyItem[]) => void;
  difficultyConfigs: TaskCategoryDifficultyConfig[];
  onSaveDifficultyConfigs: (next: TaskCategoryDifficultyConfig[]) => void;
  canManageSetup: boolean;
  onBack: () => void;
  onQuickAssignFromSow: (sow: SowPointPolicyItem) => void;
  onNotify?: (msg: string) => void;
}

type SetupSectionKey = 'SOW_TABLE_1' | 'RESEARCH_TABLE_2B' | 'RULES_TABLE_2_7';

const SOW_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tất cả nhóm (33)' },
  { value: 'Content Affiliate', label: 'Content Affiliate (7)' },
  { value: 'Content kênh', label: 'Content kênh (4)' },
  { value: 'Vận hành & chiến dịch', label: 'Vận hành & chiến dịch (7)' },
  { value: 'Booking / KOC / hợp tác', label: 'Booking & hợp tác (6)' },
  { value: 'Tài chính – chứng từ', label: 'Tài chính – chứng từ (3)' },
  { value: 'Nghiên cứu & đề xuất', label: 'Nghiên cứu & đề xuất (4)' },
  { value: 'Phối hợp nội bộ & báo cáo', label: 'Báo cáo & nội bộ (2)' },
];

export default function TaskPolicySetupView({
  sowPolicies,
  onSaveSowPolicies,
  difficultyConfigs,
  onSaveDifficultyConfigs,
  canManageSetup,
  onBack,
  onQuickAssignFromSow,
  onNotify,
}: TaskPolicySetupViewProps) {
  const [section, setSection] = useState<SetupSectionKey>('SOW_TABLE_1');
  const [sowSearch, setSowSearch] = useState('');
  const [sowGroupFilter, setSowGroupFilter] = useState<string>('ALL');
  const [sowTierFilter, setSowTierFilter] = useState<'ALL' | 'EASY' | 'STANDARD' | 'HARD'>('ALL');
  const [activeCategoryKey, setActiveCategoryKey] = useState<TaskDifficultyCategoryKey>('RESEARCH');

  // Edit SOW modal state
  const [editingSow, setEditingSow] = useState<SowPointPolicyItem | null>(null);
  // Edit Scope level modal state
  const [editingLevelState, setEditingLevelState] = useState<{
    categoryKey: TaskDifficultyCategoryKey;
    categoryLabel: string;
    levelRule: TaskDifficultyLevelRule;
  } | null>(null);
  // Confirm reset modal state
  const [confirmResetTarget, setConfirmResetTarget] = useState<'SOW' | 'DIFFICULTY' | null>(null);

  const filteredSowPolicies = useMemo(() => {
    const q = sowSearch.trim().toLowerCase();
    return sowPolicies.filter((item) => {
      if (sowGroupFilter !== 'ALL' && item.group !== sowGroupFilter) return false;
      if (sowTierFilter !== 'ALL' && item.defaultDifficultyTier !== sowTierFilter) return false;
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.group.toLowerCase().includes(q) &&
        !item.ruleNote.toLowerCase().includes(q) &&
        !String(item.stt).includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sowPolicies, sowSearch, sowGroupFilter, sowTierFilter]);

  const activeCategoryConfig = useMemo(
    () =>
      difficultyConfigs.find((c) => c.categoryKey === activeCategoryKey) ||
      difficultyConfigs[0],
    [difficultyConfigs, activeCategoryKey]
  );

  const sowSummaryStats = useMemo(() => {
    const hardCount = sowPolicies.filter((p) => p.defaultDifficultyTier === 'HARD').length;
    const standardCount = sowPolicies.filter((p) => p.defaultDifficultyTier === 'STANDARD').length;
    const easyCount = sowPolicies.filter((p) => p.defaultDifficultyTier === 'EASY').length;
    const avgBase =
      sowPolicies.reduce((acc, item) => acc + item.basePoint, 0) /
      Math.max(1, sowPolicies.length);
    return { hardCount, standardCount, easyCount, avgBase };
  }, [sowPolicies]);

  const handleSaveSowItem = () => {
    if (!editingSow) return;
    const next = sowPolicies.map((item) =>
      item.stt === editingSow.stt ? editingSow : item
    );
    onSaveSowPolicies(next);
    setEditingSow(null);
    onNotify?.(`Đã lưu định mức đầu việc #${editingSow.stt}: ${editingSow.name}`);
  };

  const handleSaveLevelItem = () => {
    if (!editingLevelState) return;
    const next = difficultyConfigs.map((cat) => {
      if (cat.categoryKey !== editingLevelState.categoryKey) return cat;
      return {
        ...cat,
        levels: cat.levels.map((l) =>
          l.level === editingLevelState.levelRule.level
            ? editingLevelState.levelRule
            : l
        ),
      };
    });
    onSaveDifficultyConfigs(next);
    setEditingLevelState(null);
    onNotify?.(
      `Đã cập nhật Cấp ${editingLevelState.levelRule.level} (${editingLevelState.categoryLabel})`
    );
  };

  const handleConfirmReset = () => {
    if (confirmResetTarget === 'SOW') {
      onSaveSowPolicies(DEFAULT_SOW_POINT_POLICIES);
      onNotify?.('Đã khôi phục 33 đầu việc SOW về định mức gốc');
    } else if (confirmResetTarget === 'DIFFICULTY') {
      onSaveDifficultyConfigs(DEFAULT_TASK_DIFFICULTY_CONFIGS);
      onNotify?.('Đã khôi phục bảng cấp độ phạm vi & nghiên cứu về mặc định');
    }
    setConfirmResetTarget(null);
  };

  const sowColumns: Column<SowPointPolicyItem>[] = [
    {
      key: 'stt',
      header: '#',
      width: '52px',
      mono: true,
      render: (r) => <span className="text-ink-3 font-medium">#{r.stt}</span>,
    },
    {
      key: 'name',
      header: 'Đầu việc SOW & Nhóm nghiệp vụ',
      width: '28%',
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{r.name}</div>
          <div className="text-2xs text-ink-3 truncate">
            {r.group} · Đơn vị: {r.scopeUnit}
          </div>
        </div>
      ),
    },
    {
      key: 'basePoint',
      header: 'Điểm chuẩn',
      align: 'right',
      width: '100px',
      mono: true,
      render: (r) => (
        <span className="font-semibold text-ink">
          {r.basePoint.toFixed(1).replace('.', ',')} pts
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Độ khó mặc định',
      width: '150px',
      render: (r) => {
        const tone =
          r.defaultDifficultyTier === 'HARD'
            ? 'critical'
            : r.defaultDifficultyTier === 'STANDARD'
            ? 'accent'
            : 'neutral';
        return (
          <Status
            tone={tone}
            label={DIFFICULTY_TIER_BADGE[r.defaultDifficultyTier].label}
          />
        );
      },
    },
    {
      key: 'source',
      header: 'Nguồn mặc định',
      width: '140px',
      render: (r) => (
        <span className="text-xs text-ink-2">
          {r.defaultSource === 'WORKFLOW_SYSTEM' ? 'Quy trình tự động' : 'Quản lý giao'}
        </span>
      ),
    },
    {
      key: 'ruleNote',
      header: 'Quy tắc nghiệm thu & Ràng buộc',
      render: (r) => (
        <div className="min-w-0">
          <div className="text-xs text-ink-2 line-clamp-1">{r.ruleNote}</div>
          <div className="text-2xs text-ink-3 truncate">
            {[
              r.requiresKocStatus ? 'Bắt buộc trạng thái KOC' : null,
              r.requiresOriginalAsset ? 'Bắt buộc mã Asset gốc' : null,
              r.usesResearchTable2b ? 'Tham chiếu Bảng 2b' : null,
              r.supportsMultiPlatform ? 'Hỗ trợ hệ số đa sàn' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Áp dụng hệ số gian hàng chuẩn'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '150px',
      render: (r) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="xs"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => onQuickAssignFromSow(r)}
          >
            Giao việc
          </Button>
          {canManageSetup && (
            <Button
              variant="secondary"
              size="xs"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => setEditingSow({ ...r })}
            >
              Sửa
            </Button>
          )}
        </div>
      ),
    },
  ];

  const levelColumns: Column<TaskDifficultyLevelRule>[] = [
    {
      key: 'level',
      header: 'Cấp độ phạm vi',
      width: '180px',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">
            Cấp {r.level} · {r.levelLabel}
          </div>
          <div className="text-2xs text-ink-3 font-code">
            Hệ số nhân: {r.difficultyMultiplier.toFixed(2)}x
          </div>
        </div>
      ),
    },
    {
      key: 'workPoint',
      header: 'Điểm gốc',
      align: 'right',
      width: '110px',
      mono: true,
      render: (r) => (
        <span className="font-semibold text-ink">{r.workPoint} pts</span>
      ),
    },
    {
      key: 'slaHours',
      header: 'Hạn SLA chuẩn',
      align: 'right',
      width: '120px',
      mono: true,
      render: (r) => (
        <span className="text-ink-2">
          {r.defaultSlaHours}h ({Math.round(r.defaultSlaHours / 24)} ngày)
        </span>
      ),
    },
    {
      key: 'scopeCriteria',
      header: 'Phạm vi công việc chuẩn',
      render: (r) => (
        <div className="text-xs text-ink-2 line-clamp-2">{r.scopeCriteria}</div>
      ),
    },
    {
      key: 'requiredDeliverable',
      header: 'Đầu ra nghiệm thu bắt buộc',
      render: (r) => (
        <div className="text-xs text-ink-2 line-clamp-2">
          {r.requiredDeliverable}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '90px',
      render: (r) =>
        canManageSetup ? (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="xs"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() =>
                setEditingLevelState({
                  categoryKey: activeCategoryConfig.categoryKey,
                  categoryLabel: activeCategoryConfig.categoryLabel,
                  levelRule: { ...r },
                })
              }
            >
              Sửa
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Subpage Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onBack}
          >
            Quay lại bảng công việc
          </Button>
          <div className="h-4 w-px bg-line hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-md font-semibold text-ink">
                Cấu hình định mức & Quy tắc tính điểm SOW
              </h2>
              <Status
                tone={canManageSetup ? 'positive' : 'neutral'}
                label={canManageSetup ? 'Quyền chỉnh sửa' : 'Chế độ tra cứu'}
              />
            </div>
            <p className="text-xs text-ink-3">
              Thiết lập điểm chuẩn 33 đầu việc SOW, cấp độ nghiên cứu Bảng 2b và ma trận hệ số Bảng 2–7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Segmented<SetupSectionKey>
            value={section}
            onChange={setSection}
            options={[
              {
                value: 'SOW_TABLE_1',
                label: 'Bảng 1: 33 đầu việc SOW',
                count: sowPolicies.length,
              },
              {
                value: 'RESEARCH_TABLE_2B',
                label: 'Bảng 2b: Cấp độ phạm vi',
                count: difficultyConfigs.length,
              },
              {
                value: 'RULES_TABLE_2_7',
                label: 'Bảng 2–7: Ma trận hệ số',
              },
            ]}
          />
        </div>
      </div>

      {/* SECTION 1: BẢNG 1 - 33 ĐẦU VIỆC SOW */}
      {section === 'SOW_TABLE_1' && (
        <div className="space-y-4">
          <StatRow cols={4}>
            <Stat
              label="Tổng danh mục SOW"
              value={`${sowPolicies.length} đầu việc`}
              sub="Chia theo 7 nhóm nghiệp vụ B2C"
            />
            <Stat
              label="Đầu việc độ khó cao (1,20)"
              value={`${sowSummaryStats.hardCount} đầu việc`}
              tone="critical"
              sub="Tính vào tỷ lệ việc khó cuối tháng"
            />
            <Stat
              label="Đầu việc tiêu chuẩn (1,00)"
              value={`${sowSummaryStats.standardCount} đầu việc`}
              tone="accent"
              sub={`${sowSummaryStats.easyCount} đầu việc mức Dễ (0,80)`}
            />
            <Stat
              label="Điểm chuẩn trung bình"
              value={`${sowSummaryStats.avgBase.toFixed(2).replace('.', ',')} pts`}
              sub="Chưa nhân hệ số gian hàng & độ khó"
            />
          </StatRow>

          <Panel
            flush
            title="Bảng 1 · Danh mục 33 đầu việc SOW chuẩn phòng B2C"
            subtitle="Bấm vào từng dòng hoặc nút Sửa để điều chỉnh điểm chuẩn, độ khó mặc định và quy tắc nghiệm thu"
            actions={
              canManageSetup ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => setConfirmResetTarget('SOW')}
                >
                  Khôi phục mặc định
                </Button>
              ) : undefined
            }
          >
            <FilterBar
              search={{
                value: sowSearch,
                onChange: setSowSearch,
                placeholder: 'Tìm tên đầu việc, nhóm SOW, quy tắc...',
              }}
              right={
                <span className="text-xs text-ink-3 font-code">
                  Hiển thị {filteredSowPolicies.length}/{sowPolicies.length} đầu việc
                </span>
              }
            >
              <Select
                value={sowGroupFilter}
                onChange={(e) => setSowGroupFilter(e.target.value)}
                className="w-52 h-8 text-xs"
              >
                {SOW_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Chips<'ALL' | 'EASY' | 'STANDARD' | 'HARD'>
                value={sowTierFilter}
                onChange={setSowTierFilter}
                items={[
                  { value: 'ALL', label: 'Mọi độ khó' },
                  { value: 'HARD', label: 'Khó (1,20)' },
                  { value: 'STANDARD', label: 'Tiêu chuẩn (1,00)' },
                  { value: 'EASY', label: 'Dễ (0,80)' },
                ]}
              />
            </FilterBar>

            <DataTable
              data={filteredSowPolicies}
              columns={sowColumns}
              rowKey={(r) => r.stt}
              onRowClick={(r) => {
                if (canManageSetup) setEditingSow({ ...r });
              }}
              emptyMessage="Không có đầu việc SOW nào khớp bộ lọc."
            />
          </Panel>
        </div>
      )}

      {/* SECTION 2: BẢNG 2B - CẤP ĐỘ PHẠM VI & NGHIÊN CỨU */}
      {section === 'RESEARCH_TABLE_2B' && activeCategoryConfig && (
        <div className="space-y-4">
          <Panel
            flush
            title="Bảng 2b · Định mức cấp độ phạm vi & Nghiên cứu (Level 1 → Level 4)"
            subtitle="Áp dụng khi giao việc để tự động gợi ý hạn SLA và kiểm soát đầu ra nghiệm thu"
            actions={
              canManageSetup ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => setConfirmResetTarget('DIFFICULTY')}
                >
                  Khôi phục mặc định
                </Button>
              ) : undefined
            }
          >
            <FilterBar
              right={
                <span className="text-xs text-ink-3">
                  Đơn vị tính: <strong className="text-ink">{activeCategoryConfig.unitLabel}</strong>
                </span>
              }
            >
              <Chips<TaskDifficultyCategoryKey>
                value={activeCategoryKey}
                onChange={setActiveCategoryKey}
                items={difficultyConfigs.map((cfg) => ({
                  value: cfg.categoryKey,
                  label: cfg.categoryLabel,
                }))}
              />
            </FilterBar>

            <DataTable
              data={activeCategoryConfig.levels}
              columns={levelColumns}
              rowKey={(r) => `${activeCategoryConfig.categoryKey}-${r.level}`}
              onRowClick={(r) => {
                if (canManageSetup) {
                  setEditingLevelState({
                    categoryKey: activeCategoryConfig.categoryKey,
                    categoryLabel: activeCategoryConfig.categoryLabel,
                    levelRule: { ...r },
                  });
                }
              }}
            />
          </Panel>
        </div>
      )}

      {/* SECTION 3: BẢNG 2-7 MA TRẬN HỆ SỐ */}
      {section === 'RULES_TABLE_2_7' && (
        <div className="space-y-4">
          {/* Công thức tổng quát */}
          <Panel
            title="Công thức quy đổi điểm công việc cá nhân & Tổng điểm cuối tháng"
            subtitle="Hệ thống tự động nhân các hệ số ngay khi tạo nhiệm vụ hoặc nghiệm thu đầu ra"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3 uppercase tracking-wider">
                  1. Điểm nhiệm vụ cá nhân
                </div>
                <div className="font-code font-semibold text-ink text-sm">
                  Điểm cá nhân = Điểm chuẩn (Bảng 1) × Hệ số gian hàng (Bảng 2) × Độ khó (Bảng 3) × Hệ số đa sàn (Bảng 6) × Tỷ trọng vai trò
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3 uppercase tracking-wider">
                  2. Tổng điểm nhân sự cuối tháng
                </div>
                <div className="font-code font-semibold text-ink text-sm">
                  Tổng điểm tháng = Tổng điểm quy đổi × Hệ số cơ cấu việc khó theo Level (Bảng 4) × Hệ số tiến độ (Bảng 5)
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bảng 2 */}
            <Panel
              flush
              title="Bảng 2 · Hệ số quy mô & Độ phức tạp gian hàng"
              subtitle="Áp dụng theo mức độ phức tạp vận hành của từng Store/Brand"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Nhóm gian hàng</th>
                    <th className="py-2.5 px-3 font-medium text-right">Hệ số</th>
                    <th className="py-2.5 px-4 font-medium">Tiêu chí nhận diện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {STORE_SCOPE_TABLE_2.map((r) => (
                    <tr key={r.key} className="hover:bg-surface-hover">
                      <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                      <td className="py-2.5 px-3 text-right font-code font-semibold text-accent">
                        {r.coef.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2.5 px-4 text-ink-2">{r.criteria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Bảng 3 & Bảng 6 */}
            <div className="space-y-4">
              <Panel
                flush
                title="Bảng 3 · Hệ số độ khó theo lần thực hiện"
                subtitle="Điều chỉnh khi KOC mới, đề bài mới hoặc tái sử dụng"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Mức độ</th>
                      <th className="py-2.5 px-3 font-medium text-right">Hệ số</th>
                      <th className="py-2.5 px-4 font-medium">Khi áp dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TASK_DIFFICULTY_TABLE_3.map((r) => (
                      <tr key={r.tier} className="hover:bg-surface-hover">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                        <td className="py-2.5 px-3 text-right font-code font-semibold text-ink">
                          {r.coef.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.whenToApply}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel
                flush
                title="Bảng 6 · Hệ số mở rộng đa sàn & Tái sử dụng"
                subtitle="Áp dụng cho campaign hoặc nội dung triển khai từ sàn thứ 2"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Tình huống</th>
                      <th className="py-2.5 px-3 font-medium text-right">Hệ số</th>
                      <th className="py-2.5 px-4 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {MULTI_PLATFORM_TABLE_6.map((r) => (
                      <tr key={r.situation} className="hover:bg-surface-hover">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.situation}</td>
                        <td className="py-2.5 px-3 text-right font-code font-semibold text-accent">
                          {r.coefLabel}
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bảng 4 */}
            <Panel
              flush
              title="Bảng 4 · Hệ số cơ cấu việc khó theo cấp bậc (Level nhân sự)"
              subtitle="Đánh giá cuối tháng dựa trên tỷ lệ điểm việc Khó trên tổng điểm"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Level nhân sự</th>
                    <th className="py-2.5 px-3 font-medium">Tỷ lệ việc khó chuẩn</th>
                    <th className="py-2.5 px-3 font-medium text-right">Đạt chuẩn</th>
                    <th className="py-2.5 px-3 font-medium text-right">Vượt chuẩn</th>
                    <th className="py-2.5 px-4 font-medium text-right">Lệch chuẩn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {STAFF_LEVEL_TABLE_4.map((r) => (
                    <tr key={r.level} className="hover:bg-surface-hover">
                      <td className="py-2.5 px-4 font-medium text-ink">{r.level}</td>
                      <td className="py-2.5 px-3 font-code text-ink-2">{r.expectedHardRatioLabel}</td>
                      <td className="py-2.5 px-3 text-right font-code text-positive font-semibold">
                        {r.coefMeet.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-code text-accent font-semibold">
                        {r.coefExceed.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-code text-warning font-semibold">
                        {r.coefBelow.toFixed(2).replace('.', ',')} / {r.coefSevereBelow.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Bảng 5 & Vai trò */}
            <div className="space-y-4">
              <Panel
                flush
                title="Bảng 5 · Hệ số tiến độ hoàn thành (SLA)"
                subtitle="Áp dụng khi nghiệm thu kết quả công việc"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Mức độ hoàn thành</th>
                      <th className="py-2.5 px-3 font-medium text-right">Hệ số</th>
                      <th className="py-2.5 px-4 font-medium">Điều kiện áp dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TIMELINE_TABLE_5.map((r) => (
                      <tr key={r.status} className="hover:bg-surface-hover">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.status}</td>
                        <td className="py-2.5 px-3 text-right font-code font-semibold text-ink">
                          {r.coefLabel}
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel
                flush
                title="Quy tắc phân chia tỷ trọng theo vai trò phối hợp"
                subtitle="Tổng tỷ trọng của các nhân sự trong 1 đầu việc luôn bằng 100%"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Vai trò</th>
                      <th className="py-2.5 px-3 font-medium text-right">Mặc định</th>
                      <th className="py-2.5 px-3 font-medium text-right">Khung cho phép</th>
                      <th className="py-2.5 px-4 font-medium">Trách nhiệm chính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TASK_ROLE_WEIGHT_RULES.map((r) => (
                      <tr key={r.roleKey} className="hover:bg-surface-hover">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.roleLabel}</td>
                        <td className="py-2.5 px-3 text-right font-code font-semibold text-accent">
                          {r.defaultWeightPct}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-code text-ink-2">
                          {r.minWeightPct}% – {r.maxWeightPct}%
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.responsibilityDesc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SOW ITEM */}
      <Modal
        open={Boolean(editingSow)}
        onClose={() => setEditingSow(null)}
        title={editingSow ? `Chỉnh sửa đầu việc SOW #${editingSow.stt}` : ''}
        subtitle={editingSow?.group}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingSow(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={<Check className="w-3.5 h-3.5" />}
              onClick={handleSaveSowItem}
            >
              Lưu định mức
            </Button>
          </>
        }
      >
        {editingSow && (
          <div className="space-y-4">
            <Field label="Tên đầu việc SOW" required>
              <Input
                value={editingSow.name}
                onChange={(e) =>
                  setEditingSow({ ...editingSow, name: e.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Điểm chuẩn (pts)" required>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={30}
                  value={editingSow.basePoint}
                  onChange={(e) =>
                    setEditingSow({
                      ...editingSow,
                      basePoint: Math.max(0.1, Number(e.target.value) || 0.5),
                    })
                  }
                />
              </Field>

              <Field label="Độ khó mặc định">
                <Select
                  value={editingSow.defaultDifficultyTier}
                  onChange={(e) =>
                    setEditingSow({
                      ...editingSow,
                      defaultDifficultyTier: e.target.value as
                        | 'EASY'
                        | 'STANDARD'
                        | 'HARD',
                    })
                  }
                >
                  <option value="EASY">Dễ (0,80)</option>
                  <option value="STANDARD">Tiêu chuẩn (1,00)</option>
                  <option value="HARD">Khó (1,20)</option>
                </Select>
              </Field>

              <Field label="Đơn vị tính">
                <Select
                  value={editingSow.scopeUnit}
                  onChange={(e) =>
                    setEditingSow({
                      ...editingSow,
                      scopeUnit: e.target.value as
                        | 'Nền tảng'
                        | 'Store'
                        | 'Sàn'
                        | 'Brand',
                    })
                  }
                >
                  <option value="Nền tảng">Nền tảng</option>
                  <option value="Store">Store</option>
                  <option value="Sàn">Sàn</option>
                  <option value="Brand">Brand</option>
                </Select>
              </Field>
            </div>

            <Field label="Nguồn giao việc mặc định">
              <Select
                value={editingSow.defaultSource}
                onChange={(e) =>
                  setEditingSow({
                    ...editingSow,
                    defaultSource: e.target.value as
                      | 'WORKFLOW_SYSTEM'
                      | 'DIRECTOR_ASSIGNED',
                  })
                }
              >
                <option value="WORKFLOW_SYSTEM">
                  Quy trình tự động (Workflow SOW)
                </option>
                <option value="DIRECTOR_ASSIGNED">
                  Quản lý giao (Manager / Leader Assigned)
                </option>
              </Select>
            </Field>

            <Field label="Quy tắc nghiệm thu & Lưu ý vận hành">
              <Textarea
                rows={3}
                value={editingSow.ruleNote}
                onChange={(e) =>
                  setEditingSow({ ...editingSow, ruleNote: e.target.value })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* MODAL EDIT LEVEL RULE (BẢNG 2B) */}
      <Modal
        open={Boolean(editingLevelState)}
        onClose={() => setEditingLevelState(null)}
        title={
          editingLevelState
            ? `Cấp ${editingLevelState.levelRule.level} · ${editingLevelState.categoryLabel}`
            : ''
        }
        subtitle="Điều chỉnh điểm gốc, thời hạn SLA chuẩn và tiêu chuẩn đầu ra nghiệm thu"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditingLevelState(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={<Check className="w-3.5 h-3.5" />}
              onClick={handleSaveLevelItem}
            >
              Lưu cấp độ
            </Button>
          </>
        }
      >
        {editingLevelState && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Tên cấp độ" required>
                <Input
                  value={editingLevelState.levelRule.levelLabel}
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelRule: {
                        ...editingLevelState.levelRule,
                        levelLabel: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Điểm gốc (pts)" required>
                <Input
                  type="number"
                  step="0.5"
                  min={0.5}
                  value={editingLevelState.levelRule.workPoint}
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelRule: {
                        ...editingLevelState.levelRule,
                        workPoint: Math.max(0.5, Number(e.target.value) || 1),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Hạn SLA chuẩn (giờ)" required>
                <Input
                  type="number"
                  step="4"
                  min={4}
                  value={editingLevelState.levelRule.defaultSlaHours}
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelRule: {
                        ...editingLevelState.levelRule,
                        defaultSlaHours: Math.max(
                          4,
                          Number(e.target.value) || 24
                        ),
                      },
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Phạm vi công việc chuẩn">
              <Textarea
                rows={3}
                value={editingLevelState.levelRule.scopeCriteria}
                onChange={(e) =>
                  setEditingLevelState({
                    ...editingLevelState,
                    levelRule: {
                      ...editingLevelState.levelRule,
                      scopeCriteria: e.target.value,
                    },
                  })
                }
              />
            </Field>

            <Field label="Đầu ra nghiệm thu bắt buộc">
              <Textarea
                rows={2}
                value={editingLevelState.levelRule.requiredDeliverable}
                onChange={(e) =>
                  setEditingLevelState({
                    ...editingLevelState,
                    levelRule: {
                      ...editingLevelState.levelRule,
                      requiredDeliverable: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN KHÔI PHỤC MẶC ĐỊNH */}
      <Modal
        open={Boolean(confirmResetTarget)}
        onClose={() => setConfirmResetTarget(null)}
        title="Khôi phục định mức mặc định"
        subtitle="Các chỉnh sửa tùy biến trên trình duyệt sẽ được đưa về thông số gốc của phòng B2C"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmResetTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleConfirmReset}
            >
              Xác nhận khôi phục
            </Button>
          </>
        }
      >
        <p className="text-xs text-ink-2">
          Bạn có chắc chắn muốn khôi phục{' '}
          <strong className="text-ink">
            {confirmResetTarget === 'SOW'
              ? 'Bảng 1 (33 đầu việc SOW)'
              : 'Bảng 2b (Cấp độ phạm vi & Nghiên cứu)'}
          </strong>{' '}
          về cấu hình chuẩn ban đầu?
        </p>
      </Modal>
    </div>
  );
}
