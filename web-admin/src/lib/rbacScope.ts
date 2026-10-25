import { UserProfile, BrandDetail, StorePortfolioItem, InputPlanBreakdownState, BookingDealItem } from './types';
import { isPersonInField } from './staffIdentity';

/** Tất cả người được phân việc trong một kế hoạch tháng: là PIC tham gia gian trong tháng đó. */
function planParticipantNames(plan: InputPlanBreakdownState): string[] {
  return [
    plan.pic, plan.primaryPic, plan.submittedBy,
    ...(plan.assignedMembers || []),
    ...(plan.items || []).map(i => i.assignedStaff),
  ].filter((n): n is string => !!n && !!n.trim());
}

/**
 * Kiểm tra xem người dùng có quyền quản trị toàn cục (Admin / Giám đốc B2C / Toàn quyền mọi nhãn hàng) hay không.
 * Theo GEMINI.md:
 * - Cấp BOD Admin: Đỗ Văn Giang (CEO) — toàn quyền toàn hệ thống.
 * - Cấp Giám Đốc Marketing B2C (Lead B2C): Đặng Thị Yến Nhi — quản lý toàn bộ 69 gian hàng B2C và 42 brand.
 * - Các tài khoản được cấp quyền canViewAllBrands hoặc có nhãn 'ALL_BRANDS' / 'Tất cả nhãn hàng'.
 */
export function isStaffGlobalAdminOrManager(user: UserProfile | null | undefined): boolean {
  if (!user) return false;

  // 1. Vai trò Quản trị viên cao nhất hoặc Giám đốc Marketing B2C
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return true;
  }

  // 2. Quyền tường minh ALL_PERMISSIONS hoặc canViewAllBrands
  if (user.permissions?.includes('ALL_PERMISSIONS')) {
    return true;
  }

  // 3. Phân công nhãn chứa cờ toàn cục
  if (user.assignedBrands && user.assignedBrands.some(b => {
    const norm = b.trim().toUpperCase();
    return norm === 'ALL_BRANDS' || norm === 'TẤT CẢ NHÃN HÀNG' || norm === 'ALL' || norm === '*';
  })) {
    return true;
  }

  return false;
}

interface UserScopeBase {
  key: string;
  user: UserProfile;
  isGlobal: boolean;
  userNameLower: string;
  assignedBrands: string[];
  assignedBrandsLower: Set<string>;
  allowedStoresLower: Set<string>;
}

interface StoreScopeIndex {
  managedStoreIds: Set<string>;
  managedStoreNamesLower: Set<string>;
  managedBrandNamesLower: Set<string>;
}

const userScopeCache = new WeakMap<UserProfile, UserScopeBase>();
const storeScopeCache = new WeakMap<StorePortfolioItem[], Map<string, StoreScopeIndex>>();

function hasUserInPicField(pic: string | undefined | null, userNameLower: string): boolean {
  if (!pic || !userNameLower) return false;
  const lower = pic.toLowerCase();
  if (!lower.includes(userNameLower)) return false;
  return lower.split(/[,;|]/).some(name => name.trim() === userNameLower);
}

function getUserScopeBase(user: UserProfile): UserScopeBase {
  const cached = userScopeCache.get(user);
  const key = `${user.id}|${user.name || ''}|${user.email || ''}|${user.staffCode || ''}|${user.role}|${user.linkedEntityName || ''}|${(user.assignedBrands || []).join(',')}|${(user.allowedStoreNames || []).join(',')}|${(user.permissions || []).join(',')}`;
  if (cached && cached.key === key) {
    return cached;
  }

  const isGlobal = isStaffGlobalAdminOrManager(user);
  const userNameLower = (user.name || '').trim().toLowerCase();
  const assignedBrandsSet = new Set<string>();
  const assignedBrandsLower = new Set<string>();

  if (Array.isArray(user.assignedBrands)) {
    for (const b of user.assignedBrands) {
      const norm = b.trim();
      if (norm && !['ALL_BRANDS', 'Tất cả nhãn hàng', 'TẤT CẢ NHÃN HÀNG', 'ALL', '*'].includes(norm)) {
        assignedBrandsSet.add(norm);
        assignedBrandsLower.add(norm.toLowerCase());
      }
    }
  }

  if (user.linkedEntityName) {
    const parts = user.linkedEntityName.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!['ALL_BRANDS', 'Tất cả nhãn hàng'].includes(p)) {
        assignedBrandsSet.add(p);
        assignedBrandsLower.add(p.toLowerCase());
      }
    }
  }

  const allowedStoresLower = new Set<string>();
  if (Array.isArray(user.allowedStoreNames)) {
    for (const s of user.allowedStoreNames) {
      const norm = s.trim().toLowerCase();
      if (norm) allowedStoresLower.add(norm);
    }
  }

  const base: UserScopeBase = {
    key,
    user,
    isGlobal,
    userNameLower,
    assignedBrands: Array.from(assignedBrandsSet),
    assignedBrandsLower,
    allowedStoresLower,
  };
  userScopeCache.set(user, base);
  return base;
}

