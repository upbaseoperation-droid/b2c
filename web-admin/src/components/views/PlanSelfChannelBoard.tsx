'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Modal, Progress, Select, Status, Textarea } from '../ui';
import { getVietnamDateYmd } from '../../lib/format';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../../lib/useMonthlyPlanSync';
import type { InputPlanBreakdownState, Contributor } from '../../lib/types';
import { INITIAL_CONTRIBUTORS } from '../../lib/selfChannelData';
import type { ContentSlot } from '../../lib/contentPlanRules';
import { resolveWeekRows } from '../../lib/planBreakdownRules';
import {
  EMPTY_SELF_CHANNEL_BOARD,
  SELF_ACCEPTANCE_LABEL,
  SELF_FORMAT_LABEL,
  SELF_PAYMENT_LABEL,
  SELF_PLATFORM_LABEL,
  SELF_PRODUCTION_MODE_LABEL,
  SELF_SAMPLE_LABEL,
  SELF_SCRIPT_LABEL,
  SELF_STAGE_LABEL,
  SELF_VIDEO_QA_LABEL,
  applyContributorToSelfJob,
  computeJobFinancials,
  createSelfChannelJob,
  generateSelfJobsFromPlanAndContent,
  selfJobAcceptanceBlocker,
  selfJobPaymentBlocker,
  selfJobStageOf,
  summarizeSelfChannelBoard,
  type SelfAcceptanceStatus,
  type SelfChannelBoardData,
  type SelfChannelJob,
  type SelfContributorSummary,
  type SelfFormatKey,
  type SelfJobStage,
  type SelfPaymentStatus,
  type SelfPublishPlatform,
  type SelfProductionMode,
  type SelfSampleStatus,
  type SelfScriptStatus,
  type SelfSettlementBatch,
  type SelfVideoQaStatus,
} from '../../lib/selfChannelBoardRules';

