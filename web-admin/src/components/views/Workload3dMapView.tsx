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
  Eye,
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
import { Button, Status } from '../ui';
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

type SpatialLayoutMode = 'WORKLOAD_TOWERS' | 'FOCUS_ORBIT' | 'LAYERED_3D';
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
  roleTag?: string;
  tx: number;
  ty: number;
  tz: number;
  radius: number;
  towerHeight: number;
  targetCapHeight: number;
  colorTop: string;
  colorLeft: string;
  colorRight: string;
  strokeColor: string;
  badgeTextColor: string;
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
      return 140;
    case 'L2.5':
      return 128;
    case 'L2':
      return 112;
    case 'L1.5':
      return 98;
    case 'L1':
      return 86;
    case 'L0.5':
      return 72;
    default:
      return 100;
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
  // 1. Controls & Filter States
  const [layoutMode, setLayoutMode] = useState<SpatialLayoutMode>('WORKLOAD_TOWERS');
  const [roleFilter, setRoleFilter] = useState<RoleFilterGroup>('ALL');
  const [loadFilter, setLoadFilter] = useState<LoadFilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFocusedNetwork, setOnlyFocusedNetwork] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showParticles, setShowParticles] = useState<boolean>(true);

  // Selected entity in 3D space (defaults to top overloaded leader/staff)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('staff-HN206');

  // Quick Task creation state inside side panel
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskBrand, setQuickTaskBrand] = useState('');
  const [quickTaskPoints, setQuickTaskPoints] = useState<number>(6);
  const [quickTaskDifficulty, setQuickTaskDifficulty] = useState<'EASY' | 'STANDARD' | 'HARD'>('HARD');

  // B2C Stores (69 stores)
  const b2cStores = useMemo(() => {
    const filtered = storePortfolios.filter(s => Boolean(s.requiresB2cPlan || s.isB2cManaged));
    return filtered.length > 0 ? filtered : storePortfolios.slice(0, 69);
  }, [storePortfolios]);

  // 2. Compute comprehensive Staff Workload from Roster + Live Brand/Store assignments + Tasks
  const staffWorkloads = useMemo<StaffComputedWorkload[]>(() => {
    return B2C_28_STAFF_WORKLOAD_ROSTER.map(roster => {
      const assignedBrands: StaffComputedWorkload['assignedBrands'] = [];
      brands.forEach(b => {
        const roles: string[] = [];
        const contentMain = b.contentBrandMainPic || b.contentPic || '';
        const planStrat = b.planStrategyPic || b.brandPicName || '';
        const kvSis = b.keyVisualSisPic || '';
        const bookingLead = b.bookingPicLead || '';

        if (contentMain.toLowerCase() === roster.name.toLowerCase()) roles.push('Content / Brand Main');
        if (planStrat.toLowerCase() === roster.name.toLowerCase()) roles.push('Plan / Strategy');
        if (kvSis.toLowerCase() === roster.name.toLowerCase()) roles.push('Key Visual / SIS');
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
          if (matchOwner) roleLabels.push('PIC Gian hàng');
          if (matchLeader) roleLabels.push('Trưởng nhóm');
          if (matchContent) roleLabels.push('Content');
          if (matchLive) roleLabels.push('Livestream');

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

      if (assignedStores.length === 0 && roster.keyStoresSample) {
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

      const storeDeltaPts =
        (assignedStores.length - Math.min(assignedStores.length, roster.assignedStoresCount)) * 6.5;
      const brandDeltaPts = assignedBrands.length * 3.5;

      const workflowPts = Math.max(20, roster.baselineWorkflowTotalPts + storeDeltaPts);
      const directorPts = roster.baselineDirectorTotalPts + dynamicTaskPts + brandDeltaPts;
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
      if (loadPct >= 115 || totalPts >= 150) {
        loadStatus = 'OVERLOAD';
      } else if (loadPct < 85) {
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

  // Filtered staff list (sorted by loadPct descending so high-load pillars are easy to compare)
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

  // Summary KPIs
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

  // 3. Build Structured, Anti-Clutter 3D Graph
  const { graphNodes, graphLinks } = useMemo(() => {
    const nodes: Node3D[] = [];
    const links: Link3D[] = [];

    // Determine which Staff/Brand/Store are actively in focus
    const focusedStaff = selectedNodeId?.startsWith('staff-')
      ? filteredStaff.find(s => s.id === selectedNodeId) || filteredStaff[0]
      : null;

    const focusedBrandId = selectedNodeId?.startsWith('brand-')
      ? selectedNodeId.replace('brand-', '')
      : null;

    const focusedStoreId = selectedNodeId?.startsWith('store-')
      ? selectedNodeId.replace('store-', '')
      : null;

    const activeBrandIds = new Set<string>();
    const activeStoreIds = new Set<string>();
    const brandRoleMap = new Map<string, string>();
    const storeRoleMap = new Map<string, string>();

    if (onlyFocusedNetwork && (focusedStaff || focusedBrandId || focusedStoreId)) {
      if (focusedStaff) {
        focusedStaff.assignedBrands.forEach(ab => {
          activeBrandIds.add(ab.brandId);
          brandRoleMap.set(ab.brandId, ab.roles.join(' · '));
        });
        focusedStaff.assignedStores.forEach(as => {
          activeStoreIds.add(as.storeId);
          storeRoleMap.set(as.storeId, as.roleLabel);
        });
        // Also add brands of those assigned stores so the 3-tier hierarchy is complete
        focusedStaff.assignedStores.forEach(as => {
          const parentBrand = brands.find(
            b => b.name.toLowerCase() === as.brandName.toLowerCase()
          );
          if (parentBrand) activeBrandIds.add(parentBrand.id);
        });
      } else if (focusedBrandId) {
        activeBrandIds.add(focusedBrandId);
        const fBrand = brands.find(b => b.id === focusedBrandId);
        b2cStores.forEach(s => {
          if (
            s.brandId === focusedBrandId ||
            (fBrand && s.brandName.toLowerCase() === fBrand.name.toLowerCase())
          ) {
            activeStoreIds.add(s.id);
          }
        });
      } else if (focusedStoreId) {
        activeStoreIds.add(focusedStoreId);
        const fStore = b2cStores.find(s => s.id === focusedStoreId);
        if (fStore) {
          const parentBrand = brands.find(
            b =>
              b.id === fStore.brandId ||
              b.name.toLowerCase() === fStore.brandName.toLowerCase()
          );
          if (parentBrand) activeBrandIds.add(parentBrand.id);
        }
      }
    } else {
      // Show top connected brands & stores
      filteredStaff.slice(0, 12).forEach(st => {
        st.assignedBrands.forEach(b => activeBrandIds.add(b.brandId));
        st.assignedStores.slice(0, 3).forEach(s => activeStoreIds.add(s.storeId));
      });
    }

    const visibleBrands = brands.filter(b => activeBrandIds.has(b.id));
    const visibleStores = b2cStores.filter(s => activeStoreIds.has(s.id));

    // A. Position Staff Nodes
    const staffToRender =
      layoutMode === 'FOCUS_ORBIT' && focusedStaff
        ? [focusedStaff]
        : filteredStaff;

    const cols = layoutMode === 'LAYERED_3D' ? 7 : 7;
    const spacingX = 112;
    const spacingZ = 104;

    staffToRender.forEach((st, idx) => {
      let tx = 0;
      let ty = 0;
      let tz = 0;

      const towerHeight = Math.max(32, Math.min(165, st.totalPts * 0.82));
      const targetCapHeight = Math.max(28, Math.min(155, st.targetCapacityPts * 0.82));

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Structured 3D Isometric Podium Grid (7 columns x 4 rows) -> Zero overlap!
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const totalRows = Math.ceil(staffToRender.length / cols);
        tx = (col - (cols - 1) / 2) * spacingX;
        tz = (row - (totalRows - 1) / 2) * spacingZ + 30;
        ty = 115; // 3D Floor level
      } else if (layoutMode === 'FOCUS_ORBIT') {
        if (focusedStaff && st.id === focusedStaff.id) {
          tx = 0;
          ty = 95;
          tz = 0;
        } else {
          const angle = (idx / Math.max(1, staffToRender.length)) * Math.PI * 2;
          tx = Math.cos(angle) * 280;
          tz = Math.sin(angle) * 280;
          ty = 110;
        }
      } else {
        // LAYERED_3D: Top Plane (y = -135)
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const totalRows = Math.ceil(staffToRender.length / cols);
        tx = (col - (cols - 1) / 2) * 105;
        tz = (row - (totalRows - 1) / 2) * 88;
        ty = -125;
      }

      // 3-Face Isometric Lighting Colors
      let colorTop = '#34d399';
      let colorLeft = '#10b981';
      let colorRight = '#047857';
      let strokeColor = '#6ee7b7';
      let badgeTextColor = '#6ee7b7';

      if (st.loadStatus === 'OVERLOAD') {
        colorTop = '#fb7185';
        colorLeft = '#f43f5e';
        colorRight = '#be123c';
        strokeColor = '#fda4af';
        badgeTextColor = '#fda4af';
      } else if (st.loadStatus === 'UNDERLOAD') {
        colorTop = '#818cf8';
        colorLeft = '#6366f1';
        colorRight = '#4338ca';
        strokeColor = '#a5b4fc';
        badgeTextColor = '#a5b4fc';
      }

      nodes.push({
        id: st.id,
        kind: 'STAFF',
        label: `${st.name} (${st.level})`,
        shortLabel: st.shortName,
        subLabel: `${st.totalPts.toFixed(0)}pt · ${st.loadPct}%`,
        tx,
        ty,
        tz,
        radius: 14,
        towerHeight,
        targetCapHeight,
        colorTop,
        colorLeft,
        colorRight,
        strokeColor,
        badgeTextColor,
        staffData: st,
      });
    });

    // B. Position Brand Nodes
    const bCount = Math.max(1, visibleBrands.length);
    visibleBrands.forEach((b, idx) => {
      const nodeId = `brand-${b.id}`;
      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Clean elevated arc above the floor
        const spread = Math.min(560, bCount * 125);
        tx = bCount === 1 ? 0 : -spread / 2 + (idx / (bCount - 1)) * spread;
        tz = -110 - Math.sin((idx / Math.max(1, bCount - 1)) * Math.PI) * 55;
        ty = -95;
      } else if (layoutMode === 'FOCUS_ORBIT') {
        if (focusedBrandId === b.id) {
          tx = 0;
          ty = 20;
          tz = 0;
        } else {
          const angle = (idx / bCount) * Math.PI * 2 - Math.PI / 2;
          const r = 195;
          tx = Math.cos(angle) * r;
          tz = Math.sin(angle) * r;
          ty = -10;
        }
      } else {
        // LAYERED_3D: Middle Plane (y = 15)
        const spread = Math.min(620, bCount * 115);
        tx = bCount === 1 ? 0 : -spread / 2 + (idx / (bCount - 1)) * spread;
        tz = (idx % 2 === 0 ? -1 : 1) * 45;
        ty = 15;
      }

      nodes.push({
        id: nodeId,
        kind: 'BRAND',
        label: b.name,
        shortLabel: b.name,
        subLabel: formatVndShort(b.planBudget || b.monthlyBudget || 150000000),
        roleTag: brandRoleMap.get(b.id),
        tx,
        ty,
        tz,
        radius: 13,
        towerHeight: 0,
        targetCapHeight: 0,
        colorTop: '#fcd34d',
        colorLeft: '#f59e0b',
        colorRight: '#b45309',
        strokeColor: '#fde68a',
        badgeTextColor: '#fde68a',
        brandData: b,
      });
    });

    // C. Position Store Nodes
    const sCount = Math.max(1, visibleStores.length);
    visibleStores.forEach((s, idx) => {
      const nodeId = `store-${s.id}`;
      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Upper satellite arc
        const spread = Math.min(660, sCount * 115);
        tx = sCount === 1 ? 0 : -spread / 2 + (idx / (sCount - 1)) * spread;
        tz = -175 - Math.sin((idx / Math.max(1, sCount - 1)) * Math.PI) * 65;
        ty = -175;
      } else if (layoutMode === 'FOCUS_ORBIT') {
        if (focusedStoreId === s.id) {
          tx = 0;
          ty = 20;
          tz = 0;
        } else {
          const angle = (idx / sCount) * Math.PI * 2 - Math.PI / 4;
          const r = 340;
          tx = Math.cos(angle) * r;
          tz = Math.sin(angle) * r;
          ty = -75;
        }
      } else {
        // LAYERED_3D: Bottom Plane (y = 145)
        const spread = Math.min(680, sCount * 105);
        tx = sCount === 1 ? 0 : -spread / 2 + (idx / (sCount - 1)) * spread;
        tz = (idx % 2 === 0 ? -1 : 1) * 65;
        ty = 145;
      }

      const isTikTok = s.platform === 'TikTok Shop';
      const coef = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier;

      nodes.push({
        id: nodeId,
        kind: 'STORE',
        label: s.storeName,
        shortLabel: s.storeName,
        subLabel: `${isTikTok ? 'TikTok' : 'Shopee'} · ×${coef.toFixed(2)}`,
        roleTag: storeRoleMap.get(s.id),
        tx,
        ty,
        tz,
        radius: 10.5,
        towerHeight: 0,
        targetCapHeight: 0,
        colorTop: isTikTok ? '#67e8f9' : '#fdba74',
        colorLeft: isTikTok ? '#06b6d4' : '#f97316',
        colorRight: isTikTok ? '#0e7490' : '#c2410c',
        strokeColor: isTikTok ? '#a5f3fc' : '#fed7aa',
        badgeTextColor: isTikTok ? '#67e8f9' : '#fdba74',
        storeData: s,
      });
    });

    const nodeIdSet = new Set(nodes.map(n => n.id));

    // Create Links
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
            color: '#fbbf24',
            weight: 2.0,
            particleSpeed: 0.0055,
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
            color: '#38bdf8',
            weight: 1.8,
            particleSpeed: 0.005,
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
            color: 'rgba(251, 191, 36, 0.5)',
            weight: 1.4,
            particleSpeed: 0.004,
          });
        }
      }
    });

    return { graphNodes: nodes, graphLinks: links };
  }, [filteredStaff, brands, b2cStores, onlyFocusedNetwork, layoutMode, selectedNodeId]);

  // Connected neighbor set for the currently selected node
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

  // Selected entity for the Right Inspector Panel
  const selectedNode = useMemo(() => {
    const inGraph = graphNodes.find(n => n.id === selectedNodeId);
    if (inGraph) return inGraph;
    if (selectedNodeId?.startsWith('staff-')) {
      const st = staffWorkloads.find(s => s.id === selectedNodeId);
      if (st) {
        return {
          id: st.id,
          kind: 'STAFF' as const,
          label: st.name,
          shortLabel: st.shortName,
          subLabel: '',
          tx: 0,
          ty: 0,
          tz: 0,
          radius: 14,
          towerHeight: 80,
          targetCapHeight: 80,
          colorTop: '#10b981',
          colorLeft: '#059669',
          colorRight: '#047857',
          strokeColor: '#6ee7b7',
          badgeTextColor: '#6ee7b7',
          staffData: st,
        };
      }
    }
    return null;
  }, [graphNodes, selectedNodeId, staffWorkloads]);

  // Underloaded staff suggestions for rebalancing workload
  const underloadedStaffCandidates = useMemo(() => {
    return staffWorkloads
      .filter(s => s.loadStatus === 'UNDERLOAD' || s.loadPct < 95)
      .sort((a, b) => a.loadPct - b.loadPct)
      .slice(0, 5);
  }, [staffWorkloads]);

  // ============================================================================
  // 4. HIGH-PERFORMANCE ZERO-REFLOW 3D CANVAS ENGINE (60FPS LOCKED)
  // ============================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef({ width: 900, height: 540, dpr: 1 });
  const hoveredNodeIdRef = useRef<string | null>(null);
  const liveNodesRef = useRef<
    Map<string, { x: number; y: number; z: number; th: number; capH: number }>
  >(new Map());

  const cameraRef = useRef({
    yaw: -0.38,
    pitch: 0.44,
    zoom: 0.96,
    targetYaw: -0.38,
    targetPitch: 0.44,
    targetZoom: 0.96,
    fx: 0,
    fy: 10,
    fz: 0,
    targetFx: 0,
    targetFy: 10,
    targetFz: 0,
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

  // Sync latest React state into a mutable ref so the rAF loop NEVER restarts on hover/click
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

  // Fly-To helper when selecting a node
  const flyToNode = useCallback(
    (nodeId: string | null, resetView = false) => {
      if (resetView || !nodeId) {
        cameraRef.current.targetFx = 0;
        cameraRef.current.targetFy = 10;
        cameraRef.current.targetFz = 0;
        cameraRef.current.targetYaw = -0.38;
        cameraRef.current.targetPitch = 0.44;
        cameraRef.current.targetZoom = 0.96;
        return;
      }
      const target = sceneStateRef.current.graphNodes.find(n => n.id === nodeId);
      if (target) {
        cameraRef.current.targetFx = target.tx * 0.45;
        cameraRef.current.targetFy = (target.ty - target.towerHeight * 0.4) * 0.35;
        cameraRef.current.targetFz = target.tz * 0.45;
        cameraRef.current.targetZoom = Math.max(cameraRef.current.targetZoom, 1.04);
      }
    },
    []
  );

  const handleSelectAndFly = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      flyToNode(nodeId);
    },
    [flyToNode]
  );

  // ResizeObserver once on mount -> Zero layout thrashing during animation!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(300, Math.floor(rect.height));
      canvasSizeRef.current = { width: w, height: h, dpr };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Single Persistent 60fps 3D Render Loop (Never tears down on state change)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Helper: draw a true 3-face 3D Isometric Prism (Left face, Right face, Top Rhombus face)
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
      // Left 3D face
      ctx.beginPath();
      ctx.moveTo(topX - halfW, topY);
      ctx.lineTo(topX, topY + depthH);
      ctx.lineTo(baseX, baseY + depthH);
      ctx.lineTo(baseX - halfW, baseY);
      ctx.closePath();
      ctx.fillStyle = colorLeft;
      ctx.fill();

      // Right 3D face (shaded darker for 3D depth)
      ctx.beginPath();
      ctx.moveTo(topX, topY + depthH);
      ctx.lineTo(topX + halfW, topY);
      ctx.lineTo(baseX + halfW, baseY);
      ctx.lineTo(baseX, baseY + depthH);
      ctx.closePath();
      ctx.fillStyle = colorRight;
      ctx.fill();

      // Top 3D Rhombus Cap (brightest face)
      ctx.beginPath();
      ctx.moveTo(topX, topY - depthH);
      ctx.lineTo(topX + halfW, topY);
      ctx.lineTo(topX, topY + depthH);
      ctx.lineTo(topX - halfW, topY);
      ctx.closePath();
      ctx.fillStyle = colorTop;
      ctx.fill();

      // Crisp 3D wireframe edges
      ctx.strokeStyle = isHighlighted ? '#ffffff' : strokeColor;
      ctx.lineWidth = isHighlighted ? 1.8 : 0.9;
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
        layoutMode: mode,
      } = sceneStateRef.current;
      const hovId = hoveredNodeIdRef.current;
      const activeId = hovId || selId;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Fast solid dark slate background (Zero per-frame radial gradient allocation)
      ctx.fillStyle = '#070d19';
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.54;

      // 2. Smoothly interpolate 3D camera
      const cam = cameraRef.current;
      if (isAutoRot && !dragRef.current.isDragging && !hovId) {
        cam.targetYaw += 0.0018;
      }
      cam.yaw += (cam.targetYaw - cam.yaw) * 0.12;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.12;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;
      cam.fx += (cam.targetFx - cam.fx) * 0.1;
      cam.fy += (cam.targetFy - cam.fy) * 0.1;
      cam.fz += (cam.targetFz - cam.fz) * 0.1;

      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);
      const fov = 840 * cam.zoom;
      const cameraDist = 960;

      const project3D = (wx: number, wy: number, wz: number) => {
        const rx = wx - cam.fx;
        const ry = wy - cam.fy;
        const rz = wz - cam.fz;

        const x1 = rx * cosY - rz * sinY;
        const z1 = rz * cosY + rx * sinY;
        const y2 = ry * cosP - z1 * sinP;
        const z2 = z1 * cosP + ry * sinP;

        const depth = cameraDist + z2;
        const scale = depth > 80 ? fov / depth : 0.1;
        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          scale,
          depth,
        };
      };

      // 3. Draw Clean 3D Perspective Floor Platform
      const floorY = mode === 'LAYERED_3D' ? 155 : 115;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.42)';

      if (mode === 'WORKLOAD_TOWERS' || mode === 'LAYERED_3D') {
        // Draw crisp 3D isometric floor grid lines
        const gridW = 420;
        const gridZ = 240;
        for (let gx = -gridW; gx <= gridW; gx += 105) {
          const p1 = project3D(gx, floorY, -gridZ);
          const p2 = project3D(gx, floorY, gridZ);
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
        for (let gz = -gridZ; gz <= gridZ; gz += 80) {
          const p1 = project3D(-gridW, floorY, gz);
          const p2 = project3D(gridW, floorY, gz);
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
      } else {
        // FOCUS_ORBIT concentric rings
        [195, 340].forEach((r, idx) => {
          ctx.beginPath();
          const ry = idx === 0 ? -10 : -75;
          for (let i = 0; i <= 48; i++) {
            const ang = (i / 48) * Math.PI * 2;
            const p = project3D(Math.cos(ang) * r, ry, Math.sin(ang) * r);
            if (i === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.strokeStyle =
            idx === 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.22)';
          ctx.stroke();
        });
      }

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
          live.x += (n.tx - live.x) * 0.14;
          live.y += (n.ty - live.y) * 0.14;
          live.z += (n.tz - live.z) * 0.14;
          live.th += (n.towerHeight - live.th) * 0.14;
          live.capH += (n.targetCapHeight - live.capH) * 0.14;
        }

        const baseProj = project3D(live.x, live.y, live.z);
        const topProj =
          n.kind === 'STAFF'
            ? project3D(live.x, live.y - live.th, live.z)
            : baseProj;
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

      // 5. Draw 3D Arched Links & Particles
      links.forEach(link => {
        const src = projectedMap.get(link.sourceId);
        const tgt = projectedMap.get(link.targetId);
        if (!src || !tgt) return;

        const isHighlighted =
          activeId &&
          (link.sourceId === activeId ||
            link.targetId === activeId ||
            (connSet.has(link.sourceId) && connSet.has(link.targetId)));

        const x1 = src.topSx;
        const y1 = src.topSy;
        const x2 = tgt.topSx;
        const y2 = tgt.topSy;
        const midX = (x1 + x2) * 0.5;
        const midY = (y1 + y2) * 0.5 - 28 * ((src.scale + tgt.scale) * 0.5);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = link.color;
        ctx.lineWidth = isHighlighted ? link.weight * 1.25 : link.weight * 0.75;
        ctx.globalAlpha = isHighlighted ? 0.88 : 0.25;
        ctx.stroke();

        if (isParticles && isHighlighted) {
          for (let pIdx = 0; pIdx < 2; pIdx++) {
            const t = ((time * link.particleSpeed + pIdx * 0.5) % 1 + 1) % 1;
            const invT = 1 - t;
            const px = invT * invT * x1 + 2 * invT * t * midX + t * t * x2;
            const py = invT * invT * y1 + 2 * invT * t * midY + t * t * y2;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.95;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      });

      // 6. Sort Nodes Back-to-Front for 3D Geometry Painting
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

      sortedBackToFront.forEach(item => {
        const { node, sx, sy, topSx, topSy, capSx, capSy, scale, depth } = item;
        const isSelected = selId === node.id;
        const isHovered = hovId === node.id;
        const isConnected = connSet.has(node.id);
        const isDimmed = Boolean(activeId && !isConnected && node.kind !== 'STAFF');

        ctx.globalAlpha = isDimmed ? 0.25 : 1.0;

        if (node.kind === 'STAFF' && node.staffData) {
          const halfW = Math.max(9, 16 * scale);
          const depthH = halfW * 0.48;

          // Floor tile under prism
          ctx.beginPath();
          ctx.moveTo(sx, sy - depthH * 1.45);
          ctx.lineTo(sx + halfW * 1.45, sy);
          ctx.lineTo(sx, sy + depthH * 1.45);
          ctx.lineTo(sx - halfW * 1.45, sy);
          ctx.closePath();
          ctx.fillStyle = isSelected || isHovered
            ? 'rgba(56, 189, 248, 0.35)'
            : 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = isSelected || isHovered
            ? '#38bdf8'
            : 'rgba(148, 163, 184, 0.28)';
          ctx.lineWidth = isSelected || isHovered ? 2 : 1;
          ctx.fill();
          ctx.stroke();

          // True 3-Face 3D Isometric Prism Bar
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

          // 100% Level Benchmark Ring on the 3D Prism
          ctx.beginPath();
          ctx.moveTo(capSx - halfW * 1.15, capSy);
          ctx.lineTo(capSx, capSy + depthH * 1.15);
          ctx.lineTo(capSx + halfW * 1.15, capSy);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: (topSy + sy) * 0.5,
            sr: Math.max(20, halfW * 1.5),
            topY: topSy,
            depth,
          });
        } else if (node.kind === 'BRAND') {
          // 3D Brand Isometric Cube / Gem
          const halfW = Math.max(10, 15 * scale);
          const depthH = halfW * 0.52;
          const cubeH = halfW * 0.9;
          drawIsometricPrism(
            topSx,
            topSy + cubeH * 0.5,
            topSx,
            topSy - cubeH * 0.5,
            halfW,
            depthH,
            node.colorTop,
            node.colorLeft,
            node.colorRight,
            node.strokeColor,
            isSelected || isHovered
          );

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: topSy,
            sr: Math.max(18, halfW * 1.5),
            topY: topSy,
            depth,
          });
        } else {
          // 3D Store Node
          const r = Math.max(7, node.radius * scale);
          ctx.beginPath();
          ctx.arc(topSx, topSy, r, 0, Math.PI * 2);
          ctx.fillStyle = node.colorLeft;
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : node.strokeColor;
          ctx.lineWidth = isSelected || isHovered ? 2.2 : 1.2;
          ctx.stroke();

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: topSy,
            sr: Math.max(15, r * 1.6),
            topY: topSy,
            depth,
          });
        }

        ctx.globalAlpha = 1.0;
      });

      // 7. Anti-Overlap Label Pass (Sorted Front-to-Back so Foreground/Selected Labels NEVER get covered!)
      const occupiedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const sortedFrontToBack = sortedBackToFront.slice().reverse();

      // Ensure Selected & Hovered nodes get label priority first
      sortedFrontToBack.sort((a, b) => {
        const aPri = a.node.id === hovId ? 3 : a.node.id === selId ? 2 : connSet.has(a.node.id) ? 1 : 0;
        const bPri = b.node.id === hovId ? 3 : b.node.id === selId ? 2 : connSet.has(b.node.id) ? 1 : 0;
        if (aPri !== bPri) return bPri - aPri;
        return a.depth - b.depth;
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sortedFrontToBack.forEach(item => {
        const { node, topSx, topSy, scale } = item;
        const isSelected = selId === node.id;
        const isHovered = hovId === node.id;
        const isPriority = isSelected || isHovered;

        const titleText = isPriority ? node.label : node.shortLabel;
        const subText = node.roleTag ? `${node.subLabel} · ${node.roleTag}` : node.subLabel;

        const boxW = Math.max(titleText.length * 6.6, subText.length * 5.8) + 16;
        const boxH = isPriority || node.kind !== 'STAFF' ? 32 : 26;
        const bx1 = topSx - boxW * 0.5;
        const by1 = topSy - 14 - boxH;
        const bx2 = topSx + boxW * 0.5;
        const by2 = topSy - 14;

        // Check collision against higher-priority labels
        if (!isPriority) {
          const collides = occupiedBoxes.some(
            b => !(bx2 < b.x1 + 4 || bx1 > b.x2 - 4 || by2 < b.y1 + 2 || by1 > b.y2 - 2)
          );
          if (collides) return;
        }

        occupiedBoxes.push({ x1: bx1, y1: by1, x2: bx2, y2: by2 });

        // Draw crisp label pill
        ctx.fillStyle = isPriority
          ? 'rgba(15, 23, 42, 0.96)'
          : 'rgba(15, 23, 42, 0.86)';
        ctx.beginPath();
        ctx.roundRect(bx1, by1, boxW, boxH, 6);
        ctx.fill();

        ctx.strokeStyle = isPriority
          ? '#38bdf8'
          : node.kind === 'BRAND'
            ? 'rgba(245, 158, 11, 0.65)'
            : node.kind === 'STORE'
              ? 'rgba(56, 189, 248, 0.55)'
              : 'rgba(148, 163, 184, 0.32)';
        ctx.lineWidth = isPriority ? 1.8 : 1;
        ctx.stroke();

        // Line 1: Name
        ctx.font = `${isPriority ? '700' : '600'} ${Math.max(10, Math.round(11 * Math.min(1.1, scale)))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(titleText, topSx, by1 + boxH * 0.34);

        // Line 2: Metric / Role
        ctx.font = `700 ${Math.max(9, Math.round(9.5 * Math.min(1.1, scale)))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = node.badgeTextColor;
        ctx.fillText(subText, topSx, by1 + boxH * 0.74);
      });

      projectedScreenNodesRef.current = nextHitRegions;
      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Hit-test helper using cached canvas bounds
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
        (Math.abs(dx) <= reg.sr * 0.9 && Math.abs(dyMid) <= reg.sr * 1.45)
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
      cameraRef.current.targetYaw += dx * 0.006;
      cameraRef.current.targetPitch = Math.max(
        0.12,
        Math.min(0.95, cameraRef.current.targetPitch + dy * 0.005)
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
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    cameraRef.current.targetZoom = Math.max(
      0.55,
      Math.min(2.1, cameraRef.current.targetZoom * factor)
    );
  };

  // Reassign Brand Role PIC handler
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

  // Reassign Store PIC handler
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

  // Update Store Difficulty Coefficient handler
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

  // Submit Quick Task for selected staff
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
              ? 'bg-accent-soft/60 border-accent shadow-2xs'
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
              ? 'bg-critical-soft border-critical shadow-2xs'
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
              ? 'bg-positive-soft border-positive shadow-2xs'
              : 'bg-surface border-line hover:bg-positive-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-positive font-semibold">
            <span>Đủ tải chuẩn (85–114%)</span>
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
              ? 'bg-accent-soft border-accent shadow-2xs'
              : 'bg-surface border-line hover:bg-accent-soft/30'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-accent font-semibold">
            <span>Dư công suất (&lt;85%)</span>
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
              ? 'bg-warning-soft border-warning shadow-2xs'
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

      {/* 2. Control & Filter Toolbar */}
      <div className="bg-surface border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 3D Spatial Layout Switcher */}
          <div className="inline-flex rounded-lg bg-sunken p-0.5 border border-line">
            <button
              type="button"
              onClick={() => {
                setLayoutMode('WORKLOAD_TOWERS');
                flyToNode(null, true);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                layoutMode === 'WORKLOAD_TOWERS'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Sàn 3D Cột Tải (28 Nhân sự)
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutMode('FOCUS_ORBIT');
                flyToNode(null, true);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                layoutMode === 'FOCUS_ORBIT'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Cây Phân Việc 3D (Tâm điểm)
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutMode('LAYERED_3D');
                flyToNode(null, true);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                layoutMode === 'LAYERED_3D'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              3 Tầng: Nhân sự → Brand → Gian
            </button>
          </div>

          {/* Role group filter */}
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

          {/* Anti-clutter Focus Toggle */}
          <button
            type="button"
            onClick={() => setOnlyFocusedNetwork(prev => !prev)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
              onlyFocusedNetwork
                ? 'bg-accent-soft text-accent border-accent/40'
                : 'bg-sunken text-ink-2 border-line hover:text-ink'
            }`}
            title="Khi bật: chỉ hiện các Brand & Gian hàng của nhân sự đang chọn để sơ đồ luôn thoáng, không bị rối dây"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{onlyFocusedNetwork ? 'Chế độ gọn: Chỉ hiện nhánh đang chọn' : 'Đang hiện mọi nhánh'}</span>
          </button>
        </div>

        {/* Search & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm nhân sự, Brand, gian hàng..."
              className="h-8 pl-8 pr-7 rounded-lg bg-sunken border border-line text-xs text-ink placeholder:text-ink-3 w-52 focus:outline-none focus:border-accent"
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

      {/* 3. Main 3D Viewport + Side Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left/Center: 3D Interactive Space (8 cols) */}
        <div className="lg:col-span-8 bg-[#070d19] border border-slate-800 rounded-2xl overflow-hidden relative shadow-lg">
          {/* Top-left 3D Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-200 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                <span>Cột Đỏ: Quá tải (≥115%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                <span>Cột Xanh: Đủ tải (85–114%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
                <span>Cột Tím: Dư tải (&lt;85%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                <span>Khối Vàng: Brand</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Gian hàng (TikTok / Shopee)</span>
              </span>
            </div>
          </div>

          {/* Top-right 3D Camera Controls Overlay */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoRotate(prev => !prev)}
              title={autoRotate ? 'Tạm dừng tự xoay 3D' : 'Bật tự động xoay 3D'}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                autoRotate
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoRotate ? 'Đang xoay' : 'Tự xoay'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowParticles(prev => !prev)}
              title="Bật/tắt hạt chuyển động theo luồng giao việc"
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                showParticles
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Luồng hạt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                cameraRef.current.targetZoom = Math.min(2.1, cameraRef.current.targetZoom * 1.18);
              }}
              title="Phóng to"
              className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                cameraRef.current.targetZoom = Math.max(0.55, cameraRef.current.targetZoom * 0.84);
              }}
              title="Thu nhỏ"
              className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => flyToNode(null, true)}
              title="Đặt lại góc nhìn chuẩn"
              className="h-8 px-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Góc chuẩn</span>
            </button>
          </div>

          {/* Interactive 3D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-[540px] block select-none"
          />

          {/* Bottom Quick Staff Workload Strip inside 3D Viewport */}
          <div className="bg-slate-950 border-t border-slate-800 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-300">
                Chọn Nhân sự để xem nhánh Brand & Gian hàng trên không gian 3D (Sắp xếp từ tải cao → thấp):
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Vạch trắng trên cột 3D = Mức chuẩn 100% theo Level
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {filteredStaff.map(st => {
                const isActive = selectedNodeId === st.id;
                const badgeTone =
                  st.loadStatus === 'OVERLOAD'
                    ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                    : st.loadStatus === 'UNDERLOAD'
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectAndFly(st.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-sky-400 bg-sky-500/25 text-white border-sky-400'
                        : `${badgeTone} hover:brightness-125`
                    }`}
                  >
                    <span className="truncate max-w-[115px]">{st.shortName}</span>
                    <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-black/30 tabular-nums">
                      {st.loadPct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detailed Workload & Assignment Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-2xl overflow-hidden shadow-xs">
          {!selectedNode ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">
                  Chọn 1 Nhân sự, Brand hoặc Gian hàng trên không gian 3D
                </h3>
                <p className="text-xs text-ink-3 leading-relaxed">
                  Click trực tiếp vào cột 3D hoặc thanh nhân sự phía dưới để xem nhánh Brand, Gian hàng phụ trách và điều phối công việc.
                </p>
              </div>
            </div>
          ) : selectedNode.kind === 'STAFF' && selectedNode.staffData ? (
            /* ==================== STAFF INSPECTOR ==================== */
            (() => {
              const st = selectedNode.staffData;
              return (
                <div className="divide-y divide-line max-h-[625px] overflow-y-auto">
                  {/* Header */}
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
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(null);
                          flyToNode(null, true);
                        }}
                        className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
                        title="Đóng chi tiết"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Workload Point Progress Bar */}
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
                          title={`Điểm Quản lý giao & Brand: ${st.directorPts.toFixed(1)} pt`}
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

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsQuickTaskOpen(prev => !prev)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Giao thêm việc
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setLayoutMode(prev =>
                            prev === 'FOCUS_ORBIT' ? 'WORKLOAD_TOWERS' : 'FOCUS_ORBIT'
                          )
                        }
                      >
                        <Compass className="w-3.5 h-3.5 mr-1" />
                        {layoutMode === 'FOCUS_ORBIT' ? 'Về sàn 28 cột' : 'Tách riêng cây 3D'}
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

                    {/* Quick Task Form */}
                    {isQuickTaskOpen && (
                      <div className="p-3 rounded-xl bg-surface border border-accent/40 space-y-2.5">
                        <div className="text-xs font-semibold text-ink">
                          Giao việc trực tiếp cho {st.name}
                        </div>
                        <input
                          type="text"
                          value={quickTaskTitle}
                          onChange={e => setQuickTaskTitle(e.target.value)}
                          placeholder="Nhập tên đầu việc (VD: Lên phương án Key Visual 11.11)..."
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
                            title="Điểm Point"
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
                            Xác nhận giao (+{quickTaskPoints} pt)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overload Rebalance Suggestion */}
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

                  {/* Assigned Brands Section */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Thương hiệu phụ trách ({st.assignedBrands.length})</span>
                      </h4>
                    </div>
                    {st.assignedBrands.length === 0 ? (
                      <p className="text-xs text-ink-3">Chưa gắn vị trí cấp Brand trực tiếp.</p>
                    ) : (
                      <div className="space-y-2">
                        {st.assignedBrands.map(ab => (
                          <div
                            key={ab.brandId}
                            className="p-2.5 rounded-xl bg-sunken/50 border border-line flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handleSelectAndFly(`brand-${ab.brandId}`)}
                                className="text-xs font-semibold text-ink hover:text-accent truncate block cursor-pointer"
                              >
                                {ab.brandName}
                              </button>
                              <div className="text-2xs text-ink-3 truncate">
                                Vai trò: <strong className="text-ink-2">{ab.roles.join(' · ')}</strong>
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
                    )}
                  </div>

                  {/* Assigned Stores Section */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Gian hàng B2C phụ trách ({st.assignedStores.length})</span>
                      </h4>
                    </div>
                    {st.assignedStores.length === 0 ? (
                      <p className="text-xs text-ink-3">Không có gian hàng trực tiếp.</p>
                    ) : (
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
                                title="Điều chuyển PIC gian hàng"
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
                    )}
                  </div>
                </div>
              );
            })()
          ) : selectedNode.kind === 'BRAND' && selectedNode.brandData ? (
            /* ==================== BRAND INSPECTOR ==================== */
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
                <div className="divide-y divide-line max-h-[625px] overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 text-2xs font-bold">
                          Thương hiệu (Brand)
                        </span>
                        <h3 className="text-base font-bold text-ink mt-1">{b.name}</h3>
                        <p className="text-xs text-ink-3">{b.category}</p>
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
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-surface border border-line">
                        <div className="text-2xs text-ink-3">Ngân sách tháng</div>
                        <div className="font-bold text-ink">
                          {formatVndShort(b.planBudget || b.monthlyBudget || 150000000)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface border border-line">
                        <div className="text-2xs text-ink-3">Mục tiêu GMV</div>
                        <div className="font-bold text-ink">
                          {formatVndShort(b.targetGmv || 450000000)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Brand-level Positions */}
                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Đội ngũ phụ trách cấp Brand (Điều phối trực tiếp)
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

                  {/* Stores under this Brand */}
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
            /* ==================== STORE INSPECTOR ==================== */
            (() => {
              const s = selectedNode.storeData;
              const coefInfo = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
              const currentPic = s.b2cOwnerName || s.assignedStaff || 'Chưa gán';

              return (
                <div className="divide-y divide-line max-h-[625px] overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 text-2xs font-bold">
                          Gian hàng · {s.platform}
                        </span>
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

                  {/* Store Coefficient & PIC Controls */}
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

                    <div className="p-3 rounded-xl bg-sunken/50 border border-line space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-3">Trưởng nhóm duyệt:</span>
                        <strong className="text-ink">
                          {s.hasBookingLeader && s.bookingLeader
                            ? s.bookingLeader
                            : 'Không có Leader (Trình thẳng GĐ MKT)'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-3">Hạn mức Order Net:</span>
                        <strong className="text-ink">
                          {formatVndShort(s.budgetNet || s.monthlyBudget || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>
      </div>
    </div>
  );
};
