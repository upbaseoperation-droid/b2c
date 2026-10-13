'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Avatar, Presence } from '../ui';
import {
  Video,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Play,
  ExternalLink,
  Download,
  FileText,
  Check,
  Eye,
  User,
  Star,
  Calendar,
  ArrowRight,
  Layers,
  Tag,
  CheckCheck,
  Send,
  Building2,
  Wallet,
  MessageSquare,
  Users,
  Package,
  Truck,
  ShieldCheck,
  FolderOpen,
  QrCode,
  Sparkles,
  FileCheck2,
  Link2
} from 'lucide-react';
import {
  BrandChannelAllocation,
  Contributor,
  SelfChannelVideoTask,
  VideoTaskStatus,
  SampleShippingStatus,
  BrandApprovalMode,
  UserProfile,
  BrandDetail
} from '../../lib/types';
import {
  DEFAULT_CONTENT_PILLARS,
  MOCK_BRAND_ALLOCATION,
  MULTI_BRAND_ALLOCATIONS,
  INITIAL_CONTRIBUTORS,
  INITIAL_SELF_CHANNEL_TASKS,
  SELF_CHANNEL_PARTNERSHIP_LEADER,
  SELF_CHANNEL_CONTENT_MEMBERS
} from '../../lib/selfChannelData';

export interface SelfChannelCtvHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  contributors?: Contributor[];
  tasks?: SelfChannelVideoTask[];
  onTasksChange?: (tasks: SelfChannelVideoTask[]) => void;
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  onOpenCtvProfile?: (ctvId?: string) => void;
  onOpenInputPlan?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenPushProducts?: () => void;
  onNavigateToBrand?: () => void;
}

const REFERENCE_TODAY = new Date('2026-10-14T00:00:00');

