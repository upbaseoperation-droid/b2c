'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  Send,
  Video,
} from 'lucide-react';
import type {
  BookingDealItem,
  InputPlanBreakdownState,
  KocItem,
  SalaryGrade,
  StorePortfolioItem,
  UserProfile,
  UserRole,
} from '@/lib/types';
import {
  computeGrossFeeWithTax,
  normalizeTikTokId,
} from '@/lib/staffBrandListingSheet';
import {
  buildBookingDealFromApprovedItem,
  loadApprovedBookingList,
  mapTepBookingToSalaryGrade,
  recalculateApprovedBookingItem,
  saveApprovedBookingList,
  type ApprovedBookingListItem,
} from '@/lib/approvedBookingList';
import {
  Button,
  ChannelTag,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Person,
  Select,
  Stat,
  StatRow,
  Status,
  Textarea,
  type Column,
} from '@/components/ui';

export const LIVESTREAM_LISTING_31_STORAGE_KEY = 'upbase_b2c_livestream_listing_31_v1';

export type LivestreamPackageType = 'Độc quyền' | 'Ghép giỏ (Add-in)' | 'Chỉ Hoa hồng';
export type LivestreamBrandChoice = 'Yes' | 'No' | 'Cân nhắc';

export interface LivestreamKolCatalogItem {
  id: string;
  idKenh: string;
  tenKenh: string;
  platform: 'TikTok Shop' | 'Shopee Live' | 'Facebook Live';
  followers: number;
  niche: string;
  avgGmvPerSession: number;
  maxGmvSession: number;
  avgPcu: number;
  refNetRateVnd: number;
  defaultCommissionPct: number;
  mcnOrAgency?: string;
}

/**
 * Danh bạ 7.1 KOL Livestream thực tế trên Lark Base (tbl28Npub9tlIrzz)
 */
export const KOL_LIVESTREAM_71_CATALOG: LivestreamKolCatalogItem[] = [
  {
    id: 'KOL71-001',
    idKenh: 'callme.duy',
    tenKenh: 'Call Me Duy',
    platform: 'TikTok Shop',
    followers: 1450000,
    niche: 'Beauty / Skincare',
    avgGmvPerSession: 165000000,
    maxGmvSession: 420000000,
    avgPcu: 1850,
    refNetRateVnd: 25000000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'Cá nhân / Chính chủ',
  },
  {
    id: 'KOL71-002',
    idKenh: 'vo.ha.linh',
    tenKenh: 'Võ Hà Linh',
    platform: 'TikTok Shop',
    followers: 4200000,
    niche: 'Mega Live / Beauty & FMCG',
    avgGmvPerSession: 450000000,
    maxGmvSession: 1200000000,
    avgPcu: 8500,
    refNetRateVnd: 45000000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'Hà Linh Official Studio',
  },
  {
    id: 'KOL71-003',
    idKenh: 'hannaholala',
    tenKenh: 'Hannah Olala',
    platform: 'TikTok Shop',
    followers: 1620000,
    niche: 'Luxury Skincare / Beauty',
    avgGmvPerSession: 260000000,
    maxGmvSession: 680000000,
    avgPcu: 2400,
    refNetRateVnd: 35000000,
    defaultCommissionPct: 12,
    mcnOrAgency: 'Olala Media',
  },
  {
    id: 'KOL71-004',
    idKenh: 'goc.cua.ru',
    tenKenh: 'Góc Của Rư',
    platform: 'TikTok Shop',
    followers: 860000,
    niche: 'Makeup & Dược mỹ phẩm',
    avgGmvPerSession: 120000000,
    maxGmvSession: 240000000,
    avgPcu: 1250,
    refNetRateVnd: 18000000,
    defaultCommissionPct: 12,
    mcnOrAgency: 'Cá nhân',
  },
  {
    id: 'KOL71-005',
    idKenh: 'hangkat6668',
    tenKenh: 'Hằng Kat',
    platform: 'TikTok Shop',
    followers: 920000,
    niche: 'Fashion & Personal Care',
    avgGmvPerSession: 95000000,
    maxGmvSession: 210000000,
    avgPcu: 1100,
    refNetRateVnd: 15000000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'Kat Studio',
  },
  {
    id: 'KOL71-006',
    idKenh: 'chuthanhhuyen.official',
    tenKenh: 'Chu Thanh Huyền',
    platform: 'TikTok Shop',
    followers: 2100000,
    niche: 'Beauty / Mom & Baby',
    avgGmvPerSession: 220000000,
    maxGmvSession: 540000000,
    avgPcu: 3100,
    refNetRateVnd: 30000000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'CTH Media',
  },
  {
    id: 'KOL71-007',
    idKenh: 'samngofficial',
    tenKenh: 'Sam Nguyễn Official',
    platform: 'TikTok Shop',
    followers: 1850000,
    niche: 'Celeb / Skincare & Mom Baby',
    avgGmvPerSession: 190000000,
    maxGmvSession: 380000000,
    avgPcu: 2200,
    refNetRateVnd: 28000000,
    defaultCommissionPct: 12,
    mcnOrAgency: 'Sam Entertainment',
  },
  {
    id: 'KOL71-008',
    idKenh: 'mebimsuathongthai',
    tenKenh: 'Mẹ Bỉm Sữa Thông Thái',
    platform: 'TikTok Shop',
    followers: 420000,
    niche: 'Mẹ & Bé',
    avgGmvPerSession: 65000000,
    maxGmvSession: 135000000,
    avgPcu: 780,
    refNetRateVnd: 9500000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'Cá nhân',
  },
  {
    id: 'KOL71-009',
    idKenh: 'chole.review',
    tenKenh: 'Chộ Lẹ Review',
    platform: 'TikTok Shop',
    followers: 530000,
    niche: 'Bodycare & Nước hoa',
    avgGmvPerSession: 55000000,
    maxGmvSession: 110000000,
    avgPcu: 650,
    refNetRateVnd: 8500000,
    defaultCommissionPct: 18,
    mcnOrAgency: 'Cá nhân',
  },
  {
    id: 'KOL71-010',
    idKenh: 'senadaily',
    tenKenh: 'Sena Daily',
    platform: 'TikTok Shop',
    followers: 380000,
    niche: 'Skincare / Lifestyle',
    avgGmvPerSession: 42000000,
    maxGmvSession: 88000000,
    avgPcu: 520,
    refNetRateVnd: 6500000,
    defaultCommissionPct: 15,
    mcnOrAgency: 'UpAffiliate Creator',
  },
];

