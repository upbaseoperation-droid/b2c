import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import React from 'react';
import { ImageResponse } from 'next/og';
import { checkSingleLinkServerless, formatVnDateTimeFromUnixSec } from '../linkAirCheckServer';
import type { LinkAirResult } from '../linkAirCheck';
import { getSharedCrawlerStore, inspectLiveTikTokVideoPage } from '../tiktokOpenSourceEngines';
import { REAL_B2C_69_STORES } from '../realB2cPlanData';
import { readRecord, upsertRecord } from './sharedRecords';
import { handleCtvZaloMessage } from './zaloCtvCommands';

export type ZaloGroupRole = 'KOC_GROUP' | 'BRAND_PARTNER' | 'INTERNAL_OPS' | 'BOD_EXECUTIVE';

export type ZaloGroupAccessStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED';

export type ZaloAutoReplyKey =
  | 'AIR_CHECK_RESULT'
  | 'AIR_CHECK_PHOTO_CAPTION'
  | 'BRIEF_MESSAGE'
  | 'DRAFT_RECEIVED'
  | 'DRAFT_APPROVED'
  | 'DRAFT_REJECTED'
  | 'BRAND_PROGRESS_REPORT';

export interface ZaloAutoReplyTemplate {
  key: ZaloAutoReplyKey;
  label: string;
  triggerHint: string;
  availablePlaceholders: string[];
  content: string;
}

export interface ZaloBroadcastTemplate {
  id: string;
  label: string;
  targetRole?: ZaloGroupRole;
  content: string;
}

export interface ZaloBotReplyConfig {
  sendHoldingPhotoOnAirCheck: boolean;
  sendScanningProgressMessage: boolean;
  autoReplyTemplates: ZaloAutoReplyTemplate[];
  broadcastTemplates: ZaloBroadcastTemplate[];
  updatedAt: string;
}

export interface ZaloBotSecurityPolicy {
  requireGroupWhitelist: boolean;
  lockRoleElevationFromChat: boolean;
  enforceBrandScopeInInternalGroups: boolean;
  restrictDraftReviewToStaff: boolean;
  isolateCrossDealLookupInKocGroup: boolean;
  updatedAt: string;
}

export type ZaloDealWorkflowStatus =
  | 'CHỜ_NHẬN_MẪU'
  | 'ĐANG_QUAY_NHÁP'
  | 'ĐÃ_NỘP_NHÁP'
  | 'ĐÃ_DUYỆT_NHÁP'
  | 'ĐÃ_NGHIỆM_THU_AIR'
  | 'CẦN_CHỈNH_SỬA';

export type ZaloStaffRole = 'CEO' | 'LEAD_B2C' | 'LEADER' | 'PIC' | 'KOC';

export interface ZaloGroupMapping {
  groupId: string;
  groupName?: string;
  groupRole: ZaloGroupRole;
  accessStatus?: ZaloGroupAccessStatus;
  allowedBrands?: string[];
  dealCode?: string;
  kocHandle?: string;
  kocName?: string;
  brandName?: string;
  storeName?: string;
  picName?: string;
  leaderName?: string;
  productName?: string;
  pillarName?: string;
  briefSummary?: string;
  requiredHashtags?: string[];
  expectedProductUrl?: string;
  deadlineDate?: string;
  bookingFeeNet?: number;
  dealStatus: ZaloDealWorkflowStatus;
  draftVideoUrl?: string;
  draftReviewNote?: string;
  airedVideoUrl?: string;
  isAutoDiscovered?: boolean;
  lastMessageText?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  lastActiveAt?: string;
  messageCount?: number;
  chatHistory?: Array<{ time: string; senderName: string; text: string }>;
  linkedAt: string;
  updatedAt?: string;
}

export interface ZaloDiscoveredSender {
  senderId: string;
  displayName: string;
  lastChatId: string;
  lastGroupName?: string;
  lastMessageText: string;
  lastSeenAt: string;
  messageCount: number;
}

export interface ZaloUserPermission {
  zaloUserId: string;
  displayName: string;
  staffName: string;
  staffEmail: string;
  role: ZaloStaffRole;
  roleLabel: string;
  assignedBrands: string[];
  updatedAt: string;
}

export interface ZaloAirCheckHistoryItem {
  id: string;
  checkedAt: string;
  chatId: string;
  dealCode?: string;
  brandName?: string;
  kocHandle: string;
  videoUrl: string;
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  status: string;
  hasProductLink: boolean;
  productTitle?: string;
  productUrl?: string;
  productId?: string;
  cartProducts?: Array<{
    productId: string;
    title: string;
    productUrl: string;
  }>;
  holdingScreenshotUrl?: string;
  holdingMomentSec?: number;
  holdingMomentTimeLabel?: string;
  holdingMomentQuote?: string;
  airedAtVn?: string;
  publishedAt?: string;
  firstProductAppearanceSec?: number | null;
  firstProductMentionTimeLabel?: string;
  firstProductMentionTerm?: string;
  firstProductMentionQuote?: string;
  productMentionMoments?: Array<{
    startSec: number;
    endSec: number;
    timeLabel: string;
    matchedTerm: string;
    quote: string;
  }>;
  views: number | null;
  likes: number | null;
  hashtags: string[];
  sentToZalo: boolean;
}

interface QuickKocDirectoryEntry {
  handle: string;
  stageName: string;
  realName: string;
  salaryGrade: string;
  tierLabel: string;
  followers: number;
  rateCardNet: number;
  gmvBestCase: number;
  historicalRoi: number;
  totalPastDeals: number;
  brandName: string;
  bookingPic: string;
  bankName: string;
  maskedBankAccount: string;
  maskedCccd: string;
  taxAccountType: string;
}

const MAPPINGS_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_group_mappings.json');
const AIR_HISTORY_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_air_history.json');
const PERMISSIONS_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_user_permissions.json');
const SECURITY_POLICY_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_security_policy.json');
const REPLY_CONFIG_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_reply_config.json');

const IS_SERVERLESS_READONLY = Boolean(process.env.VERCEL);
const inMemoryMappings = new Map<string, ZaloGroupMapping>();
const inMemoryAirHistory: ZaloAirCheckHistoryItem[] = [];
const inMemoryPermissions = new Map<string, ZaloUserPermission>();
const inMemoryDiscoveredSenders = new Map<string, ZaloDiscoveredSender>();
const inMemoryCapturedFrames = new Map<string, { buffer: Buffer; createdAt: number }>();
const inMemoryAirCheckCache = new Map<string, { result: LinkAirResult; expiresAt: number }>();
let inMemorySecurityPolicy: ZaloBotSecurityPolicy | null = null;
let inMemoryReplyConfig: ZaloBotReplyConfig | null = null;
let lastDbHydratedAt = 0;
let dbHydrationInFlight: Promise<void> | null = null;
let isFfmpegUnavailable = IS_SERVERLESS_READONLY;

interface ZaloBotPersistedState {
  mappings: Record<string, ZaloGroupMapping>;
  permissions: Record<string, ZaloUserPermission>;
  discoveredSenders: Record<string, ZaloDiscoveredSender>;
  securityPolicy?: ZaloBotSecurityPolicy;
  replyConfig?: ZaloBotReplyConfig;
}

const ZALO_BOT_SHARED_KEY = 'zalo-bot-state-v1';
const recentDebugEvents: Array<{
  time: string;
  body: any;
  extractedChatId?: string;
  replySent?: boolean;
  replyText?: string;
  replyPhotoUrl?: string;
  error?: string;
}> = [];

// 8 gian hàng trọng điểm có Leader Nguyễn Thị Ngọc Tâm phụ trách (theo Cột 55 File 4.1.1)
const LEADER_NGOC_TAM_BRANDS = new Set([
  'clubclio',
  'cindy bloom',
  'mine',
  'eupc',
  "l'occitane",
  'loccitane',
  'bye bye blemish',
  'rejuran',
]);

function maskSensitiveLast4(raw?: string | null): string {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return 'Chưa xác nhận';
  if (cleaned.length <= 4) return `****${cleaned}`;
  return `****${cleaned.slice(-4)}`;
}

function formatVnd(amount: number | null | undefined): string {
  const safe = Math.round(Number(amount || 0));
  return `${new Intl.NumberFormat('vi-VN').format(safe)}đ`;
}

function resolveLeaderForBrand(brandName?: string): string {
  const normalized = String(brandName || '').trim().toLowerCase();
  if (!normalized) return 'Đặng Thị Yến Nhi (Trình trực tiếp Lead B2C)';
  for (const key of LEADER_NGOC_TAM_BRANDS) {
    if (normalized.includes(key)) {
      return 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)';
    }
  }
  return 'Đặng Thị Yến Nhi (Trình trực tiếp Giám Đốc B2C)';
}

// Danh mục KOC tiêu biểu đã chuẩn hóa & che mờ dữ liệu nhạy cảm theo RULE Data Masking
const QUICK_KOC_CATALOG: QuickKocDirectoryEntry[] = [
  {
    handle: 'po.trann77',
    stageName: 'po.trann77',
    realName: 'CÔNG TY TNHH METAVERSE ENTERTAINMENT',
    salaryGrade: 'KL7',
    tierLabel: 'Tier 1 (Celeb/Mega)',
    followers: 650000,
    rateCardNet: 45000000,
    gmvBestCase: 968229155,
    historicalRoi: 0.31,
    totalPastDeals: 74,
    brandName: 'ClubClio',
    bookingPic: 'Lê Thị Thùy Thương',
    bankName: 'ACB',
    maskedBankAccount: maskSensitiveLast4('19930588'),
    maskedCccd: maskSensitiveLast4('0317507208'),
    taxAccountType: '(VAT 8%) Tài khoản doanh nghiệp',
  },
  {
    handle: 'chutieuhan10012001',
    stageName: 'Chu Thị Phương Thảo',
    realName: 'Chu Thị Phương Thảo',
    salaryGrade: 'KL6',
    tierLabel: 'Tier 2 (Macro)',
    followers: 280000,
    rateCardNet: 35000000,
    gmvBestCase: 1632174163,
    historicalRoi: 1.48,
    totalPastDeals: 40,
    brandName: 'EUPC',
    bookingPic: 'Hà Thị Thủy',
    bankName: 'MB Bank',
    maskedBankAccount: maskSensitiveLast4('0990167106666'),
    maskedCccd: maskSensitiveLast4('020301008746'),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
  },
  {
    handle: 'hathuuu1610',
    stageName: 'hathuuu1610 (Trần Khắc Anh)',
    realName: 'Trần Khắc Anh',
    salaryGrade: 'KL6',
    tierLabel: 'Tier 2 (Macro)',
    followers: 477574,
    rateCardNet: 12000000,
    gmvBestCase: 892407765,
    historicalRoi: 2.35,
    totalPastDeals: 33,
    brandName: 'Chulala',
    bookingPic: 'Lương Nguyễn Trang Nhung',
    bankName: 'Vietcombank',
    maskedBankAccount: maskSensitiveLast4('1057331492'),
    maskedCccd: maskSensitiveLast4('027093012645'),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
  },
  {
    handle: 'rinabeauty859',
    stageName: 'Rinabeauty859',
    realName: 'CÔNG TY TNHH RINABEAUTY',
    salaryGrade: 'KL6',
    tierLabel: 'Tier 2 (Macro)',
    followers: 280000,
    rateCardNet: 4000000,
    gmvBestCase: 927271355,
    historicalRoi: 0.94,
    totalPastDeals: 33,
    brandName: 'Mine',
    bookingPic: 'Nguyễn Thị Hồng Ngát',
    bankName: 'Vietinbank',
    maskedBankAccount: maskSensitiveLast4('114003049552'),
    maskedCccd: maskSensitiveLast4('026303000125'),
    taxAccountType: '(VAT 8%) Tài khoản doanh nghiệp',
  },
  {
    handle: 'soanhtran98',
    stageName: 'Trần Minh Sơn Anh',
    realName: 'Trần Minh Sơn Anh',
    salaryGrade: 'KL5',
    tierLabel: 'Tier 3 (Micro)',
    followers: 140000,
    rateCardNet: 5000000,
    gmvBestCase: 550248045,
    historicalRoi: 0.77,
    totalPastDeals: 19,
    brandName: 'Cindy Bloom',
    bookingPic: 'Nguyễn Ngọc Huyền',
    bankName: 'MB Bank',
    maskedBankAccount: maskSensitiveLast4('9861998899999'),
    maskedCccd: maskSensitiveLast4('001098024983'),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
  },
  {
    handle: 'cin0ntp',
    stageName: 'Phan Trần Thanh Ngân',
    realName: 'Phan Trần Thanh Ngân',
    salaryGrade: 'KL1',
    tierLabel: 'Tier 4 (Affiliate/Nano)',
    followers: 32000,
    rateCardNet: 500000,
    gmvBestCase: 551238929,
    historicalRoi: 225,
    totalPastDeals: 19,
    brandName: 'pHCare',
    bookingPic: 'Đinh Thị Bích Liên',
    bankName: 'Techcombank',
    maskedBankAccount: maskSensitiveLast4('19036480207012'),
    maskedCccd: maskSensitiveLast4('079301010903'),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
  },
  {
    handle: 'phamsontrang',
    stageName: 'Phạm Sơn Trang',
    realName: 'Phạm Sơn Trang',
    salaryGrade: 'KL5',
    tierLabel: 'Tier 3 (Micro)',
    followers: 140000,
    rateCardNet: 10000000,
    gmvBestCase: 258821693,
    historicalRoi: 0.6,
    totalPastDeals: 50,
    brandName: 'Cathy Doll',
    bookingPic: 'Phạm Thị Thu Hằng',
    bankName: 'Vietcombank',
    maskedBankAccount: maskSensitiveLast4('1040799683'),
    maskedCccd: maskSensitiveLast4('001305039606'),
    taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
  },
];

// Index O(1) tra cứu KOC theo handle
const KOC_BY_HANDLE_INDEX = new Map<string, QuickKocDirectoryEntry>(
  QUICK_KOC_CATALOG.map((k) => [k.handle.toLowerCase(), k])
);

const DEFAULT_GROUP_MAPPINGS: ZaloGroupMapping[] = [
  {
    groupId: 'zalo_grp_clubclio_potrann',
    groupName: '[ClubClio x KOC po.trann77] Booking T10',
    groupRole: 'KOC_GROUP',
    dealCode: 'BO261047523',
    kocHandle: 'po.trann77',
    kocName: 'po.trann77 (Metaverse Ent)',
    brandName: 'ClubClio',
    storeName: 'ClubClio_TikTok_Flagship',
    picName: 'Lê Thị Thùy Thương',
    leaderName: 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)',
    productName: 'Phấn nước Clio Kill Cover Mesh Glow Cushion SPF50+',
    pillarName: 'Review trực tiếp (PIL-01)',
    briefSummary: 'Quay cận cảnh chất kem che khuyết điểm dưới ánh sáng tự nhiên, test độ bám nền sau 6 tiếng và gắn giỏ hàng sản phẩm chính hãng.',
    requiredHashtags: ['ClubClio', 'ClioCushion', 'BeautyReview'],
    deadlineDate: '30/10/2026',
    bookingFeeNet: 45000000,
    dealStatus: 'ĐÃ_DUYỆT_NHÁP',
    draftVideoUrl: 'https://drive.google.com/file/d/1po6HlavFvxALxuK/view',
    linkedAt: '2026-10-25T09:30:00.000Z',
  },
  {
    groupId: 'zalo_grp_eupc_chutieuhan',
    groupName: '[EUPC x KOC Chu Tiểu Hân] Chiến dịch Kem dưỡng',
    groupRole: 'KOC_GROUP',
    dealCode: 'BO261067161',
    kocHandle: 'chutieuhan10012001',
    kocName: 'Chu Thị Phương Thảo',
    brandName: 'EUPC',
    storeName: 'EUPC_TikTok_Official',
    picName: 'Hà Thị Thủy',
    leaderName: 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)',
    productName: 'Kem dưỡng phục hồi da EUPC B5 Cica 50ml',
    pillarName: 'Nỗi đau - Giải pháp (PIL-02)',
    briefSummary: 'So sánh tình trạng da khô kích ứng trước và sau 7 ngày dùng kem dưỡng EUPC B5, chỉ tay vào giỏ hàng góc trái ở 5 giây cuối.',
    requiredHashtags: ['EUPC', 'KemDuongB5', 'Skincare'],
    deadlineDate: '29/10/2026',
    bookingFeeNet: 35000000,
    dealStatus: 'ĐÃ_NỘP_NHÁP',
    draftVideoUrl: 'https://drive.google.com/file/d/10DHpfDD8_oVAgyY/view',
    linkedAt: '2026-10-26T14:15:00.000Z',
  },
  {
    groupId: 'zalo_grp_mine_rinabeauty',
    groupName: '[Mine x KOC Rinabeauty859] Booking T10',
    groupRole: 'KOC_GROUP',
    dealCode: 'BO261044922',
    kocHandle: 'rinabeauty859',
    kocName: 'Rinabeauty859',
    brandName: 'Mine',
    storeName: 'Mine_TikTok_Store',
    picName: 'Nguyễn Thị Hồng Ngát',
    leaderName: 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)',
    productName: 'Tinh chất dưỡng sáng da Mine Niacinamide 10%',
    pillarName: 'Review trực tiếp (PIL-01)',
    briefSummary: 'Trải nghiệm kết cấu serum thấm nhanh không bết dính, nêu rõ ưu đãi voucher độc quyền trong giỏ hàng.',
    requiredHashtags: ['MineVietnam', 'SerumMine', 'ReviewLamDep'],
    deadlineDate: '31/10/2026',
    bookingFeeNet: 4000000,
    dealStatus: 'ĐANG_QUAY_NHÁP',
    linkedAt: '2026-10-27T10:00:00.000Z',
  },
  {
    groupId: 'zalo_grp_b2c_internal_ops',
    groupName: '[Nội Bộ B2C] Điều Phối Booking & Nghiệm Thu SLA',
    groupRole: 'INTERNAL_OPS',
    dealCode: 'ALL-B2C-OPS',
    brandName: 'Toàn bộ 69 gian hàng B2C',
    picName: 'Nguyễn Thị Ngọc Tâm',
    leaderName: 'Đặng Thị Yến Nhi',
    dealStatus: 'ĐÃ_NGHIỆM_THU_AIR',
    linkedAt: '2026-10-20T08:00:00.000Z',
  },
  {
    groupId: 'zalo_grp_bod_executive',
    groupName: '[Ban Giám Đốc & Lead B2C] Kiểm Soát Ngân Sách PnL',
    groupRole: 'BOD_EXECUTIVE',
    dealCode: 'BOD-PNL-CONTROL',
    brandName: '69 Gian hàng B2C',
    picName: 'Đặng Thị Yến Nhi',
    leaderName: 'Đỗ Văn Giang (CEO)',
    dealStatus: 'ĐÃ_NGHIỆM_THU_AIR',
    linkedAt: '2026-10-15T08:00:00.000Z',
  },
  {
    groupId: 'zalo_grp_brand_clubclio',
    groupName: '[Upbase x Nhãn hàng ClubClio] Điều phối Chiến dịch T10',
    groupRole: 'BRAND_PARTNER',
    accessStatus: 'APPROVED',
    allowedBrands: ['ClubClio'],
    dealCode: 'BRAND-CLUBCLIO-T10',
    brandName: 'ClubClio',
    storeName: 'ClubClio_TikTok_Flagship',
    picName: 'Lê Thị Thùy Thương',
    leaderName: 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)',
    productName: 'Phấn nước Clio Kill Cover Mesh Glow Cushion SPF50+',
    requiredHashtags: ['ClubClio', 'ClioCushion', 'BeautyReview'],
    deadlineDate: '31/10/2026',
    dealStatus: 'ĐÃ_NỘP_NHÁP',
    linkedAt: '2026-10-18T08:00:00.000Z',
  },
];

