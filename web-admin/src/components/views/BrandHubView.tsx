'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,

  ExternalLink,
  RotateCcw,
  MessageSquare,
  Send,
  Eye,
  Check,
  Play,
  FileText,
  Share2,
  Briefcase,
  History,
  LayoutDashboard,
  Download,
  Search,
  ArrowRight,
  ArrowLeft,
  Store,
  BookOpen,
  Sliders,
  Pencil
} from 'lucide-react';
import {
  BrandCampaignPortalData,
  BrandKocCandidate,
  BrandScriptItem,
  BrandRejectReasonType,
  BookingDealItem,
  BrandDetail,
  StorePortfolioItem,
  UserProfile
} from '../../lib/types';
import { INITIAL_BRAND_PORTAL_DATA, INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { formatVndShort } from '../../lib/format';
import { BrandAvatar, ChannelTag, Status, Modal, Button } from '../ui';
import { useBrandProfiles } from '../../lib/brands/useBrandProfiles';
import { BrandProfileDetail } from '../brands/BrandProfileDetail';
import {
  buildRows,
  permissionsOf,
  real,
  KOC_APPROVAL_MODE_LABEL,
  SAMPLE_SENDER_LABEL,
  type BrandRow,
} from '../brands/brandUi';
import { brandKey, type BrandSection } from '../../lib/brands/types';
import { StoreProfile } from '../stores/StoreProfile';
import { StoreEditDialog } from '../stores/StoreEditDialog';

export interface BrandHubViewProps {
  currentUser?: UserProfile;
  deals?: BookingDealItem[];
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  onUpdateStore?: (updatedStore: StorePortfolioItem) => void;
  onOpenBooking?: () => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToCtvHub?: () => void;
  onNavigateToKocHub?: () => void;
  onBrandApproveDeal?: (kocOrDeal: string) => void;
  onBrandRejectDeal?: (kocOrDeal: string, reason: string) => void;
  selectedBrand?: string;
}

export type BrandHubPillarTab =
  | 'OVERVIEW'
  | 'BRAND_PROFILE'
  | 'STORES'
  | 'APPROVALS'
  | 'ACTIVE_JOBS'
  | 'DISCUSSION'
  | 'HISTORY';

interface ChatMessage {
  id: string;
  sender: 'BRAND' | 'UPBASE_ACCOUNT' | 'UPBASE_BOOKING';
  senderName: string;
  senderRole: string;
  avatarText: string;
  time: string;
  content: string;
  attachmentName?: string;
}

export const BrandHubView: React.FC<BrandHubViewProps> = ({ 
  currentUser,
  deals = [],
  brands = INITIAL_BRANDS,
  stores = INITIAL_STORE_PORTFOLIOS,
  onUpdateStore,
  onOpenBooking,
  onNotify,
  onBrandApproveDeal,
  onBrandRejectDeal,
  selectedBrand = 'ALL'
}) => {
  // Liên thông trực tiếp với Hồ sơ thương hiệu (/api/brands/profiles)
  const { profiles, access, saveSection } = useBrandProfiles(currentUser?.id);
  const [savingBrandProfile, setSavingBrandProfile] = useState(false);

  const brandRows = useMemo<BrandRow[]>(
    () => buildRows(brands, profiles),
    [brands, profiles]
  );

  // Mở rộng danh sách cổng cho toàn bộ nhãn hàng B2C (kết hợp dữ liệu chiến dịch mẫu và dữ liệu thực từ Hồ sơ thương hiệu & Gian hàng)
  const [portalOverrides, setPortalOverrides] = useState<Record<string, Partial<BrandCampaignPortalData>>>({});

  const portals = useMemo<BrandCampaignPortalData[]>(() => {
    const result: BrandCampaignPortalData[] = [];
    const seenKeys = new Set<string>();

    // 1. Giữ nguyên các cổng chiến dịch có sẵn, đồng thời đồng bộ thông tin mới nhất từ Hồ sơ thương hiệu & Gian hàng
    for (const p of INITIAL_BRAND_PORTAL_DATA) {
      const k = brandKey(p.brandName);
      seenKeys.add(k);
      const row = brandRows.find(r => r.key === k);
      const brandStores = stores.filter(s => brandKey(s.brandName) === k);
      const storeBudgetSum = brandStores.reduce((sum, s) => sum + (s.budgetNet ?? s.monthlyBudget ?? 0), 0);
      const storeTargetGmvSum = brandStores.reduce((sum, s) => sum + (s.monthlyTargetGmv ?? 0), 0);
      const liveHeroSkus = row?.profile.products?.filter(pr => pr.name.trim()).map(pr => pr.name) || [];
      const override = portalOverrides[p.id] || {};

      result.push({
        ...p,
        accountPic: real(row?.profile.workflowRules?.brandApproverName) || real(row?.master?.accountPic) || p.accountPic,
        totalBudget: storeBudgetSum > 0 ? storeBudgetSum : (row?.master?.planBudget || row?.master?.monthlyBudget || p.totalBudget),
        targetGmv: storeTargetGmvSum > 0 ? storeTargetGmvSum : p.targetGmv,
        bigIdea: real(row?.profile.positioning?.slogan) || real(row?.master?.brandGuideline) || p.bigIdea,
        focusSkus: liveHeroSkus.length > 0 ? liveHeroSkus : p.focusSkus,
        ...override,
      });
    }

    // 2. Tạo cổng tự động cho toàn bộ các thương hiệu còn lại trong hệ thống B2C để mọi nhãn hàng đều có Cổng Đối Tác
    for (const row of brandRows) {
      if (seenKeys.has(row.key)) continue;
      seenKeys.add(row.key);
      const brandStores = stores.filter(s => brandKey(s.brandName) === row.key);
      const storeBudgetSum = brandStores.reduce((sum, s) => sum + (s.budgetNet ?? s.monthlyBudget ?? 0), 0);
      const storeTargetGmvSum = brandStores.reduce((sum, s) => sum + (s.monthlyTargetGmv ?? 0), 0);
      const storeTargetVideos = brandStores.reduce(
        (sum, s) => sum + (s.targetAffiliateContents ?? 0) + (s.targetSelfChannelContents ?? 0),
        0
      );
      const totalBudget = storeBudgetSum || row.master?.planBudget || row.master?.monthlyBudget || 50_000_000;
      const targetGmv = storeTargetGmvSum || totalBudget * 5;
      const profileSkus = row.profile.products?.filter(pr => pr.name.trim()).map(pr => pr.name) || [];
      const masterSkus = row.master?.heroProducts?.map(h => h.productName) || [];
      const liveHeroSkus = profileSkus.length > 0 ? profileSkus : (masterSkus.length > 0 ? masterSkus : ['Sản phẩm chủ lực']);
      const targetVideosCount = storeTargetVideos || 20;
      const avgCost = Math.round(totalBudget / Math.max(1, targetVideosCount));
      const portalId = `bp-${row.key}`;
      const override = portalOverrides[portalId] || {};

      result.push({
        id: portalId,
        brandId: row.master?.id || portalId,
        brandName: row.name,
        brandLogoText: row.name.slice(0, 3).toUpperCase(),
        campaignTitle: `Chiến dịch KOC/Affiliate — ${row.name}`,
        campaignCode: `CP-2026-${row.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`,
        month: 'Tháng 10/2026',
        accountPic: real(row.profile.workflowRules?.brandApproverName) || real(row.master?.accountPic) || 'Đặng Thị Yến Nhi',
        bookingPic: brandStores[0]?.b2cOwnerName || brandStores[0]?.bookingLeader || 'Team Booking B2C',
        totalBudget,
        targetGmv,
        targetCir: targetGmv > 0 ? Number(((totalBudget / targetGmv) * 100).toFixed(1)) : 20,
        totalTargetVideos: targetVideosCount,
        liveAiredVideosCount: 0,
        totalAiredViews: 0,
        totalAffiliateGmv: 0,
        bigIdea: real(row.profile.positioning?.slogan) || real(row.master?.brandGuideline) || `Tăng trưởng nhận diện & chuyển đổi gian hàng ${row.name}`,
        focusSkus: liveHeroSkus,
        planApprovalStatus: 'BRAND_PLAN_APPROVED',
        breakdownTiers: [
          {
            tier: 'TIER_3_MICRO',
            tierLabel: 'Micro & Nano KOC (Review chuyển đổi)',
            salaryGradeLabel: 'KL1-KL3',
            targetCount: targetVideosCount,
            estimatedAvgCost: avgCost,
            allocatedBudget: totalBudget,
            estimatedGmvPerKoc: Math.round(targetGmv / Math.max(1, targetVideosCount)),
            totalExpectedGmv: targetGmv,
            historicalRoiBenchmark: 5.0,
          },
        ],
        kocCandidates: [],
        scripts: [],
        ...override,
      });
    }

    return result;
  }, [brandRows, stores, portalOverrides]);

  const setPortals: React.Dispatch<React.SetStateAction<BrandCampaignPortalData[]>> = (updater) => {
    setPortalOverrides(prev => {
      const nextList = typeof updater === 'function' ? updater(portals) : updater;
      const nextMap = { ...prev };
      for (const item of nextList) {
        nextMap[item.id] = item;
      }
      return nextMap;
    });
  };

  const [selectedPortalId, setSelectedPortalId] = useState<string>(() => {
    if (currentUser?.role === 'BRAND_PARTNER' && currentUser?.linkedEntityName) {
      const match = INITIAL_BRAND_PORTAL_DATA.find(
        p => brandKey(p.brandName) === brandKey(currentUser.linkedEntityName!) ||
          p.brandName.toLowerCase().includes(currentUser.linkedEntityName!.toLowerCase())
      );
      if (match) return match.id;
      return `bp-${brandKey(currentUser.linkedEntityName)}`;
    }
    return INITIAL_BRAND_PORTAL_DATA[0].id;
  });

  // Đồng bộ với Bộ chọn nhãn hàng toàn cục
  const [prevSelectedBrand, setPrevSelectedBrand] = useState<string | undefined>(selectedBrand);
  if (selectedBrand !== prevSelectedBrand) {
    setPrevSelectedBrand(selectedBrand);
    if (selectedBrand) {
      if (selectedBrand === 'ALL') {
        if (['ADMIN', 'MANAGER', 'LEADER'].includes(currentUser?.role || '')) {
          setSelectedPortalId('ALL');
        }
      } else {
        const match = portals.find(
          p => brandKey(p.brandName) === brandKey(selectedBrand) ||
            p.brandName.toLowerCase().includes(selectedBrand.toLowerCase())
        );
        if (match) {
          setSelectedPortalId(match.id);
        }
      }
    }
  }

  const activePortal = useMemo(() => {
    return portals.find(p => p.id === selectedPortalId) || portals[0];
  }, [portals, selectedPortalId]);

  // Liên kết trực tiếp Thương hiệu đang chọn với Hồ sơ thương hiệu (BrandRow), Danh sách Gian hàng (StorePortfolioItem) & Deals
  const activeBrandKey = useMemo(() => brandKey(activePortal.brandName), [activePortal.brandName]);

  const activeBrandRow = useMemo<BrandRow | undefined>(() => {
    return brandRows.find(r => r.key === activeBrandKey);
  }, [brandRows, activeBrandKey]);

  const activeBrandStores = useMemo<StorePortfolioItem[]>(() => {
    return stores.filter(s => brandKey(s.brandName) === activeBrandKey);
  }, [stores, activeBrandKey]);

  const activeBrandDeals = useMemo<BookingDealItem[]>(() => {
    return deals.filter(d => brandKey(d.brandName || '') === activeBrandKey);
  }, [deals, activeBrandKey]);

  const activeBrandPermissions = useMemo(() => {
    return permissionsOf(
      access,
      activeBrandRow?.profile.workflowRules?.brandApproverName || activeBrandRow?.master?.accountPic,
      activeBrandRow?.name || activePortal.brandName
    );
  }, [access, activeBrandRow, activePortal.brandName]);

  // State quản lý chi tiết / chỉnh sửa Gian hàng ngay trong Cổng Đối Tác Brand
  const [inspectingStore, setInspectingStore] = useState<StorePortfolioItem | null>(null);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);

  const handleSaveBrandSection = async (section: BrandSection, data: unknown, summary?: string): Promise<boolean> => {
    if (!activeBrandRow) return false;
    setSavingBrandProfile(true);
    try {
      const ok = await saveSection({
        brandName: activeBrandRow.name,
        revision: activeBrandRow.profile.revision,
        section,
        data,
        summary,
      });
      if (ok) {
        onNotify?.(`Đã lưu hồ sơ thương hiệu ${activeBrandRow.name} — đồng bộ trực tiếp sang quy trình vận hành B2C.`, 'success');
      }
      return Boolean(ok);
    } catch (err) {
      onNotify?.((err as Error).message || 'Không thể lưu hồ sơ thương hiệu', 'error');
      return false;
    } finally {
      setSavingBrandProfile(false);
    }
  };

  // The Universal Enterprise Hub Tabs
  const [activeTab, setActiveTab] = useState<BrandHubPillarTab>('OVERVIEW');

  // Stage 1: Plan Revision Form state
  const [isPlanRevisionModalOpen, setIsPlanRevisionModalOpen] = useState(false);
  const [planRevisionNotes, setPlanRevisionNotes] = useState('');

  // Stage 2: KOC Reject Modal state
  const [rejectingKoc, setRejectingKoc] = useState<BrandKocCandidate | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState<BrandRejectReasonType>('Lệch định vị thương hiệu');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // Stage 3: Script Review Drawer / Modal State
  const [inspectingScript, setInspectingScript] = useState<BrandScriptItem | null>(null);
  const [scriptFeedbackText, setScriptFeedbackText] = useState('');
  const [feedbackSection, setFeedbackSection] = useState<'HOOK' | 'PAIN' | 'USP' | 'CTA'>('HOOK');

  // Stage filter for Active Jobs
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('ALL');
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');

  // Manager & Leader Executive Filters (Bộ lọc đa chiều cho Trưởng phòng & Quản lý)
  const isManagerOrLeader = ['ADMIN', 'MANAGER', 'LEADER'].includes(currentUser?.role || '');
  const [executiveBrandFilter] = useState<string>('ALL');
  const [executivePlanStatusFilter, setExecutivePlanStatusFilter] = useState<string>('ALL');
  const [executivePicFilter, setExecutivePicFilter] = useState<string>('ALL');
  const [executiveSearchQuery, setExecutiveSearchQuery] = useState<string>('');

  const filteredExecutivePortals = useMemo(() => {
    return portals.filter(p => {
      if (executiveBrandFilter !== 'ALL' && p.brandName !== executiveBrandFilter) return false;
      if (executivePlanStatusFilter !== 'ALL' && p.planApprovalStatus !== executivePlanStatusFilter) return false;
      if (executivePicFilter !== 'ALL' && p.accountPic !== executivePicFilter) return false;
      if (executiveSearchQuery.trim()) {
        const q = executiveSearchQuery.toLowerCase();
        const matchBrand = p.brandName.toLowerCase().includes(q);
        const matchCode = p.campaignCode.toLowerCase().includes(q);
        const matchTitle = p.campaignTitle.toLowerCase().includes(q);
        const matchPic = (p.accountPic || '').toLowerCase().includes(q) || (p.bookingPic || '').toLowerCase().includes(q);
        if (!matchBrand && !matchCode && !matchTitle && !matchPic) return false;
      }
      return true;
    });
  }, [portals, executiveBrandFilter, executivePlanStatusFilter, executivePicFilter, executiveSearchQuery]);

  // Discussion Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'UPBASE_ACCOUNT',
      senderName: activePortal.accountPic || 'Vân Ngọc',
      senderRole: 'Account Lead Upbase',
      avatarText: 'VN',
      time: 'Hôm qua lúc 14:20',
      content: `Chào Quý Nhãn Hàng ${activePortal.brandName}! Đội ngũ Upbase đã chuẩn bị xong kế hoạch ngân sách và danh sách các KOC đề xuất cho chiến dịch ${activePortal.campaignTitle}. Anh/chị xem qua và phê duyệt giúp team nhé ạ!`
    },
    {
      id: 'msg-2',
      sender: 'BRAND',
      senderName: 'Brand Manager',
      senderRole: activePortal.brandName,
      avatarText: 'BM',
      time: 'Hôm qua lúc 16:05',
      content: 'Cảm ơn em. Mình đã xem qua, kế hoạch ngân sách cơ bản ổn. Tuy nhiên với tệp Micro KOC bên em ưu tiên chọn các bạn có thế mạnh về phân tích thành phần lành tính giúp bên mình nhé.'
    },
    {
      id: 'msg-3',
      sender: 'UPBASE_BOOKING',
      senderName: activePortal.bookingPic || 'Khánh Vy',
      senderRole: 'Booking Execution Lead',
      avatarText: 'KV',
      time: 'Sáng nay lúc 09:15',
      content: 'Dạ vâng ạ! Team Booking đã lọc kỹ và bổ sung 2 bạn Dược sĩ/Beauty Reviewer chuyên sâu về da nhạy cảm. Kịch bản của 2 bạn đã được gửi lên mục "Cần duyệt ngay" để anh/chị xem trước ạ.'
    }
  ]);
  const [newChatText, setNewChatText] = useState('');

  // Copy Magic Link state
  const [copiedLink, setCopiedLink] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPlanRevisionModalOpen) setIsPlanRevisionModalOpen(false);
        if (rejectingKoc) setRejectingKoc(null);
        if (inspectingScript) setInspectingScript(null);
      }
    };
    if (isPlanRevisionModalOpen || rejectingKoc || inspectingScript) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlanRevisionModalOpen, rejectingKoc, inspectingScript]);

  // Check if Stage 1 is completed
  const isPlanApproved = activePortal.planApprovalStatus === 'BRAND_PLAN_APPROVED';

  // Sub-filter for Approvals tab
  const [approvalCategoryFilter, setApprovalCategoryFilter] = useState<'ALL' | 'PLAN' | 'KOC' | 'SCRIPT'>('ALL');

  const pendingKocs = useMemo(() => {
    return activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT');
  }, [activePortal]);

  const pendingScripts = useMemo(() => {
    return activePortal.scripts.filter(s => s.status !== 'APPROVED');
  }, [activePortal]);

  // Count pending items for Approvals badge
  const pendingApprovalsCount = useMemo(() => {
    let count = 0;
    if (!isPlanApproved) count += 1;
    count += pendingKocs.length;
    count += pendingScripts.length;
    return count;
  }, [isPlanApproved, pendingKocs, pendingScripts]);

  // Handle Switch Brand Portal
  const handleSwitchPortal = (portalId: string) => {
    setSelectedPortalId(portalId);
  };

  // Plan Actions
  const handleApprovePlan = () => {
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          planApprovalStatus: 'BRAND_PLAN_APPROVED',
          planApprovalDate: new Date().toLocaleString('vi-VN')
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Quý Nhãn Hàng ${activePortal.brandName} đã chính thức phê duyệt Kế hoạch Ngân sách!`, 'success');
    }
  };

  const handleRequestPlanRevision = () => {
    if (!planRevisionNotes.trim()) return;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          planApprovalStatus: 'BRAND_PLAN_REVISION_REQUESTED',
          planFeedbackNotes: planRevisionNotes
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Đã ghi nhận yêu cầu điều chỉnh Kế hoạch từ Nhãn hàng. Booking Lead sẽ cập nhật lại trong 12 giờ.`, 'warning');
    }
    setIsPlanRevisionModalOpen(false);
  };

  // KOC Actions
  const handleApproveKoc = (kocId: string) => {
    const targetKoc = activePortal.kocCandidates.find(k => k.id === kocId);
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          kocCandidates: p.kocCandidates.map(k => k.id === kocId ? { ...k, brandApprovalStatus: 'ĐÃ_DUYỆT', rejectReason: undefined } : k)
        };
      }
      return p;
    }));

    if (targetKoc && onBrandApproveDeal) {
      onBrandApproveDeal(targetKoc.stageName);
    }

    if (onNotify) {
      onNotify(`Brand đã duyệt KOC! Hệ thống chuyển sang chặng gửi hàng mẫu và kịch bản.`, 'success');
    }
  };

  const handleConfirmRejectKoc = () => {
    if (!rejectingKoc) return;
    const finalReason = selectedRejectReason === 'Lý do khác' ? (rejectCustomNote || 'Lý do khác') : selectedRejectReason;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          kocCandidates: p.kocCandidates.map(k => k.id === rejectingKoc.id ? {
            ...k,
            brandApprovalStatus: 'TỪ_CHỐI',
            rejectReason: finalReason
          } : k)
        };
      }
      return p;
    }));

    if (onBrandRejectDeal) {
      onBrandRejectDeal(rejectingKoc.stageName, finalReason);
    }
    if (onNotify) {
      onNotify(`Đã từ chối KOC ${rejectingKoc.stageName} (Lý do: ${finalReason}). Upbase sẽ đề xuất KOC thay thế trong 24 giờ.`, 'warning');
    }
    setRejectingKoc(null);
    setRejectCustomNote('');
  };

  // Script Actions
  const handleApproveScript = (scriptId: string) => {
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          scripts: p.scripts.map(s => s.id === scriptId ? { ...s, status: 'APPROVED' } : s)
        };
      }
      return p;
    }));

    const sc = activePortal.scripts.find(s => s.id === scriptId);
    if (onNotify) {
      onNotify(`Brand đã phê duyệt kịch bản video của KOC ${sc?.kocStageName || ''}! KOC được phép tiến hành quay video.`, 'success');
    }
    if (inspectingScript && inspectingScript.id === scriptId) {
      setInspectingScript(null);
    }
  };

  const handleSubmitScriptFeedback = () => {
    if (!scriptFeedbackText.trim() || !inspectingScript) return;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          scripts: p.scripts.map(s => s.id === inspectingScript.id ? {
            ...s,
            status: 'REVISION_REQUESTED',
            revisionCount: s.revisionCount + 1,
            brandFeedback: `[Góp ý phần ${feedbackSection}]: ${scriptFeedbackText}`
          } : s)
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Đã gửi góp ý kịch bản cho KOC ${inspectingScript.kocStageName} (Lần sửa: ${inspectingScript.revisionCount + 1}/2).`, 'info');
    }
    setScriptFeedbackText('');
    setInspectingScript(null);
  };

  // Chat message send handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'BRAND',
      senderName: 'Brand Manager',
      senderRole: activePortal.brandName,
      avatarText: 'BM',
      time: 'Vừa xong',
      content: newChatText.trim()
    };

    setChatMessages(prev => [...prev, newMsg]);
    setNewChatText('');
    if (onNotify) onNotify('Đã gửi tin nhắn đến Upbase Account Team!', 'success');
  };

  const handleCopyMagicLink = () => {
    navigator.clipboard.writeText(`https://portal.upbase.asia/client/${activePortal.brandId}?token=sec_live_202610_upbase`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    if (onNotify) {
      onNotify('Đã sao chép Magic Link Cổng Nhãn Hàng! Link này có thể gửi qua Zalo/Email cho Brand Manager.', 'success');
    }
  };

  // Filtered jobs in Active Jobs tab
  const filteredJobs = useMemo(() => {
    return activePortal.scripts.filter(sc => {
      const matchQuery = sc.kocStageName.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
        sc.productName.toLowerCase().includes(jobSearchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (jobStatusFilter === 'AIRED') return !!sc.publishedVideoUrl;
      if (jobStatusFilter === 'DRAFT') return !!sc.draftVideoUrl && !sc.publishedVideoUrl;
      if (jobStatusFilter === 'SCRIPT') return sc.status !== 'APPROVED';
      return true;
    });
  }, [activePortal, jobStatusFilter, jobSearchQuery]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. ENTERPRISE HEADER (Context-aware, low noise, high clarity) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {selectedPortalId === 'ALL' ? (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary text-white font-semibold flex items-center justify-center text-sm shadow-xs shrink-0">
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Bảng Giám Sát Cổng Đối Tác Brand
                  </h2>
                  <span className="text-2xs text-ink-3">
                    Chế độ quản lý · {portals.length} nhãn hàng
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5">
              <BrandAvatar name={activePortal.brandName} size={44} rounded="lg" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    {activePortal.brandName}
                  </h2>
                  <span className="text-2xs text-ink-3">
                    · <span className="font-code">{activePortal.campaignCode}</span> · {activePortal.month}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {selectedPortalId !== 'ALL' && isManagerOrLeader && (
              <button
                type="button"
                onClick={() => setSelectedPortalId('ALL')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                title="Quay lại bảng giám sát tất cả cổng nhãn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Bảng giám sát tổng</span>
              </button>
            )}

            {selectedPortalId !== 'ALL' && (
              <button
                type="button"
                onClick={handleCopyMagicLink}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedLink ? 'Đã chép link' : 'Chia sẻ cổng Brand'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedPortalId === 'ALL' ? (
        /* ========================================================================= */
        /* BẢNG TỔNG HỢP GIÁM SÁT TOÀN BỘ CỔNG BRAND (DÀNH CHO TRƯỞNG PHÒNG & QUẢN LÝ) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Quick Stats Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-500 block">Cổng Brand Hoạt Động</span>
              <span className="text-2xl font-semibold text-slate-900 mt-1 block">{portals.length}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-500 block">Kế Hoạch Đã Phê Duyệt</span>
              <span className="text-2xl font-semibold text-emerald-600 mt-1 block">
                {portals.filter(p => p.planApprovalStatus === 'BRAND_PLAN_APPROVED').length} / {portals.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-500 block">Tổng KOC Chờ Duyệt</span>
              <span className="text-2xl font-semibold text-amber-600 mt-1 block">
                {portals.reduce((acc, p) => acc + p.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').length, 0)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-500 block">Cam Kết SLA Phản Hồi</span>
              <span className="text-2xl font-semibold text-blue-600 mt-1 block">&lt; 18 giờ</span>
            </div>
          </div>

          {/* Executive Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhãn hàng, chiến dịch, PIC..."
                  value={executiveSearchQuery}
                  onChange={(e) => setExecutiveSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={executivePlanStatusFilter}
                  onChange={(e) => setExecutivePlanStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Mọi trạng thái kế hoạch</option>
                  <option value="BRAND_PLAN_APPROVED">Đã duyệt kế hoạch</option>
                  <option value="BRAND_PLAN_PENDING">Chờ Brand duyệt</option>
                  <option value="BRAND_PLAN_REVISION_REQUESTED">Yêu cầu sửa đổi</option>
                </select>

                <select
                  value={executivePicFilter}
                  onChange={(e) => setExecutivePicFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Mọi Account Lead</option>
                  <option value="Vân Ngọc">Vân Ngọc</option>
                  <option value="Tuấn Anh">Tuấn Anh</option>
                  <option value="Khánh Vy">Khánh Vy</option>
                </select>

                {(executiveSearchQuery || executivePlanStatusFilter !== 'ALL' || executivePicFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setExecutiveSearchQuery('');
                      setExecutivePlanStatusFilter('ALL');
                      setExecutivePicFilter('ALL');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Portals Monitoring Grid / Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-2xs">
                    <th className="py-3 px-4">Thương Hiệu / Cổng</th>
                    <th className="py-3 px-3">Chiến Dịch &amp; Tháng</th>
                    <th className="py-3 px-3">Ngân Sách &amp; GMV</th>
                    <th className="py-3 px-3">Tiến Độ Kế Hoạch &amp; KOC</th>
                    <th className="py-3 px-3">Tình Trạng SLA / Tồn Đọng</th>
                    <th className="py-3 px-3">Phụ Trách (PIC)</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredExecutivePortals.map((p) => {
                    const pendingKocs = p.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').length;
                    const approvedKocs = p.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length;
                    const pendingScripts = p.scripts.filter(s => s.status !== 'APPROVED').length;
                    const approvedScripts = p.scripts.filter(s => s.status === 'APPROVED').length;
                    const airedVideos = p.scripts.filter(s => !!s.publishedVideoUrl).length;
                    const isPlanPending = p.planApprovalStatus !== 'BRAND_PLAN_APPROVED';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <BrandAvatar name={p.brandName} size={36} rounded="md" />
                            <div>
                              <span className="font-semibold text-slate-900 block">{p.brandName}</span>
                              <span className="text-2xs text-slate-500 font-mono">{p.campaignCode}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-medium text-slate-900 block truncate max-w-xs">{p.campaignTitle}</span>
                          <span className="text-2xs text-slate-500">{p.month}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-mono font-semibold text-slate-900 block">{formatVndShort(p.totalBudget)}</span>
                          <span className="text-2xs text-slate-500 font-mono">GMV: {formatVndShort(p.targetGmv)}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span className="text-2xs text-slate-700 font-medium block">
                              {p.planApprovalStatus === 'BRAND_PLAN_APPROVED' ? 'Đã chốt KH' : 'Chờ duyệt KH'} · {approvedKocs}/{p.kocCandidates.length} KOC
                            </span>
                            <span className="text-2xs text-slate-500 block">
                              {approvedScripts} kịch bản • {airedVideos} clips lên sàn
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {isPlanPending ? (
                            <Status tone="warning">Chờ duyệt kế hoạch</Status>
                          ) : pendingKocs > 0 ? (
                            <Status tone="danger">{pendingKocs} KOC chờ Brand duyệt</Status>
                          ) : pendingScripts > 0 ? (
                            <Status tone="info">{pendingScripts} kịch bản chờ góp ý</Status>
                          ) : (
                            <Status tone="positive">Đúng hạn SLA</Status>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="text-slate-800 font-medium block">{p.accountPic}</span>
                          <span className="text-2xs text-slate-500">Booking: {p.bookingPic}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSwitchPortal(p.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition shadow-2xs cursor-pointer"
                          >
                            <span>Vào Cổng</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. GIAO DIỆN CỔNG CHI TIẾT CỦA TỪNG NHÃN HÀNG */
        /* ========================================================================= */
        <div className="space-y-6">
          <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BRAND_PROFILE')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BRAND_PROFILE'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>
            Hồ sơ &amp; Quy chuẩn nhãn{activeBrandRow ? ` (${activeBrandRow.done}/${activeBrandRow.total})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setInspectingStore(null);
            setActiveTab('STORES');
          }}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'STORES'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Gian hàng sàn ({activeBrandStores.length})</span>
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
          <span>Cần duyệt{pendingApprovalsCount > 0 ? ` (${pendingApprovalsCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE_JOBS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ACTIVE_JOBS'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Công việc đang chạy ({activePortal.kocCandidates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISCUSSION')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DISCUSSION'
              ? 'bg-primary text-white font-semibold shadow-xs'
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
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Lịch sử &amp; Nghiệm thu</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN (STREAMLINED & BALANCED) */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 Clean Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Tổng ngân sách</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-slate-900">
                  {(activePortal.totalBudget).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-emerald-600 font-medium">Đã phân bổ đủ</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Mục tiêu GMV</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-blue-600">
                  {(activePortal.targetGmv).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-slate-500 font-medium">ROI 5.0x</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Tỷ lệ CIR mục tiêu</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-amber-600">
                  {activePortal.targetCir.toFixed(1)}%
                </span>
                <span className="text-2xs text-slate-400">Chi phí / GMV</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Tiến độ Clips lên sóng</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-blue-600">
                  {activePortal.liveAiredVideosCount} / {activePortal.totalTargetVideos}
                </span>
                <span className="text-2xs text-slate-400">
                  {Math.round((activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100)}% hoàn thành
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="data-bar bg-blue-600 h-full rounded-full"
                  style={{ width: `${(activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Connected Pipeline Steps (Minimalist Stepper) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 ">
                Tiến Độ Triển Khai 4 Chặng
              </h3>
              <span className="text-2xs text-slate-500 font-medium">Cam kết SLA: &lt; 24h</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Chặng 1 */}
              <div 
                onClick={() => { if (!isPlanApproved) setActiveTab('APPROVALS'); }}
                className={`p-3 rounded-lg border transition ${
                  isPlanApproved 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-amber-50/50 border-amber-200 cursor-pointer hover:bg-amber-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-semibold text-slate-500">1. KẾ HOẠCH NGÂN SÁCH</span>
                  <Status tone={isPlanApproved ? 'positive' : 'warning'}>
                    {isPlanApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                  </Status>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">{formatVndShort(activePortal.totalBudget)}</h4>
                
              </div>

              {/* Chặng 2 */}
              <div 
                onClick={() => { if (pendingKocs.length > 0) setActiveTab('APPROVALS'); }}
                className={`p-3 rounded-lg border transition ${
                  pendingKocs.length > 0 
                    ? 'bg-blue-50/50 border-blue-200 cursor-pointer hover:bg-blue-50' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-semibold text-slate-500">2. DANH SÁCH KOC</span>
                  <span className="text-2xs font-mono text-ink-2">
                    {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length}/{activePortal.kocCandidates.length} KOC
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">
                  {pendingKocs.length > 0 ? `${pendingKocs.length} KOC chờ duyệt` : 'Đã duyệt KOC'}
                </h4>
                
              </div>

              {/* Chặng 3 */}
              <div 
                onClick={() => { if (pendingScripts.length > 0) setActiveTab('APPROVALS'); }}
                className={`p-3 rounded-lg border transition ${
                  pendingScripts.length > 0 
                    ? 'bg-emerald-50/50 border-emerald-200 cursor-pointer hover:bg-emerald-50' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-semibold text-slate-500">3. KỊCH BẢN VIDEO</span>
                  <span className="text-2xs font-mono text-ink-2">
                    {activePortal.scripts.filter(s => s.status === 'APPROVED').length}/{activePortal.scripts.length} Kịch bản
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">
                  {pendingScripts.length > 0 ? `${pendingScripts.length} kịch bản chờ góp ý` : 'Đã duyệt kịch bản'}
                </h4>
                
              </div>

              {/* Chặng 4 */}
              <div 
                onClick={() => setActiveTab('ACTIVE_JOBS')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-semibold text-slate-500">4. LÊN SÓNG &amp; NGHIỆM THU</span>
                  <span className="text-2xs font-mono text-ink-2">
                    {activePortal.liveAiredVideosCount}/{activePortal.totalTargetVideos} Clips
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">
                  {Math.round((activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100)}% hoàn thành
                </h4>
                
              </div>
            </div>
          </div>

          {/* Strategy Brief Context */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 mb-3">
              Định Hướng Chiến Lược &amp; Sản Phẩm Trọng Tâm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Thông điệp chủ đạo (Big Idea):</span>
                <p className="text-slate-600 leading-relaxed">{activePortal.bigIdea}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Sản phẩm chủ lực (Focus SKUs):</span>
                <p className="text-slate-700 font-medium mt-1">
                  {activePortal.focusSkus.join(' · ')}
                </p>
              </div>
            </div>
          </div>

          {/* Liên thông trực tiếp Hồ sơ thương hiệu & Hệ thống gian hàng sàn */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Khối 1: Tóm tắt Hồ sơ & Quy tắc vận hành thương hiệu */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    Thiết Lập Quy Chuẩn &amp; Luồng Phối Hợp Nhãn Hàng
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('BRAND_PROFILE')}
                    className="text-2xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Quản lý hồ sơ nhãn</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {activeBrandRow ? (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-2xs text-slate-500 block">Chế độ duyệt KOC</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {KOC_APPROVAL_MODE_LABEL[activeBrandRow.profile.workflowRules?.kocApprovalMode || 'ALL']}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-2xs text-slate-500 block">Đầu mối gửi hàng mẫu</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {SAMPLE_SENDER_LABEL[activeBrandRow.profile.workflowRules?.sampleSender || 'UPBASE_WAREHOUSE']}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-2xs text-slate-500 block">Số vòng sửa kịch bản/video</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        Tối đa {activeBrandRow.profile.workflowRules?.maxFreeRevisions ?? 2} vòng miễn phí
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-2xs text-slate-500 block">Quy chuẩn từ ngữ &amp; tài liệu</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {activeBrandRow.profile.contentRules?.banned?.length || 0} từ cấm • {activeBrandRow.profile.documents?.length || 0} tài liệu
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Đang đồng bộ hồ sơ thương hiệu...</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-2xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setActiveTab('BRAND_PROFILE')}
                  className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold shrink-0"
                >
                  Cập nhật quy chuẩn
                </button>
              </div>
            </div>

            {/* Khối 2: Tóm tắt Danh mục Gian hàng thuộc Thương hiệu */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    Hệ Thống Gian Hàng Sàn ({activeBrandStores.length} gian hàng)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingStore(null);
                      setActiveTab('STORES');
                    }}
                    className="text-2xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Quản lý gian hàng</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {activeBrandStores.length > 0 ? (
                  <div className="space-y-2">
                    {activeBrandStores.slice(0, 3).map((st) => {
                      const netLimit = st.budgetNet ?? st.monthlyBudget ?? 0;
                      const spent = st.actualSpentNet ?? 0;
                      return (
                        <div
                          key={st.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">{st.storeName}</span>
                              <ChannelTag channel={st.platform} />
                            </div>
                            <span className="text-2xs text-slate-500 block mt-0.5">
                              Order Net: <strong className="font-mono text-slate-700">{formatVndShort(netLimit)}</strong> • Đã duyệt chi: <strong className="font-mono text-slate-700">{formatVndShort(spent)}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingStore(st)}
                              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-2xs font-medium text-slate-700"
                            >
                              Cập nhật
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingStore(st);
                                setActiveTab('STORES');
                              }}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-2xs font-semibold text-blue-700"
                            >
                              Chi tiết
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Chưa ghi nhận gian hàng sàn cho thương hiệu này.</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-2xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setInspectingStore(null);
                    setActiveTab('STORES');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold shrink-0 ml-2"
                >
                  Xem {activeBrandStores.length} gian hàng
                </button>
              </div>
            </div>
          </div>

          {/* Budget Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 ">
                Cơ Cấu Phân Bổ Ngân Sách Theo Cấp Độ KOC
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('APPROVALS')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Xem mục cần duyệt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Cấp độ KOC</th>
                    <th className="py-2.5 px-3">Số lượng</th>
                    <th className="py-2.5 px-3">Chi phí TB</th>
                    <th className="py-2.5 px-3">Tổng ngân sách</th>
                    <th className="py-2.5 px-3">Mục tiêu GMV</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePortal.breakdownTiers.map(t => (
                    <tr key={t.tierLabel} className="hover:bg-slate-50/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.tierLabel}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{t.targetCount} KOCs</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{(t.estimatedAvgCost).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">{(t.allocatedBudget).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-3 font-mono text-blue-700">{(t.totalExpectedGmv).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-4">
                        <Status tone="positive">Khớp ngân sách</Status>
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
      {/* TAB 1B: HỒ SƠ & QUY CHUẨN NHÃN HÀNG (LIÊN THÔNG 2 CHIỀU VỚI HỒ SƠ THƯƠNG HIỆU) */}
      {/* ========================================================================= */}
      {activeTab === 'BRAND_PROFILE' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {activeBrandRow ? (
            <BrandProfileDetail
              row={activeBrandRow}
              can={activeBrandPermissions}
              deals={activeBrandDeals}
              stores={activeBrandStores}
              busy={savingBrandProfile}
              onBack={() => setActiveTab('OVERVIEW')}
              onSave={handleSaveBrandSection}
              onOpenBooking={onOpenBooking}
              onNavigateToStoreProfile={(storeName) => {
                const found = activeBrandStores.find(
                  s => s.storeName === storeName || s.id === storeName
                );
                if (found) {
                  setInspectingStore(found);
                  setActiveTab('STORES');
                }
              }}
              onUpdateStore={onUpdateStore}
              onNotify={onNotify}
              embedded
              hideInternalRatecard={currentUser?.role === 'BRAND_PARTNER'}
            />
          ) : (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Không tìm thấy dữ liệu hồ sơ cho thương hiệu {activePortal.brandName}.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1C: GIAN HÀNG SÀN (LIÊN THÔNG 2 CHIỀU VỚI QUẢN LÝ GIAN HÀNG B2C) */}
      {/* ========================================================================= */}
      {activeTab === 'STORES' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {inspectingStore ? (
            <StoreProfile
              store={inspectingStore}
              brand={activeBrandRow?.master}
              deals={activeBrandDeals}
              currentUser={currentUser}
              nav={{ onBack: () => setInspectingStore(null) }}
              onUpdateStore={(updated) => {
                onUpdateStore?.(updated);
                setInspectingStore(updated);
              }}
              onNavigateToBrandProfile={() => {
                setInspectingStore(null);
                setActiveTab('BRAND_PROFILE');
              }}
              onOpenEdit={(st) => setEditingStore(st)}
            />
          ) : (
            <>
              {/* Tổng hợp chỉ số toàn bộ gian hàng thuộc Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                  <span className="text-2xs font-medium text-slate-500">Số gian hàng hoạt động</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-slate-900">
                      {activeBrandStores.length} gian hàng
                    </span>
                    <span className="text-2xs text-emerald-600 font-medium">B2C phụ trách</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                  <span className="text-2xs font-medium text-slate-500">Tổng hạn mức Order Net</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-slate-900">
                      {formatVndShort(
                        activeBrandStores.reduce((s, st) => s + (st.budgetNet ?? st.monthlyBudget ?? 0), 0)
                      )}
                    </span>
                    <span className="text-2xs text-slate-500">Trần kế toán duyệt</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                  <span className="text-2xs font-medium text-slate-500">Thực tế đã duyệt chi (Net)</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-blue-600">
                      {formatVndShort(
                        activeBrandStores.reduce((s, st) => s + (st.actualSpentNet ?? 0), 0)
                      )}
                    </span>
                    <span className="text-2xs text-slate-500">Đối soát thời gian thực</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                  <span className="text-2xs font-medium text-slate-500">Cam kết đầu ra nội dung</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-emerald-600">
                      {activeBrandStores.reduce(
                        (s, st) => s + (st.targetAffiliateContents ?? 0) + (st.targetSelfChannelContents ?? 0),
                        0
                      )}{' '}
                      video
                    </span>
                    <span className="text-2xs text-slate-500">
                      + {activeBrandStores.reduce((s, st) => s + (st.targetFocVideos ?? 0), 0)} suất FOC
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách từng gian hàng sàn của Thương hiệu */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      Danh Sách Gian Hàng Thuộc Thương Hiệu {activePortal.brandName}
                    </h3>
                    
                  </div>
                </div>

                {activeBrandStores.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Chưa có gian hàng nào được gán cho thương hiệu {activePortal.brandName}.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeBrandStores.map((st) => {
                      const netLimit = st.budgetNet ?? st.monthlyBudget ?? 0;
                      const spentNet = st.actualSpentNet ?? 0;
                      const isOverBudget = netLimit > 0 && spentNet > netLimit;
                      const isUnbudgeted = netLimit === 0 && spentNet > 0;
                      return (
                        <div
                          key={st.id}
                          className="p-4 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm">{st.storeName}</span>
                              <ChannelTag channel={st.platform} />
                              {st.storeOperationId && (
                                <span className="text-2xs font-code text-ink-3">
                                  · Mã vận hành: {st.storeOperationId}
                                </span>
                              )}
                              {isOverBudget ? (
                                <Status tone="danger">Vượt hạn mức Order Net</Status>
                              ) : isUnbudgeted ? (
                                <Status tone="warning">Phát sinh chi ngoài kế hoạch</Status>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-600">
                              <span>
                                Phụ trách B2C:{' '}
                                <strong className="text-slate-800">
                                  {st.b2cOwnerName || st.b2cOwners?.join(', ') || 'Chưa gán'}
                                </strong>
                              </span>
                              <span>
                                Trưởng nhóm:{' '}
                                <strong className="text-slate-800">
                                  {st.hasBookingLeader && st.bookingLeader ? st.bookingLeader : 'Không có leader (Trình trực tiếp GĐ Marketing)'}
                                </strong>
                              </span>
                              {typeof st.affiliateRate === 'number' && (
                                <span>
                                  Hoa hồng sàn: <strong className="text-slate-800">{st.affiliateRate}%</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
                            <div>
                              <span className="text-2xs text-slate-500 block">Hạn mức Order Net</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {formatVndShort(netLimit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-2xs text-slate-500 block">Đã duyệt chi (Net)</span>
                              <span className={`font-mono font-semibold ${isOverBudget || isUnbudgeted ? 'text-rose-600' : 'text-blue-600'}`}>
                                {formatVndShort(spentNet)}
                              </span>
                            </div>
                            <div>
                              <span className="text-2xs text-slate-500 block">Chỉ tiêu Video / FOC</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {(st.targetAffiliateContents ?? 0) + (st.targetSelfChannelContents ?? 0)} clip • {st.targetFocVideos ?? 0} FOC
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingStore(st)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span>Cập nhật</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setInspectingStore(st)}
                              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center gap-1.5 transition"
                            >
                              <span>Chi tiết gian hàng</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN DUYỆT (ACTIONABLE INBOX - LINEAR/STRIPE STYLE) */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* All approved empty state */}
          {pendingApprovalsCount === 0 && (
            <div className="p-8 rounded-xl bg-white border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Hộp việc hoàn tất! Quý Nhãn Hàng đã duyệt tất cả các hạng mục
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE_JOBS')}
                className="mt-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <span>Xem công việc đang chạy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending items list */}
          {pendingApprovalsCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 ">
                    Hộp Việc Cần Phê Duyệt ({pendingApprovalsCount} mục)
                  </h3>
                  
                </div>

                {/* Sub-filter pills */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setApprovalCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-2xs transition cursor-pointer ${
                      approvalCategoryFilter === 'ALL'
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({pendingApprovalsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalCategoryFilter('PLAN')}
                    className={`px-2.5 py-1 rounded-lg text-2xs transition cursor-pointer ${
                      approvalCategoryFilter === 'PLAN'
                        ? 'bg-white text-amber-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kế hoạch ({isPlanApproved ? 0 : 1})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalCategoryFilter('KOC')}
                    className={`px-2.5 py-1 rounded-lg text-2xs transition cursor-pointer ${
                      approvalCategoryFilter === 'KOC'
                        ? 'bg-white text-blue-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    KOC ({pendingKocs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalCategoryFilter('SCRIPT')}
                    className={`px-2.5 py-1 rounded-lg text-2xs transition cursor-pointer ${
                      approvalCategoryFilter === 'SCRIPT'
                        ? 'bg-white text-blue-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kịch bản ({pendingScripts.length})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Plan Approval Item */}
                {!isPlanApproved && (approvalCategoryFilter === 'ALL' || approvalCategoryFilter === 'PLAN') && (
                  <div className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-amber-500">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-xs">Kế Hoạch &amp; Ngân Sách Chiến Dịch</span>
                          <Status tone="warning">Cần duyệt kế hoạch</Status>
                          <span className="text-2xs text-ink-3">· SLA: Trong 24h</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tổng ngân sách: <strong className="text-slate-700">{(activePortal.totalBudget).toLocaleString('vi-VN')} đ</strong> • Mục tiêu GMV: <strong className="text-slate-700">{(activePortal.targetGmv).toLocaleString('vi-VN')} đ</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsPlanRevisionModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Yêu cầu chỉnh
                      </button>
                      <button
                        type="button"
                        onClick={handleApprovePlan}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt kế hoạch
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Pending KOC Candidates */}
                {(approvalCategoryFilter === 'ALL' || approvalCategoryFilter === 'KOC') && pendingKocs.map(koc => (
                  <div key={koc.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        {koc.stageName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-xs">{koc.stageName}</span>
                          <span className="text-2xs text-ink-3">
                            <span className="font-code">{koc.channelId}</span> · {koc.tier} · SLA: Trong 24h
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(koc.followers).toLocaleString('vi-VN')} followers • ER: <span className="text-emerald-600 font-semibold">{koc.engagementRate}%</span> • Ngành hàng: <span className="text-slate-700">{koc.niche}</span> • &quot;{koc.formatDescription}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingKoc(koc);
                          setSelectedRejectReason('Lệch định vị thương hiệu');
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Đổi KOC
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveKoc(koc.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt KOC
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3. Pending Scripts */}
                {(approvalCategoryFilter === 'ALL' || approvalCategoryFilter === 'SCRIPT') && pendingScripts.map(script => (
                  <div key={script.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-xs">Kịch bản: {script.kocStageName}</span>
                          <span className="text-2xs text-ink-3">
                            <span className="font-code">{script.videoDuration}</span> · Lần sửa: {script.revisionCount}/2 · SLA: Trong 24h
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sản phẩm: <span className="text-slate-800 font-medium">{script.productName}</span> • Hook: <span className="italic text-slate-600">&quot;{script.hook.slice(0, 70)}...&quot;</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setInspectingScript(script)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem &amp; Góp ý
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveScript(script.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt kịch bản
                      </button>
                    </div>
                  </div>
                ))}

                {/* Sub-filter Empty State */}
                {approvalCategoryFilter === 'PLAN' && isPlanApproved && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    Kế hoạch ngân sách của chiến dịch đã được phê duyệt đầy đủ.
                  </div>
                )}

                {approvalCategoryFilter === 'KOC' && pendingKocs.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    Toàn bộ danh sách KOC đã được duyệt hoặc không còn ứng viên chờ.
                  </div>
                )}

                {approvalCategoryFilter === 'SCRIPT' && pendingScripts.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    Không có kịch bản nào đang chờ duyệt.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS) */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Clean Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên KOC hoặc sản phẩm..."
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                className="text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none w-48 sm:w-72"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setJobStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'ALL' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({activePortal.scripts.length})
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('SCRIPT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'SCRIPT' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Kịch bản
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('DRAFT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'DRAFT' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Clip nháp
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('AIRED')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'AIRED' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Đã lên sóng ({activePortal.liveAiredVideosCount})
              </button>
            </div>
          </div>

          {/* Job List Cards */}
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 font-semibold flex items-center justify-center text-xs shrink-0">
                      {job.kocStageName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{job.kocStageName}</span>
                        <span className="text-2xs font-code text-ink-3">{job.channelId}</span>
                        <Status tone={
                          job.publishedVideoUrl
                            ? 'positive'
                            : job.draftVideoUrl
                            ? 'warning'
                            : 'info'
                        }>
                          {job.publishedVideoUrl ? 'Đã lên sóng' : job.draftVideoUrl ? 'Clip nháp' : 'Kịch bản'}
                        </Status>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{job.productName} ({job.videoDuration})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {job.publishedVideoUrl && (
                      <div className="text-right mr-2 text-xs">
                        <span className="text-emerald-700 font-semibold block">
                          {(job.gmv || 0).toLocaleString('vi-VN')} đ GMV
                        </span>
                        <span className="text-2xs text-slate-400">{(job.views || 0).toLocaleString('vi-VN')} views</span>
                      </div>
                    )}

                    {job.draftVideoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNotify) onNotify(`Đang mở clip nháp có Watermark bản quyền Upbase của ${job.kocStageName}.`, 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-600" />
                        Xem Clip Nháp
                      </button>
                    )}

                    {job.publishedVideoUrl && (
                      <a
                        href={job.publishedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-1.5 text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem TikTok
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress bar stages */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 mt-3 border-t border-slate-100 text-2xs">
                  <span className="text-emerald-700 font-medium">
                    1. Chốt KOC
                  </span>
                  <span className="text-emerald-700 font-medium">
                    2. Gửi hàng
                  </span>
                  <span className={job.status === 'APPROVED' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    3. Kịch bản ({job.status === 'APPROVED' ? 'Xong' : 'Đang duyệt'})
                  </span>
                  <span className={job.draftVideoUrl ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                    4. Quay nháp ({job.draftVideoUrl ? 'Xong' : 'Chờ'})
                  </span>
                  <span className={job.publishedVideoUrl ? 'text-blue-700 font-medium' : 'text-slate-400'}>
                    5. Lên sóng ({job.publishedVideoUrl ? 'Đã đăng' : 'Chờ'})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRAO ĐỔI (TWO-WAY DISCUSSION) */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-[560px] overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ink text-white font-semibold flex items-center justify-center text-xs">
                UP
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">
                  {activePortal.brandName} — Upbase Operations
                </h4>
                <p className="text-2xs text-slate-500">
                  {activePortal.accountPic} (Account Lead) &amp; {activePortal.bookingPic} (Booking Lead)
                </p>
              </div>
            </div>
            <span className="text-2xs text-ink-3 font-medium">
              SLA phản hồi &lt; 2h
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/20">
            {chatMessages.map(msg => {
              const isBrand = msg.sender === 'BRAND';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isBrand ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-2xs text-white shrink-0 ${
                    isBrand ? 'bg-accent' : 'bg-ink'
                  }`}>
                    {msg.avatarText}
                  </div>
                  <div className={`max-w-[70%] space-y-1 ${isBrand ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-2xs text-slate-400 ${isBrand ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className={`p-3 rounded-xl leading-relaxed text-xs ${
                      isBrand 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newChatText}
              onChange={(e) => setNewChatText(e.target.value)}
              placeholder="Nhập nội dung trao đổi với đội ngũ Upbase..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ & NGHIỆM THU (HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 ">
                  Lịch Sử Các Chiến Dịch Trước Đây
                </h4>
                
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNotify) onNotify('Đang xuất biên bản nghiệm thu tổng hợp PDF...', 'success');
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Xuất Báo Cáo Nghiệm Thu (.PDF)</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-slate-900 text-xs">Chiến dịch Mega Sale 9.9 - Siêu Tiệc Thương Hiệu</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 09/2026</span>
                  </div>
                  <Status tone="positive">Đã nghiệm thu 100%</Status>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-semibold text-slate-900 font-mono">180.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">GMV thực tế:</span>
                    <span className="font-semibold text-emerald-600 font-mono">924.500.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Lượt xem video:</span>
                    <span className="font-semibold text-blue-600 font-mono">1.850.000</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Quy mô:</span>
                    <span className="font-semibold text-slate-700">35 Clips</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-slate-900 text-xs">Chiến dịch Khởi Động Mùa Tựu Trường Kutieskin</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 08/2026</span>
                  </div>
                  <Status tone="positive">Đã nghiệm thu</Status>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-semibold text-slate-900 font-mono">120.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">GMV thực tế:</span>
                    <span className="font-semibold text-emerald-600 font-mono">652.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Lượt xem video:</span>
                    <span className="font-semibold text-blue-600 font-mono">1.210.000</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Quy mô:</span>
                    <span className="font-semibold text-slate-700">24 Clips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* Modal 1: Plan Revision Request */}
      <Modal
        open={isPlanRevisionModalOpen}
        onClose={() => setIsPlanRevisionModalOpen(false)}
        title="Yêu cầu điều chỉnh kế hoạch ngân sách"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsPlanRevisionModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              disabled={!planRevisionNotes.trim()}
              onClick={handleRequestPlanRevision}
            >
              Gửi yêu cầu chỉnh sửa
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <textarea
            rows={4}
            value={planRevisionNotes}
            onChange={(e) => setPlanRevisionNotes(e.target.value)}
            placeholder="Nhập góp ý cụ thể cho Booking Team..."
            className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none leading-relaxed"
          />
        </div>
      </Modal>

      {/* Modal 2: KOC Reject Reason */}
      <Modal
        open={Boolean(rejectingKoc)}
        onClose={() => setRejectingKoc(null)}
        title={rejectingKoc ? `Đề xuất đổi KOC: ${rejectingKoc.stageName}` : 'Đề xuất đổi KOC'}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setRejectingKoc(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRejectKoc}
            >
              Xác nhận đổi KOC
            </Button>
          </div>
        }
      >
        {rejectingKoc && (
          <div className="space-y-2 text-xs">
            {[
              'Lệch định vị thương hiệu',
              'Từng booking đối thủ cạnh tranh',
              'Rủi ro hình ảnh / Scandal',
              'Chất giọng / Phong cách chưa phù hợp',
              'Yêu cầu Creator chuyên môn cao hơn (Bác sĩ/Dược sĩ)',
              'Lý do khác'
            ].map(reason => (
              <label
                key={reason}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition text-slate-800"
              >
                <input
                  type="radio"
                  name="rejectReason"
                  checked={selectedRejectReason === reason}
                  onChange={() => setSelectedRejectReason(reason as BrandRejectReasonType)}
                  className="accent-blue-600 cursor-pointer"
                />
                <span>{reason}</span>
              </label>
            ))}

            {selectedRejectReason === 'Lý do khác' && (
              <input
                type="text"
                placeholder="Nhập lý do cụ thể..."
                value={rejectCustomNote}
                onChange={(e) => setRejectCustomNote(e.target.value)}
                className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none mt-2"
              />
            )}
          </div>
        )}
      </Modal>

      {/* Modal 3: Script Review Drawer / Modal */}
      <Modal
        open={Boolean(inspectingScript)}
        onClose={() => setInspectingScript(null)}
        title={inspectingScript ? `Kịch bản: ${inspectingScript.kocStageName}` : 'Kịch bản'}
        size="xl"
      >
        {inspectingScript && (() => {
          const maxRevisions = activeBrandRow?.profile.workflowRules?.maxFreeRevisions ?? 2;
          const bannedList = (activeBrandRow?.profile.contentRules?.banned || []).map(b => b.phrase);
          const fullScriptText = `${inspectingScript.hook} ${inspectingScript.painPoint} ${inspectingScript.solutionAndUsp} ${inspectingScript.callToAction}`.toLowerCase();
          const violatedKeywords = bannedList.filter((kw: string) => kw.trim() && fullScriptText.includes(kw.toLowerCase()));
          return (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line">
                <span>Sản phẩm: <strong className="text-ink">{inspectingScript.productName}</strong> ({inspectingScript.videoDuration})</span>
                <span>·</span>
                <span>Lần sửa: <strong className="text-ink">{inspectingScript.revisionCount}/{maxRevisions}</strong></span>
              </div>

              {violatedKeywords.length > 0 ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Cảnh báo từ ngữ hạn chế theo Hồ sơ thương hiệu:</span>
                    <span>Phát hiện từ khóa cần tránh: <strong>{violatedKeywords.join(', ')}</strong></span>
                  </div>
                </div>
              ) : bannedList.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-2xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Đã đối chiếu {bannedList.length} từ khóa hạn chế trong Hồ sơ thương hiệu: Không phát hiện vi phạm.</span>
                </div>
              ) : null}

              {/* 4 segments in a clean 2x2 grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80">
                  <span className="font-semibold text-amber-900 block mb-1">1. Hook mở đầu (3 giây đầu):</span>
                  <p className="text-slate-700 leading-relaxed">{inspectingScript.hook}</p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80">
                  <span className="font-semibold text-rose-900 block mb-1">2. Nỗi đau (Pain Point):</span>
                  <p className="text-slate-700 leading-relaxed">{inspectingScript.painPoint}</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                  <span className="font-semibold text-emerald-900 block mb-1">3. Giải pháp &amp; lợi điểm sản phẩm:</span>
                  <p className="text-slate-700 leading-relaxed">{inspectingScript.solutionAndUsp}</p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80">
                  <span className="font-semibold text-blue-900 block mb-1">4. Kêu gọi mua (CTA):</span>
                  <p className="text-slate-700 leading-relaxed">{inspectingScript.callToAction}</p>
                </div>
              </div>

              {/* Feedback Input */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Góp ý điều chỉnh cho KOC:
                  </span>
                  <div className="flex items-center gap-1.5 text-2xs">
                    <span className="text-slate-500">Phần góp ý:</span>
                    <select
                      value={feedbackSection}
                      onChange={(e) => setFeedbackSection(e.target.value as 'HOOK' | 'PAIN' | 'USP' | 'CTA')}
                      className="bg-slate-50 text-slate-800 border border-slate-200 rounded-md px-2 py-0.5 text-2xs"
                    >
                      <option value="HOOK">1. Hook</option>
                      <option value="PAIN">2. Pain Point</option>
                      <option value="USP">3. Lợi điểm sản phẩm</option>
                      <option value="CTA">4. CTA</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={scriptFeedbackText}
                  onChange={(e) => setScriptFeedbackText(e.target.value)}
                  placeholder="Nhập nội dung chỉnh sửa cụ thể..."
                  className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                />

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Send}
                    disabled={!scriptFeedbackText.trim() || inspectingScript.revisionCount >= maxRevisions}
                    onClick={handleSubmitScriptFeedback}
                  >
                    Gửi góp ý
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Check}
                    onClick={() => handleApproveScript(inspectingScript.id)}
                  >
                    Phê duyệt kịch bản này
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
        </div>
      )}

      {/* Hộp thoại chỉnh sửa thông số Gian hàng trực tiếp từ Cổng Đối Tác Brand */}
      {editingStore && (
        <StoreEditDialog
          open={!!editingStore}
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSave={(updated) => {
            onUpdateStore?.(updated);
            if (inspectingStore?.id === updated.id) {
              setInspectingStore(updated);
            }
            setEditingStore(null);
            onNotify?.(`Đã cập nhật thông số gian hàng "${updated.storeName}" — đồng bộ toàn hệ thống.`, 'success');
          }}
        />
      )}
    </div>
  );
};