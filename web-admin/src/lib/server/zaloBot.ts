import fs from 'node:fs';
import path from 'node:path';
import { checkSingleLinkServerless } from '../linkAirCheckServer';
import type { LinkAirResult } from '../linkAirCheck';
import { REAL_B2C_69_STORES } from '../realB2cPlanData';
import { readRecord, upsertRecord } from './sharedRecords';

export type ZaloGroupRole = 'KOC_GROUP' | 'INTERNAL_OPS' | 'BOD_EXECUTIVE';

export type ZaloGroupAccessStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED';

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

const inMemoryMappings = new Map<string, ZaloGroupMapping>();
const inMemoryAirHistory: ZaloAirCheckHistoryItem[] = [];
const inMemoryPermissions = new Map<string, ZaloUserPermission>();
const inMemoryDiscoveredSenders = new Map<string, ZaloDiscoveredSender>();
let inMemorySecurityPolicy: ZaloBotSecurityPolicy | null = null;
let lastDbHydratedAt = 0;

interface ZaloBotPersistedState {
  mappings: Record<string, ZaloGroupMapping>;
  permissions: Record<string, ZaloUserPermission>;
  discoveredSenders: Record<string, ZaloDiscoveredSender>;
  securityPolicy?: ZaloBotSecurityPolicy;
}

