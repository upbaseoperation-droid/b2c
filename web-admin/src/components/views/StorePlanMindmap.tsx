'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatVndShort } from '../../lib/format';
import {
  InputPlanBreakdownState,
  InputPlanRowItem,
  InputPlanChannelType,
} from '../../lib/types';
import {
  INITIAL_INPUT_PLAN_ITEMS,
  CONTENT_FORMAT_OPTIONS,
} from '../../lib/inputPlanDefaults';
import {
  Store,
  Plus,
  Minus,
  X,
  ChevronRight,
  GripVertical,
  Layers,
  Maximize2,
  Minimize2,
  Video,
  Package,
} from 'lucide-react';
import {
  PlatformLogo,
  TikTokLogo,
} from '../ui';
import type { PlatformKey } from '../ui';

export type MindmapBranchId =
  | 'VIDEO_AFFILIATE'
  | 'SELF_CHANNEL'
  | 'FOC'
  | 'FACEBOOK'
  | 'THREADS'
  | 'INSTA'
  | 'SHOPEE';

interface BranchMetadata {
  id: MindmapBranchId;
  label: string;
  shortLabel?: string;
  platformKey?: PlatformKey;
  shortDesc: string;
  unitLabel: string;
  colorClass: string;
  activeBgClass: string;
  badgeClass: string;
  sliderAccent: string;
  isFreeCast?: boolean;
}

export const MINDMAP_BRANCHES: BranchMetadata[] = [
  {
    id: 'VIDEO_AFFILIATE',
    label: 'Video Affiliate',
    shortLabel: 'Affiliate',
    platformKey: 'TIKTOK',
    shortDesc: 'KOC TikTok có chi phí cast (KL1 → KL7)',
    unitLabel: 'Khung lương KL1 – KL7',
    colorClass: 'border-blue-300 text-blue-950',
    activeBgClass: 'bg-accent-soft border-blue-500 ring-2 ring-blue-500/20',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    sliderAccent: 'accent-blue-600',
  },
  {
    id: 'SELF_CHANNEL',
    label: 'Kênh tự xây',
    shortLabel: 'Tự xây',
    shortDesc: 'Sản xuất video kênh thương hiệu (Voice, Nhạc text, Remix, POV...)',
    unitLabel: 'Định dạng video kênh thương hiệu',
    colorClass: 'border-emerald-300 text-emerald-950',
    activeBgClass: 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sliderAccent: 'accent-emerald-600',
  },
  {
    id: 'FOC',
    label: 'Gửi mẫu miễn phí (FOC)',
    shortLabel: 'Mẫu FOC',
    shortDesc: 'Suất gửi mẫu miễn phí cho KOC / TAP (0đ chi phí cast)',
    unitLabel: 'Nguồn mẫu FOC 0đ',
    colorClass: 'border-emerald-300 text-emerald-950',
    activeBgClass: 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sliderAccent: 'accent-emerald-600',
    isFreeCast: true,
  },
  {
    id: 'FACEBOOK',
    label: 'Facebook',
    shortLabel: 'Facebook',
    platformKey: 'FACEBOOK',
    shortDesc: 'Facebook Reels & bài đăng gắn link',
    unitLabel: 'Hạng mục Facebook',
    colorClass: 'border-blue-300 text-blue-950',
    activeBgClass: 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    sliderAccent: 'accent-blue-600',
  },
  {
    id: 'THREADS',
    label: 'Threads',
    shortLabel: 'Threads',
    platformKey: 'THREADS',
    shortDesc: 'Bài đăng thảo luận & gắn link trên Threads',
    unitLabel: 'Hạng mục Threads',
    colorClass: 'border-slate-300 text-slate-900',
    activeBgClass: 'bg-slate-100 border-slate-700 ring-2 ring-slate-500/20',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    sliderAccent: 'accent-slate-800',
  },
  {
    id: 'INSTA',
    label: 'Instagram',
    shortLabel: 'Instagram',
    platformKey: 'INSTA',
    shortDesc: 'Instagram Reels & Story gắn thẻ thương hiệu',
    unitLabel: 'Hạng mục Instagram',
    colorClass: 'border-rose-300 text-rose-950',
    activeBgClass: 'bg-rose-50/90 border-rose-500 ring-2 ring-rose-500/20',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    sliderAccent: 'accent-rose-600',
  },
  {
    id: 'SHOPEE',
    label: 'Shopee Video',
    shortLabel: 'Shopee',
    platformKey: 'SHOPEE',
    shortDesc: 'Video gắn giỏ hàng Shopee',
    unitLabel: 'Hạng mục Shopee Video',
    colorClass: 'border-amber-300 text-amber-950',
    activeBgClass: 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    sliderAccent: 'accent-amber-600',
  },
];