function checkStoreDirectMatch(store: StorePortfolioItem, base: UserScopeBase): boolean {
  const { userNameLower, allowedStoresLower, user } = base;

  if (allowedStoresLower.size > 0) {
    if (
      allowedStoresLower.has(store.storeName.toLowerCase()) ||
      allowedStoresLower.has(store.id.toLowerCase()) ||
      (store.storeOperationId && allowedStoresLower.has(store.storeOperationId.toLowerCase()))
    ) {
      return true;
    }
  }

  if (!userNameLower && !user.staffCode) return false;

  // Nhận người theo mã nhân sự lưu kèm gian (tên trùng / đổi tên không làm sai quyền)
  const codes = store.staffCodes;
  const fields = [
    store.b2cOwnerName, store.primaryPic, store.assignedStaff, store.assignedPic, store.accountOwnerName,
    store.bookingLeader, store.contentPic, store.backupOwnerName,
    ...(store.b2cOwners || []), ...(store.assignedMembers || []),
  ];
  return fields.some(f => isPersonInField(user, f, codes));
}

function getStoreScopeIndex(user: UserProfile, allStores: StorePortfolioItem[]): StoreScopeIndex {
  const base = getUserScopeBase(user);
  let byUser = storeScopeCache.get(allStores);
  if (!byUser) {
    byUser = new Map<string, StoreScopeIndex>();
    storeScopeCache.set(allStores, byUser);
  }
  const existing = byUser.get(base.key);
  if (existing) return existing;

  const managedStoreIds = new Set<string>();
  const managedStoreNamesLower = new Set<string>();
  const managedBrandNamesLower = new Set<string>(base.assignedBrandsLower);

  for (const s of allStores) {
    const sBrandLower = (s.brandName || s.storeName.split('_')[0] || '').trim().toLowerCase();
    const directMatch = checkStoreDirectMatch(s, base);
    const brandMatch = sBrandLower ? base.assignedBrandsLower.has(sBrandLower) : false;
    if (directMatch || brandMatch) {
      managedStoreIds.add(s.id);
      managedStoreNamesLower.add(s.storeName.toLowerCase());
      if (sBrandLower) {
        managedBrandNamesLower.add(sBrandLower);
      }
    }
  }

  const index: StoreScopeIndex = {
    managedStoreIds,
    managedStoreNamesLower,
    managedBrandNamesLower,
  };
  byUser.set(base.key, index);
  return index;
}

/**
 * Trích xuất danh sách tên nhãn hàng được phân công tường minh cho người dùng.
 */
export function getUserAssignedBrandNames(user: UserProfile | null | undefined): string[] {
  if (!user) return [];
  return getUserScopeBase(user).assignedBrands;
}

/**
 * Kiểm tra xem một nhãn hàng cụ thể có thuộc quyền quản lý của người dùng hay không.
 */