const ZALO_BOT_SHARED_KEY = 'zalo-bot-state-v1';
const recentDebugEvents: Array<{
  time: string;
  body: any;
  extractedChatId?: string;
  replySent?: boolean;
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
  try {
    const dir = path.dirname(MAPPINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(inMemoryMappings.values());
    fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {
    // Non-fatal on serverless read-only fs
  }
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
  try {
    const dir = path.dirname(PERMISSIONS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(inMemoryPermissions.values());
    fs.writeFileSync(PERMISSIONS_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {
    // Ignore read-only errors
  }
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
  try {
    const dir = path.dirname(AIR_HISTORY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AIR_HISTORY_FILE_PATH, JSON.stringify(inMemoryAirHistory.slice(0, 50), null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

export function getAllMappings(): ZaloGroupMapping[] {
  return Array.from(loadMappings().values());
}

export function getAllDiscoveredSenders(): ZaloDiscoveredSender[] {
  return Array.from(inMemoryDiscoveredSenders.values()).sort((a, b) =>
    (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '')
  );
}

/**
 * Đồng bộ trạng thái Zalo Bot từ PostgreSQL (AppSharedRecord) để đảm bảo 20 nhân viên
 * thao tác đồng thời trên hàng trăm nhóm KOC không bị ghi đè hoặc mất dữ liệu giữa các Serverless instance.
 */
export async function hydrateZaloBotStateFromDb(): Promise<void> {
  if (Date.now() - lastDbHydratedAt < 5000) return;
  loadMappings();
  loadPermissions();
  getSecurityPolicy();
  try {
    const rec = await readRecord<ZaloBotPersistedState>(ZALO_BOT_SHARED_KEY, {
      mappings: {},
      permissions: {},
      discoveredSenders: {},
    });
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
    }
    lastDbHydratedAt = Date.now();
  } catch {
    // Fallback an toàn trên bộ nhớ trong
  }
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
}): Promise<void> {
  try {
    await upsertRecord<ZaloBotPersistedState>(
      ZALO_BOT_SHARED_KEY,
      {
        mappings: Object.fromEntries(loadMappings().entries()),
        permissions: Object.fromEntries(loadPermissions().entries()),
        discoveredSenders: Object.fromEntries(inMemoryDiscoveredSenders.entries()),
        securityPolicy: getSecurityPolicy(),
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

const TIKTOK_URL_REGEX = /(https?:\/\/(?:vt\.tiktok\.com|www\.tiktok\.com|tiktok\.com)\/[^\s]+)/i;
const DRAFT_URL_REGEX = /(https?:\/\/(?:drive\.google\.com|docs\.google\.com|www\.capcut\.com|capcut\.com)\/[^\s]+)/i;

/**
 * Dựng nội dung Brief chuẩn cho nhóm KOC
 */
export function buildDealBriefMessage(mapping: ZaloGroupMapping): string {
  return [
    `📋 BRIEF CHIẾN DỊCH BOOKING KOC - UPBASE B2C`,
    `----------------------------------------`,
    `• Mã Deal: ${mapping.dealCode || 'Chưa gán'}`,
    `• Thương hiệu: ${mapping.brandName || '—'} (${mapping.storeName || 'Gian hàng chính hãng'})`,
    `• KOC thực hiện: ${mapping.kocName || mapping.kocHandle || '—'}`,
    `• Sản phẩm trọng tâm: ${mapping.productName || 'Theo danh mục sản phẩm chiến dịch'}`,
    `• Trụ cột nội dung: ${mapping.pillarName || 'Review trực tiếp trải nghiệm thực tế'}`,
    `• Yêu cầu kịch bản & góc quay:`,
    `  ${mapping.briefSummary || 'Quay cận cảnh sản phẩm trong 3 giây đầu, nêu bật công dụng chính và kêu gọi bấm vào giỏ hàng góc trái màn hình.'}`,
    `• Hashtag bắt buộc: ${
      mapping.requiredHashtags && mapping.requiredHashtags.length > 0
        ? mapping.requiredHashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
        : '#UpbaseB2C #ReviewChinhHang'
    }`,
    `• Hạn nộp video nháp (SLA): ${mapping.deadlineDate || 'Trong vòng 5 ngày sau khi nhận mẫu'}`,
    `• Chuyên viên phụ trách (PIC): ${mapping.picName || 'Team Booking B2C'}`,
    `----------------------------------------`,
    `👉 Cách nộp bài ngay trong nhóm:`,
    `1. Nộp link video nháp (Google Drive): Gõ /nopnhap <link_drive>`,
    `2. Nộp link TikTok đã đăng (Air): Dán trực tiếp link TikTok kèm tag @Bot để hệ thống tự động quét nghiệm thu.`,
  ].join('\n');
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
): Promise<{ handled: boolean; reply?: string; extractedChatId?: string }> {
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
  const replyToChat = async (text: string) => {
    if (shouldSend) {
      await sendZaloMessage(chatId, text);
    }
    recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: shouldSend });
  };

  // Bỏ các mention (@Bot...) ở đầu câu để lấy câu lệnh chuẩn
  const cleanText = rawText.replace(/@[^\s]+/g, '').trim();
  const lowerClean = cleanText.toLowerCase();

  await hydrateZaloBotStateFromDb();
  const mappings = loadMappings();
  let currentMapping = mappings.get(chatId);
  const securityPolicy = getSecurityPolicy();
  const senderPerm = senderId ? loadPermissions().get(senderId) : undefined;
  const isSimulatedFromWeb = Boolean(options?.skipSendToZalo);

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
        groupName: `[Mới phát hiện] Nhóm Zalo (${chatId.slice(0, 8)}) — ${senderName}`,
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

    let discoveredSender: ZaloDiscoveredSender | undefined;
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

    void syncZaloBotStateToDb({
      upsertGroup: currentMapping,
      upsertSender: discoveredSender,
    });
  }

  // KIỂM TRA TRẠNG THÁI CHẶN / WHITELIST CỦA NHÓM CHAT
  if (currentMapping?.accessStatus === 'BLOCKED' && !isSimulatedFromWeb) {
    const blockedMsg =
      '⛔ BẢO MẬT NHÓM: Nhóm chat này đã bị khóa quyền tương tác với Bot trên hệ thống quản trị Upbase B2C.';
    await replyToChat(blockedMsg);
    return { handled: true, reply: blockedMsg, extractedChatId: chatId };
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
    if (shouldSend) {
      await sendZaloMessage(
        chatId,
        `⏳ Đang quét dữ liệu nghiệm thu video TikTok: ${videoUrl}\nVui lòng chờ trong giây lát...`
      );
    }

    try {
      const checkResult: LinkAirResult = await checkSingleLinkServerless(videoUrl, {
        requiredHashtags: currentMapping?.requiredHashtags,
        expectedProductUrl: currentMapping?.expectedProductUrl,
      });

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

      // Cập nhật trạng thái Deal nếu nhóm đã liên kết và kết quả PASS
      if (currentMapping && isPass) {
        currentMapping.dealStatus = 'ĐÃ_NGHIỆM_THU_AIR';
        currentMapping.airedVideoUrl = videoUrl;
        currentMapping.updatedAt = new Date().toISOString();
        mappings.set(chatId, currentMapping);
        saveMappings();
      }

      // Lưu vào lịch sử nghiệm thu trên Web Manager
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
        views: checkResult.metrics?.views ?? null,
        likes: checkResult.metrics?.likes ?? null,
        hashtags: checkResult.hashtags || [],
        sentToZalo: shouldSend,
      });

      const resultMsg = [
        `📊 KẾT QUẢ NGHIỆM THU VIDEO TIKTOK`,
        `----------------------------------------`,
        `• Đánh giá: ${statusIcon}`,
        `• Tác giả kênh: @${checkResult.author?.handle || 'Chưa rõ'}`,
        `• Tình trạng: ${checkResult.status === 'LIVE' ? 'Đang công khai (Live/Air)' : checkResult.status}`,
        `• Giỏ hàng: ${cartText}`,
        ...productLinkLines,
        `• Lượt xem: ${checkResult.metrics?.views ? checkResult.metrics.views.toLocaleString('vi-VN') : '—'}`,
        `• Lượt thích: ${checkResult.metrics?.likes ? checkResult.metrics.likes.toLocaleString('vi-VN') : '—'}`,
        `• Hashtags: ${
          checkResult.hashtags && checkResult.hashtags.length > 0
            ? checkResult.hashtags.map((h) => `#${h.replace(/^#+/, '')}`).join(' ')
            : '—'
        }`,
        `----------------------------------------`,
        currentMapping
          ? `✅ Đã đồng bộ kết quả vào Deal [${currentMapping.dealCode}] (${currentMapping.brandName || 'B2C'}) — Trạng thái: ${currentMapping.dealStatus}`
          : `💡 Mẹo: Gõ /link <MÃ_DEAL> để tự động lưu kết quả nghiệm thu vào hồ sơ Deal trên web-admin.`,
      ].join('\n');

      await replyToChat(resultMsg);
      return { handled: true, reply: resultMsg, extractedChatId: chatId };
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

    const replyMsg = [
      `📥 ĐÃ TIẾP NHẬN VIDEO DEMO / NHÁP`,
      `----------------------------------------`,
      `• Người nộp: ${senderName}`,
      `• Mã Deal: ${currentMapping?.dealCode || 'Chưa liên kết (/link)'}`,
      `• Thương hiệu: ${currentMapping?.brandName || '—'}`,
      `• Link bản nháp: ${draftUrl}`,
      `• Trạng thái mới: ĐÃ_NỘP_NHÁP (Chờ PIC/Brand duyệt)`,
      `----------------------------------------`,
      `🔔 Nhắc PIC phụ trách (${currentMapping?.picName || 'Team Booking'}): Sau khi kiểm tra nội dung, hãy gõ:`,
      `• /duyetnhap [ghi chú] -> Để phê duyệt cho KOC đăng bài.`,
      `• /suanhap <nội dung cần sửa> -> Để yêu cầu KOC chỉnh sửa.`,
    ].join('\n');

    await replyToChat(replyMsg);
    return { handled: true, reply: replyMsg, extractedChatId: chatId };
  }

  // 3. LỆNH DUYỆT VIDEO NHÁP (/duyetnhap HOẶC /approve-draft)
  if (lowerClean.startsWith('/duyetnhap') || lowerClean.startsWith('/approve-draft')) {
    if (
      securityPolicy.restrictDraftReviewToStaff &&
      !isSimulatedFromWeb &&
      (!senderPerm || senderPerm.role === 'KOC')
    ) {
      const denyStaff =
        '⛔ BẢO MẬT QUY TRÌNH: Chỉ nhân sự Upbase (PIC / Leader / Lead B2C) đã đăng ký Zalo User ID mới có quyền phê duyệt bản nháp.';
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

    const msg = [
      `✅ PHÊ DUYỆT VIDEO NHÁP THÀNH CÔNG`,
      `----------------------------------------`,
      `• Mã Deal: ${currentMapping?.dealCode || '—'} (${currentMapping?.brandName || '—'})`,
      `• KOC: ${currentMapping?.kocName || currentMapping?.kocHandle || '—'}`,
      `• Người duyệt: ${senderName}`,
      `• Ghi chú duyệt: ${note || 'Nội dung đạt yêu cầu theo Brief. KOC tiến hành đăng video lên kênh và gắn giỏ hàng đúng quy định.'}`,
      `• Trạng thái Deal: ĐÃ_DUYỆT_NHÁP`,
      `----------------------------------------`,
      `👉 Khi đăng video lên TikTok xong, KOC chỉ cần gửi link TikTok vào nhóm này để Bot nghiệm thu tự động!`,
    ].join('\n');

    await replyToChat(msg);
    return { handled: true, reply: msg, extractedChatId: chatId };
  }

  // 4. LỆNH YÊU CẦU SỬA VIDEO NHÁP (/suanhap HOẶC /reject-draft)
  if (lowerClean.startsWith('/suanhap') || lowerClean.startsWith('/reject-draft')) {
    if (
      securityPolicy.restrictDraftReviewToStaff &&
      !isSimulatedFromWeb &&
      (!senderPerm || senderPerm.role === 'KOC')
    ) {
      const denyStaff =
        '⛔ BẢO MẬT QUY TRÌNH: Chỉ nhân sự Upbase (PIC / Leader / Lead B2C) đã đăng ký Zalo User ID mới có quyền gửi yêu cầu sửa bản nháp.';
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

    const msg = [
      `🛠️ YÊU CẦU CHỈNH SỬA VIDEO NHÁP`,
      `----------------------------------------`,
      `• Mã Deal: ${currentMapping?.dealCode || '—'} (${currentMapping?.brandName || '—'})`,
      `• Người yêu cầu: ${senderName}`,
      `• Nội dung cần điều chỉnh: ${feedback}`,
      `• Trạng thái Deal: CẦN_CHỈNH_SỬA`,
      `----------------------------------------`,
      `👉 Sau khi chỉnh sửa xong, KOC gửi lại link Google Drive mới kèm lệnh /nopnhap nhé!`,
    ].join('\n');

    await replyToChat(msg);
    return { handled: true, reply: msg, extractedChatId: chatId };
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

  // 8. LỆNH CẢNH BÁO VƯỢT TRẦN NGÂN SÁCH (/overbudget) — CHẶN TRONG NHÓM KOC
  if (lowerClean === '/overbudget' || lowerClean === 'overbudget' || lowerClean === '/canhbao') {
    if (effectiveRole === 'KOC_GROUP') {
      const deniedMsg =
        '⛔ PHÂN QUYỀN BẢO MẬT: Không được phép truy xuất dữ liệu cảnh báo ngân sách nội bộ trong nhóm KOC.';
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

    const digestMsg = buildDailyDigestMessage();
    await replyToChat(digestMsg);
    return { handled: true, reply: digestMsg, extractedChatId: chatId };
  }

  // 11. LỆNH LIÊN KẾT NHÓM: /link <DEAL_CODE | @HANDLE | BRAND>
  if (lowerClean.startsWith('/link') || lowerClean.startsWith('link ')) {
    const rawParam = cleanText.replace(/^\/?link\s*/i, '').trim();
    if (!rawParam) {
      const msg =
        '⚠️ Vui lòng nhập mã Deal hoặc @handle KOC cần liên kết.\nVí dụ:\n• /link BO261067161\n• /link @po.trann77';
      await replyToChat(msg);
      return { handled: true, reply: msg, extractedChatId: chatId };
    }

    const upperParam = rawParam.toUpperCase();
    let groupRole: ZaloGroupRole = 'KOC_GROUP';
    if (upperParam === 'INTERNAL' || upperParam === 'NOIBO' || upperParam === 'BOD' || upperParam === 'CEO') {
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
    const cleanHandle = rawParam.replace(/^@/, '').toLowerCase();
    const matchedKoc =
      KOC_BY_HANDLE_INDEX.get(cleanHandle) ||
      QUICK_KOC_CATALOG.find(
        (k) =>
          k.brandName.toLowerCase() === cleanHandle ||
          k.stageName.toLowerCase().includes(cleanHandle)
      );

    const matchedStore = REAL_B2C_69_STORES.find(
      (s) =>
        s.brandName.toLowerCase() === cleanHandle ||
        s.storeName.toLowerCase().includes(cleanHandle)
    );

    const brandName = matchedKoc?.brandName || matchedStore?.brandName || currentMapping?.brandName || 'ClubClio';
    const leaderName = resolveLeaderForBrand(brandName);

    const newMapping: ZaloGroupMapping = {
      groupId: chatId,
      groupName:
        groupRole === 'INTERNAL_OPS'
          ? `[Nội bộ B2C] Nhóm Điều Phối (${chatId.slice(0, 8)})`
          : groupRole === 'BOD_EXECUTIVE'
            ? `[Ban Giám Đốc] Nhóm Kiểm Soát PnL (${chatId.slice(0, 8)})`
            : `[${brandName} x ${matchedKoc?.stageName || rawParam}]`,
      groupRole,
      dealCode: rawParam,
      kocHandle: matchedKoc?.handle || (rawParam.startsWith('@') ? rawParam.slice(1) : undefined),
      kocName: matchedKoc?.stageName || currentMapping?.kocName || 'KOC Đối tác',
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
          : groupRole === 'INTERNAL_OPS'
            ? 'Nhóm Vận hành nội bộ (Mở tra cứu KOC/SLA/PnL)'
            : 'Nhóm Điều hành BOD (Toàn quyền)'
      }`,
      `• Mã liên kết: [${newMapping.dealCode}]`,
      `• Thương hiệu: ${newMapping.brandName} (${newMapping.storeName})`,
      `• KOC: ${newMapping.kocName} ${newMapping.kocHandle ? `(@${newMapping.kocHandle})` : ''}`,
      `• PIC phụ trách: ${newMapping.picName}`,
      `• Cấp phê duyệt: ${newMapping.leaderName}`,
      `----------------------------------------`,
      `👉 Gõ /brief để xem yêu cầu kịch bản, hoặc gửi link TikTok vào nhóm để nghiệm thu tự động.`,
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
          `• KOC: ${currentMapping.kocName || '—'} ${currentMapping.kocHandle ? `(@${currentMapping.kocHandle})` : ''}`,
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
          `👉 Gõ /link <MÃ_DEAL> (ví dụ: /link BO261067161) để liên kết với KOC, hoặc /link INTERNAL nếu là nhóm nội bộ.`,
        ].join('\n');

    await replyToChat(statusMsg);
    return { handled: true, reply: statusMsg, extractedChatId: chatId };
  }

  // 13. LỆNH TRỢ GIÚP /start, /help HOẶC CHÀO HỎI
  const isInternalOrBod = effectiveRole === 'INTERNAL_OPS' || effectiveRole === 'BOD_EXECUTIVE';
  const helpMsg = [
    `🤖 TRỢ LÝ VẬN HÀNH B2C — UPBASE ZALO BOT`,
    `----------------------------------------`,
    `📌 CÁC LỆNH TRONG NHÓM KOC & NGHIỆM THU:`,
    `• Gửi link TikTok kèm @Bot: Tự động quét nghiệm thu bài đăng (Air, Giỏ hàng, Hashtag, View/Like).`,
    `• /brief : Xem nội dung Brief, góc quay và hashtag bắt buộc của Deal.`,
    `• /nopnhap <link_drive> : KOC nộp link video nháp chờ duyệt.`,
    `• /duyetnhap [ghi chú] : PIC xác nhận duyệt video nháp cho KOC đăng bài.`,
    `• /suanhap <nội dung> : PIC gửi yêu cầu chỉnh sửa video nháp.`,
    `• /status : Kiểm tra trạng thái tiến độ Deal của nhóm.`,
    `• /link <MÃ_DEAL> : Liên kết nhóm với mã Deal (hoặc /link INTERNAL cho nhóm nội bộ).`,
    ...(isInternalOrBod
      ? [
          `----------------------------------------`,
          `🔐 CÁC LỆNH NỘI BỘ & ĐIỀU HÀNH (ĐÃ MỞ KHÓA):`,
          `• /koc <@handle> : Tra cứu lịch sử hợp tác, GMV, ROI & STK của KOC.`,
          `• /pnl [tên_brand] : Xem ngân sách Gross/Net, thực chi & định mức 69 gian hàng B2C.`,
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
