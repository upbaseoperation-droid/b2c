'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Sliders,
  Send,
  CheckCircle2,
  ExternalLink,
  Layers,
  Check,
  X,
  BarChart3,
  Link2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import {
  SlaTask,
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  TaskDifficultyCategoryKey,
  TaskAssignmentRoleKey,
  TaskCategoryDifficultyConfig,
  TaskDifficultyLevelConfig,
  UserRole,
} from '../../lib/types';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';
import { STAFF_MASTER_DIRECTORY } from '../../lib/mockData';
import { formatDecimal, getVietnamDateTimeShort, roundTo } from '../../lib/format';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides,
  INITIAL_DEPARTMENT_ACCESS_RULES,
} from '../../lib/rbacData';
import {
  Avatar,
  Button,
  Chips,
  DataTable,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Progress,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  type Column,
} from '../ui';
import {
  SowPointPolicyItem,
  STORE_SCOPE_TABLE_2,
  STAFF_LEVEL_TABLE_4,
  TIMELINE_TABLE_5,
  MULTI_PLATFORM_TABLE_6,
  B2C_28_STAFF_WORKLOAD_ROSTER,
  ROLE_SPLIT_PRESETS,
  ROLE_LABEL_MAP,
  DIFFICULTY_TIER_BADGE,
  UnifiedStaffWorkloadRow,
  loadSavedDifficultyConfigs,
  persistDifficultyConfigs,
  loadSavedSowPolicies,
  persistSowPolicies,
  loadSavedManagerExceptions,
  persistManagerExceptions,
  resolveTaskSource,
  computeUnifiedB2cStaffWorkloads,
  normalizeStoreCoefficient,
} from '../../lib/taskDelegationData';
import TaskPolicySetupView from './TaskPolicySetupView';

export * from '../../lib/taskDelegationData';