export function isBrandManagedByUser(
  brand: BrandDetail | string,
  user: UserProfile | null | undefined,
  allStores?: StorePortfolioItem[]
): boolean {
  if (!user) return false;
  const base = getUserScopeBase(user);
  if (base.isGlobal) return true;

  const brandName = typeof brand === 'string' ? brand.trim() : brand.name.trim();
  if (!brandName) return false;

  const bNameLower = brandName.toLowerCase();

  // 1. Khớp với danh sách nhãn hàng được gán trực tiếp cho nhân viên
  if (base.assignedBrandsLower.has(bNameLower)) {
    return true;
  }

  // 2. Nếu là đối tượng BrandDetail, kiểm tra các chức danh PIC gắn trực tiếp trên Brand
  if (typeof brand !== 'string') {
    const { allowedStoresLower, user: scopeUser } = base;
    const codes = brand.staffCodes;
    if (
      [brand.brandPicName, brand.accountPic, brand.bookingPicLead, brand.contentBrandMainPic, brand.planStrategyPic, brand.keyVisualSisPic]
        .some(f => isPersonInField(scopeUser, f, codes))
    ) {
      return true;
    }

    if (allowedStoresLower.size > 0 && Array.isArray(brand.stores) && brand.stores.length > 0) {
      if (
        brand.stores.some(
          bs =>
            allowedStoresLower.has(bs.storeName.toLowerCase()) ||
            (bs.storeId && allowedStoresLower.has(bs.storeId.toLowerCase()))
        )
      ) {
        return true;
      }
    }
  }

  // 3. Tra cứu O(1) trên chỉ mục gian hàng của nhân sự
  if (allStores && allStores.length > 0) {
    const storeIndex = getStoreScopeIndex(user, allStores);
    if (storeIndex.managedBrandNamesLower.has(bNameLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem một gian hàng cụ thể có thuộc quyền quản lý của người dùng hay không (PIC gian: xem + làm việc).
 */
export function isStoreManagedByUser(
  store: StorePortfolioItem,
  user: UserProfile | null | undefined,
  checkBrandAssigned: boolean = true
): boolean {
  if (!user) return false;
  const base = getUserScopeBase(user);
  if (base.isGlobal) return true;

  if (checkStoreDirectMatch(store, base)) {
    return true;
  }

  if (checkBrandAssigned) {
    const storeBrand = (store.brandName || store.storeName.split('_')[0] || '').trim().toLowerCase();
    if (storeBrand && base.assignedBrandsLower.has(storeBrand)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem một Kế hoạch tháng (Input Plan) có thuộc quyền quản lý của người dùng hay không.
 */
export function isPlanManagedByUser(
  plan: InputPlanBreakdownState,
  user: UserProfile | null | undefined,
  allStores?: StorePortfolioItem[]
): boolean {
  if (!user) return false;
  const base = getUserScopeBase(user);
  if (base.isGlobal) return true;

  const { userNameLower } = base;

  // 1. Được phân việc trong kế hoạch = PIC tham gia gian trong tháng đó → xem được kế hoạch,
  //    kể cả khi đã rời danh sách PIC gian. Quyền sửa kế hoạch vẫn đòi phải đang là PIC gian.
  if (userNameLower && planParticipantNames(plan).some(name => hasUserInPicField(name, userNameLower))) {
    return true;
  }

  // 2. Tra cứu O(1) theo gian hàng gắn với kế hoạch
  if (allStores && allStores.length > 0) {
    const storeIndex = getStoreScopeIndex(user, allStores);
    if (plan.storeId && storeIndex.managedStoreIds.has(plan.storeId)) {
      return true;
    }
    if (plan.storeName && storeIndex.managedStoreNamesLower.has(plan.storeName.toLowerCase())) {
      return true;
    }
  }

  // 3. Khớp theo nhãn hàng
  if (plan.brandName && isBrandManagedByUser(plan.brandName, user, allStores)) {
    return true;
  }
  if (plan.parentBrand && isBrandManagedByUser(plan.parentBrand, user, allStores)) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem một Booking Deal có thuộc quyền quản lý của người dùng hay không.
 */
export function isDealManagedByUser(
  deal: BookingDealItem,
  user: UserProfile | null | undefined,
  allStores?: StorePortfolioItem[]
): boolean {
  if (!user) return false;
  const base = getUserScopeBase(user);
  if (base.isGlobal) return true;

  const { userNameLower } = base;

  // 1. Trực tiếp là PIC của deal
  if (
    userNameLower &&
    (hasUserInPicField(deal.assignedStaff, userNameLower) ||
      hasUserInPicField(deal.bookingPic, userNameLower) ||
      hasUserInPicField(deal.accountPic, userNameLower) ||
      hasUserInPicField(deal.leadBooking, userNameLower))
  ) {
    return true;
  }

  // 2. Khớp theo nhãn hàng của deal
  if (deal.brandName && isBrandManagedByUser(deal.brandName, user, allStores)) {
    return true;
  }

  // 3. Tra cứu O(1) theo gian hàng của deal
  if (deal.storeName && allStores && allStores.length > 0) {
    const storeIndex = getStoreScopeIndex(user, allStores);
    if (storeIndex.managedStoreNamesLower.has(deal.storeName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Lọc danh sách thương hiệu (BrandDetail) theo quyền của người dùng.
 */
export function filterScopedBrands(
  brands: BrandDetail[],
  user: UserProfile | null | undefined,
  stores?: StorePortfolioItem[]
): BrandDetail[] {
  if (!user) return [];
  if (isStaffGlobalAdminOrManager(user)) {
    return brands;
  }
  return brands.filter(b => isBrandManagedByUser(b, user, stores));
}

/**
 * Lọc danh sách gian hàng (StorePortfolioItem) theo quyền của người dùng.
 */
export function filterScopedStores(
  stores: StorePortfolioItem[],
  user: UserProfile | null | undefined
): StorePortfolioItem[] {
  if (!user) return [];
  if (isStaffGlobalAdminOrManager(user)) {
    return stores;
  }
  return stores.filter(s => isStoreManagedByUser(s, user));
}

/**
 * Lọc danh sách kế hoạch tháng (InputPlanBreakdownState) theo quyền của người dùng.
 */
export function filterScopedPlans(
  plans: InputPlanBreakdownState[],
  user: UserProfile | null | undefined,
  stores?: StorePortfolioItem[]
): InputPlanBreakdownState[] {
  if (!user) return [];
  if (isStaffGlobalAdminOrManager(user)) {
    return plans;
  }
  return plans.filter(p => isPlanManagedByUser(p, user, stores));
}

/**
 * Lọc danh sách Booking Deal theo quyền của người dùng.
 */
export function filterScopedDeals(
  deals: BookingDealItem[],
  user: UserProfile | null | undefined,
  stores?: StorePortfolioItem[]
): BookingDealItem[] {
  if (!user) return [];
  if (isStaffGlobalAdminOrManager(user)) {
    return deals;
  }
  return deals.filter(d => isDealManagedByUser(d, user, stores));
}

export interface UserScopeSummary {
  isGlobal: boolean;
  managedBrandNames: string[];
  managedStoreCount: number;
  totalStoreCount: number;
  totalBrandCount: number;
  scopeBadgeText: string;
  scopeTooltip: string;
}

/**
 * Tóm tắt phạm vi phân quyền của người dùng hiện tại để hiển thị trên giao diện TopHeader / Banner.
 */
export function getUserScopeSummary(
  user: UserProfile | null | undefined,
  allBrands: BrandDetail[],
  allStores: StorePortfolioItem[]
): UserScopeSummary {
  const isGlobal = isStaffGlobalAdminOrManager(user);
  if (!user) return { isGlobal: false, managedBrandNames: [], managedStoreCount: 0, totalStoreCount: 0, totalBrandCount: 0, scopeBadgeText: 'Chưa có quyền truy cập', scopeTooltip: 'Chưa xác định danh tính.' };
  if (isGlobal) {
    return {
      isGlobal: true,
      managedBrandNames: allBrands.map(b => b.name),
      managedStoreCount: allStores.length,
      totalStoreCount: allStores.length,
      totalBrandCount: allBrands.length,
      scopeBadgeText: `Toàn quyền (${allBrands.length} thương hiệu / ${allStores.length} gian hàng)`,
      scopeTooltip: 'Tài khoản có thẩm quyền quản trị toàn bộ hệ thống B2C & Growth'
    };
  }

  const scopedStores = filterScopedStores(allStores, user);
  const scopedBrands = filterScopedBrands(allBrands, user, allStores);
  const brandNames = scopedBrands.map(b => b.name);

  const displayBrandText = brandNames.length > 3 
    ? `${brandNames.slice(0, 3).join(', ')} (+${brandNames.length - 3})` 
    : brandNames.join(', ') || 'Chưa gán nhãn';

  return {
    isGlobal: false,
    managedBrandNames: brandNames,
    managedStoreCount: scopedStores.length,
    totalStoreCount: allStores.length,
    totalBrandCount: allBrands.length,
    scopeBadgeText: `Phụ trách: ${scopedBrands.length} nhãn (${scopedStores.length} gian hàng)`,
    scopeTooltip: `Nhãn phụ trách: ${displayBrandText}. Chỉ hiển thị các gian hàng và số liệu thuộc phạm vi được giao.`
  };
}