const DEFAULT_USER_PERMISSIONS: ZaloUserPermission[] = [
  {
    zaloUserId: 'zalo_ceo_do_van_giang',
    displayName: 'Đỗ Văn Giang (CEO)',
    staffName: 'Đỗ Văn Giang',
    staffEmail: 'giangdv@upbase.vn',
    role: 'CEO',
    roleLabel: 'Tổng Giám Đốc (CEO)',
    assignedBrands: ['Toàn bộ 69 gian hàng B2C'],
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
  {
    zaloUserId: 'zalo_lead_yen_nhi',
    displayName: 'Đặng Thị Yến Nhi',
    staffName: 'Đặng Thị Yến Nhi',
    staffEmail: 'yennhi@upbase.vn',
    role: 'LEAD_B2C',
    roleLabel: 'Giám Đốc Marketing B2C (Lead B2C)',
    assignedBrands: ['Toàn bộ 69 gian hàng B2C'],
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
  {
    zaloUserId: 'zalo_leader_ngoc_tam',
    displayName: 'Nguyễn Thị Ngọc Tâm',
    staffName: 'Nguyễn Thị Ngọc Tâm',
    staffEmail: 'tamntn@upbase.vn',
    role: 'LEADER',
    roleLabel: 'Trưởng Nhóm Booking (8 gian hàng trọng điểm)',
    assignedBrands: ['ClubClio', 'Cindy Bloom', 'Mine', 'EUPC', "L'Occitane", 'Bye Bye Blemish', 'Rejuran'],
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
  {
    zaloUserId: 'zalo_pic_ha_thuy',
    displayName: 'Hà Thị Thủy (PIC)',
    staffName: 'Hà Thị Thủy',
    staffEmail: 'thuyht@upbase.vn',
    role: 'PIC',
    roleLabel: 'Chuyên viên Booking (PIC)',
    assignedBrands: ['EUPC', 'HDT', 'ClubClio'],
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
  {
    zaloUserId: 'zalo_pic_trang_nhung',
    displayName: 'Lương Nguyễn Trang Nhung (PIC)',
    staffName: 'Lương Nguyễn Trang Nhung',
    staffEmail: 'nhunglnt@upbase.vn',
    role: 'PIC',
    roleLabel: 'Chuyên viên Booking (PIC)',
    assignedBrands: ['Chulala', 'Cindy Bloom', 'Rejuran'],
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
];

export function recordDebugEvent(event: {
  time: string;
  body: any;
  extractedChatId?: string;
  replySent?: boolean;
  replyText?: string;
  replyPhotoUrl?: string;
  error?: string;
}) {
  recentDebugEvents.unshift(event);
  if (recentDebugEvents.length > 30) {
    recentDebugEvents.pop();
  }
}

export function getDebugEvents() {
  return recentDebugEvents;
}

function loadMappings(): Map<string, ZaloGroupMapping> {
  if (inMemoryMappings.size > 0) return inMemoryMappings;
  try {
    if (fs.existsSync(MAPPINGS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item?.groupId) {
            inMemoryMappings.set(item.groupId, {
              ...item,
              groupRole: item.groupRole || 'KOC_GROUP',
              dealStatus: item.dealStatus || 'ĐANG_QUAY_NHÁP',
            });
          }
        }
        return inMemoryMappings;
      }
    }
  } catch {
    // Zero-Crash fallback
  }
  for (const seed of DEFAULT_GROUP_MAPPINGS) {
    inMemoryMappings.set(seed.groupId, seed);
  }
  return inMemoryMappings;
}

function saveMappings(): void {
  if (IS_SERVERLESS_READONLY) return;
  const arr = Array.from(inMemoryMappings.values());
  setImmediate(() => {
    try {
      const dir = path.dirname(MAPPINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    } catch {
      // Non-fatal on serverless read-only fs
    }
  });
}

function loadPermissions(): Map<string, ZaloUserPermission> {
  if (inMemoryPermissions.size > 0) return inMemoryPermissions;
  try {
    if (fs.existsSync(PERMISSIONS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(PERMISSIONS_FILE_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item?.zaloUserId) inMemoryPermissions.set(item.zaloUserId, item);
        }
        return inMemoryPermissions;
      }
    }
  } catch {
    // Zero-Crash fallback
  }
  for (const seed of DEFAULT_USER_PERMISSIONS) {
    inMemoryPermissions.set(seed.zaloUserId, seed);
  }
  return inMemoryPermissions;
}

function savePermissions(): void {
  if (IS_SERVERLESS_READONLY) return;
  const arr = Array.from(inMemoryPermissions.values());
  setImmediate(() => {
    try {
      const dir = path.dirname(PERMISSIONS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(PERMISSIONS_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    } catch {
      // Ignore read-only errors
    }
  });
}

function loadAirHistory(): ZaloAirCheckHistoryItem[] {
  if (inMemoryAirHistory.length > 0) return inMemoryAirHistory;
  try {
    if (fs.existsSync(AIR_HISTORY_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(AIR_HISTORY_FILE_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        inMemoryAirHistory.push(...data);
        return inMemoryAirHistory;
      }
    }
  } catch {
    // Fallback
  }
  return inMemoryAirHistory;
}

function saveAirHistory(): void {
  if (IS_SERVERLESS_READONLY) return;
  const snapshot = inMemoryAirHistory.slice(0, 50);
  setImmediate(() => {
    try {
      const dir = path.dirname(AIR_HISTORY_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(AIR_HISTORY_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch {
      // Non-fatal
    }
  });
}

export function getAllMappings(): ZaloGroupMapping[] {
  return Array.from(loadMappings().values());
}

export function getAllDiscoveredSenders(): ZaloDiscoveredSender[] {
  return Array.from(inMemoryDiscoveredSenders.values()).sort((a, b) =>
    (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '')
  );
}

const DEFAULT_SECURITY_POLICY: ZaloBotSecurityPolicy = {
  requireGroupWhitelist: false,
  lockRoleElevationFromChat: true,
  enforceBrandScopeInInternalGroups: true,
  restrictDraftReviewToStaff: false,
  isolateCrossDealLookupInKocGroup: true,
  updatedAt: '2026-10-28T08:00:00.000Z',
};

export function getSecurityPolicy(): ZaloBotSecurityPolicy {
  if (inMemorySecurityPolicy) return inMemorySecurityPolicy;
  try {
    if (fs.existsSync(SECURITY_POLICY_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SECURITY_POLICY_FILE_PATH, 'utf-8'));
      if (data && typeof data === 'object') {
        const loaded: ZaloBotSecurityPolicy = { ...DEFAULT_SECURITY_POLICY, ...data };
        inMemorySecurityPolicy = loaded;
        return loaded;
      }
    }
  } catch {
    // Zero-Crash fallback
  }
  const fallback: ZaloBotSecurityPolicy = { ...DEFAULT_SECURITY_POLICY };
  inMemorySecurityPolicy = fallback;
  return fallback;
}

export const DEFAULT_REPLY_CONFIG: ZaloBotReplyConfig = {
  sendHoldingPhotoOnAirCheck: true,
  sendScanningProgressMessage: true,
  autoReplyTemplates: [
    {
      key: 'AIR_CHECK_RESULT',
      label: '1. Kết quả nghiệm thu video TikTok (Quét link Air)',
      triggerHint: 'Tự động gửi khi KOC / PIC / Brand dán link video TikTok vào nhóm',
      availablePlaceholders: [
        '{verdictIcon}',
        '{kocHandle}',
        '{airedAt}',
        '{statusText}',
        '{cartText}',
        '{productLinks}',
        '{mentionLine}',
        '{holdingLine}',
        '{views}',
        '{likes}',
        '{hashtags}',
        '{dealSyncNote}',
      ],
      content: [
        '📊 KẾT QUẢ NGHIỆM THU VIDEO TIKTOK',
        '----------------------------------------',
        '• Đánh giá: {verdictIcon}',
        '• Tác giả kênh: @{kocHandle}',
        '• Ngày giờ lên sóng (Air): {airedAt}',
        '• Tình trạng: {statusText}',
        '• Giỏ hàng: {cartText}',
        '{productLinks}',
        '{mentionLine}',
        '{holdingLine}',
        '• Lượt xem: {views} | Lượt thích: {likes}',
        '• Hashtags: {hashtags}',
        '----------------------------------------',
        '{dealSyncNote}',
      ].join('\n'),
    },
    {
      key: 'AIR_CHECK_PHOTO_CAPTION',
      label: '2. Chú thích dưới ảnh chụp KOC cầm sản phẩm (sendPhoto)',
      triggerHint: 'Đính kèm dưới bức ảnh cắt từ clip tại mốc giây KOC cầm sản phẩm',
      availablePlaceholders: [
        '{kocHandle}',
        '{holdingSec}',
        '{holdingTimeLabel}',
        '{airedAt}',
        '{mentionSec}',
        '{productTitle}',
        '{holdingQuote}',
      ],
      content: [
        '📸 Ảnh chụp KOC @{kocHandle} cầm sản phẩm ở giây {holdingSec}s ({holdingTimeLabel})',
        '📅 Ngày giờ Air: {airedAt} | ⏱️ Nhắc SP lần đầu: Giây {mentionSec}s',
        '🛒 SP: {productTitle}',
        '💬 Lời thoại: "{holdingQuote}"',
      ].join('\n'),
    },
    {
      key: 'BRIEF_MESSAGE',
      label: '3. Bản tin Brief chiến dịch KOC (/brief)',
      triggerHint: 'Phản hồi khi gõ lệnh /brief hoặc bấm nút Gửi Brief trên Web-Admin',
      availablePlaceholders: [
        '{dealCode}',
        '{brandName}',
        '{storeName}',
        '{kocName}',
        '{productName}',
        '{pillarName}',
        '{briefSummary}',
        '{hashtags}',
        '{deadlineDate}',
        '{picName}',
      ],
      content: [
        '📋 BRIEF CHIẾN DỊCH BOOKING KOC - UPBASE B2C',
        '----------------------------------------',
        '• Mã Deal: {dealCode}',
        '• Thương hiệu: {brandName} ({storeName})',
        '• KOC thực hiện: {kocName}',
        '• Sản phẩm trọng tâm: {productName}',
        '• Trụ cột nội dung: {pillarName}',
        '• Yêu cầu kịch bản & góc quay:',
        '  {briefSummary}',
        '• Hashtag bắt buộc: {hashtags}',
        '• Hạn nộp video nháp (SLA): {deadlineDate}',
        '• Chuyên viên phụ trách (PIC): {picName}',
        '----------------------------------------',
        '👉 Cách nộp bài ngay trong nhóm:',
        '1. Nộp link video nháp (Google Drive): Gõ /nopnhap <link_drive>',
        '2. Nộp link TikTok đã đăng (Air): Dán trực tiếp link TikTok kèm tag @Bot để hệ thống tự động quét nghiệm thu.',
      ].join('\n'),
    },
    {
      key: 'DRAFT_RECEIVED',
      label: '4. Xác nhận tiếp nhận video nháp (/nopnhap)',
      triggerHint: 'Phản hồi khi KOC gửi link Google Drive / CapCut hoặc gõ /nopnhap',
      availablePlaceholders: ['{senderName}', '{dealCode}', '{brandName}', '{draftUrl}', '{picName}'],
      content: [
        '📥 ĐÃ TIẾP NHẬN VIDEO DEMO / NHÁP',
        '----------------------------------------',
        '• Người nộp: {senderName}',
        '• Mã Deal: {dealCode}',
        '• Thương hiệu: {brandName}',
        '• Link bản nháp: {draftUrl}',
        '• Trạng thái mới: ĐÃ_NỘP_NHÁP (Chờ PIC/Brand duyệt)',
        '----------------------------------------',
        '🔔 Nhắc PIC phụ trách ({picName}): Sau khi kiểm tra nội dung, hãy gõ:',
        '• /duyetnhap [ghi chú] -> Để phê duyệt cho KOC đăng bài.',
        '• /suanhap <nội dung cần sửa> -> Để yêu cầu KOC chỉnh sửa.',
      ].join('\n'),
    },
    {
      key: 'DRAFT_APPROVED',
      label: '5. Thông báo phê duyệt video nháp (/duyetnhap)',
      triggerHint: 'Phản hồi khi PIC hoặc Đại diện Brand gõ /duyetnhap',
      availablePlaceholders: ['{dealCode}', '{brandName}', '{kocName}', '{senderName}', '{reviewNote}'],
      content: [
        '✅ PHÊ DUYỆT VIDEO NHÁP THÀNH CÔNG',
        '----------------------------------------',
        '• Mã Deal: {dealCode} ({brandName})',
        '• KOC: {kocName}',
        '• Người duyệt: {senderName}',
        '• Ghi chú duyệt: {reviewNote}',
        '• Trạng thái Deal: ĐÃ_DUYỆT_NHÁP',
        '----------------------------------------',
        '👉 Khi đăng video lên TikTok xong, KOC chỉ cần gửi link TikTok vào nhóm này để Bot nghiệm thu tự động!',
      ].join('\n'),
    },
    {
      key: 'DRAFT_REJECTED',
      label: '6. Thông báo yêu cầu chỉnh sửa video nháp (/suanhap)',
      triggerHint: 'Phản hồi khi PIC hoặc Đại diện Brand gõ /suanhap <nội dung>',
      availablePlaceholders: ['{dealCode}', '{brandName}', '{senderName}', '{feedback}'],
      content: [
        '🛠️ YÊU CẦU CHỈNH SỬA VIDEO NHÁP',
        '----------------------------------------',
        '• Mã Deal: {dealCode} ({brandName})',
        '• Người yêu cầu: {senderName}',
        '• Nội dung cần điều chỉnh: {feedback}',
        '• Trạng thái Deal: CẦN_CHỈNH_SỬA',
        '----------------------------------------',
        '👉 Sau khi chỉnh sửa xong, KOC gửi lại link Google Drive mới kèm lệnh /nopnhap nhé!',
      ].join('\n'),
    },
    {
      key: 'BRAND_PROGRESS_REPORT',
      label: '7. Báo cáo tiến độ chiến dịch dành cho Nhóm Brand (/tiendo, /baocaobrand)',
      triggerHint: 'Phản hồi trong Nhóm làm việc với Nhãn hàng (BRAND_PARTNER) khi gõ /tiendo hoặc /baocaobrand',
      availablePlaceholders: [
        '{brandName}',
        '{leaderName}',
        '{storeSummary}',
        '{airedSummary}',
        '{pendingDraftSummary}',
      ],
      content: [
        '📊 BÁO CÁO TIẾN ĐỘ CHIẾN DỊCH NHÃN HÀNG: {brandName}',
        '• Quản lý điều phối Upbase: {leaderName}',
        '----------------------------------------',
        '{storeSummary}',
        '----------------------------------------',
        '📌 TÌNH HÌNH NGHIỆM THU & BẢN NHÁP:',
        '{airedSummary}',
        '{pendingDraftSummary}',
        '----------------------------------------',
        '👉 Lệnh hỗ trợ Nhãn hàng trong nhóm: /listing (xem KOC đề xuất), /nhapchoduyet (xem demo chờ duyệt), /duyetkoc <@handle>, /duyetnhap <@handle>.',
      ].join('\n'),
    },
  ],
  broadcastTemplates: [
    {
      id: 'brief_reminder',
      label: 'Mẫu gửi Brief chiến dịch KOC',
      targetRole: 'KOC_GROUP',
      content: [
        '📋 THÔNG BÁO BRIEF CHIẾN DỊCH BOOKING KOC',
        '• Thương hiệu: ClubClio Vietnam',
        '• Sản phẩm: Phấn nước Clio Kill Cover Mesh Glow Cushion',
        '• Yêu cầu nội dung: Quay cận cảnh chất kem che khuyết điểm dưới ánh sáng tự nhiên trong 3 giây đầu, gắn giỏ hàng sản phẩm chính hãng góc trái.',
        '• Hashtag bắt buộc: #ClubClio #ClioCushion #BeautyReview',
        '• Hạn nộp video nháp: 30/10/2026',
        '👉 Khi quay xong bản nháp, KOC gửi link Google Drive kèm lệnh /nopnhap vào nhóm nhé!',
      ].join('\n'),
    },
    {
      id: 'sla_24h',
      label: 'Mẫu nhắc hạn nộp video (SLA 24h)',
      targetRole: 'KOC_GROUP',
      content: [
        '⏰ NHẮC LỊCH NỘP VIDEO CHIẾN DỊCH (CÒN 24 GIỜ)',
        '• Chào bạn, thời hạn nộp video nháp cho chiến dịch đang sắp đến hạn.',
        '• Vui lòng gửi link Google Drive video nháp vào nhóm kèm lệnh: /nopnhap <link_drive>',
        '• Nếu đã được duyệt nháp và đăng bài lên TikTok, hãy gửi link TikTok kèm tag @Bot để hệ thống nghiệm thu tự động.',
      ].join('\n'),
    },
    {
      id: 'brand_listing_submit',
      label: 'Mẫu trình Nhãn hàng duyệt danh sách KOC (SLA 48h)',
      targetRole: 'BRAND_PARTNER',
      content: [
        '📑 TRÌNH DUYỆT DANH SÁCH KOC ĐỀ XUẤT CHIẾN DỊCH THÁNG',
        '• Kính gửi Anh/Chị đại diện Nhãn hàng,',
        '• Team Booking Upbase đã cập nhật danh sách KOC đề xuất đợt mới kèm phân tích GMV, View trung vị và mức giá Net dự kiến.',
        '• Anh/Chị có thể gõ trực tiếp trong nhóm này:',
        '  - /listing : Để xem nhanh danh sách KOC đang chờ duyệt',
        '  - /duyetkoc <@handle> : Để chốt chọn KOC ngay trên Zalo (đo SLA 48h)',
        '  - /tuchoikoc <@handle> <lý do> : Để báo đổi KOC khác',
      ].join('\n'),
    },
    {
      id: 'brand_draft_review',
      label: 'Mẫu mời Nhãn hàng duyệt Video Demo của KOC',
      targetRole: 'BRAND_PARTNER',
      content: [
        '🎬 BÁO CÁO VIDEO DEMO KOC MỚI NỘP CHỜ BRAND DUYỆT',
        '• Team Upbase đã kiểm tra sơ bộ kịch bản và gửi link video nháp của KOC lên hệ thống.',
        '• Anh/Chị đại diện Nhãn hàng vui lòng gõ /nhapchoduyet để xem danh sách link Drive và phản hồi bằng lệnh /duyetnhap hoặc /suanhap nhé!',
      ].join('\n'),
    },
    {
      id: 'overbudget_alert',
      label: 'Mẫu cảnh báo kiểm soát hạn mức ngân sách Net nội bộ',
      targetRole: 'INTERNAL_OPS',
      content: [
        '🚨 CẢNH BÁO KIỂM SOÁT HẠN MỨC NGÂN SÁCH NET',
        '• Đề nghị các PIC rà soát lại các deal trả phí trước khi chốt danh sách trình duyệt.',
        '• Các gian hàng thuộc nhóm 8 Brand trọng điểm trình qua Leader Nguyễn Thị Ngọc Tâm; các gian hàng còn lại trình trực tiếp Giám đốc B2C Đặng Thị Yến Nhi.',
      ].join('\n'),
    },
  ],
  updatedAt: '2026-10-28T10:00:00.000Z',
};

export function getReplyConfig(): ZaloBotReplyConfig {
  if (inMemoryReplyConfig) return inMemoryReplyConfig;
  try {
    if (fs.existsSync(REPLY_CONFIG_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(REPLY_CONFIG_FILE_PATH, 'utf-8'));
      if (data && typeof data === 'object') {
        const mergedTemplates = DEFAULT_REPLY_CONFIG.autoReplyTemplates.map((defTpl) => {
          const custom = Array.isArray(data.autoReplyTemplates)
            ? data.autoReplyTemplates.find((t: any) => t?.key === defTpl.key)
            : null;
          return custom && typeof custom.content === 'string' && custom.content.trim()
            ? { ...defTpl, content: custom.content }
            : defTpl;
        });
        const loaded: ZaloBotReplyConfig = {
          sendHoldingPhotoOnAirCheck:
            typeof data.sendHoldingPhotoOnAirCheck === 'boolean'
              ? data.sendHoldingPhotoOnAirCheck
              : DEFAULT_REPLY_CONFIG.sendHoldingPhotoOnAirCheck,
          sendScanningProgressMessage:
            typeof data.sendScanningProgressMessage === 'boolean'
              ? data.sendScanningProgressMessage
              : DEFAULT_REPLY_CONFIG.sendScanningProgressMessage,
          autoReplyTemplates: mergedTemplates,
          broadcastTemplates:
            Array.isArray(data.broadcastTemplates) && data.broadcastTemplates.length > 0
              ? data.broadcastTemplates
              : DEFAULT_REPLY_CONFIG.broadcastTemplates,
          updatedAt: data.updatedAt || DEFAULT_REPLY_CONFIG.updatedAt,
        };
        inMemoryReplyConfig = loaded;
        return loaded;
      }
    }
  } catch {
    // Zero-Crash fallback
  }
  const fallback: ZaloBotReplyConfig = JSON.parse(JSON.stringify(DEFAULT_REPLY_CONFIG));
  inMemoryReplyConfig = fallback;
  return fallback;
}

async function performDbHydration(skipCache = false): Promise<void> {
  if (!skipCache && dbHydrationInFlight) return dbHydrationInFlight;
  dbHydrationInFlight = (async () => {
    try {
      const rec = await readRecord<ZaloBotPersistedState>(
        ZALO_BOT_SHARED_KEY,
        {
          mappings: {},
          permissions: {},
          discoveredSenders: {},
        },
        { skipCache }
      );
      if (rec?.data) {
        if (rec.data.mappings && typeof rec.data.mappings === 'object') {
          for (const [gid, item] of Object.entries(rec.data.mappings)) {
            if (gid && item) {
              inMemoryMappings.set(gid, item);
            }
          }
        }
        if (rec.data.permissions && typeof rec.data.permissions === 'object') {
          for (const [uid, perm] of Object.entries(rec.data.permissions)) {
            if (uid && perm) {
              inMemoryPermissions.set(uid, perm);
            }
          }
        }
        if (rec.data.discoveredSenders && typeof rec.data.discoveredSenders === 'object') {
          for (const [sid, sender] of Object.entries(rec.data.discoveredSenders)) {
            if (sid && sender) {
              inMemoryDiscoveredSenders.set(sid, sender);
            }
          }
        }
        if (rec.data.securityPolicy) {
          inMemorySecurityPolicy = { ...DEFAULT_SECURITY_POLICY, ...rec.data.securityPolicy };
        }
        if (rec.data.replyConfig) {
          const mergedTemplates = DEFAULT_REPLY_CONFIG.autoReplyTemplates.map((defTpl) => {
            const custom = Array.isArray(rec.data.replyConfig?.autoReplyTemplates)
              ? rec.data.replyConfig.autoReplyTemplates.find((t) => t?.key === defTpl.key)
              : null;
            if (!custom || typeof custom.content !== 'string' || !custom.content.trim()) {
              return defTpl;
            }
            if (defTpl.key === 'AIR_CHECK_RESULT' && !custom.content.includes('{productLinks}')) {
              return defTpl;
            }
            return { ...defTpl, content: custom.content };
          });
          inMemoryReplyConfig = {
            ...DEFAULT_REPLY_CONFIG,
            ...rec.data.replyConfig,
            autoReplyTemplates: mergedTemplates,
          };
        }
      }
      lastDbHydratedAt = Date.now();
    } catch {
      // Fallback an toàn trên bộ nhớ trong
    } finally {
      dbHydrationInFlight = null;
    }
  })();
  return dbHydrationInFlight;
}

/**
 * Đồng bộ trạng thái Zalo Bot từ PostgreSQL (AppSharedRecord) theo cơ chế Stale-While-Revalidate:
 * - Nếu forceFresh = true (gọi từ Web Admin): đọc trực tiếp dữ liệu mới nhất từ PostgreSQL (bỏ qua cache).
 * - Nếu instance đã có cache trong RAM (< 15s): trả về ngay lập tức trong 0ms.
 * - Nếu cache đã quá 15s: trả về ngay lập tức từ RAM và làm mới ngầm từ DB.
 * - Nếu Cold Start lần đầu: giới hạn thời gian chờ DB tối đa 700ms để Bot phản hồi tức thì.
 */
export async function hydrateZaloBotStateFromDb(options?: { forceFresh?: boolean }): Promise<void> {
  loadMappings();
  loadPermissions();
  getSecurityPolicy();
  getReplyConfig();

  if (options?.forceFresh) {
    await performDbHydration(true);
    return;
  }

  const ageMs = Date.now() - lastDbHydratedAt;
  if (lastDbHydratedAt > 0) {
    if (ageMs >= 15000) {
      void performDbHydration();
    }
    return;
  }

  await Promise.race([
    performDbHydration(),
    new Promise<void>((resolve) => setTimeout(resolve, 700)),
  ]);
}

/**
 * Lưu nguyên tử (Atomic Merge theo từng groupId / senderId) xuống PostgreSQL
 * bằng cơ chế Optimistic Locking (revision) để chống xung đột khi nhiều nhóm nhắn cùng lúc.
 */
export async function syncZaloBotStateToDb(patch?: {
  upsertGroup?: ZaloGroupMapping;
  removeGroupId?: string;
  upsertPerm?: ZaloUserPermission;
  removePermId?: string;
  upsertSender?: ZaloDiscoveredSender;
  securityPolicy?: ZaloBotSecurityPolicy;
  replyConfig?: ZaloBotReplyConfig;
}): Promise<void> {
  try {
    await upsertRecord<ZaloBotPersistedState>(
      ZALO_BOT_SHARED_KEY,
      {
        mappings: Object.fromEntries(loadMappings().entries()),
        permissions: Object.fromEntries(loadPermissions().entries()),
        discoveredSenders: Object.fromEntries(inMemoryDiscoveredSenders.entries()),
        securityPolicy: getSecurityPolicy(),
        replyConfig: getReplyConfig(),
      },
      (current) => {
        const nextMappings = {
          ...Object.fromEntries(loadMappings().entries()),
          ...(current?.mappings || {}),
        };
        const nextPermissions = {
          ...Object.fromEntries(loadPermissions().entries()),
          ...(current?.permissions || {}),
        };
        const nextSenders = {
          ...Object.fromEntries(inMemoryDiscoveredSenders.entries()),
          ...(current?.discoveredSenders || {}),
        };

        if (patch?.upsertGroup) {
          nextMappings[patch.upsertGroup.groupId] = patch.upsertGroup;
        }
        if (patch?.removeGroupId) {
          delete nextMappings[patch.removeGroupId];
        }
        if (patch?.upsertPerm) {
          nextPermissions[patch.upsertPerm.zaloUserId] = patch.upsertPerm;
        }
        if (patch?.removePermId) {
          delete nextPermissions[patch.removePermId];
        }
        if (patch?.upsertSender) {
          nextSenders[patch.upsertSender.senderId] = patch.upsertSender;
        }

        return {
          mappings: nextMappings,
          permissions: nextPermissions,
          discoveredSenders: nextSenders,
          securityPolicy: patch?.securityPolicy || current?.securityPolicy || getSecurityPolicy(),
          replyConfig: patch?.replyConfig || current?.replyConfig || getReplyConfig(),
        };
      }
    );
  } catch {
    // Non-fatal fallback
  }
}

export function setGroupMapping(mapping: ZaloGroupMapping): void {
  const map = loadMappings();
  map.set(mapping.groupId, mapping);
  saveMappings();
  void syncZaloBotStateToDb({ upsertGroup: mapping });
}

export function removeGroupMapping(groupId: string): boolean {
  const map = loadMappings();
  const deleted = map.delete(groupId);
  if (deleted) {
    saveMappings();
    void syncZaloBotStateToDb({ removeGroupId: groupId });
  }
  return deleted;
}

export function getAllUserPermissions(): ZaloUserPermission[] {
  return Array.from(loadPermissions().values());
}

export function setUserPermission(perm: ZaloUserPermission): void {
  const map = loadPermissions();
  map.set(perm.zaloUserId, perm);
  savePermissions();
  void syncZaloBotStateToDb({ upsertPerm: perm });
}

export function removeUserPermission(zaloUserId: string): boolean {
  const map = loadPermissions();
  const deleted = map.delete(zaloUserId);
  if (deleted) {
    savePermissions();
    void syncZaloBotStateToDb({ removePermId: zaloUserId });
  }
  return deleted;
}

export function getAirCheckHistory(): ZaloAirCheckHistoryItem[] {
  return loadAirHistory();
}

export function setSecurityPolicy(nextPolicy: Partial<ZaloBotSecurityPolicy>): ZaloBotSecurityPolicy {
  const current = getSecurityPolicy();
  inMemorySecurityPolicy = {
    ...current,
    ...nextPolicy,
    updatedAt: new Date().toISOString(),
  };
  try {
    const dir = path.dirname(SECURITY_POLICY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      SECURITY_POLICY_FILE_PATH,
      JSON.stringify(inMemorySecurityPolicy, null, 2),
      'utf-8'
    );
  } catch {
    // Non-fatal on serverless read-only fs
  }
  void syncZaloBotStateToDb({ securityPolicy: inMemorySecurityPolicy });
  return inMemorySecurityPolicy;
}

export function setReplyConfig(patch: Partial<ZaloBotReplyConfig>): ZaloBotReplyConfig {
  const current = getReplyConfig();
  const nextAutoReply = Array.isArray(patch.autoReplyTemplates)
    ? DEFAULT_REPLY_CONFIG.autoReplyTemplates.map((defTpl) => {
        const incoming = patch.autoReplyTemplates!.find((t) => t.key === defTpl.key);
        const existing = current.autoReplyTemplates.find((t) => t.key === defTpl.key);
        return {
          ...defTpl,
          content:
            incoming && typeof incoming.content === 'string' && incoming.content.trim()
              ? incoming.content
              : existing?.content || defTpl.content,
        };
      })
    : current.autoReplyTemplates;

  inMemoryReplyConfig = {
    sendHoldingPhotoOnAirCheck:
      typeof patch.sendHoldingPhotoOnAirCheck === 'boolean'
        ? patch.sendHoldingPhotoOnAirCheck
        : current.sendHoldingPhotoOnAirCheck,
    sendScanningProgressMessage:
      typeof patch.sendScanningProgressMessage === 'boolean'
        ? patch.sendScanningProgressMessage
        : current.sendScanningProgressMessage,
    autoReplyTemplates: nextAutoReply,
    broadcastTemplates: Array.isArray(patch.broadcastTemplates)
      ? patch.broadcastTemplates
      : current.broadcastTemplates,
    updatedAt: new Date().toISOString(),
  };

  if (!IS_SERVERLESS_READONLY) {
    try {
      const dir = path.dirname(REPLY_CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        REPLY_CONFIG_FILE_PATH,
        JSON.stringify(inMemoryReplyConfig, null, 2),
        'utf-8'
      );
    } catch {
      // Non-fatal
    }
  }
  void syncZaloBotStateToDb({ replyConfig: inMemoryReplyConfig });
  return inMemoryReplyConfig;
}

export function resetReplyConfigToDefault(): ZaloBotReplyConfig {
  inMemoryReplyConfig = {
    ...JSON.parse(JSON.stringify(DEFAULT_REPLY_CONFIG)),
    updatedAt: new Date().toISOString(),
  };
  if (!IS_SERVERLESS_READONLY) {
    try {
      if (fs.existsSync(REPLY_CONFIG_FILE_PATH)) {
        fs.unlinkSync(REPLY_CONFIG_FILE_PATH);
      }
    } catch {
      // ignore
    }
  }
  void syncZaloBotStateToDb({ replyConfig: inMemoryReplyConfig! });
  return inMemoryReplyConfig!;
}

export function renderReplyTemplate(
  key: ZaloAutoReplyKey,
  vars: Record<string, string | number | undefined | null>
): string {
  const cfg = getReplyConfig();
  const tplObj =
    cfg.autoReplyTemplates.find((t) => t.key === key) ||
    DEFAULT_REPLY_CONFIG.autoReplyTemplates.find((t) => t.key === key);
  const rawContent = tplObj?.content || '';
  const replaced = rawContent.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) => {
    const val = vars[token];
    return val === undefined || val === null ? '' : String(val);
  });
  return replaced
    .split('\n')
    .filter((line) => line.trim() !== '' && !/^[•\-]\s*[^:]+:\s*$/.test(line.trim()))
    .join('\n');
}

export function recordAirCheckHistory(item: ZaloAirCheckHistoryItem): void {
  const list = loadAirHistory();
  list.unshift(item);
  if (list.length > 50) list.pop();
  saveAirHistory();
}

export function getZaloBotToken(): string {
  return (
    process.env.ZALO_BOT_TOKEN ||
    '4534079839618724427:PHeGUcxPiQVcvwNfgrfsxwAfSKahskDzybsTUkbNlfydmkqzSqanzVhMLkjvOxEj'
  );
}

export function getZaloBotSecretToken(): string {
  return process.env.ZALO_BOT_SECRET_TOKEN || 'hDHDHT7wyBCafz3--U';
}

/**
 * Gửi tin nhắn qua Zalo Bot Platform API
 */
export async function sendZaloMessage(chatId: string, text: string): Promise<boolean> {
  const token = getZaloBotToken();
  if (!token) {
    console.error('[ZaloBot] Thiếu ZALO_BOT_TOKEN');
    return false;
  }

  try {
    const res = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('[ZaloBot] Gửi tin thất bại từ API Zalo:', data);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ZaloBot] Exception khi gửi tin:', err);
    return false;
  }
}

const FRAME_CAPTURE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function storeCapturedFrameBuffer(frameId: string, buffer: Buffer): void {
  if (!frameId || buffer.length < 300) return;
  if (inMemoryCapturedFrames.size >= 40) {
    const oldestKey = inMemoryCapturedFrames.keys().next().value;
    if (oldestKey) inMemoryCapturedFrames.delete(oldestKey);
  }
  inMemoryCapturedFrames.set(frameId, { buffer, createdAt: Date.now() });
}

export function getCachedFrameBuffer(frameId?: string | null): Buffer | null {
  if (!frameId) return null;
  const hit = inMemoryCapturedFrames.get(frameId);
  if (!hit) return null;
  if (Date.now() - hit.createdAt > 60 * 60 * 1000) {
    inMemoryCapturedFrames.delete(frameId);
    return null;
  }
  return hit.buffer;
}

function extractSingleFrameWithFfmpeg(streamUrl: string, sec: number): Promise<Buffer | null> {
  if (isFfmpegUnavailable) return Promise.resolve(null);
  return new Promise((resolve) => {
    const safeSec = Math.max(0.5, Math.min(180, Number(sec) || 2.5));
    const storeCookie =
      getSharedCrawlerStore().wafSessionCookie &&
      getSharedCrawlerStore().wafSessionCookie!.expiresAt > Date.now()
        ? getSharedCrawlerStore().wafSessionCookie!.cookie
        : undefined;
    const headerLines = ['Referer: https://www.tiktok.com/'];
    if (storeCookie) {
      headerLines.push(`Cookie: ${storeCookie}`);
    }
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      safeSec.toFixed(2),
      '-user_agent',
      FRAME_CAPTURE_UA,
      '-headers',
      `${headerLines.join('\r\n')}\r\n`,
      '-i',
      streamUrl,
      '-frames:v',
      '1',
      '-vf',
      'scale=540:-2',
      '-q:v',
      '3',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ];

    let settled = false;
    const chunks: Buffer[] = [];
    let proc: ReturnType<typeof spawn> | null = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          proc?.kill('SIGKILL');
        } catch {
          // ignore
        }
        resolve(null);
      }
    }, 4500);

    try {
      proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.on('error', (err: any) => {
        if (err?.code === 'ENOENT') {
          isFfmpegUnavailable = true;
        }
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
      proc.on('close', (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (code === 0 && chunks.length > 0) {
            const buf = Buffer.concat(chunks);
            resolve(buf.length > 400 ? buf : null);
          } else {
            resolve(null);
          }
        }
      });
    } catch {
      isFfmpegUnavailable = true;
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

let cachedBeVietnamFont: Buffer | null = null;
const BE_VIETNAM_FONT_PATH = path.join(process.cwd(), 'src/data/BeVietnamPro-SemiBold.ttf');

async function loadBeVietnamFontBuffer(): Promise<Buffer | null> {
  if (cachedBeVietnamFont) return cachedBeVietnamFont;
  try {
    if (fs.existsSync(BE_VIETNAM_FONT_PATH)) {
      cachedBeVietnamFont = fs.readFileSync(BE_VIETNAM_FONT_PATH);
      return cachedBeVietnamFont;
    }
  } catch {
    // fallback to remote
  }
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/BeVietnamPro-SemiBold.ttf',
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      cachedBeVietnamFont = Buffer.from(await res.arrayBuffer());
      return cachedBeVietnamFont;
    }
  } catch {
    // ignore
  }
  return null;
}

export interface TikTokFrameOverlayMeta {
  kocHandle?: string | null;
  kocName?: string | null;
  timeLabel?: string | null;
  airedAt?: string | null;
  views?: number | string | null;
  productTitle?: string | null;
  productId?: string | null;
  hashtags?: string | null;
  quote?: string | null;
  mentionSec?: number | string | null;
}

async function stampTikTokAcceptanceOverlay(
  rawFrameBuf: Buffer,
  captureSec: number,
  meta: TikTokFrameOverlayMeta
): Promise<Buffer> {
  try {
    const fontBuf = await loadBeVietnamFontBuffer();
    const isPng = rawFrameBuf[0] === 0x89 && rawFrameBuf[1] === 0x50;
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const bgDataUrl = `data:${mime};base64,${rawFrameBuf.toString('base64')}`;

    const cleanHandle = String(meta.kocHandle || 'koc').replace(/^@+/, '');
    const displayName = meta.kocName && meta.kocName !== cleanHandle ? meta.kocName : '';
    const topTitle = displayName ? `@${cleanHandle} · ${displayName}` : `@${cleanHandle}`;
    const secBadgeText = `Giây ${Number(captureSec).toFixed(1)}s${
      meta.timeLabel ? ` (${meta.timeLabel})` : ''
    }`;
    const rawProdTitle = (meta.productTitle || '').trim();
    const shortProdTitle =
      rawProdTitle.length > 64 ? `${rawProdTitle.slice(0, 62)}...` : rawProdTitle;
    const cartLabelText = shortProdTitle
      ? `${shortProdTitle}${meta.productId ? ` [SP: ${meta.productId}]` : ''}`
      : '';
    const subStatsParts: string[] = [];
    if (meta.airedAt && meta.airedAt !== 'Chưa xác định') {
      subStatsParts.push(`Air: ${meta.airedAt}`);
    }
    if (meta.views !== null && meta.views !== undefined && String(meta.views) !== '') {
      const viewsFormatted =
        typeof meta.views === 'number' ? meta.views.toLocaleString('vi-VN') : String(meta.views);
      subStatsParts.push(`${viewsFormatted} lượt xem`);
    }
    const subStatsLine = subStatsParts.join(' · ');
    const cleanQuote = (meta.quote || '').trim();
    const shortQuote = cleanQuote.length > 82 ? `${cleanQuote.slice(0, 80)}...` : cleanQuote;

    const el = React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '540px',
          height: '960px',
          position: 'relative',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontFamily: fontBuf ? 'BeVietnamPro' : 'sans-serif',
        },
      },
      React.createElement('img', {
        src: bgDataUrl,
        width: 540,
        height: 960,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '540px',
          height: '960px',
          objectFit: 'cover',
        },
      }),
      // Thanh tiêu đề trên cùng: Tên kênh + Mốc giây chụp
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.84)',
            borderBottom: '1px solid rgba(255,255,255,0.18)',
            width: '540px',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', fontSize: '15px', color: '#ffffff' } },
          topTitle.slice(0, 36)
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              backgroundColor: '#16a34a',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '13px',
              color: '#ffffff',
            },
          },
          secBadgeText
        )
      ),
      // Khung giao diện TikTok bên dưới: Giỏ hàng cam + Tên kênh @handle + Ngày giờ Air + Lời thoại
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            padding: '14px 16px 18px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            width: '540px',
          },
        },
        cartLabelText
          ? React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(30, 41, 59, 0.96)',
                  border: '1.5px solid #f97316',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  marginBottom: '10px',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    backgroundColor: '#f97316',
                    color: '#ffffff',
                    borderRadius: '5px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    marginRight: '8px',
                  },
                },
                'Giỏ hàng'
              ),
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: '13px',
                    color: '#fed7aa',
                  },
                },
                cartLabelText
              )
            )
          : null,
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px',
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', fontSize: '20px', color: '#ffffff' } },
            `@${cleanHandle}`
          ),
          subStatsLine
            ? React.createElement(
                'div',
                { style: { display: 'flex', fontSize: '13px', color: '#cbd5e1' } },
                subStatsLine
              )
            : null
        ),
        meta.hashtags
          ? React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginBottom: shortQuote ? '6px' : '0px',
                },
              },
              String(meta.hashtags).slice(0, 72)
            )
          : null,
        shortQuote
          ? React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  backgroundColor: 'rgba(30, 41, 59, 0.92)',
                  borderLeft: '3px solid #38bdf8',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                },
              },
              `Lời thoại${meta.mentionSec ? ` (${meta.mentionSec}s)` : ''}: "${shortQuote}"`
            )
          : null
      )
    );

    const imgRes = new ImageResponse(el, {
      width: 540,
      height: 960,
      ...(fontBuf
        ? { fonts: [{ name: 'BeVietnamPro', data: fontBuf, style: 'normal', weight: 600 }] }
        : {}),
    });
    const stampedBuf = Buffer.from(await imgRes.arrayBuffer());
    return stampedBuf.length > 1000 ? stampedBuf : rawFrameBuf;
  } catch {
    return rawFrameBuf;
  }
}