export interface TaskDelegationViewProps {
  currentUser: UserProfile;
  tasks: SlaTask[];
  brands: BrandDetail[];
  storePortfolios: StorePortfolioItem[];
  onAddTask: (task: SlaTask) => void;
  onCompleteTask: (taskId: string) => void;
  onUpdateTask?: (updated: SlaTask) => void;
  onPingStaff?: (staffName: string, taskTitle: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface AssigneeSlotState {
  staffName: string;
  role: TaskAssignmentRoleKey;
  weightPct: number;
}

const CATEGORY_LABELS: Record<TaskDifficultyCategoryKey, string> = {
  RESEARCH: 'Nghiên cứu',
  BOOKING: 'Booking KOC',
  CONTENT: 'Nội dung & Video',
  KEY_VISUAL: 'Key Visual',
  CAMPAIGN: 'Chiến dịch',
  LIVESTREAM: 'Livestream',
};

export const TaskDelegationView: React.FC<TaskDelegationViewProps> = ({
  currentUser,
  tasks,
  brands,
  storePortfolios,
  onAddTask,
  onCompleteTask,
  onUpdateTask,
  onPingStaff,
  onNotify,
}) => {
  const canManageSetup = [
    'ADMIN',
    'MANAGER',
    'LEADER',
  ].includes(currentUser.role);

  // Navigation & View Modes
  const [rawActiveSubTab, setActiveSubTab] = useState<'ASSIGNMENTS' | 'WORKLOAD_MEASUREMENT'>('ASSIGNMENTS');
  const activeSubTab = !canManageSetup ? 'ASSIGNMENTS' : rawActiveSubTab;
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');
  const [isSetupViewOpen, setIsSetupViewOpen] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab === 'task-delegation' && detail.subView) {
        if (detail.subView === 'POLICY') {
          setIsSetupViewOpen(true);
        } else {
          setIsSetupViewOpen(false);
        }
      }
    };
    window.addEventListener('upbase-sidebar-subview', handler);
    return () => window.removeEventListener('upbase-sidebar-subview', handler);
  }, []);

  // Saved Policies & Configs
  const [difficultyConfigs, setDifficultyConfigs] = useState<TaskCategoryDifficultyConfig[]>(() =>
    loadSavedDifficultyConfigs()
  );
  const [sowPolicies, setSowPolicies] = useState<SowPointPolicyItem[]>(() =>
    loadSavedSowPolicies()
  );

  const saveDifficultyConfigs = (next: TaskCategoryDifficultyConfig[]) => {
    setDifficultyConfigs(next);
    persistDifficultyConfigs(next);
  };

  const saveSowPolicies = (next: SowPointPolicyItem[]) => {
    setSowPolicies(next);
    persistSowPolicies(next);
  };

  // Load & persist Bảng 4 Manager Exceptions
  const [managerExceptions, setManagerExceptions] = useState<Record<string, boolean>>(() =>
    loadSavedManagerExceptions()
  );

  useEffect(() => {
    const syncExceptions = () => setManagerExceptions(loadSavedManagerExceptions());
    window.addEventListener('upbase-workload-exceptions-updated', syncExceptions);
    return () => window.removeEventListener('upbase-workload-exceptions-updated', syncExceptions);
  }, []);

  const toggleManagerException = (staffCode: string, staffName: string) => {
    const next = { ...managerExceptions, [staffCode]: !managerExceptions[staffCode] };
    setManagerExceptions(next);
    persistManagerExceptions(next);
    onNotify?.(
      next[staffCode]
        ? `Đã xác nhận ngoại lệ Bảng 4 cho ${staffName}: Giữ nguyên hệ số cơ cấu ×1,00`
        : `Đã gỡ ngoại lệ Bảng 4 của ${staffName}: Áp dụng hệ số cơ cấu theo tỷ lệ thực tế`,
      'info'
    );
  };

  // Staff list for assignment (prioritizing the 28 B2C staff)
  const allAssignableStaff = useMemo(() => {
    const rules = getSavedDeptAccessRules(INITIAL_DEPARTMENT_ACCESS_RULES);
    const overrides = getSavedStaffAccessOverrides();
    const map = new Map<
      string,
      { name: string; roleTitle: string; team: string; sysRole: UserRole; level?: string; staffCode?: string }
    >();

    B2C_28_STAFF_WORKLOAD_ROSTER.forEach(r => {
      map.set(r.name, {
        name: r.name,
        roleTitle: `${r.roleGroup} (${r.level})`,
        team: 'Marketing B2C',
        sysRole: r.level === 'L3' ? 'LEADER' : 'BOOKING_MEMBER',
        level: r.level,
        staffCode: r.staffCode,
      });
    });

    STAFF_MASTER_DIRECTORY.forEach(s => {
      if (!map.has(s.name)) {
        const sysRole: UserRole =
          s.role === 'BOOKING'
            ? 'BOOKING_MEMBER'
            : s.role === 'CONTENT'
            ? 'CONTENT_MEMBER'
            : s.role === 'MANAGER'
            ? 'MANAGER'
            : 'BRAND_MEMBER';
        map.set(s.name, {
          name: s.name,
          roleTitle: s.roleTitle,
          team: s.team,
          sysRole,
        });
      }
    });

    UPBASE_STAFF_MASTER.forEach(s => {
      const c = classifyMasterStaffMember(s, rules, overrides);
      if (c.canLogin && !map.has(s.name)) {
        map.set(s.name, {
          name: s.name,
          roleTitle: s.position || 'Chuyên viên',
          team: s.department || s.team || 'Marketing B2C',
          sysRole: c.role,
        });
      }
    });

    return Array.from(map.values());
  }, []);

  // Filters for Tab 1 (Task List & Kanban)
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TaskDifficultyCategoryKey>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OPEN' | 'CRITICAL' | 'DONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Task Detail Inspection & Deliverable Submission
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<SlaTask | null>(null);
  const [editingDeliverableTask, setEditingDeliverableTask] = useState<SlaTask | null>(null);
  const [deliverableInputUrl, setDeliverableInputUrl] = useState<string>('');

  // Filters & State for Tab 2 (Tải công việc nhân sự)
  const [workloadLevelFilter, setWorkloadLevelFilter] = useState<string>('ALL');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL_07' | 'EXCEPTION'>('ALL');
  const [workloadSearch, setWorkloadSearch] = useState<string>('');
  const [inspectingStaffMember, setInspectingStaffMember] = useState<string | null>(null);

  // New Task Composer Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [formTaskSource, setFormTaskSource] = useState<'DIRECTOR_ASSIGNED' | 'WORKFLOW_SYSTEM'>('DIRECTOR_ASSIGNED');
  const [formSowStt, setFormSowStt] = useState<number>(26);
  const [formCategory, setFormCategory] = useState<TaskDifficultyCategoryKey>('RESEARCH');
  const [formLevelId, setFormLevelId] = useState<string>('RES-L3');
  const [formStoreScopeCoef, setFormStoreScopeCoef] = useState<0.8 | 1.0 | 1.25 | 1.5>(1.0);
  const [formAcceptedQty, setFormAcceptedQty] = useState<number>(1);
  const [formTaskDiffTier, setFormTaskDiffTier] = useState<'EASY' | 'STANDARD' | 'HARD'>('HARD');
  const formTimelineStatus = 'ON_TIME' as const;
  const [formMultiStoreCount, setFormMultiStoreCount] = useState<number>(1);
  const [formBrand, setFormBrand] = useState<string>(brands[0]?.name || 'ClubClio');
  const [formStore, setFormStore] = useState<string>('');
  const formPlatformsCount = 2;
  const formProductLinesCount = 2;
  // Bảng 7 Conditional Governance Fields
  const formPlatformScope = 'TikTok, Shopee';
  const formChannelPlatform = 'TikTok / Shopee Video';
  const [formOriginalAssetRef, setFormOriginalAssetRef] = useState<string>('');
  const [formKocStatusType, setFormKocStatusType] = useState<'NEW_KOC' | 'REBOOK' | 'FRAMEWORK_CONTRACT'>('NEW_KOC');
  const [formDiffOverrideReason, setFormDiffOverrideReason] = useState<string>('');

  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDeliverable, setFormDeliverable] = useState<string>('');
  const [formDeadlineHours, setFormDeadlineHours] = useState<number>(48);
  const [formUrgency, setFormUrgency] = useState<'critical' | 'warning' | 'normal'>('warning');
  const [assignees, setAssignees] = useState<AssigneeSlotState[]>([
    { staffName: 'Nguyễn Thị Ngọc Tâm', role: 'PIC_OWNER', weightPct: 70 },
    { staffName: 'Lê Phương Thảo', role: 'EXECUTION', weightPct: 30 },
  ]);

  const selectedSowPolicy = useMemo(() => {
    return sowPolicies.find(s => s.stt === formSowStt) || sowPolicies[0];
  }, [sowPolicies, formSowStt]);

  const activeCategoryConfig = useMemo(() => {
    return (
      difficultyConfigs.find(c => c.categoryKey === formCategory) ||
      difficultyConfigs[0]
    );
  }, [difficultyConfigs, formCategory]);

  const activeLevelConfig = useMemo(() => {
    return (
      activeCategoryConfig.levels.find(l => l.id === formLevelId) ||
      activeCategoryConfig.levels[0]
    );
  }, [activeCategoryConfig, formLevelId]);

  const handleSelectSowPolicy = (sow: SowPointPolicyItem) => {
    setFormSowStt(sow.stt);
    setFormCategory(sow.categoryKey);
    setFormTaskDiffTier(sow.defaultDifficultyTier);
    setFormTaskSource(sow.defaultSource);
    const catCfg = difficultyConfigs.find(c => c.categoryKey === sow.categoryKey) || difficultyConfigs[0];
    if (catCfg && catCfg.levels[1]) {
      setFormLevelId(catCfg.levels[1].id);
      setFormDeliverable(catCfg.levels[1].expectedDeliverable);
      setFormDeadlineHours(catCfg.levels[1].defaultSlaHours);
    }
  };

  useEffect(() => {
    const firstLevel = activeCategoryConfig.levels[0];
    if (firstLevel && !activeCategoryConfig.levels.some(l => l.id === formLevelId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormLevelId(firstLevel.id);
      setFormDeliverable(firstLevel.expectedDeliverable);
      setFormDeadlineHours(firstLevel.defaultSlaHours);
    }
  }, [activeCategoryConfig, formLevelId]);

  const handleSelectFormLevel = (lvl: TaskDifficultyLevelConfig) => {
    setFormLevelId(lvl.id);
    setFormDeliverable(lvl.expectedDeliverable);
    setFormDeadlineHours(lvl.defaultSlaHours);
  };

  const brandStores = useMemo(() => {
    return storePortfolios.filter(
      s => s.brandName.toLowerCase() === formBrand.toLowerCase()
    );
  }, [storePortfolios, formBrand]);

  const totalContributionWeight = useMemo(() => {
    return assignees.reduce((sum, a) => sum + (Number(a.weightPct) || 0), 0);
  }, [assignees]);

  const isWeightValid = Math.abs(totalContributionWeight - 100) < 0.01;

  const modalFormulaPreview = useMemo(() => {
    const qty = Math.max(1, Number(formAcceptedQty) || 1);
    const stdPoint = selectedSowPolicy?.basePoint || 1.0;
    const usesResearch2b = Boolean(selectedSowPolicy?.usesResearchTable2b);
    const scopeCoef = usesResearch2b
      ? activeLevelConfig?.multiplier || 1.0
      : formStoreScopeCoef || 1.0;
    const taskDiffCoef = DIFFICULTY_TIER_BADGE[formTaskDiffTier].coef;
    const timelineCoef = TIMELINE_TABLE_5.find(t => t.status === formTimelineStatus)?.coef ?? 1.0;
    const multiPlatformCoef = selectedSowPolicy?.supportsMultiPlatform
      ? MULTI_PLATFORM_TABLE_6.find(m => m.stores === Math.min(4, Math.max(1, formMultiStoreCount)))?.coef ?? 1.0
      : 1.0;
    const totalCasePoints = roundTo(qty * stdPoint * scopeCoef * taskDiffCoef * timelineCoef * multiPlatformCoef, 2);
    return {
      qty,
      stdPoint,
      usesResearch2b,
      scopeCoef,
      taskDiffCoef,
      timelineCoef,
      multiPlatformCoef,
      totalCasePoints,
    };
  }, [
    formAcceptedQty,
    selectedSowPolicy,
    activeLevelConfig,
    formStoreScopeCoef,
    formTaskDiffTier,
    formTimelineStatus,
    formMultiStoreCount,
  ]);

  const applySplitPreset = (presetId: string) => {
    const preset = ROLE_SPLIT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const defaultStaffNames = [
      'Nguyễn Thị Ngọc Tâm',
      'Lê Phương Thảo',
      'Lương Thị Như Quỳnh',
      'Bùi Ngọc Ánh',
      'Phạm Thị Thu Hằng',
    ];
    setAssignees(
      preset.slots.map((slot, idx) => ({
        staffName:
          assignees[idx]?.staffName ||
          defaultStaffNames[idx % defaultStaffNames.length],
        role: slot.role,
        weightPct: slot.weightPct,
      }))
    );
  };

  const handleSubmitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề công việc cần giao!', 'warning');
      return;
    }
    if (!isWeightValid) {
      onNotify?.(
        `Tổng tỷ trọng đóng góp của các nhân sự trong cùng công việc phải bằng 100% (hiện tại: ${totalContributionWeight}%).`,
        'warning'
      );
      return;
    }
    if (selectedSowPolicy.requiresOriginalAsset && !formOriginalAssetRef.trim()) {
      onNotify?.('Theo Bảng 7: Đầu việc Reup/Adapt bắt buộc phải ghi Mã Asset gốc / Link video gốc!', 'warning');
      return;
    }
    if (
      formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier &&
      !formDiffOverrideReason.trim()
    ) {
      onNotify?.(
        'Theo Bảng 7: Khi chọn Độ khó thực tế khác mức mặc định của Bảng 1, bắt buộc phải ghi Lý do điều chỉnh!',
        'warning'
      );
      return;
    }

    const groupId = `grp-task-${Date.now()}`;
    const nowStr = getVietnamDateTimeShort();

    assignees.forEach((slot, idx) => {
      const staffObj = allAssignableStaff.find(s => s.name === slot.staffName);
      const personalWorkload = roundTo(modalFormulaPreview.totalCasePoints * (slot.weightPct / 100), 2);

      const newTask: SlaTask = {
        id: `task-del-${Date.now()}-${idx}`,
        title:
          assignees.length > 1 && idx > 0
            ? `${formTitle.trim()} (${ROLE_LABEL_MAP[slot.role]})`
            : formTitle.trim(),
        description:
          formDescription.trim() ||
          `${formTaskSource === 'DIRECTOR_ASSIGNED' ? 'Quản lý giao' : 'Luồng quy trình'} · ${selectedSowPolicy.group}: ${selectedSowPolicy.name}`,
        type: formCategory === 'RESEARCH' ? 'RESEARCH_TASK' : 'GENERAL_TASK',
        taskSource: formTaskSource,
        workflowStageLabel:
          formTaskSource === 'WORKFLOW_SYSTEM'
            ? `Luồng ${selectedSowPolicy.group} · Nghiệm thu đầu ra`
            : undefined,
        sowStt: selectedSowPolicy.stt,
        sowGroup: selectedSowPolicy.group,
        sowName: selectedSowPolicy.name,
        acceptedQuantity: modalFormulaPreview.qty,
        standardPoint: modalFormulaPreview.stdPoint,
        scopeCoef: modalFormulaPreview.scopeCoef,
        taskDifficultyTier: formTaskDiffTier,
        taskDifficultyCoef: modalFormulaPreview.taskDiffCoef,
        timelineStatus: formTimelineStatus,
        timelineCoef: modalFormulaPreview.timelineCoef,
        multiPlatformCoef: modalFormulaPreview.multiPlatformCoef,
        platformScope: formPlatformScope.trim() || 'TikTok',
        channelPlatform: formChannelPlatform.trim() || 'TikTok',
        originalAssetRef: formOriginalAssetRef.trim() || undefined,
        kocStatusType: selectedSowPolicy.requiresKocStatus ? formKocStatusType : undefined,
        difficultyOverrideReason: formDiffOverrideReason.trim() || undefined,
        taskCategory: formCategory,
        difficultyLevelId: activeLevelConfig?.id,
        difficultyLabel: activeLevelConfig?.levelCode,
        difficultyMultiplier: modalFormulaPreview.scopeCoef,
        scopeDescription: activeLevelConfig?.scopeDescription,
        expectedDeliverable:
          formDeliverable.trim() || activeLevelConfig?.expectedDeliverable,
        assignmentRole: slot.role,
        contributionWeightPct: slot.weightPct,
        baseWorkloadPoints: roundTo(modalFormulaPreview.qty * modalFormulaPreview.stdPoint, 2),
        calculatedWorkloadPoints: personalWorkload,
        platformsCount: formCategory === 'RESEARCH' ? formPlatformsCount : formMultiStoreCount,
        productLinesCount: formCategory === 'RESEARCH' ? formProductLinesCount : undefined,
        brand: formBrand,
        storeName: formStore || undefined,
        team: staffObj?.team || 'Marketing B2C',
        pic: slot.staffName,
        targetRole: staffObj?.sysRole || 'MEMBER',
        deadline: `Trong vòng ${formDeadlineHours}h`,
        remainingText: `Còn ${formDeadlineHours} giờ`,
        deadlineHours: formDeadlineHours,
        urgency: formUrgency,
        assignedBy: currentUser.name,
        createdAt: nowStr,
        groupAssignmentId: groupId,
        actionLabel:
          formCategory === 'RESEARCH' ? 'Nộp kết quả' : 'Nghiệm thu',
      };

      onAddTask(newTask);
    });

    onNotify?.(
      `Đã giao "${formTitle.trim()}" (${modalFormulaPreview.totalCasePoints} điểm) cho ${assignees.map(a => `${a.staffName} (${a.weightPct}%)`).join(', ')}`,
      'success'
    );
    setFormTitle('');
    setFormDescription('');
    setFormOriginalAssetRef('');
    setFormDiffOverrideReason('');
    setIsAssignModalOpen(false);
  };

  const getTaskSource = resolveTaskSource;

  const inferCategory = (t: SlaTask): TaskDifficultyCategoryKey => {
    return (
      t.taskCategory ||
      (t.type === 'RESEARCH_TASK'
        ? 'RESEARCH'
        : t.type === 'SCRIPT_REVIEW'
        ? 'CONTENT'
        : t.type === 'CAMPAIGN_BRIEF'
        ? 'CAMPAIGN'
        : 'BOOKING')
    );
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const myName = (currentUser.name || '').trim().toLowerCase();
    return tasks.filter(t => {
      if (!canManageSetup && t.pic.trim().toLowerCase() !== myName) return false;
      const tSource = getTaskSource(t);
      if (sourceFilter !== 'ALL' && tSource !== sourceFilter) return false;
      if (categoryFilter !== 'ALL' && inferCategory(t) !== categoryFilter) return false;
      if (staffFilter !== 'ALL' && t.pic !== staffFilter) return false;
      if (urgencyFilter === 'OPEN' && t.urgency === 'done') return false;
      if (urgencyFilter === 'CRITICAL' && t.urgency !== 'critical') return false;
      if (urgencyFilter === 'DONE' && t.urgency !== 'done') return false;

      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchPic = t.pic.toLowerCase().includes(q);
        const matchBrand = (t.brand || '').toLowerCase().includes(q);
        const matchSow = (t.sowName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPic && !matchBrand && !matchSow) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, sourceFilter, categoryFilter, staffFilter, urgencyFilter, searchQuery, getTaskSource, canManageSetup, currentUser.name]);

  // Unified Staff workload calculation (28 members) synchronized with Workload3dMapView
  const computedStaffWorkloads = useMemo(() => {
    return computeUnifiedB2cStaffWorkloads({
      tasks,
      brands,
      storePortfolios,
      managerExceptions,
    });
  }, [tasks, brands, storePortfolios, managerExceptions]);

  const staffWorkloadByName = useMemo(() => {
    const map = new Map<string, UnifiedStaffWorkloadRow>();
    computedStaffWorkloads.forEach(w => map.set(w.name, w));
    return map;
  }, [computedStaffWorkloads]);

  const managerRadarStats = useMemo(() => {
    const hardRatioShortageStaff = computedStaffWorkloads.filter(
      r => !r.meetsHardRatio && !r.hasException
    );
    const overloadedStaff = computedStaffWorkloads
      .filter(r => r.loadStatus === 'OVERLOAD')
      .sort((a, b) => b.loadPct - a.loadPct);
    const underloadedStaff = computedStaffWorkloads
      .filter(r => r.loadStatus === 'UNDERLOAD')
      .sort((a, b) => a.loadPct - b.loadPct);
    return {
      hardRatioShortageStaff,
      overloadedStaff,
      underloadedStaff,
    };
  }, [computedStaffWorkloads]);

  const openQuickAssignForStaff = (targetStaffName: string, forceHard = false) => {
    const staffRow = staffWorkloadByName.get(targetStaffName);
    const firstOwnedStore = staffRow?.assignedStores[0];
    if (firstOwnedStore) {
      setFormBrand(firstOwnedStore.brandName);
      setFormStore(firstOwnedStore.storeName);
      setFormStoreScopeCoef(firstOwnedStore.coef as 0.8 | 1.0 | 1.25 | 1.5);
    }
    setFormTaskSource('DIRECTOR_ASSIGNED');
    if (forceHard) {
      const hardSow =
        sowPolicies.find(s => s.defaultDifficultyTier === 'HARD') || sowPolicies[0];
      if (hardSow) {
        handleSelectSowPolicy(hardSow);
      }
      setFormTaskDiffTier('HARD');
    }
    setAssignees([
      {
        staffName: targetStaffName,
        role: 'PIC_OWNER',
        weightPct: 100,
      },
    ]);
    setIsAssignModalOpen(true);
  };

  const filteredStaffWorkloads = useMemo(() => {
    const q = workloadSearch.trim().toLowerCase();
    return computedStaffWorkloads.filter(row => {
      if (workloadLevelFilter !== 'ALL' && row.level !== workloadLevelFilter) return false;
      if (workloadStatusFilter === 'PASS' && !row.meetsHardRatio) return false;
      if (workloadStatusFilter === 'FAIL_07' && (row.meetsHardRatio || row.hasException)) return false;
      if (workloadStatusFilter === 'EXCEPTION' && !row.hasException) return false;
      if (q) {
        const matchName = row.name.toLowerCase().includes(q);
        const matchCode = row.staffCode.toLowerCase().includes(q);
        const matchRole = row.roleGroup.toLowerCase().includes(q);
        const matchStores = row.liveStoresSummaryText.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole && !matchStores) return false;
      }
      return true;
    });
  }, [computedStaffWorkloads, workloadLevelFilter, workloadStatusFilter, workloadSearch]);

  // Summary KPI metrics
  const metrics = useMemo(() => {
    const workflowTasksCount = tasks.filter(t => getTaskSource(t) === 'WORKFLOW_SYSTEM').length;
    const directorTasksCount = tasks.filter(t => getTaskSource(t) === 'DIRECTOR_ASSIGNED').length;
    const criticalOpenCount = tasks.filter(t => t.urgency === 'critical').length;
    const totalStaffFinalPts = computedStaffWorkloads.reduce(
      (s, r) => s + r.finalMonthlyWorkloadPts,
      0
    );
    const passCount = computedStaffWorkloads.filter(r => r.structureCoef === 1.0).length;
    return {
      totalCount: tasks.length,
      workflowTasksCount,
      directorTasksCount,
      criticalOpenCount,
      totalStaffFinalPts: roundTo(totalStaffFinalPts, 1),
      passCount,
      totalStaffCount: computedStaffWorkloads.length,
    };
  }, [tasks, computedStaffWorkloads, getTaskSource]);

  const inspectedStaffRow = useMemo(() => {
    if (!inspectingStaffMember) return null;
    return computedStaffWorkloads.find(r => r.name === inspectingStaffMember) || null;
  }, [inspectingStaffMember, computedStaffWorkloads]);

  // Kanban grouping
  const kanbanColumns = useMemo(() => {
    const urgent = filteredTasks.filter(t => t.urgency === 'critical');
    const inProgress = filteredTasks.filter(t => t.urgency === 'warning' || t.urgency === 'normal');
    const done = filteredTasks.filter(t => t.urgency === 'done');
    return [
      {
        key: 'CRITICAL',
        title: 'Khẩn cấp / Cần xử lý ngay',
        tone: 'critical' as const,
        items: urgent,
      },
      {
        key: 'IN_PROGRESS',
        title: 'Đang triển khai',
        tone: 'info' as const,
        items: inProgress,
      },
      {
        key: 'DONE',
        title: 'Đã nghiệm thu',
        tone: 'positive' as const,
        items: done,
      },
    ];
  }, [filteredTasks]);

  // ==========================================================================
  // RENDER SETUP SCREEN WHEN OPENED
  // ==========================================================================
  if (isSetupViewOpen) {
    return (
      <TaskPolicySetupView
        canManageSetup={canManageSetup}
        sowPolicies={sowPolicies}
        difficultyConfigs={difficultyConfigs}
        onSaveSowPolicies={saveSowPolicies}
        onSaveDifficultyConfigs={saveDifficultyConfigs}
        onQuickAssignFromSow={sow => {
          handleSelectSowPolicy(sow);
          setIsSetupViewOpen(false);
          setIsAssignModalOpen(true);
        }}
        onBack={() => setIsSetupViewOpen(false)}
        onNotify={onNotify}
      />
    );
  }

  // ==========================================================================
  // COLUMNS FOR COMPACT TASK LIST TABLE (5 CLEAN COLUMNS, MAX 1 STATUS BADGE)
  // ==========================================================================
  const taskColumns: Column<SlaTask>[] = [
    {
      key: 'task',
      header: 'Công việc',
      render: t => {
        const cat = inferCategory(t);
        const sowLabel = t.sowName || CATEGORY_LABELS[cat];
        return (
          <div className="min-w-0 max-w-[420px]">
            <div className="font-medium text-ink text-sm line-clamp-1">
              {t.title}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-ink-3 mt-0.5">
              <span className="font-medium text-ink-2">{t.brand}</span>
              {t.storeName && (
                <span className="truncate max-w-[150px]">· {t.storeName}</span>
              )}
              <span>· {sowLabel}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'assignee',
      header: 'Người phụ trách',
      width: 200,
      render: t => {
        const roleKey: TaskAssignmentRoleKey = t.assignmentRole || 'PIC_OWNER';
        const weight = t.contributionWeightPct ?? 100;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={t.pic} size={26} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink truncate">{t.pic}</div>
              <div className="text-xs text-ink-3 truncate">
                {ROLE_LABEL_MAP[roleKey]} · <span className="tabular-nums">{weight}%</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'points',
      header: 'Điểm & Phân loại',
      align: 'right',
      width: 170,
      render: t => {
        const pts = t.calculatedWorkloadPoints ?? 2.0;
        const diffTier = t.taskDifficultyTier || 'STANDARD';
        const diffInfo = DIFFICULTY_TIER_BADGE[diffTier];
        const src = getTaskSource(t);
        return (
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums text-ink">
              {formatDecimal(pts, 2)} <span className="text-xs font-normal text-ink-3">đ</span>
            </div>
            <div className="text-xs text-ink-3 mt-0.5">
              {diffInfo.label} · {src === 'DIRECTOR_ASSIGNED' ? 'Quản lý giao' : 'Quy trình'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'deadline',
      header: 'Tiến độ SLA',
      width: 150,
      render: t => {
        const tone =
          t.urgency === 'done'
            ? 'positive'
            : t.urgency === 'critical'
            ? 'critical'
            : t.urgency === 'warning'
            ? 'warning'
            : 'neutral';
        const statusText =
          t.urgency === 'done'
            ? 'Đã nghiệm thu'
            : t.urgency === 'critical'
            ? 'Khẩn cấp'
            : 'Đang làm';
        return (
          <div>
            <Status tone={tone}>{statusText}</Status>
            <div className="text-xs text-ink-3 mt-0.5 tabular-nums">
              {t.urgency === 'done' ? 'Hoàn thành' : t.remainingText}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 180,
      render: t => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            icon={Link2}
            onClick={() => {
              setEditingDeliverableTask(t);
              setDeliverableInputUrl(t.deliverableUrl || '');
            }}
          >
            {t.deliverableUrl ? 'Sửa link' : 'Nộp link'}
          </Button>
          {t.urgency !== 'done' ? (
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={() => onCompleteTask(t.id)}
            >
              Duyệt
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedTaskDetail(t)}
            >
              Chi tiết
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ==========================================================================
  // COLUMNS FOR STAFF WORKLOAD TABLE (28 MEMBERS)
  // ==========================================================================
  const workloadColumns: Column<UnifiedStaffWorkloadRow>[] = [
    {
      key: 'staff',
      header: 'Nhân sự',
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size={28} />
          <div>
            <div className="font-medium text-ink text-sm">{row.name}</div>
            <div className="text-xs text-ink-3">
              {row.staffCode} · {row.level} · {row.roleGroup}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stores',
      header: 'Gian hàng phụ trách',
      render: row => (
        <div className="max-w-[220px]">
          <div className="text-xs font-medium text-ink">
            {row.liveAssignedStoresCount} gian hàng
          </div>
          <div className="text-xs text-ink-3 truncate mt-0.5" title={row.liveStoresSummaryText}>
            {row.liveStoresSummaryText}
          </div>
        </div>
      ),
    },
    {
      key: 'workflowPts',
      header: 'Điểm Quy trình',
      align: 'right',
      width: 120,
      render: row => (
        <div className="tabular-nums text-sm text-ink">
          {formatDecimal(row.workflowPts, 1)}
        </div>
      ),
    },
    {
      key: 'directorPts',
      header: 'Điểm Quản lý giao',
      align: 'right',
      width: 130,
      render: row => (
        <div className="tabular-nums text-sm font-medium text-ink">
          {formatDecimal(row.directorPts, 1)}
        </div>
      ),
    },
    {
      key: 'hardRatio',
      header: 'Tỷ lệ việc khó',
      width: 195,
      render: row => (
        <div>
          <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
            <span className="font-medium text-ink">
              {formatDecimal(row.actualHardRatioPct, 1)}%
            </span>
            <span className="text-ink-3">
              Chuẩn ≥{row.requiredHardRatioPct}%
            </span>
          </div>
          <Progress
            value={row.actualHardRatioPct}
            max={100}
            target={row.requiredHardRatioPct}
          />
        </div>
      ),
    },
    {
      key: 'finalPts',
      header: 'Tổng điểm & Hiệu suất tải',
      align: 'right',
      width: 185,
      render: row => (
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-ink">
            {formatDecimal(row.finalMonthlyWorkloadPts, 1)} <span className="text-xs font-normal text-ink-3">đ</span>
            <span className="text-xs text-ink-3 ml-2">({row.loadPct}%)</span>
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            {row.meetsHardRatio ? (
              <Status tone="positive">Đạt ×1,00</Status>
            ) : row.hasException ? (
              <Status tone="info">Ngoại lệ ×1,00</Status>
            ) : (
              <Status tone="warning">Hệ số ×0,70</Status>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 175,
      render: row => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={e => e.stopPropagation()}
        >
          {canManageSetup && !row.meetsHardRatio && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleManagerException(row.staffCode, row.name)}
            >
              {row.hasException ? 'Gỡ ngoại lệ' : 'Duyệt ×1,00'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setInspectingStaffMember(row.name)}
          >
            Chi tiết ({row.staffTasks.length})
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 min-w-0">
      {/* 1. COMPACT KPI STRIP */}
      <StatRow>
        <Stat
          label="Nhiệm vụ quy trình"
          value={metrics.workflowTasksCount}
          icon={Layers}
        />
        <Stat
          label="Nhiệm vụ quản lý giao"
          value={metrics.directorTasksCount}
          icon={ClipboardList}
        />
        <Stat
          label="Đạt chuẩn cơ cấu việc khó"
          value={`${metrics.passCount}/${metrics.totalStaffCount}`}
          tone="positive"
          icon={ShieldCheck}
        />
        <Stat
          label="Tổng quỹ điểm khối B2C"
          value={formatDecimal(metrics.totalStaffFinalPts, 1)}
          tone={metrics.criticalOpenCount > 0 ? 'warning' : 'positive'}
          icon={BarChart3}
        />
      </StatRow>

      {/* 2. TOP NAVIGATION & ACTION BAR */}
      <div className="bg-surface border border-line rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            {
              key: 'ASSIGNMENTS',
              label: canManageSetup ? 'Bảng điều phối công việc' : 'Nhiệm vụ được giao',
              count: filteredTasks.length,
            },
            ...(canManageSetup
              ? [
                  {
                    key: 'WORKLOAD_MEASUREMENT' as const,
                    label: 'Tải công việc nhân sự',
                    count: computedStaffWorkloads.length,
                  },
                ]
              : []),
          ]}
          className="border-b-0"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === 'ASSIGNMENTS' && (
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              items={[
                { key: 'LIST', label: 'Danh sách' },
                { key: 'KANBAN', label: 'Bảng Kanban' },
              ]}
            />
          )}

          {canManageSetup && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setFormTaskSource('DIRECTOR_ASSIGNED');
                setIsAssignModalOpen(true);
              }}
            >
              Giao việc mới
            </Button>
          )}
        </div>
      </div>

      {/* 3. TAB 1: TASK MANAGEMENT (LIST OR KANBAN) */}
      {activeSubTab === 'ASSIGNMENTS' && (
        <Panel flush>
          <div className="p-3 border-b border-line">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm công việc, thương hiệu, nhân sự...',
              }}
              chips={
                <Chips
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  items={[
                    { key: 'ALL', label: 'Tất cả', count: tasks.length },
                    {
                      key: 'WORKFLOW_SYSTEM',
                      label: 'Quy trình',
                      count: metrics.workflowTasksCount,
                    },
                    {
                      key: 'DIRECTOR_ASSIGNED',
                      label: 'Quản lý giao',
                      count: metrics.directorTasksCount,
                    },
                  ]}
                />
              }
              filters={
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={categoryFilter}
                    onChange={e =>
                      setCategoryFilter(e.target.value as 'ALL' | TaskDifficultyCategoryKey)
                    }
                    className="w-36"
                  >
                    <option value="ALL">Mọi nhóm SOW</option>
                    <option value="RESEARCH">Nghiên cứu</option>
                    <option value="BOOKING">Booking KOC</option>
                    <option value="CONTENT">Nội dung & Video</option>
                    <option value="KEY_VISUAL">Key Visual</option>
                    <option value="CAMPAIGN">Chiến dịch</option>
                    <option value="LIVESTREAM">Livestream</option>
                  </Select>

                  <Select
                    value={staffFilter}
                    onChange={e => setStaffFilter(e.target.value)}
                    className="w-40"
                  >
                    <option value="ALL">Mọi nhân sự</option>
                    {allAssignableStaff.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    value={urgencyFilter}
                    onChange={e =>
                      setUrgencyFilter(e.target.value as 'ALL' | 'OPEN' | 'CRITICAL' | 'DONE')
                    }
                    className="w-36"
                  >
                    <option value="ALL">Mọi trạng thái</option>
                    <option value="OPEN">Đang mở</option>
                    <option value="CRITICAL">Khẩn cấp</option>
                    <option value="DONE">Đã nghiệm thu</option>
                  </Select>
                </div>
              }
              resultCount={filteredTasks.length}
            />
          </div>

          {viewMode === 'LIST' ? (
            <DataTable
              columns={taskColumns}
              rows={filteredTasks}
              rowKey={t => t.id}
              onRowClick={t => setSelectedTaskDetail(t)}
              empty="Không có công việc nào khớp bộ lọc hiện tại."
            />
          ) : (
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 bg-canvas">
              {kanbanColumns.map(col => (
                <div
                  key={col.key}
                  className="bg-sunken/50 border border-line rounded-lg flex flex-col max-h-[680px]"
                >
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-surface rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          col.tone === 'critical'
                            ? 'bg-critical'
                            : col.tone === 'positive'
                            ? 'bg-positive'
                            : 'bg-accent'
                        }`}
                      />
                      <span className="text-xs font-semibold text-ink">{col.title}</span>
                    </div>
                    <span className="text-xs tabular-nums text-ink-3">
                      {col.items.length}
                    </span>
                  </div>

                  <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {col.items.length === 0 ? (
                      <div className="py-10 text-center text-xs text-ink-3">
                        Không có công việc trong cột này
                      </div>
                    ) : (
                      col.items.map(t => {
                        const cat = inferCategory(t);
                        const pts = t.calculatedWorkloadPoints ?? 2.0;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskDetail(t)}
                            className="bg-surface border border-line hover:border-line-strong rounded-lg p-3 cursor-pointer transition space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                              <span className="truncate">
                                <strong className="font-medium text-ink-2">{t.brand}</strong> ·{' '}
                                {t.sowName || CATEGORY_LABELS[cat]}
                              </span>
                              <span className="tabular-nums font-semibold text-ink shrink-0">
                                {formatDecimal(pts, 2)} đ
                              </span>
                            </div>

                            <div className="text-sm font-medium text-ink line-clamp-2">
                              {t.title}
                            </div>

                            <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={t.pic} size={22} />
                                <span className="text-xs font-medium text-ink truncate">
                                  {t.pic}
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-2 shrink-0"
                                onClick={e => e.stopPropagation()}
                              >
                                <span className="text-xs text-ink-3">
                                  {t.urgency === 'done' ? 'Hoàn thành' : t.remainingText}
                                </span>
                                {t.urgency !== 'done' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={Check}
                                    onClick={() => onCompleteTask(t.id)}
                                  >
                                    Duyệt
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* 4. TAB 2: STAFF WORKLOAD MEASUREMENT (28 MEMBERS) */}
      {activeSubTab === 'WORKLOAD_MEASUREMENT' && (
        <Panel
          title="Bảng đo lường tải công việc 28 nhân sự B2C"
          flush
        >
          <div className="p-3 border-b border-line">
            <FilterBar
              search={{
                value: workloadSearch,
                onChange: setWorkloadSearch,
                placeholder: 'Tìm tên nhân sự, mã NV, nhóm chuyên môn hoặc gian hàng...',
              }}
              chips={
                <Chips
                  value={workloadLevelFilter}
                  onChange={setWorkloadLevelFilter}
                  items={[
                    { key: 'ALL', label: 'Tất cả cấp bậc', count: computedStaffWorkloads.length },
                    ...STAFF_LEVEL_TABLE_4.map(lvl => ({
                      key: lvl.level,
                      label: `${lvl.level} (≥${String(lvl.minHardRatioPct).replace('.', ',')}%)`,
                      count: computedStaffWorkloads.filter(r => r.level === lvl.level).length,
                    })),
                  ]}
                />
              }
              filters={
                <Select
                  value={workloadStatusFilter}
                  onChange={e =>
                    setWorkloadStatusFilter(
                      e.target.value as 'ALL' | 'PASS' | 'FAIL_07' | 'EXCEPTION'
                    )
                  }
                  className="w-52"
                >
                  <option value="ALL">Mọi trạng thái tỷ lệ việc khó</option>
                  <option value="PASS">Đạt chuẩn tỷ lệ việc khó (×1,00)</option>
                  <option value="EXCEPTION">Có xác nhận ngoại lệ (×1,00)</option>
                  <option value="FAIL_07">Chưa đạt tỷ lệ việc khó (×0,70)</option>
                </Select>
              }
              resultCount={filteredStaffWorkloads.length}
            />
          </div>

          <DataTable
            columns={workloadColumns}
            rows={filteredStaffWorkloads}
            rowKey={r => r.staffCode}
            onRowClick={r => setInspectingStaffMember(r.name)}
            empty="Không tìm thấy nhân sự phù hợp bộ lọc."
          />
        </Panel>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: TASK DETAIL & FORMULA BREAKDOWN                             */}
      {/* ==================================================================== */}
      <Modal
        open={!!selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        title={selectedTaskDetail?.title || 'Chi tiết công việc'}
        size="lg"
        footer={
          selectedTaskDetail && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {onPingStaff && selectedTaskDetail.urgency !== 'done' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Send}
                    onClick={() =>
                      onPingStaff(selectedTaskDetail.pic, selectedTaskDetail.title)
                    }
                  >
                    Nhắc việc {selectedTaskDetail.pic}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Link2}
                  onClick={() => {
                    setEditingDeliverableTask(selectedTaskDetail);
                    setDeliverableInputUrl(selectedTaskDetail.deliverableUrl || '');
                    setSelectedTaskDetail(null);
                  }}
                >
                  {selectedTaskDetail.deliverableUrl ? 'Cập nhật link nghiệm thu' : 'Đính kèm link nghiệm thu'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTaskDetail(null)}
                >
                  Đóng
                </Button>
                {selectedTaskDetail.urgency !== 'done' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => {
                      onCompleteTask(selectedTaskDetail.id);
                      setSelectedTaskDetail(null);
                    }}
                  >
                    Xác nhận hoàn thành
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedTaskDetail && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-sunken border border-line space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-ink-2">
                <span>
                  Thương hiệu: <strong className="text-ink">{selectedTaskDetail.brand}</strong>
                  {selectedTaskDetail.storeName ? ` · ${selectedTaskDetail.storeName}` : ''} · Hạng mục:{' '}
                  <strong className="text-ink">
                    {selectedTaskDetail.sowName || selectedTaskDetail.type}
                  </strong>
                </span>
                <span>
                  Nguồn:{' '}
                  <strong className="text-ink">
                    {getTaskSource(selectedTaskDetail) === 'DIRECTOR_ASSIGNED'
                      ? 'Quản lý giao'
                      : 'Luồng quy trình'}
                  </strong>
                </span>
              </div>
              <p className="text-sm text-ink">{selectedTaskDetail.description}</p>
              {selectedTaskDetail.expectedDeliverable && (
                <div className="text-xs text-ink-2 pt-1 border-t border-line">
                  Đầu ra yêu cầu: <strong className="text-ink">{selectedTaskDetail.expectedDeliverable}</strong>
                </div>
              )}
              {selectedTaskDetail.deliverableUrl && (
                <div className="pt-1">
                  <a
                    href={selectedTaskDetail.deliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium text-positive hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở tài liệu nghiệm thu: {selectedTaskDetail.deliverableUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Formula Breakdown Grid */}
            <div>
              <h4 className="text-xs font-semibold text-ink-3 mb-2">
                Chi tiết cấu thành điểm công việc
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Số lượng × Điểm chuẩn</div>
                  <div className="text-sm tabular-nums font-semibold text-ink mt-0.5">
                    {selectedTaskDetail.acceptedQuantity ?? 1} ×{' '}
                    {formatDecimal(selectedTaskDetail.standardPoint ?? 2.0, 1)} đ
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số phạm vi</div>
                  <div className="text-sm tabular-nums font-semibold text-ink mt-0.5">
                    ×{formatDecimal(selectedTaskDetail.scopeCoef ?? selectedTaskDetail.difficultyMultiplier ?? 1.0, 2)}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số độ khó</div>
                  <div className="text-sm tabular-nums font-semibold text-ink mt-0.5">
                    ×{formatDecimal(selectedTaskDetail.taskDifficultyCoef ?? 1.0, 2)}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số tiến độ (SLA)</div>
                  <div className="mt-0.5">
                    {canManageSetup && onUpdateTask ? (
                      <select
                        value={selectedTaskDetail.timelineStatus || 'ON_TIME'}
                        onChange={e => {
                          const nextStatus = e.target.value as 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED';
                          const nextCoef = TIMELINE_TABLE_5.find(t => t.status === nextStatus)?.coef ?? 1.0;
                          const qty = selectedTaskDetail.acceptedQuantity ?? 1;
                          const stdPt = selectedTaskDetail.standardPoint ?? 2.0;
                          const scopeC = selectedTaskDetail.scopeCoef ?? selectedTaskDetail.difficultyMultiplier ?? 1.0;
                          const diffC = selectedTaskDetail.taskDifficultyCoef ?? 1.0;
                          const multiC = selectedTaskDetail.multiPlatformCoef ?? 1.0;
                          const weightR = (selectedTaskDetail.contributionWeightPct ?? 100) / 100;
                          const updatedPts = roundTo(qty * stdPt * scopeC * diffC * nextCoef * multiC * weightR, 2);
                          const updatedTask: SlaTask = {
                            ...selectedTaskDetail,
                            timelineStatus: nextStatus,
                            timelineCoef: nextCoef,
                            calculatedWorkloadPoints: updatedPts,
                          };
                          setSelectedTaskDetail(updatedTask);
                          onUpdateTask(updatedTask);
                          onNotify?.(
                            `Đã cập nhật hệ số tiến độ ×${formatDecimal(nextCoef, 2)} → ${formatDecimal(updatedPts, 2)} điểm`,
                            'info'
                          );
                        }}
                        className="w-full text-xs font-semibold text-ink bg-sunken border border-line rounded px-2 py-1 focus:outline-none focus:border-accent"
                      >
                        {TIMELINE_TABLE_5.map(item => (
                          <option key={item.status} value={item.status}>
                            ×{formatDecimal(item.coef, 2)} — {item.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm tabular-nums font-semibold text-ink">
                        ×{formatDecimal(selectedTaskDetail.timelineCoef ?? 1.0, 2)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Người phụ trách (PIC)</div>
                  <div className="mt-0.5">
                    {canManageSetup && onUpdateTask ? (
                      <select
                        value={selectedTaskDetail.pic}
                        onChange={e => {
                          const nextPic = e.target.value;
                          const updatedTask: SlaTask = {
                            ...selectedTaskDetail,
                            pic: nextPic,
                          };
                          setSelectedTaskDetail(updatedTask);
                          onUpdateTask(updatedTask);
                          onNotify?.(
                            `Đã điều phối công việc "${selectedTaskDetail.title}" sang cho ${nextPic}`,
                            'success'
                          );
                        }}
                        className="w-full text-xs font-semibold text-ink bg-sunken border border-line rounded px-2 py-1 focus:outline-none focus:border-accent"
                      >
                        {allAssignableStaff.map(s => {
                          const w = staffWorkloadByName.get(s.name);
                          return (
                            <option key={s.name} value={s.name}>
                              {s.name}
                              {w ? ` (${w.level} · Tải ${w.loadPct}%)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="text-sm font-semibold text-ink truncate">
                        {selectedTaskDetail.pic}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Vai trò & Tỷ trọng</div>
                  <div className="text-sm tabular-nums font-semibold text-ink mt-0.5">
                    {ROLE_LABEL_MAP[selectedTaskDetail.assignmentRole || 'PIC_OWNER']} ({selectedTaskDetail.contributionWeightPct ?? 100}%)
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-accent/30 bg-accent-soft sm:col-span-3 flex items-center justify-between">
                  <div className="text-xs text-accent font-medium">Điểm cá nhân ghi nhận</div>
                  <div className="text-base tabular-nums font-semibold text-accent">
                    {formatDecimal(selectedTaskDetail.calculatedWorkloadPoints ?? 2.0, 2)} điểm
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Metadata if present */}
            {(selectedTaskDetail.platformScope ||
              selectedTaskDetail.originalAssetRef ||
              selectedTaskDetail.difficultyOverrideReason) && (
              <div className="p-3 rounded-lg border border-line bg-surface space-y-2 text-xs">
                <div className="font-semibold text-ink">Thông tin bổ sung</div>
                {selectedTaskDetail.platformScope && (
                  <div className="text-ink-2">
                    Phạm vi sàn / kênh: <strong className="text-ink">{selectedTaskDetail.platformScope}</strong>
                  </div>
                )}
                {selectedTaskDetail.originalAssetRef && (
                  <div className="text-ink-2">
                    Mã Asset gốc (Reup/Adapt): <strong className="text-ink">{selectedTaskDetail.originalAssetRef}</strong>
                  </div>
                )}
                {selectedTaskDetail.difficultyOverrideReason && (
                  <div className="text-ink-2">
                    Lý do điều chỉnh độ khó: <strong className="text-ink">{selectedTaskDetail.difficultyOverrideReason}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: SUBMIT DELIVERABLE LINK                                     */}
      {/* ==================================================================== */}
      <Modal
        open={!!editingDeliverableTask}
        onClose={() => setEditingDeliverableTask(null)}
        title="Đính kèm link kết quả nghiệm thu"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingDeliverableTask(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={() => {
                if (!editingDeliverableTask) return;
                const cleanUrl = deliverableInputUrl.trim();
                onUpdateTask?.({
                  ...editingDeliverableTask,
                  deliverableUrl: cleanUrl || undefined,
                });
                onNotify?.(
                  cleanUrl
                    ? `Đã lưu link nghiệm thu cho "${editingDeliverableTask.title}"`
                    : `Đã xóa link nghiệm thu của "${editingDeliverableTask.title}"`,
                  'success'
                );
                setEditingDeliverableTask(null);
              }}
            >
              Lưu đường dẫn
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Đường dẫn tài liệu nghiệm thu (Google Docs, Sheets, Drive, Lark, TikTok...)">
            <Input
              type="url"
              value={deliverableInputUrl}
              onChange={e => setDeliverableInputUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: STAFF WORKLOAD INSPECTION                                   */}
      {/* ==================================================================== */}
      <Modal
        open={!!inspectedStaffRow}
        onClose={() => setInspectingStaffMember(null)}
        title={
          inspectedStaffRow
            ? `Hồ sơ tải công việc · ${inspectedStaffRow.name} (${inspectedStaffRow.level})`
            : 'Chi tiết tải công việc'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {canManageSetup && inspectedStaffRow && !inspectedStaffRow.meetsHardRatio && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toggleManagerException(inspectedStaffRow.staffCode, inspectedStaffRow.name)
                  }
                >
                  {inspectedStaffRow.hasException
                    ? 'Gỡ xác nhận ngoại lệ'
                    : 'Duyệt ngoại lệ (Giữ hệ số ×1,00)'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {inspectedStaffRow && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    const targetName = inspectedStaffRow.name;
                    setInspectingStaffMember(null);
                    setAssignees([{ staffName: targetName, role: 'PIC_OWNER', weightPct: 100 }]);
                    setFormTaskSource('DIRECTOR_ASSIGNED');
                    setIsAssignModalOpen(true);
                  }}
                >
                  Giao việc cho {inspectedStaffRow.shortName}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInspectingStaffMember(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {inspectedStaffRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Điểm Quy trình</div>
                <div className="text-base tabular-nums font-semibold text-ink mt-0.5">
                  {formatDecimal(inspectedStaffRow.workflowPts, 1)} đ
                </div>
              </div>
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Điểm Quản lý giao</div>
                <div className="text-base tabular-nums font-semibold text-ink mt-0.5">
                  {formatDecimal(inspectedStaffRow.directorPts, 1)} đ
                </div>
              </div>
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Tỷ lệ việc khó</div>
                <div className="text-base tabular-nums font-semibold text-ink mt-0.5">
                  {formatDecimal(inspectedStaffRow.actualHardRatioPct, 1)}%{' '}
                  <span className="text-xs font-normal text-ink-3">
                    / ≥{inspectedStaffRow.requiredHardRatioPct}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-accent/30 bg-accent-soft">
                <div className="text-xs text-accent font-medium">
                  Điểm tổng kết (×{formatDecimal(inspectedStaffRow.structureCoef, 2)})
                </div>
                <div className="text-base tabular-nums font-semibold text-accent mt-0.5">
                  {formatDecimal(inspectedStaffRow.finalMonthlyWorkloadPts, 1)} đ
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink-3 mb-2">
                Danh sách công việc đang ghi nhận ({inspectedStaffRow.staffTasks.length})
              </h4>
              {inspectedStaffRow.staffTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3 border border-line rounded-lg">
                  Chưa có đầu việc phát sinh mới ngoài dữ liệu nền tháng.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inspectedStaffRow.staffTasks.map(t => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-line bg-surface flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink truncate">
                          {t.title}
                        </div>
                        <div className="text-xs text-ink-3 mt-0.5">
                          {t.brand} · {t.sowName || t.type} ·{' '}
                          {ROLE_LABEL_MAP[t.assignmentRole || 'PIC_OWNER']} ({t.contributionWeightPct ?? 100}%)
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm tabular-nums font-semibold text-ink">
                          {formatDecimal(t.calculatedWorkloadPoints ?? 2.0, 2)} đ
                        </div>
                        <div className="text-xs text-ink-3">{t.remainingText}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 4: COMPACT TASK COMPOSER (GIAO VIỆC MỚI)                       */}
      {/* ==================================================================== */}
      <Modal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Giao việc mới"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <span>Tổng điểm công việc:</span>
              <strong className="text-sm tabular-nums text-accent">
                {formatDecimal(modalFormulaPreview.totalCasePoints, 2)} điểm
              </strong>
              <span className="text-ink-3">
                ({modalFormulaPreview.qty} × {modalFormulaPreview.stdPoint}đ × HS {modalFormulaPreview.scopeCoef} × Độ khó {modalFormulaPreview.taskDiffCoef})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                disabled={!isWeightValid}
                onClick={handleSubmitNewTask}
              >
                Giao việc ({assignees.length} nhân sự)
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmitNewTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Field label="Tiêu đề công việc *">
                <Input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="VD: Nghiên cứu định vị & kế hoạch Content/Booking Q2 cho ClubClio..."
                  required
                />
              </Field>
            </div>
            <Field label="Nguồn giao việc">
              <Select
                value={formTaskSource}
                onChange={e =>
                  setFormTaskSource(
                    e.target.value as 'DIRECTOR_ASSIGNED' | 'WORKFLOW_SYSTEM'
                  )
                }
              >
                <option value="DIRECTOR_ASSIGNED">Quản lý giao</option>
                <option value="WORKFLOW_SYSTEM">Luồng quy trình (SLA)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Thương hiệu (Brand)">
              <Select
                value={formBrand}
                onChange={e => {
                  const nextBrandName = e.target.value;
                  setFormBrand(nextBrandName);
                  setFormStore('');
                  const matchedBrand = brands.find(
                    b => b.name.toLowerCase() === nextBrandName.toLowerCase()
                  );
                  const primaryBrandPic =
                    matchedBrand?.planStrategyPic ||
                    matchedBrand?.brandPicName ||
                    matchedBrand?.contentBrandMainPic;
                  if (primaryBrandPic) {
                    setAssignees(prev =>
                      prev.length === 1
                        ? [{ ...prev[0], staffName: primaryBrandPic }]
                        : [
                            { ...prev[0], staffName: primaryBrandPic },
                            ...prev.slice(1),
                          ]
                    );
                  }
                }}
              >
                {brands.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Gian hàng (Store)">
              <Select
                value={formStore}
                onChange={e => {
                  const nextStore = e.target.value;
                  setFormStore(nextStore);
                  if (nextStore) {
                    const matched = brandStores.find(s => s.storeName === nextStore);
                    if (matched) {
                      setFormStoreScopeCoef(
                        normalizeStoreCoefficient(
                          matched.difficultyTier,
                          matched.difficultyMultiplier
                        ).multiplier as 0.8 | 1.0 | 1.25 | 1.5
                      );
                      const storeOwner =
                        matched.b2cOwners?.[0] ||
                        matched.b2cOwnerName?.split(',')[0]?.trim();
                      if (storeOwner) {
                        setAssignees(prev =>
                          prev.length > 0
                            ? [{ ...prev[0], staffName: storeOwner }, ...prev.slice(1)]
                            : [{ staffName: storeOwner, role: 'PIC_OWNER', weightPct: 100 }]
                        );
                      }
                    }
                  } else {
                    setFormStoreScopeCoef(1.0);
                  }
                }}
              >
                <option value="">Toàn bộ Brand / Đa sàn</option>
                {brandStores.map(s => (
                  <option key={s.id} value={s.storeName}>
                    {s.storeName} ({s.platform} · ×{formatDecimal(normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier, 2)}
                    {s.b2cOwnerName ? ` · PIC: ${s.b2cOwnerName}` : ''})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ưu tiên & Hạn SLA (giờ)">
              <div className="flex items-center gap-2">
                <Select
                  value={formUrgency}
                  onChange={e =>
                    setFormUrgency(e.target.value as 'critical' | 'warning' | 'normal')
                  }
                >
                  <option value="critical">Khẩn cấp</option>
                  <option value="warning">Ưu tiên cao</option>
                  <option value="normal">Bình thường</option>
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={formDeadlineHours}
                  onChange={e => setFormDeadlineHours(Number(e.target.value) || 24)}
                  className="w-20 tabular-nums"
                  title="Số giờ SLA"
                />
              </div>
            </Field>
          </div>

          {/* SOW Policy & Scope Level */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <Field label="Hạng mục công việc">
                <Select
                  value={formSowStt}
                  onChange={e => {
                    const found = sowPolicies.find(s => s.stt === Number(e.target.value));
                    if (found) handleSelectSowPolicy(found);
                  }}
                >
                  {sowPolicies.map(s => (
                    <option key={s.stt} value={s.stt}>
                      #{s.stt} [{s.group}] {s.name} ({formatDecimal(s.basePoint, 1)}đ)
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="md:col-span-4">
              {selectedSowPolicy.usesResearchTable2b ? (
                <Field label="Cấp độ phạm vi">
                  <Select
                    value={activeLevelConfig?.id || ''}
                    onChange={e => {
                      const found = activeCategoryConfig.levels.find(
                        l => l.id === e.target.value
                      );
                      if (found) handleSelectFormLevel(found);
                    }}
                  >
                    {activeCategoryConfig.levels.map(lvl => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.levelCode} (×{formatDecimal(lvl.multiplier, 2)})
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Hệ số gian hàng">
                  <Select
                    value={formStoreScopeCoef}
                    onChange={e =>
                      setFormStoreScopeCoef(
                        Number(e.target.value) as 0.8 | 1.0 | 1.25 | 1.5
                      )
                    }
                  >
                    {STORE_SCOPE_TABLE_2.map(item => (
                      <option key={item.code} value={item.coef}>
                        {item.label} (×{formatDecimal(item.coef, 2)})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            <div className="md:col-span-2">
              <Field label={`SL (${selectedSowPolicy.scopeUnit})`}>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={formAcceptedQty}
                  onChange={e => setFormAcceptedQty(Math.max(1, Number(e.target.value) || 1))}
                  className="tabular-nums"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Độ khó thực tế">
              <Select
                value={formTaskDiffTier}
                onChange={e =>
                  setFormTaskDiffTier(e.target.value as 'EASY' | 'STANDARD' | 'HARD')
                }
              >
                <option value="EASY">Dễ (×0,80)</option>
                <option value="STANDARD">Tiêu chuẩn (×1,00)</option>
                <option value="HARD">Khó (×1,20)</option>
              </Select>
            </Field>

            <Field label="Đầu ra nghiệm thu">
              <Input
                value={formDeliverable}
                onChange={e => setFormDeliverable(e.target.value)}
                placeholder="File kết quả, link nghiệm thu..."
              />
            </Field>

            <Field label="Ghi chú thực thi">
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Lưu ý cho người nhận việc..."
              />
            </Field>
          </div>

          {/* PROGRESSIVE DISCLOSURE: CONDITIONAL FIELDS */}
          {(selectedSowPolicy.requiresOriginalAsset ||
            selectedSowPolicy.requiresKocStatus ||
            selectedSowPolicy.supportsMultiPlatform ||
            formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier) && (
            <div className="p-3 rounded-lg bg-warning-soft/50 border border-warning/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedSowPolicy.requiresOriginalAsset && (
                <Field label="Mã Asset gốc / Link video gốc (Reup/Adapt) *">
                  <Input
                    value={formOriginalAssetRef}
                    onChange={e => setFormOriginalAssetRef(e.target.value)}
                    placeholder="VD: VID-CLIO-089 hoặc link gốc..."
                    required
                  />
                </Field>
              )}

              {selectedSowPolicy.requiresKocStatus && (
                <Field label="Phân loại trạng thái KOC *">
                  <Select
                    value={formKocStatusType}
                    onChange={e =>
                      setFormKocStatusType(
                        e.target.value as 'NEW_KOC' | 'REBOOK' | 'FRAMEWORK_CONTRACT'
                      )
                    }
                  >
                    <option value="NEW_KOC">KOC mới — Book lần đầu (Khó)</option>
                    <option value="REBOOK">KOC Book lại (Tiêu chuẩn)</option>
                    <option value="FRAMEWORK_CONTRACT">KOC Hợp đồng nguyên tắc (Tiêu chuẩn)</option>
                  </Select>
                </Field>
              )}

              {selectedSowPolicy.supportsMultiPlatform && (
                <Field label="Số gian hàng nhân bản">
                  <Select
                    value={formMultiStoreCount}
                    onChange={e => setFormMultiStoreCount(Number(e.target.value))}
                  >
                    {MULTI_PLATFORM_TABLE_6.map(m => (
                      <option key={m.stores} value={m.stores}>
                        {m.label} — Hệ số ×{formatDecimal(m.coef, 2)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier && (
                <Field label="Lý do điều chỉnh độ khó *">
                  <Input
                    value={formDiffOverrideReason}
                    onChange={e => setFormDiffOverrideReason(e.target.value)}
                    placeholder="Ghi rõ lý do tăng/giảm độ khó..."
                    required
                  />
                </Field>
              )}
            </div>
          )}

          {/* MULTI-PIC ASSIGNMENT & WEIGHT SPLIT */}
          <div className="p-4 rounded-lg border border-line bg-sunken/40 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  Nhân sự nhận việc
                </span>
                {assignees.length > 1 && (
                  <span
                    className={`text-xs tabular-nums font-semibold ${
                      isWeightValid ? 'text-positive' : 'text-critical'
                    }`}
                  >
                    (Tổng tỷ trọng: {totalContributionWeight}%)
                  </span>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={UserPlus}
                onClick={() =>
                  setAssignees([
                    ...assignees,
                    {
                      staffName:
                        managerRadarStats.underloadedStaff[0]?.name ||
                        allAssignableStaff[assignees.length]?.name ||
                        'Lê Phương Thảo',
                      role: 'SUPPORT',
                      weightPct: 0,
                    },
                  ])
                }
              >
                Thêm người phối hợp
              </Button>
            </div>

            <div className="space-y-2">
              {assignees.map((slot, idx) => {
                const personalPts = roundTo(modalFormulaPreview.totalCasePoints * (slot.weightPct / 100), 2);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-surface p-2 rounded-lg border border-line"
                  >
                    <div className="sm:col-span-5">
                      <Select
                        value={slot.staffName}
                        onChange={e => {
                          const next = [...assignees];
                          next[idx] = { ...slot, staffName: e.target.value };
                          setAssignees(next);
                        }}
                      >
                        {allAssignableStaff.map(s => {
                          const w = staffWorkloadByName.get(s.name);
                          return (
                            <option key={s.name} value={s.name}>
                              {s.name}
                              {w
                                ? ` (${w.level} · Tải ${w.loadPct}%)`
                                : s.level
                                ? ` (${s.level})`
                                : ''}
                            </option>
                          );
                        })}
                      </Select>
                    </div>

                    <div className="sm:col-span-4">
                      <Select
                        value={slot.role}
                        onChange={e => {
                          const next = [...assignees];
                          next[idx] = {
                            ...slot,
                            role: e.target.value as TaskAssignmentRoleKey,
                          };
                          setAssignees(next);
                        }}
                      >
                        <option value="PIC_OWNER">PIC / Owner</option>
                        <option value="CO_PIC">Co-PIC</option>
                        <option value="EXECUTION">Execution</option>
                        <option value="SUPPORT">Support</option>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={slot.weightPct}
                        onChange={e => {
                          const next = [...assignees];
                          next[idx] = {
                            ...slot,
                            weightPct: Number(e.target.value) || 0,
                          };
                          setAssignees(next);
                        }}
                        className="tabular-nums px-2 text-right"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-center justify-end gap-1">
                      <span className="text-xs tabular-nums text-ink-2 hidden sm:inline">
                        {formatDecimal(personalPts, 1)}đ
                      </span>
                      {assignees.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAssignees(assignees.filter((_, i) => i !== idx))
                          }
                          className="text-ink-3 hover:text-critical p-1"
                          title="Xóa thành viên"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaskDelegationView;