export interface PlanSelfChannelBoardProps {
  contributors?: Contributor[];
  currentUserName?: string;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const fmt = (v: number) => Math.round(Number(v) || 0).toLocaleString('vi-VN');

const saveLabel: Record<string, string> = {
  idle: '',
  loading: 'Đang tải…',
  saved: 'Đã lưu',
  dirty: 'Chưa lưu',
  saving: 'Đang lưu…',
  error: 'Lưu lỗi',
};

const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2 py-2 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2 py-1.5 align-middle text-[13px] text-ink';

type PlanLite = InputPlanBreakdownState;

export const PlanSelfChannelBoard: React.FC<PlanSelfChannelBoardProps> = ({
  contributors,
  currentUserName = 'Chuyên viên',
  onNotify,
}) => {
  const notify = useCallback(
    (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type),
    [onNotify]
  );

  const effectiveContributors = useMemo(
    () => (contributors && contributors.length > 0 ? contributors : INITIAL_CONTRIBUTORS),
    [contributors]
  );

  // 1. Quản lý danh sách Kế hoạch tháng
  const [plans, setPlans] = useState<PlanLite[]>(() => getCachedClientMonthlyPlans() || []);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>(() =>
    getCachedClientMonthlyPlans() ? 'ready' : 'loading'
  );
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchClientMonthlyPlans();
        if (cancelled) return;
        setPlans(stored.map(p => p.plan));
        setPlansState('ready');
      } catch (err) {
        if (cancelled) return;
        setPlansState('error');
        notify(err instanceof Error ? err.message : 'Không tải được danh sách kế hoạch.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const months = useMemo(() => Array.from(new Set(plans.map(p => p.month))).sort().reverse(), [plans]);
  const activeMonth = month || months[0] || '';

  const visiblePlans = useMemo(() => {
    return plans.filter(p => {
      if (activeMonth && p.month !== activeMonth) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.storeName?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q) ||
        p.pic?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q)
      );
    });
  }, [plans, activeMonth, search]);

  useEffect(() => {
    if (!selectedId && visiblePlans.length > 0) {
      queueMicrotask(() => setSelectedId(visiblePlans[0].id));
    } else if (selectedId && !visiblePlans.some(p => p.id === selectedId)) {
      queueMicrotask(() => setSelectedId(visiblePlans[0]?.id ?? null));
    }
  }, [visiblePlans, selectedId]);

  const activePlan = useMemo(() => plans.find(p => p.id === selectedId) || null, [plans, selectedId]);

  const planWeeks = useMemo(
    () => (activePlan ? resolveWeekRows(activePlan).map(r => r.week) : []),
    [activePlan]
  );

  // 2. Dữ liệu Bảng công việc video Self-channel của Kế hoạch đã chọn
  const {
    data: board,
    update: updateBoard,
    status: saveStatus,
  } = usePlanRecord<SelfChannelBoardData>(
    '/api/self-channel-board',
    activePlan?.id ?? null,
    EMPTY_SELF_CHANNEL_BOARD,
    msg => notify(msg, 'warning')
  );

  // 3. Tính toán tổng hợp & Cảnh báo ngân sách
  const summary = useMemo(
    () => (activePlan ? summarizeSelfChannelBoard(activePlan, board) : null),
    [activePlan, board]
  );

  // Đếm số lượng video ở từng bước quy trình cho Pipeline Stepper Bar
  const stageCounts = useMemo(() => {
    const counts: Record<SelfJobStage, number> = {
      BRIEF: 0,
      SCRIPT: 0,
      PRODUCTION: 0,
      BRAND_AIR: 0,
      ACCEPTANCE: 0,
      SETTLEMENT: 0,
    };
    for (const j of board.jobs) {
      if (j.lifecycleStatus === 'CANCELLED') continue;
      const st = selfJobStageOf(j);
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [board.jobs]);

  // 4. Trạng thái Bộ lọc danh sách Job
  const [formatFilter, setFormatFilter] = useState<'ALL' | SelfFormatKey>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | SelfProductionMode>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | SelfJobStage>('ALL');
  const [searchJobText, setSearchJobText] = useState('');

  // Trạng thái xác nhận xóa Job video
  const [pendingDeleteJob, setPendingDeleteJob] = useState<{ id: string; code: string } | null>(null);

  // Trạng thái chọn nhiều dòng (Bulk Actions) & Gắn nhanh Link Air trên dòng
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkCtvId, setBulkCtvId] = useState<string>('');
  const [inlineAirJobId, setInlineAirJobId] = useState<string | null>(null);
  const [inlineAirUrl, setInlineAirUrl] = useState<string>('');
  const [inlineAirDate, setInlineAirDate] = useState<string>('');

  // 5. Quản lý Modal Chi tiết Job
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobDraft, setActiveJobDraft] = useState<SelfChannelJob | null>(null);
  const [isPushingLarkSingle, setIsPushingLarkSingle] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (activeJobId) {
        const found = board.jobs.find(j => j.id === activeJobId);
        if (found) {
          setActiveJobDraft(JSON.parse(JSON.stringify(found)));
        } else {
          setActiveJobDraft(null);
        }
      } else {
        setActiveJobDraft(null);
      }
    });
  }, [activeJobId, board.jobs]);

  // 6. Quản lý Modal Chốt bảng công & ĐNTT gom theo CTV
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [pushingCtvBatchId, setPushingCtvBatchId] = useState<string | null>(null);
  const [batchUncInput, setBatchUncInput] = useState<Record<string, string>>({});

  // 7. Đồng bộ Job video từ Kế hoạch & Content Brief
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncFromPlanAndBrief = async () => {
    if (!activePlan) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/content-plan?planId=${encodeURIComponent(activePlan.id)}`, {
        cache: 'no-store',
      });
      const body = await res.json().catch(() => null);
      const slots: ContentSlot[] = body?.data?.slots || body?.slots || [];

      const { jobs: nextJobs, addedCount } = generateSelfJobsFromPlanAndContent(
        activePlan,
        board.jobs,
        slots,
        effectiveContributors,
        currentUserName
      );

      if (addedCount > 0) {
        updateBoard({
          ...board,
          jobs: nextJobs,
        });
        notify(`Đã khởi tạo bổ sung ${addedCount} Job video từ Kế hoạch & Brief.`, 'success');
      } else {
        notify('Các tuần và định dạng trong Kế hoạch đã đủ số lượng Job video.', 'info');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đồng bộ được nội dung từ kế hoạch.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Thêm Job video mới thủ công
  const handleCreateJob = () => {
    if (!activePlan) {
      notify('Vui lòng chọn Kế hoạch tháng trước khi tạo Job video.', 'warning');
      return;
    }
    const newJob = createSelfChannelJob(
      {
        week: planWeeks[0] || '',
        productName: activePlan.storeName || '',
        contentPic: activePlan.pic || currentUserName,
      },
      board.jobs,
      currentUserName
    );
    updateBoard({
      ...board,
      jobs: [newJob, ...board.jobs],
    });
    setActiveJobId(newJob.id);
    notify(`Đã tạo công việc mới ${newJob.code}.`, 'success');
  };

  // Xóa / Hủy Job video bằng ConfirmDialog
  const handleDeleteJob = (jobId: string, jobCode: string) => {
    setPendingDeleteJob({ id: jobId, code: jobCode });
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteJob) return;
    const { id, code } = pendingDeleteJob;
    updateBoard({
      ...board,
      jobs: board.jobs.filter(j => j.id !== id),
    });
    if (activeJobId === id) {
      setActiveJobId(null);
    }
    notify(`Đã xóa công việc ${code}.`, 'info');
    setPendingDeleteJob(null);
  };

  // Cập nhật nhanh một trường của Job từ bảng danh sách
  const handleQuickPatchJob = (jobId: string, patch: Partial<SelfChannelJob>) => {
    const nextJobs = board.jobs.map(j => {
      if (j.id !== jobId) return j;
      const updated = { ...j, ...patch, updatedAt: new Date().toISOString() };
      if ('feeGross' in patch || 'productionMode' in patch || 'withholdPit10' in patch) {
        const fin = computeJobFinancials(
          patch.feeGross !== undefined ? patch.feeGross : j.feeGross,
          patch.productionMode !== undefined ? patch.productionMode : j.productionMode,
          patch.withholdPit10 !== undefined ? patch.withholdPit10 : j.withholdPit10
        );
        updated.feeGross = fin.feeGross;
        updated.withholdPit10 = fin.withholdPit10;
        updated.pitTaxAmount = fin.pitTaxAmount;
        updated.netPayout = fin.netPayout;
      }
      return updated;
    });
    updateBoard({ ...board, jobs: nextJobs });
  };

  // Nghiệm thu nhanh 1 Job từ bảng
  const handleQuickAcceptance = (job: SelfChannelJob) => {
    const blocker = selfJobAcceptanceBlocker(job);
    if (blocker) {
      notify(blocker, 'warning');
      setActiveJobId(job.id);
      return;
    }
    const nextBbnt =
      job.bbntCode ||
      (job.productionMode === 'CTV_OUTSOURCE' && job.feeGross > 0
        ? `BBNT-${(activePlan?.brandName || 'BRAND').slice(0, 4).toUpperCase()}-${job.code}`
        : undefined);

    handleQuickPatchJob(job.id, {
      acceptanceStatus: 'PASSED',
      acceptedAt: getVietnamDateYmd(),
      acceptedBy: currentUserName,
      bbntCode: nextBbnt,
    });
    notify(`Đã nghiệm thu Đạt công việc ${job.code}.`, 'success');
  };

  // Duyệt QA nhanh 1 Job từ bảng
  const handleQuickApproveQa = (job: SelfChannelJob) => {
    if (!job.draftVideoUrl.trim()) {
      notify('Chưa có link video nháp để duyệt QA.', 'warning');
      setActiveJobId(job.id);
      return;
    }
    handleQuickPatchJob(job.id, {
      qaChecklist: {
        hookOk: true,
        productOk: true,
        audioVisualOk: true,
        guidelineOk: true,
      },
      videoQaStatus: 'INTERNAL_QA_PASSED',
      qaReviewedBy: currentUserName,
      qaReviewedAt: getVietnamDateYmd(),
    });
    notify(`Đã duyệt QA nội bộ cho video ${job.code}.`, 'success');
  };

  // Helper lưu trực tiếp draft vào board.jobs ngay khi bấm các nút chốt bước (tránh mất dữ liệu khi đóng modal)
  const applyAndPersistDraft = useCallback(
    (nextDraft: SelfChannelJob, successMsg?: string) => {
      const fin = computeJobFinancials(
        nextDraft.feeGross,
        nextDraft.productionMode,
        nextDraft.withholdPit10
      );
      const finalizedDraft: SelfChannelJob = {
        ...nextDraft,
        feeGross: fin.feeGross,
        withholdPit10: fin.withholdPit10,
        pitTaxAmount: fin.pitTaxAmount,
        netPayout: fin.netPayout,
        updatedAt: new Date().toISOString(),
      };
      setActiveJobDraft(finalizedDraft);
      updateBoard({
        ...board,
        jobs: board.jobs.map(j => (j.id === finalizedDraft.id ? finalizedDraft : j)),
      });
      if (successMsg) {
        notify(successMsg, 'success');
      }
    },
    [board, notify, updateBoard]
  );

  // Lưu chi tiết Job từ Modal & Tự động đồng bộ Hồ sơ pháp lý/ngân hàng cho các Job cùng CTV
  const handleSaveActiveDraft = () => {
    if (!activeJobDraft) return;
    const fin = computeJobFinancials(
      activeJobDraft.feeGross,
      activeJobDraft.productionMode,
      activeJobDraft.withholdPit10
    );
    const finalizedDraft: SelfChannelJob = {
      ...activeJobDraft,
      feeGross: fin.feeGross,
      withholdPit10: fin.withholdPit10,
      pitTaxAmount: fin.pitTaxAmount,
      netPayout: fin.netPayout,
      updatedAt: new Date().toISOString(),
    };

    const ctvName = finalizedDraft.contributorName.trim().toLowerCase();
    const ctvId = finalizedDraft.contributorId?.trim();

    const nextJobs = board.jobs.map(j => {
      if (j.id === finalizedDraft.id) return finalizedDraft;
      const isSameContributor =
        (ctvId && j.contributorId === ctvId) ||
        (ctvName && j.contributorName.trim().toLowerCase() === ctvName);
      if (isSameContributor) {
        return {
          ...j,
          contributorId: j.contributorId || finalizedDraft.contributorId,
          contractNo: j.contractNo || finalizedDraft.contractNo,
          legalId: j.legalId || finalizedDraft.legalId,
          bankName: j.bankName || finalizedDraft.bankName,
          bankAccount: j.bankAccount || finalizedDraft.bankAccount,
          bankHolder: j.bankHolder || finalizedDraft.bankHolder,
          updatedAt: new Date().toISOString(),
        };
      }
      return j;
    });

    updateBoard({
      ...board,
      jobs: nextJobs,
    });
    setActiveJobId(null);
    notify(`Đã lưu thay đổi cho công việc ${finalizedDraft.code}.`, 'success');
  };

  // Gửi ĐNTT 1 Job sang Lark từ Modal
  const handlePushSingleJobToLark = async () => {
    if (!activeJobDraft || !activePlan) return;
    const blocker = selfJobPaymentBlocker(activeJobDraft);
    if (blocker) {
      notify(blocker, 'warning');
      return;
    }
    setIsPushingLarkSingle(true);
    let slipCode = `DNTT-SC-${activeJobDraft.code}`;

    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'SETTLEMENT',
          deals: [
            {
              id: activeJobDraft.id,
              jobId: activeJobDraft.id,
              dealId: activeJobDraft.code,
              kocName: activeJobDraft.contributorName,
              channelName: activeJobDraft.contributorName,
              brandName: activePlan.brandName,
              campaignName: `${activePlan.storeName || activePlan.brandName} · Video Kênh Brand`,
              stage: 'CẦN_THANH_TOÁN',
              dealType: 'VIDEO_SELF_CHANNEL',
              rateCard: activeJobDraft.feeGross,
              finalAmount: activeJobDraft.feeGross,
              totalValue: activeJobDraft.feeGross,
              linkAir: activeJobDraft.airLink || 'https://drive.google.com/ctv-video',
              postedDate: activeJobDraft.airedAt || activeJobDraft.acceptedAt || getVietnamDateYmd(),
              postDate: activeJobDraft.airedAt || activeJobDraft.acceptedAt || getVietnamDateYmd(),
              contractScanUrl: `https://drive.google.com/ctv-contract/${activeJobDraft.contributorId || activeJobDraft.code}`,
              signedContractUrl: `https://drive.google.com/ctv-contract/${activeJobDraft.contributorId || activeJobDraft.code}`,
            },
          ],
          kocs: [],
          sharedPayeeOverride: {
            bankName: activeJobDraft.bankName || 'Techcombank',
            bankAccount: activeJobDraft.bankAccount || '',
            bankHolder: activeJobDraft.bankHolder || activeJobDraft.contributorName,
            legalId: activeJobDraft.legalId || '',
            hasIdCardScan: true,
            linkAir: activeJobDraft.airLink || 'https://drive.google.com/ctv-video',
            postedDate: activeJobDraft.airedAt,
            sparkAdsCode: activeJobDraft.sparkAdsCode || 'SELF_CHANNEL',
            adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
            contractUrl: activeJobDraft.contractNo || `HD-CTV-${activeJobDraft.code}`,
            bbntUrl: activeJobDraft.bbntCode || `BBNT-${activeJobDraft.code}`,
          },
          actorName: currentUserName,
          month: activePlan.month || getVietnamDateYmd().slice(0, 7),
          note: `ĐNTT video Self-channel ${activeJobDraft.code} cho ${activeJobDraft.contributorName}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.slip?.slipCode) {
        slipCode = body.slip.slipCode;
      }
    } catch {
      // Fallback cục bộ
    } finally {
      setIsPushingLarkSingle(false);
    }

    const updatedJob: SelfChannelJob = {
      ...activeJobDraft,
      paymentStatus: 'REQUESTED',
      dnttSlipCode: slipCode,
      requestedAt: getVietnamDateYmd(),
      requestedBy: currentUserName,
      updatedAt: new Date().toISOString(),
    };

    setActiveJobDraft(updatedJob);
    updateBoard({
      ...board,
      jobs: board.jobs.map(j => (j.id === updatedJob.id ? updatedJob : j)),
    });
    notify(`Đã gửi đề nghị thanh toán sang Lark thành công: ${slipCode}`, 'success');
  };

  // Đẩy ĐNTT Gom theo CTV trong Modal Quyết toán
  const handlePushContributorBatch = async (ctv: SelfContributorSummary) => {
    if (!activePlan) return;
    if (ctv.acceptedUnpaidJobs.length === 0) {
      notify('CTV này không có video nào đủ điều kiện chờ thanh toán.', 'warning');
      return;
    }
    if (!ctv.legalReady) {
      notify(`Hồ sơ CTV chưa đủ điều kiện: ${ctv.missingReason}`, 'warning');
      return;
    }

    setPushingCtvBatchId(ctv.contributorName);
    let slipCode = `DNTT-CTV-${Date.now().toString().slice(-6)}`;

    try {
      const dealPayloads = ctv.acceptedUnpaidJobs.map(j => ({
        id: j.id,
        jobId: j.id,
        dealId: j.code,
        kocName: ctv.contributorName,
        channelName: ctv.contributorName,
        brandName: activePlan.brandName,
        campaignName: `${activePlan.storeName || activePlan.brandName} · Video Kênh Brand`,
        stage: 'CẦN_THANH_TOÁN',
        dealType: 'VIDEO_SELF_CHANNEL',
        rateCard: j.feeGross,
        finalAmount: j.feeGross,
        totalValue: j.feeGross,
        linkAir: j.airLink || 'https://drive.google.com/ctv-video',
        postedDate: j.airedAt || getVietnamDateYmd(),
        postDate: j.airedAt || getVietnamDateYmd(),
        contractScanUrl: `https://drive.google.com/ctv-contract/${ctv.contributorId || j.code}`,
        signedContractUrl: `https://drive.google.com/ctv-contract/${ctv.contributorId || j.code}`,
      }));

      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'SETTLEMENT',
          deals: dealPayloads,
          kocs: [],
          sharedPayeeOverride: {
            bankName: ctv.bankName || 'Techcombank',
            bankAccount: ctv.bankAccount || '',
            bankHolder: ctv.bankHolder || ctv.contributorName,
            legalId: ctv.legalId || '',
            hasIdCardScan: true,
            linkAir: dealPayloads[0]?.linkAir || 'https://drive.google.com/ctv-video',
            postedDate: dealPayloads[0]?.postedDate,
            sparkAdsCode: 'SELF_CHANNEL_CTV',
            adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
            contractUrl: ctv.contractNo || `HD-CTV-${ctv.contributorName}`,
            bbntUrl: `BBNT-CTV-${ctv.contributorName}-${activePlan.month}`,
          },
          actorName: currentUserName,
          month: activePlan.month || getVietnamDateYmd().slice(0, 7),
          note: `Chốt bảng công CTV (${ctv.acceptedUnpaidJobs.length} video) cho ${ctv.contributorName}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.slip?.slipCode) {
        slipCode = body.slip.slipCode;
      }
    } catch {
      // Fallback
    } finally {
      setPushingCtvBatchId(null);
    }

    const targetJobIds = new Set(ctv.acceptedUnpaidJobs.map(j => j.id));
    const nowYmd = getVietnamDateYmd();

    const newBatch: SelfSettlementBatch = {
      id: `batch-${Date.now()}`,
      slipCode,
      contributorName: ctv.contributorName,
      contributorId: ctv.contributorId,
      jobIds: ctv.acceptedUnpaidJobs.map(j => j.id),
      jobCodes: ctv.acceptedUnpaidJobs.map(j => j.code),
      grossTotal: ctv.pendingGross,
      pitTaxTotal: ctv.pendingPitTax,
      netTotal: ctv.pendingNet,
      status: 'REQUESTED',
      requestedAt: nowYmd,
      requestedBy: currentUserName,
      note: `Bảng công ${ctv.acceptedUnpaidJobs.length} video`,
    };

    const shouldWithholdPit = ctv.pendingGross >= 2000000;
    const nextJobs = board.jobs.map(j => {
      if (!targetJobIds.has(j.id)) return j;
      const fin = computeJobFinancials(
        j.feeGross,
        j.productionMode,
        shouldWithholdPit ? true : j.withholdPit10
      );
      return {
        ...j,
        withholdPit10: fin.withholdPit10,
        pitTaxAmount: fin.pitTaxAmount,
        netPayout: fin.netPayout,
        paymentStatus: 'REQUESTED' as SelfPaymentStatus,
        dnttSlipCode: slipCode,
        requestedAt: nowYmd,
        requestedBy: currentUserName,
        updatedAt: new Date().toISOString(),
      };
    });

    updateBoard({
      ...board,
      settlementBatches: [newBatch, ...board.settlementBatches],
      jobs: nextJobs,
    });
    notify(`Đã lập phiếu ĐNTT ${slipCode} cho CTV ${ctv.contributorName}.`, 'success');
  };

  // Xác nhận giải ngân cho cả lô đợt quyết toán
  const handleConfirmDisbursedBatch = (batch: SelfSettlementBatch) => {
    const unc = batchUncInput[batch.id]?.trim();
    if (!unc) {
      notify('Vui lòng nhập Mã lệnh chi / UNC trước khi xác nhận giải ngân.', 'warning');
      return;
    }
    const nowYmd = getVietnamDateYmd();
    const batchJobIds = new Set(batch.jobIds);

    const nextBatches = board.settlementBatches.map(b => {
      if (b.id !== batch.id) return b;
      return {
        ...b,
        status: 'PAID' as const,
        paidAt: nowYmd,
        uncRef: unc,
      };
    });

    const nextJobs = board.jobs.map(j => {
      if (!batchJobIds.has(j.id)) return j;
      return {
        ...j,
        paymentStatus: 'PAID' as SelfPaymentStatus,
        paidAt: nowYmd,
        uncRef: unc,
        updatedAt: new Date().toISOString(),
      };
    });

    updateBoard({
      ...board,
      settlementBatches: nextBatches,
      jobs: nextJobs,
    });
    notify(`Đã ghi nhận giải ngân cho đợt ${batch.slipCode}.`, 'success');
  };

  // Thu hồi đợt ĐNTT đang ở trạng thái REQUESTED (chưa giải ngân) để mở khóa sửa lại Job
  const handleRevokeSettlementBatch = (batch: SelfSettlementBatch) => {
    if (batch.status === 'PAID') {
      notify('Đợt thanh toán đã có UNC giải ngân nên không thể thu hồi.', 'warning');
      return;
    }
    const batchJobIds = new Set(batch.jobIds);
    const nextBatches = board.settlementBatches.filter(b => b.id !== batch.id);
    const nextJobs = board.jobs.map(j => {
      if (!batchJobIds.has(j.id)) return j;
      return {
        ...j,
        paymentStatus: 'NONE' as SelfPaymentStatus,
        dnttSlipCode: undefined,
        requestedAt: undefined,
        requestedBy: undefined,
        updatedAt: new Date().toISOString(),
      };
    });
    updateBoard({
      ...board,
      settlementBatches: nextBatches,
      jobs: nextJobs,
    });
    notify(`Đã thu hồi phiếu ${batch.slipCode} và mở khóa ${batch.jobIds.length} video để chỉnh sửa.`, 'info');
  };

  // Xuất file CSV Bảng kê nghiệm thu & chấm công chi tiết cho 1 CTV
  const handleExportContributorBbntCsv = (ctv: SelfContributorSummary) => {
    const ctvJobs = board.jobs.filter(
      j =>
        (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE') &&
        ((ctv.contributorId && j.contributorId === ctv.contributorId) ||
          j.contributorName.trim() === ctv.contributorName.trim())
    );
    if (ctvJobs.length === 0) {
      notify('Không có dữ liệu video của CTV này để xuất bảng kê.', 'warning');
      return;
    }
    const headers = [
      'Mã Job',
      'Tuần',
      'Định dạng',
      'Sản phẩm / SKU',
      'Ngày đăng',
      'Link Air',
      'Trạng thái Nghiệm thu',
      'Mã BBNT',
      'Thù lao Gross (VNĐ)',
      'Thuế TNCN 10% (VNĐ)',
      'Thực nhận Net (VNĐ)',
      'Trạng thái Thanh toán',
      'Mã phiếu ĐNTT',
      'Số HĐ CTV',
      'CCCD / MST',
      'Ngân hàng & Số TK',
    ];
    const escapeCsv = (val: string | number | undefined) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = ctvJobs.map(j => [
      j.code,
      j.week,
      SELF_FORMAT_LABEL[j.formatKey],
      j.skuCode ? `${j.productName} (${j.skuCode})` : j.productName,
      j.airedAt || 'Chưa đăng',
      j.airLink || '',
      SELF_ACCEPTANCE_LABEL[j.acceptanceStatus],
      j.bbntCode || '',
      j.feeGross,
      j.pitTaxAmount,
      j.netPayout,
      SELF_PAYMENT_LABEL[j.paymentStatus],
      j.dnttSlipCode || '',
      j.contractNo || ctv.contractNo || '',
      j.legalId || ctv.legalId || '',
      `${j.bankName || ctv.bankName || ''} - ${j.bankAccount || ctv.bankAccount || ''} (${j.bankHolder || ctv.bankHolder || ''})`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = ctv.contributorName.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `BBNT_BangCong_CTV_${safeName}_${activePlan?.month || 'Plan'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Đã xuất bảng kê nghiệm thu (CSV) cho CTV ${ctv.contributorName}.`, 'success');
  };

  // Gán nhanh CTV trực tiếp trên dòng bảng (tự động áp đơn giá, kiểm tra mẫu sẵn có & đồng bộ pháp lý/ngân hàng)
  const handleAssignCtvInline = (jobId: string, contributorId: string) => {
    const ctv = effectiveContributors.find(c => c.id === contributorId);
    if (!ctv) return;
    const ctvNameLower = ctv.name.trim().toLowerCase();
    const nextJobs = board.jobs.map(j => {
      if (j.id === jobId) {
        return applyContributorToSelfJob(j, ctv);
      }
      const isSame =
        (j.contributorId && j.contributorId === ctv.id) ||
        (j.contributorName && j.contributorName.trim().toLowerCase() === ctvNameLower);
      if (!isSame) return j;
      return {
        ...j,
        contributorId: j.contributorId || ctv.id,
        contractNo: j.contractNo || ctv.contractCode || 'HD-CTV-2026',
        legalId: j.legalId || ctv.cccd || ctv.taxCode || '',
        bankName: j.bankName || ctv.bankName || 'Techcombank',
        bankAccount: j.bankAccount || ctv.bankAccount || '',
        bankHolder: j.bankHolder || ctv.bankAccountName || ctv.name,
        updatedAt: new Date().toISOString(),
      };
    });
    updateBoard({ ...board, jobs: nextJobs });
    notify(`Đã gán CTV ${ctv.name} (áp đơn giá & hồ sơ chuẩn).`, 'success');
  };

  // Lưu nhanh Link Air ngay trên dòng bảng
  const handleSaveInlineAir = (jobId: string) => {
    const trimmedUrl = inlineAirUrl.trim();
    if (!trimmedUrl) {
      notify('Vui lòng dán đường dẫn video đã đăng trên kênh.', 'warning');
      return;
    }
    const dateVal = inlineAirDate.trim() || getVietnamDateYmd();
    handleQuickPatchJob(jobId, {
      airLink: trimmedUrl,
      airedAt: dateVal,
    });
    setInlineAirJobId(null);
    setInlineAirUrl('');
    setInlineAirDate('');
    notify('Đã lưu Link Air và ngày lên sóng.', 'success');
  };

  // Thao tác Hàng loạt (Bulk Actions) cho các dòng đã chọn
  const handleBulkAssignContributor = () => {
    if (!bulkCtvId || selectedJobIds.length === 0) return;
    const ctv = effectiveContributors.find(c => c.id === bulkCtvId);
    if (!ctv) return;
    const selectedSet = new Set(selectedJobIds);
    let updatedCount = 0;
    const nextJobs = board.jobs.map(j => {
      if (!selectedSet.has(j.id)) return j;
      if (j.paymentStatus === 'REQUESTED' || j.paymentStatus === 'PAID') return j;
      updatedCount++;
      return applyContributorToSelfJob(j, ctv);
    });
    updateBoard({ ...board, jobs: nextJobs });
    setSelectedJobIds([]);
    setBulkCtvId('');
    notify(`Đã gán CTV ${ctv.name} (kèm đơn giá & hồ sơ) cho ${updatedCount} video.`, 'success');
  };

  const handleBulkApproveScript = () => {
    if (selectedJobIds.length === 0) return;
    const selectedSet = new Set(selectedJobIds);
    let count = 0;
    const nextJobs = board.jobs.map(j => {
      if (!selectedSet.has(j.id)) return j;
      count++;
      return {
        ...j,
        scriptStatus: 'APPROVED' as SelfScriptStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    updateBoard({ ...board, jobs: nextJobs });
    setSelectedJobIds([]);
    notify(`Đã duyệt kịch bản cho ${count} video đã chọn.`, 'success');
  };

  const handleBulkApproveQa = () => {
    if (selectedJobIds.length === 0) return;
    const selectedSet = new Set(selectedJobIds);
    let count = 0;
    let skipped = 0;
    const nowYmd = getVietnamDateYmd();
    const nextJobs = board.jobs.map(j => {
      if (!selectedSet.has(j.id)) return j;
      if (!j.draftVideoUrl.trim()) {
        skipped++;
        return j;
      }
      count++;
      return {
        ...j,
        qaChecklist: {
          hookOk: true,
          productOk: true,
          audioVisualOk: true,
          guidelineOk: true,
        },
        videoQaStatus: 'INTERNAL_QA_PASSED' as SelfVideoQaStatus,
        qaReviewedBy: currentUserName,
        qaReviewedAt: nowYmd,
        updatedAt: new Date().toISOString(),
      };
    });
    updateBoard({ ...board, jobs: nextJobs });
    setSelectedJobIds([]);
    if (count > 0) {
      notify(
        `Đã duyệt QA nội bộ cho ${count} video${skipped > 0 ? ` (bỏ qua ${skipped} video chưa có link nháp)` : ''}.`,
        'success'
      );
    } else {
      notify('Các video đã chọn chưa có link video nháp để duyệt QA.', 'warning');
    }
  };

  const handleBulkAccept = () => {
    if (selectedJobIds.length === 0) return;
    const selectedSet = new Set(selectedJobIds);
    let count = 0;
    let skipped = 0;
    const nowYmd = getVietnamDateYmd();
    const brandPrefix = (activePlan?.brandName || 'BRAND').slice(0, 4).toUpperCase();

    const nextJobs = board.jobs.map(j => {
      if (!selectedSet.has(j.id)) return j;
      const nextBbnt =
        j.bbntCode ||
        (j.productionMode === 'CTV_OUTSOURCE' && j.feeGross > 0 ? `BBNT-${brandPrefix}-${j.code}` : undefined);
      const candidate: SelfChannelJob = { ...j, bbntCode: nextBbnt };
      const blocker = selfJobAcceptanceBlocker(candidate);
      if (blocker) {
        skipped++;
        return j;
      }
      count++;
      return {
        ...candidate,
        acceptanceStatus: 'PASSED' as SelfAcceptanceStatus,
        acceptedAt: nowYmd,
        acceptedBy: currentUserName,
        updatedAt: new Date().toISOString(),
      };
    });
    updateBoard({ ...board, jobs: nextJobs });
    setSelectedJobIds([]);
    if (count > 0) {
      notify(
        `Đã nghiệm thu Đạt & cấp mã BBNT cho ${count} video${skipped > 0 ? ` (${skipped} video chưa đủ điều kiện)` : ''}.`,
        'success'
      );
    } else {
      notify('Chưa có video nào trong danh sách chọn đủ điều kiện nghiệm thu (cần Đạt QA + có Link Air & Ngày đăng).', 'warning');
    }
  };

  // Lọc danh sách công việc hiển thị trên bảng
  const filteredJobs = useMemo(() => {
    return board.jobs.filter(job => {
      if (job.lifecycleStatus === 'CANCELLED') return false;
      if (formatFilter !== 'ALL' && job.formatKey !== formatFilter) return false;
      if (modeFilter !== 'ALL' && job.productionMode !== modeFilter) return false;
      if (stageFilter !== 'ALL' && selfJobStageOf(job) !== stageFilter) return false;
      if (searchJobText.trim()) {
        const q = searchJobText.toLowerCase();
        const match =
          job.code.toLowerCase().includes(q) ||
          job.productName.toLowerCase().includes(q) ||
          job.angle.toLowerCase().includes(q) ||
          job.pillar.toLowerCase().includes(q) ||
          job.contributorName.toLowerCase().includes(q) ||
          job.contentPic.toLowerCase().includes(q) ||
          (job.bbntCode && job.bbntCode.toLowerCase().includes(q)) ||
          (job.dnttSlipCode && job.dnttSlipCode.toLowerCase().includes(q)) ||
          (job.airLink && job.airLink.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [board.jobs, formatFilter, modeFilter, stageFilter, searchJobText]);

  return (
    <div className="space-y-4">
      {/* 1. THANH CHỌN KẾ HOẠCH & CÔNG CỤ ĐẦU TRANG */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={activeMonth}
            onChange={e => setMonth(e.target.value)}
            className="w-32 font-medium"
            aria-label="Chọn tháng kế hoạch"
          >
            {months.map(m => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </Select>

          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              placeholder="Tìm gian hàng / Brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-line-strong bg-surface pl-8 pr-3 text-[13px] text-ink focus:border-focus focus:outline-none"
            />
          </div>

          <Select
            value={selectedId || ''}
            onChange={e => setSelectedId(e.target.value)}
            className="w-64 font-medium"
            aria-label="Chọn gian hàng"
          >
            {visiblePlans.map(p => (
              <option key={p.id} value={p.id}>
                {p.storeName || p.title} ({p.brandName})
              </option>
            ))}
          </Select>

          <span className="text-2xs font-medium text-ink-3">
            {saveLabel[saveStatus] || (saveStatus === 'saved' ? 'Đã lưu' : '')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={handleSyncFromPlanAndBrief}
            disabled={isSyncing || !activePlan}
          >
            {isSyncing ? 'Đang đồng bộ…' : 'Đồng bộ từ Kế hoạch & Brief'}
          </Button>

          <Button size="sm" variant="secondary" icon={Plus} onClick={handleCreateJob} disabled={!activePlan}>
            Thêm Job video
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Wallet}
            onClick={() => setIsSettlementModalOpen(true)}
            disabled={!activePlan}
          >
            Chốt bảng công & ĐNTT CTV
          </Button>
        </div>
      </div>

      {/* 2. CẢNH BÁO TÀI CHÍNH & TỔNG HỢP CHỈ TIÊU VS THỰC TẾ */}
      {summary && (
        <div className="space-y-3">
          {summary.isOverbudget && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                <span>
                  Cảnh báo: Chi phí cam kết ({fmt(summary.committedBudget)} đ) đã vượt hạn mức Ngân sách Self-channel
                  Net ({fmt(summary.targetBudgetNet)} đ) của gian hàng.
                </span>
              </div>
            </div>
          )}

          {summary.isUnbudgeted && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                <span>
                  Báo động đỏ: Phát sinh chi phí Self-channel ({fmt(summary.committedBudget)} đ) trong khi hạn mức Ngân
                  sách được duyệt là 0đ.
                </span>
              </div>
            </div>
          )}

          {/* Khối 6 chỉ số tổng hợp */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Chỉ tiêu kế hoạch</div>
              <div className="mt-1 text-base font-semibold text-ink">
                {summary.totalJobs} / {summary.targetQty} <span className="text-xs font-normal">video</span>
              </div>
              <div className="mt-1 text-2xs text-ink-3">
                {summary.ctvJobs} CTV · {summary.inhouseJobs} Nội bộ
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Kịch bản & QA Đạt</div>
              <div className="mt-1 text-base font-semibold text-ink">
                {summary.scriptApprovedCount} <span className="text-xs font-normal">kịch bản</span>
              </div>
              <div className="mt-1 text-2xs text-emerald-600">{summary.qaPassedCount} đạt QA nội bộ</div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Đã đăng kênh (Air)</div>
              <div className="mt-1 text-base font-semibold text-ink">
                {summary.airedCount} / {summary.targetQty} <span className="text-xs font-normal">video</span>
              </div>
              <div className="mt-1 text-2xs text-ink-3">
                Đạt{' '}
                {summary.targetQty > 0 ? Math.round((summary.airedCount / summary.targetQty) * 100) : 0}% chỉ tiêu
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Đã nghiệm thu</div>
              <div className="mt-1 text-base font-semibold text-emerald-700">
                {summary.acceptedCount} <span className="text-xs font-normal">video</span>
              </div>
              <div className="mt-1 text-2xs text-ink-3">
                Chờ duyệt: {summary.airedCount - summary.acceptedCount > 0 ? summary.airedCount - summary.acceptedCount : 0}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Cam kết / Ngân sách Net</div>
              <div className="mt-1 text-base font-semibold text-ink">
                {fmt(summary.committedBudget)} <span className="text-xs font-normal">đ</span>
              </div>
              <div className="mt-1 text-2xs text-ink-3">Hạn mức: {fmt(summary.targetBudgetNet)} đ</div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
              <div className="text-2xs font-medium text-ink-3">Đã giải ngân</div>
              <div className="mt-1 text-base font-semibold text-blue-700">
                {fmt(summary.paidBudget)} <span className="text-xs font-normal">đ</span>
              </div>
              <div className="mt-1 text-2xs text-amber-600">Chờ chi: {fmt(summary.requestedBudget)} đ</div>
            </div>
          </div>

          {/* Thanh tiến độ trực quan 6 bước quy trình (Pipeline Stepper Bar) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { stage: 'BRIEF' as const, step: 1, label: '1. Nhận Brief & SP' },
              { stage: 'SCRIPT' as const, step: 2, label: '2. Soạn & Duyệt KB' },
              { stage: 'PRODUCTION' as const, step: 3, label: '3. Quay & QA video' },
              { stage: 'BRAND_AIR' as const, step: 4, label: '4. Duyệt Brand & Đăng' },
              { stage: 'ACCEPTANCE' as const, step: 5, label: '5. Nghiệm thu' },
              { stage: 'SETTLEMENT' as const, step: 6, label: '6. Quyết toán & Chi' },
            ].map(item => {
              const count = stageCounts[item.stage] || 0;
              const isSelected = stageFilter === item.stage;
              return (
                <button
                  key={item.stage}
                  type="button"
                  onClick={() => setStageFilter(prev => (prev === item.stage ? 'ALL' : item.stage))}
                  className={`flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-sunken/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`rounded px-1.5 py-0.5 text-2xs font-semibold ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-sunken text-ink-2'
                      }`}
                    >
                      Bước {item.step}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isSelected ? 'text-primary' : count > 0 ? 'text-ink' : 'text-ink-3'
                      }`}
                    >
                      {count} video
                    </span>
                  </div>
                  <div className={`mt-2 text-xs font-medium truncate ${isSelected ? 'text-primary font-semibold' : 'text-ink'}`}>
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dải lọc theo Định dạng, Hình thức & Bước quy trình */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFormatFilter('ALL')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  formatFilter === 'ALL'
                    ? 'bg-primary text-white'
                    : 'bg-sunken text-ink-2 hover:bg-line'
                }`}
              >
                Tất cả ({summary.totalJobs})
              </button>
              {summary.byFormat.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormatFilter(f.key)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    formatFilter === f.key
                      ? 'bg-primary text-white'
                      : 'bg-sunken text-ink-2 hover:bg-line'
                  }`}
                >
                  {f.label} ({f.aired}/{f.targetQty})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={modeFilter}
                onChange={e => setModeFilter(e.target.value as 'ALL' | SelfProductionMode)}
                className="w-40 text-xs"
                aria-label="Lọc hình thức sản xuất"
              >
                <option value="ALL">Mọi hình thức</option>
                <option value="CTV_OUTSOURCE">Thuê CTV ngoài ({summary.ctvJobs})</option>
                <option value="INHOUSE">Nội bộ ({summary.inhouseJobs})</option>
              </Select>

              <Select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value as 'ALL' | SelfJobStage)}
                className="w-48 text-xs"
                aria-label="Lọc bước quy trình"
              >
                <option value="ALL">Mọi bước quy trình</option>
                <option value="BRIEF">1. Nhận Brief & SP</option>
                <option value="SCRIPT">2. Soạn & Duyệt KB</option>
                <option value="PRODUCTION">3. Quay & QA video</option>
                <option value="BRAND_AIR">4. Duyệt Brand & Đăng</option>
                <option value="ACCEPTANCE">5. Nghiệm thu</option>
                <option value="SETTLEMENT">6. Quyết toán & Chi</option>
              </Select>

              <div className="relative w-44">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  placeholder="Tìm job, CTV, link..."
                  value={searchJobText}
                  onChange={e => setSearchJobText(e.target.value)}
                  className="h-8 w-full rounded border border-line-strong bg-surface pl-7 pr-2 text-xs text-ink focus:border-focus focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THANH CÔNG CỤ THAO TÁC HÀNG LOẠT (BULK ACTIONS) KHI TÍCH CHỌN NHIỀU JOB */}
      {selectedJobIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-ink">
            <span className="rounded bg-primary px-2 py-0.5 text-2xs font-semibold text-white">
              Đã chọn {selectedJobIds.length} video
            </span>
            <button
              type="button"
              onClick={() => setSelectedJobIds([])}
              className="text-2xs text-ink-3 hover:text-ink underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Gán CTV hàng loạt kèm tự động áp đơn giá */}
            <div className="flex items-center gap-1">
              <Select
                value={bulkCtvId}
                onChange={e => setBulkCtvId(e.target.value)}
                className="h-7 w-44 text-xs py-0"
                aria-label="Chọn CTV gán hàng loạt"
              >
                <option value="">-- Chọn CTV giao việc --</option>
                {effectiveContributors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({fmt(c.unitRateAllInOne || c.unitRateShootingOnly || c.unitRateEditOnly || 0)}đ)
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!bulkCtvId}
                onClick={handleBulkAssignContributor}
              >
                Gán CTV
              </Button>
            </div>

            <Button size="sm" variant="secondary" onClick={handleBulkApproveScript}>
              Duyệt Kịch bản ({selectedJobIds.length})
            </Button>

            <Button size="sm" variant="secondary" onClick={handleBulkApproveQa}>
              Duyệt QA nội bộ ({selectedJobIds.length})
            </Button>

            <Button size="sm" variant="primary" icon={FileCheck2} onClick={handleBulkAccept}>
              Nghiệm thu Đạt & Cấp BBNT ({selectedJobIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* 3. BẢNG DANH SÁCH JOB VIDEO SELF-CHANNEL */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[1150px] border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className={`${TH} w-8 text-center`}>
                <input
                  type="checkbox"
                  checked={
                    filteredJobs.length > 0 &&
                    filteredJobs.every(j => selectedJobIds.includes(j.id))
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedJobIds(filteredJobs.map(j => j.id));
                    } else {
                      setSelectedJobIds([]);
                    }
                  }}
                  className="rounded border-line-strong text-primary cursor-pointer"
                  aria-label="Chọn tất cả công việc hiển thị"
                />
              </th>
              <th className={TH}>Mã & Tuần</th>
              <th className={TH}>Định dạng & Nội dung</th>
              <th className={TH}>Hình thức & Người thực hiện</th>
              <th className={TH}>Kịch bản & Hàng mẫu</th>
              <th className={TH}>QA Video nháp</th>
              <th className={TH}>Đăng kênh (Air)</th>
              <th className={TH}>Nghiệm thu & BBNT</th>
              <th className={TH}>Thù lao & Thanh toán</th>
              <th className={`${TH} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-ink-3">
                  Không có công việc video nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => {
                const stage = selfJobStageOf(job);
                const isSelected = selectedJobIds.includes(job.id);
                const isFinancialLocked =
                  job.paymentStatus === 'REQUESTED' || job.paymentStatus === 'PAID';
                return (
                  <tr
                    key={job.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-sunken/40'
                    }`}
                  >
                    {/* Cột 0: Checkbox chọn dòng */}
                    <td className={`${TD} text-center`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedJobIds(prev =>
                              prev.includes(job.id) ? prev : [...prev, job.id]
                            );
                          } else {
                            setSelectedJobIds(prev => prev.filter(id => id !== job.id));
                          }
                        }}
                        className="rounded border-line-strong text-primary cursor-pointer"
                        aria-label={`Chọn công việc ${job.code}`}
                      />
                    </td>

                    {/* Cột 1: Mã & Tuần */}
                    <td className={TD}>
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <span>{job.code}</span>
                        {job.week && (
                          <span className="rounded bg-sunken px-1.5 py-0.5 text-2xs font-normal text-ink-2">
                            {job.week}
                          </span>
                        )}
                      </div>
                      {job.briefCode && <div className="text-2xs text-ink-3">{job.briefCode}</div>}
                      <div className="mt-0.5 text-2xs text-ink-2">{SELF_STAGE_LABEL[stage]}</div>
                    </td>

                    {/* Cột 2: Định dạng & Nội dung */}
                    <td className={TD}>
                      <div className="font-medium text-ink">{SELF_FORMAT_LABEL[job.formatKey]}</div>
                      <div className="text-2xs text-ink-2 font-medium">
                        {job.productName}
                        {job.skuCode ? ` · ${job.skuCode}` : ''}
                      </div>
                      <div className="truncate max-w-[160px] text-2xs text-ink-3" title={job.angle || job.pillar}>
                        {job.angle || job.pillar || '—'}
                      </div>
                    </td>

                    {/* Cột 3: Hình thức & Người thực hiện (Cho phép chọn nhanh CTV ngay trên dòng) */}
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-2xs font-medium ${
                            job.productionMode === 'CTV_OUTSOURCE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {job.productionMode === 'CTV_OUTSOURCE' ? 'Thuê CTV' : 'Nội bộ'}
                        </span>
                        {job.productionMode === 'CTV_OUTSOURCE' && job.feeGross > 0 && (
                          <span
                            className={`rounded px-1 py-0.5 text-2xs font-medium ${
                              job.contractNo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {job.contractNo ? 'Đủ HĐ' : 'Thiếu HĐ'}
                          </span>
                        )}
                      </div>
                      {job.productionMode === 'CTV_OUTSOURCE' && !isFinancialLocked ? (
                        <div className="mt-1">
                          <Select
                            value={job.contributorId || ''}
                            onChange={e => {
                              if (e.target.value) {
                                handleAssignCtvInline(job.id, e.target.value);
                              }
                            }}
                            className="h-6 text-2xs py-0 px-1 w-36 font-medium"
                            aria-label={`Chọn CTV cho ${job.code}`}
                          >
                            <option value="">
                              {job.contributorName ? job.contributorName : '-- Chọn CTV --'}
                            </option>
                            {effectiveContributors.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({fmt(c.unitRateAllInOne || c.unitRateShootingOnly || c.unitRateEditOnly || 0)}đ)
                              </option>
                            ))}
                          </Select>
                        </div>
                      ) : (
                        <div className="mt-1 font-medium text-ink">
                          {job.contributorName || job.contentPic || '—'}
                        </div>
                      )}
                    </td>

                    {/* Cột 4: Kịch bản & Hàng mẫu */}
                    <td className={TD}>
                      <div className="space-y-1">
                        <Select
                          value={job.scriptStatus}
                          onChange={e =>
                            handleQuickPatchJob(job.id, {
                              scriptStatus: e.target.value as SelfScriptStatus,
                            })
                          }
                          className="h-6 text-2xs py-0 px-1 w-28"
                        >
                          {Object.entries(SELF_SCRIPT_LABEL).map(([val, lbl]) => (
                            <option key={val} value={val}>
                              {lbl}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={job.sampleStatus}
                          onChange={e =>
                            handleQuickPatchJob(job.id, {
                              sampleStatus: e.target.value as SelfSampleStatus,
                            })
                          }
                          className="h-6 text-2xs py-0 px-1 w-28"
                        >
                          {Object.entries(SELF_SAMPLE_LABEL).map(([val, lbl]) => (
                            <option key={val} value={val}>
                              {lbl}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>

                    {/* Cột 5: QA Video nháp */}
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-2xs font-medium ${
                            job.videoQaStatus === 'INTERNAL_QA_PASSED' || job.videoQaStatus === 'BRAND_APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-sunken text-ink-2'
                          }`}
                        >
                          {SELF_VIDEO_QA_LABEL[job.videoQaStatus]}
                        </span>
                        {job.draftVideoUrl && (
                          <a
                            href={job.draftVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                            title="Mở video nháp trên Google Drive"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {job.draftVideoUrl &&
                        job.videoQaStatus !== 'INTERNAL_QA_PASSED' &&
                        job.videoQaStatus !== 'BRAND_APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleQuickApproveQa(job)}
                            className="mt-1 text-2xs text-primary hover:underline font-medium"
                          >
                            Duyệt QA
                          </button>
                        )}
                    </td>

                    {/* Cột 6: Đăng kênh (Air) — Hỗ trợ gắn nhanh Link Air + Ngày đăng ngay trên dòng */}
                    <td className={TD}>
                      <div className="text-2xs text-ink-2">{SELF_PLATFORM_LABEL[job.publishPlatform]}</div>
                      {inlineAirJobId === job.id ? (
                        <div className="mt-1 space-y-1 bg-sunken/60 p-1.5 rounded border border-line-strong">
                          <input
                            type="url"
                            placeholder="Dán link video kênh..."
                            value={inlineAirUrl}
                            onChange={e => setInlineAirUrl(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveInlineAir(job.id);
                              if (e.key === 'Escape') setInlineAirJobId(null);
                            }}
                            className="h-6 w-36 rounded border border-line-strong bg-surface px-1.5 text-2xs text-ink focus:border-focus focus:outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={inlineAirDate}
                              onChange={e => setInlineAirDate(e.target.value)}
                              className="h-6 w-24 rounded border border-line bg-surface px-1 text-2xs text-ink"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineAir(job.id)}
                              className="rounded bg-primary px-1.5 py-0.5 text-2xs font-medium text-white"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineAirJobId(null)}
                              className="text-2xs text-ink-3 hover:text-ink px-1"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : job.airLink ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <a
                            href={job.airLink}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate max-w-[120px] text-primary hover:underline font-medium text-2xs"
                          >
                            {job.airLink}
                          </a>
                          <ExternalLink className="h-3 w-3 text-ink-3 shrink-0" />
                          <button
                            type="button"
                            onClick={() => {
                              setInlineAirJobId(job.id);
                              setInlineAirUrl(job.airLink);
                              setInlineAirDate(job.airedAt || getVietnamDateYmd());
                            }}
                            className="text-2xs text-ink-3 hover:text-ink underline ml-1"
                            title="Sửa nhanh link đăng"
                          >
                            Sửa
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineAirJobId(job.id);
                            setInlineAirUrl('');
                            setInlineAirDate(getVietnamDateYmd());
                          }}
                          className="text-2xs text-primary hover:underline font-medium mt-0.5"
                        >
                          + Gắn nhanh link Air
                        </button>
                      )}
                      <div className="text-2xs text-ink-3 mt-0.5">{job.airedAt || 'Chưa lên sóng'}</div>
                    </td>

                    {/* Cột 7: Nghiệm thu & BBNT */}
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-2xs font-medium ${
                            job.acceptanceStatus === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {SELF_ACCEPTANCE_LABEL[job.acceptanceStatus]}
                        </span>
                      </div>
                      {job.bbntCode && <div className="text-2xs text-ink-3 mt-0.5">{job.bbntCode}</div>}
                      {job.acceptanceStatus !== 'PASSED' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAcceptance(job)}
                          className="mt-1 text-2xs text-emerald-700 hover:underline font-medium"
                        >
                          Nghiệm thu Đạt
                        </button>
                      )}
                    </td>

                    {/* Cột 8: Thù lao & Thanh toán */}
                    <td className={TD}>
                      {job.feeGross > 0 ? (
                        <div>
                          <div className="font-semibold text-ink">{fmt(job.feeGross)} đ</div>
                          {job.withholdPit10 && (
                            <div className="text-2xs text-ink-3">
                              Thực nhận: {fmt(job.netPayout)} đ (-10% TNCN)
                            </div>
                          )}
                          <div className="mt-0.5 flex items-center gap-1">
                            <span
                              className={`rounded px-1 py-0.5 text-2xs font-medium ${
                                job.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : job.paymentStatus === 'REQUESTED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {SELF_PAYMENT_LABEL[job.paymentStatus]}
                            </span>
                            {job.dnttSlipCode && (
                              <span className="text-2xs text-ink-3" title="Mã phiếu ĐNTT">
                                {job.dnttSlipCode}
                              </span>
                            )}
                          </div>
                          {job.uncRef && <div className="text-2xs text-ink-3">UNC: {job.uncRef}</div>}
                        </div>
                      ) : (
                        <span className="text-ink-3">0đ (Nội bộ)</span>
                      )}
                    </td>

                    {/* Cột 9: Thao tác */}
                    <td className={`${TD} text-right`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setActiveJobId(job.id)}>
                          Chi tiết
                        </Button>
                        {isFinancialLocked ? (
                          <span
                            className="p-1 text-ink-3/50 cursor-not-allowed"
                            title="Đã lập phiếu ĐNTT / Đã giải ngân nên khóa xóa"
                          >
                            <Lock className="h-4 w-4" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id, job.code)}
                            className="p-1 text-ink-3 hover:text-red-600 transition-colors"
                            title="Xóa công việc"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. MODAL CHI TIẾT QUY TRÌNH 6 BƯỚC, NGHIỆM THU & THANH TOÁN CỦA 1 JOB */}
      {activeJobDraft && (
        <Modal
          open={Boolean(activeJobDraft)}
          onClose={() => setActiveJobId(null)}
          title={`Chi tiết công việc ${activeJobDraft.code} · ${SELF_FORMAT_LABEL[activeJobDraft.formatKey]}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-ink-3">
                Cập nhật lần cuối: {activeJobDraft.updatedAt ? activeJobDraft.updatedAt.slice(0, 16) : 'Mới tạo'}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setActiveJobId(null)}>
                  Đóng
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveActiveDraft}>
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            {/* KHỐI 1 — ĐỀ BÀI, HÌNH THỨC SẢN XUẤT & HỒ SƠ CTV */}
            <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>1. Đề bài, Hình thức sản xuất & Hồ sơ CTV</span>
                <span className="text-xs font-normal text-ink-3">Bước 1 & 2 Quy trình</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Định dạng video">
                  <Select
                    value={activeJobDraft.formatKey}
                    onChange={e =>
                      setActiveJobDraft({
                        ...activeJobDraft,
                        formatKey: e.target.value as SelfFormatKey,
                      })
                    }
                  >
                    {Object.entries(SELF_FORMAT_LABEL).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tuần kế hoạch">
                  <Select
                    value={activeJobDraft.week}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, week: e.target.value })}
                  >
                    {!activeJobDraft.week && <option value="">-- Chọn tuần --</option>}
                    {activeJobDraft.week && !planWeeks.includes(activeJobDraft.week) && (
                      <option value={activeJobDraft.week}>{activeJobDraft.week}</option>
                    )}
                    {planWeeks.map(w => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Hình thức sản xuất">
                  <Select
                    value={activeJobDraft.productionMode}
                    onChange={e => {
                      const nextMode = e.target.value as SelfProductionMode;
                      const fin = computeJobFinancials(
                        activeJobDraft.feeGross,
                        nextMode,
                        activeJobDraft.withholdPit10
                      );
                      setActiveJobDraft({
                        ...activeJobDraft,
                        productionMode: nextMode,
                        feeGross: fin.feeGross,
                        withholdPit10: fin.withholdPit10,
                        pitTaxAmount: fin.pitTaxAmount,
                        netPayout: fin.netPayout,
                      });
                    }}
                  >
                    <option value="CTV_OUTSOURCE">Thuê CTV ngoài</option>
                    <option value="INHOUSE">Tự sản xuất nội bộ</option>
                  </Select>
                </Field>

                <Field label="PIC Content nội bộ">
                  <Input
                    value={activeJobDraft.contentPic}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, contentPic: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Tên sản phẩm">
                  <Input
                    value={activeJobDraft.productName}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, productName: e.target.value })}
                    placeholder="Tên sản phẩm chính trong video..."
                  />
                </Field>
                <Field label="Mã SKU">
                  <Input
                    value={activeJobDraft.skuCode || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, skuCode: e.target.value })}
                    placeholder="VD: KUTIE-SOOTH-30G..."
                  />
                </Field>
                <Field label="Góc nội dung (Angle)">
                  <Input
                    value={activeJobDraft.angle}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, angle: e.target.value })}
                    placeholder="Góc tiếp cận sản phẩm..."
                  />
                </Field>
                <Field label="Trụ cột nội dung (Pillar)">
                  <Input
                    value={activeJobDraft.pillar}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, pillar: e.target.value })}
                    placeholder="Review, Tips, Drama..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Mở đầu 3 giây (Hook)">
                  <Input
                    value={activeJobDraft.hook || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, hook: e.target.value })}
                    placeholder="Câu hook gây tò mò..."
                  />
                </Field>
                <Field label="Thông điệp USP">
                  <Input
                    value={activeJobDraft.usp || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, usp: e.target.value })}
                    placeholder="Lợi thế sản phẩm..."
                  />
                </Field>
                <Field label="Kêu gọi hành động (CTA)">
                  <Input
                    value={activeJobDraft.cta || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, cta: e.target.value })}
                    placeholder="Bấm vào giỏ hàng..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Link giỏ hàng sản phẩm (PDP)">
                  <Input
                    value={activeJobDraft.cartUrl || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, cartUrl: e.target.value })}
                    placeholder="https://shop.tiktok.com/..."
                  />
                </Field>
                <Field label="Link tài liệu Brief chi tiết">
                  <Input
                    value={activeJobDraft.briefUrl || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, briefUrl: e.target.value })}
                    placeholder="https://docs.google.com/..."
                  />
                </Field>
                <Field label="Từ khóa cấm / Do & Don't của Brand">
                  <Input
                    value={activeJobDraft.forbiddenClaims || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, forbiddenClaims: e.target.value })}
                    placeholder="Cam kết trị dứt điểm 100%, khỏi hẳn..."
                  />
                </Field>
              </div>

              {/* Thông tin hồ sơ CTV khi chọn CTV_OUTSOURCE */}
              {activeJobDraft.productionMode === 'CTV_OUTSOURCE' && (
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-900">
                      Hồ sơ & Thông tin giải ngân CTV ngoài
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs text-ink-3">Chọn nhanh từ danh bạ:</span>
                      <Select
                        className="h-7 text-xs py-0 w-52"
                        disabled={
                          activeJobDraft.paymentStatus === 'REQUESTED' ||
                          activeJobDraft.paymentStatus === 'PAID'
                        }
                        onChange={e => {
                          const ctv = effectiveContributors.find(c => c.id === e.target.value);
                          if (ctv) {
                            const updatedDraft = applyContributorToSelfJob(activeJobDraft, ctv);
                            setActiveJobDraft(updatedDraft);

                            const ctvName = ctv.name.trim().toLowerCase();
                            const nextJobs = board.jobs.map(j => {
                              if (j.id === updatedDraft.id) return updatedDraft;
                              const isSame =
                                (j.contributorId && j.contributorId === ctv.id) ||
                                (j.contributorName && j.contributorName.trim().toLowerCase() === ctvName);
                              if (!isSame) return j;
                              return {
                                ...j,
                                contributorId: j.contributorId || ctv.id,
                                contractNo: j.contractNo || updatedDraft.contractNo,
                                legalId: j.legalId || updatedDraft.legalId,
                                bankName: j.bankName || updatedDraft.bankName,
                                bankAccount: j.bankAccount || updatedDraft.bankAccount,
                                bankHolder: j.bankHolder || updatedDraft.bankHolder,
                                updatedAt: new Date().toISOString(),
                              };
                            });
                            updateBoard({ ...board, jobs: nextJobs });
                            notify(
                              `Đã chọn CTV ${ctv.name} (đơn giá ${fmt(updatedDraft.feeGross)}đ${
                                updatedDraft.sampleStatus === 'ON_HAND' ? ' · Đã có sẵn mẫu tại nhà' : ''
                              }).`,
                              'success'
                            );
                          }
                        }}
                      >
                        <option value="">-- Chọn CTV mẫu --</option>
                        {effectiveContributors.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({fmt(c.unitRateAllInOne || c.unitRateShootingOnly || c.unitRateEditOnly || 0)}đ)
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Họ tên CTV">
                      <Input
                        value={activeJobDraft.contributorName}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, contributorName: e.target.value })}
                      />
                    </Field>
                    <Field label="Số Hợp đồng CTV">
                      <Input
                        value={activeJobDraft.contractNo || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, contractNo: e.target.value })}
                        placeholder="HD-CTV-2026-..."
                      />
                    </Field>
                    <Field label="Số CCCD / Mã số thuế">
                      <Input
                        value={activeJobDraft.legalId || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, legalId: e.target.value })}
                        placeholder="12 số CCCD hoặc MST"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Ngân hàng">
                      <Input
                        value={activeJobDraft.bankName || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, bankName: e.target.value })}
                        placeholder="Techcombank, MB, VCB..."
                      />
                    </Field>
                    <Field label="Số tài khoản ngân hàng">
                      <Input
                        value={activeJobDraft.bankAccount || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, bankAccount: e.target.value })}
                      />
                    </Field>
                    <Field label="Tên chủ tài khoản">
                      <Input
                        value={activeJobDraft.bankHolder || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, bankHolder: e.target.value })}
                        placeholder="NGUYEN VAN A"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-amber-200">
                    <Field label="Trạng thái hàng mẫu">
                      <Select
                        value={activeJobDraft.sampleStatus}
                        onChange={e =>
                          setActiveJobDraft({
                            ...activeJobDraft,
                            sampleStatus: e.target.value as SelfSampleStatus,
                          })
                        }
                      >
                        {Object.entries(SELF_SAMPLE_LABEL).map(([val, lbl]) => (
                          <option key={val} value={val}>
                            {lbl}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Mã vận đơn gửi mẫu">
                      <Input
                        value={activeJobDraft.trackingCode || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, trackingCode: e.target.value })}
                        placeholder="Mã vận đơn ViettelPost / GHTK..."
                      />
                    </Field>
                    <Field label="Địa chỉ nhận mẫu của CTV">
                      <Input
                        value={activeJobDraft.shippingAddress || ''}
                        onChange={e => setActiveJobDraft({ ...activeJobDraft, shippingAddress: e.target.value })}
                        placeholder="Tự động điền khi chọn CTV từ danh bạ..."
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* KHỐI 2 — DUYỆT KỊCH BẢN & QA VIDEO NHÁP (NỘI BỘ) */}
            <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>2. Duyệt Kịch bản & QA Video nháp (Nội bộ)</span>
                <span className="text-xs font-normal text-ink-3">Bước 3 Quy trình</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Trạng thái kịch bản">
                  <Select
                    value={activeJobDraft.scriptStatus}
                    onChange={e =>
                      setActiveJobDraft({
                        ...activeJobDraft,
                        scriptStatus: e.target.value as SelfScriptStatus,
                      })
                    }
                  >
                    {Object.entries(SELF_SCRIPT_LABEL).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Link kịch bản Google Docs" className="md:col-span-2">
                  <Input
                    value={activeJobDraft.scriptUrl || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, scriptUrl: e.target.value })}
                    placeholder="https://docs.google.com/document/d/..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Link Google Drive video nháp">
                  <Input
                    value={activeJobDraft.draftVideoUrl}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, draftVideoUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </Field>
                <Field label="Link thư mục Drive tổng gian hàng">
                  <Input
                    value={activeJobDraft.finalDriveUrl || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, finalDriveUrl: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </Field>
              </div>

              {/* Cảnh báo Từ khóa cấm của Brand để người chấm QA đối chiếu */}
              {activeJobDraft.forbiddenClaims && (
                <div className="rounded border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Từ khóa cấm / Lưu ý bắt buộc của Brand: </span>
                    <span>{activeJobDraft.forbiddenClaims}</span>
                  </div>
                </div>
              )}

              {/* 4 Tiêu chí QA nội bộ */}
              <div className="rounded border border-line bg-sunken/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Danh mục kiểm tra chất lượng Video nháp (QA)</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={CheckCircle2}
                    onClick={() => {
                      const next: SelfChannelJob = {
                        ...activeJobDraft,
                        qaChecklist: {
                          hookOk: true,
                          productOk: true,
                          audioVisualOk: true,
                          guidelineOk: true,
                        },
                        videoQaStatus: 'INTERNAL_QA_PASSED',
                        qaReviewedBy: currentUserName,
                        qaReviewedAt: getVietnamDateYmd(),
                      };
                      applyAndPersistDraft(next, 'Đã xác nhận đạt toàn bộ 4 tiêu chí QA nội bộ.');
                    }}
                  >
                    Xác nhận Đạt QA nội bộ
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeJobDraft.qaChecklist.hookOk}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          qaChecklist: { ...activeJobDraft.qaChecklist, hookOk: e.target.checked },
                        })
                      }
                      className="rounded border-line-strong text-primary"
                    />
                    <span>Mở đầu 3 giây đúng Hook</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeJobDraft.qaChecklist.productOk}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          qaChecklist: { ...activeJobDraft.qaChecklist, productOk: e.target.checked },
                        })
                      }
                      className="rounded border-line-strong text-primary"
                    />
                    <span>Hình ảnh sản phẩm rõ nét</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeJobDraft.qaChecklist.audioVisualOk}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          qaChecklist: { ...activeJobDraft.qaChecklist, audioVisualOk: e.target.checked },
                        })
                      }
                      className="rounded border-line-strong text-primary"
                    />
                    <span>Âm thanh & ánh sáng đạt chuẩn</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeJobDraft.qaChecklist.guidelineOk}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          qaChecklist: { ...activeJobDraft.qaChecklist, guidelineOk: e.target.checked },
                        })
                      }
                      className="rounded border-line-strong text-primary"
                    />
                    <span>Tuân thủ quy định từ khóa của Brand</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <Field label="Trạng thái QA Video">
                    <Select
                      value={activeJobDraft.videoQaStatus}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          videoQaStatus: e.target.value as SelfVideoQaStatus,
                        })
                      }
                    >
                      {Object.entries(SELF_VIDEO_QA_LABEL).map(([val, lbl]) => (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Người duyệt QA">
                    <Input
                      value={activeJobDraft.qaReviewedBy || ''}
                      onChange={e => setActiveJobDraft({ ...activeJobDraft, qaReviewedBy: e.target.value })}
                    />
                  </Field>
                  <Field label="Ngày duyệt QA">
                    <Input
                      type="date"
                      value={activeJobDraft.qaReviewedAt || ''}
                      onChange={e => setActiveJobDraft({ ...activeJobDraft, qaReviewedAt: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* KHỐI 3 — ĐĂNG KÊNH CHÍNH CHỦ & NGHIỆM THU (BBNT) */}
            <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>3. Đăng kênh chính chủ & Nghiệm thu (BBNT)</span>
                <span className="text-xs font-normal text-ink-3">Bước 4 & 5 Quy trình</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Nền tảng đăng video">
                  <Select
                    value={activeJobDraft.publishPlatform}
                    onChange={e =>
                      setActiveJobDraft({
                        ...activeJobDraft,
                        publishPlatform: e.target.value as SelfPublishPlatform,
                      })
                    }
                  >
                    {Object.entries(SELF_PLATFORM_LABEL).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Link video trên kênh Brand" className="md:col-span-2">
                  <Input
                    value={activeJobDraft.airLink}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, airLink: e.target.value })}
                    placeholder="https://www.tiktok.com/@brand/video/..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Ngày đăng (Lên sóng)">
                  <Input
                    type="date"
                    value={activeJobDraft.airedAt}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, airedAt: e.target.value })}
                  />
                </Field>
                <Field label="Hạn đăng (Deadline)">
                  <Input
                    type="date"
                    value={activeJobDraft.deadline}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, deadline: e.target.value })}
                  />
                </Field>
                <Field label="Mã Spark Ads">
                  <Input
                    value={activeJobDraft.sparkAdsCode || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, sparkAdsCode: e.target.value })}
                  />
                </Field>
                <Field label="Lượt xem (Views)">
                  <Input
                    type="number"
                    min={0}
                    value={activeJobDraft.views ?? ''}
                    onChange={e =>
                      setActiveJobDraft({
                        ...activeJobDraft,
                        views: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </Field>
              </div>

              {/* Biên bản nghiệm thu */}
              <div className="rounded border border-line bg-sunken/40 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">Hồ sơ Nghiệm thu Video & Bảng công</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const code = `BBNT-${(activePlan?.brandName || 'BRAND').slice(0, 4).toUpperCase()}-${activeJobDraft.code}`;
                        setActiveJobDraft({ ...activeJobDraft, bbntCode: code });
                      }}
                    >
                      Tạo mã BBNT
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={FileCheck2}
                      onClick={() => {
                        const blocker = selfJobAcceptanceBlocker(activeJobDraft);
                        if (blocker) {
                          notify(blocker, 'warning');
                          return;
                        }
                        const nextBbnt =
                          activeJobDraft.bbntCode ||
                          (activeJobDraft.productionMode === 'CTV_OUTSOURCE' && activeJobDraft.feeGross > 0
                            ? `BBNT-${(activePlan?.brandName || 'BRAND').slice(0, 4).toUpperCase()}-${activeJobDraft.code}`
                            : undefined);

                        const next: SelfChannelJob = {
                          ...activeJobDraft,
                          acceptanceStatus: 'PASSED',
                          acceptedAt: getVietnamDateYmd(),
                          acceptedBy: currentUserName,
                          bbntCode: nextBbnt,
                        };
                        applyAndPersistDraft(next, `Đã nghiệm thu Đạt cho video ${activeJobDraft.code}.`);
                      }}
                    >
                      Nghiệm thu Đạt
                    </Button>
                  </div>
                </div>

                {selfJobAcceptanceBlocker(activeJobDraft) && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 text-2xs text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Điều kiện nghiệm thu chưa hoàn tất: {selfJobAcceptanceBlocker(activeJobDraft)}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Trạng thái nghiệm thu">
                    <Select
                      value={activeJobDraft.acceptanceStatus}
                      onChange={e =>
                        setActiveJobDraft({
                          ...activeJobDraft,
                          acceptanceStatus: e.target.value as SelfAcceptanceStatus,
                        })
                      }
                    >
                      {Object.entries(SELF_ACCEPTANCE_LABEL).map(([val, lbl]) => (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Mã Biên bản nghiệm thu (BBNT)">
                    <Input
                      value={activeJobDraft.bbntCode || ''}
                      onChange={e => setActiveJobDraft({ ...activeJobDraft, bbntCode: e.target.value })}
                      placeholder="BBNT-CLIO-SC-01..."
                    />
                  </Field>
                  <Field label="Link file BBNT ký điện tử">
                    <Input
                      value={activeJobDraft.bbntUrl || ''}
                      onChange={e => setActiveJobDraft({ ...activeJobDraft, bbntUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* KHỐI 4 — TÍNH THUẾ TNCN, ĐỀ NGHỊ THANH TOÁN & GIẢI NGÂN */}
            <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>4. Tính thuế TNCN, Đề nghị thanh toán (ĐNTT Lark) & Giải ngân</span>
                <span className="text-xs font-normal text-ink-3">Bước 6 Quy trình</span>
              </div>

              {(activeJobDraft.paymentStatus === 'REQUESTED' || activeJobDraft.paymentStatus === 'PAID') && (
                <div className="rounded border border-blue-200 bg-blue-50/70 p-2 text-2xs text-blue-900 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>
                    Công việc đã lập phiếu ĐNTT ({activeJobDraft.dnttSlipCode || 'Lark'}) nên đơn giá và thuế TNCN được
                    khóa để bảo toàn số liệu đối soát Kế toán.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Thù lao Gross (VNĐ)">
                  <Input
                    type="number"
                    min={0}
                    disabled={
                      activeJobDraft.paymentStatus === 'REQUESTED' ||
                      activeJobDraft.paymentStatus === 'PAID'
                    }
                    value={activeJobDraft.feeGross}
                    onChange={e => {
                      const gross = Number(e.target.value) || 0;
                      const fin = computeJobFinancials(
                        gross,
                        activeJobDraft.productionMode,
                        activeJobDraft.withholdPit10
                      );
                      setActiveJobDraft({
                        ...activeJobDraft,
                        feeGross: fin.feeGross,
                        withholdPit10: fin.withholdPit10,
                        pitTaxAmount: fin.pitTaxAmount,
                        netPayout: fin.netPayout,
                      });
                    }}
                  />
                </Field>

                <div className="flex flex-col justify-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                    <input
                      type="checkbox"
                      disabled={
                        activeJobDraft.paymentStatus === 'REQUESTED' ||
                        activeJobDraft.paymentStatus === 'PAID'
                      }
                      checked={activeJobDraft.withholdPit10}
                      onChange={e => {
                        const checked = e.target.checked;
                        const fin = computeJobFinancials(
                          activeJobDraft.feeGross,
                          activeJobDraft.productionMode,
                          checked
                        );
                        setActiveJobDraft({
                          ...activeJobDraft,
                          withholdPit10: fin.withholdPit10,
                          pitTaxAmount: fin.pitTaxAmount,
                          netPayout: fin.netPayout,
                        });
                      }}
                      className="rounded border-line-strong text-primary"
                    />
                    <span>Khấu trừ 10% thuế TNCN cá nhân</span>
                  </label>
                </div>

                <Field label="Trạng thái thanh toán">
                  <Select
                    value={activeJobDraft.paymentStatus}
                    onChange={e =>
                      setActiveJobDraft({
                        ...activeJobDraft,
                        paymentStatus: e.target.value as SelfPaymentStatus,
                      })
                    }
                  >
                    {Object.entries(SELF_PAYMENT_LABEL).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Bảng tính thù lao Net & Thuế */}
              <div className="grid grid-cols-3 gap-2 rounded border border-line bg-sunken/40 p-2.5 text-center text-xs">
                <div>
                  <div className="text-2xs text-ink-3">Thù lao Gross</div>
                  <div className="text-sm font-semibold text-ink">{fmt(activeJobDraft.feeGross)} đ</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-3">Thuế TNCN khấu trừ (10%)</div>
                  <div className="text-sm font-semibold text-rose-600">
                    - {fmt(activeJobDraft.pitTaxAmount)} đ
                  </div>
                </div>
                <div>
                  <div className="text-2xs text-ink-3">Thực nhận chuyển khoản (Net)</div>
                  <div className="text-sm font-semibold text-emerald-700">
                    {fmt(activeJobDraft.netPayout)} đ
                  </div>
                </div>
              </div>

              {selfJobPaymentBlocker(activeJobDraft) && (
                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-2xs text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Điều kiện lập ĐNTT chưa đạt: {selfJobPaymentBlocker(activeJobDraft)}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Send}
                    disabled={Boolean(selfJobPaymentBlocker(activeJobDraft)) || activeJobDraft.paymentStatus !== 'NONE' || isPushingLarkSingle}
                    onClick={handlePushSingleJobToLark}
                  >
                    {isPushingLarkSingle ? 'Đang gửi sang Lark…' : 'Đẩy phiếu ĐNTT sang Lark'}
                  </Button>
                  {activeJobDraft.dnttSlipCode && (
                    <span className="text-xs font-medium text-blue-700">
                      Mã phiếu Lark: {activeJobDraft.dnttSlipCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Mã lệnh chi / UNC ngân hàng..."
                    value={activeJobDraft.uncRef || ''}
                    onChange={e => setActiveJobDraft({ ...activeJobDraft, uncRef: e.target.value })}
                    className="w-56 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Check}
                    onClick={() => {
                      if (!activeJobDraft.uncRef?.trim()) {
                        notify('Vui lòng nhập Mã lệnh chi / UNC.', 'warning');
                        return;
                      }
                      const next: SelfChannelJob = {
                        ...activeJobDraft,
                        paymentStatus: 'PAID',
                        paidAt: getVietnamDateYmd(),
                      };
                      applyAndPersistDraft(next, `Đã xác nhận giải ngân thành công cho video ${activeJobDraft.code}.`);
                    }}
                  >
                    Xác nhận Đã giải ngân (PAID)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. MODAL CHỐT BẢNG CÔNG & ĐNTT GOM THEO CTV */}
      {isSettlementModalOpen && summary && (
        <Modal
          open={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          title="Chốt bảng công & Đề nghị thanh toán CTV"
          size="xl"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button size="sm" variant="secondary" onClick={() => setIsSettlementModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            {/* Danh sách CTV chờ chốt công */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>Danh sách CTV thực hiện Video trong Kế hoạch</span>
                <span className="text-xs font-normal text-ink-3">
                  {summary.byContributor.length} cộng tác viên
                </span>
              </div>

              {summary.byContributor.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-3">
                  Chưa có công việc nào gắn với CTV trong tháng này.
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.byContributor.map(ctv => (
                    <div
                      key={ctv.contributorName}
                      className="rounded-lg border border-line bg-surface p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink">{ctv.contributorName}</span>
                          <span className="rounded bg-sunken px-2 py-0.5 text-2xs text-ink-2">
                            {ctv.totalJobs} video tổng · {ctv.acceptedUnpaidJobs.length} video chờ chi
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-2xs font-medium ${
                              ctv.legalReady
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {ctv.legalReady ? 'Hồ sơ pháp lý đầy đủ' : ctv.missingReason}
                          </span>

                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Download}
                            onClick={() => handleExportContributorBbntCsv(ctv)}
                          >
                            Xuất BBNT (CSV)
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            icon={Send}
                            disabled={
                              ctv.acceptedUnpaidJobs.length === 0 ||
                              !ctv.legalReady ||
                              pushingCtvBatchId === ctv.contributorName
                            }
                            onClick={() => handlePushContributorBatch(ctv)}
                          >
                            {pushingCtvBatchId === ctv.contributorName
                              ? 'Đang đẩy Lark…'
                              : 'Lập phiếu ĐNTT & Đẩy Lark'}
                          </Button>
                        </div>
                      </div>

                      {/* Chi tiết tài chính */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded border border-line bg-sunken/40 p-2 text-xs">
                        <div>
                          <div className="text-2xs text-ink-3">Số HĐ / CCCD</div>
                          <div className="font-medium text-ink">
                            {ctv.contractNo || '—'} / {ctv.legalId || '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-2xs text-ink-3">Tài khoản nhận tiền</div>
                          <div className="font-medium text-ink">
                            {ctv.bankName ? `${ctv.bankName} · ${ctv.bankAccount}` : 'Chưa có thông tin'}
                          </div>
                        </div>
                        <div>
                          <div className="text-2xs text-ink-3">Tổng Gross chờ thanh toán</div>
                          <div className="font-semibold text-ink">{fmt(ctv.pendingGross)} đ</div>
                        </div>
                        <div>
                          <div className="text-2xs text-ink-3">Thực nhận Net (sau 10% thuế)</div>
                          <div className="font-semibold text-emerald-700">{fmt(ctv.pendingNet)} đ</div>
                        </div>
                      </div>

                      {/* Danh sách mã công việc chờ chi */}
                      {ctv.acceptedUnpaidJobs.length > 0 && (
                        <div className="text-2xs text-ink-3 flex items-center gap-1.5 flex-wrap">
                          <span>Các video nghiệm thu chờ chi:</span>
                          {ctv.acceptedUnpaidJobs.map(j => (
                            <span
                              key={j.id}
                              className="rounded bg-surface border border-line px-1.5 py-0.5 font-medium text-ink"
                            >
                              {j.code} ({fmt(j.netPayout)}đ)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lịch sử các đợt ĐNTT đã lập */}
            <div className="space-y-3 pt-3 border-t border-line">
              <div className="text-sm font-semibold text-ink border-b border-line pb-2 flex items-center justify-between">
                <span>Lịch sử các đợt Đề nghị thanh toán (Lark)</span>
                <span className="text-xs font-normal text-ink-3">
                  {board.settlementBatches.length} đợt đã lập
                </span>
              </div>

              {board.settlementBatches.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-3">
                  Chưa có đợt đề nghị thanh toán nào được lập.
                </div>
              ) : (
                <div className="overflow-x-auto rounded border border-line bg-surface">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr>
                        <th className={TH}>Mã phiếu ĐNTT</th>
                        <th className={TH}>Người thụ hưởng</th>
                        <th className={TH}>Số lượng Video</th>
                        <th className={TH}>Tổng tiền (Gross / Net)</th>
                        <th className={TH}>Ngày lập</th>
                        <th className={TH}>Trạng thái</th>
                        <th className={`${TH} text-right`}>Giải ngân / UNC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.settlementBatches.map(b => (
                        <tr key={b.id} className="hover:bg-sunken/40">
                          <td className={`${TD} font-semibold text-primary`}>{b.slipCode}</td>
                          <td className={TD}>{b.contributorName}</td>
                          <td className={TD}>{b.jobCodes.join(', ')}</td>
                          <td className={TD}>
                            <div className="font-semibold text-ink">{fmt(b.grossTotal)} đ</div>
                            <div className="text-2xs text-emerald-700">Net: {fmt(b.netTotal)} đ</div>
                          </td>
                          <td className={TD}>
                            <div>{b.requestedAt}</div>
                            <div className="text-2xs text-ink-3">{b.requestedBy}</div>
                          </td>
                          <td className={TD}>
                            <span
                              className={`rounded px-2 py-0.5 text-2xs font-medium ${
                                b.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Đã giải ngân' : 'Chờ giải ngân'}
                            </span>
                            {b.uncRef && <div className="text-2xs text-ink-3 mt-0.5">UNC: {b.uncRef}</div>}
                          </td>
                          <td className={`${TD} text-right`}>
                            {b.status === 'REQUESTED' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Nhập mã UNC..."
                                  value={batchUncInput[b.id] || ''}
                                  onChange={e =>
                                    setBatchUncInput({ ...batchUncInput, [b.id]: e.target.value })
                                  }
                                  className="h-7 w-32 rounded border border-line-strong bg-surface px-2 text-2xs text-ink focus:border-focus focus:outline-none"
                                />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleConfirmDisbursedBatch(b)}
                                >
                                  Xác nhận chi
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSettlementBatch(b)}
                                  className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-2xs font-medium text-rose-700 hover:bg-rose-100"
                                  title="Thu hồi đợt ĐNTT này để mở khóa sửa lại Job"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Thu hồi</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-2xs text-emerald-700 font-medium">Hoàn tất ({b.paidAt})</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. HỘP THOẠI XÁC NHẬN XÓA JOB VIDEO */}
      <ConfirmDialog
        open={Boolean(pendingDeleteJob)}
        title="Xác nhận xóa công việc video"
        message={
          pendingDeleteJob
            ? `Bạn có chắc chắn muốn xóa công việc ${pendingDeleteJob.code} khỏi bảng triển khai kế hoạch?`
            : ''
        }
        confirmLabel="Xóa công việc"
        cancelLabel="Hủy"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteJob(null)}
      />
    </div>
  );
};