export function renderBranchIcon(branch: BranchMetadata, className = 'w-4 h-4 shrink-0') {
  if (branch.platformKey) {
    return <PlatformLogo platform={branch.platformKey} className={className} />;
  }
  if (branch.id === 'SELF_CHANNEL') {
    return <Video className={`${className} text-emerald-600`} />;
  }
  if (branch.id === 'FOC') {
    return <Package className={`${className} text-emerald-600`} />;
  }
  return <TikTokLogo className={className} />;
}

// Kiểm tra 1 dòng item thuộc nhánh Mindmap nào
export function matchItemToBranch(item: InputPlanRowItem, branchId: MindmapBranchId): boolean {
  if (branchId === 'FOC') {
    return item.tierCode.includes('TAP') || item.id === 'row-tt-tap' || (item.channel === 'TIKTOK' && item.unitCost === 0);
  }
  if (branchId === 'VIDEO_AFFILIATE') {
    return item.channel === 'TIKTOK' && !item.tierCode.includes('TAP') && item.id !== 'row-tt-tap' && item.unitCost > 0;
  }
  if (branchId === 'SELF_CHANNEL') {
    return item.channel === 'SELF_CHANNEL';
  }
  if (branchId === 'FACEBOOK') {
    return item.channel === 'FACEBOOK';
  }
  if (branchId === 'THREADS') {
    return item.channel === 'THREADS';
  }
  if (branchId === 'INSTA') {
    return item.channel === 'INSTAGRAM';
  }
  if (branchId === 'SHOPEE') {
    return item.channel === 'SHOPEE';
  }
  return false;
}