/**
 * Cắt khung hình tại đúng mốc giây KOC cầm/giới thiệu sản phẩm từ luồng MP4 TikTok (hoặc ảnh bìa gốc trên Serverless)
 * và đóng dấu trực tiếp giao diện TikTok (Tên kênh @handle, Hộp giỏ hàng màu cam, Ngày giờ Air, Mốc giây & Lời thoại).
 */
export async function captureTikTokProductFrameBuffer(params: {
  videoUrl: string;
  playableUrl?: string | null;
  coverUrl?: string | null;
  captureSec: number;
  frameId?: string | null;
  overlayMeta?: TikTokFrameOverlayMeta;
}): Promise<{
  buffer: Buffer | null;
  source: 'FFMPEG_FRAME' | 'TIKTOK_COVER' | 'NONE';
  resolvedCoverUrl?: string;
}> {
  if (params.frameId) {
    const cached = getCachedFrameBuffer(params.frameId);
    if (cached) {
      return {
        buffer: cached,
        source: 'FFMPEG_FRAME',
        resolvedCoverUrl: params.coverUrl || undefined,
      };
    }
  }

  let streamUrl = params.playableUrl || null;
  let coverUrl = params.coverUrl || null;
  const mergedMeta: TikTokFrameOverlayMeta = { ...(params.overlayMeta || {}) };

  if (!streamUrl || !coverUrl || !mergedMeta.kocHandle || !mergedMeta.productTitle) {
    try {
      const inspected = await inspectLiveTikTokVideoPage(params.videoUrl);
      if (inspected) {
        if (!streamUrl && inspected.playableUrl) streamUrl = inspected.playableUrl;
        if (!coverUrl && inspected.coverUrl) coverUrl = inspected.coverUrl;
        if (!mergedMeta.kocHandle && inspected.author?.handle) {
          mergedMeta.kocHandle = inspected.author.handle;
        }
        if (!mergedMeta.kocName && inspected.author?.nickname) {
          mergedMeta.kocName = inspected.author.nickname;
        }
        if (!mergedMeta.productTitle && inspected.cartAnchorTitle) {
          mergedMeta.productTitle = inspected.cartAnchorTitle;
        }
        if (!mergedMeta.productId && inspected.cartProductId) {
          mergedMeta.productId = inspected.cartProductId;
        }
        if (!mergedMeta.airedAt) {
          mergedMeta.airedAt = formatVnDateTimeFromUnixSec(
            inspected.createTimeSec,
            inspected.publishedAt
          );
        }
        if (mergedMeta.views === undefined && inspected.views) {
          mergedMeta.views = inspected.views;
        }
        if (!mergedMeta.hashtags && inspected.hashtags?.length) {
          mergedMeta.hashtags = inspected.hashtags.slice(0, 5).join(' ');
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // Bổ sung luồng MP4 H.264 và ảnh cover JPEG từ TikWM nếu chưa có sẵn
  if (!streamUrl || !coverUrl) {
    try {
      const tikwmRes = await fetch(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(params.videoUrl)}&hd=1`,
        {
          headers: {
            'User-Agent': FRAME_CAPTURE_UA,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        }
      );
      if (tikwmRes.ok) {
        const tikwmJson = await tikwmRes.json();
        const data = tikwmJson?.data;
        if (data) {
          if (!streamUrl && typeof data.play === 'string' && data.play.startsWith('http')) {
            streamUrl = data.play;
          } else if (!streamUrl && typeof data.wmplay === 'string' && data.wmplay.startsWith('http')) {
            streamUrl = data.wmplay;
          }
          const tikwmCover =
            typeof data.cover === 'string' && data.cover.startsWith('http')
              ? data.cover
              : typeof data.origin_cover === 'string' && data.origin_cover.startsWith('http')
                ? data.origin_cover
                : null;
          if (!coverUrl && tikwmCover) {
            coverUrl = tikwmCover;
          }
          if (!mergedMeta.kocHandle && data.author?.unique_id) {
            mergedMeta.kocHandle = String(data.author.unique_id);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  let rawBuffer: Buffer | null = null;
  let rawSource: 'FFMPEG_FRAME' | 'TIKTOK_COVER' | 'NONE' = 'NONE';

  // 1. Thử trích xuất chính xác khung hình tại giây captureSec bằng ffmpeg
  if (streamUrl) {
    let ffmpegBuf = await extractSingleFrameWithFfmpeg(streamUrl, params.captureSec);
    if ((!ffmpegBuf || ffmpegBuf.length <= 400) && !isFfmpegUnavailable) {
      try {
        const tikwmRetry = await fetch(
          `https://www.tikwm.com/api/?url=${encodeURIComponent(params.videoUrl)}&hd=1`,
          {
            headers: {
              'User-Agent': FRAME_CAPTURE_UA,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(4500),
            cache: 'no-store',
          }
        );
        if (tikwmRetry.ok) {
          const retryJson = await tikwmRetry.json();
          const retryStream = retryJson?.data?.play || retryJson?.data?.wmplay;
          if (
            typeof retryStream === 'string' &&
            retryStream.startsWith('http') &&
            retryStream !== streamUrl
          ) {
            ffmpegBuf = await extractSingleFrameWithFfmpeg(retryStream, params.captureSec);
          }
        }
      } catch {
        // ignore retry error
      }
    }
    if (ffmpegBuf && ffmpegBuf.length > 400) {
      rawBuffer = ffmpegBuf;
      rawSource = 'FFMPEG_FRAME';
    }
  }

  // 2. Nhánh dự phòng Zero-Crash trên Serverless: tải ảnh khung hình JPEG từ coverUrl
  if (!rawBuffer && coverUrl) {
    try {
      const imgRes = await fetch(coverUrl, {
        headers: {
          'User-Agent': FRAME_CAPTURE_UA,
          Accept: 'image/jpeg,image/png,image/*;q=0.8',
          Referer: 'https://www.tiktok.com/',
        },
        signal: AbortSignal.timeout(4500),
        cache: 'no-store',
      });
      if (imgRes.ok) {
        const arrBuf = await imgRes.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length > 400) {
          rawBuffer = buf;
          rawSource = 'TIKTOK_COVER';
        }
      }
    } catch {
      // ignore
    }
  }

  if (rawBuffer) {
    const finalBuf = await stampTikTokAcceptanceOverlay(rawBuffer, params.captureSec, mergedMeta);
    if (params.frameId) {
      storeCapturedFrameBuffer(params.frameId, finalBuf);
    }
    return {
      buffer: finalBuf,
      source: rawSource,
      resolvedCoverUrl: coverUrl || undefined,
    };
  }

  return { buffer: null, source: 'NONE', resolvedCoverUrl: coverUrl || undefined };
}

export function buildPublicZaloFrameUrl(params: {
  frameId: string;
  videoUrl: string;
  captureSec: number;
  coverUrl?: string | null;
  overlayMeta?: TikTokFrameOverlayMeta;
  relativeOnly?: boolean;
}): string {
  const qs = new URLSearchParams({
    frame: '1',
    frameId: params.frameId,
    videoUrl: params.videoUrl,
    sec: String(params.captureSec),
  });
  if (params.coverUrl) {
    qs.set('coverUrl', params.coverUrl);
  }
  if (params.overlayMeta?.kocHandle) qs.set('handle', params.overlayMeta.kocHandle);
  if (params.overlayMeta?.kocName) qs.set('name', params.overlayMeta.kocName);
  if (params.overlayMeta?.timeLabel) qs.set('tl', params.overlayMeta.timeLabel);
  if (params.overlayMeta?.airedAt) qs.set('air', params.overlayMeta.airedAt);
  if (params.overlayMeta?.views !== undefined && params.overlayMeta?.views !== null) {
    qs.set('views', String(params.overlayMeta.views));
  }
  if (params.overlayMeta?.productTitle) qs.set('title', params.overlayMeta.productTitle.slice(0, 70));
  if (params.overlayMeta?.productId) qs.set('pid', params.overlayMeta.productId);
  if (params.overlayMeta?.hashtags) qs.set('tags', params.overlayMeta.hashtags.slice(0, 70));
  if (params.overlayMeta?.quote) qs.set('quote', params.overlayMeta.quote.slice(0, 85));
  if (params.overlayMeta?.mentionSec !== undefined && params.overlayMeta?.mentionSec !== null) {
    qs.set('msec', String(params.overlayMeta.mentionSec));
  }
  const pathWithQuery = `/api/integrations/zalo-bot/webhook?${qs.toString()}`;
  if (params.relativeOnly) return pathWithQuery;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://b2c-theta.vercel.app').replace(
    /\/+$/,
    ''
  );
  return `${baseUrl}${pathWithQuery}`;
}

/**
 * Gửi ảnh chụp nghiệm thu vào nhóm Zalo qua Zalo Bot Platform API (sendPhoto)
 */
export async function sendZaloPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  fallbackPhotoUrl?: string
): Promise<boolean> {
  const token = getZaloBotToken();
  if (!token || !photoUrl) return false;

  const trySendSinglePhoto = async (targetPhotoUrl: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          photo: targetPhotoUrl,
          ...(caption ? { caption } : {}),
        }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        console.warn('[ZaloBot] sendPhoto không thành công với URL:', targetPhotoUrl, data);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[ZaloBot] Exception khi gửi ảnh:', err);
      return false;
    }
  };

  const sentPrimary = await trySendSinglePhoto(photoUrl);
  if (sentPrimary) return true;

  if (fallbackPhotoUrl && fallbackPhotoUrl !== photoUrl && /^https?:\/\//i.test(fallbackPhotoUrl)) {
    return trySendSinglePhoto(fallbackPhotoUrl);
  }
  return false;
}

