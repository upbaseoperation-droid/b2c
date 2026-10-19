'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Users,
  Building2,
  Store,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Plus,
  Send,
  ExternalLink,
  Sliders,
  Sparkles,
  X,
  Flame,
  Target,
  Activity,
  LayoutGrid,
  Box,
} from 'lucide-react';
import {
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  SlaTask,
  BookingDealItem,
  TabKey,
  getStoreTierByCoefficient,
  normalizeStoreCoefficient,
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';
import { Button, BrandAvatar, PlatformBadge, Status } from '../ui';
import {
  B2C_28_STAFF_WORKLOAD_ROSTER,
  STAFF_LEVEL_TABLE_4,
  STORE_SCOPE_TABLE_2,
} from './TaskDelegationView';

interface Workload3dMapViewProps {
  currentUser: UserProfile;
  brands: BrandDetail[];
  storePortfolios: StorePortfolioItem[];
  tasks: SlaTask[];
  deals?: BookingDealItem[];
  onUpdateBrand: (updated: BrandDetail) => void;
  onUpdateStore: (updated: StorePortfolioItem) => void;
  onAddTask: (task: SlaTask) => void;
  onPingStaff?: (staffName: string, message: string) => void;
  onNotify?: (msg: string, tone?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToTab?: (tabKey: TabKey) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
}

type SpatialLayoutMode = 'THREE_TIER_3D' | 'FOCUS_ORBIT';
type WorkloadLoadStatus = 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD';
type RoleFilterGroup =
  | 'ALL'
  | 'LEADER'
  | 'BOOKING'
  | 'CONTENT_BRAND'
  | 'PLAN_STRATEGY'
  | 'KEY_VISUAL'
  | 'FOC_SAMPLE';
type LoadFilterMode = 'ALL' | 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD' | 'HARD_RATIO_LOW';

interface StaffComputedWorkload {
  id: string;
  staffCode: string;
  name: string;
  shortName: string;
  level: string;
  roleGroup: string;
  roleFilterCategory: RoleFilterGroup;
  workflowPts: number;
  directorPts: number;
  dynamicTaskPts: number;
  totalPts: number;
  hardPts: number;
  hardRatioPct: number;
  minHardRatioReqPct: number;
  isHardRatioPass: boolean;
  targetCapacityPts: number;
  loadPct: number;
  loadStatus: WorkloadLoadStatus;
  assignedBrands: {
    brandId: string;
    brandName: string;
    roles: string[];
  }[];
  assignedStores: {
    storeId: string;
    storeName: string;
    brandName: string;
    platform: string;
    coef: number;
    budgetNet: number;
    roleLabel: string;
  }[];
  activeTasks: SlaTask[];
}

interface Node3D {
  id: string;
  kind: 'STAFF' | 'BRAND' | 'STORE';
  label: string;
  shortLabel: string;
  subLabel: string;
  metricBadge: string;
  tx: number;
  ty: number;
  tz: number;
  towerHeight: number;
  targetCapHeight: number;
  colorTop: string;
  colorLeft: string;
  colorRight: string;
  strokeColor: string;
  textColor: string;
  pillBg: string;
  pillBorder: string;
  staffData?: StaffComputedWorkload;
  brandData?: BrandDetail;
  storeData?: StorePortfolioItem;
}

interface Link3D {
  id: string;
  sourceId: string;
  targetId: string;
  roleLabel: string;
  linkType: 'STAFF_TO_BRAND' | 'STAFF_TO_STORE' | 'BRAND_TO_STORE';
  color: string;
  weight: number;
  particleSpeed: number;
}

function getTargetCapacityByLevel(level: string): number {
  switch (level) {
    case 'L3':
      return 145;
    case 'L2.5':
      return 132;
    case 'L2':
      return 118;
    case 'L1.5':
      return 104;
    case 'L1':
      return 92;
    case 'L0.5':
      return 78;
    default:
      return 105;
  }
}

function getShortVietnameseName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
}

function classifyStaffRoleCategory(roleGroup: string): RoleFilterGroup {
  const lower = roleGroup.toLowerCase();
  if (lower.includes('trưởng nhóm') || lower.includes('lead')) return 'LEADER';
  if (lower.includes('foc') || lower.includes('sample')) return 'FOC_SAMPLE';
  if (lower.includes('key visual') || lower.includes('sis')) return 'KEY_VISUAL';
  if (lower.includes('booking')) return 'BOOKING';
  if (lower.includes('content') || lower.includes('brand main')) return 'CONTENT_BRAND';
  if (lower.includes('plan') || lower.includes('strategy')) return 'PLAN_STRATEGY';
  return 'BOOKING';
}

export const Workload3dMapView: React.FC<Workload3dMapViewProps> = ({
  brands,
  storePortfolios,
  tasks,
  onUpdateBrand,
  onUpdateStore,
  onAddTask,
  onPingStaff,
  onNotify,
  onNavigateToTab,
  onNavigateToBrandProfile,
  onNavigateToStoreProfile,
}) => {
  const [layoutMode, setLayoutMode] = useState<SpatialLayoutMode>('THREE_TIER_3D');
  const [roleFilter, setRoleFilter] = useState<RoleFilterGroup>('ALL');
  const [loadFilter, setLoadFilter] = useState<LoadFilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showParticles, setShowParticles] = useState<boolean>(true);

  // Default null so ALL 28 staff, Brands, and Stores are shown at 100% full contrast initially!
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskBrand, setQuickTaskBrand] = useState('');
  const [quickTaskPoints, setQuickTaskPoints] = useState<number>(6);
  const [quickTaskDifficulty, setQuickTaskDifficulty] = useState<'EASY' | 'STANDARD' | 'HARD'>('HARD');

  const b2cStores = useMemo(() => {
    const filtered = storePortfolios.filter(s => Boolean(s.requiresB2cPlan || s.isB2cManaged));
    return filtered.length > 0 ? filtered : storePortfolios.slice(0, 69);
  }, [storePortfolios]);

  // Compute Staff Workload accurately from Roster + Live Reassignments + Active Tasks
  const staffWorkloads = useMemo<StaffComputedWorkload[]>(() => {
    return B2C_28_STAFF_WORKLOAD_ROSTER.map((roster, rosterIdx) => {
      const assignedBrands: StaffComputedWorkload['assignedBrands'] = [];
      brands.forEach(b => {
        const roles: string[] = [];
        const contentMain = b.contentBrandMainPic || b.contentPic || '';
        const planStrat = b.planStrategyPic || b.brandPicName || '';
        const kvSis = b.keyVisualSisPic || '';
        const bookingLead = b.bookingPicLead || '';

        if (contentMain.toLowerCase() === roster.name.toLowerCase()) roles.push('Content / Brand');
        if (planStrat.toLowerCase() === roster.name.toLowerCase()) roles.push('Plan / Strategy');
        if (kvSis.toLowerCase() === roster.name.toLowerCase()) roles.push('Key Visual');
        if (bookingLead.toLowerCase() === roster.name.toLowerCase()) roles.push('Booking Lead');

        if (roles.length > 0) {
          assignedBrands.push({
            brandId: b.id,
            brandName: b.name,
            roles,
          });
        }
      });

      const assignedStores: StaffComputedWorkload['assignedStores'] = [];
      b2cStores.forEach(s => {
        const matchOwner =
          (s.b2cOwnerName && s.b2cOwnerName.toLowerCase().includes(roster.name.toLowerCase())) ||
          (s.assignedStaff && s.assignedStaff.toLowerCase().includes(roster.name.toLowerCase())) ||
          (s.b2cOwners && s.b2cOwners.some(o => o.toLowerCase().includes(roster.name.toLowerCase())));
        const matchLeader =
          s.hasBookingLeader &&
          s.bookingLeader &&
          s.bookingLeader.toLowerCase().includes(roster.name.toLowerCase());
        const matchContent =
          s.contentPic && s.contentPic.toLowerCase().includes(roster.name.toLowerCase());
        const matchLive =
          s.livestreamPic && s.livestreamPic.toLowerCase().includes(roster.name.toLowerCase());

        if (matchOwner || matchLeader || matchContent || matchLive) {
          const roleLabels: string[] = [];
          if (matchOwner) roleLabels.push('PIC Gian');
          if (matchLeader) roleLabels.push('Leader');
          if (matchContent) roleLabels.push('Content');
          if (matchLive) roleLabels.push('Live');

          assignedStores.push({
            storeId: s.id,
            storeName: s.storeName,
            brandName: s.brandName,
            platform: s.platform,
            coef: normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier,
            budgetNet: s.budgetNet || s.monthlyBudget || 0,
            roleLabel: roleLabels.join(' · '),
          });
        }
      });

      if (roster.keyStoresSample) {
        const sampleTokens = roster.keyStoresSample
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        sampleTokens.forEach(token => {
          const matchedStore = b2cStores.find(
            st =>
              st.storeName.toLowerCase().includes(token.toLowerCase()) ||
              st.brandName.toLowerCase().includes(token.toLowerCase())
          );
          if (matchedStore && !assignedStores.some(as => as.storeId === matchedStore.id)) {
            assignedStores.push({
              storeId: matchedStore.id,
              storeName: matchedStore.storeName,
              brandName: matchedStore.brandName,
              platform: matchedStore.platform,
              coef: normalizeStoreCoefficient(
                matchedStore.difficultyTier,
                matchedStore.difficultyMultiplier
              ).multiplier,
              budgetNet: matchedStore.budgetNet || matchedStore.monthlyBudget || 0,
              roleLabel: 'PIC Phối hợp',
            });
          }
          const matchedBrand = brands.find(br =>
            br.name.toLowerCase().includes(token.toLowerCase())
          );
          if (matchedBrand && !assignedBrands.some(ab => ab.brandId === matchedBrand.id)) {
            assignedBrands.push({
              brandId: matchedBrand.id,
              brandName: matchedBrand.name,
              roles: [roster.roleGroup.split('&')[0].trim()],
            });
          }
        });
      }

      if (assignedBrands.length === 0 && brands.length > 0) {
        const fallbackBrand = brands[rosterIdx % brands.length];
        assignedBrands.push({
          brandId: fallbackBrand.id,
          brandName: fallbackBrand.name,
          roles: [roster.roleGroup.split('&')[0].trim()],
        });
      }
      if (assignedStores.length === 0 && b2cStores.length > 0) {
        const fallbackStore = b2cStores[rosterIdx % b2cStores.length];
        assignedStores.push({
          storeId: fallbackStore.id,
          storeName: fallbackStore.storeName,
          brandName: fallbackStore.brandName,
          platform: fallbackStore.platform,
          coef: normalizeStoreCoefficient(
            fallbackStore.difficultyTier,
            fallbackStore.difficultyMultiplier
          ).multiplier,
          budgetNet: fallbackStore.budgetNet || fallbackStore.monthlyBudget || 0,
          roleLabel: 'Điều phối FOC/Mẫu',
        });
      }

      const staffTasks = tasks.filter(
        t => t.pic && t.pic.toLowerCase() === roster.name.toLowerCase() && t.urgency !== 'done'
      );

      const dynamicTaskPts = staffTasks.reduce(
        (sum, t) => sum + (t.calculatedWorkloadPoints || t.standardPoint || 4.0),
        0
      );
      const dynamicHardPts = staffTasks.reduce(
        (sum, t) =>
          t.taskDifficultyTier === 'HARD' || t.urgency === 'critical'
            ? sum + (t.calculatedWorkloadPoints || t.standardPoint || 4.0)
            : sum,
        0
      );

      const workflowPts = roster.baselineWorkflowTotalPts;
      const directorPts = roster.baselineDirectorTotalPts + dynamicTaskPts;
      const totalPts = Math.round((workflowPts + directorPts) * 10) / 10;

      const hardPts =
        Math.round(
          (roster.baselineWorkflowHardPts + roster.baselineDirectorHardPts + dynamicHardPts) * 10
        ) / 10;
      const hardRatioPct = totalPts > 0 ? Math.round((hardPts / totalPts) * 1000) / 10 : 0;

      const levelRule = STAFF_LEVEL_TABLE_4.find(l => l.level === roster.level);
      const minHardRatioReqPct = levelRule ? levelRule.minHardRatioPct : 25;
      const isHardRatioPass = hardRatioPct >= minHardRatioReqPct;

      const targetCapacityPts = getTargetCapacityByLevel(roster.level);
      const loadPct = Math.round((totalPts / targetCapacityPts) * 100);

      let loadStatus: WorkloadLoadStatus = 'OPTIMAL';
      if (loadPct >= 115) {
        loadStatus = 'OVERLOAD';
      } else if (loadPct < 96) {
        loadStatus = 'UNDERLOAD';
      }

      return {
        id: `staff-${roster.staffCode}`,
        staffCode: roster.staffCode,
        name: roster.name,
        shortName: getShortVietnameseName(roster.name),
        level: roster.level,
        roleGroup: roster.roleGroup,
        roleFilterCategory: classifyStaffRoleCategory(roster.roleGroup),
        workflowPts,
        directorPts,
        dynamicTaskPts,
        totalPts,
        hardPts,
        hardRatioPct,
        minHardRatioReqPct,
        isHardRatioPass,
        targetCapacityPts,
        loadPct,
        loadStatus,
        assignedBrands,
        assignedStores,
        activeTasks: staffTasks,
      };
    });
  }, [brands, b2cStores, tasks]);

  // Filtered staff list (sorted by loadPct descending)
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffWorkloads
      .filter(st => {
        if (roleFilter !== 'ALL' && st.roleFilterCategory !== roleFilter) return false;
        if (loadFilter === 'OVERLOAD' && st.loadStatus !== 'OVERLOAD') return false;
        if (loadFilter === 'OPTIMAL' && st.loadStatus !== 'OPTIMAL') return false;
        if (loadFilter === 'UNDERLOAD' && st.loadStatus !== 'UNDERLOAD') return false;
        if (loadFilter === 'HARD_RATIO_LOW' && st.isHardRatioPass) return false;
        if (q) {
          const matchStaff =
            st.name.toLowerCase().includes(q) ||
            st.staffCode.toLowerCase().includes(q) ||
            st.roleGroup.toLowerCase().includes(q);
          const matchBrand = st.assignedBrands.some(b => b.brandName.toLowerCase().includes(q));
          const matchStore = st.assignedStores.some(s => s.storeName.toLowerCase().includes(q));
          if (!matchStaff && !matchBrand && !matchStore) return false;
        }
        return true;
      })
      .sort((a, b) => b.loadPct - a.loadPct);
  }, [staffWorkloads, roleFilter, loadFilter, searchQuery]);

  const groupedStaffByLoad = useMemo(() => {
    return {
      overload: filteredStaff.filter(s => s.loadStatus === 'OVERLOAD'),
      optimal: filteredStaff.filter(s => s.loadStatus === 'OPTIMAL'),
      underload: filteredStaff.filter(s => s.loadStatus === 'UNDERLOAD'),
    };
  }, [filteredStaff]);

  const summaryStats = useMemo(() => {
    const overloadCount = staffWorkloads.filter(s => s.loadStatus === 'OVERLOAD').length;
    const optimalCount = staffWorkloads.filter(s => s.loadStatus === 'OPTIMAL').length;
    const underloadCount = staffWorkloads.filter(s => s.loadStatus === 'UNDERLOAD').length;
    const lowHardRatioCount = staffWorkloads.filter(s => !s.isHardRatioPass).length;
    const totalPointsAll = staffWorkloads.reduce((acc, s) => acc + s.totalPts, 0);
    const avgLoadPct = Math.round(
      staffWorkloads.reduce((acc, s) => acc + s.loadPct, 0) / Math.max(1, staffWorkloads.length)
    );
    return {
      overloadCount,
      optimalCount,
      underloadCount,
      lowHardRatioCount,
      totalPointsAll: Math.round(totalPointsAll),
      avgLoadPct,
    };
  }, [staffWorkloads]);

  // ============================================================================
  // 3. BUILD 3-TERRACE STAGGERED 3D SCENE (ZERO COLUMN OR TEXT OVERLAP!)
  // ============================================================================
  const { graphNodes, graphLinks } = useMemo(() => {
    const nodes: Node3D[] = [];
    const links: Link3D[] = [];

    const focusedStaff = selectedNodeId?.startsWith('staff-')
      ? filteredStaff.find(s => s.id === selectedNodeId) || null
      : null;
    const focusedBrandId = selectedNodeId?.startsWith('brand-')
      ? selectedNodeId.replace('brand-', '')
      : null;
    const focusedStoreId = selectedNodeId?.startsWith('store-')
      ? selectedNodeId.replace('store-', '')
      : null;

    const activeBrandIds = new Set<string>();
    const activeStoreIds = new Set<string>();

    if (layoutMode === 'FOCUS_ORBIT' && (focusedStaff || focusedBrandId || focusedStoreId)) {
      if (focusedStaff) {
        focusedStaff.assignedBrands.forEach(ab => activeBrandIds.add(ab.brandId));
        focusedStaff.assignedStores.forEach(as => {
          activeStoreIds.add(as.storeId);
          const pb = brands.find(b => b.name.toLowerCase() === as.brandName.toLowerCase());
          if (pb) activeBrandIds.add(pb.id);
        });
      } else if (focusedBrandId) {
        activeBrandIds.add(focusedBrandId);
        const fb = brands.find(b => b.id === focusedBrandId);
        b2cStores.forEach(s => {
          if (s.brandId === focusedBrandId || (fb && s.brandName.toLowerCase() === fb.name.toLowerCase())) {
            activeStoreIds.add(s.id);
          }
        });
      } else if (focusedStoreId) {
        activeStoreIds.add(focusedStoreId);
        const fs = b2cStores.find(s => s.id === focusedStoreId);
        if (fs) {
          const pb = brands.find(
            b => b.id === fs.brandId || b.name.toLowerCase() === fs.brandName.toLowerCase()
          );
          if (pb) activeBrandIds.add(pb.id);
        }
      }
    } else {
      if (focusedStaff) {
        focusedStaff.assignedBrands.forEach(ab => activeBrandIds.add(ab.brandId));
        focusedStaff.assignedStores.forEach(as => activeStoreIds.add(as.storeId));
      }
      filteredStaff.forEach(st => {
        st.assignedBrands.forEach(ab => {
          if (activeBrandIds.size < 8) activeBrandIds.add(ab.brandId);
        });
        st.assignedStores.forEach(as => {
          if (activeStoreIds.size < 8) activeStoreIds.add(as.storeId);
        });
      });
      if (focusedBrandId) activeBrandIds.add(focusedBrandId);
      if (focusedStoreId) activeStoreIds.add(focusedStoreId);
    }

    const visibleBrands = brands.filter(b => activeBrandIds.has(b.id)).slice(0, 8);
    const visibleStores = b2cStores.filter(s => activeStoreIds.has(s.id)).slice(0, 8);

    // A. Position 28 Staff Nodes in a Symmetrical 4 Terraces × 7 Columns Matrix (7 × 4 = 28)
    // Hierarchy from Top to Bottom:
    // - TẦNG 3 (Trên cùng, y = 0..100):   THƯƠNG HIỆU (BRAND)          -> ty = 50
    // - TẦNG 2 (Giữa,      y = 100..200): GIAN HÀNG B2C (STORE)        -> ty = 150
    // - TẦNG 1 (Dưới cùng, y = 200..640): 28 NHÂN SỰ (4 BẬC × 7 CỘT)   -> ty = 268, 356, 444, 532
    const staffToRender =
      layoutMode === 'FOCUS_ORBIT' && focusedStaff ? [focusedStaff] : filteredStaff;
    const sTotal = Math.max(1, staffToRender.length);
    const maxCols = 7;
    const terraceCount = Math.min(4, Math.ceil(sTotal / maxCols));
    const itemsPerTerrace = Math.ceil(sTotal / terraceCount);

    const terraceY = [268, 356, 444, 532];
    const terraceZ = [15, 45, 75, 105];

    staffToRender.forEach((st, idx) => {
      let tx = 0; // Normalized [-1 .. +1]
      let ty = 356;
      let tz = 45;

      // 3D column height in reference pixels (18px .. 34px so it never touches the row above)
      const towerHeight = Math.max(18, Math.min(34, st.totalPts * 0.165));
      const targetCapHeight = Math.max(15, Math.min(30, st.targetCapacityPts * 0.165));

      if (layoutMode === 'FOCUS_ORBIT' && focusedStaff && st.id === focusedStaff.id) {
        tx = 0;
        ty = 350;
        tz = 45;
      } else {
        const tIdx = Math.min(terraceCount - 1, Math.floor(idx / itemsPerTerrace));
        const colIdx = idx - tIdx * itemsPerTerrace;
        const rowLen = Math.min(itemsPerTerrace, sTotal - tIdx * itemsPerTerrace);
        const spanNorm = rowLen <= 1 ? 0 : Math.min(1.0, (rowLen - 1) / (maxCols - 1));
        tx = rowLen <= 1 ? 0 : -spanNorm + (colIdx / (rowLen - 1)) * (spanNorm * 2);
        ty = terraceY[tIdx] ?? 532;
        tz = terraceZ[tIdx] ?? 105;
      }

      let colorTop = '#34d399';
      let colorLeft = '#10b981';
      let colorRight = '#047857';
      let strokeColor = '#047857';
      let textColor = '#065f46';
      let pillBg = '#ecfdf5';
      let pillBorder = '#34d399';

      if (st.loadStatus === 'OVERLOAD') {
        colorTop = '#fb7185';
        colorLeft = '#e11d48';
        colorRight = '#9f1239';
        strokeColor = '#9f1239';
        textColor = '#9f1239';
        pillBg = '#fff1f2';
        pillBorder = '#fb7185';
      } else if (st.loadStatus === 'UNDERLOAD') {
        colorTop = '#818cf8';
        colorLeft = '#4f46e5';
        colorRight = '#3730a3';
        strokeColor = '#3730a3';
        textColor = '#3730a3';
        pillBg = '#eef2ff';
        pillBorder = '#818cf8';
      }

      nodes.push({
        id: st.id,
        kind: 'STAFF',
        label: `${st.name} (${st.level})`,
        shortLabel: st.shortName,
        subLabel: `${st.totalPts.toFixed(0)}pt`,
        metricBadge: `${st.loadPct}%`,
        tx,
        ty,
        tz,
        towerHeight,
        targetCapHeight,
        colorTop,
        colorLeft,
        colorRight,
        strokeColor,
        textColor,
        pillBg,
        pillBorder,
        staffData: st,
      });
    });

    // B. Position Brand Nodes (TOP TIER - TẦNG 3: ty = 50 inside 0..100)
    const bCount = Math.max(1, visibleBrands.length);
    visibleBrands.forEach((b, idx) => {
      const nodeId = `brand-${b.id}`;
      const spanNorm = bCount <= 1 ? 0 : Math.min(0.96, (bCount - 1) / 7);
      const tx = bCount <= 1 ? 0 : -spanNorm + (idx / (bCount - 1)) * (spanNorm * 2);
      const ty = 50;
      const tz = -85;

      nodes.push({
        id: nodeId,
        kind: 'BRAND',
        label: b.name,
        shortLabel: b.name,
        subLabel: formatVndShort(b.planBudget || b.monthlyBudget || 150000000),
        metricBadge: 'Brand',
        tx,
        ty,
        tz,
        towerHeight: 14,
        targetCapHeight: 0,
        colorTop: '#fcd34d',
        colorLeft: '#f59e0b',
        colorRight: '#b45309',
        strokeColor: '#b45309',
        textColor: '#92400e',
        pillBg: '#fffbeb',
        pillBorder: '#fcd34d',
        brandData: b,
      });
    });

    // C. Position Store Nodes (MIDDLE TIER - TẦNG 2: ty = 150 inside 100..200)
    const stCount = Math.max(1, visibleStores.length);
    visibleStores.forEach((s, idx) => {
      const nodeId = `store-${s.id}`;
      const spanNorm = stCount <= 1 ? 0 : Math.min(0.96, (stCount - 1) / 7);
      const tx = stCount <= 1 ? 0 : -spanNorm + (idx / (stCount - 1)) * (spanNorm * 2);
      const ty = 150;
      const tz = -40;

      const isTikTok = s.platform === 'TikTok Shop';
      const coef = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier;
      const shortStore = s.storeName.replace(/_TikTok.*|_Shopee.*| Official| Store/gi, '');

      nodes.push({
        id: nodeId,
        kind: 'STORE',
        label: s.storeName,
        shortLabel: `${shortStore} (${isTikTok ? 'TTS' : 'SP'})`,
        subLabel: `×${coef.toFixed(2)}`,
        metricBadge: isTikTok ? 'TikTok' : 'Shopee',
        tx,
        ty,
        tz,
        towerHeight: 13,
        targetCapHeight: 0,
        colorTop: isTikTok ? '#38bdf8' : '#fb923c',
        colorLeft: isTikTok ? '#0284c7' : '#ea580c',
        colorRight: isTikTok ? '#0369a1' : '#c2410c',
        strokeColor: isTikTok ? '#0284c7' : '#ea580c',
        textColor: isTikTok ? '#075985' : '#9a3412',
        pillBg: isTikTok ? '#f0f9ff' : '#fff7ed',
        pillBorder: isTikTok ? '#7dd3fc' : '#fdba74',
        storeData: s,
      });
    });

    const nodeIdSet = new Set(nodes.map(n => n.id));

    staffToRender.forEach(st => {
      if (!nodeIdSet.has(st.id)) return;
      st.assignedBrands.forEach(ab => {
        const targetId = `brand-${ab.brandId}`;
        if (nodeIdSet.has(targetId)) {
          links.push({
            id: `link-${st.id}-${targetId}`,
            sourceId: st.id,
            targetId,
            roleLabel: ab.roles[0] || 'Brand PIC',
            linkType: 'STAFF_TO_BRAND',
            color: st.loadStatus === 'OVERLOAD' ? '#e11d48' : '#d97706',
            weight: 1.8,
            particleSpeed: 0.005,
          });
        }
      });

      st.assignedStores.forEach(as => {
        const targetId = `store-${as.storeId}`;
        if (nodeIdSet.has(targetId)) {
          links.push({
            id: `link-${st.id}-${targetId}`,
            sourceId: st.id,
            targetId,
            roleLabel: as.roleLabel,
            linkType: 'STAFF_TO_STORE',
            color: '#0284c7',
            weight: 1.5,
            particleSpeed: 0.0045,
          });
        }
      });
    });

    visibleStores.forEach(s => {
      const storeNodeId = `store-${s.id}`;
      const matchedBrand = visibleBrands.find(
        b => b.id === s.brandId || b.name.toLowerCase() === (s.brandName || '').toLowerCase()
      );
      if (matchedBrand) {
        const brandNodeId = `brand-${matchedBrand.id}`;
        if (nodeIdSet.has(storeNodeId) && nodeIdSet.has(brandNodeId)) {
          links.push({
            id: `link-${brandNodeId}-${storeNodeId}`,
            sourceId: brandNodeId,
            targetId: storeNodeId,
            roleLabel: s.platform,
            linkType: 'BRAND_TO_STORE',
            color: '#94a3b8',
            weight: 1.4,
            particleSpeed: 0.004,
          });
        }
      }
    });

    return { graphNodes: nodes, graphLinks: links };
  }, [filteredStaff, brands, b2cStores, layoutMode, selectedNodeId]);

  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    set.add(selectedNodeId);
    graphLinks.forEach(l => {
      if (l.sourceId === selectedNodeId) set.add(l.targetId);
      if (l.targetId === selectedNodeId) set.add(l.sourceId);
    });
    if (selectedNodeId.startsWith('staff-')) {
      const brandNodes = Array.from(set).filter(id => id.startsWith('brand-'));
      graphLinks.forEach(l => {
        if (brandNodes.includes(l.sourceId)) set.add(l.targetId);
      });
    }
    return set;
  }, [selectedNodeId, graphLinks]);

  const selectedNode = useMemo(() => {
    const targetId = selectedNodeId || filteredStaff[0]?.id || null;
    if (!targetId) return null;
    const inGraph = graphNodes.find(n => n.id === targetId);
    if (inGraph) return inGraph;
    if (targetId.startsWith('staff-')) {
      const st = staffWorkloads.find(s => s.id === targetId);
      if (st) {
        return {
          id: st.id,
          kind: 'STAFF' as const,
          label: st.name,
          shortLabel: st.shortName,
          subLabel: '',
          metricBadge: `${st.loadPct}%`,
          tx: 0,
          ty: 0,
          tz: 0,
          towerHeight: 34,
          targetCapHeight: 30,
          colorTop: '#10b981',
          colorLeft: '#059669',
          colorRight: '#047857',
          strokeColor: '#059669',
          textColor: '#065f46',
          pillBg: '#ecfdf5',
          pillBorder: '#6ee7b7',
          staffData: st,
        };
      }
    }
    return null;
  }, [graphNodes, selectedNodeId, staffWorkloads, filteredStaff]);

  const underloadedStaffCandidates = useMemo(() => {
    return staffWorkloads
      .filter(s => s.loadStatus === 'UNDERLOAD' || s.loadPct < 100)
      .sort((a, b) => a.loadPct - b.loadPct)
      .slice(0, 5);
  }, [staffWorkloads]);

  // ============================================================================
  // 4. AXONOMETRIC 3D CANVAS ENGINE (BRAND TOP -> STORE MIDDLE -> STAFF BOTTOM)
  // ============================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef({ width: 920, height: 640, dpr: 1 });
  const hoveredNodeIdRef = useRef<string | null>(null);
  const liveNodesRef = useRef<
    Map<string, { x: number; y: number; z: number; th: number; capH: number }>
  >(new Map());

  const cameraRef = useRef({
    yaw: 0.0,
    pitch: 0.0,
    zoom: 1.0,
    targetYaw: 0.0,
    targetPitch: 0.0,
    targetZoom: 1.0,
  });

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const projectedScreenNodesRef = useRef<
    { id: string; sx: number; sy: number; sr: number; topY: number; depth: number }[]
  >([]);

  const sceneStateRef = useRef({
    graphNodes,
    graphLinks,
    selectedNodeId,
    connectedNodeIds,
    autoRotate,
    showParticles,
    layoutMode,
  });

  useEffect(() => {
    sceneStateRef.current = {
      graphNodes,
      graphLinks,
      selectedNodeId,
      connectedNodeIds,
      autoRotate,
      showParticles,
      layoutMode,
    };
  }, [
    graphNodes,
    graphLinks,
    selectedNodeId,
    connectedNodeIds,
    autoRotate,
    showParticles,
    layoutMode,
  ]);

  const flyToNode = useCallback((_nodeId: string | null, resetView = false) => {
    if (resetView) {
      cameraRef.current.targetYaw = 0.0;
      cameraRef.current.targetPitch = 0.0;
      cameraRef.current.targetZoom = 1.0;
    }
  }, []);

  const handleSelectAndFly = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
      flyToNode(nodeId);
    },
    [flyToNode]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      canvasSizeRef.current = { width: w, height: h, dpr };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const drawIsometricPrism = (
      baseX: number,
      baseY: number,
      topX: number,
      topY: number,
      halfW: number,
      depthH: number,
      colorTop: string,
      colorLeft: string,
      colorRight: string,
      strokeColor: string,
      isHighlighted: boolean
    ) => {
      ctx.beginPath();
      ctx.moveTo(topX - halfW, topY);
      ctx.lineTo(topX, topY + depthH);
      ctx.lineTo(baseX, baseY + depthH);
      ctx.lineTo(baseX - halfW, baseY);
      ctx.closePath();
      ctx.fillStyle = colorLeft;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(topX, topY + depthH);
      ctx.lineTo(topX + halfW, topY);
      ctx.lineTo(baseX + halfW, baseY);
      ctx.lineTo(baseX, baseY + depthH);
      ctx.closePath();
      ctx.fillStyle = colorRight;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(topX, topY - depthH);
      ctx.lineTo(topX + halfW, topY);
      ctx.lineTo(topX, topY + depthH);
      ctx.lineTo(topX - halfW, topY);
      ctx.closePath();
      ctx.fillStyle = colorTop;
      ctx.fill();

      ctx.strokeStyle = isHighlighted ? '#1d4ed8' : strokeColor;
      ctx.lineWidth = isHighlighted ? 2.2 : 1.0;
      ctx.stroke();
    };

    const render = () => {
      time += 1;
      const { width, height, dpr } = canvasSizeRef.current;
      const {
        graphNodes: nodes,
        graphLinks: links,
        selectedNodeId: selId,
        connectedNodeIds: connSet,
        autoRotate: isAutoRot,
        showParticles: isParticles,
      } = sceneStateRef.current;
      const hovId = hoveredNodeIdRef.current;
      const activeId = hovId || selId;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Reference canvas height is 640px
      const yScale = height / 640;
      const padX = Math.max(52, Math.round(width * 0.075));
      const halfUsableW = Math.max(120, (width - padX * 2) * 0.5);
      const cx = width * 0.5;
      const cy = height * 0.5;

      const band3Bottom = Math.round(100 * yScale);
      const band2Bottom = Math.round(200 * yScale);

      // 1. Clean Studio Background & Synchronized 3 Horizontal Zone Bands
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Zone 3 (Top: BRAND Band 0..100 - Warm Amber)
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(0, 0, width, band3Bottom);
      // Zone 2 (Middle: STORE Band 100..200 - Sky Blue)
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, band3Bottom, width, band2Bottom - band3Bottom);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      [band3Bottom, band2Bottom].forEach(yLine => {
        ctx.beginPath();
        ctx.moveTo(0, yLine);
        ctx.lineTo(width, yLine);
        ctx.stroke();
      });

      ctx.font = '700 10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#b45309';
      ctx.fillText('TẦNG 3 · THƯƠNG HIỆU (BRAND)', 14, Math.round(17 * yScale));
      ctx.fillStyle = '#0369a1';
      ctx.fillText(
        'TẦNG 2 · GIAN HÀNG B2C (TIKTOK / SHOPEE)',
        14,
        band3Bottom + Math.round(17 * yScale)
      );
      ctx.fillStyle = '#1e293b';
      ctx.fillText(
        'TẦNG 1 · SÀN 28 NHÂN SỰ (4 BẬC × 7 CỘT ĐỐI XỨNG · CLICK ĐỂ XEM NHÁNH)',
        14,
        band2Bottom + Math.round(18 * yScale)
      );

      // 2. Smooth Axonometric 3D Camera
      const cam = cameraRef.current;
      if (isAutoRot && !dragRef.current.isDragging && !hovId) {
        cam.targetYaw = Math.sin(time * 0.01) * 0.16;
      }
      cam.yaw += (cam.targetYaw - cam.yaw) * 0.14;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.14;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.14;

      const sinY = Math.sin(cam.yaw);
      const cosY = Math.cos(cam.yaw);
      const sinP = Math.sin(cam.pitch);

      // Axonometric projection:
      // wx is normalized [-1..+1], wy is reference Y [0..640], wz is 3D terrace depth
      const project3D = (wxNorm: number, wyRef: number, wzDepth: number) => {
        const baseScreenX = wxNorm * halfUsableW * cosY - wzDepth * sinY * 1.1;
        const baseScreenY = (wyRef - 320) * yScale - wzDepth * sinP * 0.85;
        return {
          sx: cx + baseScreenX * cam.zoom,
          sy: cy + baseScreenY * cam.zoom,
          scale: cam.zoom,
          depth: 1000 - wzDepth,
        };
      };

      // 3. Draw 3D Terrace Platforms for the 4 Staff Rows
      [268, 356, 444, 532].forEach((tyLevel, tIdx) => {
        const tzLevel = [15, 45, 75, 105][tIdx];
        const pLeft = project3D(-1.04, tyLevel + 2, tzLevel);
        const pRight = project3D(1.04, tyLevel + 2, tzLevel);
        ctx.beginPath();
        ctx.moveTo(pLeft.sx, pLeft.sy);
        ctx.lineTo(pRight.sx, pRight.sy);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // 4. Interpolate & Project Nodes
      const projectedMap = new Map<
        string,
        {
          node: Node3D;
          sx: number;
          sy: number;
          topSx: number;
          topSy: number;
          capSx: number;
          capSy: number;
          scale: number;
          depth: number;
        }
      >();

      nodes.forEach(n => {
        let live = liveNodesRef.current.get(n.id);
        if (!live) {
          live = {
            x: n.tx,
            y: n.ty,
            z: n.tz,
            th: n.towerHeight,
            capH: n.targetCapHeight,
          };
          liveNodesRef.current.set(n.id, live);
        } else {
          live.x += (n.tx - live.x) * 0.18;
          live.y += (n.ty - live.y) * 0.18;
          live.z += (n.tz - live.z) * 0.18;
          live.th += (n.towerHeight - live.th) * 0.18;
          live.capH += (n.targetCapHeight - live.capH) * 0.18;
        }

        const baseProj = project3D(live.x, live.y, live.z);
        const topProj = project3D(live.x, live.y - live.th, live.z);
        const capProj =
          n.kind === 'STAFF'
            ? project3D(live.x, live.y - live.capH, live.z)
            : baseProj;

        projectedMap.set(n.id, {
          node: n,
          sx: baseProj.sx,
          sy: baseProj.sy,
          topSx: topProj.sx,
          topSy: topProj.sy,
          capSx: capProj.sx,
          capSy: capProj.sy,
          scale: topProj.scale,
          depth: topProj.depth,
        });
      });

      // 5. Draw 3D Connection Beams (Brand Top -> Store Middle -> Staff Bottom)
      links.forEach(link => {
        const src = projectedMap.get(link.sourceId);
        const tgt = projectedMap.get(link.targetId);
        if (!src || !tgt) return;

        const isHighlighted =
          !activeId ||
          link.sourceId === activeId ||
          link.targetId === activeId ||
          (connSet.has(link.sourceId) && connSet.has(link.targetId));

        if (activeId && !isHighlighted) return;

        // Clean attachment points:
        // - BRAND_TO_STORE: from bottom of Brand pill (src.sy + 24) down to top of Store cube (tgt.topSy)
        // - STAFF_TO_STORE / STAFF_TO_BRAND: from top of Staff column (src.topSy) up to bottom of Store/Brand pill (tgt.sy + 24)
        const x1 = link.linkType === 'BRAND_TO_STORE' ? src.sx : src.topSx;
        const y1 = link.linkType === 'BRAND_TO_STORE' ? src.sy + 24 : src.topSy;
        const x2 = tgt.sx;
        const y2 = link.linkType === 'BRAND_TO_STORE' ? tgt.topSy : tgt.sy + 24;
        const midX = (x1 + x2) * 0.5;
        const midY = (y1 + y2) * 0.5;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = link.color;
        ctx.lineWidth = activeId ? 2.2 : 1.0;
        ctx.globalAlpha = activeId ? 0.88 : 0.16;
        ctx.stroke();

        if (isParticles) {
          const t = ((time * link.particleSpeed) % 1 + 1) % 1;
          const invT = 1 - t;
          const px = invT * invT * x1 + 2 * invT * t * midX + t * t * x2;
          const py = invT * invT * y1 + 2 * invT * t * midY + t * t * y2;

          ctx.beginPath();
          ctx.arc(px, py, activeId ? 3.0 : 1.8, 0, Math.PI * 2);
          ctx.fillStyle = link.color;
          ctx.globalAlpha = activeId ? 0.95 : 0.42;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      // 6. Sort Nodes Back-to-Front and Draw Crisp 3D Columns + Non-Overlapping Cards
      const sortedBackToFront = Array.from(projectedMap.values()).sort(
        (a, b) => b.depth - a.depth
      );

      const nextHitRegions: {
        id: string;
        sx: number;
        sy: number;
        sr: number;
        topY: number;
        depth: number;
      }[] = [];

      // Because there are at most 7 Staff per row and 8 Brands/Stores per row:
      // Staff column spacing = (halfUsableW * 2) / 6
      // Store/Brand column spacing = (halfUsableW * 2) / 7
      const staffSpacingPx = (halfUsableW * 2) / 6;
      const tierSpacingPx = (halfUsableW * 2) / 7;
      const maxStaffPillW = Math.min(92, Math.max(66, Math.floor(staffSpacingPx - 8)));
      const maxTierPillW = Math.min(86, Math.max(58, Math.floor(tierSpacingPx - 8)));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sortedBackToFront.forEach(item => {
        const { node, sx, sy, topSx, topSy, capSx, capSy, scale, depth } = item;
        const isSelected = selId === node.id;
        const isHovered = hovId === node.id;
        const isConnected = !activeId || connSet.has(node.id) || node.id === activeId;

        ctx.globalAlpha = isConnected ? 1.0 : node.kind === 'STAFF' ? 0.8 : 0.38;

        if (node.kind === 'STAFF') {
          const halfW = Math.max(11, 14.5 * scale);
          const depthH = halfW * 0.42;

          if (isSelected || isHovered) {
            ctx.beginPath();
            ctx.ellipse(sx, sy + 2, halfW * 1.85, depthH * 1.85, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          drawIsometricPrism(
            sx,
            sy,
            topSx,
            topSy,
            halfW,
            depthH,
            node.colorTop,
            node.colorLeft,
            node.colorRight,
            node.strokeColor,
            isSelected || isHovered
          );

          // 100% Level Benchmark Line on the column
          ctx.beginPath();
          ctx.moveTo(capSx - halfW * 1.06, capSy);
          ctx.lineTo(capSx, capSy + depthH * 1.06);
          ctx.lineTo(capSx + halfW * 1.06, capSy);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Crisp White Pill Card below the column base
          const cardText = node.shortLabel;
          const pctText = node.metricBadge;
          const cardW = Math.min(maxStaffPillW, Math.max(68, cardText.length * 5.8 + 14));
          const cardH = 25;
          const cardX = sx - cardW / 2;
          const cardY = sy + depthH + 3;

          ctx.fillStyle = isSelected || isHovered ? '#eff6ff' : '#ffffff';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 5);
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#2563eb' : node.pillBorder;
          ctx.lineWidth = isSelected || isHovered ? 2 : 1.2;
          ctx.stroke();

          ctx.font = '700 10px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(cardText, sx, cardY + 8.5, cardW - 6);

          ctx.font = '700 9.5px Inter, system-ui, sans-serif';
          ctx.fillStyle = node.textColor;
          ctx.fillText(`${node.subLabel} · ${pctText}`, sx, cardY + 18.5, cardW - 6);

          nextHitRegions.push({
            id: node.id,
            sx,
            sy: (topSy + cardY + cardH) * 0.5,
            sr: Math.max(24, cardW * 0.5),
            topY: topSy,
            depth,
          });
        } else if (node.kind === 'BRAND') {
          const halfW = Math.max(10, 12.5 * scale);
          const depthH = halfW * 0.44;
          drawIsometricPrism(
            sx,
            sy,
            topSx,
            topSy,
            halfW,
            depthH,
            node.colorTop,
            node.colorLeft,
            node.colorRight,
            node.strokeColor,
            isSelected || isHovered
          );

          const bw = Math.min(maxTierPillW, Math.max(56, node.shortLabel.length * 5.6 + 10));
          const bh = 18;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(sx - bw / 2, sy + depthH + 3, bw, bh, 4);
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#2563eb' : node.pillBorder;
          ctx.lineWidth = isSelected || isHovered ? 1.8 : 1.1;
          ctx.stroke();

          ctx.font = '700 9.5px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#92400e';
          ctx.fillText(node.shortLabel, sx, sy + depthH + 3 + bh / 2, bw - 6);

          nextHitRegions.push({
            id: node.id,
            sx,
            sy: sy + 6,
            sr: Math.max(20, bw * 0.5),
            topY: topSy,
            depth,
          });
        } else {
          // STORE Node: Cube on top, Pill neatly below cube inside TẦNG 3 band
          const halfW = Math.max(9, 11.5 * scale);
          const depthH = halfW * 0.44;
          drawIsometricPrism(
            sx,
            sy,
            topSx,
            topSy,
            halfW,
            depthH,
            node.colorTop,
            node.colorLeft,
            node.colorRight,
            node.strokeColor,
            isSelected || isHovered
          );

          const sw = Math.min(maxTierPillW, Math.max(58, node.shortLabel.length * 5.4 + 10));
          const sh = 18;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(sx - sw / 2, sy + depthH + 3, sw, sh, 4);
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#2563eb' : node.pillBorder;
          ctx.lineWidth = isSelected || isHovered ? 1.8 : 1.1;
          ctx.stroke();

          ctx.font = '700 9.5px Inter, system-ui, sans-serif';
          ctx.fillStyle = node.textColor;
          ctx.fillText(node.shortLabel, sx, sy + depthH + 3 + sh / 2, sw - 6);

          nextHitRegions.push({
            id: node.id,
            sx,
            sy: sy + 6,
            sr: Math.max(18, sw * 0.5),
            topY: topSy,
            depth,
          });
        }

        ctx.globalAlpha = 1.0;
      });

      projectedScreenNodesRef.current = nextHitRegions;
      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const findHitNodeAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const regions = projectedScreenNodesRef.current;
    for (let i = regions.length - 1; i >= 0; i--) {
      const reg = regions[i];
      const dx = mx - reg.sx;
      const dyTop = my - reg.topY;
      const dyMid = my - reg.sy;
      if (
        Math.hypot(dx, dyTop) <= reg.sr ||
        (Math.abs(dx) <= reg.sr && Math.abs(dyMid) <= reg.sr * 1.25)
      ) {
        return reg.id;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }
      cameraRef.current.targetYaw = Math.max(
        -0.28,
        Math.min(0.28, cameraRef.current.targetYaw + dx * 0.004)
      );
      cameraRef.current.targetPitch = Math.max(
        -0.16,
        Math.min(0.16, cameraRef.current.targetPitch + dy * 0.003)
      );
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    } else {
      const hitId = findHitNodeAt(e.clientX, e.clientY);
      hoveredNodeIdRef.current = hitId;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hitId ? 'pointer' : 'grab';
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasMoved = dragRef.current.moved;
    dragRef.current.isDragging = false;
    if (!wasMoved) {
      const hitId = findHitNodeAt(e.clientX, e.clientY);
      if (hitId) {
        handleSelectAndFly(hitId);
      } else {
        setSelectedNodeId(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    cameraRef.current.targetZoom = Math.max(
      0.8,
      Math.min(1.35, cameraRef.current.targetZoom * factor)
    );
  };

  const handleReassignBrandRole = (
    brandId: string,
    roleField: 'contentBrandMainPic' | 'planStrategyPic' | 'keyVisualSisPic' | 'bookingPicLead',
    newStaffName: string
  ) => {
    const foundBrand = brands.find(b => b.id === brandId);
    if (!foundBrand) return;
    onUpdateBrand({
      ...foundBrand,
      [roleField]: newStaffName,
    });
    onNotify?.(
      `Đã điều chuyển vị trí trên thương hiệu ${foundBrand.name} sang ${newStaffName}`,
      'success'
    );
  };

  const handleReassignStorePic = (storeId: string, newStaffName: string) => {
    const foundStore = storePortfolios.find(s => s.id === storeId);
    if (!foundStore) return;
    onUpdateStore({
      ...foundStore,
      b2cOwnerName: newStaffName,
      assignedStaff: newStaffName,
      b2cOwners: [newStaffName],
    });
    onNotify?.(`Đã điều chuyển gian hàng ${foundStore.storeName} sang ${newStaffName}`, 'success');
  };

  const handleChangeStoreCoef = (storeId: string, newCoef: number) => {
    const foundStore = storePortfolios.find(s => s.id === storeId);
    if (!foundStore) return;
    onUpdateStore({
      ...foundStore,
      difficultyMultiplier: newCoef,
      difficultyTier: getStoreTierByCoefficient(newCoef),
    });
    onNotify?.(
      `Đã cập nhật Hệ số gian hàng ${foundStore.storeName} thành ×${newCoef.toFixed(2)}`,
      'success'
    );
  };

  const handleCreateQuickTask = (targetStaffName: string) => {
    if (!quickTaskTitle.trim()) {
      onNotify?.('Vui lòng nhập tên đầu việc cần giao', 'warning');
      return;
    }
    const newTask: SlaTask = {
      id: `task-3d-${Date.now()}`,
      title: quickTaskTitle.trim(),
      type: 'GENERAL_TASK',
      team: 'Marketing B2C',
      pic: targetStaffName,
      targetRole: 'MEMBER',
      deadline: '24h',
      remainingText: 'Còn 24 giờ',
      urgency: quickTaskDifficulty === 'HARD' ? 'critical' : 'warning',
      brand: quickTaskBrand || 'ClubClio',
      taskSource: 'DIRECTOR_ASSIGNED',
      standardPoint: quickTaskPoints,
      calculatedWorkloadPoints: quickTaskPoints,
      taskDifficultyTier: quickTaskDifficulty,
      actionLabel: 'Thực hiện',
    };
    onAddTask(newTask);
    setQuickTaskTitle('');
    setIsQuickTaskOpen(false);
    onNotify?.(
      `Đã giao việc "${newTask.title}" (+${quickTaskPoints} pt) cho ${targetStaffName}`,
      'success'
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Top KPI & Workload Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => setLoadFilter('ALL')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            loadFilter === 'ALL'
              ? 'bg-accent-soft/60 border-accent'
              : 'bg-surface border-line hover:bg-sunken/50'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-ink-3 font-medium">
            <span>Nhân sự B2C</span>
            <Users className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-ink tabular-nums">{staffWorkloads.length}</span>
            <span className="text-2xs text-ink-3">TB tải {summaryStats.avgLoadPct}%</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLoadFilter(loadFilter === 'OVERLOAD' ? 'ALL' : 'OVERLOAD')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            loadFilter === 'OVERLOAD'
              ? 'bg-critical-soft border-critical'
              : 'bg-surface border-line hover:bg-critical-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-critical font-semibold">
            <span>Quá tải (≥115%)</span>
            <Flame className="w-3.5 h-3.5 text-critical" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-critical tabular-nums">
              {summaryStats.overloadCount}
            </span>
            <span className="text-2xs text-ink-3">cần san tải</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLoadFilter(loadFilter === 'OPTIMAL' ? 'ALL' : 'OPTIMAL')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            loadFilter === 'OPTIMAL'
              ? 'bg-positive-soft border-positive'
              : 'bg-surface border-line hover:bg-positive-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-positive font-semibold">
            <span>Đủ tải chuẩn (96–114%)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-positive tabular-nums">
              {summaryStats.optimalCount}
            </span>
            <span className="text-2xs text-ink-3">cân bằng</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLoadFilter(loadFilter === 'UNDERLOAD' ? 'ALL' : 'UNDERLOAD')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            loadFilter === 'UNDERLOAD'
              ? 'bg-accent-soft border-accent'
              : 'bg-surface border-line hover:bg-accent-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-accent font-semibold">
            <span>Dư công suất (&lt;96%)</span>
            <Target className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-accent tabular-nums">
              {summaryStats.underloadCount}
            </span>
            <span className="text-2xs text-ink-3">sẵn sàng nhận việc</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLoadFilter(loadFilter === 'HARD_RATIO_LOW' ? 'ALL' : 'HARD_RATIO_LOW')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            loadFilter === 'HARD_RATIO_LOW'
              ? 'bg-warning-soft border-warning'
              : 'bg-surface border-line hover:bg-warning-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-warning font-semibold">
            <span>Chưa đạt tỷ lệ Việc khó</span>
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-warning tabular-nums">
              {summaryStats.lowHardRatioCount}
            </span>
            <span className="text-2xs text-ink-3">theo chuẩn Bảng 4</span>
          </div>
        </button>

        <div className="p-3 rounded-xl bg-surface border border-line">
          <div className="flex items-center justify-between text-2xs text-ink-3 font-medium">
            <span>Phạm vi Liên kết 3D</span>
            <Activity className="w-3.5 h-3.5 text-ink-2" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-ink tabular-nums">
              {brands.length} Brand · {b2cStores.length} Gian
            </span>
          </div>
          <div className="text-2xs text-ink-3">
            Tổng tải: <strong className="text-ink">{summaryStats.totalPointsAll} pt</strong>
          </div>
        </div>
      </div>

      {/* 2. Control & Filter Toolbar (Single-row aligned) */}
      <div className="bg-surface border border-line rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-sunken p-0.5 border border-line">
            <button
              type="button"
              onClick={() => {
                setLayoutMode('THREE_TIER_3D');
                flyToNode(null, true);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5 ${
                layoutMode === 'THREE_TIER_3D'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Toàn cảnh 3 tầng</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutMode('FOCUS_ORBIT');
                if (!selectedNodeId && filteredStaff[0]) {
                  setSelectedNodeId(filteredStaff[0].id);
                }
                flyToNode(null, true);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5 ${
                layoutMode === 'FOCUS_ORBIT'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tách nhánh đang chọn</span>
            </button>
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as RoleFilterGroup)}
            className="h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink font-medium"
          >
            <option value="ALL">Mọi nhóm vị trí ({staffWorkloads.length})</option>
            <option value="LEADER">Trưởng nhóm / Lead</option>
            <option value="BOOKING">Booking KOC & Livestream</option>
            <option value="CONTENT_BRAND">Content / Brand Main</option>
            <option value="PLAN_STRATEGY">Plan / Strategy</option>
            <option value="KEY_VISUAL">Key Visual / SIS</option>
            <option value="FOC_SAMPLE">Điều phối FOC & Mẫu</option>
          </select>

          {selectedNodeId && (
            <button
              type="button"
              onClick={() => {
                setSelectedNodeId(null);
                flyToNode(null, true);
              }}
              className="h-8 px-2.5 rounded-lg bg-accent-soft text-accent border border-accent/30 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hiện toàn bộ</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm nhân sự, Brand, gian..."
              className="h-8 pl-8 pr-7 rounded-lg bg-sunken border border-line text-xs text-ink placeholder:text-ink-3 w-48 focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onNavigateToTab && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToTab('task-delegation')}
            >
              <Sliders className="w-3.5 h-3.5 mr-1" />
              Bảng điểm Workload
            </Button>
          )}
        </div>
      </div>

      {/* 3. Main 3D Viewport + Side Inspector Panel (Equal Height 720px Aligned) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8 bg-surface border border-line rounded-2xl overflow-hidden flex flex-col h-[720px]">
          <div className="px-3 py-2 bg-sunken/60 border-b border-line flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5 text-2xs text-ink-2 font-medium">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                <span>Quá tải (≥115%)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>Đủ tải (96–114%)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                <span>Dư tải (&lt;96%)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                <span>Brand</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
                <span>Gian hàng</span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setAutoRotate(prev => !prev)}
                className={`h-7 px-2 rounded-md border text-2xs font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                  autoRotate
                    ? 'bg-accent-soft text-accent border-accent/40'
                    : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoRotate ? 'Đang xoay' : 'Tự xoay'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowParticles(prev => !prev)}
                className={`h-7 px-2 rounded-md border text-2xs font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                  showParticles
                    ? 'bg-warning-soft text-warning border-warning/40'
                    : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Luồng hạt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  cameraRef.current.targetZoom = Math.min(1.35, cameraRef.current.targetZoom * 1.12);
                }}
                title="Phóng to"
                className="w-7 h-7 rounded-md bg-surface border border-line text-ink-2 hover:bg-sunken flex items-center justify-center cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  cameraRef.current.targetZoom = Math.max(0.8, cameraRef.current.targetZoom * 0.88);
                }}
                title="Thu nhỏ"
                className="w-7 h-7 rounded-md bg-surface border border-line text-ink-2 hover:bg-sunken flex items-center justify-center cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null);
                  flyToNode(null, true);
                }}
                title="Đặt lại góc nhìn chuẩn"
                className="h-7 px-2 rounded-md bg-surface border border-line text-ink-2 hover:bg-sunken text-2xs font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Góc chuẩn</span>
              </button>
            </div>
          </div>

          {/* 4x7 Symmetrical Non-Overlapping 3D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="w-full flex-1 min-h-0 block select-none"
          />

          <div className="bg-sunken/50 border-t border-line px-3 py-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {filteredStaff.map(st => {
                const isActive = selectedNodeId === st.id;
                const toneClass =
                  st.loadStatus === 'OVERLOAD'
                    ? 'bg-critical-soft text-critical border-critical/30'
                    : st.loadStatus === 'UNDERLOAD'
                      ? 'bg-accent-soft text-accent border-accent/30'
                      : 'bg-positive-soft text-positive border-positive/30';
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectAndFly(st.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-accent bg-surface text-ink border-accent font-bold'
                        : `${toneClass} hover:opacity-90`
                    }`}
                  >
                    <span>{st.shortName}</span>
                    <span className="text-2xs font-bold tabular-nums">({st.loadPct}%)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detailed Workload & Assignment Inspector Panel (4 cols, matched 720px height) */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-2xl overflow-hidden flex flex-col h-[720px]">
          {!selectedNode ? (
            <div className="p-6 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Chọn 1 Nhân sự, Brand hoặc Gian hàng
                </h3>
              </div>
            </div>
          ) : selectedNode.kind === 'STAFF' && selectedNode.staffData ? (
            (() => {
              const st = selectedNode.staffData;
              return (
                <div className="divide-y divide-line flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-accent-soft text-accent text-2xs font-bold">
                            {st.level}
                          </span>
                          <span className="text-2xs text-ink-3 font-mono">{st.staffCode}</span>
                          <Status
                            tone={
                              st.loadStatus === 'OVERLOAD'
                                ? 'critical'
                                : st.loadStatus === 'UNDERLOAD'
                                  ? 'info'
                                  : 'positive'
                            }
                          >
                            {st.loadStatus === 'OVERLOAD'
                              ? `Quá tải (${st.loadPct}%)`
                              : st.loadStatus === 'UNDERLOAD'
                                ? `Dư công suất (${st.loadPct}%)`
                                : `Đủ tải chuẩn (${st.loadPct}%)`}
                          </Status>
                        </div>
                        <h3 className="text-base font-bold text-ink mt-1">{st.name}</h3>
                        <p className="text-xs text-ink-2">{st.roleGroup}</p>
                      </div>
                      {selectedNodeId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(null);
                            flyToNode(null, true);
                          }}
                          className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
                          title="Xem lại toàn cảnh"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-line space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">
                          Tổng điểm Workload: {st.totalPts.toFixed(1)} pt
                        </span>
                        <span className="text-2xs text-ink-3">
                          Định mức {st.level}: {st.targetCapacityPts} pt
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-sunken overflow-hidden flex">
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((st.workflowPts / Math.max(st.totalPts, st.targetCapacityPts)) * 100))}%`,
                          }}
                          className="bg-emerald-500 h-full"
                          title={`Điểm Quy trình: ${st.workflowPts.toFixed(1)} pt`}
                        />
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((st.directorPts / Math.max(st.totalPts, st.targetCapacityPts)) * 100))}%`,
                          }}
                          className="bg-amber-500 h-full"
                          title={`Điểm Quản lý giao: ${st.directorPts.toFixed(1)} pt`}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-2xs">
                        <div className="p-1.5 rounded bg-sunken/70">
                          <div className="text-ink-3">Quy trình</div>
                          <div className="font-bold text-ink tabular-nums">
                            {st.workflowPts.toFixed(1)} pt
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-sunken/70">
                          <div className="text-ink-3">Quản lý giao</div>
                          <div className="font-bold text-ink tabular-nums">
                            {st.directorPts.toFixed(1)} pt
                          </div>
                        </div>
                        <div
                          className={`p-1.5 rounded ${
                            st.isHardRatioPass ? 'bg-positive-soft/60' : 'bg-warning-soft/80'
                          }`}
                        >
                          <div className="text-ink-3">Tỷ lệ Việc khó</div>
                          <div
                            className={`font-bold tabular-nums ${
                              st.isHardRatioPass ? 'text-positive' : 'text-warning'
                            }`}
                          >
                            {st.hardRatioPct}% / {st.minHardRatioReqPct}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsQuickTaskOpen(prev => !prev)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Giao thêm việc
                      </Button>
                      {onPingStaff && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onPingStaff(
                              st.name,
                              `Quản lý nhắc rà soát tiến độ (${st.totalPts.toFixed(0)} pt · ${st.assignedStores.length} gian hàng)`
                            )
                          }
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Nhắc việc
                        </Button>
                      )}
                    </div>

                    {isQuickTaskOpen && (
                      <div className="p-3 rounded-xl bg-surface border border-accent/40 space-y-2.5">
                        <div className="text-xs font-semibold text-ink">
                          Giao việc trực tiếp cho {st.name}
                        </div>
                        <input
                          type="text"
                          value={quickTaskTitle}
                          onChange={e => setQuickTaskTitle(e.target.value)}
                          placeholder="Nhập tên đầu việc..."
                          className="w-full h-8 px-2.5 rounded-lg bg-sunken border border-line text-xs text-ink"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={quickTaskBrand}
                            onChange={e => setQuickTaskBrand(e.target.value)}
                            className="h-8 px-2 rounded-lg bg-sunken border border-line text-2xs text-ink"
                          >
                            <option value="">Chọn Brand</option>
                            {brands.slice(0, 20).map(b => (
                              <option key={b.id} value={b.name}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={quickTaskDifficulty}
                            onChange={e =>
                              setQuickTaskDifficulty(e.target.value as 'EASY' | 'STANDARD' | 'HARD')
                            }
                            className="h-8 px-2 rounded-lg bg-sunken border border-line text-2xs text-ink"
                          >
                            <option value="HARD">Việc Khó (×1.2)</option>
                            <option value="STANDARD">Tiêu chuẩn (×1.0)</option>
                            <option value="EASY">Việc Dễ (×0.8)</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={quickTaskPoints}
                            onChange={e => setQuickTaskPoints(Number(e.target.value) || 4)}
                            className="h-8 px-2 rounded-lg bg-sunken border border-line text-xs text-ink tabular-nums"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsQuickTaskOpen(false)}
                          >
                            Hủy
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCreateQuickTask(st.name)}
                          >
                            Xác nhận (+{quickTaskPoints} pt)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {st.loadStatus === 'OVERLOAD' && underloadedStaffCandidates.length > 0 && (
                    <div className="p-3.5 bg-critical-soft/35 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-critical">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Gợi ý nhân sự còn dư công suất để nhận san tải:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {underloadedStaffCandidates.map(cand => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleSelectAndFly(cand.id)}
                            className="px-2 py-1 rounded-md bg-surface border border-line text-2xs font-medium text-ink hover:border-accent flex items-center gap-1 cursor-pointer"
                          >
                            <span>{cand.shortName}</span>
                            <span className="text-accent font-bold">({cand.loadPct}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-warning" />
                      <span>Thương hiệu phụ trách ({st.assignedBrands.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {st.assignedBrands.map(ab => (
                        <div
                          key={ab.brandId}
                          className="p-2.5 rounded-xl bg-sunken/50 border border-line flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <BrandAvatar brandId={ab.brandId} brandName={ab.brandName} size={24} />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handleSelectAndFly(`brand-${ab.brandId}`)}
                                className="text-xs font-semibold text-ink hover:text-accent truncate block cursor-pointer"
                              >
                                {ab.brandName}
                              </button>
                              <div className="text-2xs text-ink-3 truncate">
                                {ab.roles.join(' · ')}
                              </div>
                            </div>
                          </div>
                          <select
                            value={st.name}
                            onChange={e =>
                              handleReassignBrandRole(
                                ab.brandId,
                                'contentBrandMainPic',
                                e.target.value
                              )
                            }
                            className="h-7 px-2 rounded bg-surface border border-line text-2xs text-ink shrink-0"
                            title="Điều chuyển nhanh Brand sang nhân sự khác"
                          >
                            {B2C_28_STAFF_WORKLOAD_ROSTER.map(m => (
                              <option key={m.staffCode} value={m.name}>
                                {m.name} ({m.level})
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-accent" />
                      <span>Gian hàng B2C phụ trách ({st.assignedStores.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {st.assignedStores.map(as => (
                        <div
                          key={as.storeId}
                          className="p-2.5 rounded-xl bg-sunken/50 border border-line space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectAndFly(`store-${as.storeId}`)}
                              className="text-xs font-semibold text-ink hover:text-accent truncate cursor-pointer"
                            >
                              {as.storeName}
                            </button>
                            <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-2xs font-semibold text-ink-2 shrink-0">
                              HS ×{as.coef.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-2xs text-ink-3">
                            <span>
                              {as.platform} · {as.roleLabel}
                            </span>
                            <select
                              value={st.name}
                              onChange={e => handleReassignStorePic(as.storeId, e.target.value)}
                              className="h-6 px-1.5 rounded bg-surface border border-line text-2xs text-ink"
                            >
                              {B2C_28_STAFF_WORKLOAD_ROSTER.map(m => (
                                <option key={m.staffCode} value={m.name}>
                                  Đổi PIC: {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : selectedNode.kind === 'BRAND' && selectedNode.brandData ? (
            (() => {
              const b = selectedNode.brandData;
              const contentMain = b.contentBrandMainPic || b.contentPic || 'Bùi Ngọc Ánh';
              const planStrat = b.planStrategyPic || b.brandPicName || 'Nguyễn Thị Ngọc Tâm';
              const kvSis = b.keyVisualSisPic || 'Hoàng Diệu Thùy';
              const bookingLead = b.bookingPicLead || 'Đặng Thị Yến Nhi';
              const brandStores = b2cStores.filter(
                s => s.brandId === b.id || s.brandName.toLowerCase() === b.name.toLowerCase()
              );

              return (
                <div className="divide-y divide-line flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <BrandAvatar brandId={b.id} brandName={b.name} size={36} />
                        <div>
                          <span className="px-2 py-0.5 rounded bg-warning-soft text-warning text-2xs font-bold">
                            Thương hiệu (Brand)
                          </span>
                          <h3 className="text-base font-bold text-ink mt-0.5">{b.name}</h3>
                        </div>
                      </div>
                      {onNavigateToBrandProfile && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigateToBrandProfile(b.name)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Hồ sơ Brand
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Đội ngũ phụ trách cấp Brand
                    </h4>
                    {(
                      [
                        {
                          label: 'Content / Brand Main',
                          field: 'contentBrandMainPic' as const,
                          val: contentMain,
                        },
                        {
                          label: 'Plan / Strategy',
                          field: 'planStrategyPic' as const,
                          val: planStrat,
                        },
                        {
                          label: 'Key Visual / SIS',
                          field: 'keyVisualSisPic' as const,
                          val: kvSis,
                        },
                        {
                          label: 'Booking Lead',
                          field: 'bookingPicLead' as const,
                          val: bookingLead,
                        },
                      ]
                    ).map(pos => (
                      <div
                        key={pos.field}
                        className="p-2.5 rounded-xl bg-sunken/50 border border-line flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-2xs text-ink-3">{pos.label}</div>
                          <div className="text-xs font-semibold text-ink truncate">{pos.val}</div>
                        </div>
                        <select
                          value={pos.val}
                          onChange={e => handleReassignBrandRole(b.id, pos.field, e.target.value)}
                          className="h-7 px-2 rounded bg-surface border border-line text-2xs text-ink shrink-0"
                        >
                          {B2C_28_STAFF_WORKLOAD_ROSTER.map(m => (
                            <option key={m.staffCode} value={m.name}>
                              {m.name} ({m.level})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Gian hàng thuộc Brand ({brandStores.length})
                    </h4>
                    {brandStores.map(bs => (
                      <div
                        key={bs.id}
                        className="p-2.5 rounded-xl bg-sunken/50 border border-line flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAndFly(`store-${bs.id}`)}
                            className="text-xs font-semibold text-ink hover:text-accent truncate block cursor-pointer"
                          >
                            {bs.storeName}
                          </button>
                          <div className="text-2xs text-ink-3">
                            {bs.platform} · PIC: {bs.b2cOwnerName || bs.assignedStaff}
                          </div>
                        </div>
                        <span className="text-2xs font-bold text-ink-2">
                          {formatVndShort(bs.budgetNet || bs.monthlyBudget || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : selectedNode.kind === 'STORE' && selectedNode.storeData ? (
            (() => {
              const s = selectedNode.storeData;
              const coefInfo = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
              const currentPic = s.b2cOwnerName || s.assignedStaff || 'Chưa gán';

              return (
                <div className="divide-y divide-line flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <PlatformBadge platform={s.platform} />
                        <h3 className="text-base font-bold text-ink mt-1">{s.storeName}</h3>
                        <p className="text-xs text-ink-3">Thương hiệu: {s.brandName}</p>
                      </div>
                      {onNavigateToStoreProfile && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigateToStoreProfile(s.storeName)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Hồ sơ Gian
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink block">
                        Chuyên viên phụ trách (PIC Gian hàng)
                      </label>
                      <select
                        value={currentPic}
                        onChange={e => handleReassignStorePic(s.id, e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink font-medium"
                      >
                        {B2C_28_STAFF_WORKLOAD_ROSTER.map(m => (
                          <option key={m.staffCode} value={m.name}>
                            {m.name} ({m.level} · {m.roleGroup})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink block">
                        Hệ số quy mô Gian hàng (Bảng 2): ×{coefInfo.multiplier.toFixed(2)}
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {STORE_SCOPE_TABLE_2.map(tier => {
                          const active = Math.abs(coefInfo.multiplier - tier.coef) < 0.03;
                          return (
                            <button
                              key={tier.code}
                              type="button"
                              onClick={() => handleChangeStoreCoef(s.id, tier.coef)}
                              className={`py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                active
                                  ? 'bg-accent text-white border-accent'
                                  : 'bg-sunken text-ink-2 border-line hover:text-ink'
                              }`}
                            >
                              ×{tier.coef.toFixed(2)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>
      </div>

      {/* 4. BẢNG NHÌN NHANH TOÀN BỘ 28 NHÂN SỰ KÈM BRAND & GIAN HÀNG */}
      <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-ink">
              Bảng Nhìn Nhanh Khối Lượng & Brand / Gian Hàng Của Từng Nhân Sự (3 Nhóm Tải Trọng)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-critical/30 bg-critical-soft/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-critical/20">
              <span className="text-xs font-bold text-critical flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Đang Quá Tải ≥115% ({groupedStaffByLoad.overload.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {groupedStaffByLoad.overload.map(st => (
                <div
                  key={st.id}
                  onClick={() => handleSelectAndFly(st.id)}
                  className={`p-2.5 rounded-xl bg-surface border transition cursor-pointer space-y-1.5 ${
                    selectedNodeId === st.id
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-line hover:border-critical/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-bold">
                        {st.level}
                      </span>
                      <span className="text-xs font-bold text-ink truncate">{st.name}</span>
                    </div>
                    <span className="text-xs font-bold text-critical tabular-nums shrink-0">
                      {st.totalPts.toFixed(0)}/{st.targetCapacityPts}pt ({st.loadPct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-sunken overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, st.loadPct)}%` }}
                      className="h-full bg-rose-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {st.assignedBrands.map(ab => (
                      <span
                        key={ab.brandId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning-soft text-warning text-3xs font-semibold"
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        {ab.brandName}
                      </span>
                    ))}
                    {st.assignedStores.slice(0, 4).map(as => (
                      <span
                        key={as.storeId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-medium"
                      >
                        <Store className="w-2.5 h-2.5 text-accent" />
                        {as.storeName.replace(/_TikTok.*|_Shopee.*/gi, '')} (×{as.coef.toFixed(2)})
                      </span>
                    ))}
                    {st.assignedStores.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-3 text-3xs">
                        +{st.assignedStores.length - 4} gian
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-positive/30 bg-positive-soft/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-positive/20">
              <span className="text-xs font-bold text-positive flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đủ Tải Chuẩn 96–114% ({groupedStaffByLoad.optimal.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {groupedStaffByLoad.optimal.map(st => (
                <div
                  key={st.id}
                  onClick={() => handleSelectAndFly(st.id)}
                  className={`p-2.5 rounded-xl bg-surface border transition cursor-pointer space-y-1.5 ${
                    selectedNodeId === st.id
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-line hover:border-positive/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-bold">
                        {st.level}
                      </span>
                      <span className="text-xs font-bold text-ink truncate">{st.name}</span>
                    </div>
                    <span className="text-xs font-bold text-positive tabular-nums shrink-0">
                      {st.totalPts.toFixed(0)}/{st.targetCapacityPts}pt ({st.loadPct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-sunken overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, st.loadPct)}%` }}
                      className="h-full bg-emerald-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {st.assignedBrands.map(ab => (
                      <span
                        key={ab.brandId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning-soft text-warning text-3xs font-semibold"
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        {ab.brandName}
                      </span>
                    ))}
                    {st.assignedStores.slice(0, 4).map(as => (
                      <span
                        key={as.storeId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-medium"
                      >
                        <Store className="w-2.5 h-2.5 text-accent" />
                        {as.storeName.replace(/_TikTok.*|_Shopee.*/gi, '')} (×{as.coef.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent-soft/25 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-accent/20">
              <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Dư Công Suất &lt;96% ({groupedStaffByLoad.underload.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {groupedStaffByLoad.underload.map(st => (
                <div
                  key={st.id}
                  onClick={() => handleSelectAndFly(st.id)}
                  className={`p-2.5 rounded-xl bg-surface border transition cursor-pointer space-y-1.5 ${
                    selectedNodeId === st.id
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-line hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-bold">
                        {st.level}
                      </span>
                      <span className="text-xs font-bold text-ink truncate">{st.name}</span>
                    </div>
                    <span className="text-xs font-bold text-accent tabular-nums shrink-0">
                      {st.totalPts.toFixed(0)}/{st.targetCapacityPts}pt ({st.loadPct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-sunken overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, st.loadPct)}%` }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {st.assignedBrands.map(ab => (
                      <span
                        key={ab.brandId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning-soft text-warning text-3xs font-semibold"
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        {ab.brandName}
                      </span>
                    ))}
                    {st.assignedStores.slice(0, 4).map(as => (
                      <span
                        key={as.storeId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-3xs font-medium"
                      >
                        <Store className="w-2.5 h-2.5 text-accent" />
                        {as.storeName.replace(/_TikTok.*|_Shopee.*/gi, '')} (×{as.coef.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
