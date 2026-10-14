import { UserProfile, BrandDetail, StorePortfolioItem, InputPlanBreakdownState, BookingDealItem } from './types';

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
  if (user.permissions?.includes('ALL_PERMISSIONS') || user.permissions?.includes('canViewAllBrands')) {
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

/**
 * Trích xuất danh sách tên nhãn hàng được phân công tường minh cho người dùng.
 */
export function getUserAssignedBrandNames(user: UserProfile | null | undefined): string[] {
  if (!user) return [];
  const set = new Set<string>();

  if (Array.isArray(user.assignedBrands)) {
    for (const b of user.assignedBrands) {
      const norm = b.trim();
      if (norm && !['ALL_BRANDS', 'Tất cả nhãn hàng', 'TẤT CẢ NHÃN HÀNG', 'ALL', '*'].includes(norm)) {
        set.add(norm);
      }
    }
  }

  if (user.linkedEntityName) {
    const parts = user.linkedEntityName.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!['ALL_BRANDS', 'Tất cả nhãn hàng'].includes(p)) {
        set.add(p);
      }
    }
  }

  return Array.from(set);
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
  if (isStaffGlobalAdminOrManager(user)) return true;

  const brandName = typeof brand === 'string' ? brand.trim() : brand.name.trim();
  if (!brandName) return false;

  const bNameLower = brandName.toLowerCase();
  const userNameLower = (user.name || '').trim().toLowerCase();

  // 1. Khớp với danh sách nhãn hàng được gán trực tiếp cho nhân viên
  const assigned = getUserAssignedBrandNames(user);
  if (assigned.some(a => {
    const aLower = a.toLowerCase();
    return aLower === bNameLower || bNameLower.includes(aLower) || aLower.includes(bNameLower);
  })) {
    return true;
  }

  // 2. Nếu là đối tượng BrandDetail, kiểm tra các chức danh PIC gắn trực tiếp trên Brand
  if (typeof brand !== 'string') {
    const picFields = [
      brand.brandPicName,
      brand.accountPic,
      brand.growthPic,
      brand.bookingPicLead,
      brand.contentBrandMainPic,
      brand.planStrategyPic,
      brand.keyVisualSisPic,
    ];
    if (picFields.some(pic => pic && pic.trim().toLowerCase().includes(userNameLower))) {
      return true;
    }

    if (Array.isArray(brand.stores) && brand.stores.length > 0) {
      if (user.allowedStoreNames && user.allowedStoreNames.some(s => 
        brand.stores.some(bs => bs.storeName.toLowerCase() === s.toLowerCase() || bs.storeId?.toLowerCase() === s.toLowerCase())
      )) {
        return true;
      }
    }
  }

  // 3. Nếu danh sách gian hàng (stores) được cung cấp, kiểm tra xem nhân viên có phụ trách gian hàng nào của nhãn này không
  if (allStores && allStores.length > 0) {
    const hasManagedStore = allStores.some(s => {
      const sBrand = (s.brandName || s.storeName.split('_')[0] || '').trim().toLowerCase();
      if (sBrand !== bNameLower && !sBrand.includes(bNameLower) && !bNameLower.includes(sBrand)) {
        return false;
      }
      return isStoreManagedByUser(s, user, false); // Tránh đệ quy vô hạn
    });
    if (hasManagedStore) return true;
  }

  return false;
}

/**
 * Kiểm tra xem một gian hàng cụ thể có thuộc quyền quản lý của người dùng hay không.
 */
export function isStoreManagedByUser(
  store: StorePortfolioItem,
  user: UserProfile | null | undefined,
  checkBrandAssigned: boolean = true
): boolean {
  if (!user) return false;
  if (isStaffGlobalAdminOrManager(user)) return true;

  const uName = (user.name || '').trim().toLowerCase();
  if (!uName) return false;

  // 1. Khớp theo phân quyền tài khoản đối tác ngoài hoặc gian hàng được chỉ định cứng
  if (user.allowedStoreNames && user.allowedStoreNames.length > 0) {
    const matchExplicit = user.allowedStoreNames.some(s => {
      const norm = s.trim().toLowerCase();
      return norm === store.storeName.toLowerCase() || norm === store.id.toLowerCase() || (store.storeOperationId && norm === store.storeOperationId.toLowerCase());
    });
    if (matchExplicit) return true;
  }

  // 2. Khớp trực tiếp nhân sự phụ trách tại gian hàng (PIC Growth, B2C, Account, Leader...)
  const storePics = [
    store.b2cOwnerName,
    store.primaryPic,
    store.assignedStaff,
    store.growthPic,
    store.accountOwnerName,
    store.bookingLeader,
    store.contentPic,
    store.mediaPic,
    store.backupOwnerName,
    ...(store.b2cOwners || [])
  ];

  if (storePics.some(pic => pic && pic.trim().toLowerCase().includes(uName))) {
    return true;
  }

  // 3. Kiểm tra nhãn hàng của gian hàng có thuộc danh sách nhãn nhân sự được phân công hay không
  if (checkBrandAssigned) {
    const storeBrand = store.brandName || store.storeName.split('_')[0] || '';
    if (storeBrand && isBrandManagedByUser(storeBrand, user)) {
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
  if (isStaffGlobalAdminOrManager(user)) return true;

  const uName = (user.name || '').trim().toLowerCase();

  // 1. Trực tiếp là PIC phụ trách lập/giao/thẩm định kế hoạch
  const planPics = [
    plan.pic,
    plan.growthPic,
    plan.mediaPic,
    plan.submittedBy
  ];
  if (planPics.some(pic => pic && pic.trim().toLowerCase().includes(uName))) {
    return true;
  }

  // 2. Khớp theo gian hàng gắn với kế hoạch
  if (allStores && plan.storeName) {
    const matchedStore = allStores.find(s => 
      (plan.storeId && s.id === plan.storeId) || 
      s.storeName.toLowerCase() === plan.storeName?.toLowerCase()
    );
    if (matchedStore && isStoreManagedByUser(matchedStore, user)) {
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
  if (isStaffGlobalAdminOrManager(user)) return true;

  const uName = (user.name || '').trim().toLowerCase();

  // 1. Trực tiếp là PIC của deal
  const dealPics = [
    deal.assignedStaff,
    deal.bookingPic,
    deal.growthPic,
    deal.accountPic,
    deal.leadBooking
  ];
  if (dealPics.some(pic => pic && pic.trim().toLowerCase().includes(uName))) {
    return true;
  }

  // 2. Khớp theo nhãn hàng của deal
  if (deal.brandName && isBrandManagedByUser(deal.brandName, user, allStores)) {
    return true;
  }

  // 3. Khớp theo gian hàng của deal
  if (deal.storeName && allStores) {
    const matchedStore = allStores.find(s => s.storeName.toLowerCase() === deal.storeName?.toLowerCase());
    if (matchedStore && isStoreManagedByUser(matchedStore, user)) {
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
  if (!user || isStaffGlobalAdminOrManager(user)) {
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
  if (!user || isStaffGlobalAdminOrManager(user)) {
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
  if (!user || isStaffGlobalAdminOrManager(user)) {
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
  if (!user || isStaffGlobalAdminOrManager(user)) {
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
  if (!user || isGlobal) {
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