const TIKTOK_URL_REGEX = /(https?:\/\/(?:vt\.tiktok\.com|www\.tiktok\.com|tiktok\.com)\/[^\s]+)/i;
const DRAFT_URL_REGEX = /(https?:\/\/(?:drive\.google\.com|docs\.google\.com|www\.capcut\.com|capcut\.com)\/[^\s]+)/i;

/**
 * Dựng nội dung Brief chuẩn cho nhóm KOC
 */
export function buildDealBriefMessage(mapping: ZaloGroupMapping): string {
  const requiredHashtags =
    mapping.requiredHashtags && mapping.requiredHashtags.length > 0
      ? mapping.requiredHashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
      : '#UpbaseB2C #ReviewChinhHang';
  return renderReplyTemplate('BRIEF_MESSAGE', {
    dealCode: mapping.dealCode || 'Chưa gán',
    brandName: mapping.brandName || '—',
    storeName: mapping.storeName || 'Gian hàng chính hãng',
    kocName: mapping.kocName || mapping.kocHandle || '—',
    productName: mapping.productName || 'Theo danh mục sản phẩm chiến dịch',
    pillarName: mapping.pillarName || 'Review trực tiếp trải nghiệm thực tế',
    briefSummary:
      mapping.briefSummary ||
      'Quay cận cảnh sản phẩm trong 3 giây đầu, nêu bật công dụng chính và kêu gọi bấm vào giỏ hàng góc trái màn hình.',
    hashtags: requiredHashtags,
    requiredHashtags,
    deadlineDate: mapping.deadlineDate || 'Trong vòng 5 ngày sau khi nhận mẫu',
    picName: mapping.picName || 'Team Booking B2C',
  });
}

/**
 * Dựng báo cáo PnL & Ngân sách từ 69 gian hàng B2C thực tế
 */
export function buildPnlReportMessage(query: string): string {
  const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
  const q = query.trim().toLowerCase();

  if (!q || q === 'all' || q === 'tatca' || q === 'tất cả') {
    let totalGross = 0;
    let totalNet = 0;
    let totalSpentNet = 0;
    let totalPaidTarget = 0;
    let totalFocTarget = 0;
    let totalAired = 0;
    let overbudgetCount = 0;

    for (const s of b2cStores) {
      const storeNet = Math.round(Number(s.budgetNet || 0));
      const storeSpent = Math.round(Number(s.actualSpentNet || 0));
      totalGross += Math.round(Number(s.budgetGross || 0));
      totalNet += storeNet;
      totalSpentNet += storeSpent;
      totalPaidTarget += Math.round(Number(s.targetPaidVideos || 0));
      totalFocTarget += Math.round(Number(s.targetFocVideos || 0));
      totalAired += Math.round(Number(s.actualAiredVideos || 0));
      if (
        s.financialRiskStatus === 'OVERBUDGET' ||
        s.financialRiskStatus === 'UNBUDGETED' ||
        (storeNet === 0 && storeSpent > 0) ||
        (storeNet > 0 && storeSpent > storeNet)
      ) {
        overbudgetCount += 1;
      }
    }

    const burnRatePct = totalNet === 0 ? 0 : Number(((totalSpentNet / totalNet) * 100).toFixed(1));

    return [
      `📊 TỔNG HỢP NGÂN SÁCH & PNL PHÒNG B2C (${b2cStores.length} GIAN HÀNG)`,
      `----------------------------------------`,
      `• Giám đốc quản lý trần PnL: Đặng Thị Yến Nhi`,
      `• Tổng hạn mức Gross: ${formatVnd(totalGross)}`,
      `• Tổng hạn mức Net (Kế toán kiểm soát): ${formatVnd(totalNet)}`,
      `• Thực chi Net lũy kế: ${formatVnd(totalSpentNet)} (${burnRatePct}%)`,
      `• Hạn mức Net còn lại: ${formatVnd(Math.max(0, totalNet - totalSpentNet))}`,
      `• Tiến độ Video: Đã Air ${totalAired} video (Chỉ tiêu: ${totalPaidTarget} Paid / ${totalFocTarget} FOC)`,
      `• Cảnh báo vượt trần / Chi 0đ: ${overbudgetCount} gian hàng`,
      `----------------------------------------`,
      `👉 Gõ /pnl <tên_brand> (ví dụ: /pnl clubclio, /pnl eupc, /pnl mine) để xem chi tiết từng thương hiệu.`,
      `👉 Gõ /overbudget để xem danh sách gian hàng cảnh báo đỏ.`,
    ].join('\n');
  }

  const matched = b2cStores.filter(
    (s) =>
      s.brandName.toLowerCase().includes(q) ||
      s.storeName.toLowerCase().includes(q)
  );

  if (matched.length === 0) {
    return `⚠️ Không tìm thấy gian hàng B2C nào khớp với từ khóa "${query}". Hãy thử: /pnl clubclio, /pnl eupc, /pnl mine, /pnl cindy bloom, /pnl rejuran.`;
  }

  const lines: string[] = [
    `📊 CHI TIẾT NGÂN SÁCH & ĐỊNH MỨC BRAND: ${matched[0].brandName.toUpperCase()} (${matched.length} gian hàng)`,
    `• Cấp phê duyệt: ${resolveLeaderForBrand(matched[0].brandName)}`,
    `----------------------------------------`,
  ];

  for (const s of matched.slice(0, 5)) {
    const netLimit = Math.round(Number(s.budgetNet || 0));
    const grossLimit = Math.round(Number(s.budgetGross || 0));
    const spentNet = Math.round(Number(s.actualSpentNet || 0));
    const usagePct = netLimit === 0 ? 0 : Number(((spentNet / netLimit) * 100).toFixed(1));
    const isAlert =
      (netLimit === 0 && spentNet > 0) ||
      (netLimit > 0 && spentNet > netLimit) ||
      s.financialRiskStatus === 'OVERBUDGET' ||
      s.financialRiskStatus === 'UNBUDGETED';

    lines.push(
      `🏪 ${s.storeName} (${s.platform})`,
      `  - Hạn mức Gross: ${formatVnd(grossLimit)} | Hạn mức Net: ${formatVnd(netLimit)}`,
      `  - Thực chi Net: ${formatVnd(spentNet)} (${usagePct}%) ${isAlert ? '🚨 [CẢNH BÁO VƯỢT TRẦN]' : '✅ [TRONG HẠN MỨC]'}`,
      `  - Định mức: ${s.targetPaidVideos || 0} Video trả phí | ${s.targetFocVideos || 0} Mẫu FOC | ${s.targetAffiliateContents || 0} Affiliate | ${s.targetSelfChannelContents || 0} Kênh Brand | ${s.targetLiveSessions || 0} Phiên Live`,
      `  - Đã lên sóng (Air): ${s.actualAiredVideos || 0} video | PIC: ${s.primaryPic || 'Chưa phân công'}`
    );
  }

  return lines.join('\n');
}

/**
 * Dựng danh sách cảnh báo tài chính Overbudget / Unbudgeted Spend
 */
