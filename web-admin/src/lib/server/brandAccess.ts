import type { UserProfile, BrandDetail } from '../types';
import type { BrandPermissions, BrandProfile } from '../brands/types';
import { isBrandManagedByUser } from '../rbacScope';
import { isStorePicOfBrand } from '../storePositions';
import { permissionsFor, viewRightsFor, isBrandPartnerForBrand, requireBrand } from '../brands/domain';
import { readMasterCatalog } from './masterCatalogStore';
import { brandKey } from '../brands/types';

export async function requireBrandScope(user: UserProfile, name: string): Promise<BrandDetail | undefined> {
  const { data } = await readMasterCatalog();
  const master = data.brands.find(b => brandKey(b.name) === brandKey(name));
  const partner = !!user.partnerType || user.role.endsWith('_PARTNER');
  const allowed = partner ? isBrandPartnerForBrand(user, master?.name || name) : isBrandManagedByUser(master || name, user, data.stores);
  requireBrand(allowed, 'Thương hiệu không thuộc phạm vi được giao.', 403);
  return master;
}

/** Quyền sửa của người dùng trên một nhãn, có xét PIC gian hàng theo Dữ liệu gốc. */
export async function brandEditRights(user: UserProfile, master: BrandDetail | undefined, brandName: string): Promise<BrandPermissions> {
  const { data } = await readMasterCatalog();
  const name = master?.name || brandName;
  return permissionsFor(user, master?.accountPic, name, isStorePicOfBrand(user, name, data.stores));
}

export function readableProfile(profile: BrandProfile, user: UserProfile): BrandProfile {
  const rights = viewRightsFor(user, profile.brandName);
  return {
    ...profile,
    ratecard: rights.RATECARD ? profile.ratecard : [],
    legal: rights.LEGAL ? profile.legal : [],
    history: profile.history.filter(h => (h.section !== 'RATECARD' || rights.RATECARD) && (h.section !== 'LEGAL' || rights.LEGAL)),
  };
}