// Khởi tạo các dòng mặc định cho 1 nhánh nếu gian hàng chưa có dòng nào thuộc nhánh đó
function createDefaultItemsForBranch(branchId: MindmapBranchId, defaultPic: string): InputPlanRowItem[] {
  const templates = INITIAL_INPUT_PLAN_ITEMS.filter(it => matchItemToBranch(it, branchId));
  if (templates.length > 0) {
    return templates.map(tpl => ({
      ...tpl,
      id: `${tpl.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      assignedStaff: defaultPic,
      qty: tpl.qty > 0 ? tpl.qty : 2,
      totalBudget: (tpl.qty > 0 ? tpl.qty : 2) * tpl.unitCost,
      targetGmv: (tpl.qty > 0 ? tpl.qty : 2) * tpl.unitCost * tpl.expectedRoiMultiplier,
    }));
  }

  // Dự phòng nếu không tìm thấy template
  const channelMap: Record<MindmapBranchId, InputPlanChannelType> = {
    VIDEO_AFFILIATE: 'TIKTOK',
    FOC: 'TIKTOK',
    SELF_CHANNEL: 'SELF_CHANNEL',
    FACEBOOK: 'FACEBOOK',
    THREADS: 'THREADS',
    INSTA: 'INSTAGRAM',
    SHOPEE: 'SHOPEE',
  };

  return [
    {
      id: `branch-${branchId.toLowerCase()}-${Date.now()}`,
      channel: channelMap[branchId],
      platform: branchId,
      category: branchId === 'SELF_CHANNEL' ? 'SELF_CHANNEL' : 'PLATFORM_FORMAT',
      tierCode: branchId === 'FOC' ? 'TAP UpAffiliate' : 'Affiliate',
      tierLabel: `Video ${branchId}`,
      contentFormat: CONTENT_FORMAT_OPTIONS[0],
      qty: 5,
      unitCost: branchId === 'FOC' ? 0 : 500000,
      benchmarkCost: branchId === 'FOC' ? 0 : 500000,
      totalBudget: branchId === 'FOC' ? 0 : 2500000,
      expectedRoiMultiplier: 5.0,
      targetGmv: branchId === 'FOC' ? 0 : 12500000,
      assignedStaff: defaultPic,
    },
  ];
}

interface StorePlanMindmapProps {
  planState: InputPlanBreakdownState;
  picOptions: string[];
  disabled?: boolean;
  onUpdateItems: (nextItems: InputPlanRowItem[]) => void;
  onNotify?: (msg: string) => void;
}

export const StorePlanMindmap: React.FC<StorePlanMindmapProps> = ({
  planState,
  picOptions,
  disabled = false,
  onUpdateItems,
  onNotify,
}) => {
  const computeInitialBranches = (state: InputPlanBreakdownState) => {
    const nextEnabled = new Set<MindmapBranchId>();
    MINDMAP_BRANCHES.forEach(b => {
      const branchItems = state.items.filter(it => matchItemToBranch(it, b.id));
      if (branchItems.some(it => it.qty > 0 || it.totalBudget > 0)) {
        nextEnabled.add(b.id);
      }
    });
    if (nextEnabled.size === 0) {
      const isShopee = (state.storeName || '').toLowerCase().includes('shopee');
      if (isShopee) {
        nextEnabled.add('SHOPEE');
      } else {
        nextEnabled.add('VIDEO_AFFILIATE');
        nextEnabled.add('FOC');
        nextEnabled.add('SELF_CHANNEL');
      }
    }
    return nextEnabled;
  };

  // Các nhánh được bật thêm thủ công bởi người dùng (kể cả khi qty tạm thời = 0)
  const [manuallyEnabledBranches, setManuallyEnabledBranches] = useState<Set<MindmapBranchId>>(() =>
    computeInitialBranches(planState)
  );

  // Nhánh đang được chọn để phân rã chi tiết ở cột phải
  const [selectedBranchId, setSelectedBranchId] = useState<MindmapBranchId>('VIDEO_AFFILIATE');

  const planIdentityKey = `${planState.id}::${planState.storeName}`;
  const [prevPlanIdentityKey, setPrevPlanIdentityKey] = useState(planIdentityKey);
  if (planIdentityKey !== prevPlanIdentityKey) {
    setPrevPlanIdentityKey(planIdentityKey);
    const nextEnabled = computeInitialBranches(planState);
    setManuallyEnabledBranches(nextEnabled);
    const firstActive = Array.from(nextEnabled)[0] || 'VIDEO_AFFILIATE';
    setSelectedBranchId(firstActive);
  }

  // Trạng thái kéo-thả nhánh từ kho nhánh hoặc kéo-thả định dạng/nhân sự vào mục con
  const [draggingBranchId, setDraggingBranchId] = useState<MindmapBranchId | null>(null);
  const [isOverCanvasDropzone, setIsOverCanvasDropzone] = useState(false);
  const [draggingChip, setDraggingChip] = useState<{ type: 'FORMAT' | 'STAFF'; value: string } | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Phím tắt ESC để thoát chế độ toàn màn hình
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Tính toán thống kê cho từng nhánh trong 7 nhánh
  const branchStatsMap = useMemo(() => {
    const map = {} as Record<
      MindmapBranchId,
      {
        items: InputPlanRowItem[];
        totalQty: number;
        totalBudget: number;
        isEnabled: boolean;
      }
    >;

    MINDMAP_BRANCHES.forEach(b => {
      const items = planState.items.filter(it => matchItemToBranch(it, b.id));
      const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0);
      const totalBudget = items.reduce((s, it) => s + (it.totalBudget || 0), 0);
      const isEnabled = manuallyEnabledBranches.has(b.id) || totalQty > 0 || totalBudget > 0;
      map[b.id] = { items, totalQty, totalBudget, isEnabled };
    });

    return map;
  }, [planState.items, manuallyEnabledBranches]);

  const activeBranches = useMemo(
    () => MINDMAP_BRANCHES.filter(b => branchStatsMap[b.id]?.isEnabled),
    [branchStatsMap]
  );

  const inactiveBranches = useMemo(
    () => MINDMAP_BRANCHES.filter(b => !branchStatsMap[b.id]?.isEnabled),
    [branchStatsMap]
  );

  // Tổng ngân sách & số lượng video toàn gian hàng (không tính Livestream của Growth)
  const storeTotals = useMemo(() => {
    const b2cItems = planState.items.filter(it => it.channel !== 'LIVESTREAM');
    const allocatedBudget = b2cItems.reduce((s, it) => s + (it.totalBudget || 0), 0);
    const allocatedVideos = b2cItems.reduce((s, it) => s + (it.qty || 0), 0);
    const adsBudget = planState.budgetAdsTotal || 0;
    const combinedBudget = allocatedBudget + adsBudget;
    const netCeiling = Math.max(0, planState.totalTargetBudget - adsBudget);
    const budgetHeadroom = planState.totalTargetBudget - combinedBudget;
    const videoHeadroom = planState.totalTargetContents - allocatedVideos;

    return {
      allocatedBudget,
      allocatedVideos,
      adsBudget,
      combinedBudget,
      netCeiling,
      budgetHeadroom,
      videoHeadroom,
    };
  }, [planState.items, planState.totalTargetBudget, planState.budgetAdsTotal, planState.totalTargetContents]);

  // Bật 1 nhánh vào sơ đồ Mindmap của gian hàng
  const handleEnableBranch = (branchId: MindmapBranchId) => {
    if (disabled) return;
    setManuallyEnabledBranches(prev => {
      const next = new Set(prev);
      next.add(branchId);
      return next;
    });
    setSelectedBranchId(branchId);

    // Nếu gian hàng chưa có dòng con nào của nhánh này hoặc tất cả đang = 0, khởi tạo số lượng gợi ý
    const existing = planState.items.filter(it => matchItemToBranch(it, branchId));
    if (existing.length === 0) {
      const created = createDefaultItemsForBranch(branchId, planState.pic);
      onUpdateItems([...planState.items, ...created]);
    } else if (existing.every(it => it.qty === 0)) {
      const updated = planState.items.map(it => {
        if (!matchItemToBranch(it, branchId)) return it;
        const defaultQty = branchId === 'FOC' ? 20 : it.tierCode === 'KL1' || it.tierCode === 'KL2' ? 5 : 2;
        const newBudget = defaultQty * it.unitCost;
        return {
          ...it,
          qty: defaultQty,
          totalBudget: newBudget,
          targetGmv: newBudget * it.expectedRoiMultiplier,
        };
      });
      onUpdateItems(updated);
    }

    const meta = MINDMAP_BRANCHES.find(b => b.id === branchId);
    if (onNotify && meta) {
      onNotify(`Đã thêm nhánh "${meta.label}" vào sơ đồ kế hoạch của ${planState.storeName || planState.brandName}.`);
    }
  };

  // Gỡ 1 nhánh khỏi sơ đồ gian hàng (đưa số lượng & ngân sách nhánh đó về 0)
  const handleDisableBranch = (branchId: MindmapBranchId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;

    setManuallyEnabledBranches(prev => {
      const next = new Set(prev);
      next.delete(branchId);
      return next;
    });

    const updated = planState.items.map(it => {
      if (!matchItemToBranch(it, branchId)) return it;
      return {
        ...it,
        qty: 0,
        totalBudget: 0,
        targetGmv: 0,
      };
    });
    onUpdateItems(updated);

    if (selectedBranchId === branchId) {
      const remaining = activeBranches.filter(b => b.id !== branchId);
      if (remaining.length > 0) {
        setSelectedBranchId(remaining[0].id);
      }
    }

    const meta = MINDMAP_BRANCHES.find(b => b.id === branchId);
    if (onNotify && meta) {
      onNotify(`Đã gỡ nhánh "${meta.label}" (đưa ngân sách và số lượng về 0).`);
    }
  };

  // Kéo thanh trượt tổng số lượng video của cả 1 Nhánh ngay trên thẻ Mindmap
  const handleScaleBranchQty = (branchId: MindmapBranchId, targetBranchQty: number) => {
    if (disabled) return;
    const validTarget = Math.max(0, Math.round(targetBranchQty));
    const currentBranchItems = planState.items.filter(it => matchItemToBranch(it, branchId));

    // Nếu nhánh chưa có item trong danh sách, tạo mới trước
    let workingList = [...planState.items];
    if (currentBranchItems.length === 0) {
      const created = createDefaultItemsForBranch(branchId, planState.pic);
      workingList = [...workingList, ...created];
    }

    const branchItems = workingList.filter(it => matchItemToBranch(it, branchId));
    const currentSumQty = branchItems.reduce((s, it) => s + (it.qty || 0), 0);

    let rem = validTarget;
    const updated = workingList.map(it => {
      if (!matchItemToBranch(it, branchId)) return it;

      const idxInBranch = branchItems.findIndex(b => b.id === it.id);
      const isLast = idxInBranch === branchItems.length - 1;

      let nextQty = 0;
      if (validTarget === 0) {
        nextQty = 0;
      } else if (currentSumQty > 0) {
        const share = (it.qty || 0) / currentSumQty;
        nextQty = isLast ? Math.max(0, rem) : Math.round(validTarget * share);
        rem -= nextQty;
      } else {
        // Nếu trước đó toàn bộ = 0, ưu tiên phân bổ vào các dòng đầu (KL1-KL3 hoặc dòng đầu tiên)
        const activeCount = Math.min(branchItems.length, 3);
        if (idxInBranch < activeCount) {
          nextQty = idxInBranch === activeCount - 1 ? Math.max(0, rem) : Math.round(validTarget / activeCount);
          rem -= nextQty;
        }
      }

      const nextBudget = nextQty * it.unitCost;
      return {
        ...it,
        qty: nextQty,
        totalBudget: nextBudget,
        targetGmv: nextBudget * it.expectedRoiMultiplier,
      };
    });

    onUpdateItems(updated);
  };

  // Cập nhật từng dòng con trong nhánh đang chọn
  const handleUpdateSubItemQty = (itemId: string, nextQtyRaw: number) => {
    if (disabled) return;
    const nextQty = Math.max(0, Math.round(nextQtyRaw || 0));
    const updated = planState.items.map(it => {
      if (it.id !== itemId) return it;
      const nextBudget = nextQty * it.unitCost;
      return {
        ...it,
        qty: nextQty,
        totalBudget: nextBudget,
        targetGmv: nextBudget * it.expectedRoiMultiplier,
      };
    });
    onUpdateItems(updated);
  };

  const handleUpdateSubItemCost = (itemId: string, nextCostRaw: number) => {
    if (disabled) return;
    const nextCost = Math.max(0, Math.round(nextCostRaw || 0));
    const updated = planState.items.map(it => {
      if (it.id !== itemId) return it;
      const nextBudget = it.qty * nextCost;
      return {
        ...it,
        unitCost: nextCost,
        totalBudget: nextBudget,
        targetGmv: nextBudget * it.expectedRoiMultiplier,
      };
    });
    onUpdateItems(updated);
  };

  const handleUpdateSubItemField = (itemId: string, field: 'contentFormat' | 'assignedStaff', value: string) => {
    if (disabled) return;
    const updated = planState.items.map(it => (it.id === itemId ? { ...it, [field]: value } : it));
    onUpdateItems(updated);
  };

  // Thêm 1 dòng phân rã mới vào nhánh đang mở (ví dụ thêm định dạng mới cho Facebook / Self-channel)
  const handleAddSubItemToSelectedBranch = () => {
    if (disabled) return;
    const channelMap: Record<MindmapBranchId, InputPlanChannelType> = {
      VIDEO_AFFILIATE: 'TIKTOK',
      FOC: 'TIKTOK',
      SELF_CHANNEL: 'SELF_CHANNEL',
      FACEBOOK: 'FACEBOOK',
      THREADS: 'THREADS',
      INSTA: 'INSTAGRAM',
      SHOPEE: 'SHOPEE',
    };
    const meta = MINDMAP_BRANCHES.find(b => b.id === selectedBranchId)!;
    const defaultCost = selectedBranchId === 'FOC' ? 0 : selectedBranchId === 'SELF_CHANNEL' ? 200000 : 500000;
    const newItem: InputPlanRowItem = {
      id: `sub-${selectedBranchId.toLowerCase()}-${Date.now()}`,
      channel: channelMap[selectedBranchId],
      platform: meta.label,
      category: selectedBranchId === 'SELF_CHANNEL' ? 'SELF_CHANNEL' : 'PLATFORM_FORMAT',
      tierCode: selectedBranchId === 'FOC' ? 'TAP UpAffiliate' : selectedBranchId === 'VIDEO_AFFILIATE' ? 'KL2' : 'Affiliate',
      tierLabel: `${meta.label} - Hạng mục bổ sung`,
      contentFormat: CONTENT_FORMAT_OPTIONS[0],
      qty: 5,
      unitCost: defaultCost,
      benchmarkCost: defaultCost,
      totalBudget: 5 * defaultCost,
      expectedRoiMultiplier: 5.5,
      targetGmv: 5 * defaultCost * 5.5,
      assignedStaff: planState.pic,
    };
    onUpdateItems([...planState.items, newItem]);
    if (onNotify) onNotify(`Đã thêm 1 hạng mục phân rã mới vào nhánh ${meta.label}.`);
  };

  // Bù toàn bộ phần ngân sách hoặc số lượng còn thiếu vào 1 dòng con
  const handleFillHeadroomToSubItem = (item: InputPlanRowItem) => {
    if (disabled) return;
    if (item.unitCost === 0 && storeTotals.videoHeadroom > 0) {
      handleUpdateSubItemQty(item.id, item.qty + storeTotals.videoHeadroom);
      if (onNotify) onNotify(`Đã bù ${storeTotals.videoHeadroom} video còn thiếu vào "${item.tierLabel}".`);
    } else if (item.unitCost > 0 && storeTotals.budgetHeadroom >= item.unitCost) {
      const addQty = Math.floor(storeTotals.budgetHeadroom / item.unitCost);
      handleUpdateSubItemQty(item.id, item.qty + addQty);
      if (onNotify) onNotify(`Đã quy đổi ngân sách còn dư thành +${addQty} video cho "${item.tierLabel}".`);
    } else if (storeTotals.videoHeadroom > 0) {
      handleUpdateSubItemQty(item.id, item.qty + storeTotals.videoHeadroom);
    }
  };

  const selectedBranchMeta = MINDMAP_BRANCHES.find(b => b.id === selectedBranchId) || MINDMAP_BRANCHES[0];
  const selectedBranchStats = branchStatsMap[selectedBranchId] || {
    items: [],
    totalQty: 0,
    totalBudget: 0,
    isEnabled: true,
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-canvas/95 backdrop-blur-xs overflow-y-auto p-4 md:p-6 space-y-4'
          : 'space-y-4'
      }
    >
      {/* Thanh điều hướng cố định khi ở chế độ Toàn màn hình */}
      {isFullscreen && (
        <div className="sticky top-0 z-20 bg-surface text-ink border border-line rounded-xl px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-soft border border-line flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-2xs text-ink-3 font-medium">
                Sơ đồ phân rã toàn màn hình · PIC: {planState.pic}
              </div>
              <div className="text-sm font-semibold text-ink truncate">
                {planState.storeName || planState.brandName} ({planState.month})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
            <div>
              <span className="text-ink-3 mr-1.5">Ngân sách:</span>
              <strong className={storeTotals.budgetHeadroom < 0 ? 'text-critical' : 'text-positive'}>
                {formatVndShort(storeTotals.combinedBudget)}
              </strong>
              <span className="text-ink-3"> / {formatVndShort(planState.totalTargetBudget)}</span>
            </div>
            <div>
              <span className="text-ink-3 mr-1.5">Tổng video:</span>
              <strong className="text-accent">{storeTotals.allocatedVideos}</strong>
              <span className="text-ink-3"> / {planState.totalTargetContents} video</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sunken hover:bg-slate-200/70 text-ink text-xs font-semibold border border-line transition cursor-pointer"
              title="Thoát toàn màn hình (Phím Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Thu nhỏ (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SƠ ĐỒ NHÁNH 2 CỘT GỌN GÀNG: CỘT TRÁI (NHÁNH KÊNH) -> CỘT PHẢI (HẠNG MỤC)   */}
      {/* ========================================================================= */}
      <div
        onDragOver={(e) => {
          if (draggingBranchId) {
            e.preventDefault();
            setIsOverCanvasDropzone(true);
          }
        }}
        onDragLeave={() => setIsOverCanvasDropzone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOverCanvasDropzone(false);
          if (draggingBranchId) {
            handleEnableBranch(draggingBranchId);
            setDraggingBranchId(null);
          }
        }}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-start rounded-xl transition ${
          isOverCanvasDropzone ? 'ring-2 ring-blue-500 bg-accent-soft p-2' : ''
        }`}
      >
        {/* ===================================================================== */}
        {/* CỘT TRÁI (4/12): CÁC NHÁNH TRIỂN KHAI CỦA GIAN HÀNG                   */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 bg-surface rounded-xl border border-line p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-ink">
                Nhánh triển khai ({activeBranches.length}/7)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-line bg-canvas hover:bg-accent-soft hover:text-accent text-ink-2 text-2xs font-semibold transition cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ (Phím Esc)' : 'Mở rộng toàn màn hình'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  <span>Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-accent" />
                  <span>Toàn màn hình</span>
                </>
              )}
            </button>
          </div>

          {/* DANH SÁCH NHÁNH ĐANG BẬT */}
          <div className="relative pl-4 space-y-2 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-3 before:w-0.5 before:bg-blue-200">
            {activeBranches.map(branch => {
              const stat = branchStatsMap[branch.id];
              const isSelected = selectedBranchId === branch.id;
              const budgetSharePct =
                storeTotals.allocatedBudget > 0
                  ? Math.round((stat.totalBudget / storeTotals.allocatedBudget) * 100)
                  : 0;
              const maxBranchQty = branch.id === 'FOC' ? 250 : Math.max(120, planState.totalTargetContents || 100);

              return (
                <div
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={`relative rounded-xl border p-2.5 transition cursor-pointer ${
                    isSelected ? branch.activeBgClass : 'bg-surface border-line hover:border-blue-300'
                  }`}
                >
                  <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-blue-300" />
                  <span
                    className={`absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                      isSelected ? 'bg-primary ring-2 ring-blue-200' : 'bg-blue-300'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {renderBranchIcon(branch, 'w-4 h-4 shrink-0')}
                        <span className="font-semibold text-xs text-ink truncate">{branch.label}</span>
                        {!branch.isFreeCast && budgetSharePct > 0 && (
                          <span className={`text-2xs font-mono font-semibold px-1.5 py-0.5 rounded border ${branch.badgeClass}`}>
                            {budgetSharePct}%
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-ink-3 truncate mt-0.5">{branch.shortDesc}</p>
                    </div>

                    <div className="flex items-start gap-1.5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-semibold text-xs text-ink">
                          {branch.isFreeCast ? '0 đ' : formatVndShort(stat.totalBudget)}
                        </div>
                        <div className="font-mono text-2xs font-semibold text-accent">
                          {stat.totalQty} video
                        </div>
                      </div>
                      {!disabled && activeBranches.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDisableBranch(branch.id, e)}
                          className="p-0.5 rounded text-ink-3 hover:text-critical hover:bg-critical-soft transition"
                          title={`Gỡ nhánh ${branch.label}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* THANH KÉO TRỰC QUAN NGAY TRÊN NHÁNH */}
                  <div
                    className="mt-2 pt-1.5 border-t border-line flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="range"
                      min={0}
                      max={maxBranchQty}
                      value={Math.min(stat.totalQty, maxBranchQty)}
                      onChange={(e) => handleScaleBranchQty(branch.id, Number(e.target.value))}
                      className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${branch.sliderAccent}`}
                      title={`Kéo để tăng/giảm nhanh tổng số lượng video của nhánh ${branch.label}`}
                    />
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-ink-3'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* KHU VỰC BẬT THÊM NHÁNH CHƯA TRIỂN KHAI (KHÔNG LẶP LẠI NHÁNH ĐÃ BẬT) */}
          {inactiveBranches.length > 0 && (
            <div className="pt-2.5 border-t border-line space-y-1.5">
              <span className="text-2xs font-medium text-ink-3 block">
                Bật thêm nhánh kênh cho gian hàng:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {inactiveBranches.map(branch => (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleEnableBranch(branch.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-line-strong bg-canvas hover:border-blue-400 hover:bg-surface text-ink-2 text-2xs font-medium transition cursor-pointer disabled:opacity-50"
                    title={`Thêm nhánh ${branch.label} (${branch.shortDesc})`}
                  >
                    <Plus className="w-3 h-3 text-accent" />
                    {renderBranchIcon(branch, 'w-3.5 h-3.5 shrink-0')}
                    <span>{branch.shortLabel || branch.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* CỘT PHẢI (8/12): PHÂN RÃ CHI TIẾT CỦA NHÁNH ĐANG CHỌN (SUB-BRANCHES)  */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 bg-surface rounded-xl border border-line overflow-hidden">
          {/* Header gọn của Nhánh đang chọn */}
          <div className="px-4 py-3 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1.5 ${selectedBranchMeta.badgeClass}`}>
                {renderBranchIcon(selectedBranchMeta, 'w-3.5 h-3.5 shrink-0')}
                <span>{selectedBranchMeta.label}</span>
              </span>
              <span className="text-xs text-ink-3">•</span>
              <span className="text-xs font-medium text-ink-2">{selectedBranchMeta.unitLabel}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-ink-2">
                Tổng nhánh: <strong className="text-ink">{selectedBranchStats.totalQty} video</strong> ·{' '}
                <strong className="text-accent">
                  {selectedBranchMeta.isFreeCast ? '0 đ' : formatVndShort(selectedBranchStats.totalBudget)}
                </strong>
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleAddSubItemToSelectedBranch}
                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mục con</span>
                </button>
              )}
            </div>
          </div>

          {/* DANH SÁCH NHÁNH CON (SUB-NODES) CỦA NHÁNH ĐANG CHỌN */}
          <div className="p-4 space-y-2.5 max-h-[640px] overflow-y-auto">
            {selectedBranchStats.items.length === 0 ? (
              <div className="py-10 text-center text-ink-3 space-y-2">
                <p className="text-xs font-medium">Nhánh {selectedBranchMeta.label} chưa có hạng mục phân rã.</p>
                <button
                  type="button"
                  onClick={() => handleEnableBranch(selectedBranchId)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition cursor-pointer"
                >
                  Khởi tạo các mục con cho nhánh {selectedBranchMeta.label}
                </button>
              </div>
            ) : (
              <div className="relative pl-4 space-y-2.5 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-4 before:w-0.5 before:bg-slate-200">
                {selectedBranchStats.items.map(item => {
                  const isDragOver = dragOverItemId === item.id;
                  const maxItemSlider = selectedBranchId === 'FOC' ? 200 : 80;
                  const shareOfBranchPct =
                    selectedBranchStats.totalBudget > 0
                      ? Math.round((item.totalBudget / selectedBranchStats.totalBudget) * 100)
                      : 0;

                  return (
                    <div
                      key={item.id}
                      onDragOver={(e) => {
                        if (draggingChip) {
                          e.preventDefault();
                          setDragOverItemId(item.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverItemId === item.id) setDragOverItemId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverItemId(null);
                        if (!draggingChip) return;
                        if (draggingChip.type === 'FORMAT') {
                          handleUpdateSubItemField(item.id, 'contentFormat', draggingChip.value);
                          if (onNotify) onNotify(`Đã gán định dạng "${draggingChip.value}" cho ${item.tierLabel}.`);
                        } else {
                          handleUpdateSubItemField(item.id, 'assignedStaff', draggingChip.value);
                          if (onNotify) onNotify(`Đã gán nhân sự "${draggingChip.value}" cho ${item.tierLabel}.`);
                        }
                        setDraggingChip(null);
                      }}
                      className={`relative rounded-xl border p-3 transition ${
                        isDragOver
                          ? 'bg-accent-soft border-blue-500 ring-2 ring-blue-400'
                          : item.qty > 0
                          ? 'bg-surface border-line hover:border-line-strong'
                          : 'bg-canvas/60 border-line opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Đường nối nhánh con */}
                      <span className="absolute -left-2.5 top-6 w-2.5 h-0.5 bg-slate-300" />

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Cột 1 (4/12): Tên bậc / hạng mục + Định dạng & Nhân sự */}
                        <div className="md:col-span-5 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-2xs font-mono font-semibold border shrink-0 ${selectedBranchMeta.badgeClass}`}>
                              {item.tierCode}
                            </span>
                            <span className="font-semibold text-xs text-ink truncate" title={item.tierLabel}>
                              {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={item.contentFormat}
                              onChange={(e) => handleUpdateSubItemField(item.id, 'contentFormat', e.target.value)}
                              className="w-full text-2xs font-medium px-2 py-1 bg-canvas hover:bg-surface border border-line rounded-md text-ink-2 truncate"
                              title="Chọn định dạng video (hoặc kéo thẻ định dạng thả vào đây)"
                            >
                              {CONTENT_FORMAT_OPTIONS.map(fmt => (
                                <option key={fmt} value={fmt}>{fmt}</option>
                              ))}
                            </select>

                            <select
                              value={item.assignedStaff || planState.pic}
                              onChange={(e) => handleUpdateSubItemField(item.id, 'assignedStaff', e.target.value)}
                              className="w-full text-2xs font-semibold px-2 py-1 bg-accent-soft hover:bg-blue-50 border border-line rounded-md text-accent truncate"
                              title="Chọn nhân sự thực thi (hoặc kéo thẻ nhân sự thả vào đây)"
                            >
                              {picOptions.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Cột 2 (4/12): Thanh kéo số lượng trực tiếp + nút +/- */}
                        <div className="md:col-span-4 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-2xs text-ink-3 font-medium">Số lượng video:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateSubItemQty(item.id, item.qty - 1)}
                                className="w-5 h-5 rounded border border-line bg-surface hover:bg-sunken flex items-center justify-center text-ink-2"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.qty}
                                onChange={(e) => handleUpdateSubItemQty(item.id, Number(e.target.value))}
                                className="w-12 text-center font-mono font-semibold text-xs py-0.5 border border-line rounded bg-surface text-ink"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateSubItemQty(item.id, item.qty + 1)}
                                className="w-5 h-5 rounded border border-line bg-surface hover:bg-sunken flex items-center justify-center text-ink-2"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={maxItemSlider}
                            value={Math.min(item.qty, maxItemSlider)}
                            onChange={(e) => handleUpdateSubItemQty(item.id, Number(e.target.value))}
                            className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${selectedBranchMeta.sliderAccent}`}
                          />
                        </div>

                        {/* Cột 3 (3/12): Đơn giá Net & Thành tiền nhảy số trực tiếp */}
                        <div className="md:col-span-3 text-right space-y-1">
                          {selectedBranchMeta.isFreeCast ? (
                            <div>
                              <span className="text-xs font-mono font-semibold text-positive block">0 đ (Mẫu FOC)</span>
                              {storeTotals.videoHeadroom > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleFillHeadroomToSubItem(item)}
                                  className="mt-1 text-2xs font-semibold px-2 py-0.5 rounded bg-positive-soft text-positive border border-line hover:bg-emerald-100"
                                >
                                  + Bù {storeTotals.videoHeadroom} video thiếu
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-2xs text-ink-3">Đơn giá:</span>
                                <input
                                  type="number"
                                  step={100000}
                                  min={0}
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateSubItemCost(item.id, Number(e.target.value))}
                                  className="w-20 text-right font-mono text-2xs px-1.5 py-0.5 border border-line rounded bg-surface text-ink"
                                />
                              </div>
                              <div className="flex items-baseline justify-end gap-1.5">
                                <span className="font-mono font-semibold text-xs text-ink">
                                  {formatVndShort(item.totalBudget)}
                                </span>
                                <span className="text-2xs font-mono text-ink-3">({shareOfBranchPct}%)</span>
                              </div>
                              {storeTotals.budgetHeadroom >= item.unitCost && item.unitCost > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleFillHeadroomToSubItem(item)}
                                  className="text-2xs font-semibold text-accent hover:underline"
                                  title="Quy đổi ngân sách còn dư vào dòng này"
                                >
                                  + Khớp dư ({Math.floor(storeTotals.budgetHeadroom / item.unitCost)} clip)
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
