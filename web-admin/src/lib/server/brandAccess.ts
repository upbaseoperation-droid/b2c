import type { UserProfile, BrandDetail } from '../types';
import type { BrandProfile } from '../brands/types';
import { isBrandManagedByUser } from '../rbacScope';
import { permissionsFor, isBrandPartnerForBrand, requireBrand } from '../brands/domain';
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
export function readableProfile(profile: BrandProfile, user: UserProfile, master?: BrandDetail): BrandProfile {
  const rights = permissionsFor(user, master?.accountPic, profile.brandName);
  return {
    ...profile,
    ratecard: rights.RATECARD ? profile.ratecard : [],
    legal: rights.LEGAL ? profile.legal : [],
    history: profile.history.filter(h => (h.section !== 'RATECARD' || rights.RATECARD) && (h.section !== 'LEGAL' || rights.LEGAL)),
  };
}
