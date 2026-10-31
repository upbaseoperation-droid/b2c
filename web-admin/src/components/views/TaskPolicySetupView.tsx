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
import { formatDecimal } from '../../lib/format';

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
      className: 'tabular-nums',
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
      className: 'tabular-nums',
      render: (r) => (
        <span className="font-semibold text-ink">
          {formatDecimal(r.basePoint, 1)} pts
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
          className="flex items-center justify-end gap-2"
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
          <div className="text-2xs text-ink-3 font-code">
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
      className: 'tabular-nums',
      render: (r) => (
        <span className="font-semibold text-accent">
          ×{formatDecimal(r.multiplier, 2)}
        </span>
      ),
    },
    {
      key: 'slaHours',
      header: 'SLA chuẩn',
      align: 'right',
      width: 115,
      className: 'tabular-nums',
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
            className="flex items-center justify-end gap-2"
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
                className="p-2 rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft transition-colors"
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
          <h2 className="text-base font-semibold text-ink">
            Cấu hình định mức &amp; Chính sách điểm SOW
          </h2>
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
            />
            <Stat
              label="Đầu việc mức Khó (1,20)"
              value={`${sowSummaryStats.hardCount} đầu việc`}
              tone="critical"
            />
            <Stat
              label="Đầu việc Tiêu chuẩn (1,00)"
              value={`${sowSummaryStats.standardCount} đầu việc`}
              tone="positive"
            />
            <Stat
              label="Điểm chuẩn bình quân"
              value={`${formatDecimal(sowSummaryStats.avgBase, 1)} pts`}
            />
          </StatRow>

          <Panel
            flush
            title="Bảng 1 · Chính sách điểm theo danh mục công việc (33 SOW)"
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
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3">
                  1. Điểm nhiệm vụ cá nhân
                </div>
                <div className="font-semibold text-ink">
                  Điểm cá nhân = SL nghiệm thu × Điểm chuẩn (Bảng 1) × HS phạm vi (Bảng 2/2b) × HS độ khó (Bảng 3) × HS tiến độ (Bảng 5) × HS đa sàn (Bảng 6) × Tỷ trọng vai trò (%)
                </div>
              </div>
              <div className="p-4 rounded-lg bg-sunken border border-line space-y-1">
                <div className="text-2xs font-medium text-ink-3">
                  2. Tổng điểm nhân sự cuối tháng
                </div>
                <div className="font-semibold text-ink">
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
            >
              <DataTable<typeof STORE_SCOPE_TABLE_2[number]>
                rows={STORE_SCOPE_TABLE_2}
                columns={[
                  { key: 'label', header: 'Nhóm gian hàng', render: (r) => <span className="font-medium text-ink">{r.label}</span> },
                  { key: 'coef', header: 'Hệ số', align: 'right', render: (r) => <span className="font-semibold text-accent">×{formatDecimal(r.coef, 2)}</span> },
                  { key: 'note', header: 'Tiêu chí nhận diện', render: (r) => <span className="text-ink-2">{r.note}</span> },
                ]}
                rowKey={(r) => r.code}
              />
            </Panel>

            {/* Bảng 3 & Bảng 6 */}
            <div className="space-y-4">
              <Panel
                flush
                title="Bảng 3 · Hệ số độ khó theo lần thực hiện"
              >
                <DataTable<typeof TASK_DIFFICULTY_TABLE_3[number]>
                  rows={TASK_DIFFICULTY_TABLE_3}
                  columns={[
                    { key: 'label', header: 'Mức độ', render: (r) => <span className="font-medium text-ink">{r.label}</span> },
                    { key: 'coef', header: 'Hệ số', align: 'right', render: (r) => <span className="font-semibold text-ink">×{formatDecimal(r.coef, 2)}</span> },
                    { key: 'criteria', header: 'Khi áp dụng', render: (r) => <span className="text-ink-2">{r.criteria}</span> },
                  ]}
                  rowKey={(r) => r.tier}
                />
              </Panel>

              <Panel
                flush
                title="Bảng 6 · Hệ số mở rộng đa sàn (Việc cấp Brand)"
              >
                <DataTable<typeof MULTI_PLATFORM_TABLE_6[number]>
                  rows={MULTI_PLATFORM_TABLE_6}
                  columns={[
                    { key: 'label', header: 'Quy mô đa sàn', render: (r) => <span className="font-medium text-ink">{r.label}</span> },
                    { key: 'coef', header: 'Hệ số nhân', align: 'right', render: (r) => <span className="font-semibold text-accent">×{formatDecimal(r.coef, 1)}</span> },
                  ]}
                  rowKey={(r) => String(r.stores)}
                />
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bảng 4 */}
            <Panel
              flush
              title="Bảng 4 · Yêu cầu tỷ trọng việc khó theo Level nhân sự"
            >
              <DataTable<typeof STAFF_LEVEL_TABLE_4[number]>
                rows={STAFF_LEVEL_TABLE_4}
                columns={[
                  { key: 'level', header: 'Level nhân sự', render: (r) => <span className="font-semibold text-ink">{r.level}</span> },
                  { key: 'min', header: 'Tỷ trọng việc khó tối thiểu', render: (r) => <span className="text-ink-2">≥ {r.minHardRatioPct}%</span> },
                  { key: 'pass', header: 'Đạt chuẩn', align: 'right', render: (r) => <span className="font-semibold text-positive">×{formatDecimal(r.passCoef, 2)}</span> },
                  { key: 'fail', header: 'Không đạt', align: 'right', render: (r) => <span className="font-semibold text-warning">×{formatDecimal(r.failCoef, 2)}</span> },
                ]}
                rowKey={(r) => r.level}
              />
            </Panel>

            {/* Bảng 5 & Vai trò */}
            <div className="space-y-4">
              <Panel
                flush
                title="Bảng 5 · Hệ số tiến độ hoàn thành (Timeline SLA)"
              >
                <DataTable<typeof TIMELINE_TABLE_5[number]>
                  rows={TIMELINE_TABLE_5}
                  columns={[
                    { key: 'label', header: 'Mức độ hoàn thành', render: (r) => <span className="font-medium text-ink">{r.label}</span> },
                    { key: 'coef', header: 'Hệ số', align: 'right', render: (r) => <span className="font-semibold text-ink">×{formatDecimal(r.coef, 1)}</span> },
                    { key: 'condition', header: 'Điều kiện áp dụng', render: (r) => <span className="text-ink-2">{r.condition}</span> },
                  ]}
                  rowKey={(r) => r.status}
                />
              </Panel>

              <Panel
                flush
                title="Quy tắc phân chia tỷ trọng theo vai trò phối hợp"
              >
                <DataTable<typeof TASK_ROLE_WEIGHT_RULES[number]>
                  rows={TASK_ROLE_WEIGHT_RULES}
                  columns={[
                    { key: 'role', header: 'Vai trò', render: (r) => <span className="font-medium text-ink">{r.roleLabel}</span> },
                    { key: 'range', header: 'Khung gợi ý', align: 'right', render: (r) => <span className="font-semibold text-accent">{r.suggestedWeightRange}</span> },
                    { key: 'resp', header: 'Trách nhiệm chính', render: (r) => <span className="text-ink-2">{r.responsibilities}</span> },
                  ]}
                  rowKey={(r) => r.roleKey}
                />
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
        size="lg"
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
        size="lg"
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
