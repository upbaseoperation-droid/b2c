import { DEFAULT_MASTER_CATALOG, type MasterCatalog } from '../masterCatalog';
import { readRecord, RecordError } from './sharedRecords';
import { listProfiles } from '../brands/store';
import prisma from '../prisma';
import { INITIAL_MONTHLY_PLANS } from '../monthlyPlanData';
import { INITIAL_DEALS } from '../mockData';
import { brandKey } from '../brands/types';
export const readMasterCatalog = () => readRecord('master-catalog', DEFAULT_MASTER_CATALOG);

export async function validateCatalog(next: MasterCatalog, previous: MasterCatalog) {
  for (const key of Object.keys(DEFAULT_MASTER_CATALOG) as Array<keyof MasterCatalog>) {
    if (!Array.isArray(next[key]) || next[key].length > 10000) throw new RecordError(`Danh mục ${key} không hợp lệ.`);
    const ids = new Set<string>();
    for (const item of next[key]) { if (!item.id || ids.has(item.id)) throw new RecordError(`Mã định danh trùng trong ${key}.`); ids.add(item.id); }
  }
  const names = new Set<string>(); const codes = new Set<string>();
  for (const brand of next.brands) {
    const name = brandKey(brand.name || ''); const code = (brand.code || '').trim().toUpperCase();
    if (!name || names.has(name)) throw new RecordError('Tên thương hiệu rỗng hoặc trùng.');
    if (code && codes.has(code)) throw new RecordError('Mã thương hiệu bị trùng.');
    names.add(name); if (code) codes.add(code);
  }
  const skus = new Set<string>();
  for (const p of next.products) {
    const sku = (p.sku || '').trim().toUpperCase();
    if (!sku || skus.has(sku)) throw new RecordError('SKU rỗng hoặc trùng.');
    skus.add(sku);
    for (const [key, value, max] of [['Giá', p.originalPrice, Infinity], ['Hoa hồng', p.commissionRate ?? 0, 100], ['Tồn kho', p.sampleAvailableCount ?? 0, Infinity]] as const) {
      if (!Number.isFinite(value) || value < 0 || value > max) throw new RecordError(`${key} của ${sku} không hợp lệ.`);
    }
    if (!names.has(brandKey(p.brandName))) throw new RecordError(`Sản phẩm ${sku} phải liên kết thương hiệu tồn tại.`);
  }
  for (const p of next.pillars) if (!Number.isFinite(p.benchmarkUnitCost) || p.benchmarkUnitCost < 0) throw new RecordError('Chi phí pillar không hợp lệ.');
  const changed = previous.brands.filter(b => !next.brands.some(n => n.id === b.id && n.name === b.name));
  if (changed.length) {
    const profiles = await listProfiles();
    // If PostgreSQL is configured, inability to inspect dependencies must block deletion.
    const plans = process.env.DATABASE_URL ? await prisma.monthlyPlan.findMany({ where: { deletedAt: null }, select: { data: true } }) : [];
    for (const b of changed) {
      const needle = brandKey(b.name);
      const matches = (name?: string) => !!name && brandKey(name) === needle;
      if (previous.stores.some(s => matches(s.brandName)) || previous.products.some(p => matches(p.brandName)) || profiles.some(p => matches(p.brandName)) || INITIAL_DEALS.some(d => matches(d.brandName)) || INITIAL_MONTHLY_PLANS.some(p => matches(p.brandName) || matches(p.parentBrand)) || plans.some(p => JSON.stringify(p.data).includes(b.name))) {
        throw new RecordError(`Không đổi tên/xóa ${b.name}: còn hồ sơ, gian hàng, sản phẩm hoặc kế hoạch liên kết. Hãy tạm dừng thương hiệu.`, 409);
      }
    }
  }
}