export interface LivestreamListingProposalRow {
  id: string;
  thangPlan: string;
  dot: 'Đợt 1' | 'Đợt 2' | 'Đợt 3';
  storeName: string;
  brandName: string;
  picName: string;
  leaderName: string;
  idKenh: string;
  tenKenh: string;
  platform: 'TikTok Shop' | 'Shopee Live' | 'Facebook Live';
  followers: number;
  niche: string;
  avgGmvPerSession: number;
  packageType: LivestreamPackageType;
  committedMinutes: number;
  sessionsCount: number;
  plannedAirDate: string;
  liveStartTime: string;
  liveEndTime: string;
  netFeeVnd: number;
  grossFeeVnd: number;
  taxAccountType: string;
  commissionPct: number;
  gmvBonusTier: string;
  targetGmvVnd: number;
  targetOrders: number;
  kpiType: 'Cam kết' | 'Tham chiếu';
  skuSummary: string;
  dealPriceVoucherInfo: string;
  committedStock: number;
  exclusivityNote: string;
  brandDecision: LivestreamBrandChoice;
  brandFeedback?: string;
  maBooking?: string;
  transferredTo32?: boolean;
  createdAt: string;
}

const INITIAL_LIVESTREAM_PROPOSALS_31: LivestreamListingProposalRow[] = [
  {
    id: 'LS31-2610-001',
    thangPlan: '2026/10',
    dot: 'Đợt 1',
    storeName: 'ClubClio_TikTok_E2E-S',
    brandName: 'ClubClio',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    idKenh: 'callme.duy',
    tenKenh: 'Call Me Duy',
    platform: 'TikTok Shop',
    followers: 1450000,
    niche: 'Beauty / Skincare',
    avgGmvPerSession: 165000000,
    packageType: 'Độc quyền',
    committedMinutes: 120,
    sessionsCount: 1,
    plannedAirDate: '2026-10-15',
    liveStartTime: '20:00',
    liveEndTime: '22:00',
    netFeeVnd: 25000000,
    grossFeeVnd: Math.round(25000000 / 0.9),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
    commissionPct: 15,
    gmvBonusTier: 'Đạt 150tr thưởng thêm 3% GMV vượt mốc',
    targetGmvVnd: 150000000,
    targetOrders: 350,
    kpiType: 'Cam kết',
    skuSummary: 'Combo Cushion Kill Cover Mesh Glow + Son Peripera Ink Mood Glowy Tint',
    dealPriceVoucherInfo: 'Cushion giảm còn 429k + Tặng lõi refill · Voucher 18%',
    committedStock: 600,
    exclusivityNote: 'Không lên sản phẩm Cushion đối thủ trong cùng phiên Live',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2610-001',
    transferredTo32: true,
    createdAt: '2026-10-02T09:00:00.000Z',
  },
  {
    id: 'LS31-2610-002',
    thangPlan: '2026/10',
    dot: 'Đợt 2',
    storeName: 'Babe_TikTok_E2E-S',
    brandName: 'Babé',
    picName: 'Lê Phương Thảo',
    leaderName: '',
    idKenh: 'goc.cua.ru',
    tenKenh: 'Góc Của Rư',
    platform: 'TikTok Shop',
    followers: 860000,
    niche: 'Makeup & Dược mỹ phẩm',
    avgGmvPerSession: 120000000,
    packageType: 'Độc quyền',
    committedMinutes: 120,
    sessionsCount: 1,
    plannedAirDate: '2026-10-20',
    liveStartTime: '20:30',
    liveEndTime: '22:30',
    netFeeVnd: 18000000,
    grossFeeVnd: Math.round(18000000 / 0.9),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
    commissionPct: 12,
    gmvBonusTier: 'Đạt 100tr thưởng nóng 2.000.000đ',
    targetGmvVnd: 100000000,
    targetOrders: 220,
    kpiType: 'Cam kết',
    skuSummary: 'Kem dưỡng phục hồi Babé Stop AKN Repairing Moisturizer + Sữa rửa mặt 200ml',
    dealPriceVoucherInfo: 'Combo Sữa rửa mặt + Kem dưỡng giá độc quyền 689k · Voucher 15%',
    committedStock: 400,
    exclusivityNote: 'Độc quyền dược mỹ phẩm chăm sóc da dầu mụn trong khung giờ Live',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2610-002',
    transferredTo32: true,
    createdAt: '2026-10-04T09:00:00.000Z',
  },
  {
    id: 'LS31-2610-003',
    thangPlan: '2026/10',
    dot: 'Đợt 2',
    storeName: 'Kutieskin_TikTok_E2E-S',
    brandName: 'Kutieskin',
    picName: 'Trần Thị Thu Trang',
    leaderName: '',
    idKenh: 'mebimsuathongthai',
    tenKenh: 'Mẹ Bỉm Sữa Thông Thái',
    platform: 'TikTok Shop',
    followers: 420000,
    niche: 'Mẹ & Bé',
    avgGmvPerSession: 65000000,
    packageType: 'Ghép giỏ (Add-in)',
    committedMinutes: 120,
    sessionsCount: 1,
    plannedAirDate: '2026-10-25',
    liveStartTime: '19:30',
    liveEndTime: '21:30',
    netFeeVnd: 9500000,
    grossFeeVnd: Math.round(9500000 / 0.9),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
    commissionPct: 15,
    gmvBonusTier: 'Đạt 60tr thưởng thêm 2% hoa hồng',
    targetGmvVnd: 60000000,
    targetOrders: 280,
    kpiType: 'Tham chiếu',
    skuSummary: 'Bộ đôi Kem mẩn ngứa & Kem dưỡng ẩm Kutieskin cho bé',
    dealPriceVoucherInfo: 'Mua 2 tặng 1 Sữa tắm gội thảo dược 50ml · Voucher 40k',
    committedStock: 500,
    exclusivityNote: 'Không gắn sản phẩm kem bôi da trẻ em khác trong phiên Live',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2610-003',
    transferredTo32: true,
    createdAt: '2026-10-06T09:00:00.000Z',
  },
  {
    id: 'LS31-2610-004',
    thangPlan: '2026/10',
    dot: 'Đợt 3',
    storeName: 'Rejuran_TikTok_E2E-S',
    brandName: 'Rejuran',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    idKenh: 'hannaholala',
    tenKenh: 'Hannah Olala',
    platform: 'TikTok Shop',
    followers: 1620000,
    niche: 'Luxury Skincare / Beauty',
    avgGmvPerSession: 260000000,
    packageType: 'Độc quyền',
    committedMinutes: 120,
    sessionsCount: 1,
    plannedAirDate: '2026-10-29',
    liveStartTime: '21:00',
    liveEndTime: '23:00',
    netFeeVnd: 35000000,
    grossFeeVnd: Math.round(35000000 / 0.9),
    taxAccountType: 'Công ty / MCN (Xuất HĐ VAT 8-10%)',
    commissionPct: 12,
    gmvBonusTier: 'Đạt 250tr thưởng thêm 3% GMV toàn phiên',
    targetGmvVnd: 250000000,
    targetOrders: 180,
    kpiType: 'Cam kết',
    skuSummary: 'Tinh chất trẻ hóa chuyên sâu Rejuran Healer Turnover Ampoule Dual Effect 30ml',
    dealPriceVoucherInfo: 'Bộ Ampoule 30ml tặng Mặt nạ Rejuran trị giá 450k · Voucher 20%',
    committedStock: 350,
    exclusivityNote: 'Độc quyền ngành hàng serum phục hồi cao cấp trong phiên',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2610-004',
    transferredTo32: true,
    createdAt: '2026-10-08T09:00:00.000Z',
  },
  {
    id: 'LS31-2610-005',
    thangPlan: '2026/10',
    dot: 'Đợt 3',
    storeName: 'ClubClio_TikTok_E2E-S',
    brandName: 'ClubClio',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    idKenh: 'hangkat6668',
    tenKenh: 'Hằng Kat',
    platform: 'TikTok Shop',
    followers: 920000,
    niche: 'Fashion & Personal Care',
    avgGmvPerSession: 95000000,
    packageType: 'Ghép giỏ (Add-in)',
    committedMinutes: 60,
    sessionsCount: 2,
    plannedAirDate: '2026-10-28',
    liveStartTime: '20:00',
    liveEndTime: '21:00',
    netFeeVnd: 15000000,
    grossFeeVnd: Math.round(15000000 / 0.9),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
    commissionPct: 15,
    gmvBonusTier: 'Đạt 90tr thưởng thêm 2.000.000đ',
    targetGmvVnd: 90000000,
    targetOrders: 240,
    kpiType: 'Tham chiếu',
    skuSummary: 'Son kem lì Peripera Ink Velvet + Chì kẻ mày Clio Kill Brow',
    dealPriceVoucherInfo: 'Mua 2 cây son giảm 30% + Freeship Extra',
    committedStock: 450,
    exclusivityNote: 'Không ghim son kem đối thủ trong khung giờ lên sóng',
    brandDecision: 'Yes',
    transferredTo32: false,
    createdAt: '2026-10-10T09:00:00.000Z',
  },
  {
    id: 'LS31-2610-006',
    thangPlan: '2026/10',
    dot: 'Đợt 3',
    storeName: 'Kutieskin_TikTok_E2E-S',
    brandName: 'Kutieskin',
    picName: 'Trần Thị Thu Trang',
    leaderName: '',
    idKenh: 'chuthanhhuyen.official',
    tenKenh: 'Chu Thanh Huyền',
    platform: 'TikTok Shop',
    followers: 2100000,
    niche: 'Beauty / Mom & Baby',
    avgGmvPerSession: 220000000,
    packageType: 'Độc quyền',
    committedMinutes: 90,
    sessionsCount: 1,
    plannedAirDate: '2026-10-30',
    liveStartTime: '20:30',
    liveEndTime: '22:00',
    netFeeVnd: 28000000,
    grossFeeVnd: Math.round(28000000 / 0.9),
    taxAccountType: 'Hộ kinh doanh (Kèm ĐKKD)',
    commissionPct: 15,
    gmvBonusTier: 'Đạt 180tr thưởng thêm 3% GMV vượt mốc',
    targetGmvVnd: 180000000,
    targetOrders: 520,
    kpiType: 'Cam kết',
    skuSummary: 'Combo Đại Gia Đình Kutieskin: Kem chàm sữa + Tinh dầu tràm + Nước tắm gội',
    dealPriceVoucherInfo: 'Combo 3 món giảm 25% tặng Khăn tắm sợi tre cho bé',
    committedStock: 800,
    exclusivityNote: 'Độc quyền ngành hàng chăm sóc da trẻ sơ sinh trong phiên Live',
    brandDecision: 'Cân nhắc',
    brandFeedback: 'Đang đàm phán giảm cát-xê cứng xuống 25tr + tăng HH lên 16%',
    transferredTo32: false,
    createdAt: '2026-10-11T09:00:00.000Z',
  },
  {
    id: 'LS31-2611-001',
    thangPlan: '2026/11',
    dot: 'Đợt 1',
    storeName: 'ClubClio_TikTok_E2E-S',
    brandName: 'ClubClio',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    idKenh: 'vo.ha.linh',
    tenKenh: 'Võ Hà Linh',
    platform: 'TikTok Shop',
    followers: 4200000,
    niche: 'Mega Live / Beauty & FMCG',
    avgGmvPerSession: 450000000,
    packageType: 'Độc quyền',
    committedMinutes: 180,
    sessionsCount: 1,
    plannedAirDate: '2026-11-10',
    liveStartTime: '20:00',
    liveEndTime: '23:00',
    netFeeVnd: 45000000,
    grossFeeVnd: Math.round(45000000 / 0.9),
    taxAccountType: 'Công ty / MCN (Xuất HĐ VAT 8-10%)',
    commissionPct: 15,
    gmvBonusTier: 'Đạt 400tr thưởng thêm 4% GMV vượt mốc',
    targetGmvVnd: 400000000,
    targetOrders: 950,
    kpiType: 'Cam kết',
    skuSummary: 'Mega Live 11/11: Trọn bộ ClubClio Cushion + Bảng mắt Pro Eye Palette',
    dealPriceVoucherInfo: 'Deal 11.11 Mua 1 Cushion tặng 1 Son tint fullsize · Voucher 25%',
    committedStock: 1500,
    exclusivityNote: 'Độc quyền ngành hàng Makeup Hàn Quốc trong khung giờ 20h-22h',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2611-001',
    transferredTo32: true,
    createdAt: '2026-10-22T09:00:00.000Z',
  },
  {
    id: 'LS31-2611-002',
    thangPlan: '2026/11',
    dot: 'Đợt 1',
    storeName: 'CindyBloom_TikTok_E2E-S',
    brandName: 'Cindy Bloom',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    idKenh: 'chole.review',
    tenKenh: 'Chộ Lẹ Review',
    platform: 'TikTok Shop',
    followers: 530000,
    niche: 'Bodycare & Nước hoa',
    avgGmvPerSession: 55000000,
    packageType: 'Ghép giỏ (Add-in)',
    committedMinutes: 120,
    sessionsCount: 1,
    plannedAirDate: '2026-11-11',
    liveStartTime: '19:00',
    liveEndTime: '21:00',
    netFeeVnd: 8500000,
    grossFeeVnd: Math.round(8500000 / 0.9),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
    commissionPct: 18,
    gmvBonusTier: 'Đạt 50tr thưởng thêm 3% hoa hồng',
    targetGmvVnd: 50000000,
    targetOrders: 240,
    kpiType: 'Tham chiếu',
    skuSummary: 'Bộ Nước hoa Cindy Bloom Aroma & Xịt thơm toàn thân 100ml',
    dealPriceVoucherInfo: 'Combo Nước hoa 50ml + Body Mist giảm 35% còn 299k',
    committedStock: 450,
    exclusivityNote: 'Không gắn nước hoa đối thủ trong phiên Live',
    brandDecision: 'Yes',
    maBooking: 'LIVE-2611-002',
    transferredTo32: true,
    createdAt: '2026-10-23T09:00:00.000Z',
  },
];

