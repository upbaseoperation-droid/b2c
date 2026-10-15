'use client';

import React, { useMemo, useState } from 'react';
import {
  TaskCategoryDifficultyConfig,
  TaskDifficultyCategoryKey,
  TaskDifficultyLevelConfig,
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
  Trash2,
} from 'lucide-react';
import {
  Button,
  Chips,
  Column,
  ConfirmDialog,
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
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type SetupSectionKey = 'SOW_TABLE_1' | 'RESEARCH_TABLE_2B' | 'RULES_TABLE_2_7';

export function TaskPolicySetupView({
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
  // Edit or Add Scope level modal state
  const [editingLevelState, setEditingLevelState] = useState<{
    categoryKey: TaskDifficultyCategoryKey;
    categoryName: string;
    isNew?: boolean;
    levelConfig: TaskDifficultyLevelConfig;
  } | null>(null);
  // Confirm reset modal state
  const [confirmResetTarget, setConfirmResetTarget] = useState<'SOW' | 'DIFFICULTY' | null>(null);

  const sowGroups = useMemo(
    () => Array.from(new Set(sowPolicies.map((s) => s.group))),
    [sowPolicies]
  );

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
    onNotify?.(
      `Đã lưu định mức đầu việc #${editingSow.stt}: ${editingSow.name}`,
      'success'
    );
  };

  const handleSaveLevelItem = () => {
    if (!editingLevelState) return;
    if (!editingLevelState.levelConfig.levelCode.trim()) {
      onNotify?.('Vui lòng nhập tên cấp độ', 'warning');
      return;
    }
    const next = difficultyConfigs.map((cat) => {
      if (cat.categoryKey !== editingLevelState.categoryKey) return cat;
      if (editingLevelState.isNew) {
        return {
          ...cat,
          levels: [...cat.levels, editingLevelState.levelConfig],
        };
      }
      return {
        ...cat,
        levels: cat.levels.map((l) =>
          l.id === editingLevelState.levelConfig.id
            ? editingLevelState.levelConfig
            : l
        ),
      };
    });
    onSaveDifficultyConfigs(next);
    setEditingLevelState(null);
    onNotify?.(
      `Đã cập nhật ${editingLevelState.levelConfig.levelCode} (${editingLevelState.categoryName})`,
      'success'
    );
  };

  const handleDeleteLevelItem = (levelId: string) => {
    if (!activeCategoryConfig || activeCategoryConfig.levels.length <= 1) {
      onNotify?.('Mỗi nhóm công việc cần giữ tối thiểu 1 cấp độ', 'warning');
      return;
    }
    const next = difficultyConfigs.map((cat) => {
      if (cat.categoryKey !== activeCategoryConfig.categoryKey) return cat;
      return {
        ...cat,
        levels: cat.levels.filter((l) => l.id !== levelId),
      };
    });
    onSaveDifficultyConfigs(next);
    onNotify?.('Đã xóa cấp độ khỏi bảng cấu hình', 'info');
  };

  const handleConfirmReset = () => {
    if (confirmResetTarget === 'SOW') {
      onSaveSowPolicies(DEFAULT_SOW_POINT_POLICIES);
      onNotify?.('Đã khôi phục 33 đầu việc SOW về định mức gốc', 'info');
    } else if (confirmResetTarget === 'DIFFICULTY') {
      onSaveDifficultyConfigs(DEFAULT_TASK_DIFFICULTY_CONFIGS);
      onNotify?.('Đã khôi phục bảng cấp độ phạm vi & nghiên cứu về mặc định', 'info');
    }
    setConfirmResetTarget(null);
  };

  const sowColumns: Column<SowPointPolicyItem>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: 52,
      className: 'font-mono tabular-nums',
      render: (r) => <span className="text-ink-3 font-medium">#{r.stt}</span>,
    },
    {
      key: 'name',
      header: 'Đầu việc SOW & Nhóm nghiệp vụ',
      width: 260,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{r.name}</div>
          <div className="text-2xs text-ink-3 truncate">
            {r.group} · Cấp tính: {r.scopeUnit}
          </div>
        </div>
      ),
    },
    {
      key: 'basePoint',
      header: 'Điểm chuẩn',
      align: 'right',
      width: 105,
      className: 'font-mono tabular-nums',
      render: (r) => (
        <span className="font-semibold text-ink">
          {r.basePoint.toFixed(1).replace('.', ',')} pts
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Độ khó mặc định',
      width: 145,
      render: (r) => {
        const tone =
          r.defaultDifficultyTier === 'HARD'
            ? 'critical'
            : r.defaultDifficultyTier === 'STANDARD'
            ? 'info'
            : 'neutral';
        return (
          <Status tone={tone}>
            {DIFFICULTY_TIER_BADGE[r.defaultDifficultyTier].label}
          </Status>
        );
      },
    },
    {
      key: 'source',
      header: 'Nguồn mặc định',
      width: 135,
      render: (r) => (
        <span className="text-xs text-ink-2">
          {r.defaultSource === 'WORKFLOW_SYSTEM' ? 'Quy trình SOW' : 'Quản lý giao'}
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
              r.usesResearchTable2b ? 'Dùng Bảng 2b Research' : null,
              r.supportsMultiPlatform ? 'Nhân hệ số đa sàn' : null,
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
      width: 155,
      render: (r) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => onQuickAssignFromSow(r)}
          >
            Giao
          </Button>
          {canManageSetup && (
            <Button
              variant="secondary"
              size="sm"
              icon={Edit3}
              onClick={() => setEditingSow({ ...r })}
            >
              Sửa
            </Button>
          )}
        </div>
      ),
    },
  ];

  const levelColumns: Column<TaskDifficultyLevelConfig>[] = [
    {
      key: 'levelCode',
      header: 'Cấp độ phạm vi',
      width: 200,
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.levelCode}</div>
          <div className="text-2xs text-ink-3 font-mono">
            Mã: {r.id}
          </div>
        </div>
      ),
    },
    {
      key: 'multiplier',
      header: 'Hệ số nhân',
      align: 'right',
      width: 110,
      className: 'font-mono tabular-nums',
      render: (r) => (
        <span className="font-semibold text-accent">
          ×{r.multiplier.toFixed(2).replace('.', ',')}
        </span>
      ),
    },
    {
      key: 'slaHours',
      header: 'SLA chuẩn',
      align: 'right',
      width: 115,
      className: 'font-mono tabular-nums',
      render: (r) => (
        <span className="text-ink-2">
          {r.defaultSlaHours}h ({Math.round((r.defaultSlaHours / 24) * 10) / 10}d)
        </span>
      ),
    },
    {
      key: 'scopeDescription',
      header: 'Phạm vi thực hiện chuẩn',
      render: (r) => (
        <div className="text-xs text-ink-2 line-clamp-2">
          {r.scopeDescription}
        </div>
      ),
    },
    {
      key: 'expectedDeliverable',
      header: 'Đầu ra nghiệm thu bắt buộc',
      render: (r) => (
        <div className="text-xs text-ink-2 line-clamp-2">
          {r.expectedDeliverable}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 130,
      render: (r) =>
        canManageSetup ? (
          <div
            className="flex items-center justify-end gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              icon={Edit3}
              onClick={() =>
                setEditingLevelState({
                  categoryKey: activeCategoryConfig.categoryKey,
                  categoryName: activeCategoryConfig.categoryName,
                  levelConfig: { ...r },
                })
              }
            >
              Sửa
            </Button>
            {activeCategoryConfig.levels.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteLevelItem(r.id)}
                title="Xóa cấp độ"
                className="p-1.5 rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
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
            icon={ArrowLeft}
            onClick={onBack}
          >
            Quay lại bảng công việc
          </Button>
          <div className="h-4 w-px bg-line hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink">
                Cấu hình định mức &amp; Chính sách điểm SOW
              </h2>
              <Status tone={canManageSetup ? 'positive' : 'neutral'}>
                {canManageSetup ? 'Quyền chỉnh sửa' : 'Chế độ tra cứu'}
              </Status>
            </div>
            <p className="text-2xs text-ink-3">
              Thiết lập điểm chuẩn 33 đầu việc SOW, cấp độ nghiên cứu Bảng 2b và ma trận hệ số Bảng 2–7
            </p>
          </div>
        </div>

        <Segmented<SetupSectionKey>
          value={section}
          onChange={setSection}
          items={[
            {
              key: 'SOW_TABLE_1',
              label: `Bảng 1: 33 đầu việc SOW`,
            },
            {
              key: 'RESEARCH_TABLE_2B',
              label: 'Bảng 2b: Cấp độ phạm vi',
            },
            {
              key: 'RULES_TABLE_2_7',
              label: 'Bảng 2–7: Ma trận hệ số',
            },
          ]}
        />
      </div>

      {/* SECTION 1: BẢNG 1 - 33 ĐẦU VIỆC SOW */}
      {section === 'SOW_TABLE_1' && (
        <div className="space-y-4">
          <StatRow>
            <Stat
              label="Tổng danh mục SOW"
              value={`${sowPolicies.length} đầu việc`}
              note={`Chia theo ${sowGroups.length} nhóm nghiệp vụ B2C`}
            />
            <Stat
              label="Đầu việc mức Khó (1,20)"
              value={`${sowSummaryStats.hardCount} đầu việc`}
              tone="critical"
              note="Tính vào tỷ trọng việc khó cuối tháng"
            />
            <Stat
              label="Đầu việc Tiêu chuẩn (1,00)"
              value={`${sowSummaryStats.standardCount} đầu việc`}
              tone="positive"
              note={`${sowSummaryStats.easyCount} đầu việc mức Dễ (0,80)`}
            />
            <Stat
              label="Điểm chuẩn bình quân"
              value={`${sowSummaryStats.avgBase.toFixed(1).replace('.', ',')} pts`}
              note="Chưa nhân hệ số gian hàng & độ khó"
            />
          </StatRow>

          <Panel
            flush
            title="Bảng 1 · Chính sách điểm theo danh mục công việc (33 SOW)"
            description="Bấm vào từng dòng hoặc nút Sửa để điều chỉnh điểm chuẩn, độ khó mặc định và quy tắc nghiệm thu"
            actions={
              canManageSetup ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => setConfirmResetTarget('SOW')}
                >
                  Khôi phục mặc định
                </Button>
              ) : undefined
            }
          >
            <div className="p-3 border-b border-line">
              <FilterBar
                search={{
                  value: sowSearch,
                  onChange: setSowSearch,
                  placeholder: 'Tìm tên đầu việc, nhóm SOW, quy tắc...',
                }}
                resultCount={filteredSowPolicies.length}
                filters={
                  <Select
                    value={sowGroupFilter}
                    onChange={(e) => setSowGroupFilter(e.target.value)}
                    className="w-56"
                  >
                    <option value="ALL">
                      Tất cả nhóm ({sowPolicies.length} đầu việc)
                    </option>
                    {sowGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </Select>
                }
                chips={
                  <Chips<'ALL' | 'EASY' | 'STANDARD' | 'HARD'>
                    value={sowTierFilter}
                    onChange={setSowTierFilter}
                    items={[
                      { key: 'ALL', label: 'Mọi độ khó', count: sowPolicies.length },
                      {
                        key: 'HARD',
                        label: 'Khó (1,20)',
                        count: sowSummaryStats.hardCount,
                      },
                      {
                        key: 'STANDARD',
                        label: 'Tiêu chuẩn (1,00)',
                        count: sowSummaryStats.standardCount,
                      },
                      {
                        key: 'EASY',
                        label: 'Dễ (0,80)',
                        count: sowSummaryStats.easyCount,
                      },
                    ]}
                  />
                }
              />
            </div>

            <DataTable<SowPointPolicyItem>
              rows={filteredSowPolicies}
              columns={sowColumns}
              rowKey={(r) => String(r.stt)}
              onRowClick={(r) => {
                if (canManageSetup) setEditingSow({ ...r });
              }}
            />
          </Panel>
        </div>
      )}

      {/* SECTION 2: BẢNG 2B - CẤP ĐỘ PHẠM VI & NGHIÊN CỨU */}
      {section === 'RESEARCH_TABLE_2B' && activeCategoryConfig && (
        <div className="space-y-4">
          <Panel
            flush
            title={activeCategoryConfig.tableTitle}
            description={`Đơn vị chuẩn: ${activeCategoryConfig.unitLabel} · Điểm gốc nhóm: ${activeCategoryConfig.baseWorkloadPoints} pts`}
            actions={
              canManageSetup ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => setConfirmResetTarget('DIFFICULTY')}
                  >
                    Khôi phục mặc định
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      setEditingLevelState({
                        categoryKey: activeCategoryConfig.categoryKey,
                        categoryName: activeCategoryConfig.categoryName,
                        isNew: true,
                        levelConfig: {
                          id: `${activeCategoryConfig.categoryKey}-L${
                            activeCategoryConfig.levels.length + 1
                          }`,
                          levelCode: '',
                          multiplier: 1.0,
                          scopeDescription: '',
                          expectedDeliverable: '',
                          defaultSlaHours: 36,
                        },
                      })
                    }
                  >
                    Thêm cấp độ
                  </Button>
                </div>
              ) : undefined
            }
          >
            <div className="p-3 border-b border-line">
              <Chips<TaskDifficultyCategoryKey>
                value={activeCategoryKey}
                onChange={setActiveCategoryKey}
                items={difficultyConfigs.map((cfg) => ({
                  key: cfg.categoryKey,
                  label: cfg.categoryName,
                  count: cfg.levels.length,
                }))}
              />
            </div>

            <DataTable<TaskDifficultyLevelConfig>
              rows={activeCategoryConfig.levels}
              columns={levelColumns}
              rowKey={(r) => r.id}
              onRowClick={(r) => {
                if (canManageSetup) {
                  setEditingLevelState({
                    categoryKey: activeCategoryConfig.categoryKey,
                    categoryName: activeCategoryConfig.categoryName,
                    levelConfig: { ...r },
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
          <Panel
            title="Công thức tính điểm Workload cá nhân & Tổng điểm tháng"
            description="Hệ thống tự động nhân các hệ số ngay khi giao việc hoặc nghiệm thu đầu ra"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3 uppercase tracking-wider">
                  1. Điểm nhiệm vụ cá nhân
                </div>
                <div className="font-mono font-semibold text-ink">
                  Điểm cá nhân = SL nghiệm thu × Điểm chuẩn (Bảng 1) × HS phạm vi (Bảng 2/2b) × HS độ khó (Bảng 3) × HS tiến độ (Bảng 5) × HS đa sàn (Bảng 6) × Tỷ trọng vai trò (%)
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3 uppercase tracking-wider">
                  2. Tổng điểm nhân sự cuối tháng
                </div>
                <div className="font-mono font-semibold text-ink">
                  Tổng điểm tháng = Tổng điểm quy đổi trong kỳ × Hệ số cơ cấu việc khó theo Level (Bảng 4: Đạt ×1,00 | Không đạt ×0,70)
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bảng 2 */}
            <Panel
              flush
              title="Bảng 2 · Hệ số quy mô & Độ phức tạp gian hàng"
              description="Áp dụng theo mức độ phức tạp vận hành của từng Store/Brand"
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
                    <tr key={r.code} className="hover:bg-canvas">
                      <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                        ×{r.coef.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2.5 px-4 text-ink-2">{r.note}</td>
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
                description="Điều chỉnh khi KOC mới, đề bài mới hoặc tái sử dụng"
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
                      <tr key={r.tier} className="hover:bg-canvas">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          ×{r.coef.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.criteria}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel
                flush
                title="Bảng 6 · Hệ số mở rộng đa sàn (Việc cấp Brand)"
                description="Áp dụng cho campaign hoặc KV/Brief triển khai trên nhiều gian hàng"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Quy mô đa sàn</th>
                      <th className="py-2.5 px-4 font-medium text-right">Hệ số nhân</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {MULTI_PLATFORM_TABLE_6.map((r) => (
                      <tr key={r.stores} className="hover:bg-canvas">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-accent">
                          ×{r.coef.toFixed(1).replace('.', ',')}
                        </td>
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
              title="Bảng 4 · Yêu cầu tỷ trọng việc khó theo Level nhân sự"
              description="Đánh giá cuối tháng dựa trên tỷ lệ điểm việc Khó trên tổng điểm"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Level nhân sự</th>
                    <th className="py-2.5 px-3 font-medium">Tỷ trọng việc khó tối thiểu</th>
                    <th className="py-2.5 px-3 font-medium text-right">Đạt chuẩn</th>
                    <th className="py-2.5 px-4 font-medium text-right">Không đạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {STAFF_LEVEL_TABLE_4.map((r) => (
                    <tr key={r.level} className="hover:bg-canvas">
                      <td className="py-2.5 px-4 font-mono font-semibold text-ink">
                        {r.level}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-ink-2">
                        ≥ {r.minHardRatioPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-positive font-semibold">
                        ×{r.passCoef.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-warning font-semibold">
                        ×{r.failCoef.toFixed(2).replace('.', ',')}
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
                title="Bảng 5 · Hệ số tiến độ hoàn thành (Timeline SLA)"
                description="Áp dụng khi nghiệm thu kết quả công việc"
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
                      <tr key={r.status} className="hover:bg-canvas">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.label}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          ×{r.coef.toFixed(1).replace('.', ',')}
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
                description="Tổng tỷ trọng của các nhân sự trong 1 đầu việc luôn bằng 100%"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken text-2xs text-ink-3 uppercase border-b border-line">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Vai trò</th>
                      <th className="py-2.5 px-3 font-medium text-right">Khung gợi ý</th>
                      <th className="py-2.5 px-4 font-medium">Trách nhiệm chính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TASK_ROLE_WEIGHT_RULES.map((r) => (
                      <tr key={r.roleKey} className="hover:bg-canvas">
                        <td className="py-2.5 px-4 font-medium text-ink">{r.roleLabel}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                          {r.suggestedWeightRange}
                        </td>
                        <td className="py-2.5 px-4 text-ink-2">{r.responsibilities}</td>
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
        description={editingSow?.group}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingSow(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={handleSaveSowItem}
            >
              Lưu định mức
            </Button>
          </>
        }
      >
        {editingSow && (
          <div className="space-y-4">
            <Field label="Tên đầu việc SOW">
              <Input
                value={editingSow.name}
                onChange={(e) =>
                  setEditingSow({ ...editingSow, name: e.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Điểm chuẩn (pts)">
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={50}
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

              <Field label="Cấp tính điểm">
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
                  Quy trình hệ thống (Workflow SOW)
                </option>
                <option value="DIRECTOR_ASSIGNED">
                  Quản lý giao (Director / Manager Assigned)
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

      {/* MODAL EDIT OR ADD LEVEL RULE (BẢNG 2B) */}
      <Modal
        open={Boolean(editingLevelState)}
        onClose={() => setEditingLevelState(null)}
        title={
          editingLevelState
            ? editingLevelState.isNew
              ? `Thêm cấp độ mới · ${editingLevelState.categoryName}`
              : `${editingLevelState.levelConfig.levelCode} · ${editingLevelState.categoryName}`
            : ''
        }
        description="Thiết lập hệ số nhân, thời hạn SLA chuẩn và đầu ra nghiệm thu"
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
              icon={Check}
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
              <Field label="Tên cấp độ">
                <Input
                  value={editingLevelState.levelConfig.levelCode}
                  placeholder="VD: Level 3 – Nâng cao"
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelConfig: {
                        ...editingLevelState.levelConfig,
                        levelCode: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Hệ số nhân">
                <Input
                  type="number"
                  step="0.05"
                  min={0.1}
                  max={5}
                  value={editingLevelState.levelConfig.multiplier}
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelConfig: {
                        ...editingLevelState.levelConfig,
                        multiplier: Math.max(0.1, Number(e.target.value) || 1),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Hạn SLA chuẩn (giờ)">
                <Input
                  type="number"
                  step="4"
                  min={4}
                  value={editingLevelState.levelConfig.defaultSlaHours}
                  onChange={(e) =>
                    setEditingLevelState({
                      ...editingLevelState,
                      levelConfig: {
                        ...editingLevelState.levelConfig,
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

            <Field label="Phạm vi thực hiện chuẩn">
              <Textarea
                rows={3}
                value={editingLevelState.levelConfig.scopeDescription}
                onChange={(e) =>
                  setEditingLevelState({
                    ...editingLevelState,
                    levelConfig: {
                      ...editingLevelState.levelConfig,
                      scopeDescription: e.target.value,
                    },
                  })
                }
              />
            </Field>

            <Field label="Đầu ra nghiệm thu bắt buộc">
              <Textarea
                rows={2}
                value={editingLevelState.levelConfig.expectedDeliverable}
                onChange={(e) =>
                  setEditingLevelState({
                    ...editingLevelState,
                    levelConfig: {
                      ...editingLevelState.levelConfig,
                      expectedDeliverable: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* CONFIRM RESET DIALOG */}
      <ConfirmDialog
        open={Boolean(confirmResetTarget)}
        onCancel={() => setConfirmResetTarget(null)}
        onConfirm={handleConfirmReset}
        title="Khôi phục định mức mặc định"
        description={
          confirmResetTarget === 'SOW'
            ? 'Bạn có chắc chắn muốn khôi phục Bảng 1 (33 đầu việc SOW) về thông số gốc của phòng B2C?'
            : 'Bạn có chắc chắn muốn khôi phục Bảng 2b (Cấp độ phạm vi & Nghiên cứu) về thông số gốc?'
        }
        confirmLabel="Khôi phục mặc định"
        variant="danger"
      />
    </div>
  );
}

export default TaskPolicySetupView;
