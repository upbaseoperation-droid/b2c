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
  Eye,
  Clock,
  Link2,
  ShieldCheck,
  AlertCircle,
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
  STAFF_LEVEL_TABLE_4,
  TIMELINE_TABLE_5,
  MULTI_PLATFORM_TABLE_6,
  B2C_28_STAFF_WORKLOAD_ROSTER,
  ROLE_SPLIT_PRESETS,
  CATEGORY_BADGE_STYLE,
  ROLE_BADGE_STYLE,
  ROLE_LABEL_MAP,
  DIFFICULTY_TIER_BADGE,
  STAFF_WORKLOAD_EXCEPTIONS_KEY,
  loadSavedDifficultyConfigs,
  persistDifficultyConfigs,
  loadSavedSowPolicies,
  persistSowPolicies,
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
    'GROWTH_MANAGER',
    'MEDIA_MANAGER',
    'LEADER',
  ].includes(currentUser.role);

  // Navigation & View Modes
  const [activeSubTab, setActiveSubTab] = useState<'ASSIGNMENTS' | 'WORKLOAD_MEASUREMENT'>('ASSIGNMENTS');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');
  const [isSetupViewOpen, setIsSetupViewOpen] = useState<boolean>(false);

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
  const [managerExceptions, setManagerExceptions] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { HN880: true };
    try {
      const saved = localStorage.getItem(STAFF_WORKLOAD_EXCEPTIONS_KEY);
      if (!saved) return { HN880: true };
      return JSON.parse(saved);
    } catch {
      return { HN880: true };
    }
  });

  const toggleManagerException = (staffCode: string, staffName: string) => {
    const next = { ...managerExceptions, [staffCode]: !managerExceptions[staffCode] };
    setManagerExceptions(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STAFF_WORKLOAD_EXCEPTIONS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
    }
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
  const [formAcceptedQty, setFormAcceptedQty] = useState<number>(1);
  const [formTaskDiffTier, setFormTaskDiffTier] = useState<'EASY' | 'STANDARD' | 'HARD'>('HARD');
  const [formTimelineStatus, setFormTimelineStatus] = useState<'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED'>('ON_TIME');
  const [formMultiStoreCount, setFormMultiStoreCount] = useState<number>(1);
  const [formBrand, setFormBrand] = useState<string>(brands[0]?.name || 'ClubClio');
  const [formStore, setFormStore] = useState<string>('');
  const [formPlatformsCount, setFormPlatformsCount] = useState<number>(2);
  const [formProductLinesCount, setFormProductLinesCount] = useState<number>(2);
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

  const handleAutoSuggestResearchLevel = (
    platforms: number,
    lines: number,
    withContentBooking: boolean,
    withBrandStrat: boolean
  ) => {
    setFormPlatformsCount(platforms);
    setFormProductLinesCount(lines);

    if (formCategory !== 'RESEARCH') return;
    const researchLevels = activeCategoryConfig.levels;
    let targetIdx = 0;
    if (platforms >= 3 && lines >= 2) {
      targetIdx = 4;
    } else if (withBrandStrat) {
      targetIdx = 3;
    } else if (withContentBooking) {
      targetIdx = 2;
    } else if ((platforms === 1 && lines >= 2) || (platforms === 2 && lines === 1)) {
      targetIdx = 1;
    } else {
      targetIdx = 0;
    }
    const matched = researchLevels[Math.min(targetIdx, researchLevels.length - 1)];
    if (matched) {
      handleSelectFormLevel(matched);
    }
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
    const scopeCoef = activeLevelConfig?.multiplier || 1.0;
    const taskDiffCoef = DIFFICULTY_TIER_BADGE[formTaskDiffTier].coef;
    const timelineCoef = TIMELINE_TABLE_5.find(t => t.status === formTimelineStatus)?.coef ?? 1.0;
    const multiPlatformCoef = selectedSowPolicy?.supportsMultiPlatform
      ? MULTI_PLATFORM_TABLE_6.find(m => m.stores === Math.min(4, Math.max(1, formMultiStoreCount)))?.coef ?? 1.0
      : 1.0;
    const totalCasePoints = Number(
      (qty * stdPoint * scopeCoef * taskDiffCoef * timelineCoef * multiPlatformCoef).toFixed(2)
    );
    return {
      qty,
      stdPoint,
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
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    assignees.forEach((slot, idx) => {
      const staffObj = allAssignableStaff.find(s => s.name === slot.staffName);
      const personalWorkload = Number(
        (modalFormulaPreview.totalCasePoints * (slot.weightPct / 100)).toFixed(2)
      );

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
        baseWorkloadPoints: Number((modalFormulaPreview.qty * modalFormulaPreview.stdPoint).toFixed(2)),
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

  const getTaskSource = (t: SlaTask): 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED' => {
    if (t.taskSource) return t.taskSource;
    if (t.type === 'RESEARCH_TASK' || t.taskCategory === 'RESEARCH' || t.assignedBy === 'Đặng Thị Yến Nhi') {
      return 'DIRECTOR_ASSIGNED';
    }
    return 'WORKFLOW_SYSTEM';
  };

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
    return tasks.filter(t => {
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
  }, [tasks, sourceFilter, categoryFilter, staffFilter, urgencyFilter, searchQuery]);

  // Staff workload calculation (28 members)
  const computedStaffWorkloads = useMemo(() => {
    return B2C_28_STAFF_WORKLOAD_ROSTER.map(member => {
      const staffTasks = tasks.filter(
        t => t.pic.toLowerCase() === member.name.toLowerCase()
      );

      let liveWorkflowPts = 0;
      let liveWorkflowHardPts = 0;
      let liveDirectorPts = 0;
      let liveDirectorHardPts = 0;

      staffTasks.forEach(t => {
        const pts = t.calculatedWorkloadPoints ?? 2.0;
        const isHard =
          t.taskDifficultyTier === 'HARD' ||
          (t.difficultyMultiplier && t.difficultyMultiplier >= 1.2) ||
          t.urgency === 'critical';
        const src = getTaskSource(t);
        if (src === 'DIRECTOR_ASSIGNED') {
          liveDirectorPts += pts;
          if (isHard) liveDirectorHardPts += pts;
        } else {
          liveWorkflowPts += pts;
          if (isHard) liveWorkflowHardPts += pts;
        }
      });

      const workflowPts = Number((member.baselineWorkflowTotalPts + liveWorkflowPts).toFixed(2));
      const directorPts = Number((member.baselineDirectorTotalPts + liveDirectorPts).toFixed(2));
      const rawTotalPts = Number((workflowPts + directorPts).toFixed(2));
      const hardPts = Number(
        (member.baselineWorkflowHardPts + member.baselineDirectorHardPts + liveWorkflowHardPts + liveDirectorHardPts).toFixed(2)
      );

      const levelRule =
        STAFF_LEVEL_TABLE_4.find(l => l.level === member.level) || STAFF_LEVEL_TABLE_4[3];
      const actualHardRatioPct = rawTotalPts > 0 ? Number(((hardPts / rawTotalPts) * 100).toFixed(1)) : 0;
      const meetsHardRatio = actualHardRatioPct >= levelRule.minHardRatioPct;
      const hasException = !!managerExceptions[member.staffCode];
      const structureCoef = meetsHardRatio || hasException ? 1.0 : 0.7;
      const finalMonthlyWorkloadPts = Number((rawTotalPts * structureCoef).toFixed(2));

      return {
        ...member,
        staffTasks,
        workflowPts,
        directorPts,
        rawTotalPts,
        hardPts,
        requiredHardRatioPct: levelRule.minHardRatioPct,
        actualHardRatioPct,
        meetsHardRatio,
        hasException,
        structureCoef,
        finalMonthlyWorkloadPts,
      };
    });
  }, [tasks, managerExceptions]);

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
        const matchStores = row.keyStoresSample.toLowerCase().includes(q);
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
      totalStaffFinalPts: Number(totalStaffFinalPts.toFixed(1)),
      passCount,
      totalStaffCount: computedStaffWorkloads.length,
    };
  }, [tasks, computedStaffWorkloads]);

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
  // COLUMNS FOR COMPACT TASK LIST TABLE (6 COLUMNS, NO CLUTTER)
  // ==========================================================================
  const taskColumns: Column<SlaTask>[] = [
    {
      key: 'task',
      header: 'Công việc & Hạng mục SOW',
      render: t => {
        const cat = inferCategory(t);
        const sowLabel = t.sowName || CATEGORY_LABELS[cat];
        return (
          <div className="min-w-0 max-w-[360px]">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-sunken text-ink border border-line">
                {t.brand}
              </span>
              {t.storeName && (
                <span className="text-xs text-ink-3 truncate max-w-[140px]">
                  · {t.storeName}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_BADGE_STYLE[cat]}`}>
                {sowLabel}
              </span>
            </div>
            <div className="font-medium text-ink text-sm line-clamp-1">
              {t.title}
            </div>
            {t.deliverableUrl ? (
              <a
                href={t.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-positive hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Đã nộp kết quả nghiệm thu
              </a>
            ) : (
              t.expectedDeliverable && (
                <div className="text-xs text-ink-3 line-clamp-1 mt-0.5">
                  Đầu ra: {t.expectedDeliverable}
                </div>
              )
            )}
          </div>
        );
      },
    },
    {
      key: 'source',
      header: 'Nguồn việc',
      width: 150,
      render: t => {
        const src = getTaskSource(t);
        return src === 'DIRECTOR_ASSIGNED' ? (
          <div>
            <Status tone="brand">Quản lý giao</Status>
            {t.assignedBy && (
              <div className="text-xs text-ink-3 mt-1 truncate">
                Giao bởi: {t.assignedBy}
              </div>
            )}
          </div>
        ) : (
          <div>
            <Status tone="info">Luồng quy trình</Status>
            <div className="text-xs text-ink-3 mt-1 truncate">
              {t.workflowStageLabel || 'Tự động từ SLA'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'assignee',
      header: 'Người phụ trách',
      width: 210,
      render: t => {
        const roleKey: TaskAssignmentRoleKey = t.assignmentRole || 'PIC_OWNER';
        const weight = t.contributionWeightPct ?? 100;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={t.pic} size={28} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink truncate">{t.pic}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${ROLE_BADGE_STYLE[roleKey]}`}>
                  {ROLE_LABEL_MAP[roleKey]}
                </span>
                <span className="text-xs font-mono tabular-nums text-ink-2">
                  {weight}%
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'points',
      header: 'Độ khó & Điểm',
      align: 'right',
      width: 150,
      render: t => {
        const pts = t.calculatedWorkloadPoints ?? 2.0;
        const diffTier = t.taskDifficultyTier || 'STANDARD';
        const diffInfo = DIFFICULTY_TIER_BADGE[diffTier];
        return (
          <div className="text-right">
            <div className="text-sm font-semibold font-mono tabular-nums text-ink">
              {pts.toFixed(2).replace('.', ',')} <span className="text-xs font-normal text-ink-3">điểm</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${diffInfo.cls}`}>
                {diffInfo.label}
              </span>
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
            ? 'Cần xử lý gấp'
            : 'Đang triển khai';
        return (
          <div>
            <Status tone={tone}>{statusText}</Status>
            <div className="flex items-center gap-1 text-xs text-ink-3 mt-1 font-mono tabular-nums">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{t.urgency === 'done' ? 'Hoàn thành' : t.remainingText}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: t => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="secondary"
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
              variant="ghost"
              size="sm"
              icon={Eye}
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
  type ComputedStaffRow = (typeof computedStaffWorkloads)[number];

  const workloadColumns: Column<ComputedStaffRow>[] = [
    {
      key: 'staff',
      header: 'Nhân sự & Cấp bậc',
      render: row => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size={32} />
          <div>
            <div className="font-medium text-ink text-sm flex items-center gap-1.5">
              <span>{row.name}</span>
              <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-sunken text-ink-2 border border-line">
                {row.level}
              </span>
            </div>
            <div className="text-xs text-ink-3 mt-0.5">
              {row.staffCode} · {row.roleGroup}
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
            {row.assignedStoresCount} gian hàng phụ trách
          </div>
          <div className="text-xs text-ink-3 truncate mt-0.5" title={row.keyStoresSample}>
            {row.keyStoresSample}
          </div>
        </div>
      ),
    },
    {
      key: 'workflowPts',
      header: 'Điểm Quy trình',
      align: 'right',
      width: 130,
      render: row => (
        <div className="font-mono tabular-nums text-sm text-ink">
          {row.workflowPts.toFixed(1).replace('.', ',')}
        </div>
      ),
    },
    {
      key: 'directorPts',
      header: 'Điểm Quản lý giao',
      align: 'right',
      width: 140,
      render: row => (
        <div className="font-mono tabular-nums text-sm font-medium text-accent">
          {row.directorPts.toFixed(1).replace('.', ',')}
        </div>
      ),
    },
    {
      key: 'hardRatio',
      header: 'Tỷ lệ việc khó (Bảng 4)',
      width: 210,
      render: row => (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono tabular-nums font-medium text-ink">
              Thực tế: {row.actualHardRatioPct.toFixed(1).replace('.', ',')}%
            </span>
            <span className="text-ink-3 font-mono tabular-nums">
              Chuẩn {row.level}: ≥{row.requiredHardRatioPct}%
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
      header: 'Hệ số & Tổng điểm',
      align: 'right',
      width: 170,
      render: row => (
        <div className="text-right">
          <div className="text-sm font-semibold font-mono tabular-nums text-ink">
            {row.finalMonthlyWorkloadPts.toFixed(1).replace('.', ',')} <span className="text-xs font-normal text-ink-3">điểm</span>
          </div>
          <div className="mt-0.5">
            {row.meetsHardRatio ? (
              <Status tone="positive">Đạt chuẩn ×1,00</Status>
            ) : row.hasException ? (
              <Status tone="info">Ngoại lệ ×1,00</Status>
            ) : (
              <Status tone="warning">Thiếu việc khó ×0,70</Status>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: row => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          {canManageSetup && !row.meetsHardRatio && (
            <Button
              variant={row.hasException ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleManagerException(row.staffCode, row.name)}
            >
              {row.hasException ? 'Gỡ ngoại lệ' : 'Duyệt ×1,00'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
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
          value={metrics.totalStaffFinalPts.toLocaleString('vi-VN')}
          tone={metrics.criticalOpenCount > 0 ? 'warning' : 'positive'}
          icon={BarChart3}
        />
      </StatRow>

      {/* 2. TOP NAVIGATION & ACTION BAR */}
      <div className="bg-surface border border-line rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            {
              key: 'ASSIGNMENTS',
              label: 'Bảng điều phối công việc',
              count: filteredTasks.length,
            },
            {
              key: 'WORKLOAD_MEASUREMENT',
              label: 'Tải công việc nhân sự',
              count: computedStaffWorkloads.length,
            },
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

          <Button
            variant="secondary"
            size="sm"
            icon={Sliders}
            onClick={() => setIsSetupViewOpen(true)}
          >
            Cấu hình định mức
          </Button>

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
                placeholder: 'Tìm tên công việc, thương hiệu, nhân sự PIC, hạng mục SOW...',
              }}
              chips={
                <Chips
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  items={[
                    { key: 'ALL', label: 'Tất cả nguồn', count: tasks.length },
                    {
                      key: 'WORKFLOW_SYSTEM',
                      label: 'Luồng quy trình',
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
                    className="w-40"
                  >
                    <option value="ALL">Mọi nhóm SOW</option>
                    <option value="RESEARCH">Nghiên cứu (Research)</option>
                    <option value="BOOKING">Booking KOC</option>
                    <option value="CONTENT">Nội dung & Video</option>
                    <option value="KEY_VISUAL">Key Visual</option>
                    <option value="CAMPAIGN">Chiến dịch</option>
                    <option value="LIVESTREAM">Livestream</option>
                  </Select>

                  <Select
                    value={staffFilter}
                    onChange={e => setStaffFilter(e.target.value)}
                    className="w-44"
                  >
                    <option value="ALL">Tất cả nhân sự PIC</option>
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
                  className="bg-sunken/60 border border-line rounded-lg flex flex-col max-h-[680px]"
                >
                  <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between bg-surface rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Status tone={col.tone}>{col.title}</Status>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-ink-2 px-2 py-0.5 rounded bg-sunken">
                      {col.items.length}
                    </span>
                  </div>

                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                    {col.items.length === 0 ? (
                      <div className="py-10 text-center text-xs text-ink-3">
                        Không có công việc trong cột này
                      </div>
                    ) : (
                      col.items.map(t => {
                        const cat = inferCategory(t);
                        const pts = t.calculatedWorkloadPoints ?? 2.0;
                        const roleKey: TaskAssignmentRoleKey = t.assignmentRole || 'PIC_OWNER';
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskDetail(t)}
                            className="bg-surface border border-line hover:border-line-strong rounded-lg p-3.5 cursor-pointer transition space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-sunken text-ink border border-line">
                                  {t.brand}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_BADGE_STYLE[cat]}`}>
                                  {t.sowName || CATEGORY_LABELS[cat]}
                                </span>
                              </div>
                              <span className="text-xs font-mono tabular-nums font-semibold text-accent">
                                {pts.toFixed(2).replace('.', ',')} đ
                              </span>
                            </div>

                            <div className="text-sm font-medium text-ink line-clamp-2">
                              {t.title}
                            </div>

                            {t.deliverableUrl && (
                              <a
                                href={t.deliverableUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-positive hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Xem file nghiệm thu
                              </a>
                            )}

                            <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={t.pic} size={24} />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-ink truncate">
                                    {t.pic}
                                  </div>
                                  <div className="text-xs text-ink-3">
                                    {ROLE_LABEL_MAP[roleKey]} ({t.contributionWeightPct ?? 100}%)
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1"
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
                                  Link
                                </Button>
                                {t.urgency !== 'done' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={Check}
                                    onClick={() => onCompleteTask(t.id)}
                                  >
                                    Xong
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
                    { key: 'L3', label: 'L3 (≥50% việc khó)' },
                    { key: 'L2', label: 'L2 (≥30% việc khó)' },
                    { key: 'L1', label: 'L1 (≥15% việc khó)' },
                    { key: 'L0.5', label: 'L0.5 (0%)' },
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
                  <option value="ALL">Mọi trạng thái Bảng 4</option>
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
      {/* MODAL 1: TASK DETAIL & FORMULA BREAKDOWN (PROGRESSIVE DISCLOSURE)    */}
      {/* ==================================================================== */}
      <Modal
        open={!!selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        title={selectedTaskDetail?.title || 'Chi tiết công việc'}
        description={
          selectedTaskDetail
            ? `${selectedTaskDetail.brand}${selectedTaskDetail.storeName ? ` · ${selectedTaskDetail.storeName}` : ''} · Giao bởi ${selectedTaskDetail.assignedBy || 'Hệ thống'}`
            : ''
        }
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
            <div className="p-3.5 rounded-lg bg-sunken border border-line space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-medium text-ink-2">
                  Hạng mục chuẩn SOW (Bảng 1):{' '}
                  <strong className="text-ink">
                    {selectedTaskDetail.sowName || selectedTaskDetail.type}
                  </strong>
                </span>
                <Status
                  tone={
                    getTaskSource(selectedTaskDetail) === 'DIRECTOR_ASSIGNED'
                      ? 'brand'
                      : 'info'
                  }
                >
                  {getTaskSource(selectedTaskDetail) === 'DIRECTOR_ASSIGNED'
                    ? 'Quản lý giao'
                    : 'Luồng quy trình'}
                </Status>
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
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-positive hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở tài liệu nghiệm thu: {selectedTaskDetail.deliverableUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Formula Breakdown Grid */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                Chi tiết cấu thành điểm công việc (Bảng 1 → Bảng 6)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Số lượng × Điểm chuẩn</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink mt-0.5">
                    {selectedTaskDetail.acceptedQuantity ?? 1} ×{' '}
                    {(selectedTaskDetail.standardPoint ?? 2.0).toFixed(1).replace('.', ',')} đ
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số phạm vi (Bảng 2/2b)</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink mt-0.5">
                    ×{(selectedTaskDetail.scopeCoef ?? selectedTaskDetail.difficultyMultiplier ?? 1.0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số độ khó (Bảng 3)</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink mt-0.5">
                    ×{(selectedTaskDetail.taskDifficultyCoef ?? 1.0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Hệ số SLA (Bảng 5)</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink mt-0.5">
                    ×{(selectedTaskDetail.timelineCoef ?? 1.0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface">
                  <div className="text-xs text-ink-3">Vai trò & Tỷ trọng</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink mt-0.5">
                    {ROLE_LABEL_MAP[selectedTaskDetail.assignmentRole || 'PIC_OWNER']} ({selectedTaskDetail.contributionWeightPct ?? 100}%)
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-accent/30 bg-accent-soft">
                  <div className="text-xs text-accent font-medium">Điểm cá nhân ghi nhận</div>
                  <div className="text-base font-mono tabular-nums font-semibold text-accent mt-0.5">
                    {(selectedTaskDetail.calculatedWorkloadPoints ?? 2.0).toFixed(2).replace('.', ',')} điểm
                  </div>
                </div>
              </div>
            </div>

            {/* Bảng 7 Governance Metadata if present */}
            {(selectedTaskDetail.platformScope ||
              selectedTaskDetail.originalAssetRef ||
              selectedTaskDetail.difficultyOverrideReason) && (
              <div className="p-3 rounded-lg border border-line bg-surface space-y-1.5 text-xs">
                <div className="font-semibold text-ink">Thông tin đối soát Bảng 7</div>
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
        description={editingDeliverableTask?.title}
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
          <Field
            label="Đường dẫn tài liệu nghiệm thu (Google Docs, Sheets, Drive, Lark, TikTok...)"
            hint={
              editingDeliverableTask?.expectedDeliverable
                ? `Đầu ra yêu cầu: ${editingDeliverableTask.expectedDeliverable}`
                : 'Dán đường dẫn đầy đủ bắt đầu bằng https://'
            }
          >
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
        description={
          inspectedStaffRow
            ? `Mã NV: ${inspectedStaffRow.staffCode} · ${inspectedStaffRow.roleGroup} · Phụ trách ${inspectedStaffRow.assignedStoresCount} gian hàng (${inspectedStaffRow.keyStoresSample})`
            : ''
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {canManageSetup && inspectedStaffRow && !inspectedStaffRow.meetsHardRatio && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toggleManagerException(inspectedStaffRow.staffCode, inspectedStaffRow.name)
                  }
                >
                  {inspectedStaffRow.hasException
                    ? 'Gỡ xác nhận ngoại lệ Bảng 4'
                    : 'Xác nhận ngoại lệ Bảng 4 (Giữ hệ số ×1,00)'}
                </Button>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInspectingStaffMember(null)}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {inspectedStaffRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Điểm Quy trình</div>
                <div className="text-base font-mono tabular-nums font-semibold text-ink mt-0.5">
                  {inspectedStaffRow.workflowPts.toFixed(1).replace('.', ',')} đ
                </div>
              </div>
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Điểm Quản lý giao</div>
                <div className="text-base font-mono tabular-nums font-semibold text-accent mt-0.5">
                  {inspectedStaffRow.directorPts.toFixed(1).replace('.', ',')} đ
                </div>
              </div>
              <div className="p-3 rounded-lg border border-line bg-sunken">
                <div className="text-xs text-ink-3">Tỷ lệ việc khó (Bảng 4)</div>
                <div className="text-base font-mono tabular-nums font-semibold text-ink mt-0.5">
                  {inspectedStaffRow.actualHardRatioPct.toFixed(1).replace('.', ',')}%{' '}
                  <span className="text-xs font-normal text-ink-3">
                    / ≥{inspectedStaffRow.requiredHardRatioPct}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-accent/30 bg-accent-soft">
                <div className="text-xs text-accent font-medium">
                  Điểm tổng kết (×{inspectedStaffRow.structureCoef.toFixed(2).replace('.', ',')})
                </div>
                <div className="text-base font-mono tabular-nums font-semibold text-accent mt-0.5">
                  {inspectedStaffRow.finalMonthlyWorkloadPts.toFixed(1).replace('.', ',')} đ
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                Danh sách công việc đang ghi nhận trên hệ thống ({inspectedStaffRow.staffTasks.length})
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
                        <div className="text-sm font-mono tabular-nums font-semibold text-accent">
                          {(t.calculatedWorkloadPoints ?? 2.0).toFixed(2).replace('.', ',')} đ
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
      {/* MODAL 4: MODERN TASK COMPOSER (GIAO VIỆC MỚI)                        */}
      {/* ==================================================================== */}
      <Modal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Giao việc mới & Phân bổ điểm công việc"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <span>Tổng điểm công việc:</span>
              <strong className="text-sm font-mono tabular-nums text-accent">
                {modalFormulaPreview.totalCasePoints.toFixed(2).replace('.', ',')} điểm
              </strong>
              <span className="text-ink-3">
                ({modalFormulaPreview.qty} × {modalFormulaPreview.stdPoint}đ × HS phạm vi {modalFormulaPreview.scopeCoef} × HS độ khó {modalFormulaPreview.taskDiffCoef})
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
        <form onSubmit={handleSubmitNewTask} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN (7 COLS): TASK DETAILS & SOW SELECTION */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-sunken border border-line">
              <span className="text-xs font-medium text-ink-2">Phân loại nguồn việc:</span>
              <Segmented
                value={formTaskSource}
                onChange={setFormTaskSource}
                items={[
                  { key: 'DIRECTOR_ASSIGNED', label: 'Quản lý / Giám đốc giao' },
                  { key: 'WORKFLOW_SYSTEM', label: 'Luồng quy trình (SLA)' },
                ]}
              />
            </div>

            <Field label="Tiêu đề công việc cần giao *">
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="VD: Nghiên cứu định vị & kế hoạch Content/Booking Q2 cho ClubClio..."
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Thương hiệu (Brand)">
                <Select
                  value={formBrand}
                  onChange={e => {
                    setFormBrand(e.target.value);
                    setFormStore('');
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
                  onChange={e => setFormStore(e.target.value)}
                >
                  <option value="">Toàn bộ Brand / Đa sàn</option>
                  {brandStores.map(s => (
                    <option key={s.id} value={s.storeName}>
                      {s.storeName} ({s.platform})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Mức độ ưu tiên & Hạn SLA">
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
                    className="w-20 font-mono tabular-nums"
                    title="Số giờ SLA"
                  />
                </div>
              </Field>
            </div>

            {/* SOW Policy Selection (Bảng 1) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <Field
                  label="Hạng mục công việc chuẩn SOW (Bảng 1 — 33 đầu việc)"
                >
                  <Select
                    value={formSowStt}
                    onChange={e => {
                      const found = sowPolicies.find(s => s.stt === Number(e.target.value));
                      if (found) handleSelectSowPolicy(found);
                    }}
                  >
                    {sowPolicies.map(s => (
                      <option key={s.stt} value={s.stt}>
                        #{s.stt} [{s.group}] {s.name} — {s.basePoint.toFixed(1).replace('.', ',')} điểm/{s.scopeUnit}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label={`Số lượng (${selectedSowPolicy.scopeUnit})`}>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={formAcceptedQty}
                  onChange={e => setFormAcceptedQty(Math.max(1, Number(e.target.value) || 1))}
                  className="font-mono tabular-nums"
                />
              </Field>
            </div>

            {/* Scope Level Cards (Bảng 2b) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink-2">
                  Cấp độ phạm vi công việc (Bảng 2b — {activeCategoryConfig.categoryName})
                </label>
                {formCategory === 'RESEARCH' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-ink-3">Gợi ý nhanh:</span>
                    <button
                      type="button"
                      onClick={() => handleAutoSuggestResearchLevel(1, 1, false, false)}
                      className="px-2 py-0.5 rounded bg-sunken hover:bg-line text-ink-2"
                    >
                      1 sàn · 1 line
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoSuggestResearchLevel(2, 2, true, false)}
                      className="px-2 py-0.5 rounded bg-sunken hover:bg-line text-ink-2"
                    >
                      2 sàn + Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoSuggestResearchLevel(3, 3, true, true)}
                      className="px-2 py-0.5 rounded bg-sunken hover:bg-line text-ink-2"
                    >
                      Đa sàn tổng thể
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeCategoryConfig.levels.map(lvl => {
                  const selected = lvl.id === activeLevelConfig?.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleSelectFormLevel(lvl)}
                      className={`text-left p-2.5 rounded-lg border transition ${
                        selected
                          ? 'border-accent bg-accent-soft/60'
                          : 'border-line bg-surface hover:bg-sunken/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">
                          {lvl.levelCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-mono tabular-nums font-semibold bg-surface border border-line text-accent">
                          ×{lvl.multiplier.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="text-xs text-ink-3 line-clamp-1 mt-1">
                        {lvl.scopeDescription}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Tier (Bảng 3) & Timeline (Bảng 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Độ khó thực tế (Bảng 3)">
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

              <Field label="Đánh giá tiến độ SLA (Bảng 5)">
                <Select
                  value={formTimelineStatus}
                  onChange={e =>
                    setFormTimelineStatus(
                      e.target.value as 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED'
                    )
                  }
                >
                  {TIMELINE_TABLE_5.map(t => (
                    <option key={t.status} value={t.status}>
                      {t.label} (×{t.coef.toFixed(2).replace('.', ',')})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* PROGRESSIVE DISCLOSURE: CONDITIONAL BẢNG 7 FIELDS */}
            {(selectedSowPolicy.requiresOriginalAsset ||
              selectedSowPolicy.requiresKocStatus ||
              selectedSowPolicy.supportsMultiPlatform ||
              formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier) && (
              <div className="p-3.5 rounded-lg bg-warning-soft/50 border border-warning/30 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Thông tin đối soát bắt buộc theo Bảng 7</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <Field label="Số gian hàng nhân bản (Bảng 6)">
                      <Select
                        value={formMultiStoreCount}
                        onChange={e => setFormMultiStoreCount(Number(e.target.value))}
                      >
                        {MULTI_PLATFORM_TABLE_6.map(m => (
                          <option key={m.stores} value={m.stores}>
                            {m.label} — Hệ số ×{m.coef.toFixed(2).replace('.', ',')}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier && (
                    <Field label="Lý do điều chỉnh độ khó khác mặc định Bảng 1 *">
                      <Input
                        value={formDiffOverrideReason}
                        onChange={e => setFormDiffOverrideReason(e.target.value)}
                        placeholder="Ghi rõ lý do tăng/giảm độ khó..."
                        required
                      />
                    </Field>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Đầu ra nghiệm thu kỳ vọng">
                <Input
                  value={formDeliverable}
                  onChange={e => setFormDeliverable(e.target.value)}
                  placeholder="File kết quả, link nghiệm thu..."
                />
              </Field>
              <Field label="Ghi chú hướng dẫn thực thi">
                <Input
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Lưu ý thêm cho nhóm phụ trách..."
                />
              </Field>
            </div>
          </div>

          {/* RIGHT COLUMN (5 COLS): MULTI-PIC ASSIGNMENT & WEIGHT SPLIT */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-lg border border-line bg-sunken/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-ink">
                    Phân bổ nhân sự & Tỷ trọng
                  </h4>
                </div>
                <Status tone={isWeightValid ? 'positive' : 'critical'}>
                  Tổng: {totalContributionWeight}%
                </Status>
              </div>

              {/* Preset Split Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {ROLE_SPLIT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applySplitPreset(preset.id)}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-surface border border-line hover:border-accent hover:text-accent transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Assignee Slots */}
              <div className="space-y-2.5">
                {assignees.map((slot, idx) => {
                  const personalPts = Number(
                    (modalFormulaPreview.totalCasePoints * (slot.weightPct / 100)).toFixed(2)
                  );
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface border border-line space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink-2">
                          Thành viên #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono tabular-nums font-semibold text-accent">
                            +{personalPts.toFixed(2).replace('.', ',')} điểm
                          </span>
                          {assignees.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setAssignees(assignees.filter((_, i) => i !== idx))
                              }
                              className="text-ink-3 hover:text-critical"
                              title="Xóa thành viên"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-6">
                          <Select
                            value={slot.staffName}
                            onChange={e => {
                              const next = [...assignees];
                              next[idx] = { ...slot, staffName: e.target.value };
                              setAssignees(next);
                            }}
                          >
                            {allAssignableStaff.map(s => (
                              <option key={s.name} value={s.name}>
                                {s.name} {s.level ? `(${s.level})` : ''}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="col-span-4">
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

                        <div className="col-span-2">
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
                            className="font-mono tabular-nums px-2 text-right"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={UserPlus}
                onClick={() =>
                  setAssignees([
                    ...assignees,
                    {
                      staffName: allAssignableStaff[assignees.length]?.name || 'Lê Phương Thảo',
                      role: 'SUPPORT',
                      weightPct: 0,
                    },
                  ])
                }
              >
                Thêm nhân sự phối hợp
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaskDelegationView;
