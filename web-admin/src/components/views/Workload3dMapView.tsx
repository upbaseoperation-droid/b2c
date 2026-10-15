'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Users,
  Building2,
  Store,
  Layers,
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
  Eye,
  Sparkles,
  BarChart3,
  X,
  ChevronRight,
  Flame,
  ShieldCheck,
  Target,
  Activity,
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
import { Button, ChannelTag, Status } from '../ui';
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

type SpatialLayoutMode = 'WORKLOAD_TOWERS' | 'LAYERED_3D' | 'FOCUS_ORBIT';
type WorkloadLoadStatus = 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD';
type RoleFilterGroup = 'ALL' | 'LEADER' | 'BOOKING' | 'CONTENT_BRAND' | 'PLAN_STRATEGY' | 'KEY_VISUAL' | 'FOC_SAMPLE';
type LoadFilterMode = 'ALL' | 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD' | 'HARD_RATIO_LOW';

interface StaffComputedWorkload {
  id: string;
  staffCode: string;
  name: string;
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
  subLabel: string;
  // Target 3D coordinates
  tx: number;
  ty: number;
  tz: number;
  // Current interpolated 3D coordinates
  x: number;
  y: number;
  z: number;
  radius: number;
  towerHeight: number;
  colorPrimary: string;
  colorSecondary: string;
  glowColor: string;
  // Metadata
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
  currentUser,
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
  const [showStoresLayer, setShowStoresLayer] = useState<boolean>(true);
  const [showBrandsLayer, setShowBrandsLayer] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showParticles, setShowParticles] = useState<boolean>(true);

  // Selected entity in 3D space
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('staff-HN206');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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
      // Find brands assigned to this staff member
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

      // Find stores assigned to this staff member
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
          if (matchLeader) roleLabels.push('Trưởng nhóm duyệt');
          if (matchContent) roleLabels.push('Content Kênh');
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

      // If sample stores from roster aren't yet linked in b2cStores state, synthesize virtual store links from keyStoresSample so the 3D graph is 100% connected
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
              coef: normalizeStoreCoefficient(matchedStore.difficultyTier, matchedStore.difficultyMultiplier).multiplier,
              budgetNet: matchedStore.budgetNet || matchedStore.monthlyBudget || 0,
              roleLabel: 'PIC Phối hợp',
            });
          }
          const matchedBrand = brands.find(br =>
            br.name.toLowerCase().includes(token.toLowerCase())
          );
          if (
            matchedBrand &&
            !assignedBrands.some(ab => ab.brandId === matchedBrand.id)
          ) {
            assignedBrands.push({
              brandId: matchedBrand.id,
              brandName: matchedBrand.name,
              roles: [roster.roleGroup.split('&')[0].trim()],
            });
          }
        });
      }

      // Active tasks assigned to this staff member
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

      // Adjust workload dynamically when stores/brands are reassigned compared to baseline
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

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffWorkloads.filter(st => {
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
    });
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

  // 3. Build 3D Graph (Nodes & Links) with target coordinates per layoutMode
  const { graphNodes, graphLinks } = useMemo(() => {
    const nodes: Node3D[] = [];
    const links: Link3D[] = [];

    const visibleStaffIds = new Set(filteredStaff.map(s => s.id));
    const activeBrandIds = new Set<string>();
    const activeStoreIds = new Set<string>();

    filteredStaff.forEach(st => {
      st.assignedBrands.forEach(b => activeBrandIds.add(b.brandId));
      st.assignedStores.forEach(s => activeStoreIds.add(s.storeId));
    });

    // Include up to 24 active brands and 36 stores for crisp 3D performance + any searched/selected brand/store
    const visibleBrands = brands.filter(
      (b, idx) =>
        showBrandsLayer &&
        (activeBrandIds.has(b.id) ||
          selectedNodeId === `brand-${b.id}` ||
          (searchQuery.trim() &&
            b.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
          idx < 18)
    );

    const visibleStores = b2cStores.filter(
      (s, idx) =>
        showStoresLayer &&
        (activeStoreIds.has(s.id) ||
          selectedNodeId === `store-${s.id}` ||
          (searchQuery.trim() &&
            s.storeName.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
          idx < 28)
    );

    // Position calculation helper based on layoutMode
    const staffCount = Math.max(1, filteredStaff.length);
    filteredStaff.forEach((st, idx) => {
      let tx = 0;
      let ty = 0;
      let tz = 0;

      // Tower height proportional to totalPts (range 35 to 175 in 3D space)
      const towerHeight = Math.max(36, Math.min(185, st.totalPts * 0.88));

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Two concentric rings on the 3D ground plane (y = 80 is ground)
        const isInner = idx < 10;
        const ringCount = isInner ? Math.min(10, staffCount) : Math.max(1, staffCount - 10);
        const ringIdx = isInner ? idx : idx - 10;
        const angle = (ringIdx / ringCount) * Math.PI * 2;
        const radius = isInner ? 210 : 370;
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = 95; // Ground floor base
      } else if (layoutMode === 'LAYERED_3D') {
        // Top tier (y = -170): Staff arranged in a 3D grid/ellipse
        const angle = (idx / staffCount) * Math.PI * 2;
        const radiusX = 340;
        const radiusZ = 240;
        tx = Math.cos(angle) * radiusX;
        tz = Math.sin(angle) * radiusZ;
        ty = -165;
      } else {
        // FOCUS_ORBIT
        if (selectedNodeId === st.id) {
          tx = 0;
          ty = 20;
          tz = 0;
        } else {
          const angle = (idx / staffCount) * Math.PI * 2;
          const radius = 380;
          tx = Math.cos(angle) * radius;
          tz = Math.sin(angle) * radius;
          ty = 110;
        }
      }

      let colorPrimary = '#10b981'; // Optimal emerald
      let colorSecondary = '#059669';
      let glowColor = 'rgba(16, 185, 129, 0.45)';

      if (st.loadStatus === 'OVERLOAD') {
        colorPrimary = '#f43f5e'; // Rose/Red overload
        colorSecondary = '#e11d48';
        glowColor = 'rgba(244, 63, 94, 0.65)';
      } else if (st.loadStatus === 'UNDERLOAD') {
        colorPrimary = '#6366f1'; // Indigo underload
        colorSecondary = '#4f46e5';
        glowColor = 'rgba(99, 102, 241, 0.45)';
      }

      nodes.push({
        id: st.id,
        kind: 'STAFF',
        label: st.name,
        subLabel: `${st.level} · ${st.totalPts.toFixed(0)} pt (${st.loadPct}%)`,
        tx,
        ty,
        tz,
        x: tx,
        y: ty,
        z: tz,
        radius: st.loadStatus === 'OVERLOAD' ? 16 : 13,
        towerHeight,
        colorPrimary,
        colorSecondary,
        glowColor,
        staffData: st,
      });
    });

    // Position Brands
    const brandCount = Math.max(1, visibleBrands.length);
    visibleBrands.forEach((b, idx) => {
      const nodeId = `brand-${b.id}`;
      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Floating sky ring above the workload towers
        const angle = (idx / brandCount) * Math.PI * 2 + 0.25;
        const radius = 280;
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = -115 - (idx % 3) * 28;
      } else if (layoutMode === 'LAYERED_3D') {
        // Middle tier (y = 0)
        const angle = (idx / brandCount) * Math.PI * 2;
        const radius = 290;
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = 5;
      } else {
        // FOCUS_ORBIT
        if (selectedNodeId === nodeId) {
          tx = 0;
          ty = 0;
          tz = 0;
        } else {
          const angle = (idx / brandCount) * Math.PI * 2;
          const radius = 230;
          tx = Math.cos(angle) * radius;
          tz = Math.sin(angle) * radius;
          ty = -70;
        }
      }

      nodes.push({
        id: nodeId,
        kind: 'BRAND',
        label: b.name,
        subLabel: formatVndShort(b.planBudget || b.monthlyBudget || 150000000),
        tx,
        ty,
        tz,
        x: tx,
        y: ty,
        z: tz,
        radius: 12,
        towerHeight: 0,
        colorPrimary: '#f59e0b', // Amber/Gold for Brand
        colorSecondary: '#d97706',
        glowColor: 'rgba(245, 158, 11, 0.45)',
        brandData: b,
      });
    });

    // Position Stores
    const storeCount = Math.max(1, visibleStores.length);
    visibleStores.forEach((s, idx) => {
      const nodeId = `store-${s.id}`;
      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (layoutMode === 'WORKLOAD_TOWERS') {
        // Outer high satellite ring
        const angle = (idx / storeCount) * Math.PI * 2;
        const radius = 445;
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = -45 + (idx % 2 === 0 ? -25 : 25);
      } else if (layoutMode === 'LAYERED_3D') {
        // Bottom tier (y = 175)
        const angle = (idx / storeCount) * Math.PI * 2;
        const radius = 390;
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = 175;
      } else {
        // FOCUS_ORBIT
        if (selectedNodeId === nodeId) {
          tx = 0;
          ty = 0;
          tz = 0;
        } else {
          const angle = (idx / storeCount) * Math.PI * 2;
          const radius = 330;
          tx = Math.cos(angle) * radius;
          tz = Math.sin(angle) * radius;
          ty = -140;
        }
      }

      const isTikTok = s.platform === 'TikTok Shop';
      const coef = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier;

      nodes.push({
        id: nodeId,
        kind: 'STORE',
        label: s.storeName,
        subLabel: `${isTikTok ? 'TTS' : 'Shopee'} · HS ×${coef.toFixed(2)}`,
        tx,
        ty,
        tz,
        x: tx,
        y: ty,
        z: tz,
        radius: coef >= 1.25 ? 9.5 : 7.5,
        towerHeight: 0,
        colorPrimary: isTikTok ? '#06b6d4' : '#f97316',
        colorSecondary: isTikTok ? '#0891b2' : '#ea580c',
        glowColor: isTikTok ? 'rgba(6, 182, 212, 0.4)' : 'rgba(249, 115, 22, 0.4)',
        storeData: s,
      });
    });

    const nodeIdSet = new Set(nodes.map(n => n.id));

    // Create Links: Staff -> Brand & Staff -> Store
    filteredStaff.forEach(st => {
      if (! visibleStaffIds.has(st.id)) return;
      st.assignedBrands.forEach(ab => {
        const targetId = `brand-${ab.brandId}`;
        if (nodeIdSet.has(targetId)) {
          links.push({
            id: `link-${st.id}-${targetId}`,
            sourceId: st.id,
            targetId,
            roleLabel: ab.roles.join(', '),
            linkType: 'STAFF_TO_BRAND',
            color: st.loadStatus === 'OVERLOAD' ? '#fb7185' : '#fbbf24',
            weight: st.loadStatus === 'OVERLOAD' ? 2.2 : 1.5,
            particleSpeed: st.loadStatus === 'OVERLOAD' ? 0.0085 : 0.005,
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
            color: st.loadStatus === 'OVERLOAD' ? '#f43f5e' : '#38bdf8',
            weight: as.coef >= 1.25 ? 1.8 : 1.2,
            particleSpeed: as.coef >= 1.25 ? 0.0075 : 0.0045,
          });
        }
      });
    });

    // Create Links: Brand -> Store
    visibleStores.forEach(s => {
      const storeNodeId = `store-${s.id}`;
      const matchedBrand = visibleBrands.find(
        b =>
          b.id === s.brandId ||
          b.name.toLowerCase() === (s.brandName || '').toLowerCase()
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
            color: 'rgba(148, 163, 184, 0.35)',
            weight: 1.0,
            particleSpeed: 0.0035,
          });
        }
      }
    });

    return { graphNodes: nodes, graphLinks: links };
  }, [filteredStaff, brands, b2cStores, showBrandsLayer, showStoresLayer, layoutMode, selectedNodeId, searchQuery]);

  // Connected neighbor set for the currently selected or hovered node
  const activeHighlightId = hoveredNodeId || selectedNodeId;
  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!activeHighlightId) return set;
    set.add(activeHighlightId);
    graphLinks.forEach(l => {
      if (l.sourceId === activeHighlightId) set.add(l.targetId);
      if (l.targetId === activeHighlightId) set.add(l.sourceId);
    });
    // Also if a Staff is selected, include stores belonging to their assigned brands
    if (activeHighlightId.startsWith('staff-')) {
      const brandNodes = Array.from(set).filter(id => id.startsWith('brand-'));
      graphLinks.forEach(l => {
        if (brandNodes.includes(l.sourceId)) set.add(l.targetId);
      });
    }
    return set;
  }, [activeHighlightId, graphLinks]);

  // Selected entity objects for the Inspector Panel
  const selectedNode = useMemo(
    () => graphNodes.find(n => n.id === selectedNodeId) || null,
    [graphNodes, selectedNodeId]
  );

  // Underloaded staff suggestions for rebalancing workload
  const underloadedStaffCandidates = useMemo(() => {
    return staffWorkloads
      .filter(s => s.loadStatus === 'UNDERLOAD' || s.loadPct < 95)
      .sort((a, b) => a.loadPct - b.loadPct)
      .slice(0, 5);
  }, [staffWorkloads]);

  // ============================================================================
  // 4. INTERACTIVE 3D CANVAS ENGINE (Perspective Projection + Camera Fly-To)
  // ============================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveNodesRef = useRef<Map<string, { x: number; y: number; z: number; th: number }>>(new Map());
  const cameraRef = useRef({
    yaw: 0.45,
    pitch: 0.36,
    zoom: 0.92,
    targetYaw: 0.45,
    targetPitch: 0.36,
    targetZoom: 0.92,
    // Camera 3D look-at focus point
    fx: 0,
    fy: 0,
    fz: 0,
    targetFx: 0,
    targetFy: 0,
    targetFz: 0,
  });
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const projectedScreenNodesRef = useRef<
    { id: string; sx: number; sy: number; sr: number; topY: number; depth: number }[]
  >([]);

  // Fly-To helper when selecting a node
  const flyToNode = useCallback(
    (nodeId: string | null, resetView = false) => {
      if (resetView || !nodeId) {
        cameraRef.current.targetFx = 0;
        cameraRef.current.targetFy = 0;
        cameraRef.current.targetFz = 0;
        cameraRef.current.targetZoom = 0.92;
        cameraRef.current.targetPitch = 0.36;
        return;
      }
      const target = graphNodes.find(n => n.id === nodeId);
      if (target) {
        const live = liveNodesRef.current.get(nodeId);
        const nx = live ? live.x : target.tx;
        const ny = live ? live.y - (target.kind === 'STAFF' ? target.towerHeight * 0.5 : 0) : target.ty;
        const nz = live ? live.z : target.tz;
        cameraRef.current.targetFx = nx * 0.65;
        cameraRef.current.targetFy = ny * 0.65;
        cameraRef.current.targetFz = nz * 0.65;
        cameraRef.current.targetZoom = Math.max(cameraRef.current.targetZoom, 1.15);
      }
    },
    [graphNodes]
  );

  const handleSelectAndFly = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      flyToNode(nodeId);
    },
    [flyToNode]
  );

  // Main 60fps 3D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 1;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2 + 15;

      // 1. Deep space 3D background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy - 40, 40, cx, cy, Math.max(width, height) * 0.75);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.55, '#090f1f');
      bgGrad.addColorStop(1, '#040814');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Smoothly interpolate camera state
      const cam = cameraRef.current;
      if (autoRotate && !dragRef.current.isDragging) {
        cam.targetYaw += 0.0022;
      }
      cam.yaw += (cam.targetYaw - cam.yaw) * 0.09;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.09;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.09;
      cam.fx += (cam.targetFx - cam.fx) * 0.08;
      cam.fy += (cam.targetFy - cam.fy) * 0.08;
      cam.fz += (cam.targetFz - cam.fz) * 0.08;

      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);
      const fov = 780 * cam.zoom;
      const cameraDist = 920;

      // 3D Point projection function
      const project3D = (wx: number, wy: number, wz: number) => {
        const rx = wx - cam.fx;
        const ry = wy - cam.fy;
        const rz = wz - cam.fz;

        // Rotate around Y axis (Yaw)
        const x1 = rx * cosY - rz * sinY;
        const z1 = rz * cosY + rx * sinY;
        // Rotate around X axis (Pitch)
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

      // 3. Draw 3D Perspective Floor Grid & Concentric Radar Rings
      const floorY = layoutMode === 'LAYERED_3D' ? 185 : 95;
      ctx.lineWidth = 1;
      [160, 260, 370, 480].forEach((ringR, rIdx) => {
        ctx.beginPath();
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const ang = (i / segments) * Math.PI * 2;
          const px = Math.cos(ang) * ringR;
          const pz = Math.sin(ang) * ringR;
          const p = project3D(px, floorY, pz);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle =
          rIdx === 1 || rIdx === 2
            ? 'rgba(56, 189, 248, 0.16)'
            : 'rgba(148, 163, 184, 0.08)';
        ctx.stroke();
      });

      // Radial floor spokes in 3D
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const p1 = project3D(Math.cos(ang) * 70, floorY, Math.sin(ang) * 70);
        const p2 = project3D(Math.cos(ang) * 480, floorY, Math.sin(ang) * 480);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
        ctx.stroke();
      }

      // If LAYERED_3D mode, draw subtle middle & upper layer rings
      if (layoutMode === 'LAYERED_3D') {
        [-165, 5].forEach((layerY, idx) => {
          ctx.beginPath();
          const r = idx === 0 ? 340 : 290;
          for (let i = 0; i <= 56; i++) {
            const ang = (i / 56) * Math.PI * 2;
            const p = project3D(Math.cos(ang) * r, layerY, Math.sin(ang) * (idx === 0 ? 240 : 290));
            if (i === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.strokeStyle = idx === 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)';
          ctx.stroke();
        });
      }

      // 4. Interpolate node 3D positions & project
      const projectedMap = new Map<
        string,
        {
          node: Node3D;
          sx: number;
          sy: number;
          topSx: number;
          topSy: number;
          scale: number;
          depth: number;
        }
      >();

      graphNodes.forEach(n => {
        let live = liveNodesRef.current.get(n.id);
        if (!live) {
          live = { x: n.tx, y: n.ty, z: n.tz, th: n.towerHeight };
          liveNodesRef.current.set(n.id, live);
        } else {
          live.x += (n.tx - live.x) * 0.085;
          live.y += (n.ty - live.y) * 0.085;
          live.z += (n.tz - live.z) * 0.085;
          live.th += (n.towerHeight - live.th) * 0.085;
        }

        // Gentle floating bobbing for Brand & Store nodes
        const floatOffset =
          n.kind === 'STAFF'
            ? 0
            : Math.sin(time * 0.03 + (n.tx + n.tz) * 0.01) * 4.5;

        const baseProj = project3D(live.x, live.y + floatOffset, live.z);
        const topProj =
          n.kind === 'STAFF'
            ? project3D(live.x, live.y - live.th, live.z)
            : baseProj;

        projectedMap.set(n.id, {
          node: n,
          sx: baseProj.sx,
          sy: baseProj.sy,
          topSx: topProj.sx,
          topSy: topProj.sy,
          scale: topProj.scale,
          depth: topProj.depth,
        });
      });

      // 5. Draw 3D Bezier Links & Animated Flowing Particles
      graphLinks.forEach(link => {
        const src = projectedMap.get(link.sourceId);
        const tgt = projectedMap.get(link.targetId);
        if (!src || !tgt) return;

        const isHighlighted =
          activeHighlightId &&
          (link.sourceId === activeHighlightId || link.targetId === activeHighlightId);
        const isDimmed =
          activeHighlightId &&
          !connectedNodeIds.has(link.sourceId) &&
          !connectedNodeIds.has(link.targetId);

        if (isDimmed && link.linkType === 'BRAND_TO_STORE') return;

        const x1 = src.topSx;
        const y1 = src.topSy;
        const x2 = tgt.topSx;
        const y2 = tgt.topSy;

        // Control point arched upward in 3D screen space
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - (isHighlighted ? 42 : 24) * ((src.scale + tgt.scale) * 0.5);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);

        if (isHighlighted) {
          ctx.strokeStyle = link.color;
          ctx.lineWidth = Math.max(1.6, link.weight * 1.4);
          ctx.globalAlpha = 0.92;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.25;
        } else {
          ctx.strokeStyle = link.color;
          ctx.lineWidth = link.weight;
          ctx.globalAlpha = link.linkType === 'BRAND_TO_STORE' ? 0.28 : 0.48;
        }
        ctx.stroke();

        // Flowing particles along quadratic bezier curve
        if (showParticles && (!isDimmed || isHighlighted)) {
          const particleCount = isHighlighted ? 3 : 1;
          for (let pIdx = 0; pIdx < particleCount; pIdx++) {
            const t = ((time * link.particleSpeed * 60 + pIdx * (1 / particleCount)) % 1 + 1) % 1;
            const invT = 1 - t;
            const px = invT * invT * x1 + 2 * invT * t * midX + t * t * x2;
            const py = invT * invT * y1 + 2 * invT * t * midY + t * t * y2;

            ctx.beginPath();
            ctx.arc(px, py, isHighlighted ? 3.2 : 2.1, 0, Math.PI * 2);
            ctx.fillStyle = isHighlighted ? '#ffffff' : link.color;
            ctx.globalAlpha = isHighlighted ? 0.98 : 0.75;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      });

      // 6. Sort Nodes back-to-front (Painter's Algorithm by 3D depth)
      const sortedProjected = Array.from(projectedMap.values()).sort(
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

      sortedProjected.forEach(item => {
        const { node, sx, sy, topSx, topSy, scale, depth } = item;
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isConnected = connectedNodeIds.has(node.id);
        const isDimmed = Boolean(activeHighlightId && !isConnected);

        ctx.globalAlpha = isDimmed ? 0.22 : 1.0;

        if (node.kind === 'STAFF' && node.staffData) {
          const st = node.staffData;
          const pillarWidth = Math.max(8, 17 * scale);
          const halfW = pillarWidth / 2;

          // 6a. Overload pulsing shockwave ring on the 3D floor
          if (st.loadStatus === 'OVERLOAD' && !isDimmed) {
            const pulse = ((time * 0.025) % 1);
            const pulseR = (18 + pulse * 30) * scale;
            ctx.beginPath();
            ctx.ellipse(sx, sy, pulseR, pulseR * 0.45, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.75 * (1 - pulse)})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Base shadow ellipse on floor
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 1.45, halfW * 0.65, 0, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.45)' : 'rgba(15, 23, 42, 0.75)';
          ctx.strokeStyle = node.colorPrimary;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.fill();
          ctx.stroke();

          // 6b. 3D Volumetric Cylinder Pillar (from floor `sy` up to `topSy`)
          const pillarGrad = ctx.createLinearGradient(sx - halfW, sy, topSx + halfW, topSy);
          pillarGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
          pillarGrad.addColorStop(0.35, node.colorSecondary);
          pillarGrad.addColorStop(1, node.colorPrimary);

          ctx.beginPath();
          ctx.moveTo(sx - halfW, sy);
          ctx.lineTo(topSx - halfW, topSy);
          ctx.lineTo(topSx + halfW, topSy);
          ctx.lineTo(sx + halfW, sy);
          ctx.closePath();
          ctx.fillStyle = pillarGrad;
          ctx.fill();

          // Highlight edge on 3D cylinder
          ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : 'rgba(255,255,255,0.28)';
          ctx.lineWidth = isSelected || isHovered ? 1.8 : 0.8;
          ctx.stroke();

          // 6c. Target Capacity Ring (100% Level Benchmark Ring on the 3D Tower)
          const live = liveNodesRef.current.get(node.id);
          if (live) {
            const capHeight = Math.max(32, Math.min(180, st.targetCapacityPts * 0.88));
            const capProj = project3D(live.x, live.y - capHeight, live.z);
            ctx.beginPath();
            ctx.ellipse(
              capProj.sx,
              capProj.sy,
              halfW * 1.35,
              halfW * 0.52,
              0,
              0,
              Math.PI * 2
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1.1;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // 6d. Top glowing 3D Energy Cap / Sphere of the Staff Tower
          const orbR = Math.max(6, node.radius * scale);
          const orbGrad = ctx.createRadialGradient(
            topSx - orbR * 0.3,
            topSy - orbR * 0.3,
            orbR * 0.1,
            topSx,
            topSy,
            orbR * 1.35
          );
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.45, node.colorPrimary);
          orbGrad.addColorStop(1, node.colorSecondary);

          ctx.beginPath();
          ctx.arc(topSx, topSy, orbR, 0, Math.PI * 2);
          ctx.fillStyle = orbGrad;
          ctx.fill();

          if (isSelected || isHovered) {
            ctx.beginPath();
            ctx.arc(topSx, topSy, orbR + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }

          // 6e. Crisp Floating 3D Label above Staff Tower
          if (!isDimmed || scale > 0.72) {
            const labelY = topSy - orbR - 12;
            ctx.font = `${isSelected || isHovered ? '700' : '600'} ${Math.max(10, Math.round(11.5 * scale))}px Inter, system-ui, sans-serif`;
            const nameText = `${st.name} (${st.level})`;
            const metricText = `${st.totalPts.toFixed(0)}pt · ${st.loadPct}%`;
            const badgeW = Math.max(ctx.measureText(nameText).width, ctx.measureText(metricText).width) + 14;
            const badgeH = 30 * Math.max(0.82, scale);

            ctx.fillStyle = isSelected
              ? 'rgba(15, 23, 42, 0.96)'
              : 'rgba(15, 23, 42, 0.84)';
            ctx.beginPath();
            ctx.roundRect(topSx - badgeW / 2, labelY - badgeH, badgeW, badgeH, 6);
            ctx.fill();
            ctx.strokeStyle = isSelected
              ? '#38bdf8'
              : st.loadStatus === 'OVERLOAD'
                ? 'rgba(244, 63, 94, 0.75)'
                : 'rgba(148, 163, 184, 0.32)';
            ctx.lineWidth = isSelected ? 1.6 : 1;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(nameText, topSx, labelY - badgeH * 0.54);

            ctx.font = `700 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
            ctx.fillStyle =
              st.loadStatus === 'OVERLOAD'
                ? '#fda4af'
                : st.loadStatus === 'UNDERLOAD'
                  ? '#a5b4fc'
                  : '#6ee7b7';
            ctx.fillText(metricText, topSx, labelY - badgeH * 0.16);
          }

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: (topSy + sy) / 2,
            sr: Math.max(18, orbR * 1.6),
            topY: topSy,
            depth,
          });
        } else if (node.kind === 'BRAND') {
          // 6f. 3D Brand Hexagon / Diamond Node
          const r = Math.max(6, node.radius * scale);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const hx = topSx + Math.cos(ang) * r;
            const hy = topSy + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fillStyle = node.colorPrimary;
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : '#fef3c7';
          ctx.lineWidth = isSelected || isHovered ? 2.2 : 1.2;
          ctx.stroke();

          if (!isDimmed && (scale > 0.65 || isConnected || isSelected || isHovered)) {
            ctx.font = `600 ${Math.max(9, Math.round(10.5 * scale))}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fde68a';
            ctx.fillText(node.label, topSx, topSy - r - 5);
          }

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: topSy,
            sr: Math.max(14, r * 1.5),
            topY: topSy,
            depth,
          });
        } else {
          // 6g. 3D Store Satellite Orb
          const r = Math.max(4.5, node.radius * scale);
          ctx.beginPath();
          ctx.arc(topSx, topSy, r, 0, Math.PI * 2);
          ctx.fillStyle = node.colorPrimary;
          ctx.fill();
          ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : 'rgba(255,255,255,0.5)';
          ctx.lineWidth = isSelected || isHovered ? 2 : 1;
          ctx.stroke();

          if ((isConnected && activeHighlightId) || isSelected || isHovered) {
            ctx.font = `500 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(`${node.label} (${node.subLabel})`, topSx, topSy - r - 5);
          }

          nextHitRegions.push({
            id: node.id,
            sx: topSx,
            sy: topSy,
            sr: Math.max(12, r * 1.6),
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
  }, [
    graphNodes,
    graphLinks,
    autoRotate,
    showParticles,
    selectedNodeId,
    hoveredNodeId,
    activeHighlightId,
    connectedNodeIds,
    layoutMode,
  ]);

  // Canvas Mouse & Wheel Interaction Handlers
  const findHitNodeAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    // Check front-to-back (reverse of back-to-front sorted array)
    const regions = projectedScreenNodesRef.current;
    for (let i = regions.length - 1; i >= 0; i--) {
      const reg = regions[i];
      const dx = mx - reg.sx;
      const dyTop = my - reg.topY;
      const dyMid = my - reg.sy;
      if (
        Math.hypot(dx, dyTop) <= reg.sr ||
        (Math.abs(dx) <= reg.sr * 0.85 && Math.abs(dyMid) <= reg.sr * 1.4)
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
      cameraRef.current.targetYaw += dx * 0.0065;
      cameraRef.current.targetPitch = Math.max(
        -0.35,
        Math.min(1.05, cameraRef.current.targetPitch + dy * 0.0055)
      );
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    } else {
      const hitId = findHitNodeAt(e.clientX, e.clientY);
      if (hitId !== hoveredNodeId) {
        setHoveredNodeId(hitId);
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
      0.52,
      Math.min(2.3, cameraRef.current.targetZoom * factor)
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
    onNotify?.(`Đã điều chuyển vị trí trên thương hiệu ${foundBrand.name} sang ${newStaffName}`, 'success');
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
    onNotify?.(`Đã cập nhật Hệ số gian hàng ${foundStore.storeName} thành ×${newCoef.toFixed(2)}`, 'success');
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
              Trụ Tải Trọng 3D
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
              Phân Tầng 3D (Nhân sự → Brand → Gian)
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutMode('FOCUS_ORBIT');
                if (selectedNodeId) flyToNode(selectedNodeId);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                layoutMode === 'FOCUS_ORBIT'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Quỹ Đạo Tâm Điểm
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

          {/* Layer visibility toggles */}
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sunken border border-line text-xs text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBrandsLayer}
              onChange={e => setShowBrandsLayer(e.target.checked)}
              className="rounded border-line"
            />
            <span>Tầng Brand</span>
          </label>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sunken border border-line text-xs text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showStoresLayer}
              onChange={e => setShowStoresLayer(e.target.checked)}
              className="rounded border-line"
            />
            <span>Tầng Gian hàng</span>
          </label>
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
              className="h-8 pl-8 pr-7 rounded-lg bg-sunken border border-line text-xs text-ink placeholder:text-ink-3 w-56 focus:outline-none focus:border-accent"
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
        <div className="lg:col-span-8 bg-[#070d1d] border border-slate-800 rounded-2xl overflow-hidden relative shadow-lg">
          {/* Top-left 3D Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/80 text-[11px] text-slate-200 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block shadow-[0_0_8px_#f43f5e]" />
                <span>Trụ Đỏ: Quá tải (≥115%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]" />
                <span>Trụ Xanh: Đủ tải (85–114%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block shadow-[0_0_8px_#6366f1]" />
                <span>Trụ Tím: Dư công suất (&lt;85%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Brand</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>TikTok / Shopee</span>
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
                  : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
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
                  : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Luồng hạt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                cameraRef.current.targetZoom = Math.min(2.2, cameraRef.current.targetZoom * 1.2);
              }}
              title="Phóng to không gian 3D"
              className="w-8 h-8 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                cameraRef.current.targetZoom = Math.max(0.55, cameraRef.current.targetZoom * 0.82);
              }}
              title="Thu nhỏ không gian 3D"
              className="w-8 h-8 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedNodeId(null);
                flyToNode(null, true);
              }}
              title="Đặt lại góc nhìn 3D toàn cảnh"
              className="h-8 px-2.5 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Toàn cảnh</span>
            </button>
          </div>

          {/* Interactive 3D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-[560px] block cursor-grab active:cursor-grabbing select-none"
          />

          {/* Bottom-left Quick Staff Workload Bar inside 3D Viewport */}
          <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Click chọn nhanh Nhân sự để bay (Fly-To) tới Trụ Tải Trọng 3D · Kéo chuột để xoay 360°
              </span>
              <span className="text-[11px] text-slate-400">
                Vòng nét đứt trắng trên trụ = Định mức chuẩn 100% theo Level
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {filteredStaff
                .slice()
                .sort((a, b) => b.loadPct - a.loadPct)
                .map(st => {
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
                      <span className="truncate max-w-[115px]">{st.name}</span>
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
                  Click trực tiếp vào trụ tải trọng 3D hoặc thanh nhân sự phía dưới để camera tự động bay đến, làm sáng toàn bộ nhánh phụ trách và mở bảng điều phối chi tiết.
                </p>
              </div>
            </div>
          ) : selectedNode.kind === 'STAFF' && selectedNode.staffData ? (
            /* ==================== STAFF INSPECTOR ==================== */
            (() => {
              const st = selectedNode.staffData;
              return (
                <div className="divide-y divide-line max-h-[640px] overflow-y-auto">
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
                          title={`Điểm GĐ giao & Brand: ${st.directorPts.toFixed(1)} pt`}
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
                            <span>{cand.name}</span>
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
                <div className="divide-y divide-line max-h-[640px] overflow-y-auto">
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

                  {/* 3 Brand-level Positions */}
                  <div className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Đội ngũ phụ trách cấp Brand (Điều phối trực tiếp)
                    </h4>
                    {(
                      [
                        {
                          label: 'Content / Brand Main',
                          field: 'contentBrandMainPic' as const,
                          current: contentMain,
                        },
                        {
                          label: 'Plan / Strategy',
                          field: 'planStrategyPic' as const,
                          current: planStrat,
                        },
                        {
                          label: 'Key Visual / SIS',
                          field: 'keyVisualSisPic' as const,
                          current: kvSis,
                        },
                        {
                          label: 'Booking Lead',
                          field: 'bookingPicLead' as const,
                          current: bookingLead,
                        },
                      ]
                    ).map(roleItem => {
                      const matchedStaff = staffWorkloads.find(
                        sw => sw.name.toLowerCase() === roleItem.current.toLowerCase()
                      );
                      return (
                        <div
                          key={roleItem.field}
                          className="p-2.5 rounded-xl bg-sunken/50 border border-line space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-2xs">
                            <span className="font-semibold text-ink-2">{roleItem.label}</span>
                            {matchedStaff && (
                              <button
                                type="button"
                                onClick={() => handleSelectAndFly(matchedStaff.id)}
                                className={`font-bold cursor-pointer ${
                                  matchedStaff.loadStatus === 'OVERLOAD'
                                    ? 'text-critical'
                                    : 'text-positive'
                                }`}
                              >
                                Tải: {matchedStaff.loadPct}% ({matchedStaff.totalPts.toFixed(0)} pt)
                              </button>
                            )}
                          </div>
                          <select
                            value={roleItem.current}
                            onChange={e =>
                              handleReassignBrandRole(b.id, roleItem.field, e.target.value)
                            }
                            className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink font-medium"
                          >
                            {staffWorkloads.map(sw => (
                              <option key={sw.id} value={sw.name}>
                                {sw.name} ({sw.level} · Tải {sw.loadPct}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stores of this Brand */}
                  <div className="p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Gian hàng thuộc Brand ({brandStores.length})
                    </h4>
                    {brandStores.map(st => (
                      <div
                        key={st.id}
                        className="p-2.5 rounded-xl bg-sunken/40 border border-line flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAndFly(`store-${st.id}`)}
                            className="text-xs font-semibold text-ink hover:text-accent truncate block cursor-pointer"
                          >
                            {st.storeName}
                          </button>
                          <div className="text-2xs text-ink-3">
                            PIC: <strong className="text-ink-2">{st.b2cOwnerName}</strong> · HS ×
                            {normalizeStoreCoefficient(st.difficultyTier, st.difficultyMultiplier).multiplier.toFixed(2)}
                          </div>
                        </div>
                        <ChannelTag channel={st.platform} />
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
              const coef = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier;
              return (
                <div className="divide-y divide-line max-h-[640px] overflow-y-auto">
                  <div className="p-4 bg-sunken/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <ChannelTag channel={s.platform} />
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

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-surface border border-line">
                        <div className="text-2xs text-ink-3">Ngân sách Order Net</div>
                        <div className="font-bold text-ink">
                          {formatVndShort(s.budgetNet || s.monthlyBudget || 0)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface border border-line">
                        <div className="text-2xs text-ink-3">Hệ số độ khó (Bảng 2)</div>
                        <div className="font-bold text-accent">×{coef.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink block">
                        Chuyên viên PIC Gian hàng (B2C Owner)
                      </label>
                      <select
                        value={s.b2cOwnerName}
                        onChange={e => handleReassignStorePic(s.id, e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink font-medium"
                      >
                        {staffWorkloads.map(sw => (
                          <option key={sw.id} value={sw.name}>
                            {sw.name} ({sw.level} · Tải {sw.loadPct}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink block">
                        Điều chỉnh Hệ số phạm vi Gian hàng (Bảng 2)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STORE_SCOPE_TABLE_2.map(item => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => handleChangeStoreCoef(s.id, item.coef)}
                            className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                              Math.abs(coef - item.coef) < 0.02
                                ? 'bg-accent-soft border-accent text-accent font-bold'
                                : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                            }`}
                          >
                            <div className="text-xs">×{item.coef.toFixed(2)}</div>
                            <div className="text-[10px] text-ink-3">{item.label}</div>
                          </button>
                        ))}
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