function loadLivestreamProposals31(): LivestreamListingProposalRow[] {
  if (typeof window === 'undefined') return INITIAL_LIVESTREAM_PROPOSALS_31;
  try {
    const raw = window.localStorage.getItem(LIVESTREAM_LISTING_31_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as LivestreamListingProposalRow[];
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_LIVESTREAM_PROPOSALS_31;
}

function saveLivestreamProposals31(rows: LivestreamListingProposalRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVESTREAM_LISTING_31_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota
  }
}

export interface LivestreamListingWorkspaceProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  currentUser?: UserProfile | null;
  currentRole?: UserRole;
  currentUserName: string;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  selectedStore: string;
  onChangeStore: (storeName: string) => void;
  onCreateOrUpdateDeals?: (deals: BookingDealItem[]) => void;
  onOpenDealBoard: (ctx?: { storeName?: string; monthKey?: string; dealCode?: string }) => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

const fmtVnd = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')} ₫`;

export function LivestreamListingWorkspace({
  kocs,
  stores,
  deals,
  currentUserName,
  selectedMonth,
  onChangeMonth,
  selectedStore,
  onChangeStore,
  onCreateOrUpdateDeals,
  onOpenDealBoard,
  onNotify,
}: LivestreamListingWorkspaceProps) {
  const [rows, setRows] = useState<LivestreamListingProposalRow[]>(() =>
    loadLivestreamProposals31()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState<'ALL' | 'Đợt 1' | 'Đợt 2' | 'Đợt 3'>('ALL');
  const [packageFilter, setPackageFilter] = useState<'ALL' | LivestreamPackageType>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | LivestreamBrandChoice>('ALL');
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Form state for proposing a new Host Live from 7.1 KOL catalog
  const [selectedKolId, setSelectedKolId] = useState<string>(KOL_LIVESTREAM_71_CATALOG[4].id);
  const [formStoreName, setFormStoreName] = useState<string>(
    selectedStore !== 'ALL' ? selectedStore : 'ClubClio_TikTok_E2E-S'
  );
  const [formMonth, setFormMonth] = useState<string>(
    selectedMonth !== 'ALL' ? selectedMonth : '2026/10'
  );
  const [formDot, setFormDot] = useState<'Đợt 1' | 'Đợt 2' | 'Đợt 3'>('Đợt 3');
  const [formPackageType, setFormPackageType] = useState<LivestreamPackageType>('Độc quyền');
  const [formCommittedMinutes, setFormCommittedMinutes] = useState<number>(120);
  const [formSessionsCount, setFormSessionsCount] = useState<number>(1);
  const [formPlannedDate, setFormPlannedDate] = useState<string>('2026-10-29');
  const [formStartTime, setFormStartTime] = useState<string>('20:00');
  const [formEndTime, setFormEndTime] = useState<string>('22:00');
  const [formNetFee, setFormNetFee] = useState<number>(15000000);
  const [formCommissionPct, setFormCommissionPct] = useState<number>(15);
  const [formBonusTier, setFormBonusTier] = useState<string>('Đạt 100tr thưởng thêm 3% GMV vượt mốc');
  const [formTargetGmv, setFormTargetGmv] = useState<number>(100000000);
  const [formTargetOrders, setFormTargetOrders] = useState<number>(250);
  const [formKpiType, setFormKpiType] = useState<'Cam kết' | 'Tham chiếu'>('Cam kết');
  const [formSkuSummary, setFormSkuSummary] = useState<string>(
    'Combo Sản phẩm Chiến dịch chủ lực + Quà tặng độc quyền phiên Live'
  );
  const [formDealVoucher, setFormDealVoucher] = useState<string>(
    'Giảm sâu 25% trên giá niêm yết + Voucher Live 18% + Freeship Extra'
  );
  const [formCommittedStock, setFormCommittedStock] = useState<number>(500);
  const [formExclusivity, setFormExclusivity] = useState<string>(
    'Không gắn giỏ sản phẩm đối thủ cùng phân khúc trong suốt phiên Live'
  );

  // Sync with existing ApprovedBookingList (3.2) to reflect any LIVE codes already created
  useEffect(() => {
    const approvedList = loadApprovedBookingList(kocs, stores, deals);
    const liveByChannelAndMonth = new Map<string, ApprovedBookingListItem>();
    for (const item of approvedList) {
      if (item.phanLoaiVideo === 'Livestream' || item.dinhDangNghiemThu === 'Phiên Livestream') {
        const key = `${item.thangPlan}__${normalizeTikTokId(item.idKenh).toLowerCase()}`;
        liveByChannelAndMonth.set(key, item);
      }
    }
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const key = `${r.thangPlan}__${normalizeTikTokId(r.idKenh).toLowerCase()}`;
        const matched = liveByChannelAndMonth.get(key);
        if (matched && matched.maBooking && r.maBooking !== matched.maBooking) {
          changed = true;
          return {
            ...r,
            maBooking: matched.maBooking,
            transferredTo32: true,
            brandDecision: 'Yes' as const,
          };
        }
        return r;
      });
      if (changed) saveLivestreamProposals31(next);
      return changed ? next : prev;
    });
  }, [kocs, stores, deals]);

  const b2cStores = useMemo(
    () => stores.filter((s) => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedMonth !== 'ALL' && r.thangPlan !== selectedMonth) return false;
      if (selectedStore !== 'ALL' && r.storeName !== selectedStore) return false;
      if (batchFilter !== 'ALL' && r.dot !== batchFilter) return false;
      if (packageFilter !== 'ALL' && r.packageType !== packageFilter) return false;
      if (decisionFilter !== 'ALL' && r.brandDecision !== decisionFilter) return false;
      if (q) {
        const hay = `${r.idKenh} ${r.tenKenh} ${r.brandName} ${r.storeName} ${r.skuSummary} ${r.maBooking || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, selectedMonth, selectedStore, batchFilter, packageFilter, decisionFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalSessions = filteredRows.reduce((s, r) => s + Math.max(1, r.sessionsCount), 0);
    const totalNetFee = filteredRows.reduce((s, r) => s + r.netFeeVnd, 0);
    const totalTargetGmv = filteredRows.reduce((s, r) => s + r.targetGmvVnd, 0);
    const approvedCount = filteredRows.filter((r) => r.brandDecision === 'Yes').length;
    const transferredCount = filteredRows.filter((r) => r.transferredTo32 && r.maBooking).length;
    const estimatedRoi = totalNetFee > 0 ? (totalTargetGmv / totalNetFee).toFixed(1) : '0.0';
    return {
      totalProposals: filteredRows.length,
      totalSessions,
      totalNetFee,
      totalTargetGmv,
      approvedCount,
      transferredCount,
      estimatedRoi,
    };
  }, [filteredRows]);

  const handleSelectCatalogKol = (kolId: string) => {
    setSelectedKolId(kolId);
    const found = KOL_LIVESTREAM_71_CATALOG.find((k) => k.id === kolId);
    if (found) {
      setFormNetFee(found.refNetRateVnd);
      setFormCommissionPct(found.defaultCommissionPct);
      setFormTargetGmv(found.avgGmvPerSession);
      setFormBonusTier(
        `Đạt ${(found.avgGmvPerSession / 1_000_000).toFixed(0)}tr thưởng thêm 3% GMV vượt mốc`
      );
    }
  };

  const handleUpdateBrandDecision = (rowId: string, decision: LivestreamBrandChoice) => {
    const next = rows.map((r) => (r.id === rowId ? { ...r, brandDecision: decision } : r));
    setRows(next);
    saveLivestreamProposals31(next);
    onNotify?.(`Đã cập nhật trạng thái Brand duyệt: ${decision}`, 'info');
  };

  const handleTransferRowTo32 = (row: LivestreamListingProposalRow) => {
    const currentApproved = loadApprovedBookingList(kocs, stores, deals);
    const cleanMonth = (row.thangPlan || '2026/10').replace(/\D/g, '');
    const yymm = cleanMonth.slice(2, 6) || '2610';
    const existingLiveCount = currentApproved.filter((i) =>
      /^LIVE[-_]/i.test(i.maBooking || '')
    ).length;
    const maBooking =
      row.maBooking || `LIVE-${yymm}-${String(existingLiveCount + 1).padStart(3, '0')}`;
    const klGrade: SalaryGrade = mapTepBookingToSalaryGrade(row.netFeeVnd);

    const newItem: ApprovedBookingListItem = recalculateApprovedBookingItem({
      id: `ABL-${maBooking}`,
      sourceSheetRowId: row.id,
      sourceSheetKey: `${row.thangPlan}__${row.storeName}`,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      maBooking,
      bookingOrderCreated: true,
      bookingOrderCreatedAt: new Date().toISOString(),
      thangPlan: row.thangPlan,
      dot: row.dot,
      storeName: row.storeName,
      brandName: row.brandName,
      nguoiPhuTrach: row.picName || currentUserName,
      leaderName: row.leaderName || '',
      idKenh: normalizeTikTokId(row.idKenh),
      tenKenh: row.tenKenh,
      linkKenh: `https://www.tiktok.com/@${normalizeTikTokId(row.idKenh)}`,
      tepKenh: 'Livestream Host / KOC',
      follower: row.followers,
      sanPham: row.skuSummary,
      pillarContent: `Livestream ${row.packageType}`,
      contentAngle: `Phiên Live ${row.liveStartTime}-${row.liveEndTime} (${row.committedMinutes} phút × ${row.sessionsCount} buổi) — ${row.dealPriceVoucherInfo}`,
      phanLoaiVideo: 'Livestream',
      dinhDangNghiemThu: 'Phiên Livestream',
      hinhThucHopTac: row.netFeeVnd > 0 ? 'Rebook' : 'FOC',
      giaDeXuatNet: row.netFeeVnd,
      chiPhiBookingNetCuoi: row.netFeeVnd,
      chiPhiGrossKemThue: computeGrossFeeWithTax(row.netFeeVnd, row.taxAccountType),
      klGrade,
      plannedAirDate: row.plannedAirDate,
      plannedSendSampleDate: '',
      plannedScriptDate: '',
      plannedDemoDate: '',
      soTienTamUngTruoc: 0,
      loaiTaiKhoanThanhToan: row.taxAccountType,
      ghiChu: `Gói ${row.packageType} · HH ${row.commissionPct}% · KPI ${row.kpiType} ${(row.targetGmvVnd / 1_000_000).toFixed(0)}M`,
      pipelineStatus: 'Đang thực thi (Đã tạo BO)',
      acceptanceStatus: 'CHUA_NGHIEM_THU',
      linkAir: '',
      videoId: '',
      actualAirDate: '',
      ngayDienLinkAir: '',
      tuanReal: '',
      thangAirReal: '',
      trangThaiSlaAir: 'Chưa lên sóng',
      diffDaysAir: 0,
      sparkAdsCode: '',
      views14d: 0,
      orders14d: 0,
      gmv14d: 0,
      gpm14d: 0,
      roi14d: 0,
      views30d: 0,
      orders30d: 0,
      gmv30d: 0,
      gpm30d: 0,
      roi30d: 0,
      danhGiaHieuQuaVideo: 'Chờ lên sóng',
      soTienCanThanhToan: row.netFeeVnd,
      soTienDaThanhToan: 0,
      trangThaiPhieuThanhToan: 'Chờ nghiệm thu',
      noiDungChuyenKhoan: '',
      nguoiNhanHang: row.tenKenh,
      sdtNhanHang: '',
      diaChiNhanHang: '',
      tenTaiKhoanNganHang: '',
      soTaiKhoan: '',
      nganHang: '',
      soCccd: '',
      loaiThanhToanLark: 'Thanh toán Booking Livestream',
      livePackageType: row.packageType,
      liveStartTime: row.liveStartTime,
      liveEndTime: row.liveEndTime,
      liveCommittedMinutes: row.committedMinutes,
      liveSessionsCount: row.sessionsCount,
      liveCommissionPct: row.commissionPct,
      liveGmvBonusTier: row.gmvBonusTier,
      liveTargetGmv: row.targetGmvVnd,
      liveTargetOrders: row.targetOrders,
      liveKpiType: row.kpiType,
      liveDealPriceInfo: row.dealPriceVoucherInfo,
      liveVoucherInfo: row.dealPriceVoucherInfo,
      liveCommittedStock: row.committedStock,
      liveExclusivityNote: row.exclusivityNote,
      liveKocConfirmed: true,
      liveBrandConfirmed: true,
      liveLeaderConfirmed: true,
    });

    const existingIdx = currentApproved.findIndex(
      (i) => i.maBooking === maBooking || i.sourceSheetRowId === row.id
    );
    const nextApproved = [...currentApproved];
    if (existingIdx >= 0) {
      nextApproved[existingIdx] = newItem;
    } else {
      nextApproved.unshift(newItem);
    }
    saveApprovedBookingList(nextApproved, true);

    const dealItem = buildBookingDealFromApprovedItem(newItem);
    onCreateOrUpdateDeals?.([dealItem]);

    const nextRows = rows.map((r) =>
      r.id === row.id
        ? { ...r, brandDecision: 'Yes' as const, maBooking, transferredTo32: true }
        : r
    );
    setRows(nextRows);
    saveLivestreamProposals31(nextRows);

    onNotify?.(
      `Đã tạo mã ${maBooking} cho Host ${row.tenKenh} và đồng bộ sang Bảng 3.2 (Deal & Nghiệm thu Live).`,
      'success'
    );
  };

  const handleCreateProposal = () => {
    const catalogKol =
      KOL_LIVESTREAM_71_CATALOG.find((k) => k.id === selectedKolId) ||
      KOL_LIVESTREAM_71_CATALOG[0];
    const storeObj = b2cStores.find((s) => s.storeName === formStoreName);
    const brandName =
      storeObj?.brandName || formStoreName.split('_')[0] || 'ClubClio';
    const taxType =
      formNetFee <= 0
        ? 'FOC / Gửi mẫu 0đ (Không phát sinh thanh toán)'
        : '(Thuế TNCN 10%) Tài khoản cá nhân';

    const newRow: LivestreamListingProposalRow = {
      id: `LS31-${Date.now()}`,
      thangPlan: formMonth,
      dot: formDot,
      storeName: formStoreName,
      brandName,
      picName: storeObj?.assignedPic || currentUserName,
      leaderName: storeObj?.bookingLeader || '',
      idKenh: catalogKol.idKenh,
      tenKenh: catalogKol.tenKenh,
      platform: catalogKol.platform,
      followers: catalogKol.followers,
      niche: catalogKol.niche,
      avgGmvPerSession: catalogKol.avgGmvPerSession,
      packageType: formPackageType,
      committedMinutes: Math.max(30, Number(formCommittedMinutes) || 120),
      sessionsCount: Math.max(1, Number(formSessionsCount) || 1),
      plannedAirDate: formPlannedDate,
      liveStartTime: formStartTime,
      liveEndTime: formEndTime,
      netFeeVnd: Math.max(0, Number(formNetFee) || 0),
      grossFeeVnd: computeGrossFeeWithTax(Math.max(0, Number(formNetFee) || 0), taxType),
      taxAccountType: taxType,
      commissionPct: Math.max(0, Number(formCommissionPct) || 15),
      gmvBonusTier: formBonusTier,
      targetGmvVnd: Math.max(0, Number(formTargetGmv) || 0),
      targetOrders: Math.max(0, Number(formTargetOrders) || 0),
      kpiType: formKpiType,
      skuSummary: formSkuSummary,
      dealPriceVoucherInfo: formDealVoucher,
      committedStock: Math.max(0, Number(formCommittedStock) || 0),
      exclusivityNote: formExclusivity,
      brandDecision: 'Cân nhắc',
      transferredTo32: false,
      createdAt: new Date().toISOString(),
    };

    const next = [newRow, ...rows];
    setRows(next);
    saveLivestreamProposals31(next);
    setIsProposalModalOpen(false);
    onNotify?.(
      `Đã thêm đề xuất Host Live "${catalogKol.tenKenh}" (@${catalogKol.idKenh}) vào Bảng 3.1 Listing Livestream.`,
      'success'
    );
  };

  const columns: Column<LivestreamListingProposalRow>[] = [
    {
      key: 'host',
      header: 'Host Live & Năng lực (7.1)',
      width: 220,
      render: (row) => {
        const kl = mapTepBookingToSalaryGrade(row.netFeeVnd);
        return (
          <div className="grid gap-1">
            <Person
              name={row.tenKenh}
              sub={`@${row.idKenh} · ${(row.followers / 1000).toFixed(0)}K flw`}
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <ChannelTag channel={row.platform} />
              <Status tone="neutral">{kl}</Status>
              <span className="text-2xs text-ink-3 tabular-nums">
                TB {(row.avgGmvPerSession / 1_000_000).toFixed(0)}M/phiên
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'storeBatch',
      header: 'Gian hàng & Kỳ kế hoạch',
      width: 175,
      render: (row) => (
        <div className="grid gap-1">
          <span className="font-semibold text-ink">{row.brandName}</span>
          <span className="text-2xs text-ink-2 truncate max-w-[165px]" title={row.storeName}>
            {row.storeName}
          </span>
          <div className="flex items-center gap-1.5 text-2xs text-ink-3">
            <span>{row.thangPlan}</span>
            <span>·</span>
            <span>{row.dot}</span>
            <span>·</span>
            <span className="truncate max-w-[90px]" title={row.picName}>
              {row.picName}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'packageSchedule',
      header: 'Gói Live & Lịch dự kiến',
      width: 195,
      render: (row) => (
        <div className="grid gap-1">
          <div className="flex items-center gap-1.5">
            <Status
              tone={
                row.packageType === 'Độc quyền'
                  ? 'info'
                  : row.packageType === 'Ghép giỏ (Add-in)'
                    ? 'neutral'
                    : 'positive'
              }
            >
              {row.packageType}
            </Status>
            <span className="text-xs font-semibold text-ink tabular-nums">
              {row.committedMinutes}p × {row.sessionsCount} buổi
            </span>
          </div>
          <span className="text-2xs text-ink-2 tabular-nums">
            Ngày: {row.plannedAirDate ? row.plannedAirDate.split('-').reverse().join('/') : 'Chưa chốt'}{' '}
            ({row.liveStartTime}–{row.liveEndTime})
          </span>
          <span className="text-2xs text-ink-3 line-clamp-1" title={row.exclusivityNote}>
            {row.exclusivityNote}
          </span>
        </div>
      ),
    },
    {
      key: 'feeCommission',
      header: 'Cát-xê & Hoa hồng',
      align: 'right',
      width: 175,
      render: (row) => (
        <div className="grid gap-0.5 justify-items-end">
          <span className="text-xs font-semibold text-ink tabular-nums">
            {fmtVnd(row.netFeeVnd)}
          </span>
          <span className="text-2xs text-ink-3 tabular-nums">
            Gross: {fmtVnd(row.grossFeeVnd)}
          </span>
          <div className="flex items-center gap-1 pt-0.5">
            <Status tone="info">HH {row.commissionPct}%</Status>
          </div>
          <span className="text-2xs text-ink-3 line-clamp-1 max-w-[165px]" title={row.gmvBonusTier}>
            {row.gmvBonusTier}
          </span>
        </div>
      ),
    },
    {
      key: 'kpiTarget',
      header: 'KPI GMV Mục tiêu',
      align: 'right',
      width: 165,
      render: (row) => {
        const estRoi =
          row.netFeeVnd > 0 ? (row.targetGmvVnd / row.netFeeVnd).toFixed(1) : 'FOC';
        return (
          <div className="grid gap-1 justify-items-end">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {fmtVnd(row.targetGmvVnd)}
            </span>
            <div className="flex items-center gap-1.5">
              <Status tone={row.kpiType === 'Cam kết' ? 'warning' : 'neutral'}>
                {row.kpiType}
              </Status>
              <span className="text-2xs text-ink-2 tabular-nums">
                ROI {estRoi}x
              </span>
            </div>
            <span className="text-2xs text-ink-3 tabular-nums">
              Mục tiêu: {row.targetOrders.toLocaleString('vi-VN')} đơn
            </span>
          </div>
        );
      },
    },
    {
      key: 'skuCart',
      header: 'Giỏ hàng SKU & Deal Sàn',
      width: 240,
      render: (row) => (
        <div className="grid gap-1">
          <span className="text-xs font-medium text-ink line-clamp-2" title={row.skuSummary}>
            {row.skuSummary}
          </span>
          <span className="text-2xs text-ink-2 line-clamp-1" title={row.dealPriceVoucherInfo}>
            {row.dealPriceVoucherInfo}
          </span>
          <span className="text-2xs text-ink-3 tabular-nums">
            Tồn kho giữ: {row.committedStock.toLocaleString('vi-VN')} SP
          </span>
        </div>
      ),
    },
    {
      key: 'decisionAction',
      header: 'Brand Duyệt & Tác vụ (3.2)',
      width: 210,
      render: (row) => (
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <Select
              value={row.brandDecision}
              onChange={(e) =>
                handleUpdateBrandDecision(row.id, e.target.value as LivestreamBrandChoice)
              }
              className="h-7 text-2xs"
            >
              <option value="Yes">Brand: Yes (Duyệt)</option>
              <option value="Cân nhắc">Brand: Cân nhắc</option>
              <option value="No">Brand: No (Từ chối)</option>
            </Select>
          </div>
          {row.transferredTo32 && row.maBooking ? (
            <div className="flex items-center justify-between gap-1.5">
              <Status tone="positive">{row.maBooking}</Status>
              <Button
                size="sm"
                variant="secondary"
                icon={ExternalLink}
                onClick={() =>
                  onOpenDealBoard({
                    storeName: row.storeName,
                    monthKey: row.thangPlan,
                    dealCode: row.maBooking,
                  })
                }
              >
                Mở 3.2
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant={row.brandDecision === 'Yes' ? 'primary' : 'secondary'}
              icon={Send}
              disabled={row.brandDecision === 'No'}
              onClick={() => handleTransferRowTo32(row)}
            >
              Tạo BO (Đẩy sang 3.2)
            </Button>
          )}
          {row.brandFeedback && (
            <span className="text-2xs text-warning line-clamp-1" title={row.brandFeedback}>
              {row.brandFeedback}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Phiên đề xuất (Bảng 3.1)"
          value={`${stats.totalProposals} đề xuất (${stats.totalSessions} buổi)`}
          note={`Brand đã duyệt Yes: ${stats.approvedCount} · Đã tạo mã LIVE: ${stats.transferredCount}`}
          tone="positive"
        />
        <Stat
          label="Ngân sách Cát-xê cứng Net"
          value={fmtVnd(stats.totalNetFee)}
          note={`Gross dự kiến: ${fmtVnd(Math.round(stats.totalNetFee / 0.9))}`}
        />
        <Stat
          label="Tổng KPI GMV Mục tiêu"
          value={fmtVnd(stats.totalTargetGmv)}
          note={`ROI mục tiêu trung bình: ${stats.estimatedRoi}x`}
          tone="positive"
        />
        <Stat
          label="Danh bạ 7.1 KOL Livestream"
          value={`${KOL_LIVESTREAM_71_CATALOG.length} Host chủ lực`}
          note="Đã đồng bộ lịch sử GMV, PCU & đơn giá tham chiếu"
        />
      </StatRow>

      <Panel
        title="Bảng 3.1 — Đề xuất Listing Host Livestream & Duyệt Gói Phiên Live"
        meta={`Kỳ kế hoạch ${selectedMonth === 'ALL' ? 'Tất cả tháng' : selectedMonth} · Kết nối Danh bạ 7.1 KOL Livestream`}
        flush
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={CheckCircle2}
              onClick={() => onOpenDealBoard({ storeName: selectedStore, monthKey: selectedMonth })}
            >
              Xem Bảng 3.2 ({stats.transferredCount} mã LIVE)
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => setIsProposalModalOpen(true)}
            >
              Đề xuất Host Live
            </Button>
          </div>
        }
      >
        <div className="p-3.5 border-b border-line bg-canvas/40">
          <FilterBar
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              placeholder: 'Tìm theo @id_kênh, tên Host, SKU, thương hiệu, mã LIVE...',
            }}
            resultCount={filteredRows.length}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedMonth}
                  onChange={(e) => onChangeMonth(e.target.value)}
                  className="w-[130px]"
                >
                  <option value="ALL">Mọi tháng</option>
                  <option value="2026/10">Tháng 2026/10</option>
                  <option value="2026/11">Tháng 2026/11</option>
                  <option value="2026/12">Tháng 2026/12</option>
                </Select>
                <Select
                  value={selectedStore}
                  onChange={(e) => onChangeStore(e.target.value)}
                  className="w-[210px]"
                >
                  <option value="ALL">Tất cả gian hàng B2C</option>
                  {b2cStores.map((st) => (
                    <option key={st.id} value={st.storeName}>
                      {st.brandName} — {st.storeName}
                    </option>
                  ))}
                </Select>
                <Select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value as typeof batchFilter)}
                  className="w-[115px]"
                >
                  <option value="ALL">Mọi đợt</option>
                  <option value="Đợt 1">Đợt 1</option>
                  <option value="Đợt 2">Đợt 2</option>
                  <option value="Đợt 3">Đợt 3</option>
                </Select>
                <Select
                  value={packageFilter}
                  onChange={(e) => setPackageFilter(e.target.value as typeof packageFilter)}
                  className="w-[165px]"
                >
                  <option value="ALL">Mọi gói Live</option>
                  <option value="Độc quyền">Độc quyền</option>
                  <option value="Ghép giỏ (Add-in)">Ghép giỏ (Add-in)</option>
                  <option value="Chỉ Hoa hồng">Chỉ Hoa hồng</option>
                </Select>
                <Select
                  value={decisionFilter}
                  onChange={(e) => setDecisionFilter(e.target.value as typeof decisionFilter)}
                  className="w-[155px]"
                >
                  <option value="ALL">Mọi trạng thái duyệt</option>
                  <option value="Yes">Brand duyệt: Yes</option>
                  <option value="Cân nhắc">Brand: Cân nhắc</option>
                  <option value="No">Brand: No</option>
                </Select>
              </div>
            }
          />
        </div>

        <DataTable
          columns={columns}
          rows={filteredRows}
          rowKey={(r) => r.id}
          stickyLast
          empty={
            <EmptyState
              title="Chưa có đề xuất Host Livestream phù hợp bộ lọc"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => setIsProposalModalOpen(true)}
                >
                  Đề xuất Host Live
                </Button>
              }
            />
          }
        />
      </Panel>

      <Modal
        open={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        title="Đề xuất Host Livestream mới (Kết nối Danh bạ 7.1 KOL Livestream)"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsProposalModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" icon={Video} onClick={handleCreateProposal}>
              Lưu đề xuất vào Bảng 3.1
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Chọn Host từ Danh bạ 7.1 KOL Livestream">
            <Select
              value={selectedKolId}
              onChange={(e) => handleSelectCatalogKol(e.target.value)}
            >
              {KOL_LIVESTREAM_71_CATALOG.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.tenKenh} (@{k.idKenh}) — TB {(k.avgGmvPerSession / 1_000_000).toFixed(0)}M/phiên · Rate {fmtVnd(k.refNetRateVnd)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Gian hàng B2C (Store)">
            <Select
              value={formStoreName}
              onChange={(e) => setFormStoreName(e.target.value)}
            >
              {b2cStores.map((st) => (
                <option key={st.id} value={st.storeName}>
                  {st.brandName} — {st.storeName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kỳ kế hoạch (Tháng Plan)">
            <Select value={formMonth} onChange={(e) => setFormMonth(e.target.value)}>
              <option value="2026/10">2026/10</option>
              <option value="2026/11">2026/11</option>
              <option value="2026/12">2026/12</option>
            </Select>
          </Field>

          <Field label="Đợt trình duyệt">
            <Select
              value={formDot}
              onChange={(e) => setFormDot(e.target.value as 'Đợt 1' | 'Đợt 2' | 'Đợt 3')}
            >
              <option value="Đợt 1">Đợt 1</option>
              <option value="Đợt 2">Đợt 2</option>
              <option value="Đợt 3">Đợt 3</option>
            </Select>
          </Field>

          <Field label="Gói hình thức Livestream">
            <Select
              value={formPackageType}
              onChange={(e) => setFormPackageType(e.target.value as LivestreamPackageType)}
            >
              <option value="Độc quyền">Độc quyền (Solo Session)</option>
              <option value="Ghép giỏ (Add-in)">Ghép giỏ (Mega Add-in)</option>
              <option value="Chỉ Hoa hồng">Chỉ Hoa hồng (Pure Affiliate 0đ)</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Thời lượng cam kết (phút)">
              <Input
                type="number"
                min={15}
                step={15}
                value={formCommittedMinutes}
                onChange={(e) => setFormCommittedMinutes(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Số buổi live">
              <Input
                type="number"
                min={1}
                value={formSessionsCount}
                onChange={(e) => setFormSessionsCount(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Ngày Live dự kiến">
              <Input
                type="date"
                value={formPlannedDate}
                onChange={(e) => setFormPlannedDate(e.target.value)}
              />
            </Field>
            <Field label="Giờ bắt đầu">
              <Input
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
              />
            </Field>
            <Field label="Giờ kết thúc">
              <Input
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Cát-xê cứng Net (VNĐ)">
              <Input
                type="number"
                min={0}
                step={500000}
                value={formNetFee}
                onChange={(e) => setFormNetFee(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="% Hoa hồng Affiliate">
              <Input
                type="number"
                min={0}
                max={50}
                value={formCommissionPct}
                onChange={(e) => setFormCommissionPct(Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="KPI GMV Mục tiêu (VNĐ)">
              <Input
                type="number"
                min={0}
                step={5000000}
                value={formTargetGmv}
                onChange={(e) => setFormTargetGmv(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Loại cam kết KPI GMV">
              <Select
                value={formKpiType}
                onChange={(e) => setFormKpiType(e.target.value as 'Cam kết' | 'Tham chiếu')}
              >
                <option value="Cam kết">Cam kết (Ràng buộc nghiệm thu)</option>
                <option value="Tham chiếu">Tham chiếu (Không phạt cát-xê)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Số đơn mục tiêu">
              <Input
                type="number"
                min={0}
                value={formTargetOrders}
                onChange={(e) => setFormTargetOrders(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Tồn kho cam kết (SP)">
              <Input
                type="number"
                min={0}
                value={formCommittedStock}
                onChange={(e) => setFormCommittedStock(Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Cơ chế Thưởng nóng vượt mốc GMV">
              <Input
                value={formBonusTier}
                onChange={(e) => setFormBonusTier(e.target.value)}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Danh mục SKU gắn giỏ trọng tâm">
              <Input
                value={formSkuSummary}
                onChange={(e) => setFormSkuSummary(e.target.value)}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Giá Deal độc quyền phiên Live & Voucher sàn">
              <Textarea
                rows={2}
                value={formDealVoucher}
                onChange={(e) => setFormDealVoucher(e.target.value)}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Điều khoản độc quyền ngành hàng trong phiên">
              <Input
                value={formExclusivity}
                onChange={(e) => setFormExclusivity(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
