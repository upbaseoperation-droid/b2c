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
  MessageSquare,
  Users
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
  onNavigateToBrand?: () => void;
}

export const SelfChannelCtvHubView: React.FC<SelfChannelCtvHubViewProps> = ({
  currentUser,
  brands = [],
  onNotify,
  onOpenPushProducts,
  onNavigateToBrand
}) => {
  // Master State
  const [allocation, setAllocation] = useState<BrandChannelAllocation>(MOCK_BRAND_ALLOCATION);
  const [tasks, setTasks] = useState<SelfChannelVideoTask[]>(INITIAL_SELF_CHANNEL_TASKS);
  const [contributors, setContributors] = useState<Contributor[]>(INITIAL_CONTRIBUTORS);

  // Tab State: 'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'CONTRIBUTORS' | 'DISCUSSION' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'CONTRIBUTORS' | 'DISCUSSION' | 'HISTORY'>('OVERVIEW');
  const [isCtvSimulatorView, setIsCtvSimulatorView] = useState(false);

  // Discussion Chat State
  const [ctvChatMessages, setCtvChatMessages] = useState<Array<{ id: string; sender: 'CTV' | 'UPBASE_LEAD'; senderName: string; time: string; content: string }>>([
    {
      id: 'cmsg-1',
      sender: 'UPBASE_LEAD',
      senderName: 'Khánh Vy (Video & Booking Lead)',
      time: 'Hôm qua lúc 10:15',
      content: 'Chào các bạn CTV sáng tạo video tháng này! Brand Senka & Kutieskin đã chốt danh sách SKU trọng tâm và kịch bản mẫu. Các bạn xem kỹ Do & Don\'ts trước khi nộp kịch bản nhé ạ!'
    },
    {
      id: 'cmsg-2',
      sender: 'CTV',
      senderName: 'Bùi Thị Lan (Mẹ Bỉm Sữa)',
      time: 'Hôm qua lúc 14:30',
      content: 'Chị Vy ơi, em đã quay xong clip nháp KUTIE-SOOTH-30G rồi, phần ánh sáng tự nhiên ban ngày test chất kem rất mướt. Em vừa nộp link drive trên mục Cần duyệt, chị QA xem giúp em nhé!'
    },
    {
      id: 'cmsg-3',
      sender: 'UPBASE_LEAD',
      senderName: 'Khánh Vy (Video & Booking Lead)',
      time: 'Sáng nay lúc 08:45',
      content: 'Đã check video của Lan nhé! Đoạn bôi kem lên má bé rất đạt cảm xúc, chỉ cần chỉnh âm lượng nhạc nền giảm 15% ở đoạn 0:25 là đạt chuẩn nghiệm thu luôn nha em.'
    }
  ]);
  const [newCtvChatText, setNewCtvChatText] = useState('');

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
    notify('Đã gửi tin nhắn đến Upbase Video Production Team!');
  };

  // Filter States
  const [selectedPillarId, setSelectedPillarId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedContributorId, setSelectedContributorId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active CTV Simulator State
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

    const pendingApprovalsCount = scriptPendingTasks + 
      tasks.filter(t => t.status === 'DRAFT_VIDEO_SUBMITTED').length + 
      tasks.filter(t => t.status === 'ACCEPTED_COMPLETED').length;

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
      progressPercent,
      pendingApprovalsCount
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Mở nhận task
          </span>
        );
      case 'SCRIPT_PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800">
            <FileText className="w-3 h-3 text-amber-600" />
            Chờ duyệt kịch bản
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
            Đang quay & dựng
          </span>
        );
      case 'DRAFT_VIDEO_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700">
            <Play className="w-3 h-3 text-indigo-600" />
            Chờ duyệt video
          </span>
        );
      case 'VIDEO_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-orange-50 text-orange-700">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Sửa video nháp
          </span>
        );
      case 'ACCEPTED_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nghiệm thu (Chờ chi)
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700">
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
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SLEEK ENTERPRISE HEADER                                               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Self Channel &amp; CTV Video Hub
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Kênh Chính Chủ Brand
                </span>
                <span className="font-mono text-2xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {allocation.brandName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sản xuất video kênh chính chủ (TikTok/Reels) qua mạng lưới CTV theo <strong className="text-slate-700">Content Pillar</strong> • Tách biệt hoàn toàn với Affiliate KOC ngoại sàn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {onOpenPushProducts && (
              <button
                type="button"
                onClick={onOpenPushProducts}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>SP Thúc Đẩy (Gắn SKU)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Task Video</span>
            </button>

            {onNavigateToBrand && (
              <button
                type="button"
                onClick={onNavigateToBrand}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Quay lại Cổng Nhãn Hàng"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Cổng Brand</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINIMALIST SEGMENTED TABS                                             */}
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
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Cần duyệt &amp; Nộp bài</span>
          {stats.pendingApprovalsCount > 0 && (
            <span className={`text-2xs font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'APPROVALS' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
            }`}>
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
          <span>Công việc đang chạy ({tasks.length})</span>
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
          <span>Danh bạ CTV ({contributors.length})</span>
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
          <span>Trao đổi</span>
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
          <span>Lịch sử &amp; Nhuận bút</span>
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
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Ngân Sách Self Channel</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-slate-900">
                  {formatVnd(allocation.budgetSelfChannel)}
                </span>
                <span className="text-2xs text-indigo-600 font-medium">25% tổng gói</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">Đã chi: {formatVnd(stats.totalSpent)}</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Mục Tiêu Video Kênh</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-slate-900">
                  {stats.completedTasks} / {stats.targetVideos}
                </span>
                <span className="text-2xs text-emerald-600 font-medium">{stats.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Tiến Độ Sản Xuất</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-amber-600">
                  {stats.scriptPendingTasks} chờ duyệt
                </span>
                <span className="text-2xs text-indigo-600 font-medium">{stats.inProgressTasks} đang dựng</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">{stats.openTasks} task mở đang tìm CTV</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Nhuận Bút Chờ Quyết Toán</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-amber-700">
                  {formatVnd(stats.pendingPayment)}
                </span>
                <span className="text-2xs text-emerald-600 font-medium">Đã chi: {formatVnd(stats.paidTotal)}</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">Sẵn sàng xuất file UNC</span>
            </div>
          </div>

          {/* Budget Split Comparison Bar */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">
                Cơ Cấu Ngân Sách Brand: <strong className="text-indigo-700">{formatVnd(allocation.totalBudget)}</strong>
              </span>
              <div className="flex items-center gap-4 text-2xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Affiliate KOC: {formatVnd(allocation.budgetAffiliate)} (75%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                  Self Channel CTV: {formatVnd(allocation.budgetSelfChannel)} (25%)
                </span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${(allocation.budgetAffiliate / allocation.totalBudget) * 100}%` }}
                className="bg-blue-500 h-full"
                title={`Affiliate KOC: ${formatVnd(allocation.budgetAffiliate)}`}
              />
              <div 
                style={{ width: `${(allocation.budgetSelfChannel / allocation.totalBudget) * 100}%` }}
                className="bg-indigo-600 h-full"
                title={`Self Channel: ${formatVnd(allocation.budgetSelfChannel)}`}
              />
            </div>
          </div>

          {/* Content Pillars Grid */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Phân Bổ Kế Hoạch Theo Trụ Cột Nội Dung (Content Pillar)
              </h3>
              <span className="text-2xs text-slate-400">Định mức thù lao cố định theo từng Pillar</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {allocation.pillars.map((pillar) => {
                const pillarTasks = tasks.filter(t => t.pillarId === pillar.id);
                const pillarCompleted = pillarTasks.filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID').length;
                const percent = Math.round((pillarCompleted / pillar.targetVideos) * 100);

                return (
                  <div
                    key={pillar.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-slate-900">{pillar.name}</span>
                      <span className="text-2xs font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-slate-200">
                        {formatVnd(pillar.unitCostPerVideo)}/clip
                      </span>
                    </div>

                    <p className="text-2xs text-slate-500 line-clamp-2 leading-relaxed">
                      {pillar.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 text-2xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Mục tiêu:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {pillarCompleted}/{pillar.targetVideos} clips ({percent}%)
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN DUYỆT & NỘP BÀI (INBOX - LINEAR/STRIPE STYLE)                  */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {stats.pendingApprovalsCount === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Không có kịch bản hoặc video nào đang chờ duyệt!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Toàn bộ task nộp từ Cộng Tác Viên đã được thẩm định QA và quyết toán đúng tiến độ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE_JOBS')}
                className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <span>Xem công việc đang chạy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {stats.pendingApprovalsCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Hộp Việc Cần Phê Duyệt &amp; Nghiệm Thu ({stats.pendingApprovalsCount} mục)
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Click xem kịch bản, kiểm tra clip nháp hoặc xác nhận quyết toán nhuận bút
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Pending Scripts */}
                {tasks.filter(t => t.status === 'SCRIPT_PENDING_REVIEW' || t.status === 'SCRIPT_REVISION').map(t => (
                  <div key={t.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Kịch bản: {t.title}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.taskCode}</span>
                          {renderStatusBadge(t.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          CTV: <strong className="text-slate-700">{t.contributorName}</strong> • SKU: <span className="font-mono">{t.linkedSku}</span> • Thù lao: <strong className="text-indigo-700">{formatVnd(t.remuneration)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(t);
                        setIsScriptReviewModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem &amp; Duyệt Kịch Bản</span>
                    </button>
                  </div>
                ))}

                {/* 2. Pending Video QA */}
                {tasks.filter(t => t.status === 'DRAFT_VIDEO_SUBMITTED' || t.status === 'VIDEO_REVISION').map(t => (
                  <div key={t.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Clip nháp: {t.title}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.taskCode}</span>
                          {renderStatusBadge(t.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          CTV: <strong className="text-slate-700">{t.contributorName}</strong> • Thời lượng: {t.videoDeliverables?.durationSeconds || 30}s • Thù lao: <strong className="text-indigo-700">{formatVnd(t.remuneration)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(t);
                        setIsVideoQaModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kiểm Định QA &amp; Nghiệm Thu</span>
                    </button>
                  </div>
                ))}

                {/* 3. Pending Settlement */}
                {tasks.filter(t => t.status === 'ACCEPTED_COMPLETED').map(t => (
                  <div key={t.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Nghiệm thu đạt: {t.title}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.taskCode}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          CTV: <strong className="text-slate-700">{t.contributorName}</strong> • Thù lao: <strong className="text-emerald-700 font-mono text-sm">{formatVnd(t.remuneration)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMarkTaskPaid(t)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-end sm:self-auto"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Xác Nhận Đã Chi (Tạo UNC)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÔNG VIỆC ĐANG CHẠY (ACTIVE JOBS)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Clean Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã task, tiêu đề, SKU, CTV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none w-48 sm:w-72"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="OPEN_TASK">Mở nhận task</option>
                <option value="SCRIPT_PENDING_REVIEW">Chờ duyệt kịch bản</option>
                <option value="SCRIPT_APPROVED">Đang quay & dựng</option>
                <option value="DRAFT_VIDEO_SUBMITTED">Chờ duyệt video</option>
                <option value="ACCEPTED_COMPLETED">Đã nghiệm thu (Chờ chi)</option>
                <option value="PAID">Đã quyết toán</option>
              </select>

              <button
                type="button"
                onClick={() => setIsCtvSimulatorView(!isCtvSimulatorView)}
                className={`px-3 py-1 rounded-lg text-2xs font-semibold transition ${
                  isCtvSimulatorView 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isCtvSimulatorView ? 'Đang bật view CTV' : 'Mô phỏng góc CTV'}
              </button>
            </div>
          </div>

          {/* Simulator switcher when enabled */}
          {isCtvSimulatorView && (
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-900">Mô phỏng giao diện CTV nộp bài:</span>
              <select
                value={simulatedCtvId}
                onChange={(e) => setSimulatedCtvId(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-white text-slate-800 text-xs font-semibold"
              >
                {contributors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.nicheSpecialty[0]})</option>
                ))}
              </select>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
                Không tìm thấy task video nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {task.taskCode}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{task.title}</span>
                        {renderStatusBadge(task.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pillar: <strong className="text-indigo-700">{task.pillarName}</strong> • SKU: <span className="font-mono">{task.linkedSku}</span> • CTV: <strong>{task.contributorName || 'Chưa giao'}</strong> • Thù lao: <strong className="text-slate-800 font-mono">{formatVnd(task.remuneration)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <span className="text-2xs text-slate-400 flex items-center gap-1 mr-2">
                        <Calendar className="w-3 h-3" /> Hạn: {formatDate(task.deadline)}
                      </span>

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
                          <Play className="w-3.5 h-3.5" /> Duyệt QA video
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
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
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

      {/* ========================================================================= */}
      {/* TAB 4: DANH BẠ CTV (CONTRIBUTORS ROSTER)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'CONTRIBUTORS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Danh Bạ Cộng Tác Viên Sản Xuất Video
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Mạng lưới diễn viên, editor, mẹ bỉm sáng tạo nội dung ký hợp đồng CTV với Brand
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddContributorModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm CTV Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributors.map((ctv) => (
              <div
                key={ctv.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <img
                      src={ctv.avatar}
                      alt={ctv.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{ctv.name}</h4>
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {ctv.ratingScore}
                        </span>
                      </div>
                      <span className="text-2xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-0.5">
                        {ctv.role === 'ALL_IN_ONE' ? 'Quay & Diễn Trọn Gói' : ctv.role === 'VIDEO_EDITOR' ? 'Editor Hậu Kỳ' : 'Biên Kịch / Diễn Viên'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-2xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>SĐT:</span>
                      <span className="font-medium text-slate-800">{ctv.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>STK:</span>
                      <span className="font-mono font-medium text-slate-800">{ctv.bankAccount} ({ctv.bankName})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {ctv.nicheSpecialty.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-2xs bg-slate-50 text-slate-600 border border-slate-200/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
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

      {/* ========================================================================= */}
      {/* TAB 5: TRAO ĐỔI (TWO-WAY DISCUSSION)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl flex flex-col h-[560px] overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                CTV
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Kênh Thảo Luận: CTV ⇄ Upbase Production Lead
                </h4>
                <p className="text-2xs text-slate-500">
                  Giải đáp kịch bản, thời gian nộp mẫu, feedback âm thanh, góc quay
                </p>
              </div>
            </div>
            <span className="text-2xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              Phản hồi trực tuyến &lt; 30 phút
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/20">
            {ctvChatMessages.map(msg => {
              const isCtv = msg.sender === 'CTV';
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isCtv ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-2xs text-white shrink-0 ${
                    isCtv ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}>
                    {isCtv ? 'CTV' : 'UP'}
                  </div>
                  <div className={`max-w-[70%] space-y-1 ${isCtv ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-2xs text-slate-400 ${isCtv ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className={`p-3 rounded-2xl leading-relaxed text-xs ${
                      isCtv ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                    }`}>
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
              placeholder="Nhập nội dung trao đổi với Production Lead..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newCtvChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LỊCH SỬ & QUYẾT TOÁN (HISTORY)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Bảng Kê Quyết Toán Nhuận Bút Video CTV
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Danh sách video đã nghiệm thu đạt chuẩn, sẵn sàng xuất file chuyển Kế toán chi trả
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                notify('Đã xuất file bảng kê quyết toán nhuận bút CTV (Excel/CSV)!');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xuất Bảng Kê Chi Trả</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-2xs">
                  <th className="py-2.5 px-3">MÃ TASK</th>
                  <th className="py-2.5 px-3">TIÊU ĐỀ &amp; PILLAR</th>
                  <th className="py-2.5 px-3">CỘNG TÁC VIÊN</th>
                  <th className="py-2.5 px-3">NGÀY DUYỆT</th>
                  <th className="py-2.5 px-3 text-right">THÙ LAO</th>
                  <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                  <th className="py-2.5 px-3 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks
                  .filter(t => t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID')
                  .map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-500 text-2xs">
                        {task.taskCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        <div className="text-2xs text-slate-500">{task.pillarName} • SKU: {task.linkedSku}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {task.contributorName}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-2xs">
                        {formatDate(task.acceptedAt || task.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatVnd(task.remuneration)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {renderStatusBadge(task.status)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {task.status === 'ACCEPTED_COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkTaskPaid(task)}
                            className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
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
      {/* MODAL 1: TẠO TASK VIDEO MỚI                                     */}
      {/* ============================================================== */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Khởi Tạo Task Sản Xuất Video Self Channel
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-indigo-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Hạn Bàn Giao (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Chỉ Định Cộng Tác Viên (Hoặc mở task)</label>
                <select
                  value={newTaskForm.contributorId}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, contributorId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Mở task để CTV tự ứng tuyển --</option>
                  {contributors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nicheSpecialty[0]} • {c.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Khởi Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DUYỆT KỊCH BẢN (SCRIPT REVIEW MODAL)                    */}
      {/* ============================================================== */}
      {isScriptReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Duyệt Kịch Bản Video: {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  CTV: <strong>{selectedTask.contributorName}</strong> • {selectedTask.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScriptReviewModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                <span className="font-semibold text-slate-800 block text-xs">Nội dung kịch bản CTV đã nộp:</span>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">1. Hook 3 Giây Đầu:</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5">
                      {selectedTask.scriptContent?.hook || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">2. Thân Bài / Demo:</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5 whitespace-pre-line">
                      {selectedTask.scriptContent?.body || 'Chưa nộp'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-700 block text-2xs">3. Kêu Gọi Mua (CTA):</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 mt-0.5">
                      {selectedTask.scriptContent?.cta || 'Chưa nộp'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Decision */}
              <div className="space-y-2 pt-1">
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
                    Duyệt Kịch Bản (Pass)
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
                    Yêu Cầu Sửa
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Góp Ý Cụ Thể</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú cụ thể các câu thoại cần sửa, góc quay bổ sung..."
                  value={scriptFeedbackText}
                  onChange={(e) => setScriptFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScriptReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
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
                  <Send className="w-3.5 h-3.5" /> Xác Nhận Phản Hồi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DUYỆT VIDEO NHÁP & QA (VIDEO QA MODAL)                 */}
      {/* ============================================================== */}
      {isVideoQaModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600" />
                  Nghiệm Thu Video Nháp: {selectedTask.taskCode}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Phiên bản: v{selectedTask.videoDeliverables?.currentVersion || 1} • CTV: <strong>{selectedTask.contributorName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoQaModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
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
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
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
                    <span>Tuân thủ đúng quy tắc Do &amp; Don'ts của Brand</span>
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
                  Yêu Cầu Chỉnh Sửa
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Nhận Xét Cụ Thể</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ đoạn giây cần cắt, text cần sửa hoặc lỗi âm thanh..."
                  value={videoFeedbackText}
                  onChange={(e) => setVideoFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVideoQaModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
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
                  <CheckCheck className="w-3.5 h-3.5" /> Hoàn Tất Nghiệm Thu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: THÊM MỚI CỘNG TÁC VIÊN                                 */}
      {/* ============================================================== */}
      {isAddContributorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Thêm Mới Cộng Tác Viên (CTV)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddContributorModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Vai Trò Chính *</label>
                  <select
                    value={newContributorForm.role}
                    onChange={(e) => setNewContributorForm(prev => ({ ...prev, role: e.target.value as Contributor['role'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="ALL_IN_ONE">Tự Quay &amp; Diễn Trọn Gói</option>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="font-semibold text-slate-800 block text-2xs">Tài Khoản Nhận Nhuận Bút:</span>
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddContributorModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition flex items-center gap-1.5"
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
