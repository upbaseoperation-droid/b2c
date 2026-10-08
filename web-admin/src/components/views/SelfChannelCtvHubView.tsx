'use client';

import React, { useState, useMemo } from 'react';
import {
  Video,
  Film,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Plus,
  Search,
  Filter,
  Play,
  ExternalLink,
  Download,
  FileText,
  Check,
  X,
  Eye,
  User,
  Star,
  DollarSign,
  Calendar,
  ArrowRight,
  Layers,
  Award,
  Tag,
  ChevronDown,
  CheckCheck,
  RefreshCw,
  Send,
  ThumbsUp,
  Building2,
  Wallet,
  FileCheck,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import {
  SelfChannelContentPillar,
  BrandChannelAllocation,
  Contributor,
  SelfChannelVideoTask,
  VideoTaskStatus,
  UserProfile,
  BrandDetail
} from '../../lib/types';
import {
  DEFAULT_CONTENT_PILLARS,
  MOCK_BRAND_ALLOCATION,
  INITIAL_CONTRIBUTORS,
  INITIAL_SELF_CHANNEL_TASKS
} from '../../lib/selfChannelData';

interface SelfChannelCtvHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenPushProducts?: () => void;
}

export const SelfChannelCtvHubView: React.FC<SelfChannelCtvHubViewProps> = ({
  currentUser,
  brands = [],
  onNotify,
  onOpenPushProducts
}) => {
  // Master State
  const [allocation, setAllocation] = useState<BrandChannelAllocation>(MOCK_BRAND_ALLOCATION);
  const [tasks, setTasks] = useState<SelfChannelVideoTask[]>(INITIAL_SELF_CHANNEL_TASKS);
  const [contributors, setContributors] = useState<Contributor[]>(INITIAL_CONTRIBUTORS);

  // Tab State: 'PIPELINE' | 'CTV_PORTAL' | 'CONTRIBUTORS' | 'SETTLEMENT'
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'CTV_PORTAL' | 'CONTRIBUTORS' | 'SETTLEMENT'>('PIPELINE');

  // Filter States
  const [selectedPillarId, setSelectedPillarId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedContributorId, setSelectedContributorId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active CTV Simulator State for 'CTV_PORTAL' view
  const [simulatedCtvId, setSimulatedCtvId] = useState<string>(INITIAL_CONTRIBUTORS[0].id);

  // Modal States
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isScriptReviewModalOpen, setIsScriptReviewModalOpen] = useState(false);
  const [isVideoQaModalOpen, setIsVideoQaModalOpen] = useState(false);
  const [isAddContributorModalOpen, setIsAddContributorModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SelfChannelVideoTask | null>(null);

  // Form: Create Task
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    pillarId: DEFAULT_CONTENT_PILLARS[0].id,
    linkedSku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    remuneration: 1500000,
    deadline: '2026-10-25',
    contributorId: '',
    briefNotes: ''
  });

  // Form: Script Review & Feedback
  const [scriptFeedbackText, setScriptFeedbackText] = useState('');
  const [scriptVerdict, setScriptVerdict] = useState<'APPROVED' | 'REVISE'>('APPROVED');

  // Form: Video QA & Feedback
  const [videoFeedbackText, setVideoFeedbackText] = useState('');
  const [videoVerdict, setVideoVerdict] = useState<'APPROVED' | 'REVISE'>('APPROVED');
  const [videoChecklist, setVideoChecklist] = useState({
    hookCompliant: true,
    productAppearance: true,
    audioClear: true,
    guidelinesFollowed: true
  });

  // Form: New Contributor
  const [newContributorForm, setNewContributorForm] = useState({
    name: '',
    phone: '',
    email: '',
    channelLink: '',
    niche: 'Mẹ & Bé, Chăm Da',
    role: 'ALL_IN_ONE' as Contributor['role'],
    bankName: 'Techcombank',
    bankAccount: '',
    bankAccountName: '',
    notes: ''
  });

  // Helper: notify
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

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

  // Stats Calculations
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID').length;
    const inProgressTasks = tasks.filter(t => t.status === 'SCRIPT_APPROVED' || t.status === 'DRAFT_VIDEO_SUBMITTED').length;
    const scriptPendingTasks = tasks.filter(t => t.status === 'SCRIPT_PENDING_REVIEW').length;
    const openTasks = tasks.filter(t => t.status === 'OPEN_TASK').length;

    const totalSpent = tasks
      .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const pendingPayment = tasks
      .filter(t => t.status === 'ACCEPTED_COMPLETED')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const paidTotal = tasks
      .filter(t => t.status === 'PAID')
      .reduce((sum, t) => sum + t.remuneration, 0);

    const targetVideos = allocation.targetSelfChannelVideos;
    const budgetTotal = allocation.budgetSelfChannel;
    const progressPercent = Math.round((completedTasks / targetVideos) * 100);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      scriptPendingTasks,
      openTasks,
      totalSpent,
      pendingPayment,
      paidTotal,
      targetVideos,
      budgetTotal,
      progressPercent
    };
  }, [tasks, allocation]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedPillarId !== 'ALL' && t.pillarId !== selectedPillarId) return false;
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (selectedContributorId !== 'ALL' && t.contributorId !== selectedContributorId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = t.taskCode.toLowerCase().includes(q);
        const matchSku = (t.linkedSku || '').toLowerCase().includes(q);
        const matchCtv = (t.contributorName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchSku && !matchCtv) return false;
      }
      return true;
    });
  }, [tasks, selectedPillarId, selectedStatus, selectedContributorId, searchQuery]);

  // Status Badge Helper
  const renderStatusBadge = (status: VideoTaskStatus) => {
    switch (status) {
      case 'OPEN_TASK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Mở nhận task
          </span>
        );
      case 'SCRIPT_PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <FileText className="w-3 h-3 text-amber-600" />
            Chờ duyệt kịch bản
          </span>
        );
      case 'SCRIPT_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Sửa kịch bản
          </span>
        );
      case 'SCRIPT_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Video className="w-3 h-3 text-blue-600" />
            Đang quay & dựng
          </span>
        );
      case 'DRAFT_VIDEO_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Play className="w-3 h-3 text-indigo-600" />
            Chờ duyệt video
          </span>
        );
      case 'VIDEO_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Sửa video nháp
          </span>
        );
      case 'ACCEPTED_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nghiệm thu (Chờ chi)
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Wallet className="w-3 h-3 text-purple-600" />
            Đã quyết toán
          </span>
        );
    }
  };

  // Action: Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      notify('Vui lòng nhập tiêu đề task video!', 'warning');
      return;
    }

    const selectedPillar = allocation.pillars.find(p => p.id === newTaskForm.pillarId) || allocation.pillars[0];
    const assignedCtv = contributors.find(c => c.id === newTaskForm.contributorId);

    const newTask: SelfChannelVideoTask = {
      id: `task-sc-${Date.now()}`,
      taskCode: `SC-KUTI-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(tasks.length + 1).padStart(2, '0')}`,
      title: newTaskForm.title.trim(),
      brandId: allocation.brandId,
      brandName: allocation.brandName,
      storeId: 'store-kutieskin-tts',
      storeName: 'Kutieskin Official Store (TikTok)',
      pillarId: selectedPillar.id,
      pillarName: selectedPillar.name,
      pillarCode: selectedPillar.code,
      linkedSku: newTaskForm.linkedSku,
      productName: newTaskForm.productName,
      remuneration: Number(newTaskForm.remuneration) || selectedPillar.unitCostPerVideo,
      deadline: newTaskForm.deadline,
      contributorId: assignedCtv?.id,
      contributorName: assignedCtv?.name,
      contributorAvatar: assignedCtv?.avatar,
      status: assignedCtv ? 'SCRIPT_APPROVED' : 'OPEN_TASK',
      feedbackLogs: [],
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    setIsCreateTaskModalOpen(false);
    setNewTaskForm({
      title: '',
      pillarId: DEFAULT_CONTENT_PILLARS[0].id,
      linkedSku: 'KUTIE-SOOTH-30G',
      productName: 'Kem Bôi Dịu Da Kutieskin 30g',
      remuneration: 1500000,
      deadline: '2026-10-25',
      contributorId: '',
      briefNotes: ''
    });

    notify(`Đã tạo Task video [${newTask.taskCode}] thuộc Pillar [${selectedPillar.name}]!`);
  };

  // Action: Submit Script Review Decision
  const handleSaveScriptReview = () => {
    if (!selectedTask) return;
    const isApproved = scriptVerdict === 'APPROVED';

    const updatedTask: SelfChannelVideoTask = {
      ...selectedTask,
      status: isApproved ? 'SCRIPT_APPROVED' : 'SCRIPT_REVISION',
      feedbackLogs: [
        ...selectedTask.feedbackLogs,
        {
          id: `fb-${Date.now()}`,
          version: (selectedTask.feedbackLogs.filter(f => f.type === 'SCRIPT').length || 0) + 1,
          reviewedBy: currentUser?.name || 'Khánh Vy (B2C Lead)',
          reviewedAt: new Date().toISOString(),
          type: 'SCRIPT',
          verdict: isApproved ? 'APPROVED' : 'REVISE',
          comment: scriptFeedbackText.trim() || (isApproved ? 'Kịch bản chuẩn insight, đồng ý duyệt quay dựng.' : 'Cần chỉnh sửa theo góp ý.')
        }
      ]
    };

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setIsScriptReviewModalOpen(false);
    setSelectedTask(null);
    setScriptFeedbackText('');
    notify(
      isApproved 
        ? `Đã DUYỆT kịch bản task [${selectedTask.taskCode}]! CTV có thể tiến hành quay dựng.` 
        : `Đã gửi yêu cầu SỬA kịch bản task [${selectedTask.taskCode}] cho CTV.`,
      isApproved ? 'success' : 'warning'
    );
  };

  // Action: Submit Video QA Decision
  const handleSaveVideoQa = () => {
    if (!selectedTask) return;
    const isApproved = videoVerdict === 'APPROVED';

    const updatedTask: SelfChannelVideoTask = {
      ...selectedTask,
      status: isApproved ? 'ACCEPTED_COMPLETED' : 'VIDEO_REVISION',
      acceptedAt: isApproved ? new Date().toISOString() : undefined,
      acceptedBy: isApproved ? (currentUser?.name || 'Khánh Vy (Booking Lead)') : undefined,
      feedbackLogs: [
        ...selectedTask.feedbackLogs,
        {
          id: `fb-${Date.now()}`,
          version: (selectedTask.videoDeliverables?.currentVersion || 1),
          reviewedBy: currentUser?.name || 'Khánh Vy (B2C Lead)',
          reviewedAt: new Date().toISOString(),
          type: 'VIDEO',
          verdict: isApproved ? 'APPROVED' : 'REVISE',
          comment: videoFeedbackText.trim() || (isApproved ? 'Video chất lượng cao, đúng Do & Don\'ts của Brand. Đạt chuẩn nghiệm thu!' : 'Cần cắt gọt và chỉnh sửa lại âm thanh.'),
          checklist: videoChecklist
        }
      ]
    };

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setIsVideoQaModalOpen(false);
    setSelectedTask(null);
    setVideoFeedbackText('');
    notify(
      isApproved 
        ? `Đã NGHIỆM THU video [${selectedTask.taskCode}]! Task đã chuyển sang danh sách chờ quyết toán nhuận bút.` 
        : `Đã gửi phản hồi YÊU CẦU QUAY/EDIT LẠI cho CTV.`,
      isApproved ? 'success' : 'warning'
    );
  };

  // Action: Mark Paid
  const handleMarkTaskPaid = (task: SelfChannelVideoTask) => {
    const paymentRef = `UNC-${Math.floor(100000 + Math.random() * 900000)}`;
    const updated: SelfChannelVideoTask = {
      ...task,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      paymentRef
    };

    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    
    // Update contributor total
    if (task.contributorId) {
      setContributors(prev => prev.map(c => 
        c.id === task.contributorId 
          ? { ...c, totalPaidAmount: c.totalPaidAmount + task.remuneration, completedTaskCount: c.completedTaskCount + 1 } 
          : c
      ));
    }

    notify(`Đã xác nhận thanh toán thù lao ${formatVnd(task.remuneration)} cho [${task.contributorName}] (Mã UNC: ${paymentRef})!`);
  };

  // Action: Add Contributor
  const handleAddContributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContributorForm.name.trim() || !newContributorForm.phone.trim()) {
      notify('Vui lòng điền Họ tên và Số điện thoại CTV!', 'warning');
      return;
    }

    const newCtv: Contributor = {
      id: `ctv-${Date.now()}`,
      name: newContributorForm.name.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: newContributorForm.phone.trim(),
      email: newContributorForm.email.trim(),
      channelLink: newContributorForm.channelLink.trim(),
      nicheSpecialty: newContributorForm.niche.split(',').map(s => s.trim()).filter(Boolean),
      role: newContributorForm.role,
      status: 'ACTIVE',
      bankName: newContributorForm.bankName,
      bankAccount: newContributorForm.bankAccount.trim(),
      bankAccountName: newContributorForm.bankAccountName.trim().toUpperCase() || newContributorForm.name.toUpperCase(),
      ratingScore: 5.0,
      assignedTaskCount: 0,
      completedTaskCount: 0,
      totalPaidAmount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      notes: newContributorForm.notes.trim()
    };

    setContributors(prev => [newCtv, ...prev]);
    setIsAddContributorModalOpen(false);
    setNewContributorForm({
      name: '',
      phone: '',
      email: '',
      channelLink: '',
      niche: 'Mẹ & Bé, Chăm Da',
      role: 'ALL_IN_ONE',
      bankName: 'Techcombank',
      bankAccount: '',
      bankAccountName: '',
      notes: ''
    });

    notify(`Đã thêm Cộng Tác Viên [${newCtv.name}] vào danh bạ sản xuất video!`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. TOP HEADER & ALLOCATION OVERVIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                Luồng Độc Lập: Kênh Thương Hiệu (Self Channel)
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Thương hiệu: <strong>{allocation.brandName}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Self Channel & CTV Video Hub
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý sản xuất video kênh chính chủ (TikTok/Reels) qua mạng lưới Cộng Tác Viên theo <strong>Content Pillar</strong> • Tách biệt hoàn toàn với luồng Affiliate KOC ngoại sàn.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenPushProducts && (
              <button
                type="button"
                onClick={onOpenPushProducts}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Xem SP Thúc Đẩy (Gắn SKU)
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tạo Task Video Mới
            </button>
          </div>
        </div>

        {/* Brand Budget Split Comparison Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Cơ cấu Ngân sách Brand Tháng 10:</span>
              <span className="font-bold text-indigo-700">{formatVnd(allocation.totalBudget)}</span>
            </div>
            <div className="flex items-center gap-4 text-2xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                Kênh Affiliate (KOC Ngoại Sàn): <strong>{formatVnd(allocation.budgetAffiliate)} (75%)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                Kênh Self Channel (CTV Nội Bộ): <strong>{formatVnd(allocation.budgetSelfChannel)} (25%)</strong>
              </span>
            </div>
          </div>

          {/* Visual split progress bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${(allocation.budgetAffiliate / allocation.totalBudget) * 100}%` }}
              className="bg-blue-500 h-full relative group cursor-pointer"
              title={`Affiliate KOC: ${formatVnd(allocation.budgetAffiliate)} - Phân rã theo bậc KL1-KL7`}
            />
            <div 
              style={{ width: `${(allocation.budgetSelfChannel / allocation.totalBudget) * 100}%` }}
              className="bg-indigo-600 h-full relative group cursor-pointer"
              title={`Self Channel: ${formatVnd(allocation.budgetSelfChannel)} - Phân rã theo Content Pillar`}
            />
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-2xs text-slate-500 block">Ngân Sách Self Channel:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">{formatVnd(allocation.budgetSelfChannel)}</span>
            </div>
            <span className="text-2xs text-indigo-600 block mt-0.5">
              Đã chi: <strong>{formatVnd(stats.totalSpent)}</strong>
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-2xs text-slate-500 block">Mục Tiêu Video Kênh:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">{stats.completedTasks} / {stats.targetVideos}</span>
              <span className="text-2xs text-slate-500">video</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, stats.progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-2xs text-slate-500 block">Tiến Độ Sản Xuất:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {stats.scriptPendingTasks} chờ duyệt kịch bản
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                {stats.inProgressTasks} đang dựng
              </span>
            </div>
            <span className="text-2xs text-slate-500 block mt-1">
              {stats.openTasks} task mở chờ CTV nhận
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-2xs text-slate-500 block">Nhuận Bút Chờ Quyết Toán:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-amber-700 font-mono">{formatVnd(stats.pendingPayment)}</span>
            </div>
            <span className="text-2xs text-emerald-700 block mt-0.5">
              Đã thanh toán: <strong>{formatVnd(stats.paidTotal)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTENT PILLARS BREAKDOWN STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-900">Phân Bổ Kế Hoạch Theo Content Pillar (Trụ Cột Nội Dung)</span>
            <span className="text-2xs text-slate-400">• Không chia theo KL, định mức thù lao theo Pillar</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPillarId('ALL')}
            className={`text-2xs font-semibold px-2 py-1 rounded transition-colors ${
              selectedPillarId === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả Pillar ({allocation.pillars.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {allocation.pillars.map((pillar) => {
            const isSelected = selectedPillarId === pillar.id;
            const pillarTasks = tasks.filter(t => t.pillarId === pillar.id);
            const pillarCompleted = pillarTasks.filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID').length;
            const percent = Math.round((pillarCompleted / pillar.targetVideos) * 100);

            return (
              <div
                key={pillar.id}
                onClick={() => setSelectedPillarId(isSelected ? 'ALL' : pillar.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-slate-900 line-clamp-1">{pillar.name}</span>
                  <span className="text-2xs font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                    {formatVnd(pillar.unitCostPerVideo)}/clip
                  </span>
                </div>

                <p className="text-2xs text-slate-500 line-clamp-2 leading-relaxed">
                  {pillar.description}
                </p>

                <div className="space-y-1 pt-1 border-t border-slate-200/60 text-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mục tiêu:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {pillarCompleted} / {pillar.targetVideos} video ({percent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngân sách:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {formatVnd(pillar.allocatedBudget)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'PIPELINE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Tiến Độ Video ({tasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CTV_PORTAL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'CTV_PORTAL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            Góc Nhìn CTV (Hub Preview)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTRIBUTORS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'CONTRIBUTORS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Danh Bạ CTV ({contributors.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTLEMENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'SETTLEMENT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Bảng Kê Nhuận Bút
            {stats.pendingPayment > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Global Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã task, tiêu đề, SKU, CTV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN_TASK">Mở nhận task</option>
            <option value="SCRIPT_PENDING_REVIEW">Chờ duyệt kịch bản</option>
            <option value="SCRIPT_APPROVED">Đang quay & dựng</option>
            <option value="DRAFT_VIDEO_SUBMITTED">Chờ duyệt video</option>
            <option value="ACCEPTED_COMPLETED">Đã nghiệm thu (Chờ chi)</option>
            <option value="PAID">Đã quyết toán</option>
          </select>
        </div>
      </div>

      {/* 4. TAB CONTENT 1: PIPELINE / TASK BOARD */}
      {activeTab === 'PIPELINE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                Không tìm thấy task video nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {task.taskCode}
                      </span>
                      {renderStatusBadge(task.status)}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                      {task.title}
                    </h3>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-1.5 text-2xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                        {task.pillarName}
                      </span>
                      {task.linkedSku && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
                          SKU: {task.linkedSku}
                        </span>
                      )}
                    </div>

                    {/* Contributor & Remuneration */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {task.contributorAvatar ? (
                          <img
                            src={task.contributorAvatar}
                            alt={task.contributorName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-2xs text-slate-600 font-semibold">
                            ?
                          </div>
                        )}
                        <span className="text-slate-700 font-medium">
                          {task.contributorName || <span className="text-slate-400 italic">Chưa giao CTV</span>}
                        </span>
                      </div>

                      <span className="font-mono font-bold text-indigo-700">
                        {formatVnd(task.remuneration)}
                      </span>
                    </div>

                    {/* Quick Script or Video Preview Peek */}
                    {task.scriptContent && (
                      <div className="p-2.5 bg-slate-50 rounded-xl text-2xs space-y-1 border border-slate-200/60">
                        <span className="font-semibold text-slate-700 block">Hook 3s đầu:</span>
                        <p className="text-slate-600 italic line-clamp-2">"{task.scriptContent.hook}"</p>
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <span className="text-2xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Hạn: {formatDate(task.deadline)}
                    </span>

                    <div className="flex items-center gap-1.5">
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
                            setIsVideoQaModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5" /> Duyệt video QA
                        </button>
                      )}

                      {task.status === 'ACCEPTED_COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkTaskPaid(task)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs"
                        >
                          <Wallet className="w-3.5 h-3.5" /> Quyết toán
                        </button>
                      )}

                      {task.status === 'OPEN_TASK' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsCreateTaskModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                          Giao CTV
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 2: CTV PORTAL SIMULATION */}
      {activeTab === 'CTV_PORTAL' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Cổng Làm Việc Dành Cho Cộng Tác Viên (CTV Workspace Hub)
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Mô phỏng trải nghiệm màn hình CTV khi nhận task, nộp outline kịch bản và gửi link video nháp để Brand nghiệm thu.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Đang đóng vai CTV:</span>
              <select
                value={simulatedCtvId}
                onChange={(e) => setSimulatedCtvId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {contributors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.nicheSpecialty[0]})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active CTV Profile Card */}
          {(() => {
            const currentCtv = contributors.find(c => c.id === simulatedCtvId) || contributors[0];
            const myTasks = tasks.filter(t => t.contributorId === currentCtv.id);
            const myEarnings = myTasks
              .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
              .reduce((sum, t) => sum + t.remuneration, 0);

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentCtv.avatar}
                      alt={currentCtv.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-300"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {currentCtv.name}
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-100 text-emerald-800">
                          CTV Đang Hoạt Động
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        SĐT: {currentCtv.phone} • STK: <strong>{currentCtv.bankAccount}</strong> ({currentCtv.bankName})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 block">Số Task Đang Làm:</span>
                      <span className="font-bold text-slate-900 font-mono">{myTasks.length} task</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 block">Thù Lao Tích Lũy:</span>
                      <span className="font-bold text-indigo-700 font-mono">{formatVnd(myEarnings)}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 block">Điểm Đánh Giá:</span>
                      <span className="font-bold text-amber-600 flex items-center gap-1 font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {currentCtv.ratingScore} / 5.0
                      </span>
                    </div>
                  </div>
                </div>

                {/* My Assigned Tasks List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Danh Sách Task Brand Đã Giao Cho Bạn ({myTasks.length})
                  </h4>

                  {myTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      Bạn chưa được giao task video nào trong tháng này.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myTasks.map(task => (
                        <div
                          key={task.id}
                          className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-2xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {task.taskCode}
                                </span>
                                <span className="text-2xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  {task.pillarName}
                                </span>
                              </div>
                              <h5 className="font-semibold text-slate-900 text-sm mt-1">{task.title}</h5>
                              <p className="text-xs text-slate-500">
                                Sản phẩm: <strong>{task.productName}</strong> ({task.linkedSku}) • Thù lao: <strong className="text-indigo-700">{formatVnd(task.remuneration)}</strong>
                              </p>
                            </div>
                            {renderStatusBadge(task.status)}
                          </div>

                          {/* Submission Status & Feedback Display */}
                          {task.scriptContent ? (
                            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                              <span className="font-semibold text-slate-700 block">Kịch bản bạn đã nộp:</span>
                              <div className="text-2xs text-slate-600 space-y-1">
                                <p><strong>Hook:</strong> {task.scriptContent.hook}</p>
                                <p><strong>Nội dung:</strong> {task.scriptContent.body}</p>
                                <p><strong>CTA:</strong> {task.scriptContent.cta}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50/50 rounded-lg text-xs space-y-2 border border-amber-200">
                              <span className="font-semibold text-amber-900 block flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Bạn chưa nộp kịch bản cho task này
                              </span>
                              <p className="text-2xs text-amber-800">
                                Vui lòng soạn dàn ý kịch bản 3 phần (Hook 3s, Thân bài và Lời kêu gọi CTA) để Brand duyệt trước khi quay.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsScriptReviewModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Soạn & Nộp Kịch Bản Ngay
                              </button>
                            </div>
                          )}

                          {/* Latest Feedback From Brand Lead */}
                          {task.feedbackLogs.length > 0 && (
                            <div className="p-3 bg-indigo-50/50 rounded-lg text-xs space-y-1 border border-indigo-100">
                              <span className="font-semibold text-indigo-900 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-indigo-600" />
                                Phản hồi mới nhất từ Brand ({task.feedbackLogs[task.feedbackLogs.length - 1].reviewedBy}):
                              </span>
                              <p className="text-2xs text-slate-700 italic">
                                "{task.feedbackLogs[task.feedbackLogs.length - 1].comment}"
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 6. TAB CONTENT 3: CONTRIBUTORS ROSTER */}
      {activeTab === 'CONTRIBUTORS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Danh Bạ Cộng Tác Viên Sản Xuất Video</h2>
              <p className="text-xs text-slate-500">Mạng lưới diễn viên, editor, mẹ bỉm sáng tạo nội dung ký hợp đồng CTV với Brand.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddContributorModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm CTV Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributors.map((ctv) => (
              <div
                key={ctv.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={ctv.avatar}
                      alt={ctv.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{ctv.name}</h4>
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {ctv.ratingScore}
                        </span>
                      </div>
                      <span className="text-2xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-0.5">
                        {ctv.role === 'ALL_IN_ONE' ? 'Quay & Diễn Trọn Gói' : ctv.role === 'VIDEO_EDITOR' ? 'Chuyên Editor Hậu Kỳ' : ctv.role === 'CREATIVE_ACTOR' ? 'Diễn Viên / Chuyên Gia' : 'Biên Kịch Nội Dung'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>SĐT liên hệ:</span>
                      <span className="font-medium text-slate-800">{ctv.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>Kênh / Portfolio:</span>
                      {ctv.channelLink ? (
                        <a
                          href={ctv.channelLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          Xem kênh <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Đang cập nhật</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>Tài khoản nhận thù lao:</span>
                      <span className="font-mono font-medium text-slate-800">{ctv.bankAccount} ({ctv.bankName})</span>
                    </div>
                  </div>

                  {/* Niche specialty tags */}
                  <div className="flex flex-wrap gap-1">
                    {ctv.nicheSpecialty.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-2xs bg-slate-100 text-slate-600 border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {ctv.notes && (
                    <p className="text-2xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                      "{ctv.notes}"
                    </p>
                  )}
                </div>

                {/* Performance stats */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-2xs text-slate-400 block">Đã bàn giao:</span>
                    <span className="font-bold text-slate-900 font-mono">{ctv.completedTaskCount} video</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xs text-slate-400 block">Tổng thù lao:</span>
                    <span className="font-bold text-indigo-700 font-mono">{formatVnd(ctv.totalPaidAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 4: SETTLEMENT & PAYROLL */}
      {activeTab === 'SETTLEMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bảng Kê Quyết Toán Nhuận Bút Video CTV</h2>
              <p className="text-xs text-slate-500">Danh sách các video đã nghiệm thu đạt chuẩn, sẵn sàng xuất file chuyển Kế toán chi trả.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  notify('Đã xuất file bảng kê quyết toán nhuận bút CTV (Excel/CSV)!');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Bảng Kê Chi Trả
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-2xs">
                  <th className="py-3 px-4">MÃ TASK</th>
                  <th className="py-3 px-4">TIÊU ĐỀ VIDEO & PILLAR</th>
                  <th className="py-3 px-4">CỘNG TÁC VIÊN</th>
                  <th className="py-3 px-4">NGÀY NGHIỆM THU</th>
                  <th className="py-3 px-4 text-right">THÙ LAO (VNĐ)</th>
                  <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                  <th className="py-3 px-4 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks
                  .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
                  .map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500 text-2xs">
                        {task.taskCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        <div className="text-2xs text-indigo-600">{task.pillarName} • SKU: {task.linkedSku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{task.contributorName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-2xs">
                        {formatDate(task.acceptedAt || task.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatVnd(task.remuneration)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(task.status)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {task.status === 'ACCEPTED_COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkTaskPaid(task)}
                            className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                          >
                            Xác nhận đã chi
                          </button>
                        ) : (
                          <span className="text-2xs text-slate-400 font-mono">
                            Ref: {task.paymentRef}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TẠO TASK VIDEO MỚI */}
      {/* ============================================================== */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Khởi Tạo Task Sản Xuất Video Self Channel
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Tiêu Đề / Định Hướng Video *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Test thực tế bôi dịu chàm sữa sau 72h..."
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Trụ Cột Nội Dung (Content Pillar) *</label>
                <select
                  value={newTaskForm.pillarId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = allocation.pillars.find(item => item.id === pid);
                    setNewTaskForm(prev => ({
                      ...prev,
                      pillarId: pid,
                      remuneration: p ? p.unitCostPerVideo : prev.remuneration
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {allocation.pillars.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Định mức: {formatVnd(p.unitCostPerVideo)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Thù Lao Chi Trả (VNĐ) *</label>
                  <input
                    type="number"
                    value={newTaskForm.remuneration}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, remuneration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-indigo-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Hạn Bàn Giao (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Chỉ Định Cộng Tác Viên (Hoặc mở task)</label>
                <select
                  value={newTaskForm.contributorId}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, contributorId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Mở task để CTV tự ứng tuyển --</option>
                  {contributors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nicheSpecialty[0]} • {c.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Khởi Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DUYỆT KỊCH BẢN (SCRIPT REVIEW MODAL) */}
      {/* ============================================================== */}
      {isScriptReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Duyệt Kịch Bản Video (Script Review)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã: <strong>{selectedTask.taskCode}</strong> • CTV: <strong>{selectedTask.contributorName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScriptReviewModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-semibold text-slate-800 block text-xs">Nội dung kịch bản CTV đã nộp:</span>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">1. Hook 3 Giây Đầu:</span>
                    <p className="text-slate-800 bg-white p-2 rounded border border-slate-200 mt-0.5">
                      {selectedTask.scriptContent?.hook || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">2. Thân Bài / Diễn Giải Giải Pháp & Demo:</span>
                    <p className="text-slate-800 bg-white p-2 rounded border border-slate-200 mt-0.5 whitespace-pre-line">
                      {selectedTask.scriptContent?.body || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">3. Kêu Gọi Hành Động (CTA):</span>
                    <p className="text-slate-800 bg-white p-2 rounded border border-slate-200 mt-0.5">
                      {selectedTask.scriptContent?.cta || 'Chưa nộp'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Decision */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-slate-700 block">Quyết Định Duyệt Kịch Bản:</label>
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
                    Duyệt Kịch Bản (Đạt Chuẩn)
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
                    Yêu Cầu Chỉnh Sửa
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Góp Ý / Nhận Xét Cụ Thể Cho CTV</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú cụ thể các câu thoại cần sửa, góc quay bổ sung..."
                  value={scriptFeedbackText}
                  onChange={(e) => setScriptFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsScriptReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveScriptReview}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 ${
                    scriptVerdict === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> Xác Nhận & Gửi Phản Hồi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DUYỆT VIDEO NHÁP & QA (VIDEO QA MODAL) */}
      {/* ============================================================== */}
      {isVideoQaModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600" />
                  Nghiệm Thu Video Nháp (Video QA & Feedback)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã: <strong>{selectedTask.taskCode}</strong> • Phiên bản: v{selectedTask.videoDeliverables?.currentVersion || 1}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoQaModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Video Link */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Link Video CTV Đã Nộp:</span>
                  <a
                    href={selectedTask.videoDeliverables?.draftVideoUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-2xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {selectedTask.videoDeliverables?.draftVideoUrl || 'Đang cập nhật link'} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-2xs font-semibold px-2 py-1 rounded bg-white text-slate-700 border border-slate-200 font-mono">
                  {selectedTask.videoDeliverables?.durationSeconds || 30}s
                </span>
              </div>

              {/* 4 QA Checklist Items */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-800 block">Checklist Kiểm Định Chất Lượng:</span>
                <div className="space-y-1.5 text-2xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.hookCompliant}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, hookCompliant: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>3 giây đầu gây tò mò / giật hook đúng kịch bản</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.productAppearance}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, productAppearance: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Sản phẩm xuất hiện rõ nét, ánh sáng và màu sắc chân thực</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.audioClear}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, audioClear: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Âm thanh, giọng lồng tiếng to rõ, nhạc nền không lấn át lời nói</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoChecklist.guidelinesFollowed}
                      onChange={(e) => setVideoChecklist(prev => ({ ...prev, guidelinesFollowed: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Tuân thủ đúng quy tắc Do & Don'ts của Brand (không nói quá, dìm đối thủ)</span>
                  </label>
                </div>
              </div>

              {/* Verdict Selection */}
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
                  Duyệt Nghiệm Thu (Pass)
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
                  Yêu Cầu Chỉnh Sửa / Quay Lại
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Nhận Xét Cụ Thể</label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ đoạn giây cần cắt, text cần sửa hoặc lỗi âm thanh..."
                  value={videoFeedbackText}
                  onChange={(e) => setVideoFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsVideoQaModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveVideoQa}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 ${
                    videoVerdict === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Hoàn Tất Nghiệm Thu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: THÊM MỚI CỘNG TÁC VIÊN */}
      {/* ============================================================== */}
      {isAddContributorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Thêm Mới Cộng Tác Viên (CTV)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddContributorModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContributor} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Họ Tên CTV *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={newContributorForm.name}
                    onChange={(e) => setNewContributorForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Số Điện Thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0988 123 456"
                    value={newContributorForm.phone}
                    onChange={(e) => setNewContributorForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Vai Trò Chính *</label>
                  <select
                    value={newContributorForm.role}
                    onChange={(e) => setNewContributorForm(prev => ({ ...prev, role: e.target.value as Contributor['role'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="ALL_IN_ONE">Tự Quay & Diễn Trọn Gói</option>
                    <option value="VIDEO_EDITOR">Editor Dựng Video</option>
                    <option value="CREATIVE_ACTOR">Diễn Viên / Chuyên Gia</option>
                    <option value="SCRIPTWRITER">Biên Kịch Nội Dung</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Thế Mạnh Ngành Hàng</label>
                  <input
                    type="text"
                    placeholder="Mẹ & Bé, Chăm Da, Gia Đình"
                    value={newContributorForm.niche}
                    onChange={(e) => setNewContributorForm(prev => ({ ...prev, niche: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Link TikTok / Kênh / Portfolio</label>
                <input
                  type="url"
                  placeholder="https://tiktok.com/@..."
                  value={newContributorForm.channelLink}
                  onChange={(e) => setNewContributorForm(prev => ({ ...prev, channelLink: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-800 block text-2xs">Thông Tin Tài Khoản Nhận Nhuận Bút:</span>
                <div className="grid grid-cols-2 gap-2 text-2xs">
                  <div>
                    <label className="text-slate-500 block mb-0.5">Ngân Hàng:</label>
                    <input
                      type="text"
                      placeholder="Techcombank / MB..."
                      value={newContributorForm.bankName}
                      onChange={(e) => setNewContributorForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Số Tài Khoản:</label>
                    <input
                      type="text"
                      placeholder="1903..."
                      value={newContributorForm.bankAccount}
                      onChange={(e) => setNewContributorForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddContributorModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Thêm Vào Danh Bạ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