export function buildOverbudgetAlertMessage(): string {
  const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
  const risked = b2cStores.filter((s) => {
    const net = Math.round(Number(s.budgetNet || 0));
    const spent = Math.round(Number(s.actualSpentNet || 0));
    return (
      (net === 0 && spent > 0) ||
      (net > 0 && spent > net) ||
      s.financialRiskStatus === 'OVERBUDGET' ||
      s.financialRiskStatus === 'UNBUDGETED'
    );
  });

  if (risked.length === 0) {
    return [
      `🚨 KIỂM SOÁT CẢNH BÁO TÀI CHÍNH B2C`,
      `----------------------------------------`,
      `• Toàn bộ 69 gian hàng B2C hiện đang trong hạn mức ngân sách Net cho phép.`,
      `• Quy tắc cảnh báo tự động: Báo động đỏ ngay khi phát sinh thực chi Net > Hạn mức Net hoặc phát sinh chi phí khi hạn mức = 0đ.`,
    ].join('\n');
  }

  const lines = [
    `🚨 CẢNH BÁO TÀI CHÍNH B2C (${risked.length} GIAN HÀNG CẦN RÀ SOÁT)`,
    `----------------------------------------`,
  ];

  for (const s of risked.slice(0, 8)) {
    const net = Math.round(Number(s.budgetNet || 0));
    const spent = Math.round(Number(s.actualSpentNet || 0));
    const statusLabel =
      net === 0 && spent > 0
        ? 'Chi không hạn mức (Hạn mức 0đ)'
        : spent > net
          ? `Vượt trần ${formatVnd(spent - net)}`
          : s.financialRiskNotes || 'Cần kiểm tra hạn mức';
    lines.push(
      `• ${s.storeName}: Thực chi ${formatVnd(spent)} / Trần Net ${formatVnd(net)} -> ⚠️ ${statusLabel} (PIC: ${s.primaryPic || '—'})`
    );
  }

  lines.push(
    `----------------------------------------`,
    `👉 Yêu cầu PIC giải trình hoặc trình Giám đốc Marketing (Đặng Thị Yến Nhi) phê duyệt bổ sung hạn mức.`
  );
  return lines.join('\n');
}

/**
 * Tra cứu hồ sơ KOC kèm Data Masking
 */
export function buildKocLookupMessage(query: string, groupRole: ZaloGroupRole): string {
  const cleanHandle = query.replace(/^@/, '').trim().toLowerCase();
  if (!cleanHandle) {
    return `⚠️ Vui lòng nhập ID kênh TikTok hoặc tên KOC. Ví dụ: /koc @po.trann77 hoặc /koc @chutieuhan10012001`;
  }

  let found = KOC_BY_HANDLE_INDEX.get(cleanHandle);
  if (!found) {
    for (const item of QUICK_KOC_CATALOG) {
      if (
        item.handle.toLowerCase().includes(cleanHandle) ||
        item.stageName.toLowerCase().includes(cleanHandle) ||
        item.realName.toLowerCase().includes(cleanHandle)
      ) {
        found = item;
        break;
      }
    }
  }

  if (!found) {
    return `🔍 Chưa tìm thấy KOC "${query}" trong nhóm Flagship. Gợi ý tra cứu nhanh: @po.trann77, @chutieuhan10012001, @hathuuu1610, @rinabeauty859, @soanhtran98, @cin0ntp, @phamsontrang.`;
  }

  // Nếu đang ở trong nhóm KOC_GROUP, ẩn thông tin rate card nội bộ và ROI nhạy cảm
  if (groupRole === 'KOC_GROUP') {
    return [
      `👤 HỒ SƠ ĐỐI TÁC KOC: @${found.handle}`,
      `----------------------------------------`,
      `• Tên hiển thị: ${found.stageName}`,
      `• Phân hạng: ${found.salaryGrade} - ${found.tierLabel}`,
      `• Lượt theo dõi: ${found.followers.toLocaleString('vi-VN')} followers`,
      `• Số chiến dịch đã đồng hành tại Upbase: ${found.totalPastDeals} deals`,
      `• PIC hỗ trợ chính: ${found.bookingPic}`,
      `• Thông tin thanh toán (Đã che mờ bảo mật): ${found.bankName} (${found.maskedBankAccount}) | CCCD/MST: ${found.maskedCccd}`,
    ].join('\n');
  }

  // Nếu đang ở trong nhóm làm việc với Nhãn hàng (BRAND_PARTNER), hiển thị Media Kit chuyên nghiệp, ẩn STK/CCCD cá nhân của KOC
  if (groupRole === 'BRAND_PARTNER') {
    return [
      `🌟 MEDIA KIT ĐỀ XUẤT KOC CHO BRAND: @${found.handle}`,
      `----------------------------------------`,
      `• Nghệ danh KOC: ${found.stageName} (https://www.tiktok.com/@${found.handle})`,
      `• Phân hạng kênh: ${found.salaryGrade} (${found.tierLabel}) | Followers: ${found.followers.toLocaleString('vi-VN')}`,
      `• Mức phí Booking đề xuất (Net): ${formatVnd(found.rateCardNet)}`,
      `• GMV kỷ lục từng đạt: ${formatVnd(found.gmvBestCase)} | Hiệu suất ROI lịch sử: ${found.historicalRoi}`,
      `• Lịch sử đồng hành cùng Upbase: ${found.totalPastDeals} chiến dịch`,
      `• PIC điều phối (Upbase B2C): ${found.bookingPic}`,
      `----------------------------------------`,
      `👉 Phản hồi duyệt KOC ngay trong nhóm:`,
      `• Gõ /duyetkoc @${found.handle} để chốt chọn KOC vào chiến dịch.`,
      `• Gõ /tuchoikoc @${found.handle} <lý do> để yêu cầu đổi ứng viên khác.`,
    ].join('\n');
  }

  return [
    `👤 HỒ SƠ KOC NỘI BỘ: @${found.handle}`,
    `----------------------------------------`,
    `• Pháp nhân / Họ tên: ${found.realName}`,
    `• Phân hạng: ${found.salaryGrade} (${found.tierLabel}) | Followers: ${found.followers.toLocaleString('vi-VN')}`,
    `• Giá Booking tham chiếu (Net): ${formatVnd(found.rateCardNet)}`,
    `• GMV cao nhất từng đạt: ${formatVnd(found.gmvBestCase)} | ROI lịch sử: ${found.historicalRoi}`,
    `• Lịch sử hợp tác: ${found.totalPastDeals} deals (Brand gần nhất: ${found.brandName})`,
    `• PIC phụ trách: ${found.bookingPic}`,
    `• Thuế & Thanh toán (Che mờ bảo mật): ${found.taxAccountType}`,
    `  Ngân hàng: ${found.bankName} - STK: ${found.maskedBankAccount} - CCCD/MST: ${found.maskedCccd}`,
  ].join('\n');
}

/**
 * Dựng danh sách đề xuất KOC (Listing / Shortlist) chờ Nhãn hàng (Brand) phê duyệt
 */
export function buildBrandListingMessage(brandQuery: string): string {
  const cleanBrand = (brandQuery || 'ClubClio').trim();
  const q = cleanBrand.toLowerCase();
  const brandCandidates = QUICK_KOC_CATALOG.filter(
    (k) => k.brandName.toLowerCase().includes(q) || q.includes(k.brandName.toLowerCase())
  );
  const candidates = brandCandidates.length >= 2 ? brandCandidates : QUICK_KOC_CATALOG.slice(0, 5);

  const lines = [
    `📋 DANH SÁCH ĐỀ XUẤT KOC (SHORTLIST) — BRAND: ${cleanBrand.toUpperCase()}`,
    `----------------------------------------`,
    `• Thời hạn phản hồi (SLA Brand): 48 giờ làm việc`,
    `• Phụ trách chuyên môn: ${resolveLeaderForBrand(cleanBrand)}`,
    `----------------------------------------`,
  ];

  candidates.forEach((k, idx) => {
    lines.push(
      `${idx + 1}. @${k.handle} (${k.stageName}) — Hạng ${k.salaryGrade} (${k.followers.toLocaleString('vi-VN')} flw)`,
      `   • Chi phí đề xuất (Net): ${formatVnd(k.rateCardNet)} | GMV tốt nhất: ${formatVnd(k.gmvBestCase)} | ROI: ${k.historicalRoi}`
    );
  });

  lines.push(
    `----------------------------------------`,
    `👉 Lệnh phản hồi dành cho đại diện Nhãn hàng:`,
    `• Xem hồ sơ chi tiết: /koc <@handle>`,
    `• Chốt duyệt KOC: /duyetkoc <@handle> [ghi chú]`,
    `• Từ chối / Đổi KOC: /tuchoikoc <@handle> <lý do>`
  );
  return lines.join('\n');
}

/**
 * Dựng danh sách các video nháp (Demo) chờ đại diện Nhãn hàng duyệt
 */
export function buildBrandPendingDraftsMessage(brandQuery: string): string {
  const cleanBrand = (brandQuery || 'ClubClio').trim();
  const q = cleanBrand.toLowerCase();
  const allMappings = getAllMappings().filter(
    (m) =>
      m.groupRole === 'KOC_GROUP' &&
      (!q || (m.brandName || '').toLowerCase().includes(q) || q.includes((m.brandName || '').toLowerCase()))
  );

  const lines = [
    `🎬 DANH SÁCH VIDEO DEMO / NHÁP CỦA BRAND: ${cleanBrand.toUpperCase()}`,
    `----------------------------------------`,
  ];

  if (allMappings.length === 0) {
    lines.push(`• Hiện chưa có bản nháp nào của thương hiệu ${cleanBrand} đang chờ duyệt.`);
  } else {
    allMappings.forEach((m, idx) => {
      lines.push(
        `${idx + 1}. [${m.dealCode || 'DEAL'}] KOC @${m.kocHandle || m.kocName || '—'} — SP: ${m.productName || '—'}`,
        `   • Trạng thái: ${m.dealStatus} | Hạn SLA: ${m.deadlineDate || '—'}`,
        `   • Link Demo: ${m.draftVideoUrl || 'Đang hậu kỳ (Chưa tải link)'}`,
        m.airedVideoUrl ? `   • Link đã Air: ${m.airedVideoUrl}` : ''
      );
    });
  }

  lines.push(
    `----------------------------------------`,
    `👉 Đại diện Brand có thể phản hồi nhanh ngay trong nhóm:`,
    `• Duyệt bản nháp: /duyetnhap <ghi chú hoặc mã deal>`,
    `• Góp ý chỉnh sửa: /suanhap <nội dung cần điều chỉnh>`
  );
  return lines.filter(Boolean).join('\n');
}

/**
 * Dựng báo cáo tiến độ thực thi chiến dịch dành riêng cho Nhóm làm việc với Nhãn hàng (Brand)
 */
export function buildBrandProgressReportMessage(brandQuery: string): string {
  const cleanBrand = (brandQuery || 'ClubClio').trim();
  const q = cleanBrand.toLowerCase();
  const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
  const matchedStores = b2cStores.filter(
    (s) => s.brandName.toLowerCase().includes(q) || s.storeName.toLowerCase().includes(q)
  );
  const storesToUse = matchedStores.length > 0 ? matchedStores : b2cStores.slice(0, 2);

  let targetPaid = 0;
  let targetFoc = 0;
  let targetAffiliate = 0;
  let targetSelfChannel = 0;
  let targetLive = 0;
  let airedVideos = 0;
  let netLimit = 0;
  let spentNet = 0;

  for (const s of storesToUse) {
    targetPaid += Math.round(Number(s.targetPaidVideos || 0));
    targetFoc += Math.round(Number(s.targetFocVideos || 0));
    targetAffiliate += Math.round(Number(s.targetAffiliateContents || 0));
    targetSelfChannel += Math.round(Number(s.targetSelfChannelContents || 0));
    targetLive += Math.round(Number(s.targetLiveSessions || 0));
    airedVideos += Math.round(Number(s.actualAiredVideos || 0));
    netLimit += Math.round(Number(s.budgetNet || 0));
    spentNet += Math.round(Number(s.actualSpentNet || 0));
  }

  const burnPct = netLimit === 0 ? '0%' : `${((spentNet / netLimit) * 100).toFixed(1)}%`;
  const brandAirHistory = getAirCheckHistory().filter(
    (a) => !a.brandName || a.brandName.toLowerCase().includes(q)
  );
  const airedLinksList =
    brandAirHistory.length > 0
      ? brandAirHistory
          .slice(0, 5)
          .map(
            (a, idx) =>
              `  ${idx + 1}. @${a.kocHandle} (${a.airedAtVn || 'Đã Air'}) — View: ${
                a.views ? a.views.toLocaleString('vi-VN') : '—'
              } | ${a.videoUrl}`
          )
          .join('\n')
      : '  • Đang cập nhật các link TikTok vừa lên sóng...';

  return renderReplyTemplate('BRAND_PROGRESS_REPORT', {
    brandName: storesToUse[0]?.brandName || cleanBrand,
    storeCount: storesToUse.length,
    leaderName: resolveLeaderForBrand(storesToUse[0]?.brandName || cleanBrand),
    targetPaid,
    targetFoc,
    targetAffiliate,
    targetSelfChannel,
    targetLive,
    airedVideos,
    spentNet: formatVnd(spentNet),
    netLimit: formatVnd(netLimit),
    burnPct,
    airedLinksList,
  });
}

/**
 * Báo cáo SLA & Tiến độ các nhóm Deal đang chạy
 */
export function buildSlaStatusMessage(): string {
  const all = getAllMappings().filter((m) => m.groupRole === 'KOC_GROUP');
  if (all.length === 0) {
    return '📋 Hiện chưa có nhóm KOC nào đang theo dõi SLA.';
  }

  const lines = [
    `⏱️ BÁO CÁO TIẾN ĐỘ & SLA BOOKING KOC (${all.length} NHÓM ĐANG CHẠY)`,
    `----------------------------------------`,
  ];

  for (const m of all) {
    lines.push(
      `• [${m.dealCode || 'Chưa gán'}] ${m.brandName || '—'} x @${m.kocHandle || m.kocName || '—'}`,
      `  Trạng thái: ${m.dealStatus} | Hạn SLA: ${m.deadlineDate || '—'} | PIC: ${m.picName || '—'}`
    );
  }

  lines.push(
    `----------------------------------------`,
    `👉 Gõ /nopnhap <link> khi KOC nộp video nháp, hoặc /duyetnhap để chốt duyệt.`
  );
  return lines.join('\n');
}

/**
 * Báo cáo tổng hợp cuối ngày (Daily Digest)
 */
export function buildDailyDigestMessage(): string {
  const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
  const mappings = getAllMappings();
  const airHistory = getAirCheckHistory();

  let totalNet = 0;
  let totalSpent = 0;
  let totalAired = 0;
  for (const s of b2cStores) {
    totalNet += Math.round(Number(s.budgetNet || 0));
    totalSpent += Math.round(Number(s.actualSpentNet || 0));
    totalAired += Math.round(Number(s.actualAiredVideos || 0));
  }
  const pct = totalNet === 0 ? 0 : Number(((totalSpent / totalNet) * 100).toFixed(1));
  const passCount = airHistory.filter((a) => a.verdict === 'PASS').length;

  return [
    `📑 BÁO CÁO TỔNG HỢP VẬN HÀNH B2C CUỐI NGÀY`,
    `• Ngày báo cáo: ${new Date().toLocaleDateString('vi-VN')} (UTC+7)`,
    `----------------------------------------`,
    `1. TÌNH HÌNH NGÂN SÁCH (69 GIAN HÀNG B2C):`,
    `   • Tổng hạn mức Net: ${formatVnd(totalNet)}`,
    `   • Thực chi Net lũy kế: ${formatVnd(totalSpent)} (${pct}%)`,
    `   • Số video đã lên sóng (Air): ${totalAired} video`,
    `2. TIẾN ĐỘ NHÓM CHAT ZALO BOT:`,
    `   • Số nhóm đang kết nối: ${mappings.length} nhóm`,
    `   • Đã nộp nháp chờ duyệt: ${mappings.filter((m) => m.dealStatus === 'ĐÃ_NỘP_NHÁP').length} deal`,
    `   • Đã duyệt nháp chờ lên bài: ${mappings.filter((m) => m.dealStatus === 'ĐÃ_DUYỆT_NHÁP').length} deal`,
    `   • Lượt quét nghiệm thu tự động qua Bot: ${airHistory.length} lượt (${passCount} ĐẠT)`,
    `----------------------------------------`,
    `• Phê duyệt cấp cao: Đỗ Văn Giang (CEO) | Đặng Thị Yến Nhi (Lead B2C) | Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm).`,
  ].join('\n');
}

/**
 * Xử lý sự kiện Webhook từ Zalo Bot hoặc từ trình giả lập lệnh trên Web
 */
/**
 * Tóm tắt nội dung hội thoại nhóm Zalo & tiến độ thực thi Deal (/tomtat, /summary)
 */