function getDaysUntilDeadline(deadlineStr?: string): number {
  if (!deadlineStr) return 10;
  const target = new Date(deadlineStr + 'T00:00:00');
  if (isNaN(target.getTime())) return 10;
  const diffMs = target.getTime() - REFERENCE_TODAY.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isCtvLegalReady(ctv?: Contributor): { ready: boolean; missingReason?: string } {
  if (!ctv) return { ready: false, missingReason: 'Chưa gắn hồ sơ CTV' };
  const hasCccd = Boolean(ctv.cccd && ctv.cccd.trim().length >= 9);
  const hasActiveContract = ctv.contractStatus === 'ACTIVE';
  if (!hasCccd && !hasActiveContract) {
    return { ready: false, missingReason: 'Thiếu CCCD & Chưa ký HĐ CTV' };
  }
  if (!hasCccd) {
    return { ready: false, missingReason: 'Thiếu số CCCD / Mã số thuế' };
  }
  if (!hasActiveContract) {
    return { ready: false, missingReason: 'Hợp đồng CTV chờ ký / hết hạn' };
  }
  return { ready: true };
}

export const SelfChannelCtvHubView: React.FC<SelfChannelCtvHubViewProps> = ({
  currentUser,
  contributors: propContributors,
  tasks: propTasks,
  onTasksChange,
  onContributorCreated,
  onContributorUpdated,
  onOpenCtvProfile,
  onOpenInputPlan,
  onNotify,
  onOpenPushProducts,
  onNavigateToBrand
}) => {
  // Master State (Sync with parent page.tsx when provided)
  const [allocation] = useState<BrandChannelAllocation>(MOCK_BRAND_ALLOCATION);
  const [localTasks, setLocalTasks] = useState<SelfChannelVideoTask[]>(propTasks || INITIAL_SELF_CHANNEL_TASKS);
  const [syncedPropTasks, setSyncedPropTasks] = useState(propTasks);
  if (propTasks && propTasks !== syncedPropTasks) {
    setSyncedPropTasks(propTasks);
    setLocalTasks(propTasks);
  }

  const [localContributors, setLocalContributors] = useState<Contributor[]>(propContributors || INITIAL_CONTRIBUTORS);
  const [syncedPropContributors, setSyncedPropContributors] = useState(propContributors);
  if (propContributors && propContributors !== syncedPropContributors) {
    setSyncedPropContributors(propContributors);
    setLocalContributors(propContributors);
  }

  const tasks = localTasks;
  const contributors = localContributors;

  const updateTasks = (updater: (prev: SelfChannelVideoTask[]) => SelfChannelVideoTask[]) => {
    setLocalTasks(prev => {
      const next = updater(prev);
      onTasksChange?.(next);
      return next;
    });
  };

  const idCounterRef = useRef(1050);

  // Tab State: 'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'CONTRIBUTORS' | 'DISCUSSION' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'CONTRIBUTORS' | 'DISCUSSION' | 'HISTORY'>('OVERVIEW');
  const [isCtvSimulatorView, setIsCtvSimulatorView] = useState(false);

  // Discussion Chat State
  const [ctvChatMessages, setCtvChatMessages] = useState<Array<{ id: string; sender: 'CTV' | 'UPBASE_LEAD'; senderName: string; time: string; content: string }>>([
    {
      id: 'cmsg-1',
      sender: 'UPBASE_LEAD',
      senderName: 'Việt Hoàng (Leader Partnership & Self-Channel)',
      time: 'Hôm qua lúc 10:15',
      content: 'Chào các bạn CTV/VJ và đội ngũ Content tháng 10! Mình đã chốt xong danh sách CTV cho Kutieskin & Senka theo đề bài của Quỳnh Như và Mai Anh. Với các đơn gấp dưới 5 ngày, mình ưu tiên giao các bạn VJ đang cầm sẵn mẫu tại nhà nhé!'
    },
    {
      id: 'cmsg-2',
      sender: 'CTV',
      senderName: 'Nguyễn Hoàng Yến (VJ Mẹ & Bé)',
      time: 'Hôm qua lúc 14:30',
      content: 'Chào anh Việt Hoàng và Quỳnh Như ơi, mình đã có sẵn tuýp KUTIE-SOOTH-30G ở nhà và quay xong clip nháp theo kịch bản Như duyệt rồi. Mình vừa gắn link Drive trên mục Cần duyệt nhé!'
    },
    {
      id: 'cmsg-3',
      sender: 'UPBASE_LEAD',
      senderName: 'Quỳnh Như (Chuyên viên Content Self-Channel)',
      time: 'Sáng nay lúc 08:45',
      content: 'Em đã kiểm tra QA nội bộ video của chị Yến đạt 4/4 tiêu chí và tải file sạch lên Drive tổng gian hàng Kutieskin rồi ạ. Nhờ anh Việt Hoàng trình Brand nghiệm thu và đưa vào bảng kê DNTT đợt này nhé!'
    }
  ]);
  const [newCtvChatText, setNewCtvChatText] = useState('');

  // Helper: notify
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  const handleSendCtvChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCtvChatText.trim()) return;

    setCtvChatMessages(prev => [
      ...prev,
      {
        id: `cmsg-${Date.now()}`,
        sender: 'CTV',
        senderName: currentUser?.name || 'Cộng Tác Viên',
        time: 'Vừa xong',
        content: newCtvChatText.trim()
      }
    ]);
    setNewCtvChatText('');
    notify('Đã gửi tin nhắn đến nhóm sản xuất Video B2C!');
  };

  // Brand Selection State for Manager & Multi-Brand Staff
  const isCtvPartner = currentUser?.role === 'CTV_PARTNER';
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'LEADER';

  const userAssignedBrands = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.assignedBrands && currentUser.assignedBrands.length > 0) {
      return currentUser.assignedBrands;
    }
    if (currentUser.linkedEntityName) {
      return currentUser.linkedEntityName.split(',').map(s => s.trim());
    }
    return [];
  }, [currentUser]);

  const availableAllocations = useMemo(() => {
    if (isManagerOrAdmin) {
      return MULTI_BRAND_ALLOCATIONS;
    }
    if (userAssignedBrands.length > 0) {
      return MULTI_BRAND_ALLOCATIONS.filter(a =>
        userAssignedBrands.some(ub => a.brandName.toLowerCase().includes(ub.toLowerCase()) || a.brandId.toLowerCase().includes(ub.toLowerCase()))
      );
    }
    return MULTI_BRAND_ALLOCATIONS;
  }, [isManagerOrAdmin, userAssignedBrands]);

  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');

  const activeAllocation = useMemo<BrandChannelAllocation>(() => {
    if (selectedBrandId === 'ALL') {
      const totalBudget = availableAllocations.reduce((sum, a) => sum + a.totalBudget, 0);
      const budgetAffiliate = availableAllocations.reduce((sum, a) => sum + a.budgetAffiliate, 0);
      const targetAffiliateVideos = availableAllocations.reduce((sum, a) => sum + a.targetAffiliateVideos, 0);
      const targetAffiliateGmv = availableAllocations.reduce((sum, a) => sum + a.targetAffiliateGmv, 0);
      const budgetSelfChannel = availableAllocations.reduce((sum, a) => sum + a.budgetSelfChannel, 0);
      const targetSelfChannelVideos = availableAllocations.reduce((sum, a) => sum + a.targetSelfChannelVideos, 0);
      const allPillars = availableAllocations.flatMap(a => a.pillars);

      return {
        brandId: 'ALL',
        brandName: 'Toàn bộ nhãn hàng',
        totalBudget,
        budgetAffiliate,
        targetAffiliateVideos,
        targetAffiliateGmv,
        affiliateNotes: 'Tổng ngân sách Affiliate ngoại sàn toàn bộ các brand phụ trách.',
        budgetSelfChannel,
        targetSelfChannelVideos,
        selfChannelNotes: 'Tổng ngân sách sản xuất video kênh chính chủ toàn bộ các brand.',
        pillars: allPillars
      };
    }
    return availableAllocations.find(a => a.brandId === selectedBrandId) || availableAllocations[0] || MOCK_BRAND_ALLOCATION;
  }, [selectedBrandId, availableAllocations]);

  // Filter States
  const [selectedPillarId, setSelectedPillarId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSampleFilter, setSelectedSampleFilter] = useState<string>('ALL');
  const [selectedContentPic, setSelectedContentPic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active CTV Simulator State
  const [simulatedCtvId, setSimulatedCtvId] = useState<string>(INITIAL_CONTRIBUTORS[0].id);

  // Modal States
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isSyncPlanModalOpen, setIsSyncPlanModalOpen] = useState(false);
  const [isScriptReviewModalOpen, setIsScriptReviewModalOpen] = useState(false);
  const [isVideoQaModalOpen, setIsVideoQaModalOpen] = useState(false);
  const [isBrandAcceptModalOpen, setIsBrandAcceptModalOpen] = useState(false);
  const [isSampleShippingModalOpen, setIsSampleShippingModalOpen] = useState(false);
  const [isCtvSubmitModalOpen, setIsCtvSubmitModalOpen] = useState(false);
  const [ctvSubmitType, setCtvSubmitType] = useState<'SCRIPT' | 'VIDEO'>('SCRIPT');
  const [isDnttModalOpen, setIsDnttModalOpen] = useState(false);
  const [dnttTargetCtv, setDnttTargetCtv] = useState<Contributor | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelfChannelVideoTask | null>(null);

  // Form: Create / Assign Task
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    brandId: 'brand-kutieskin',
    pillarId: DEFAULT_CONTENT_PILLARS[0].id,
    videoFormat: 'Review voice',
    linkedSku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    remuneration: 1500000,
    deadline: '2026-10-22',
    contributorId: '',
    contentPic: 'Quỳnh Như',
    partnershipPic: 'Việt Hoàng',
    brandApprovalMode: 'BRAND_REVIEW_REQUIRED' as BrandApprovalMode,
    sampleShippingStatus: 'PENDING_SHIP' as SampleShippingStatus,
    briefNotes: ''
  });

  // Form: Sync from Monthly Plan
  const [syncPlanBrandId, setSyncPlanBrandId] = useState<string>('brand-kutieskin');
  const [syncBatchQty, setSyncBatchQty] = useState<number>(3);
  const [syncVideoFormat, setSyncVideoFormat] = useState<string>('Review voice');

  // Form: Script Review & Feedback
  const [scriptFeedbackText, setScriptFeedbackText] = useState('');
  const [scriptVerdict, setScriptVerdict] = useState<'APPROVED' | 'REVISE'>('APPROVED');

  // Form: Video QA (Stage 1: Internal Content QA)
  const [videoFeedbackText, setVideoFeedbackText] = useState('');
  const [videoVerdict, setVideoVerdict] = useState<'APPROVED' | 'REVISE'>('APPROVED');
  const [storeDriveFolderInput, setStoreDriveFolderInput] = useState('https://drive.google.com/drive/folders/store-kutieskin-tts-oct2026');
  const [videoChecklist, setVideoChecklist] = useState({
    hookCompliant: true,
    productAppearance: true,
    audioClear: true,
    guidelinesFollowed: true
  });

  // Form: Brand Acceptance & Channel Airing (Stage 2)
  const [brandAcceptVerdict, setBrandAcceptVerdict] = useState<'APPROVED' | 'REVISE'>('APPROVED');
  const [publishedChannelUrlInput, setPublishedChannelUrlInput] = useState('');
  const [brandAcceptComment, setBrandAcceptComment] = useState('');

  // Form: Sample Shipping Update (48h SLA)
  const [sampleForm, setSampleForm] = useState<{
    status: SampleShippingStatus;
    trackingCode: string;
  }>({
    status: 'SHIPPING',
    trackingCode: ''
  });

  // Form: CTV Simulator Submission (Script or Draft Video)
  const [ctvScriptForm, setCtvScriptForm] = useState({
    hook: '',
    body: '',
    cta: ''
  });
  const [ctvVideoForm, setCtvVideoForm] = useState({
    draftVideoUrl: '',
    durationSeconds: 45,
    captionSuggested: ''
  });

  // Helper: Format VND
  const formatVnd = (num: number) => {
    return (num || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Helper: Format Date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Kiểm tra đơn gấp < 5 ngày và tồn kho mẫu tại nhà VJ khi tạo/giao task
  const createTaskUrgencyCheck = useMemo(() => {
    const daysLeft = getDaysUntilDeadline(newTaskForm.deadline);
    const isUrgentUnder5Days = daysLeft < 5;
    const selectedCtv = contributors.find(c => c.id === newTaskForm.contributorId);
    const skuNormalized = newTaskForm.linkedSku.trim().toUpperCase();
    const ctvHasSkuOnHand = Boolean(
      selectedCtv && (selectedCtv.onHandProducts || []).some(s => s.toUpperCase() === skuNormalized)
    );
    const readyVjsWithSku = contributors.filter(c =>
      (c.onHandProducts || []).some(s => s.toUpperCase() === skuNormalized)
    );
    const isBlockedByUrgentNoStock = isUrgentUnder5Days && Boolean(selectedCtv) && !ctvHasSkuOnHand;

    return {
      daysLeft,
      isUrgentUnder5Days,
      selectedCtv,
      ctvHasSkuOnHand,
      readyVjsWithSku,
      isBlockedByUrgentNoStock
    };
  }, [newTaskForm.deadline, newTaskForm.contributorId, newTaskForm.linkedSku, contributors]);

  // Stats Calculations
  const stats = useMemo(() => {
    const relevantTasks = selectedBrandId === 'ALL'
      ? tasks
      : tasks.filter(t => t.brandId === selectedBrandId || t.brandName.toLowerCase().includes(activeAllocation.brandName.toLowerCase()));

    const totalTasks = relevantTasks.length;
    const completedTasks = relevantTasks.filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID').length;
    const inProgressTasks = relevantTasks.filter(
      t => t.status === 'SCRIPT_APPROVED' || t.status === 'DRAFT_VIDEO_SUBMITTED' || t.status === 'INTERNAL_QA_PASSED'
    ).length;
    const orientationPendingTasks = relevantTasks.filter(t => t.status === 'BRAND_ORIENTATION_PENDING').length;
    const scriptPendingTasks = relevantTasks.filter(t => t.status === 'SCRIPT_PENDING_REVIEW' || t.status === 'SCRIPT_REVISION').length;
    const videoQaPendingTasks = relevantTasks.filter(t => t.status === 'DRAFT_VIDEO_SUBMITTED' || t.status === 'VIDEO_REVISION').length;
    const brandAcceptPendingTasks = relevantTasks.filter(t => t.status === 'INTERNAL_QA_PASSED').length;
    const openTasks = relevantTasks.filter(t => t.status === 'OPEN_TASK').length;

    const totalSpent = relevantTasks
      .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const pendingPayment = relevantTasks
      .filter(t => t.status === 'ACCEPTED_COMPLETED')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const paidTotal = relevantTasks
      .filter(t => t.status === 'PAID')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const targetVideos = activeAllocation.targetSelfChannelVideos || 40;
    const budgetTotal = activeAllocation.budgetSelfChannel || 50000000;
    const progressPercent = targetVideos > 0 ? Math.round((completedTasks / targetVideos) * 100) : 0;

    const pendingApprovalsCount =
      orientationPendingTasks +
      scriptPendingTasks +
      videoQaPendingTasks +
      brandAcceptPendingTasks +
      relevantTasks.filter(t => t.status === 'ACCEPTED_COMPLETED').length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      orientationPendingTasks,
      scriptPendingTasks,
      videoQaPendingTasks,
      brandAcceptPendingTasks,
      openTasks,
      totalSpent,
      pendingPayment,
      paidTotal,
      targetVideos,
      budgetTotal,
      progressPercent,
      pendingApprovalsCount
    };
  }, [tasks, activeAllocation, selectedBrandId]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (isCtvPartner && currentUser) {
        const matchByName = t.contributorName?.toLowerCase().includes(currentUser.name.toLowerCase());
        if (!matchByName && t.status !== 'OPEN_TASK') return false;
      }
      if (isCtvSimulatorView) {
        if (t.contributorId && t.contributorId !== simulatedCtvId && t.status !== 'OPEN_TASK') return false;
      }
      if (selectedBrandId !== 'ALL') {
        const matchBrandId = t.brandId === selectedBrandId;
        const matchBrandName = (t.brandName || '').toLowerCase().includes((activeAllocation.brandName || '').toLowerCase());
        if (!matchBrandId && !matchBrandName) return false;
      }
      if (selectedPillarId !== 'ALL' && t.pillarId !== selectedPillarId) return false;
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (selectedSampleFilter !== 'ALL' && t.sampleShippingStatus !== selectedSampleFilter) return false;
      if (selectedContentPic !== 'ALL' && t.contentPic !== selectedContentPic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = t.taskCode.toLowerCase().includes(q);
        const matchSku = (t.linkedSku || '').toLowerCase().includes(q);
        const matchCtv = (t.contributorName || '').toLowerCase().includes(q);
        const matchContentPic = (t.contentPic || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchSku && !matchCtv && !matchContentPic) return false;
      }
      return true;
    });
  }, [
    tasks,
    isCtvPartner,
    currentUser,
    isCtvSimulatorView,
    simulatedCtvId,
    selectedBrandId,
    activeAllocation,
    selectedPillarId,
    selectedStatus,
    selectedSampleFilter,
    selectedContentPic,
    searchQuery
  ]);

  // Status Badge Helper
  const renderStatusBadge = (status: VideoTaskStatus) => {
    switch (status) {
      case 'OPEN_TASK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Mở nhận việc
          </span>
        );
      case 'BRAND_ORIENTATION_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Chờ Brand duyệt VJ (48h)
          </span>
        );
      case 'SCRIPT_PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800">
            <FileText className="w-3 h-3 text-amber-600" />
            Chờ duyệt kịch bản (24h)
          </span>
        );
      case 'SCRIPT_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Sửa kịch bản
          </span>
        );
      case 'SCRIPT_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700">
            <Video className="w-3 h-3 text-blue-600" />
            Đang quay &amp; dựng
          </span>
        );
      case 'DRAFT_VIDEO_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700">
            <Play className="w-3 h-3 text-blue-600" />
            Chờ QA nội bộ (Vòng 1)
          </span>
        );
      case 'INTERNAL_QA_PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Chờ Brand nghiệm thu &amp; Đăng kênh
          </span>
        );
      case 'VIDEO_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Sửa video nháp
          </span>
        );
      case 'ACCEPTED_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nghiệm thu (Chờ lập DNTT)
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700">
            <Wallet className="w-3 h-3 text-blue-600" />
            Đã quyết toán
          </span>
        );
    }
  };

  // Sample Status Badge Helper
  const renderSampleBadge = (task: SelfChannelVideoTask) => {
    const st = task.sampleShippingStatus || 'PENDING_SHIP';
    if (st === 'ON_HAND_AT_HOME') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Package className="w-3 h-3" /> Sẵn mẫu tại nhà VJ
        </span>
      );
    }
    if (st === 'DELIVERED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700">
          <Check className="w-3 h-3" /> VJ đã nhận mẫu ({task.sampleTrackingCode || 'Đã giao'})
        </span>
      );
    }
    if (st === 'SHIPPING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700">
          <Truck className="w-3 h-3" /> Đang giao mẫu ({task.sampleTrackingCode || 'SPX'})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-800">
        <Clock className="w-3 h-3" /> Chờ gửi mẫu (SLA 48h)
      </span>
    );
  };

  // Action: Partnership Leader (Việt Hoàng) đánh dấu đang liên hệ CTV cho đề bài của Content
  const handleTogglePartnershipContacting = (task: SelfChannelVideoTask) => {
    const nextPartnershipStatus =
      task.partnershipStatus === 'CONTACTING_CTV' ? 'WAITING_PARTNERSHIP' : 'CONTACTING_CTV';
    const updated: SelfChannelVideoTask = {
      ...task,
      partnershipPic: 'Việt Hoàng',
      partnershipStatus: nextPartnershipStatus
    };
    updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    notify(
      nextPartnershipStatus === 'CONTACTING_CTV'
        ? `Partnership Leader (Việt Hoàng) đã tiếp nhận đề bài [${task.taskCode}] của ${task.contentPic || 'Content'} và đang liên hệ CTV!`
        : `Đã chuyển [${task.taskCode}] về trạng thái chờ Partnership tiếp nhận.`
    );
  };

  // Action: Open Create / Assign Modal
  const openCreateOrAssignModal = (existingTask?: SelfChannelVideoTask) => {
    if (existingTask) {
      setSelectedTask(existingTask);
      setNewTaskForm({
        title: existingTask.title,
        brandId: existingTask.brandId,
        pillarId: existingTask.pillarId,
        videoFormat: existingTask.videoFormat || 'Review voice',
        linkedSku: existingTask.linkedSku || 'KUTIE-SOOTH-30G',
        productName: existingTask.productName || 'Kem Bôi Dịu Da Kutieskin 30g',
        remuneration: existingTask.remuneration,
        deadline: existingTask.deadline,
        contributorId: existingTask.contributorId || '',
        contentPic: existingTask.contentPic || 'Quỳnh Như',
        partnershipPic: existingTask.partnershipPic || 'Việt Hoàng',
        brandApprovalMode: existingTask.brandApprovalMode || 'BRAND_REVIEW_REQUIRED',
        sampleShippingStatus: existingTask.sampleShippingStatus || 'PENDING_SHIP',
        briefNotes: ''
      });
    } else {
      setSelectedTask(null);
      const defaultPillar = activeAllocation.pillars[0] || DEFAULT_CONTENT_PILLARS[0];
      setNewTaskForm({
        title: '',
        brandId: selectedBrandId === 'ALL' ? 'brand-kutieskin' : selectedBrandId,
        pillarId: defaultPillar.id,
        videoFormat: 'Review voice',
        linkedSku: defaultPillar.coreSkuIds?.[0] || 'KUTIE-SOOTH-30G',
        productName: 'Kem Bôi Dịu Da Kutieskin 30g',
        remuneration: defaultPillar.unitCostPerVideo || 1500000,
        deadline: '2026-10-22',
        contributorId: '',
        contentPic: 'Quỳnh Như',
        partnershipPic: 'Việt Hoàng',
        brandApprovalMode: 'BRAND_REVIEW_REQUIRED',
        sampleShippingStatus: 'PENDING_SHIP',
        briefNotes: ''
      });
    }
    setIsCreateTaskModalOpen(true);
  };

  // Action: Create or Update Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      notify('Vui lòng nhập tiêu đề / định hướng video!', 'warning');
      return;
    }

    if (createTaskUrgencyCheck.isBlockedByUrgentNoStock) {
      notify(
        `Đơn hàng gấp dưới 5 ngày (${createTaskUrgencyCheck.daysLeft} ngày): VJ ${createTaskUrgencyCheck.selectedCtv?.name} chưa có sẵn mã ${newTaskForm.linkedSku} tại nhà! Vui lòng chọn VJ đang cầm sẵn mẫu hoặc lùi hạn bàn giao.`,
        'error'
      );
      return;
    }

    const brandObj = MULTI_BRAND_ALLOCATIONS.find(b => b.brandId === newTaskForm.brandId) || activeAllocation;
    const selectedPillar = brandObj.pillars.find(p => p.id === newTaskForm.pillarId) || brandObj.pillars[0] || DEFAULT_CONTENT_PILLARS[0];
    const assignedCtv = contributors.find(c => c.id === newTaskForm.contributorId);

    const sampleStatus: SampleShippingStatus = assignedCtv
      ? createTaskUrgencyCheck.ctvHasSkuOnHand
        ? 'ON_HAND_AT_HOME'
        : newTaskForm.sampleShippingStatus
      : 'PENDING_SHIP';

    const nextStatus: VideoTaskStatus = !assignedCtv
      ? 'OPEN_TASK'
      : newTaskForm.brandApprovalMode === 'BRAND_REVIEW_REQUIRED'
      ? 'BRAND_ORIENTATION_PENDING'
      : 'SCRIPT_APPROVED';

    if (selectedTask) {
      // Đang giao việc cho task mở có sẵn
      const updatedTask: SelfChannelVideoTask = {
        ...selectedTask,
        title: newTaskForm.title.trim(),
        pillarId: selectedPillar.id,
        pillarName: selectedPillar.name,
        pillarCode: selectedPillar.code,
        videoFormat: newTaskForm.videoFormat,
        contentPic: newTaskForm.contentPic,
        partnershipPic: newTaskForm.partnershipPic || 'Việt Hoàng',
        partnershipStatus: assignedCtv ? 'CTV_ASSIGNED' : selectedTask.partnershipStatus || 'WAITING_PARTNERSHIP',
        linkedSku: newTaskForm.linkedSku.trim().toUpperCase(),
        productName: newTaskForm.productName,
        remuneration: Number(newTaskForm.remuneration) || selectedPillar.unitCostPerVideo,
        deadline: newTaskForm.deadline,
        isUrgentUnder5Days: createTaskUrgencyCheck.isUrgentUnder5Days,
        contributorId: assignedCtv?.id,
        contributorName: assignedCtv?.name,
        contributorAvatar: assignedCtv?.avatar,
        brandApprovalMode: newTaskForm.brandApprovalMode,
        brandOrientationStatus:
          newTaskForm.brandApprovalMode === 'UPBASE_DELEGATED' ? 'DELEGATED' : 'PENDING',
        brandOrientationSubmittedAt:
          newTaskForm.brandApprovalMode === 'BRAND_REVIEW_REQUIRED' ? new Date().toISOString() : undefined,
        brandOrientationSlaHoursRemaining: 48,
        sampleShippingStatus: sampleStatus,
        status: nextStatus
      };
      updateTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
      setIsCreateTaskModalOpen(false);
      setSelectedTask(null);
      notify(
        assignedCtv
          ? `Partnership (${updatedTask.partnershipPic}) đã phân bổ VJ [${assignedCtv.name}] cho đề bài [${updatedTask.taskCode}] của ${updatedTask.contentPic}!`
          : `Đã cập nhật thông tin đề bài [${updatedTask.taskCode}]`
      );
      return;
    }

    const newTask: SelfChannelVideoTask = {
      id: `task-sc-${++idCounterRef.current}`,
      taskCode: `SC-${brandObj.brandId.replace('brand-', '').slice(0, 4).toUpperCase()}-202610-${String(tasks.length + 1).padStart(2, '0')}`,
      title: newTaskForm.title.trim(),
      brandId: brandObj.brandId,
      brandName: brandObj.brandName,
      storeId: `${brandObj.brandId}-tts`,
      storeName: `${brandObj.brandName.split(' ')[0]} Official Store (TikTok)`,
      planMonth: '2026/10',
      videoFormat: newTaskForm.videoFormat,
      contentPic: newTaskForm.contentPic,
      partnershipPic: newTaskForm.partnershipPic || 'Việt Hoàng',
      partnershipStatus: assignedCtv ? 'CTV_ASSIGNED' : 'WAITING_PARTNERSHIP',
      pillarId: selectedPillar.id,
      pillarName: selectedPillar.name,
      pillarCode: selectedPillar.code,
      linkedSku: newTaskForm.linkedSku.trim().toUpperCase(),
      productName: newTaskForm.productName,
      remuneration: Number(newTaskForm.remuneration) || selectedPillar.unitCostPerVideo,
      deadline: newTaskForm.deadline,
      isUrgentUnder5Days: createTaskUrgencyCheck.isUrgentUnder5Days,
      contributorId: assignedCtv?.id,
      contributorName: assignedCtv?.name,
      contributorAvatar: assignedCtv?.avatar,
      brandApprovalMode: newTaskForm.brandApprovalMode,
      brandOrientationStatus:
        newTaskForm.brandApprovalMode === 'UPBASE_DELEGATED' ? 'DELEGATED' : 'PENDING',
      brandOrientationSubmittedAt:
        newTaskForm.brandApprovalMode === 'BRAND_REVIEW_REQUIRED' ? new Date().toISOString() : undefined,
      brandOrientationSlaHoursRemaining: 48,
      sampleShippingStatus: sampleStatus,
      status: nextStatus,
      feedbackLogs: [],
      createdAt: new Date().toISOString()
    };

    updateTasks(prev => [newTask, ...prev]);
    setIsCreateTaskModalOpen(false);
    notify(
      assignedCtv
        ? `Đã tạo đề bài [${newTask.taskCode}] (${newTask.contentPic}) và phân bổ CTV [${assignedCtv.name}]!`
        : `Chuyên viên Content (${newTask.contentPic}) đã lên đề bài [${newTask.taskCode}] và gửi yêu cầu tìm CTV cho Partnership Leader (${newTask.partnershipPic})!`
    );
  };

  // Action: Đồng bộ / Sinh hàng loạt slot từ Kế hoạch tháng
  const handleSyncFromMonthlyPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBrand = MULTI_BRAND_ALLOCATIONS.find(b => b.brandId === syncPlanBrandId) || MULTI_BRAND_ALLOCATIONS[0];
    const generated: SelfChannelVideoTask[] = [];
    const defaultMember =
      SELF_CHANNEL_CONTENT_MEMBERS.find(m =>
        m.assignedBrands.some(b => targetBrand.brandName.toLowerCase().includes(b.toLowerCase()))
      )?.name || 'Quỳnh Như';

    for (let i = 0; i < syncBatchQty; i++) {
      const pillar = targetBrand.pillars[i % targetBrand.pillars.length];
      const sku = pillar.coreSkuIds?.[0] || 'KUTIE-SOOTH-30G';
      const seq = tasks.length + i + 1;
      generated.push({
        id: `task-sc-sync-${++idCounterRef.current}`,
        taskCode: `SC-${targetBrand.brandId.replace('brand-', '').slice(0, 4).toUpperCase()}-202610-${String(seq).padStart(2, '0')}`,
        title: `[Kế hoạch T10 - ${syncVideoFormat}] ${pillar.name} — Slot #${i + 1}`,
        brandId: targetBrand.brandId,
        brandName: targetBrand.brandName,
        storeId: `${targetBrand.brandId}-tts`,
        storeName: `${targetBrand.brandName.split(' ')[0]} Official Store (TikTok)`,
        planMonth: '2026/10',
        videoFormat: syncVideoFormat,
        contentPic: defaultMember,
        partnershipPic: 'Việt Hoàng',
        partnershipStatus: 'WAITING_PARTNERSHIP',
        pillarId: pillar.id,
        pillarName: pillar.name,
        pillarCode: pillar.code,
        linkedSku: sku,
        productName: `Sản phẩm chủ lực ${sku}`,
        remuneration: pillar.unitCostPerVideo,
        deadline: '2026-10-25',
        brandApprovalMode: 'BRAND_REVIEW_REQUIRED',
        brandOrientationStatus: 'PENDING',
        sampleShippingStatus: 'PENDING_SHIP',
        status: 'OPEN_TASK',
        feedbackLogs: [],
        createdAt: new Date().toISOString()
      });
    }

    updateTasks(prev => [...generated, ...prev]);
    setIsSyncPlanModalOpen(false);
    setActiveTab('ACTIVE_JOBS');
    notify(
      `Đã nhận ${generated.length} slot sản xuất video kênh ${targetBrand.brandName} giao cho Content (${defaultMember}) & chờ Partnership (Việt Hoàng) phân bổ CTV!`
    );
  };

  // Action: Bước 2 SOP — Duyệt Định hướng & VJ với Brand (hoặc Auto-Pass sau 72h)
  const handleBrandOrientationDecision = (task: SelfChannelVideoTask, mode: 'APPROVED' | 'AUTO_PASSED_72H') => {
    const updated: SelfChannelVideoTask = {
      ...task,
      brandOrientationStatus: mode,
      status: task.scriptContent ? 'SCRIPT_PENDING_REVIEW' : 'SCRIPT_APPROVED',
      feedbackLogs: [
        ...task.feedbackLogs,
        {
          id: `fb-${++idCounterRef.current}`,
          version: 1,
          reviewedBy: mode === 'AUTO_PASSED_72H' ? 'Hệ thống SLA (Auto-Pass 72h)' : 'Đại diện Nhãn hàng',
          reviewedAt: new Date().toISOString(),
          type: 'ORIENTATION',
          verdict: 'APPROVED',
          comment:
            mode === 'AUTO_PASSED_72H'
              ? 'Quá 72h Nhãn hàng chưa phản hồi định hướng & VJ — Hệ thống tự động chuyển sang bước sản xuất theo quy chuẩn SLA.'
              : 'Nhãn hàng đã đồng ý VJ và góc kịch bản định hướng.'
        }
      ]
    };
    updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    notify(
      mode === 'AUTO_PASSED_72H'
        ? `Task [${task.taskCode}] đã được Auto-Pass định hướng (quá 72h SLA Brand) để VJ bấm máy đúng tiến độ!`
        : `Đã xác nhận Brand duyệt VJ & định hướng cho task [${task.taskCode}]!`
    );
  };

  // Action: Bước 3 SOP — Cập nhật Vận đơn Hàng mẫu (SLA 48h)
  const handleSaveSampleShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const updated: SelfChannelVideoTask = {
      ...selectedTask,
      sampleShippingStatus: sampleForm.status,
      sampleTrackingCode: sampleForm.trackingCode.trim() || selectedTask.sampleTrackingCode,
      sampleShippedAt:
        sampleForm.status === 'SHIPPING' ? new Date().toISOString() : selectedTask.sampleShippedAt,
      sampleDeliveredAt:
        sampleForm.status === 'DELIVERED' || sampleForm.status === 'ON_HAND_AT_HOME'
          ? new Date().toISOString()
          : selectedTask.sampleDeliveredAt
    };

    updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));

    // Nếu VJ đã nhận được hàng mẫu, tự động ghi nhận SKU vào danh sách cầm sẵn tại nhà của VJ
    if (
      (sampleForm.status === 'DELIVERED' || sampleForm.status === 'ON_HAND_AT_HOME') &&
      selectedTask.contributorId &&
      selectedTask.linkedSku
    ) {
      const targetCtv = contributors.find(c => c.id === selectedTask.contributorId);
      if (targetCtv) {
        const sku = selectedTask.linkedSku.toUpperCase();
        const existingSkus = targetCtv.onHandProducts || [];
        if (!existingSkus.includes(sku)) {
          const updatedCtv: Contributor = {
            ...targetCtv,
            onHandProducts: [...existingSkus, sku]
          };
          setLocalContributors(prev => prev.map(c => (c.id === updatedCtv.id ? updatedCtv : c)));
          onContributorUpdated?.(updatedCtv);
        }
      }
    }

    setIsSampleShippingModalOpen(false);
    setSelectedTask(null);
    notify(`Đã cập nhật trạng thái hàng mẫu cho task [${updated.taskCode}]!`);
  };

  // Action: Duyệt Kịch bản chi tiết (SLA 24h)
  const handleSaveScriptReview = () => {
    if (!selectedTask) return;
    const isApproved = scriptVerdict === 'APPROVED';

    const updatedTask: SelfChannelVideoTask = {
      ...selectedTask,
      status: isApproved ? 'SCRIPT_APPROVED' : 'SCRIPT_REVISION',
      feedbackLogs: [
        ...selectedTask.feedbackLogs,
        {
          id: `fb-${++idCounterRef.current}`,
          version: (selectedTask.feedbackLogs.filter(f => f.type === 'SCRIPT').length || 0) + 1,
          reviewedBy: currentUser?.name || 'Lê Phương Thảo (Content B2C)',
          reviewedAt: new Date().toISOString(),
          type: 'SCRIPT',
          verdict: isApproved ? 'APPROVED' : 'REVISE',
          comment:
            scriptFeedbackText.trim() ||
            (isApproved ? 'Kịch bản chuẩn insight, đồng ý duyệt bấm máy.' : 'Cần chỉnh sửa theo góp ý.')
        }
      ]
    };

    updateTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setIsScriptReviewModalOpen(false);
    setSelectedTask(null);
    setScriptFeedbackText('');
    notify(
      isApproved
        ? `Đã duyệt kịch bản [${selectedTask.taskCode}]! VJ tiến hành quay dựng.`
        : `Đã gửi yêu cầu sửa kịch bản [${selectedTask.taskCode}] cho VJ.`,
      isApproved ? 'success' : 'warning'
    );
  };

  // Action: Bước 4A SOP — Duyệt QA Nội bộ Content B2C (Vòng 1) & Lưu Drive tổng gian hàng
  const handleSaveVideoQa = () => {
    if (!selectedTask) return;
    const isApproved = videoVerdict === 'APPROVED';

    const updatedTask: SelfChannelVideoTask = {
      ...selectedTask,
      status: isApproved ? 'INTERNAL_QA_PASSED' : 'VIDEO_REVISION',
      videoDeliverables: {
        currentVersion: selectedTask.videoDeliverables?.currentVersion || 1,
        ...selectedTask.videoDeliverables,
        finalVideoUrl: isApproved
          ? selectedTask.videoDeliverables?.draftVideoUrl
          : selectedTask.videoDeliverables?.finalVideoUrl,
        storeDriveFolderUrl: storeDriveFolderInput.trim() || selectedTask.videoDeliverables?.storeDriveFolderUrl,
        internalQaApprovedBy: isApproved ? currentUser?.name || 'Lê Phương Thảo (Content B2C)' : undefined,
        internalQaApprovedAt: isApproved ? new Date().toISOString() : undefined
      },
      feedbackLogs: [
        ...selectedTask.feedbackLogs,
        {
          id: `fb-${++idCounterRef.current}`,
          version: selectedTask.videoDeliverables?.currentVersion || 1,
          reviewedBy: currentUser?.name || 'Lê Phương Thảo (Content B2C)',
          reviewedAt: new Date().toISOString(),
          type: 'VIDEO',
          verdict: isApproved ? 'APPROVED' : 'REVISE',
          comment:
            videoFeedbackText.trim() ||
            (isApproved
              ? 'Đạt 4/4 tiêu chí QA nội bộ. Đã đồng bộ file sạch vào Drive tổng của gian hàng để trình Brand nghiệm thu.'
              : 'Cần cắt gọt và chỉnh sửa lại âm thanh.'),
          checklist: videoChecklist
        }
      ]
    };

    updateTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setIsVideoQaModalOpen(false);
    setSelectedTask(null);
    setVideoFeedbackText('');
    notify(
      isApproved
        ? `Đã duyệt QA nội bộ video [${selectedTask.taskCode}] & đồng bộ vào Drive tổng gian hàng! Chuyển sang bước Brand nghiệm thu & đăng kênh.`
        : `Đã gửi yêu cầu chỉnh sửa video nháp [${selectedTask.taskCode}] cho VJ.`,
      isApproved ? 'success' : 'warning'
    );
  };

  // Action: Bước 4B SOP — Brand Nghiệm thu cuối & Gắn link đăng kênh chính chủ
  const handleSaveBrandAcceptance = () => {
    if (!selectedTask) return;
    const isApproved = brandAcceptVerdict === 'APPROVED';

    const updatedTask: SelfChannelVideoTask = {
      ...selectedTask,
      status: isApproved ? 'ACCEPTED_COMPLETED' : 'VIDEO_REVISION',
      acceptedAt: isApproved ? new Date().toISOString() : undefined,
      acceptedBy: isApproved ? currentUser?.name || 'Đặng Thị Yến Nhi (Lead B2C)' : undefined,
      dnttStatus: isApproved ? 'NOT_CREATED' : undefined,
      videoDeliverables: {
        currentVersion: selectedTask.videoDeliverables?.currentVersion || 1,
        ...selectedTask.videoDeliverables,
        publishedChannelUrl:
          publishedChannelUrlInput.trim() || selectedTask.videoDeliverables?.publishedChannelUrl,
        publishedAt: isApproved ? new Date().toISOString() : undefined,
        brandAcceptedBy: isApproved ? currentUser?.name || 'Đặng Thị Yến Nhi (Lead B2C)' : undefined,
        brandAcceptedAt: isApproved ? new Date().toISOString() : undefined
      },
      feedbackLogs: [
        ...selectedTask.feedbackLogs,
        {
          id: `fb-${++idCounterRef.current}`,
          version: selectedTask.videoDeliverables?.currentVersion || 1,
          reviewedBy: currentUser?.name || 'Đặng Thị Yến Nhi (Lead B2C)',
          reviewedAt: new Date().toISOString(),
          type: 'BRAND_ACCEPTANCE',
          verdict: isApproved ? 'APPROVED' : 'REVISE',
          comment:
            brandAcceptComment.trim() ||
            (isApproved
              ? 'Nhãn hàng đã nghiệm thu đạt chuẩn & đăng lên kênh chính chủ. Đủ điều kiện lập Đề nghị thanh toán (DNTT).'
              : 'Nhãn hàng yêu cầu điều chỉnh lại.')
        }
      ]
    };

    updateTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setIsBrandAcceptModalOpen(false);
    setSelectedTask(null);
    setPublishedChannelUrlInput('');
    setBrandAcceptComment('');
    notify(
      isApproved
        ? `Đã hoàn tất nghiệm thu & ghi nhận link đăng kênh cho [${selectedTask.taskCode}]! Sẵn sàng lập phiếu DNTT.`
        : `Đã chuyển [${selectedTask.taskCode}] về trạng thái chỉnh sửa theo yêu cầu Nhãn hàng.`,
      isApproved ? 'success' : 'warning'
    );
  };

  // Action: Góc CTV nhận việc / nộp kịch bản / nộp video Demo
  const handleCtvClaimOpenTask = (task: SelfChannelVideoTask) => {
    const activeCtv =
      contributors.find(c => c.id === simulatedCtvId) || contributors[0];
    if (!activeCtv) return;

    const hasStock = (activeCtv.onHandProducts || []).some(
      s => s.toUpperCase() === (task.linkedSku || '').toUpperCase()
    );

    const updated: SelfChannelVideoTask = {
      ...task,
      contributorId: activeCtv.id,
      contributorName: activeCtv.name,
      contributorAvatar: activeCtv.avatar,
      sampleShippingStatus: hasStock ? 'ON_HAND_AT_HOME' : 'PENDING_SHIP',
      status: task.brandApprovalMode === 'UPBASE_DELEGATED' ? 'SCRIPT_APPROVED' : 'BRAND_ORIENTATION_PENDING',
      brandOrientationSubmittedAt: new Date().toISOString(),
      brandOrientationSlaHoursRemaining: 48
    };
    updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    notify(`VJ [${activeCtv.name}] đã nhận đầu việc [${task.taskCode}]!`);
  };

  const handleCtvSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (ctvSubmitType === 'SCRIPT') {
      if (!ctvScriptForm.hook.trim() || !ctvScriptForm.body.trim()) {
        notify('Vui lòng nhập đầy đủ Hook 3 giây đầu và Thân bài!', 'warning');
        return;
      }
      const updated: SelfChannelVideoTask = {
        ...selectedTask,
        status: 'SCRIPT_PENDING_REVIEW',
        scriptContent: {
          hook: ctvScriptForm.hook.trim(),
          body: ctvScriptForm.body.trim(),
          cta: ctvScriptForm.cta.trim() || 'Nhấn vào giỏ hàng góc trái màn hình để nhận ưu đãi!',
          submittedAt: new Date().toISOString()
        }
      };
      updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setIsCtvSubmitModalOpen(false);
      notify(`Đã nộp kịch bản chi tiết cho task [${updated.taskCode}] (SLA duyệt 24h)!`);
    } else {
      if (!ctvVideoForm.draftVideoUrl.trim()) {
        notify('Vui lòng dán link Google Drive chứa video nháp!', 'warning');
        return;
      }
      const nextVer = (selectedTask.videoDeliverables?.currentVersion || 0) + 1;
      const updated: SelfChannelVideoTask = {
        ...selectedTask,
        status: 'DRAFT_VIDEO_SUBMITTED',
        videoDeliverables: {
          ...selectedTask.videoDeliverables,
          currentVersion: nextVer,
          draftVideoUrl: ctvVideoForm.draftVideoUrl.trim(),
          durationSeconds: Number(ctvVideoForm.durationSeconds) || 45,
          captionSuggested: ctvVideoForm.captionSuggested.trim(),
          submittedAt: new Date().toISOString()
        }
      };
      updateTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setIsCtvSubmitModalOpen(false);
      notify(`Đã nộp video Demo v${nextVer} cho task [${updated.taskCode}] chờ Content B2C duyệt QA!`);
    }
  };

  // Action: Bước 5 SOP — Lập Phiếu Đề nghị thanh toán (DNTT) & Quyết toán theo đợt cho CTV
  const openDnttSettlementModal = (ctv: Contributor) => {
    const legalCheck = isCtvLegalReady(ctv);
    if (!legalCheck.ready) {
      notify(
        `Chưa thể lập Đề nghị thanh toán cho ${ctv.name}: ${legalCheck.missingReason}. Vui lòng bổ sung tại Danh bạ CTV / VJ!`,
        'error'
      );
      return;
    }
    setDnttTargetCtv(ctv);
    setIsDnttModalOpen(true);
  };

  const handleConfirmDnttBatchPayout = () => {
    if (!dnttTargetCtv) return;
    const unpaidCompletedTasks = tasks.filter(
      t =>
        t.status === 'ACCEPTED_COMPLETED' &&
        (t.contributorId === dnttTargetCtv.id ||
          t.contributorName?.toLowerCase().includes(dnttTargetCtv.name.split('(')[0].trim().toLowerCase()))
    );
    if (unpaidCompletedTasks.length === 0) return;

    const grossTotal = unpaidCompletedTasks.reduce((sum, t) => sum + t.remuneration, 0);
    const pitTax = grossTotal >= 2000000 ? Math.round(grossTotal * 0.1) : 0;
    const netTotal = grossTotal - pitTax;
    const dnttCode = `DNTT-CTV-202610-${String(++idCounterRef.current).slice(-3)}`;
    const paymentRef = `UNC-${100000 + idCounterRef.current}`;

    updateTasks(prev =>
      prev.map(t => {
        const isTarget = unpaidCompletedTasks.some(u => u.id === t.id);
        if (!isTarget) return t;
        const itemTax = grossTotal >= 2000000 ? Math.round(t.remuneration * 0.1) : 0;
        return {
          ...t,
          status: 'PAID',
          dnttCode,
          dnttStatus: 'DISBURSED',
          pitTaxDeducted: itemTax,
          netPayoutAmount: t.remuneration - itemTax,
          paidAt: new Date().toISOString(),
          paymentRef
        };
      })
    );

    const updatedCtv: Contributor = {
      ...dnttTargetCtv,
      totalPaidAmount: dnttTargetCtv.totalPaidAmount + grossTotal,
      pendingPaymentAmount: 0,
      completedTaskCount: dnttTargetCtv.completedTaskCount + unpaidCompletedTasks.length
    };
    setLocalContributors(prev => prev.map(c => (c.id === updatedCtv.id ? updatedCtv : c)));
    onContributorUpdated?.(updatedCtv);

    setIsDnttModalOpen(false);
    setDnttTargetCtv(null);
    notify(
      `Đã lập phiếu ${dnttCode} & giải ngân thực nhận ${formatVnd(netTotal)} (Gross: ${formatVnd(
        grossTotal
      )}, Thuế TNCN 10%: ${formatVnd(pitTax)}) cho ${updatedCtv.name}!`
    );
  };

  // Tổng hợp bảng kê quyết toán theo từng CTV ở tab HISTORY
  const ctvSettlementSummaries = useMemo(() => {
    return contributors.map(ctv => {
      const ctvTasks = tasks.filter(
        t =>
          t.contributorId === ctv.id ||
          (t.contributorName &&
            t.contributorName.toLowerCase().includes(ctv.name.split('(')[0].trim().toLowerCase()))
      );
      const pendingTasks = ctvTasks.filter(t => t.status === 'ACCEPTED_COMPLETED');
      const paidTasks = ctvTasks.filter(t => t.status === 'PAID');
      const pendingGross = pendingTasks.reduce((s, t) => s + t.remuneration, 0);
      const pitTax = pendingGross >= 2000000 ? Math.round(pendingGross * 0.1) : 0;
      const netPayout = pendingGross - pitTax;
      const legalStatus = isCtvLegalReady(ctv);

      return {
        ctv,
        pendingTasks,
        paidTasks,
        pendingGross,
        pitTax,
        netPayout,
        legalStatus
      };
    });
  }, [contributors, tasks]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER & THANH ĐIỀU PHỐI QUY TRÌNH 5 BƯỚC                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Sản xuất Video kênh Brand &amp; Điều phối CTV / VJ
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Luồng Self-Channel 5 bước
                </span>
                <span className="font-mono text-2xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {activeAllocation.brandName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhận chỉ tiêu Kế hoạch tháng → Chọn VJ &amp; Duyệt định hướng (48h) → Giao mẫu (48h) &amp; Quay dựng → Duyệt QA 2 vòng &amp; Đăng kênh → Lập DNTT &amp; Khấu trừ thuế TNCN.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {!isCtvPartner && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-500 hidden sm:inline text-2xs">Nhãn:</span>
                <select
                  value={selectedBrandId}
                  onChange={(e) => {
                    setSelectedBrandId(e.target.value);
                    setSelectedPillarId('ALL');
                  }}
                  className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả nhãn hàng ({availableAllocations.length})</option>
                  {availableAllocations.map(a => (
                    <option key={a.brandId} value={a.brandId}>{a.brandName}</option>
                  ))}
                </select>
              </div>
            )}

            {!isCtvPartner && (
              <button
                type="button"
                onClick={() => setIsSyncPlanModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nhận chỉ tiêu Kế hoạch tháng</span>
              </button>
            )}

            {onOpenCtvProfile && !isCtvPartner && (
              <button
                type="button"
                onClick={() => onOpenCtvProfile()}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Danh bạ &amp; Pháp lý CTV</span>
              </button>
            )}

            {onOpenPushProducts && (
              <button
                type="button"
                onClick={onOpenPushProducts}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>SP Đẩy (SKU)</span>
              </button>
            )}

            {!isCtvPartner && (
              <button
                type="button"
                onClick={() => openCreateOrAssignModal()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Giao việc Video mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh 5 Bước Quy Trình SOP Self-Channel trực quan */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100 text-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-left transition"
          >
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>B1. Chỉ tiêu Kế hoạch</span>
              <span className="font-mono text-blue-700">{stats.totalTasks}/{stats.targetVideos}</span>
            </div>
            <p className="text-slate-500 mt-0.5 truncate">Nhận hạn mức &amp; chia Pillar</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatus('BRAND_ORIENTATION_PENDING');
              setActiveTab('ACTIVE_JOBS');
            }}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-left transition"
          >
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>B2. Duyệt VJ &amp; Góc quay</span>
              <span className="font-mono text-amber-700">{stats.orientationPendingTasks} chờ</span>
            </div>
            <p className="text-slate-500 mt-0.5 truncate">SLA Brand 48h / Ủy quyền</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatus('ALL');
              setActiveTab('ACTIVE_JOBS');
            }}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-left transition"
          >
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>B3. Gửi mẫu &amp; Kịch bản</span>
              <span className="font-mono text-amber-700">{stats.scriptPendingTasks} kịch bản</span>
            </div>
            <p className="text-slate-500 mt-0.5 truncate">Ship mẫu 48h &amp; Check &lt;5 ngày</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPROVALS')}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-left transition"
          >
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>B4. QA 2 vòng &amp; Đăng kênh</span>
              <span className="font-mono text-indigo-700">
                {stats.videoQaPendingTasks + stats.brandAcceptPendingTasks} chờ
              </span>
            </div>
            <p className="text-slate-500 mt-0.5 truncate">Drive gian hàng &amp; Link Air</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-left transition"
          >
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>B5. Lập DNTT &amp; Thuế 10%</span>
              <span className="font-mono text-emerald-700">{formatVnd(stats.pendingPayment)}</span>
            </div>
            <p className="text-slate-500 mt-0.5 truncate">Check CCCD/HĐ &amp; Giải ngân</p>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINIMALIST SEGMENTED TABS                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tổng quan &amp; Pillar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPROVALS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'APPROVALS'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Hàng chờ Duyệt &amp; Nghiệm thu</span>
          {stats.pendingApprovalsCount > 0 && (
            <span
              className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === 'APPROVALS' ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
              }`}
            >
              {stats.pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE_JOBS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ACTIVE_JOBS'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Bảng điều phối công việc ({tasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Bảng kê DNTT &amp; Quyết toán CTV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTRIBUTORS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CONTRIBUTORS'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Năng lực &amp; Tồn mẫu VJ ({contributors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISCUSSION')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DISCUSSION'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Trao đổi nhanh</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN & CONTENT PILLARS (OVERVIEW)                             */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 Clean Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500">Ngân sách Self-Channel (Net)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-slate-900">
                  {formatVnd(activeAllocation.budgetSelfChannel)}
                </span>
                <span className="text-2xs text-blue-600 font-medium">Hạn mức tháng 10</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">
                Đã nghiệm thu: {formatVnd(stats.totalSpent)}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500">Chỉ tiêu Video đăng kênh</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-slate-900">
                  {stats.completedTasks} / {stats.targetVideos}
                </span>
                <span className="text-2xs text-emerald-600 font-medium">{stats.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="data-bar bg-emerald-600 h-full rounded-full"
                  style={{ width: `${Math.min(100, stats.progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500">Tiến độ Duyệt &amp; Sản xuất</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-amber-600">
                  {stats.orientationPendingTasks + stats.scriptPendingTasks} chờ duyệt
                </span>
                <span className="text-2xs text-blue-600 font-medium">{stats.inProgressTasks} đang quay/QA</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">
                {stats.openTasks} slot mở từ Kế hoạch tháng chờ giao VJ
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500">Thù lao chờ lập DNTT</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-amber-700">
                  {formatVnd(stats.pendingPayment)}
                </span>
                <span className="text-2xs text-emerald-600 font-medium">Đã chi: {formatVnd(stats.paidTotal)}</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">
                Kiểm tra CCCD &amp; Hợp đồng CTV trước khi giải ngân
              </span>
            </div>
          </div>

          {/* CƠ CẤU NHÓM SELF-CHANNEL: PARTNERSHIP LEADER (VIỆT HOÀNG) QUẢN LÝ CÁC CHUYÊN VIÊN CONTENT BÊN DƯỚI */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-5 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <Avatar name={SELF_CHANNEL_PARTNERSHIP_LEADER.name} size={40} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900">
                      {SELF_CHANNEL_PARTNERSHIP_LEADER.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Leader Partnership &amp; Self-Channel
                    </span>
                    <span className="text-2xs text-slate-500">
                      Báo cáo trực tiếp: <strong className="text-slate-700">{SELF_CHANNEL_PARTNERSHIP_LEADER.managerName}</strong>
                    </span>
                  </div>
                  <p className="text-2xs text-slate-600 mt-0.5">
                    Quản lý trực tiếp <strong>{SELF_CHANNEL_CONTENT_MEMBERS.length} chuyên viên Content</strong> bên dưới • Chuyên trách liên hệ CTV/VJ, đàm phán đơn giá, thu thập CCCD/Hợp đồng, điều phối CTV vào đề bài của Content và lập bảng kê DNTT.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('OPEN_TASK');
                    setActiveTab('ACTIVE_JOBS');
                  }}
                  className="px-3 py-1.5 rounded-lg text-2xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                >
                  Đề bài chờ liên hệ CTV ({stats.openTasks})
                </button>
                {onOpenCtvProfile && (
                  <button
                    type="button"
                    onClick={() => onOpenCtvProfile()}
                    className="px-3 py-1.5 rounded-lg text-2xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
                  >
                    Quản lý Hồ sơ &amp; Hợp đồng CTV →
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đội ngũ Chuyên viên Content dưới quyền ({SELF_CHANNEL_CONTENT_MEMBERS.length} nhân sự) — Lên đề bài, duyệt kịch bản 24h &amp; QA video nội bộ</span>
                </h4>
                <span className="text-2xs text-slate-400 hidden sm:inline">
                  Bấm vào từng nhân sự để lọc công việc trong Bảng điều phối
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {SELF_CHANNEL_CONTENT_MEMBERS.map(member => {
                  const memberTasks = tasks.filter(t => t.contentPic === member.name);
                  const waitingCtvCount = memberTasks.filter(t => t.status === 'OPEN_TASK').length;
                  const inProgressCount = memberTasks.filter(
                    t =>
                      t.status === 'BRAND_ORIENTATION_PENDING' ||
                      t.status === 'SCRIPT_PENDING_REVIEW' ||
                      t.status === 'SCRIPT_REVISION' ||
                      t.status === 'SCRIPT_APPROVED' ||
                      t.status === 'DRAFT_VIDEO_SUBMITTED' ||
                      t.status === 'INTERNAL_QA_PASSED' ||
                      t.status === 'VIDEO_REVISION'
                  ).length;
                  const doneCount = memberTasks.filter(
                    t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID'
                  ).length;
                  const assignedCtvCount = contributors.filter(c => c.contentPic === member.name).length;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={member.name} size={28} />
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">{member.name}</div>
                              <div className="text-2xs text-slate-500">Báo cáo: Việt Hoàng</div>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-2xs font-mono font-semibold bg-white border border-slate-200 text-slate-700">
                            {memberTasks.length} việc
                          </span>
                        </div>

                        <p className="text-2xs text-slate-500 line-clamp-2">{member.specialty}</p>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {member.assignedBrands.map(b => (
                            <span
                              key={b}
                              className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-2xs text-slate-700 font-medium truncate max-w-full"
                            >
                              {b.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 space-y-2 text-2xs">
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="p-1.5 rounded bg-amber-50/80 border border-amber-200/60">
                            <div className="font-mono font-semibold text-amber-800">{waitingCtvCount}</div>
                            <div className="text-amber-700 text-[10px]">Chờ CTV</div>
                          </div>
                          <div className="p-1.5 rounded bg-blue-50/80 border border-blue-200/60">
                            <div className="font-mono font-semibold text-blue-800">{inProgressCount}</div>
                            <div className="text-blue-700 text-[10px]">Đang chạy</div>
                          </div>
                          <div className="p-1.5 rounded bg-emerald-50/80 border border-emerald-200/60">
                            <div className="font-mono font-semibold text-emerald-800">{doneCount}</div>
                            <div className="text-emerald-700 text-[10px]">Hoàn tất</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-500">Phối hợp {assignedCtvCount} CTV</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContentPic(member.name);
                              setSelectedStatus('ALL');
                              setActiveTab('ACTIVE_JOBS');
                            }}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                          >
                            <span>Xem việc</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ma trận phân bổ các Brand */}
          {selectedBrandId === 'ALL' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Ma trận phân bổ Video kênh Brand ({availableAllocations.length} thương hiệu)</span>
                  </h3>
                  <p className="text-2xs text-slate-500">
                    Đối soát hạn mức ngân sách, chỉ tiêu số lượng video và tiến độ nghiệm thu đăng kênh của từng thương hiệu
                  </p>
                </div>
                {onOpenInputPlan && (
                  <button
                    type="button"
                    onClick={onOpenInputPlan}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-2xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Mở Kế hoạch tháng →
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-500">
                      <th className="py-2.5 px-4">Thương hiệu / Kênh chính chủ</th>
                      <th className="py-2.5 px-3 text-center">Số Pillar</th>
                      <th className="py-2.5 px-3 text-center">Chỉ tiêu Kế hoạch</th>
                      <th className="py-2.5 px-3 text-center">Đã đăng kênh</th>
                      <th className="py-2.5 px-3 text-center">Tiến độ</th>
                      <th className="py-2.5 px-3 text-right">Hạn mức Self-Channel</th>
                      <th className="py-2.5 px-3 text-right">Đã nghiệm thu</th>
                      <th className="py-2.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableAllocations.map(alloc => {
                      const brandTasks = tasks.filter(
                        t => t.brandId === alloc.brandId || t.brandName.toLowerCase().includes(alloc.brandName.toLowerCase())
                      );
                      const brandCompleted = brandTasks.filter(
                        t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID'
                      ).length;
                      const brandSpent = brandTasks
                        .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
                        .reduce((sum, t) => sum + t.remuneration, 0);
                      const brandProgress =
                        alloc.targetSelfChannelVideos > 0
                          ? Math.round((brandCompleted / alloc.targetSelfChannelVideos) * 100)
                          : 0;

                      return (
                        <tr key={alloc.brandId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span>{alloc.brandName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{alloc.pillars.length}</td>
                          <td className="py-3 px-3 text-center font-mono font-semibold">
                            {alloc.targetSelfChannelVideos} video
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-700 font-semibold">
                            {brandCompleted} video
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {brandProgress}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                            {formatVnd(alloc.budgetSelfChannel)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatVnd(brandSpent)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedBrandId(alloc.brandId)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-2xs font-semibold transition flex items-center gap-1 ml-auto"
                            >
                              <span>Chi tiết Brand</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content Pillars Grid */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Phân bổ chỉ tiêu theo Trụ cột nội dung (Content Pillar)
              </h3>
              <span className="text-2xs text-slate-400">Click vào từng Pillar để tạo việc sản xuất nhanh</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {activeAllocation.pillars.map(pillar => {
                const pillarTasks = tasks.filter(t => t.pillarId === pillar.id);
                const pillarCompleted = pillarTasks.filter(
                  t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID'
                ).length;
                const percent = Math.round((pillarCompleted / pillar.targetVideos) * 100);

                return (
                  <div
                    key={pillar.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900">{pillar.name}</span>
                        <span className="text-2xs font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-blue-700 border border-slate-200 shrink-0">
                          {formatVnd(pillar.unitCostPerVideo)}/clip
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 line-clamp-2 leading-relaxed">
                        {pillar.description}
                      </p>
                      {pillar.coreSkuIds && pillar.coreSkuIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {pillar.coreSkuIds.map(sku => (
                            <span
                              key={sku}
                              className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-2xs text-slate-600"
                            >
                              {sku}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Đã nghiệm thu:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {pillarCompleted}/{pillar.targetVideos} clips ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="data-bar bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HÀNG CHỜ DUYỆT & NGHIỆM THU 2 VÒNG (APPROVALS)                      */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {stats.pendingApprovalsCount === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Không có công việc nào đang tồn đọng chờ duyệt!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Toàn bộ định hướng VJ, kịch bản, video nháp và phiếu thanh toán đã được xử lý đúng hạn SLA.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Hộp việc Phê duyệt theo 4 bước kiểm soát chất lượng ({stats.pendingApprovalsCount} mục)
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    1. Duyệt VJ &amp; Định hướng (SLA 48h) → 2. Duyệt Kịch bản (SLA 24h) → 3. QA Video nội bộ &amp; Lưu Drive gian hàng → 4. Brand nghiệm thu &amp; Đăng kênh
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* BƯỚC 2 SOP: Chờ Brand duyệt VJ & Định hướng (SLA 48h / Quá 72h Auto-Pass) */}
                {tasks
                  .filter(t => t.status === 'BRAND_ORIENTATION_PENDING')
                  .map(t => (
                    <div
                      key={t.id}
                      className="p-4 bg-amber-50/30 hover:bg-amber-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              [Bước 2 - Trình Brand duyệt VJ &amp; Góc kịch bản] {t.title}
                            </span>
                            <span className="font-mono text-2xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {t.taskCode}
                            </span>
                            {renderStatusBadge(t.status)}
                            {renderSampleBadge(t)}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            VJ đề xuất: <strong className="text-slate-900">{t.contributorName}</strong> • Nhãn:{' '}
                            <strong>{t.brandName}</strong> • SKU: <span className="font-mono">{t.linkedSku}</span> •
                            Thời hạn SLA Brand còn:{' '}
                            <strong className="text-amber-700">
                              {t.brandOrientationSlaHoursRemaining ?? 12}h (Quá 72h được Auto-Pass)
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end lg:self-auto">
                        <button
                          type="button"
                          onClick={() => handleBrandOrientationDecision(t, 'AUTO_PASSED_72H')}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition"
                          title="Quá 3 ngày Nhãn hàng chưa phản hồi định hướng thì kích hoạt Auto-Pass để kịp lịch quay"
                        >
                          Auto-Pass (Quá 72h SLA)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBrandOrientationDecision(t, 'APPROVED')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Xác nhận Brand đã duyệt VJ</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* BƯỚC 3 SOP: Chờ duyệt Kịch bản chi tiết (SLA 24h) */}
                {tasks
                  .filter(t => t.status === 'SCRIPT_PENDING_REVIEW' || t.status === 'SCRIPT_REVISION')
                  .map(t => (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-semibold text-xs flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              [Bước 3 - Duyệt kịch bản 24h] {t.title}
                            </span>
                            <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.taskCode}
                            </span>
                            {renderStatusBadge(t.status)}
                            {renderSampleBadge(t)}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            VJ: <strong className="text-slate-700">{t.contributorName}</strong> • Định dạng:{' '}
                            <strong>{t.videoFormat || 'Review voice'}</strong> • SKU:{' '}
                            <span className="font-mono">{t.linkedSku}</span> • Thù lao:{' '}
                            <strong className="text-blue-700">{formatVnd(t.remuneration)}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(t);
                          setIsScriptReviewModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem &amp; Duyệt kịch bản</span>
                      </button>
                    </div>
                  ))}

                {/* BƯỚC 4A SOP: Chờ Content B2C duyệt QA Video nội bộ (Vòng 1) */}
                {tasks
                  .filter(t => t.status === 'DRAFT_VIDEO_SUBMITTED' || t.status === 'VIDEO_REVISION')
                  .map(t => (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              [Bước 4A - QA Video nội bộ] {t.title}
                            </span>
                            <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.taskCode}
                            </span>
                            {renderStatusBadge(t.status)}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            VJ: <strong className="text-slate-700">{t.contributorName}</strong> • Bản nộp: v
                            {t.videoDeliverables?.currentVersion || 1} ({t.videoDeliverables?.durationSeconds || 45}s) •
                            PIC Content: <strong>{t.contentPic || 'Lê Phương Thảo'}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(t);
                          setStoreDriveFolderInput(
                            t.videoDeliverables?.storeDriveFolderUrl ||
                              `https://drive.google.com/drive/folders/${t.storeId || 'store-b2c'}-oct2026`
                          );
                          setIsVideoQaModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Duyệt QA Nội bộ &amp; Lưu Drive</span>
                      </button>
                    </div>
                  ))}

                {/* BƯỚC 4B SOP: Đã qua QA nội bộ -> Chờ Brand nghiệm thu & Đăng kênh chính chủ */}
                {tasks
                  .filter(t => t.status === 'INTERNAL_QA_PASSED')
                  .map(t => (
                    <div
                      key={t.id}
                      className="p-4 bg-indigo-50/30 hover:bg-indigo-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              [Bước 4B - Brand nghiệm thu &amp; Đăng kênh] {t.title}
                            </span>
                            <span className="font-mono text-2xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {t.taskCode}
                            </span>
                            {renderStatusBadge(t.status)}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            VJ: <strong className="text-slate-800">{t.contributorName}</strong> • QA nội bộ bởi:{' '}
                            <strong>{t.videoDeliverables?.internalQaApprovedBy || 'Content B2C'}</strong> • Drive gian hàng:{' '}
                            <a
                              href={t.videoDeliverables?.storeDriveFolderUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-mono text-2xs"
                            >
                              Mở thư mục Drive ↗
                            </a>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(t);
                          setPublishedChannelUrlInput(
                            t.videoDeliverables?.publishedChannelUrl ||
                              `https://www.tiktok.com/@${t.brandId.replace('brand-', '')}.official/video/74250019283`
                          );
                          setIsBrandAcceptModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác nhận Nghiệm thu &amp; Gắn link Air</span>
                      </button>
                    </div>
                  ))}

                {/* BƯỚC 5 SOP: Đã nghiệm thu -> Chờ lập DNTT & Quyết toán */}
                {tasks
                  .filter(t => t.status === 'ACCEPTED_COMPLETED')
                  .map(t => {
                    const ctvObj = contributors.find(
                      c =>
                        c.id === t.contributorId ||
                        c.name.toLowerCase().includes((t.contributorName || '').split('(')[0].trim().toLowerCase())
                    );
                    const legal = isCtvLegalReady(ctvObj);

                    return (
                      <div
                        key={t.id}
                        className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">
                                [Bước 5 - Chờ lập DNTT] {t.title}
                              </span>
                              <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {t.taskCode}
                              </span>
                              {legal.ready ? (
                                <span className="px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Đủ CCCD &amp; Hợp đồng ({ctvObj?.contractCode})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Chặn chi: {legal.missingReason}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              VJ: <strong className="text-slate-700">{t.contributorName}</strong> • Thù lao Gross:{' '}
                              <strong className="text-emerald-700 font-mono">{formatVnd(t.remuneration)}</strong>
                              {t.videoDeliverables?.publishedChannelUrl && (
                                <>
                                  {' '}
                                  •{' '}
                                  <a
                                    href={t.videoDeliverables.publishedChannelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline text-2xs"
                                  >
                                    Link bài đăng kênh Brand ↗
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {!legal.ready && onOpenCtvProfile && (
                            <button
                              type="button"
                              onClick={() => onOpenCtvProfile(ctvObj?.id)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              Bổ sung CCCD / HĐ →
                            </button>
                          )}
                          {ctvObj && (
                            <button
                              type="button"
                              onClick={() => openDnttSettlementModal(ctvObj)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs ${
                                legal.ready
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Lập phiếu DNTT &amp; Mã QR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BẢNG ĐIỀU PHỐI CÔNG VIỆC ĐANG CHẠY (ACTIVE JOBS)                    */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Clean Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã việc, tiêu đề, mã SKU, tên VJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none w-52 sm:w-72"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedContentPic}
                onChange={(e) => setSelectedContentPic(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white font-medium"
              >
                <option value="ALL">Tất cả Content (Team Việt Hoàng)</option>
                {SELF_CHANNEL_CONTENT_MEMBERS.map(m => (
                  <option key={m.id} value={m.name}>
                    Content: {m.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="ALL">Tất cả bước quy trình</option>
                <option value="OPEN_TASK">B1. Đề bài Content (Chờ Partnership chốt CTV)</option>
                <option value="BRAND_ORIENTATION_PENDING">B2. Chờ Brand duyệt VJ (48h)</option>
                <option value="SCRIPT_PENDING_REVIEW">B3. Chờ duyệt kịch bản (24h)</option>
                <option value="SCRIPT_APPROVED">B3. Đang quay &amp; dựng</option>
                <option value="DRAFT_VIDEO_SUBMITTED">B4A. Chờ QA nội bộ</option>
                <option value="INTERNAL_QA_PASSED">B4B. Chờ Brand nghiệm thu &amp; Đăng kênh</option>
                <option value="ACCEPTED_COMPLETED">B5. Đã nghiệm thu (Chờ lập DNTT)</option>
                <option value="PAID">B5. Đã quyết toán</option>
              </select>

              <select
                value={selectedSampleFilter}
                onChange={(e) => setSelectedSampleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="ALL">Tất cả trạng thái hàng mẫu</option>
                <option value="ON_HAND_AT_HOME">Sẵn mẫu tại nhà VJ</option>
                <option value="PENDING_SHIP">Chờ gửi mẫu (SLA 48h)</option>
                <option value="SHIPPING">Đang giao mẫu</option>
                <option value="DELIVERED">VJ đã nhận mẫu</option>
              </select>

              {!isCtvPartner && (
                <button
                  type="button"
                  onClick={() => setIsCtvSimulatorView(!isCtvSimulatorView)}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-semibold transition ${
                    isCtvSimulatorView
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isCtvSimulatorView ? 'Đang bật góc nhìn VJ nộp bài' : 'Mô phỏng góc nhìn VJ'}
                </button>
              )}
            </div>
          </div>

          {/* Simulator switcher when enabled */}
          {(isCtvSimulatorView || isCtvPartner) && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900">
                  Cổng làm việc của Cộng tác viên / VJ (Nhận việc, Nộp kịch bản, Gắn link video Google Drive):
                </span>
              </div>
              {!isCtvPartner && (
                <select
                  value={simulatedCtvId}
                  onChange={(e) => setSimulatedCtvId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-blue-200 bg-white text-slate-800 text-xs font-semibold"
                >
                  {contributors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.id} • Sẵn {(c.onHandProducts || []).length} SKU tại nhà)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
                Không tìm thấy đầu việc sản xuất video nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredTasks.map(task => {
                const daysLeft = getDaysUntilDeadline(task.deadline);
                const isUrgent = daysLeft < 5 && task.status !== 'ACCEPTED_COMPLETED' && task.status !== 'PAID';

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-2xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {task.taskCode}
                          </span>
                          {task.videoFormat && (
                            <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700">
                              {task.videoFormat}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 text-xs">{task.title}</span>
                          {renderStatusBadge(task.status)}
                          {task.status === 'OPEN_TASK' && (
                            <span
                              className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                                task.partnershipStatus === 'CONTACTING_CTV'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {task.partnershipStatus === 'CONTACTING_CTV'
                                ? `Partnership (${task.partnershipPic || 'Việt Hoàng'}): Đang liên hệ CTV`
                                : `Chờ Partnership (${task.partnershipPic || 'Việt Hoàng'}) tìm CTV`}
                            </span>
                          )}
                          {renderSampleBadge(task)}
                          {isUrgent && (
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Đơn gấp ({daysLeft} ngày)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          Nhãn: <strong className="text-slate-800">{task.brandName}</strong> • Pillar:{' '}
                          <strong className="text-blue-700">{task.pillarName}</strong> • SKU:{' '}
                          <span className="font-mono font-semibold text-slate-700">{task.linkedSku}</span> • Content đề bài:{' '}
                          <strong className="text-slate-900">{task.contentPic || 'Quỳnh Như'}</strong> • Partnership CTV:{' '}
                          <strong className="text-indigo-700">{task.partnershipPic || 'Việt Hoàng'}</strong> • VJ:{' '}
                          <strong className="text-slate-900">{task.contributorName || 'Chưa giao VJ'}</strong> • Thù lao:{' '}
                          <strong className="text-slate-900 font-mono">{formatVnd(task.remuneration)}</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                        <span className="text-2xs text-slate-500 flex items-center gap-1 mr-1">
                          <Calendar className="w-3 h-3" /> Hạn: {formatDate(task.deadline)}
                        </span>

                        {/* Nút Cập nhật Vận đơn Hàng mẫu (Bước 3 SOP) */}
                        {task.status !== 'PAID' && !isCtvPartner && !isCtvSimulatorView && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTask(task);
                              setSampleForm({
                                status: task.sampleShippingStatus || 'SHIPPING',
                                trackingCode: task.sampleTrackingCode || ''
                              });
                              setIsSampleShippingModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-2xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                          >
                            <Truck className="w-3 h-3" /> Mẫu 48h
                          </button>
                        )}

                        {/* Thao tác của CTV / VJ (Khi bật chế độ CTV hoặc mô phỏng CTV) */}
                        {(isCtvSimulatorView || isCtvPartner) && (
                          <>
                            {task.status === 'OPEN_TASK' && (
                              <button
                                type="button"
                                onClick={() => handleCtvClaimOpenTask(task)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                              >
                                Nhận đầu việc này
                              </button>
                            )}
                            {(task.status === 'BRAND_ORIENTATION_PENDING' ||
                              task.status === 'SCRIPT_REVISION' ||
                              !task.scriptContent) &&
                              task.status !== 'OPEN_TASK' &&
                              task.status !== 'ACCEPTED_COMPLETED' &&
                              task.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setCtvSubmitType('SCRIPT');
                                    setCtvScriptForm({
                                      hook: task.scriptContent?.hook || '',
                                      body: task.scriptContent?.body || '',
                                      cta: task.scriptContent?.cta || ''
                                    });
                                    setIsCtvSubmitModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition"
                                >
                                  Nộp kịch bản
                                </button>
                              )}
                            {(task.status === 'SCRIPT_APPROVED' || task.status === 'VIDEO_REVISION') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setCtvSubmitType('VIDEO');
                                  setCtvVideoForm({
                                    draftVideoUrl: task.videoDeliverables?.draftVideoUrl || '',
                                    durationSeconds: task.videoDeliverables?.durationSeconds || 45,
                                    captionSuggested: task.videoDeliverables?.captionSuggested || ''
                                  });
                                  setIsCtvSubmitModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                              >
                                Nộp link Video Demo (Drive)
                              </button>
                            )}
                          </>
                        )}

                        {/* Thao tác của Nội bộ B2C (Partnership Leader & Content) */}
                        {!isCtvPartner && !isCtvSimulatorView && (
                          <>
                            {task.status === 'OPEN_TASK' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePartnershipContacting(task)}
                                  className={`px-2.5 py-1.5 rounded-lg text-2xs font-semibold border transition ${
                                    task.partnershipStatus === 'CONTACTING_CTV'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {task.partnershipStatus === 'CONTACTING_CTV'
                                    ? 'Đang liên hệ CTV'
                                    : 'Partnership: Nhận tìm CTV'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openCreateOrAssignModal(task)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                                >
                                  Partnership: Chốt &amp; Giao CTV
                                </button>
                              </>
                            )}

                            {task.status === 'BRAND_ORIENTATION_PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleBrandOrientationDecision(task, 'AUTO_PASSED_72H')}
                                  className="px-2.5 py-1.5 rounded-lg text-2xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                                >
                                  Auto-Pass 72h
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBrandOrientationDecision(task, 'APPROVED')}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Brand đã duyệt VJ
                                </button>
                              </>
                            )}

                            {task.status === 'SCRIPT_PENDING_REVIEW' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsScriptReviewModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5" /> Duyệt kịch bản
                              </button>
                            )}

                            {task.status === 'DRAFT_VIDEO_SUBMITTED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setStoreDriveFolderInput(
                                    task.videoDeliverables?.storeDriveFolderUrl ||
                                      `https://drive.google.com/drive/folders/${task.storeId || 'store-b2c'}-oct2026`
                                  );
                                  setIsVideoQaModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> QA nội bộ
                              </button>
                            )}

                            {task.status === 'INTERNAL_QA_PASSED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setPublishedChannelUrlInput(
                                    task.videoDeliverables?.publishedChannelUrl ||
                                      `https://www.tiktok.com/@${task.brandId.replace('brand-', '')}.official/video/74250019283`
                                  );
                                  setIsBrandAcceptModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Nghiệm thu &amp; Đăng kênh
                              </button>
                            )}

                            {task.status === 'ACCEPTED_COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ctvObj = contributors.find(c => c.id === task.contributorId);
                                  if (ctvObj) openDnttSettlementModal(ctvObj);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <Wallet className="w-3.5 h-3.5" /> Lập DNTT
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Hàng thông tin phụ: Link Drive gian hàng & Link bài đăng kênh Brand nếu đã có */}
                    {(task.videoDeliverables?.storeDriveFolderUrl ||
                      task.videoDeliverables?.publishedChannelUrl ||
                      task.dnttCode) && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-2xs text-slate-500">
                        {task.videoDeliverables?.storeDriveFolderUrl && (
                          <a
                            href={task.videoDeliverables.storeDriveFolderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>Drive tổng gian hàng</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {task.videoDeliverables?.publishedChannelUrl && (
                          <a
                            href={task.videoDeliverables.publishedChannelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Bài đăng trên kênh Brand</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {task.dnttCode && (
                          <span className="font-mono text-slate-600">
                            Phiếu DNTT: <strong>{task.dnttCode}</strong> ({task.paymentRef})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BẢNG KÊ DNTT & QUYẾT TOÁN CTV (HISTORY & SETTLEMENT)               */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Khối 1: Tổng hợp công nợ chờ lập Đề nghị thanh toán (DNTT) theo từng CTV */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-semibold text-slate-900">
                  Tổng hợp Đề nghị thanh toán (DNTT) &amp; Khấu trừ thuế TNCN 10% theo CTV / VJ
                </h2>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Chỉ cho phép lập phiếu DNTT khi CTV đã có đủ CCCD và Hợp đồng dịch vụ còn hiệu lực tại Danh bạ CTV / VJ. Khấu trừ 10% thuế TNCN nếu tổng đợt chi trả từ 2.000.000 đ trở lên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => notify('Đã xuất bảng kê đối soát thù lao CTV tháng 10/2026!')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Xuất Bảng kê Kế toán</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold text-2xs">
                    <th className="py-2.5 px-3">Mã &amp; Họ tên CTV / VJ</th>
                    <th className="py-2.5 px-3">Hồ sơ Pháp lý &amp; Hợp đồng</th>
                    <th className="py-2.5 px-3 text-center">Video chờ chi</th>
                    <th className="py-2.5 px-3 text-right">Tổng Gross chờ chi</th>
                    <th className="py-2.5 px-3 text-right">Thuế TNCN (10%)</th>
                    <th className="py-2.5 px-3 text-right">Thực nhận (Net)</th>
                    <th className="py-2.5 px-3 text-right">Thao tác Kế toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ctvSettlementSummaries.map(({ ctv, pendingTasks, pendingGross, pitTax, netPayout, legalStatus }) => (
                    <tr key={ctv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{ctv.name}</div>
                        <div className="text-2xs text-slate-500 font-mono">
                          {ctv.code || ctv.id} • {ctv.bankName} ({ctv.bankAccount})
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {legalStatus.ready ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Đủ CCCD &amp; HĐ ({ctv.contractCode})
                            </span>
                            <span className="block text-2xs text-slate-400">MST: {ctv.taxCode || 'Đã khai báo'}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700">
                              <AlertTriangle className="w-3 h-3" /> {legalStatus.missingReason}
                            </span>
                            {onOpenCtvProfile && (
                              <button
                                type="button"
                                onClick={() => onOpenCtvProfile(ctv.id)}
                                className="block text-2xs font-semibold text-blue-600 hover:underline"
                              >
                                Mở hồ sơ CTV để bổ sung →
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800">
                        {pendingTasks.length} video
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatVnd(pendingGross)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {pitTax > 0 ? `- ${formatVnd(pitTax)}` : '0 đ'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatVnd(netPayout)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {pendingTasks.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => openDnttSettlementModal(ctv)}
                            className={`px-3 py-1.5 rounded-lg text-2xs font-semibold transition inline-flex items-center gap-1 ${
                              legalStatus.ready
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Lập DNTT &amp; Mã QR</span>
                          </button>
                        ) : (
                          <span className="text-2xs text-slate-400">Không có công nợ tồn</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Khối 2: Chi tiết từng Video đã nghiệm thu & lịch sử giải ngân */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-900">
              Chi tiết các Video đã nghiệm thu &amp; Lịch sử phiếu DNTT
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-2xs">
                    <th className="py-2.5 px-3">MÃ VIỆC</th>
                    <th className="py-2.5 px-3">TIÊU ĐỀ &amp; LINK ĐĂNG KÊNH</th>
                    <th className="py-2.5 px-3">CTV / VJ</th>
                    <th className="py-2.5 px-3">NGÀY NGHIỆM THU</th>
                    <th className="py-2.5 px-3 text-right">THÙ LAO GROSS</th>
                    <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                    <th className="py-2.5 px-3 text-right">MÃ DNTT / UNC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks
                    .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
                    .map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/40 transition">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-500 text-2xs">
                          {task.taskCode}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{task.title}</div>
                          <div className="text-2xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{task.brandName} • SKU: {task.linkedSku}</span>
                            {task.videoDeliverables?.publishedChannelUrl && (
                              <a
                                href={task.videoDeliverables.publishedChannelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                Xem bài đăng kênh ↗
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{task.contributorName}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-2xs">
                          {formatDate(task.acceptedAt || task.createdAt)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatVnd(task.remuneration)}
                        </td>
                        <td className="py-3 px-3 text-center">{renderStatusBadge(task.status)}</td>
                        <td className="py-3 px-3 text-right font-mono text-2xs text-slate-600">
                          {task.dnttCode ? (
                            <div>
                              <span className="font-semibold text-slate-800 block">{task.dnttCode}</span>
                              <span className="text-slate-400">{task.paymentRef}</span>
                            </div>
                          ) : (
                            <span className="text-amber-700 font-sans font-medium">Chờ lập DNTT</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NĂNG LỰC & TỒN MẪU VJ (CONTRIBUTORS ROSTER)                        */}
      {/* ========================================================================= */}
      {activeTab === 'CONTRIBUTORS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900">
                Mạng lưới CTV / VJ &amp; Sản phẩm mẫu đang cầm sẵn tại nhà
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Tra cứu nhanh đơn giá, công suất tháng và các mã SKU VJ đang giữ sẵn để điều phối các đơn hàng gấp &lt; 5 ngày
              </p>
            </div>
            {onOpenCtvProfile && (
              <button
                type="button"
                onClick={() => onOpenCtvProfile()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" /> Mở Danh bạ &amp; Hồ sơ chuyên sâu CTV →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributors.map(ctv => {
              const legal = isCtvLegalReady(ctv);
              return (
                <div
                  key={ctv.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={ctv.name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900 text-xs truncate">{ctv.name}</h4>
                          <span className="text-xs font-semibold text-amber-600 flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {ctv.ratingScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-2xs font-mono text-slate-500">{ctv.code || ctv.id}</span>
                          <span className="text-2xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {ctv.role === 'ALL_IN_ONE'
                              ? 'Quay dựng trọn gói'
                              : ctv.role === 'VIDEO_EDITOR'
                              ? 'Dựng phim'
                              : 'VJ / Diễn viên'}
                          </span>
                          <span
                            className={`text-2xs font-medium px-1.5 py-0.5 rounded ${
                              legal.ready
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {legal.ready ? 'Đủ pháp lý' : 'Thiếu CCCD/HĐ'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-2xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>Đơn giá trọn gói:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatVnd(ctv.unitRateAllInOne || 1500000)}/video
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>PIC Content:</span>
                        <span className="font-medium text-slate-800">{ctv.contentPic || 'Lê Phương Thảo'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sẵn mẫu tại nhà (Nhận đơn gấp &lt;5 ngày):</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {(ctv.onHandProducts || []).length} SKU
                        </span>
                      </div>
                    </div>

                    {(ctv.onHandProducts || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(ctv.onHandProducts || []).map(sku => (
                          <span
                            key={sku}
                            className="px-2 py-0.5 rounded text-2xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {sku}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 block">Đã bàn giao:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {ctv.completedTaskCount}/{ctv.monthlyCapacityVideos || 15} video
                      </span>
                    </div>
                    {onOpenCtvProfile && (
                      <button
                        type="button"
                        onClick={() => onOpenCtvProfile(ctv.id)}
                        className="text-2xs font-semibold text-blue-600 hover:underline"
                      >
                        Xem hồ sơ CTV →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: TRAO ĐỔI NHANH (DISCUSSION)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl flex flex-col h-[540px] overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center text-xs">
                VJ
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">
                  Trao đổi sản xuất: VJ / CTV ⇄ Chuyên viên Content B2C
                </h4>
                <p className="text-2xs text-slate-500">
                  Giải đáp kịch bản, xác nhận vận đơn hàng mẫu 48h, góp ý góc quay và âm thanh
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/20">
            {ctvChatMessages.map(msg => {
              const isCtv = msg.sender === 'CTV';
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isCtv ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-2xs text-white shrink-0 ${
                      isCtv ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    {isCtv ? 'VJ' : 'B2C'}
                  </div>
                  <div className={`max-w-[70%] space-y-1 ${isCtv ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`flex items-center gap-2 text-2xs text-slate-400 ${
                        isCtv ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl leading-relaxed text-xs ${
                        isCtv
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendCtvChat} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newCtvChatText}
              onChange={(e) => setNewCtvChatText(e.target.value)}
              placeholder="Nhập nội dung trao đổi với nhóm sản xuất..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newCtvChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TẠO HOẶC GIAO TASK VIDEO (CÓ CHECK ĐƠN GẤP < 5 NGÀY)    */}
      {/* ============================================================== */}
      <Presence show={!!isCreateTaskModalOpen}>
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                {selectedTask
                  ? `Phân bổ VJ & Điều phối: ${selectedTask.taskCode}`
                  : 'Giao việc sản xuất Video kênh Brand (Self-Channel)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateTaskModalOpen(false);
                  setSelectedTask(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Tiêu đề / Góc kịch bản video *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Test thực tế bôi dịu chàm sữa sau 72h..."
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Trụ cột nội dung (Content Pillar) *</label>
                  <select
                    value={newTaskForm.pillarId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const p = activeAllocation.pillars.find(item => item.id === pid);
                      setNewTaskForm(prev => ({
                        ...prev,
                        pillarId: pid,
                        linkedSku: p?.coreSkuIds?.[0] || prev.linkedSku,
                        remuneration: p ? p.unitCostPerVideo : prev.remuneration
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    {activeAllocation.pillars.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatVnd(p.unitCostPerVideo)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Định dạng Video (Format)</label>
                  <select
                    value={newTaskForm.videoFormat}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, videoFormat: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Review voice">Review voice (Lồng tiếng chuyên sâu)</option>
                    <option value="Unbox Voice">Unbox Voice (Đập hộp &amp; Test chất)</option>
                    <option value="POV">POV (Tình huống gia đình / Đời thường)</option>
                    <option value="Nhạc text">Nhạc text (Bắt trend / Biến hình)</option>
                    <option value="Daily">Daily (Hàng ngày lên kênh)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Mã SKU sản phẩm *</label>
                  <input
                    type="text"
                    required
                    value={newTaskForm.linkedSku}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, linkedSku: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Thù lao Gross (VNĐ) *</label>
                  <input
                    type="number"
                    value={newTaskForm.remuneration}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, remuneration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-blue-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Hạn bàn giao *</label>
                  <input
                    type="date"
                    required
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Phân công nội bộ: Chuyên viên Content (Dưới quyền Việt Hoàng) & Partnership Leader (Việt Hoàng) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Chuyên viên Content (Lên đề bài &amp; Duyệt kịch bản)
                  </label>
                  <select
                    value={newTaskForm.contentPic}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, contentPic: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-900"
                  >
                    {SELF_CHANNEL_CONTENT_MEMBERS.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} (Báo cáo: Việt Hoàng)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Leader Partnership (Liên hệ &amp; Chốt CTV)
                  </label>
                  <div className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-900 font-semibold flex items-center justify-between">
                    <span>{SELF_CHANNEL_PARTNERSHIP_LEADER.name} (Leader)</span>
                    <span className="text-2xs font-medium text-indigo-700">Chuyên trách CTV</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Partnership chỉ định CTV / VJ thực hiện
                  </label>
                  <select
                    value={newTaskForm.contributorId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const ctv = contributors.find(c => c.id === cid);
                      setNewTaskForm(prev => ({
                        ...prev,
                        contributorId: cid,
                        remuneration: ctv?.unitRateAllInOne || prev.remuneration
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Chưa chỉ định (Gửi yêu cầu để Việt Hoàng liên hệ CTV) --</option>
                    {contributors.map(c => {
                      const hasSku = (c.onHandProducts || []).some(
                        s => s.toUpperCase() === newTaskForm.linkedSku.trim().toUpperCase()
                      );
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({hasSku ? '✓ Sẵn mẫu tại nhà' : 'Chưa có mẫu'} •{' '}
                          {formatVnd(c.unitRateAllInOne || 1500000)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Cơ chế duyệt với Nhãn hàng (SOP B2)</label>
                  <select
                    value={newTaskForm.brandApprovalMode}
                    onChange={(e) =>
                      setNewTaskForm(prev => ({
                        ...prev,
                        brandApprovalMode: e.target.value as BrandApprovalMode
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="BRAND_REVIEW_REQUIRED">Trình Brand duyệt VJ &amp; góc kịch bản (SLA 48h)</option>
                    <option value="UPBASE_DELEGATED">Brand ủy quyền — Upbase chủ động duyệt</option>
                  </select>
                </div>
              </div>

              {/* Cảnh báo kiểm soát SLA Đơn gấp < 5 ngày */}
              {createTaskUrgencyCheck.isUrgentUnder5Days && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    createTaskUrgencyCheck.isBlockedByUrgentNoStock
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Đơn hàng gấp dưới 5 ngày (Còn {createTaskUrgencyCheck.daysLeft} ngày đến hạn bàn giao)
                    </span>
                  </div>
                  {createTaskUrgencyCheck.isBlockedByUrgentNoStock ? (
                    <p className="text-2xs leading-relaxed">
                      Chốt chặn SLA: VJ <strong>{createTaskUrgencyCheck.selectedCtv?.name}</strong> hiện{' '}
                      <strong>chưa có sẵn mã {newTaskForm.linkedSku} tại nhà</strong>, không kịp thời gian gửi hàng mẫu
                      vật lý (48h). Vui lòng chọn VJ đang cầm sẵn mẫu bên dưới hoặc lùi hạn bàn giao!
                    </p>
                  ) : (
                    <p className="text-2xs">
                      Đơn hàng gấp yêu cầu giao cho VJ đã cầm sẵn sản phẩm mẫu <strong>{newTaskForm.linkedSku}</strong>{' '}
                      tại nhà.
                    </p>
                  )}

                  {createTaskUrgencyCheck.readyVjsWithSku.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-2xs font-medium">Chọn nhanh VJ sẵn mẫu {newTaskForm.linkedSku}:</span>
                      {createTaskUrgencyCheck.readyVjsWithSku.map(vj => (
                        <button
                          key={vj.id}
                          type="button"
                          onClick={() =>
                            setNewTaskForm(prev => ({
                              ...prev,
                              contributorId: vj.id,
                              remuneration: vj.unitRateAllInOne || prev.remuneration
                            }))
                          }
                          className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 font-semibold text-2xs hover:bg-emerald-50"
                        >
                          {vj.name} ✓
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateTaskModalOpen(false);
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedTask ? 'Lưu & Giao việc' : 'Khởi tạo đầu việc'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 2: NHẬN CHỈ TIÊU TỪ KẾ HOẠCH THÁNG (SYNC PLAN MODAL)      */}
      {/* ============================================================== */}
      <Presence show={!!isSyncPlanModalOpen}>
      {isSyncPlanModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Nhận chỉ tiêu Video kênh Brand từ Kế hoạch tháng 10/2026
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Tự động sinh các slot sản xuất video theo hạn mức Self-Channel đã được Trưởng phòng phê duyệt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncPlanModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSyncFromMonthlyPlan} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Chọn Thương hiệu / Gian hàng nhận chỉ tiêu</label>
                <select
                  value={syncPlanBrandId}
                  onChange={(e) => setSyncPlanBrandId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                >
                  {MULTI_BRAND_ALLOCATIONS.map(b => (
                    <option key={b.brandId} value={b.brandId}>
                      {b.brandName} — Chỉ tiêu: {b.targetSelfChannelVideos} video ({formatVnd(b.budgetSelfChannel)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Định dạng Video cần sinh</label>
                  <select
                    value={syncVideoFormat}
                    onChange={(e) => setSyncVideoFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <option value="Review voice">Review voice</option>
                    <option value="Unbox Voice">Unbox Voice</option>
                    <option value="POV">POV gia đình</option>
                    <option value="Nhạc text">Nhạc text</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Số lượng slot tạo đợt này</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={syncBatchQty}
                    onChange={(e) => setSyncBatchQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSyncPlanModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  Sinh {syncBatchQty} slot công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 3: CẬP NHẬT VẬN ĐƠN HÀNG MẪU (SLA 48H)                    */}
      {/* ============================================================== */}
      <Presence show={!!(isSampleShippingModalOpen && selectedTask)}>
      {isSampleShippingModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Hậu cần gửi hàng mẫu (SLA 48h): {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  VJ: <strong>{selectedTask.contributorName || 'Chưa gán'}</strong> • SKU:{' '}
                  <span className="font-mono">{selectedTask.linkedSku}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSampleShippingModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSampleShipping} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Trạng thái hàng mẫu</label>
                <select
                  value={sampleForm.status}
                  onChange={(e) =>
                    setSampleForm(prev => ({ ...prev, status: e.target.value as SampleShippingStatus }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="ON_HAND_AT_HOME">VJ đã có sẵn mẫu tại nhà (Không cần gửi)</option>
                  <option value="PENDING_SHIP">Chờ kho / Brand gửi mẫu (SLA 48h)</option>
                  <option value="SHIPPING">Đang giao hàng (Đã có mã vận đơn)</option>
                  <option value="DELIVERED">VJ đã nhận được hàng mẫu (Tự động cộng vào tồn mẫu VJ)</option>
                </select>
              </div>

              {(sampleForm.status === 'SHIPPING' || sampleForm.status === 'DELIVERED') && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Mã vận đơn (SPX / GHN / ViettelPost)</label>
                  <input
                    type="text"
                    placeholder="VD: SPXVN048291823"
                    value={sampleForm.trackingCode}
                    onChange={(e) => setSampleForm(prev => ({ ...prev, trackingCode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono bg-slate-50"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSampleShippingModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Lưu trạng thái mẫu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 4: DUYỆT KỊCH BẢN (SCRIPT REVIEW MODAL - SLA 24H)         */}
      {/* ============================================================== */}
      <Presence show={!!(isScriptReviewModalOpen && selectedTask)}>
      {isScriptReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Duyệt Kịch bản chi tiết (SLA 24h): {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  VJ: <strong>{selectedTask.contributorName}</strong> • {selectedTask.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScriptReviewModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                <span className="font-semibold text-slate-800 block text-xs">Nội dung kịch bản VJ đã nộp:</span>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-blue-700 block text-2xs">1. Hook 3 giây đầu:</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5">
                      {selectedTask.scriptContent?.hook || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700 block text-2xs">2. Thân bài / Demo sản phẩm:</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5 whitespace-pre-line">
                      {selectedTask.scriptContent?.body || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700 block text-2xs">3. Kêu gọi hành động (CTA):</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5">
                      {selectedTask.scriptContent?.cta || 'Chưa nộp'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="font-semibold text-slate-700 block">Quyết định duyệt kịch bản:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScriptVerdict('APPROVED')}
                    className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                      scriptVerdict === 'APPROVED'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    Duyệt kịch bản (Cho bấm máy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScriptVerdict('REVISE')}
                    className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                      scriptVerdict === 'REVISE'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                    Yêu cầu sửa kịch bản
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Góp ý cụ thể</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú cụ thể các câu thoại cần sửa, góc quay bổ sung..."
                  value={scriptFeedbackText}
                  onChange={(e) => setScriptFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScriptReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveScriptReview}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-2xs transition flex items-center gap-1.5 ${
                    scriptVerdict === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> Xác nhận phản hồi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 5: VÒNG 1 — DUYỆT QA VIDEO NỘI BỘ & LƯU DRIVE GIAN HÀNG  */}
      {/* ============================================================== */}
      <Presence show={!!(isVideoQaModalOpen && selectedTask)}>
      {isVideoQaModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Vòng 1 — Duyệt QA Nội bộ &amp; Lưu Drive Gian hàng: {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Phiên bản: v{selectedTask.videoDeliverables?.currentVersion || 1} • VJ:{' '}
                  <strong>{selectedTask.contributorName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoQaModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Link Video Demo VJ đã nộp:</span>
                  <a
                    href={selectedTask.videoDeliverables?.draftVideoUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-2xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {selectedTask.videoDeliverables?.draftVideoUrl || 'Đang cập nhật link'}{' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-2xs font-semibold px-2 py-1 rounded bg-white text-slate-700 border border-slate-200 font-mono">
                  {selectedTask.videoDeliverables?.durationSeconds || 45}s
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Checklist Kiểm định chất lượng nội bộ Content B2C:
                </span>
                <div className="space-y-1.5 text-2xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.hookCompliant}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, hookCompliant: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span>3 giây đầu gây tò mò / giật hook đúng kịch bản</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.productAppearance}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, productAppearance: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span>Sản phẩm xuất hiện rõ nét, ánh sáng và màu sắc chân thực, file sạch không dính watermark</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.audioClear}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, audioClear: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span>Âm thanh, giọng lồng tiếng to rõ, nhạc nền không lấn át lời nói</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.guidelinesFollowed}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, guidelinesFollowed: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span>Tuân thủ đúng quy tắc Do &amp; Don&apos;ts và không vi phạm từ khóa cấm của sàn</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Link Thư mục Drive tổng của Gian hàng (Bàn giao cho Brand &amp; Media)
                </label>
                <input
                  type="url"
                  value={storeDriveFolderInput}
                  onChange={(e) => setStoreDriveFolderInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-2xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVideoVerdict('APPROVED')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    videoVerdict === 'APPROVED'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  Đạt QA Nội bộ (Trình Brand)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoVerdict('REVISE')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    videoVerdict === 'REVISE'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                  Yêu cầu VJ dựng lại
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Nhận xét QA nội bộ</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ đoạn giây cần cắt, text cần sửa hoặc ghi chú bàn giao..."
                  value={videoFeedbackText}
                  onChange={(e) => setVideoFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVideoQaModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveVideoQa}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-2xs transition flex items-center gap-1.5 ${
                    videoVerdict === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Lưu kết quả QA Vòng 1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 6: VÒNG 2 — BRAND NGHIỆM THU & GẮN LINK ĐĂNG KÊNH         */}
      {/* ============================================================== */}
      <Presence show={!!(isBrandAcceptModalOpen && selectedTask)}>
      {isBrandAcceptModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  Vòng 2 — Brand Nghiệm thu &amp; Đăng kênh: {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  VJ: <strong>{selectedTask.contributorName}</strong> • Thù lao:{' '}
                  <strong>{formatVnd(selectedTask.remuneration)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandAcceptModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between text-2xs">
                  <span className="text-slate-500">QA Nội bộ duyệt bởi:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.videoDeliverables?.internalQaApprovedBy || 'Content B2C'}
                  </span>
                </div>
                <div className="flex justify-between text-2xs">
                  <span className="text-slate-500">Thư mục Drive Gian hàng:</span>
                  <a
                    href={selectedTask.videoDeliverables?.storeDriveFolderUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-mono"
                  >
                    Mở Drive tổng ↗
                  </a>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Link bài đăng thực tế trên kênh TikTok / Shopee Video của Brand *
                </label>
                <input
                  type="url"
                  placeholder="https://www.tiktok.com/@brand.official/video/..."
                  value={publishedChannelUrlInput}
                  onChange={(e) => setPublishedChannelUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-2xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBrandAcceptVerdict('APPROVED')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    brandAcceptVerdict === 'APPROVED'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  Nghiệm thu &amp; Đủ điều kiện chi
                </button>
                <button
                  type="button"
                  onClick={() => setBrandAcceptVerdict('REVISE')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    brandAcceptVerdict === 'REVISE'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                  Brand yêu cầu sửa lại
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Ghi chú nghiệm thu</label>
                <textarea
                  rows={2}
                  value={brandAcceptComment}
                  onChange={(e) => setBrandAcceptComment(e.target.value)}
                  placeholder="Ghi chú nghiệm thu của Brand hoặc mã bàn giao chạy Ads..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBrandAcceptModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveBrandAcceptance}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                >
                  Xác nhận hoàn tất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 7: CỔNG CTV NỘP KỊCH BẢN / LINK VIDEO DEMO               */}
      {/* ============================================================== */}
      <Presence show={!!(isCtvSubmitModalOpen && selectedTask)}>
      {isCtvSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {ctvSubmitType === 'SCRIPT'
                  ? `Nộp Kịch bản chi tiết: ${selectedTask.taskCode}`
                  : `Nộp Link Video Demo (Google Drive): ${selectedTask.taskCode}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsCtvSubmitModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCtvSubmitDeliverable} className="p-6 space-y-4 text-xs">
              {ctvSubmitType === 'SCRIPT' ? (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">1. Hook 3 giây đầu *</label>
                    <input
                      type="text"
                      required
                      value={ctvScriptForm.hook}
                      onChange={(e) => setCtvScriptForm(prev => ({ ...prev, hook: e.target.value }))}
                      placeholder="Câu mở đầu giữ chân người xem..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">2. Thân bài &amp; Cảnh quay thực nghiệm *</label>
                    <textarea
                      rows={3}
                      required
                      value={ctvScriptForm.body}
                      onChange={(e) => setCtvScriptForm(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Mô tả chi tiết cảnh quay, lời thoại và USP sản phẩm..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">3. Kêu gọi hành động (CTA)</label>
                    <input
                      type="text"
                      value={ctvScriptForm.cta}
                      onChange={(e) => setCtvScriptForm(prev => ({ ...prev, cta: e.target.value }))}
                      placeholder="Nhấn giỏ hàng góc trái..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Link Google Drive chứa file Video *</label>
                    <input
                      type="url"
                      required
                      value={ctvVideoForm.draftVideoUrl}
                      onChange={(e) => setCtvVideoForm(prev => ({ ...prev, draftVideoUrl: e.target.value }))}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono bg-slate-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 block">Thời lượng (giây)</label>
                      <input
                        type="number"
                        value={ctvVideoForm.durationSeconds}
                        onChange={(e) =>
                          setCtvVideoForm(prev => ({ ...prev, durationSeconds: Number(e.target.value) }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 block">Caption gợi ý đăng kênh</label>
                      <input
                        type="text"
                        value={ctvVideoForm.captionSuggested}
                        onChange={(e) => setCtvVideoForm(prev => ({ ...prev, captionSuggested: e.target.value }))}
                        placeholder="#kutieskin #chamsocdabe..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCtvSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Gửi bài nộp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ============================================================== */}
      {/* MODAL 8: LẬP PHIẾU ĐỀ NGHỊ THANH TOÁN (DNTT) & MÃ QR           */}
      {/* ============================================================== */}
      <Presence show={!!(isDnttModalOpen && dnttTargetCtv)}>
      {isDnttModalOpen && dnttTargetCtv && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Phiếu Đề Nghị Thanh Toán (DNTT) — {dnttTargetCtv.name}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Mã CTV: <span className="font-mono">{dnttTargetCtv.code || dnttTargetCtv.id}</span> • Hợp đồng:{' '}
                  <span className="font-mono font-semibold text-emerald-700">{dnttTargetCtv.contractCode}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDnttModalOpen(false);
                  setDnttTargetCtv(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {(() => {
              const unpaidTasks = tasks.filter(
                t =>
                  t.status === 'ACCEPTED_COMPLETED' &&
                  (t.contributorId === dnttTargetCtv.id ||
                    t.contributorName
                      ?.toLowerCase()
                      .includes(dnttTargetCtv.name.split('(')[0].trim().toLowerCase()))
              );
              const grossTotal = unpaidTasks.reduce((s, t) => s + t.remuneration, 0);
              const pitTax = grossTotal >= 2000000 ? Math.round(grossTotal * 0.1) : 0;
              const netTotal = grossTotal - pitTax;

              return (
                <div className="p-6 space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="font-semibold text-slate-800">
                      Danh sách video nghiệm thu đưa vào đợt thanh toán ({unpaidTasks.length} video):
                    </div>
                    <div className="divide-y divide-slate-200/60">
                      {unpaidTasks.map(u => (
                        <div key={u.id} className="py-1.5 flex items-center justify-between text-2xs">
                          <div>
                            <span className="font-mono font-semibold text-slate-700">{u.taskCode}</span> —{' '}
                            <span className="text-slate-700">{u.title}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-900">{formatVnd(u.remuneration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="p-3.5 rounded-xl border border-slate-200 text-center space-y-1.5">
                      <div className="w-24 h-24 mx-auto rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-slate-800" />
                      </div>
                      <p className="font-mono font-semibold text-slate-900 text-xs">{dnttTargetCtv.bankAccount}</p>
                      <p className="text-2xs text-slate-500">
                        {dnttTargetCtv.bankName} • {dnttTargetCtv.bankAccountName}
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CCCD pháp lý:</span>
                        <span className="font-mono font-medium text-slate-800">{dnttTargetCtv.cccd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mã số thuế TNCN:</span>
                        <span className="font-mono font-medium text-slate-800">{dnttTargetCtv.taxCode || '—'}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-100">
                        <span className="text-slate-600">Tổng thù lao Gross:</span>
                        <span className="font-mono font-semibold text-slate-900">{formatVnd(grossTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Khấu trừ thuế TNCN (10%):</span>
                        <span className="font-mono font-semibold text-rose-600">
                          {pitTax > 0 ? `- ${formatVnd(pitTax)}` : '0 đ (< 2M)'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                        <span className="font-semibold text-slate-900">Thực nhận (Net):</span>
                        <span className="font-mono font-bold text-emerald-700">{formatVnd(netTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDnttModalOpen(false);
                        setDnttTargetCtv(null);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDnttBatchPayout}
                      className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Xác nhận Lập DNTT &amp; Đã giải ngân
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