export function buildGroupSummaryMessage(
  mapping: ZaloGroupMapping | undefined,
  chatId: string,
  pastedConversation?: string
): string {
  const lines: string[] = [
    `📝 BẢN TÓM TẮT HỘI THOẠI & TIẾN ĐỘ NHÓM ZALO`,
    `----------------------------------------`,
    `• Nhóm: ${mapping?.groupName || chatId}`,
    `• Mã Deal: ${mapping?.dealCode || 'Chưa liên kết (/link)'} | Brand: ${mapping?.brandName || '—'}`,
    `• KOC: ${mapping?.kocName || '—'} ${mapping?.kocHandle ? `(@${mapping.kocHandle})` : ''}`,
    `• PIC phụ trách: ${mapping?.picName || '—'} | Cấp duyệt: ${mapping?.leaderName || resolveLeaderForBrand(mapping?.brandName)}`,
    `• Trạng thái hiện tại: ${mapping?.dealStatus || 'ĐANG_QUAY_NHÁP'} (Hạn SLA: ${mapping?.deadlineDate || '—'})`,
  ];

  // Nếu người dùng dán một đoạn hội thoại dài kèm lệnh /tomtat <nội dung>
  const cleanPasted = String(pastedConversation || '').trim();
  if (cleanPasted.length > 10) {
    const rawLines = cleanPasted
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const detectedLinks = cleanPasted.match(/https?:\/\/[^\s]+/gi) || [];
    const feedbackLines = rawLines.filter((l) =>
      /(sửa|chỉnh|bổ sung|lưu ý|góp ý|duyệt|chốt|hạn|deadline|giỏ hàng|hashtag|quay|cảnh)/i.test(l)
    );

    lines.push(
      `----------------------------------------`,
      `📌 TÓM TẮT ĐOẠN HỘI THOẠI VỪA DÁN (${rawLines.length} dòng):`
    );
    if (feedbackLines.length > 0) {
      lines.push(`• Các ý chính / Yêu cầu đã trao đổi:`);
      for (const item of feedbackLines.slice(0, 6)) {
        lines.push(`  - ${item.slice(0, 140)}`);
      }
    } else {
      for (const item of rawLines.slice(0, 5)) {
        lines.push(`  - ${item.slice(0, 140)}`);
      }
    }
    if (detectedLinks.length > 0) {
      lines.push(`• Đường link xuất hiện trong hội thoại: ${detectedLinks.join(', ')}`);
    }
  }

  // Các mốc thực thi đã ghi nhận trong nhóm
  lines.push(`----------------------------------------`, `🔎 CÁC MỐC QUAN TRỌNG ĐÃ GHI NHẬN:`);
  lines.push(
    `• Sản phẩm & Góc kịch bản: ${mapping?.productName || 'Chưa cập nhật'} (${mapping?.pillarName || 'Review trực tiếp'})`
  );
  lines.push(
    `• Bản nháp (Demo): ${mapping?.draftVideoUrl ? `Đã nộp (${mapping.draftVideoUrl})` : 'Chưa nộp link nháp'}`
  );
  lines.push(
    `• Phản hồi duyệt nháp: ${mapping?.draftReviewNote || 'Chưa có ghi chú chỉnh sửa'}`
  );
  lines.push(
    `• Video lên sóng (Air): ${mapping?.airedVideoUrl ? `Đã nghiệm thu (${mapping.airedVideoUrl})` : 'Chưa đăng bài Air'}`
  );

  // Lịch sử tin nhắn đã gửi qua Bot trong nhóm
  const history = mapping?.chatHistory || [];
  if (history.length > 0) {
    lines.push(`----------------------------------------`, `💬 NHẬT KÝ TRAO ĐỔI GẦN NHẤT VỚI BOT (${history.length} tin):`);
    for (const h of history.slice(-6)) {
      const timeStr = new Date(h.time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(`• [${timeStr}] ${h.senderName}: ${h.text}`);
    }
  }

  // Đề xuất hành động tiếp theo theo trạng thái
  let nextAction = 'KOC quay video nháp theo Brief và gửi link bằng lệnh /nopnhap <link_drive>.';
  if (mapping?.dealStatus === 'ĐÃ_NỘP_NHÁP') {
    nextAction = `PIC (${mapping.picName || 'Booking'}) kiểm tra bản nháp và gõ /duyetnhap hoặc /suanhap <nội dung>.`;
  } else if (mapping?.dealStatus === 'CẦN_CHỈNH_SỬA') {
    nextAction = `KOC chỉnh sửa video theo ghi chú "${mapping.draftReviewNote || ''}" và nộp lại link mới.`;
  } else if (mapping?.dealStatus === 'ĐÃ_DUYỆT_NHÁP') {
    nextAction = 'KOC đăng video công khai lên TikTok gắn giỏ hàng, sau đó dán link TikTok vào nhóm để Bot nghiệm thu.';
  } else if (mapping?.dealStatus === 'ĐÃ_NGHIỆM_THU_AIR') {
    nextAction = 'Đã hoàn tất nghiệm thu Air. Kế toán và Pháp chế đối soát BBNT để giải ngân.';
  }

  lines.push(`----------------------------------------`, `👉 VIỆC CẦN LÀM TIẾP THEO: ${nextAction}`);
  return lines.join('\n');
}

export async function processZaloWebhookEvent(
  body: any,
  options?: { skipSendToZalo?: boolean; overrideGroupRole?: ZaloGroupRole }
): Promise<{
  handled: boolean;
  reply?: string;
  extractedChatId?: string;
  holdingScreenshotUrl?: string;
  holdingMomentSec?: number;
  holdingMomentTimeLabel?: string;
  holdingMomentQuote?: string;
}> {
  const message = body?.result?.message || body?.message || body;
  const chatId = String(
    message?.chat?.id ||
      body?.result?.message?.chat?.id ||
      body?.recipient?.id ||
      body?.chat_id ||
      message?.chat_id ||
      body?.result?.chat?.id ||
      body?.sender?.id ||
      ''
  ).trim();

  const rawText = String(message?.text || body?.text || '').trim();
  const senderId = String(
    message?.from?.id ||
      body?.result?.message?.from?.id ||
      body?.sender?.id ||
      ''
  ).trim();
  const senderName = String(
    message?.from?.display_name ||
      body?.result?.message?.from?.display_name ||
      body?.sender?.display_name ||
      'Thành viên nhóm'
  ).trim();

  if (!chatId) {
    recordDebugEvent({ time: new Date().toISOString(), body, error: 'Không tìm thấy chatId' });
    return { handled: false };
  }

  const shouldSend = !options?.skipSendToZalo;
  let discoveredSender: ZaloDiscoveredSender | undefined;

  // Bỏ các mention (@Bot...) ở đầu câu để lấy câu lệnh chuẩn
  const cleanText = rawText.replace(/@[^\s]+/g, '').trim();
  const lowerClean = cleanText.toLowerCase();

  await hydrateZaloBotStateFromDb();
  const mappings = loadMappings();
  let currentMapping = mappings.get(chatId);
  const securityPolicy = getSecurityPolicy();
  const replyConfig = getReplyConfig();
  const senderPerm = senderId ? loadPermissions().get(senderId) : undefined;
  const isSimulatedFromWeb = Boolean(options?.skipSendToZalo);
  const rawChatTitle = String(
    message?.chat?.title ||
      message?.chat?.name ||
      body?.result?.message?.chat?.title ||
      body?.result?.message?.chat?.name ||
      body?.chat?.title ||
      ''
  ).trim();

  // TỰ ĐỘNG GHI NHẬN CHAT ID NHÓM VÀ NGƯỜI GỬI NGAY KHI NHẬN TIN NHẮN ĐỂ PHỤC VỤ PHÂN QUYỀN TRÊN WEB
  if (!isSimulatedFromWeb) {
    const nowIso = new Date().toISOString();
    const newEntry = {
      time: nowIso,
      senderName: senderName || 'Thành viên',
      text: cleanText.slice(0, 140) || rawText.slice(0, 140),
    };
    if (!currentMapping) {
      currentMapping = {
        groupId: chatId,
        groupName: rawChatTitle
          ? `[Mới phát hiện] ${rawChatTitle}`
          : `[Mới phát hiện] Nhóm Zalo (${chatId.slice(0, 8)}) — ${senderName}`,
        groupRole: 'KOC_GROUP',
        accessStatus: securityPolicy.requireGroupWhitelist ? 'PENDING_APPROVAL' : 'APPROVED',
        isAutoDiscovered: true,
        lastMessageText: rawText.slice(0, 120),
        lastSenderId: senderId || undefined,
        lastSenderName: senderName,
        lastActiveAt: nowIso,
        messageCount: 1,
        chatHistory: [newEntry],
        dealStatus: 'ĐANG_QUAY_NHÁP',
        linkedAt: nowIso,
        updatedAt: nowIso,
      };
      mappings.set(chatId, currentMapping);
      saveMappings();
    } else {
      const nextHistory = [...(currentMapping.chatHistory || []), newEntry].slice(-25);
      currentMapping = {
        ...currentMapping,
        ...(rawChatTitle && currentMapping.isAutoDiscovered
          ? { groupName: `[Mới phát hiện] ${rawChatTitle}` }
          : {}),
        lastMessageText: rawText.slice(0, 120),
        lastSenderId: senderId || currentMapping.lastSenderId,
        lastSenderName: senderName || currentMapping.lastSenderName,
        lastActiveAt: nowIso,
        messageCount: (currentMapping.messageCount || 0) + 1,
        chatHistory: nextHistory,
        updatedAt: nowIso,
      };
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    if (senderId) {
      const prevSender = inMemoryDiscoveredSenders.get(senderId);
      discoveredSender = {
        senderId,
        displayName: senderName || prevSender?.displayName || senderId,
        lastChatId: chatId,
        lastGroupName: currentMapping.groupName,
        lastMessageText: rawText.slice(0, 120),
        lastSeenAt: nowIso,
        messageCount: (prevSender?.messageCount || 0) + 1,
      };
      inMemoryDiscoveredSenders.set(senderId, discoveredSender);
    }
  }

  const replyToChat = async (text: string, photoUrl?: string) => {
    if (shouldSend) {
      await sendZaloMessage(chatId, text);
    }
    recordDebugEvent({
      time: new Date().toISOString(),
      body,
      extractedChatId: chatId,
      replySent: shouldSend,
      replyText: text,
      replyPhotoUrl: photoUrl,
    });
    if (!isSimulatedFromWeb) {
      const latestMapping = mappings.get(chatId) || currentMapping;
      await syncZaloBotStateToDb({
        upsertGroup: latestMapping,
        upsertSender: discoveredSender,
      });
    }
  };

  // KIỂM TRA TRẠNG THÁI CHẶN / WHITELIST CỦA NHÓM CHAT
  if (currentMapping?.accessStatus === 'BLOCKED' && !isSimulatedFromWeb) {
    const blockedMsg =
      '⛔ BẢO MẬT NHÓM: Nhóm chat này đã bị khóa quyền tương tác với Bot trên hệ thống quản trị Upbase B2C.';
    await replyToChat(blockedMsg);
    return { handled: true, reply: blockedMsg, extractedChatId: chatId };
  }

  // CTV Self-channel (nhận diện theo Zalo ID trên hồ sơ danh bạ CTV): nộp kịch bản / nháp / link đăng vào việc của mình.
  // Người gửi không phải CTV hoặc tin không phải lệnh CTV thì xử lý tiếp như cũ.
  const ctvReply = await handleCtvZaloMessage({ senderId, senderName, text: cleanText }).catch(err => {
    console.error('[ZaloBot] Lỗi xử lý lệnh CTV:', err);
    return '⚠️ Bot chưa ghi nhận được, vui lòng thử lại hoặc nộp trên Cổng CTV.';
  });
  if (ctvReply) {
    await replyToChat(ctvReply);
    return { handled: true, reply: ctvReply, extractedChatId: chatId };
  }

  if (
    securityPolicy.requireGroupWhitelist &&
    !isSimulatedFromWeb &&
    (!currentMapping || currentMapping.accessStatus === 'PENDING_APPROVAL') &&
    lowerClean !== '/status' &&
    !lowerClean.startsWith('/link')
  ) {
    const whitelistMsg = [
      `🔒 BẢO MẬT WHITELIST NHÓM ZALO`,
      `----------------------------------------`,
      `• Mã Chat ID của nhóm: ${chatId}`,
      `• Trạng thái: Chờ Quản trị viên phê duyệt (PENDING_APPROVAL).`,
      `• Hệ thống đang bật chế độ bắt buộc xác thực nhóm trước khi sử dụng lệnh Bot.`,
      `👉 Vui lòng gõ /link <MÃ_DEAL> và báo Quản lý duyệt nhóm trên màn hình [Quản lý Bot Zalo] của Web Admin.`,
    ].join('\n');
    await replyToChat(whitelistMsg);
    return { handled: true, reply: whitelistMsg, extractedChatId: chatId };
  }

  const effectiveRole: ZaloGroupRole =
    options?.overrideGroupRole || currentMapping?.groupRole || 'KOC_GROUP';

  // 1. TỰ ĐỘNG BẮT LINK TIKTOK ĐỂ NGHIỆM THU (AIR CHECK) HOẶC LỆNH /air, /check
  const linkMatch = rawText.match(TIKTOK_URL_REGEX);
  if (linkMatch) {
    const videoUrl = linkMatch[1];
    const cacheKey = `${videoUrl}|${(currentMapping?.requiredHashtags || []).join(',')}|${currentMapping?.expectedProductUrl || ''}`;
    const cachedAir = inMemoryAirCheckCache.get(cacheKey);
    const hasFreshCache = Boolean(
      cachedAir &&
        cachedAir.expiresAt > Date.now() &&
        (!cachedAir.result.hasProductLink || Boolean(cachedAir.result.productUrl))
    );

    // Bắn thông báo "Đang quét..." song song với luồng cào dữ liệu (nếu chưa có trong RAM cache) để tiết kiệm 400-600ms
    const notifyPendingPromise =
      shouldSend && !hasFreshCache && replyConfig.sendScanningProgressMessage
        ? sendZaloMessage(
            chatId,
            `⏳ Đang quét dữ liệu nghiệm thu video TikTok: ${videoUrl}\nVui lòng chờ trong giây lát...`
          ).catch(() => false)
        : Promise.resolve(true);

    try {
      const checkResult: LinkAirResult = hasFreshCache
        ? cachedAir!.result
        : await checkSingleLinkServerless(videoUrl, {
            requiredHashtags: currentMapping?.requiredHashtags,
            expectedProductUrl: currentMapping?.expectedProductUrl,
          });

      if (!hasFreshCache && checkResult.status === 'LIVE') {
        if (inMemoryAirCheckCache.size >= 100) {
          const oldest = inMemoryAirCheckCache.keys().next().value;
          if (oldest) inMemoryAirCheckCache.delete(oldest);
        }
        inMemoryAirCheckCache.set(cacheKey, {
          result: checkResult,
          expiresAt: Date.now() + 3 * 60 * 1000,
        });
      }

      const isPass = checkResult.verdict === 'PASS';
      const isReview = checkResult.verdict === 'REVIEW';
      const statusIcon = isPass
        ? '✅ ĐẠT (PASS)'
        : isReview
          ? '⚠️ CẦN RÀ SOÁT (REVIEW)'
          : '❌ KHÔNG ĐẠT (FAIL)';

      const normalizedCartProducts =
        checkResult.cartProducts && checkResult.cartProducts.length > 0
          ? checkResult.cartProducts.map((p) => ({
              productId: p.productId || '',
              title: p.title || p.anchorKeyword || 'Sản phẩm TikTok Shop',
              productUrl:
                p.productUrl ||
                (p.productId
                  ? `https://shop.tiktok.com/view/product/${p.productId}?region=VN&locale=vi-VN`
                  : ''),
            }))
          : checkResult.productUrl || checkResult.productId || checkResult.productTitle
            ? [
                {
                  productId: checkResult.productId || '',
                  title: checkResult.productTitle || 'Sản phẩm TikTok Shop',
                  productUrl:
                    checkResult.productUrl ||
                    (checkResult.productId
                      ? `https://shop.tiktok.com/view/product/${checkResult.productId}?region=VN&locale=vi-VN`
                      : ''),
                },
              ]
            : [];

      const primaryProd = normalizedCartProducts[0];
      const cartText = checkResult.hasProductLink
        ? normalizedCartProducts.length > 0
          ? `Đã gắn giỏ hàng (${normalizedCartProducts
              .map((p) => (p.productId ? `${p.title} [Mã SP: ${p.productId}]` : p.title))
              .join(' | ')})`
          : 'Đã gắn giỏ hàng (Đã bật cờ giỏ hàng trên video)'
        : 'Chưa phát hiện giỏ hàng';

      const productLinkLines: string[] =
        normalizedCartProducts.length > 0
          ? normalizedCartProducts
              .filter((p) => Boolean(p.productUrl))
              .map((p, idx) =>
                normalizedCartProducts.length === 1
                  ? `• Link sản phẩm: ${p.productUrl}`
                  : `• Link SP #${idx + 1} (${p.productId || p.title.slice(0, 24)}): ${p.productUrl}`
              )
          : [];

      const captureSec = Number(
        (
          checkResult.bestHoldingMomentSec ??
          (checkResult.firstProductAppearanceSec !== null &&
          checkResult.firstProductAppearanceSec !== undefined
            ? checkResult.firstProductAppearanceSec + 1.5
            : 3.5)
        ).toFixed(1)
      );
      const holdingTimeLabel =
        checkResult.bestHoldingMomentTimeLabel ||
        checkResult.firstProductMentionTimeLabel ||
        '00:02 - 00:05';
      const holdingQuote =
        checkResult.bestHoldingMomentQuote || checkResult.firstProductMentionQuote || null;
      const targetCanonicalVideoUrl = checkResult.canonicalUrl || videoUrl;
      const frameId = `FRM-${checkResult.contentId || Date.now()}-${Math.round(captureSec * 10)}`;
      const initialCoverUrl = checkResult.coverUrl || undefined;

      // Cập nhật trạng thái Deal nếu nhóm đã liên kết và kết quả PASS
      if (currentMapping?.dealCode && isPass) {
        currentMapping.dealStatus = 'ĐÃ_NGHIỆM_THU_AIR';
        currentMapping.airedVideoUrl = videoUrl;
        currentMapping.updatedAt = new Date().toISOString();
        mappings.set(chatId, currentMapping);
        saveMappings();
      }

      const airedAtText =
        checkResult.airedAtVn ||
        (checkResult.publishedAt && /^\d{4}-\d{2}-\d{2}/.test(checkResult.publishedAt)
          ? checkResult.publishedAt.slice(0, 10).split('-').reverse().join('/')
          : 'Chưa xác định');

      const mentionMoments = checkResult.productMentionMoments || [];
      const firstMentionSec =
        checkResult.firstProductAppearanceSec !== null &&
        checkResult.firstProductAppearanceSec !== undefined
          ? checkResult.firstProductAppearanceSec
          : mentionMoments[0]?.startSec ?? null;
      const firstMentionLabel =
        checkResult.firstProductMentionTimeLabel || mentionMoments[0]?.timeLabel || undefined;
      const firstMentionTerm =
        checkResult.firstProductMentionTerm || mentionMoments[0]?.matchedTerm || undefined;
      const firstMentionQuote =
        checkResult.firstProductMentionQuote || mentionMoments[0]?.quote || undefined;

      const overlayMeta: TikTokFrameOverlayMeta = {
        kocHandle: checkResult.author?.handle || currentMapping?.kocHandle || undefined,
        kocName: checkResult.author?.name || undefined,
        timeLabel: holdingTimeLabel,
        airedAt: airedAtText !== 'Chưa xác định' ? airedAtText : undefined,
        views: checkResult.metrics?.views ?? null,
        productTitle: primaryProd?.title || checkResult.productTitle || undefined,
        productId: primaryProd?.productId || checkResult.productId || undefined,
        hashtags:
          checkResult.hashtags && checkResult.hashtags.length > 0
            ? checkResult.hashtags.map((h) => `#${h.replace(/^#+/, '')}`).join(' ')
            : undefined,
        quote: holdingQuote || firstMentionQuote || undefined,
        mentionSec: firstMentionSec,
      };

      const webRelativePhotoUrl = buildPublicZaloFrameUrl({
        frameId,
        videoUrl: targetCanonicalVideoUrl,
        captureSec,
        coverUrl: initialCoverUrl,
        relativeOnly: true,
        overlayMeta,
      });

      const productMentionLine =
        firstMentionSec !== null
          ? `• Thời gian KOC nhắc SP: Lần đầu ở giây ${firstMentionSec}s (${
              firstMentionLabel || '—'
            })${firstMentionTerm ? ` — Từ khóa "${firstMentionTerm}"` : ''}${
              mentionMoments.length > 1
                ? ` | Tổng ${mentionMoments.length} lần nhắc tại: ${mentionMoments
                    .slice(0, 5)
                    .map((m) => `${m.timeLabel} (${m.startSec}s)`)
                    .join(', ')}`
                : ''
            }`
          : `• Thời gian KOC nhắc SP: Chưa phát hiện lời thoại nhắc tên SP trong phụ đề tự động`;

      const holdingLineText = `• Khoảnh khắc KOC cầm SP (cắt ảnh): Giây ${captureSec}s (${holdingTimeLabel})${
        holdingQuote ? ` — "${holdingQuote.slice(0, 75)}"` : ''
      }`;

      const syncFooterText = currentMapping?.dealCode
        ? `✅ Đã đồng bộ kết quả vào Deal [${currentMapping.dealCode}] (${currentMapping.brandName || 'B2C'}) — Trạng thái: ${currentMapping.dealStatus}`
        : `💡 Mẹo: Gõ /link <MÃ_DEAL> để tự động lưu kết quả nghiệm thu vào hồ sơ Deal trên web-admin.`;

      let resultMsg = renderReplyTemplate('AIR_CHECK_RESULT', {
        verdictIcon: statusIcon,
        statusIcon,
        verdictLabel: checkResult.verdict,
        kocHandle: checkResult.author?.handle || 'Chưa rõ',
        airedAt: `${airedAtText}${airedAtText.includes(':') ? ' (Giờ VN)' : ''}`,
        statusText: checkResult.status === 'LIVE' ? 'Đang công khai (Live/Air)' : checkResult.status,
        cartText,
        productLinks: productLinkLines.join('\n'),
        mentionLine: productMentionLine,
        holdingLine: holdingLineText,
        views: checkResult.metrics?.views ? checkResult.metrics.views.toLocaleString('vi-VN') : '—',
        likes: checkResult.metrics?.likes ? checkResult.metrics.likes.toLocaleString('vi-VN') : '—',
        comments: checkResult.metrics?.comments ? checkResult.metrics.comments.toLocaleString('vi-VN') : '—',
        shares: checkResult.metrics?.shares ? checkResult.metrics.shares.toLocaleString('vi-VN') : '—',
        hashtags:
          checkResult.hashtags && checkResult.hashtags.length > 0
            ? checkResult.hashtags.map((h) => `#${h.replace(/^#+/, '')}`).join(' ')
            : '—',
        dealSyncNote: syncFooterText,
        syncFooter: syncFooterText,
      });

      if (productLinkLines.length > 0 && primaryProd?.productUrl && !resultMsg.includes(primaryProd.productUrl)) {
        const lines = resultMsg.split('\n');
        const cartIdx = lines.findIndex((l) => l.includes('Giỏ hàng:'));
        if (cartIdx >= 0) {
          lines.splice(cartIdx + 1, 0, ...productLinkLines);
          resultMsg = lines.join('\n');
        } else {
          resultMsg = `${resultMsg}\n${productLinkLines.join('\n')}`;
        }
      }

      // GỬI KẾT QUẢ VĂN BẢN NGAY LẬP TỨC (không chờ cắt frame / tải ảnh để phản hồi nhanh gấp 3-5 lần)
      await notifyPendingPromise;
      await replyToChat(
        resultMsg,
        `${webRelativePhotoUrl}&src=${encodeURIComponent(checkResult.source || '')}`
      );

      // Sau khi người dùng đã nhận báo cáo chữ trên Zalo, tiến hành xử lý ảnh frame (kèm đóng dấu giao diện kênh TikTok) & ghi lịch sử
      let resolvedCoverUrl = initialCoverUrl;
      if (checkResult.status === 'LIVE') {
        const capturedFrame = await captureTikTokProductFrameBuffer({
          videoUrl: targetCanonicalVideoUrl,
          playableUrl: checkResult.playableUrl,
          coverUrl: checkResult.coverUrl,
          captureSec,
          frameId,
          overlayMeta,
        });
        resolvedCoverUrl = capturedFrame.resolvedCoverUrl || initialCoverUrl;
      }

      const publicZaloPhotoUrl = buildPublicZaloFrameUrl({
        frameId,
        videoUrl: targetCanonicalVideoUrl,
        captureSec,
        coverUrl: resolvedCoverUrl,
        relativeOnly: false,
        overlayMeta,
      });

      recordAirCheckHistory({
        id: `AIR-${Date.now()}`,
        checkedAt: new Date().toISOString(),
        chatId,
        dealCode: currentMapping?.dealCode,
        brandName: currentMapping?.brandName,
        kocHandle: checkResult.author?.handle || currentMapping?.kocHandle || 'unknown',
        videoUrl,
        verdict: checkResult.verdict,
        status: checkResult.status,
        hasProductLink: Boolean(checkResult.hasProductLink),
        productTitle: primaryProd?.title || checkResult.productTitle || undefined,
        productUrl: primaryProd?.productUrl || checkResult.productUrl || undefined,
        productId: primaryProd?.productId || checkResult.productId || undefined,
        cartProducts: normalizedCartProducts.length > 0 ? normalizedCartProducts : undefined,
        holdingScreenshotUrl: webRelativePhotoUrl,
        holdingMomentSec: captureSec,
        holdingMomentTimeLabel: holdingTimeLabel,
        holdingMomentQuote: holdingQuote || undefined,
        airedAtVn: airedAtText !== 'Chưa xác định' ? airedAtText : undefined,
        publishedAt: checkResult.publishedAt || undefined,
        firstProductAppearanceSec: firstMentionSec,
        firstProductMentionTimeLabel: firstMentionLabel,
        firstProductMentionTerm: firstMentionTerm,
        firstProductMentionQuote: firstMentionQuote,
        productMentionMoments: mentionMoments.length > 0 ? mentionMoments : undefined,
        views: checkResult.metrics?.views ?? null,
        likes: checkResult.metrics?.likes ?? null,
        hashtags: checkResult.hashtags || [],
        sentToZalo: shouldSend,
      });

      if (shouldSend && replyConfig.sendHoldingPhotoOnAirCheck && checkResult.status === 'LIVE') {
        let photoCaption = renderReplyTemplate('AIR_CHECK_PHOTO_CAPTION', {
          kocHandle: checkResult.author?.handle || 'koc',
          holdingSec: captureSec,
          captureSec,
          holdingTimeLabel,
          airedAt: airedAtText,
          mentionSec: firstMentionSec !== null ? String(firstMentionSec) : '—',
          firstMentionSec: firstMentionSec !== null ? `Giây ${firstMentionSec}s` : '—',
          productTitle: primaryProd?.title || 'Sản phẩm chiến dịch',
          holdingQuote: holdingQuote ? holdingQuote.slice(0, 90) : '—',
        });
        if (primaryProd?.productUrl && !photoCaption.includes(primaryProd.productUrl)) {
          photoCaption = `${photoCaption}\n🔗 Link SP: ${primaryProd.productUrl}`;
        }

        await sendZaloPhoto(
          chatId,
          publicZaloPhotoUrl,
          photoCaption,
          resolvedCoverUrl
        );
      }

      return {
        handled: true,
        reply: resultMsg,
        extractedChatId: chatId,
        holdingScreenshotUrl: webRelativePhotoUrl,
        holdingMomentSec: captureSec,
        holdingMomentTimeLabel: holdingTimeLabel,
        holdingMomentQuote: holdingQuote || undefined,
      };
    } catch (err: any) {
      const errMsg = `❌ Không thể quét dữ liệu video: ${err?.message || 'Lỗi kết nối'}. Vui lòng kiểm tra lại đường dẫn TikTok.`;
      await replyToChat(errMsg);
      return { handled: true, reply: errMsg, extractedChatId: chatId };
    }
  }

  // 2. LỆNH NỘP VIDEO NHÁP (/nopnhap, /draft HOẶC GỬI LINK GOOGLE DRIVE / CAPCUT)
  const draftMatch = rawText.match(DRAFT_URL_REGEX);
  if (
    lowerClean.startsWith('/nopnhap') ||
    lowerClean.startsWith('/draft') ||
    draftMatch
  ) {
    const draftUrl =
      draftMatch?.[1] ||
      cleanText.replace(/^\/?(?:nopnhap|draft)\s*/i, '').trim();

    if (!draftUrl) {
      const msg = '⚠️ Vui lòng đính kèm đường dẫn Google Drive hoặc CapCut của video nháp. Ví dụ: /nopnhap https://drive.google.com/...';
      await replyToChat(msg);
      return { handled: true, reply: msg, extractedChatId: chatId };
    }

    if (currentMapping) {
      currentMapping.dealStatus = 'ĐÃ_NỘP_NHÁP';
      currentMapping.draftVideoUrl = draftUrl;
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    const replyMsg = renderReplyTemplate('DRAFT_RECEIVED', {
      senderName,
      dealCode: currentMapping?.dealCode || 'Chưa liên kết (/link)',
      brandName: currentMapping?.brandName || '—',
      draftUrl,
      picName: currentMapping?.picName || 'Team Booking',
    });

    await replyToChat(replyMsg);
    return { handled: true, reply: replyMsg, extractedChatId: chatId };
  }

  // 3. LỆNH DUYỆT VIDEO NHÁP (/duyetnhap HOẶC /approve-draft)
  if (lowerClean.startsWith('/duyetnhap') || lowerClean.startsWith('/approve-draft')) {
    if (
      securityPolicy.restrictDraftReviewToStaff &&
      !isSimulatedFromWeb &&
      effectiveRole !== 'BRAND_PARTNER' &&
      (!senderPerm || senderPerm.role === 'KOC')
    ) {
      const denyStaff =
        '⛔ BẢO MẬT QUY TRÌNH: Chỉ nhân sự Upbase (PIC / Leader / Lead B2C) hoặc đại diện Nhãn hàng mới có quyền phê duyệt bản nháp.';
      await replyToChat(denyStaff);
      return { handled: true, reply: denyStaff, extractedChatId: chatId };
    }

    const note = cleanText.replace(/^\/?(?:duyetnhap|approve-draft)\s*/i, '').trim();
    if (currentMapping) {
      currentMapping.dealStatus = 'ĐÃ_DUYỆT_NHÁP';
      currentMapping.draftReviewNote = note || 'Đạt yêu cầu kịch bản và hình ảnh.';
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    const msg = renderReplyTemplate('DRAFT_APPROVED', {
      dealCode: currentMapping?.dealCode || '—',
      brandName: currentMapping?.brandName || '—',
      kocName: currentMapping?.kocName || currentMapping?.kocHandle || '—',
      senderName,
      note:
        note ||
        'Nội dung đạt yêu cầu theo Brief. KOC tiến hành đăng video lên kênh và gắn giỏ hàng đúng quy định.',
    });

    await replyToChat(msg);
    return { handled: true, reply: msg, extractedChatId: chatId };
  }

  // 4. LỆNH YÊU CẦU SỬA VIDEO NHÁP (/suanhap HOẶC /reject-draft)
  if (lowerClean.startsWith('/suanhap') || lowerClean.startsWith('/reject-draft')) {
    if (
      securityPolicy.restrictDraftReviewToStaff &&
      !isSimulatedFromWeb &&
      effectiveRole !== 'BRAND_PARTNER' &&
      (!senderPerm || senderPerm.role === 'KOC')
    ) {
      const denyStaff =
        '⛔ BẢO MẬT QUY TRÌNH: Chỉ nhân sự Upbase (PIC / Leader / Lead B2C) hoặc đại diện Nhãn hàng mới có quyền gửi yêu cầu sửa bản nháp.';
      await replyToChat(denyStaff);
      return { handled: true, reply: denyStaff, extractedChatId: chatId };
    }

    const feedback = cleanText.replace(/^\/?(?:suanhap|reject-draft)\s*/i, '').trim();
    if (!feedback) {
      const warn = '⚠️ Vui lòng nhập nội dung cần KOC chỉnh sửa. Ví dụ: /suanhap Cần quay rõ cảnh thoa kem ở 3 giây đầu và bổ sung hashtag #ClubClio';
      await replyToChat(warn);
      return { handled: true, reply: warn, extractedChatId: chatId };
    }

    if (currentMapping) {
      currentMapping.dealStatus = 'CẦN_CHỈNH_SỬA';
      currentMapping.draftReviewNote = feedback;
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    const msg = renderReplyTemplate('DRAFT_REJECTED', {
      dealCode: currentMapping?.dealCode || '—',
      brandName: currentMapping?.brandName || '—',
      senderName,
      feedback,
    });

    await replyToChat(msg);
    return { handled: true, reply: msg, extractedChatId: chatId };
  }

  // 4B. CÁC LỆNH DÀNH CHO NHÓM LÀM VIỆC VỚI NHÃN HÀNG / BRAND (/listing, /duyetkoc, /tuchoikoc, /nhapchoduyet, /tiendo)
  if (
    lowerClean === '/listing' ||
    lowerClean.startsWith('/listing ') ||
    lowerClean === '/dsachkoc' ||
    lowerClean.startsWith('/dsachkoc ') ||
    lowerClean === '/shortlist'
  ) {
    const paramBrand = cleanText.replace(/^\/?(?:listing|dsachkoc|shortlist)\s*/i, '').trim();
    const scopedBrand =
      effectiveRole === 'BRAND_PARTNER'
        ? currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || paramBrand || 'ClubClio'
        : paramBrand || currentMapping?.brandName || 'ClubClio';
    const listingMsg = buildBrandListingMessage(scopedBrand);
    await replyToChat(listingMsg);
    return { handled: true, reply: listingMsg, extractedChatId: chatId };
  }

  if (lowerClean.startsWith('/duyetkoc') || lowerClean.startsWith('/chon-koc')) {
    const rawArgs = cleanText.replace(/^\/?(?:duyetkoc|chon-koc)\s*/i, '').trim();
    if (!rawArgs) {
      const warn = '⚠️ Vui lòng nhập @handle KOC cần phê duyệt. Ví dụ: /duyetkoc @po.trann77 Đồng ý triển khai tháng 10';
      await replyToChat(warn);
      return { handled: true, reply: warn, extractedChatId: chatId };
    }
    const [firstToken, ...restTokens] = rawArgs.split(/\s+/);
    const cleanHandle = firstToken.replace(/^@/, '');
    const note = restTokens.join(' ').trim() || 'Nhãn hàng đồng ý chọn KOC triển khai chiến dịch.';
    const matchedKoc = KOC_BY_HANDLE_INDEX.get(cleanHandle.toLowerCase());
    const targetBrand = currentMapping?.brandName || matchedKoc?.brandName || 'ClubClio';

    if (currentMapping) {
      currentMapping.kocHandle = matchedKoc?.handle || cleanHandle;
      currentMapping.kocName = matchedKoc?.stageName || cleanHandle;
      currentMapping.draftReviewNote = `[Brand duyệt KOC @${cleanHandle}]: ${note}`;
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    const approveKocMsg = [
      `✅ NHÃN HÀNG (${targetBrand.toUpperCase()}) ĐÃ CHỐT DUYỆT KOC`,
      `----------------------------------------`,
      `• KOC được chọn: @${matchedKoc?.handle || cleanHandle} (${matchedKoc?.stageName || 'Đối tác KOC'})`,
      `• Phân hạng: ${matchedKoc ? `${matchedKoc.salaryGrade} (${matchedKoc.followers.toLocaleString('vi-VN')} flw)` : 'Theo danh sách đề xuất'}`,
      `• Chi phí Booking dự kiến (Net): ${matchedKoc ? formatVnd(matchedKoc.rateCardNet) : 'Theo báo giá'}`,
      `• Người xác nhận: ${senderName}`,
      `• Ghi chú từ Brand: ${note}`,
      `----------------------------------------`,
      `🔔 Hệ thống đã thông báo cho PIC (${matchedKoc?.bookingPic || currentMapping?.picName || 'Team Booking'}) tiến hành tạo nhóm làm việc và gửi sản phẩm mẫu cho KOC.`,
    ].join('\n');

    await replyToChat(approveKocMsg);
    return { handled: true, reply: approveKocMsg, extractedChatId: chatId };
  }

  if (lowerClean.startsWith('/tuchoikoc') || lowerClean.startsWith('/doikoc')) {
    const rawArgs = cleanText.replace(/^\/?(?:tuchoikoc|doikoc)\s*/i, '').trim();
    if (!rawArgs) {
      const warn = '⚠️ Vui lòng nhập @handle KOC và lý do từ chối. Ví dụ: /tuchoikoc @cin0ntp Tệp người xem chưa khớp độ tuổi sản phẩm';
      await replyToChat(warn);
      return { handled: true, reply: warn, extractedChatId: chatId };
    }
    const [firstToken, ...restTokens] = rawArgs.split(/\s+/);
    const cleanHandle = firstToken.replace(/^@/, '');
    const reason = restTokens.join(' ').trim() || 'Cần đề xuất ứng viên KOC khác phù hợp hơn với định hướng hình ảnh.';
    const targetBrand = currentMapping?.brandName || 'ClubClio';

    if (currentMapping) {
      currentMapping.draftReviewNote = `[Brand từ chối KOC @${cleanHandle}]: ${reason}`;
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
    }

    const rejectKocMsg = [
      `🔄 ĐÃ GHI NHẬN YÊU CẦU ĐỔI ỨNG VIÊN KOC — BRAND ${targetBrand.toUpperCase()}`,
      `----------------------------------------`,
      `• KOC tạm dừng: @${cleanHandle}`,
      `• Người phản hồi: ${senderName}`,
      `• Lý do / Tiêu chí bổ sung: ${reason}`,
      `----------------------------------------`,
      `👉 Team Booking B2C (${currentMapping?.picName || 'PIC phụ trách'}) sẽ gửi lại danh sách KOC thay thế trong vòng 24h.`,
    ].join('\n');

    await replyToChat(rejectKocMsg);
    return { handled: true, reply: rejectKocMsg, extractedChatId: chatId };
  }

  if (
    lowerClean === '/nhapchoduyet' ||
    lowerClean.startsWith('/nhapchoduyet ') ||
    lowerClean === '/demo' ||
    lowerClean.startsWith('/demo ')
  ) {
    const paramBrand = cleanText.replace(/^\/?(?:nhapchoduyet|demo)\s*/i, '').trim();
    const scopedBrand =
      effectiveRole === 'BRAND_PARTNER'
        ? currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || paramBrand || 'ClubClio'
        : paramBrand || currentMapping?.brandName || 'ClubClio';
    const pendingMsg = buildBrandPendingDraftsMessage(scopedBrand);
    await replyToChat(pendingMsg);
    return { handled: true, reply: pendingMsg, extractedChatId: chatId };
  }

  if (
    lowerClean === '/tiendo' ||
    lowerClean.startsWith('/tiendo ') ||
    lowerClean === '/baocaobrand' ||
    lowerClean.startsWith('/baocaobrand ')
  ) {
    const paramBrand = cleanText.replace(/^\/?(?:tiendo|baocaobrand)\s*/i, '').trim();
    const scopedBrand =
      effectiveRole === 'BRAND_PARTNER'
        ? currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || paramBrand || 'ClubClio'
        : paramBrand || currentMapping?.brandName || 'ClubClio';
    const reportMsg = buildBrandProgressReportMessage(scopedBrand);
    await replyToChat(reportMsg);
    return { handled: true, reply: reportMsg, extractedChatId: chatId };
  }

  // 5. LỆNH XEM BRIEF CHIẾN DỊCH (/brief)
  if (lowerClean === '/brief' || lowerClean === 'brief' || lowerClean.startsWith('/brief ')) {
    const targetDeal = cleanText.replace(/^\/?brief\s*/i, '').trim();
    let mappingToUse = currentMapping;

    if (targetDeal) {
      if (
        effectiveRole === 'KOC_GROUP' &&
        securityPolicy.isolateCrossDealLookupInKocGroup &&
        currentMapping?.dealCode &&
        currentMapping.dealCode.toLowerCase() !== targetDeal.toLowerCase()
      ) {
        const denyCrossDeal =
          '⛔ BẢO MẬT NHÓM KOC: Nhóm này chỉ được phép xem Brief của Deal đã gắn trực tiếp với nhóm, không được tra cứu chéo mã Deal của KOC khác.';
        await replyToChat(denyCrossDeal);
        return { handled: true, reply: denyCrossDeal, extractedChatId: chatId };
      }

      for (const m of mappings.values()) {
        if (
          m.dealCode?.toLowerCase() === targetDeal.toLowerCase() ||
          m.kocHandle?.toLowerCase() === targetDeal.replace(/^@/, '').toLowerCase() ||
          m.brandName?.toLowerCase().includes(targetDeal.toLowerCase())
        ) {
          mappingToUse = m;
          break;
        }
      }
    }

    if (!mappingToUse) {
      const noBrief =
        '⚠️ Nhóm này chưa được liên kết với Deal nào. Hãy gõ /link <MÃ_DEAL> (ví dụ: /link BO261067161) trước khi gọi /brief.';
      await replyToChat(noBrief);
      return { handled: true, reply: noBrief, extractedChatId: chatId };
    }

    const briefMsg = buildDealBriefMessage(mappingToUse);
    await replyToChat(briefMsg);
    return { handled: true, reply: briefMsg, extractedChatId: chatId };
  }

  // 6. LỆNH TRA CỨU HỒ SƠ KOC (/koc <@handle>)
  if (lowerClean.startsWith('/koc') || lowerClean.startsWith('koc ')) {
    const query = cleanText.replace(/^\/?koc\s*/i, '').trim();
    const kocMsg = buildKocLookupMessage(query || currentMapping?.kocHandle || '', effectiveRole);
    await replyToChat(kocMsg);
    return { handled: true, reply: kocMsg, extractedChatId: chatId };
  }

  // 7. LỆNH TRA CỨU NGÂN SÁCH & PNL (/pnl [brand]) — PHÂN QUYỀN CHẶN TRONG NHÓM KOC & KIỂM SOÁT PHẠM VI BRAND
  if (lowerClean === '/pnl' || lowerClean === 'pnl' || lowerClean.startsWith('/pnl ')) {
    if (effectiveRole === 'KOC_GROUP') {
      const deniedMsg =
        '⛔ PHÂN QUYỀN BẢO MẬT: Lệnh tra cứu ngân sách & PnL nội bộ bị khóa trong nhóm làm việc với KOC. Vui lòng sử dụng trong Nhóm Vận Hành Nội Bộ hoặc Nhóm Điều Hành BOD.';
      await replyToChat(deniedMsg);
      return { handled: true, reply: deniedMsg, extractedChatId: chatId };
    }

    const brandQuery = cleanText.replace(/^\/?pnl\s*/i, '').trim();

    if (effectiveRole === 'BRAND_PARTNER') {
      const partnerBrand =
        currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || 'ClubClio';
      if (
        brandQuery &&
        !brandQuery.toLowerCase().includes(partnerBrand.toLowerCase()) &&
        !partnerBrand.toLowerCase().includes(brandQuery.toLowerCase())
      ) {
        const denyOtherBrand = `⛔ BẢO MẬT ĐỐI TÁC BRAND: Nhóm làm việc của thương hiệu [${partnerBrand}] chỉ được phép xem tiến độ & ngân sách của [${partnerBrand}], không được truy cập dữ liệu của thương hiệu khác.`;
        await replyToChat(denyOtherBrand);
        return { handled: true, reply: denyOtherBrand, extractedChatId: chatId };
      }
      const brandReport = buildBrandProgressReportMessage(partnerBrand);
      await replyToChat(brandReport);
      return { handled: true, reply: brandReport, extractedChatId: chatId };
    }

    const allowedBrands = currentMapping?.allowedBrands || [];
    const hasRestrictedBrandScope =
      effectiveRole === 'INTERNAL_OPS' &&
      securityPolicy.enforceBrandScopeInInternalGroups &&
      allowedBrands.length > 0 &&
      !allowedBrands.some((b) => b === 'ALL' || b.toLowerCase().includes('toàn bộ'));

    if (hasRestrictedBrandScope) {
      if (!brandQuery) {
        const scopeHint = `🔒 BẢO MẬT PHẠM VI NHÓM NỘI BỘ: Nhóm này được phân quyền phụ trách các thương hiệu: [${allowedBrands.join(', ')}]. Vui lòng gõ cụ thể: /pnl ${allowedBrands[0]}`;
        await replyToChat(scopeHint);
        return { handled: true, reply: scopeHint, extractedChatId: chatId };
      }
      const isAllowed = allowedBrands.some(
        (b) =>
          b.toLowerCase().includes(brandQuery.toLowerCase()) ||
          brandQuery.toLowerCase().includes(b.toLowerCase())
      );
      if (!isAllowed) {
        const denyScope = `⛔ BẢO MẬT PHẠM VI BRAND: Nhóm nội bộ này chỉ được cấp quyền tra cứu PnL của [${allowedBrands.join(', ')}], không có quyền xem dữ liệu của "${brandQuery}".`;
        await replyToChat(denyScope);
        return { handled: true, reply: denyScope, extractedChatId: chatId };
      }
    }

    const pnlMsg = buildPnlReportMessage(brandQuery);
    await replyToChat(pnlMsg);
    return { handled: true, reply: pnlMsg, extractedChatId: chatId };
  }

  // 8. LỆNH CẢNH BÁO VƯỢT TRẦN NGÂN SÁCH (/overbudget) — CHẶN TRONG NHÓM KOC & BRAND
  if (lowerClean === '/overbudget' || lowerClean === 'overbudget' || lowerClean === '/canhbao') {
    if (effectiveRole === 'KOC_GROUP' || effectiveRole === 'BRAND_PARTNER') {
      const deniedMsg =
        '⛔ PHÂN QUYỀN BẢO MẬT: Không được phép truy xuất dữ liệu cảnh báo ngân sách toàn hệ thống trong nhóm đối tác bên ngoài.';
      await replyToChat(deniedMsg);
      return { handled: true, reply: deniedMsg, extractedChatId: chatId };
    }

    const alertMsg = buildOverbudgetAlertMessage();
    await replyToChat(alertMsg);
    return { handled: true, reply: alertMsg, extractedChatId: chatId };
  }

  // 9. LỆNH KIỂM TRA TIẾN ĐỘ SLA (/sla) — CHẶN TRONG NHÓM KOC
  if (lowerClean === '/sla' || lowerClean === 'sla') {
    if (effectiveRole === 'KOC_GROUP') {
      const deniedSla =
        '⛔ PHÂN QUYỀN BẢO MẬT: Lệnh tổng hợp SLA toàn bộ các nhóm KOC chỉ dành cho Nhóm Vận Hành Nội Bộ. Trong nhóm KOC, vui lòng dùng /status để xem tiến độ của nhóm này.';
      await replyToChat(deniedSla);
      return { handled: true, reply: deniedSla, extractedChatId: chatId };
    }
    if (effectiveRole === 'BRAND_PARTNER') {
      const partnerBrand =
        currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || 'ClubClio';
      const pendingMsg = buildBrandPendingDraftsMessage(partnerBrand);
      await replyToChat(pendingMsg);
      return { handled: true, reply: pendingMsg, extractedChatId: chatId };
    }
    const slaMsg = buildSlaStatusMessage();
    await replyToChat(slaMsg);
    return { handled: true, reply: slaMsg, extractedChatId: chatId };
  }

  // 10. LỆNH BÁO CÁO TỔNG HỢP CUỐI NGÀY (/digest)
  if (lowerClean === '/digest' || lowerClean === 'digest' || lowerClean === '/baocao') {
    if (effectiveRole === 'KOC_GROUP') {
      const deniedMsg =
        '⛔ PHÂN QUYỀN BẢO MẬT: Báo cáo điều hành tổng hợp chỉ dành cho Nhóm Nội Bộ và Ban Giám Đốc.';
      await replyToChat(deniedMsg);
      return { handled: true, reply: deniedMsg, extractedChatId: chatId };
    }
    if (effectiveRole === 'BRAND_PARTNER') {
      const partnerBrand =
        currentMapping?.brandName || currentMapping?.allowedBrands?.[0] || 'ClubClio';
      const brandReport = buildBrandProgressReportMessage(partnerBrand);
      await replyToChat(brandReport);
      return { handled: true, reply: brandReport, extractedChatId: chatId };
    }

    const digestMsg = buildDailyDigestMessage();
    await replyToChat(digestMsg);
    return { handled: true, reply: digestMsg, extractedChatId: chatId };
  }

  // 11. LỆNH LIÊN KẾT NHÓM: /link <DEAL_CODE | @HANDLE | BRAND <TÊN_BRAND> | INTERNAL>
  if (lowerClean.startsWith('/link') || lowerClean.startsWith('link ')) {
    const rawParam = cleanText.replace(/^\/?link\s*/i, '').trim();
    if (!rawParam) {
      const msg =
        '⚠️ Vui lòng nhập mã Deal, @handle KOC hoặc tên Brand cần liên kết.\nVí dụ:\n• /link BO261067161\n• /link @po.trann77\n• /link BRAND ClubClio';
      await replyToChat(msg);
      return { handled: true, reply: msg, extractedChatId: chatId };
    }

    const upperParam = rawParam.toUpperCase();
    let groupRole: ZaloGroupRole = 'KOC_GROUP';
    let parsedBrandParam = '';

    if (upperParam.startsWith('BRAND')) {
      groupRole = 'BRAND_PARTNER';
      parsedBrandParam = rawParam.replace(/^brand\s*/i, '').trim() || 'ClubClio';
    } else if (
      upperParam === 'INTERNAL' ||
      upperParam === 'NOIBO' ||
      upperParam === 'BOD' ||
      upperParam === 'CEO'
    ) {
      const isManagerSender =
        isSimulatedFromWeb ||
        (senderPerm && (senderPerm.role === 'CEO' || senderPerm.role === 'LEAD_B2C' || senderPerm.role === 'LEADER'));
      if (securityPolicy.lockRoleElevationFromChat && !isManagerSender) {
        const denyElevation =
          '⛔ CHẶN NÂNG QUYỀN TRÁI PHÉP: Hệ thống khóa lệnh tự nâng cấp nhóm thành Nội bộ / BOD từ khung chat Zalo. Quản trị viên vui lòng cấp quyền nhóm trực tiếp trên màn hình [Quản lý Bot Zalo] của Web Admin.';
        await replyToChat(denyElevation);
        return { handled: true, reply: denyElevation, extractedChatId: chatId };
      }
      groupRole = upperParam === 'BOD' || upperParam === 'CEO' ? 'BOD_EXECUTIVE' : 'INTERNAL_OPS';
    }

    // Tự động tra cứu thông tin từ danh bạ KOC hoặc Gian hàng nếu khớp
    const lookupKey = (parsedBrandParam || rawParam).replace(/^@/, '').toLowerCase();
    const matchedKoc =
      KOC_BY_HANDLE_INDEX.get(lookupKey) ||
      QUICK_KOC_CATALOG.find(
        (k) =>
          k.brandName.toLowerCase() === lookupKey ||
          k.stageName.toLowerCase().includes(lookupKey)
      );

    const matchedStore = REAL_B2C_69_STORES.find(
      (s) =>
        s.brandName.toLowerCase().includes(lookupKey) ||
        s.storeName.toLowerCase().includes(lookupKey)
    );

    const brandName =
      matchedStore?.brandName ||
      matchedKoc?.brandName ||
      parsedBrandParam ||
      currentMapping?.brandName ||
      'ClubClio';
    const leaderName = resolveLeaderForBrand(brandName);

    const newMapping: ZaloGroupMapping = {
      groupId: chatId,
      groupName:
        groupRole === 'INTERNAL_OPS'
          ? `[Nội bộ B2C] Nhóm Điều Phối (${chatId.slice(0, 8)})`
          : groupRole === 'BOD_EXECUTIVE'
            ? `[Ban Giám Đốc] Nhóm Kiểm Soát PnL (${chatId.slice(0, 8)})`
            : groupRole === 'BRAND_PARTNER'
              ? `[Brand Partner] ${brandName} x Upbase B2C (${chatId.slice(0, 8)})`
              : `[${brandName} x ${matchedKoc?.stageName || rawParam}]`,
      groupRole,
      allowedBrands: groupRole === 'BRAND_PARTNER' ? [brandName] : currentMapping?.allowedBrands,
      dealCode: groupRole === 'BRAND_PARTNER' ? `BRAND-${brandName.toUpperCase().replace(/\s+/g, '')}` : rawParam,
      kocHandle: matchedKoc?.handle || (rawParam.startsWith('@') ? rawParam.slice(1) : undefined),
      kocName:
        groupRole === 'BRAND_PARTNER'
          ? `Đại diện Nhãn hàng ${brandName}`
          : matchedKoc?.stageName || currentMapping?.kocName || 'KOC Đối tác',
      brandName,
      storeName: matchedStore?.storeName || `${brandName}_TikTok_Flagship`,
      picName: matchedKoc?.bookingPic || matchedStore?.primaryPic || 'Hà Thị Thủy',
      leaderName,
      productName: currentMapping?.productName || `Sản phẩm chiến dịch ${brandName}`,
      pillarName: 'Review trực tiếp (PIL-01)',
      requiredHashtags: [brandName.replace(/\s+/g, ''), 'UpbaseB2C', 'BeautyReview'],
      deadlineDate: '31/10/2026',
      bookingFeeNet: matchedKoc?.rateCardNet || 5000000,
      dealStatus: 'ĐANG_QUAY_NHÁP',
      linkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mappings.set(chatId, newMapping);
    saveMappings();

    const successMsg = [
      `✅ ĐÃ LIÊN KẾT NHÓM ZALO THÀNH CÔNG`,
      `----------------------------------------`,
      `• Chat/Group ID: ${chatId}`,
      `• Phân quyền nhóm: ${
        groupRole === 'KOC_GROUP'
          ? 'Nhóm làm việc KOC (Khóa dữ liệu PnL nội bộ)'
          : groupRole === 'BRAND_PARTNER'
            ? `Nhóm làm việc với Nhãn hàng / Brand (${brandName})`
            : groupRole === 'INTERNAL_OPS'
              ? 'Nhóm Vận hành nội bộ (Mở tra cứu KOC/SLA/PnL)'
              : 'Nhóm Điều hành BOD (Toàn quyền)'
      }`,
      `• Mã liên kết: [${newMapping.dealCode}]`,
      `• Thương hiệu: ${newMapping.brandName} (${newMapping.storeName})`,
      `• Đối tác: ${newMapping.kocName} ${newMapping.kocHandle ? `(@${newMapping.kocHandle})` : ''}`,
      `• PIC phụ trách: ${newMapping.picName}`,
      `• Cấp phê duyệt: ${newMapping.leaderName}`,
      `----------------------------------------`,
      groupRole === 'BRAND_PARTNER'
        ? `👉 Các lệnh dành cho Brand: /listing (Duyệt danh sách KOC), /nhapchoduyet (Duyệt video demo), /tiendo (Báo cáo tiến độ & ngân sách Brand).`
        : `👉 Gõ /brief để xem yêu cầu kịch bản, hoặc gửi link TikTok vào nhóm để nghiệm thu tự động.`,
    ].join('\n');

    await replyToChat(successMsg);
    return { handled: true, reply: successMsg, extractedChatId: chatId };
  }

  // 12. LỆNH TÓM TẮT HỘI THOẠI & TIẾN ĐỘ NHÓM: /tomtat HOẶC /summary
  if (
    lowerClean === '/tomtat' ||
    lowerClean === 'tomtat' ||
    lowerClean.startsWith('/tomtat ') ||
    lowerClean === '/summary' ||
    lowerClean.startsWith('/summary ')
  ) {
    const pasted = cleanText.replace(/^\/?(?:tomtat|summary)\s*/i, '').trim();
    if (pasted && currentMapping) {
      currentMapping.draftReviewNote = pasted.slice(0, 220);
      currentMapping.updatedAt = new Date().toISOString();
      mappings.set(chatId, currentMapping);
      saveMappings();
      void syncZaloBotStateToDb({ upsertGroup: currentMapping });
    }
    const summaryMsg = buildGroupSummaryMessage(currentMapping, chatId, pasted);
    await replyToChat(summaryMsg);
    return { handled: true, reply: summaryMsg, extractedChatId: chatId };
  }

  // 13. LỆNH KIỂM TRA TRẠNG THÁI NHÓM: /status
  if (lowerClean === '/status' || lowerClean === 'status') {
    const statusMsg = currentMapping
      ? [
          `📋 HỒ SƠ LIÊN KẾT NHÓM HIỆN TẠI`,
          `----------------------------------------`,
          `• Tên nhóm: ${currentMapping.groupName || currentMapping.groupId}`,
          `• Mã Chat ID: ${currentMapping.groupId}`,
          `• Cấp độ phân quyền: ${currentMapping.groupRole}`,
          `• Mã Deal: ${currentMapping.dealCode || '—'}`,
          `• Thương hiệu: ${currentMapping.brandName || '—'} (${currentMapping.storeName || '—'})`,
          `• KOC / Đối tác: ${currentMapping.kocName || '—'} ${currentMapping.kocHandle ? `(@${currentMapping.kocHandle})` : ''}`,
          `• PIC phụ trách: ${currentMapping.picName || '—'}`,
          `• Cấp duyệt: ${currentMapping.leaderName || resolveLeaderForBrand(currentMapping.brandName)}`,
          `• Trạng thái thực thi: ${currentMapping.dealStatus}`,
          `• Hạn nộp SLA: ${currentMapping.deadlineDate || '—'}`,
          currentMapping.draftVideoUrl ? `• Link bản nháp: ${currentMapping.draftVideoUrl}` : '',
          currentMapping.airedVideoUrl ? `• Link đã Air: ${currentMapping.airedVideoUrl}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `📋 THÔNG TIN NHÓM HIỆN TẠI`,
          `• Mã Chat ID: ${chatId}`,
          `• Trạng thái: Chưa liên kết Deal cụ thể.`,
          `👉 Gõ /link <MÃ_DEAL> (ví dụ: /link BO261067161) để liên kết với KOC, /link BRAND <Tên_Brand> cho nhóm Nhãn hàng, hoặc /link INTERNAL nếu là nhóm nội bộ.`,
        ].join('\n');

    await replyToChat(statusMsg);
    return { handled: true, reply: statusMsg, extractedChatId: chatId };
  }

  // 14. LỆNH TRỢ GIÚP /start, /help HOẶC CHÀO HỎI
  const isInternalOrBod = effectiveRole === 'INTERNAL_OPS' || effectiveRole === 'BOD_EXECUTIVE';
  const isBrandPartner = effectiveRole === 'BRAND_PARTNER';
  const helpMsg = [
    `🤖 TRỢ LÝ VẬN HÀNH B2C — UPBASE ZALO BOT`,
    `----------------------------------------`,
    `📌 CÁC LỆNH TRONG NHÓM KOC & NGHIỆM THU:`,
    `• Gửi link TikTok kèm @Bot: Tự động quét nghiệm thu bài đăng (Air, Giỏ hàng, Thời gian nhắc SP, Ảnh KOC cầm SP, View/Like).`,
    `• /brief : Xem nội dung Brief, góc quay và hashtag bắt buộc của Deal.`,
    `• /nopnhap <link_drive> : KOC nộp link video nháp chờ duyệt.`,
    `• /duyetnhap [ghi chú] : PIC / Brand xác nhận duyệt video nháp cho KOC đăng bài.`,
    `• /suanhap <nội dung> : PIC / Brand gửi yêu cầu chỉnh sửa video nháp.`,
    `• /status : Kiểm tra trạng thái tiến độ Deal của nhóm.`,
    `• /link <MÃ_DEAL> : Liên kết nhóm với mã Deal (hoặc /link BRAND <Tên_Brand> cho nhóm Nhãn hàng).`,
    ...(isBrandPartner
      ? [
          `----------------------------------------`,
          `🏢 CÁC LỆNH DÀNH RIÊNG CHO NHÓM NHÃN HÀNG (BRAND PARTNER):`,
          `• /listing : Xem danh sách đề xuất KOC (Shortlist) chờ Brand duyệt.`,
          `• /koc <@handle> : Xem Media Kit, GMV & ROI lịch sử của KOC.`,
          `• /duyetkoc <@handle> [ghi chú] : Chốt chọn KOC triển khai chiến dịch.`,
          `• /tuchoikoc <@handle> <lý do> : Yêu cầu đổi ứng viên KOC khác.`,
          `• /nhapchoduyet : Xem danh sách các video Demo đang chờ Brand duyệt.`,
          `• /tiendo : Xem báo cáo tiến độ số lượng video & ngân sách của Brand.`,
        ]
      : isInternalOrBod
        ? [
            `----------------------------------------`,
            `🔐 CÁC LỆNH NỘI BỘ & ĐIỀU HÀNH (ĐÃ MỞ KHÓA):`,
            `• /koc <@handle> : Tra cứu lịch sử hợp tác, GMV, ROI & STK của KOC.`,
            `• /pnl [tên_brand] : Xem ngân sách Gross/Net, thực chi & định mức 69 gian hàng B2C.`,
            `• /listing [tên_brand] : Xem danh sách đề xuất KOC theo Brand.`,
            `• /tiendo [tên_brand] : Xem báo cáo tiến độ gửi Nhãn hàng.`,
            `• /overbudget : Kiểm tra các gian hàng cảnh báo vượt trần ngân sách.`,
            `• /sla : Rà soát tiến độ nộp bài của các nhóm KOC.`,
            `• /digest : Xuất báo cáo điều hành tổng hợp cuối ngày.`,
          ]
        : [
            `----------------------------------------`,
            `🔒 Ghi chú: Nhóm đang ở chế độ làm việc với KOC (ẩn các lệnh ngân sách PnL nội bộ).`,
          ]),
  ].join('\n');

  await replyToChat(helpMsg);
  return { handled: true, reply: helpMsg, extractedChatId: chatId };
}
