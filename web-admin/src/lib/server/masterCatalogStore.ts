import { DEFAULT_MASTER_CATALOG, type MasterCatalog } from '../masterCatalog';
import { readRecord, RecordError } from './sharedRecords';
import { listProfiles } from '../brands/store';
import prisma from '../prisma';
import { INITIAL_MONTHLY_PLANS } from '../monthlyPlanData';
import { INITIAL_DEALS } from '../mockData';
import { brandKey } from '../brands/types';
import { readPolicy } from './accessPolicy';
import { normalizeAssignments, type AssignmentIssue } from '../assignmentNormalize';
import { staffIndex } from './staffDirectory';

let normalizedCache: { revision: number; source: MasterCatalog; data: MasterCatalog; issues: AssignmentIssue[] } | null = null;

/** Dữ liệu gốc đã quy người phụ trách về mã nhân sự và đưa PIC Plan / KV lên cấp nhãn. */
export async function readMasterCatalogWithIssues() {
  const record = await readRecord('master-catalog', DEFAULT_MASTER_CATALOG, { clone: false });
  if (normalizedCache && normalizedCache.revision === record.revision && normalizedCache.source === record.data) {
    return { ...record, data: normalizedCache.data, issues: normalizedCache.issues };
  }
  const { catalog, issues } = normalizeAssignments(record.data, await staffIndex());
  normalizedCache = { revision: record.revision, source: record.data, data: catalog, issues };
  return { ...record, data: catalog, issues };
}

export async function readMasterCatalog() {
  const { issues: _issues, ...record } = await readMasterCatalogWithIssues();
  return record;
}

export async function validateCatalog(next: MasterCatalog, previous: MasterCatalog) {
  if (!next || typeof next !== 'object') throw new RecordError('Thiếu danh mục cần lưu.');
  for (const key of Object.keys(DEFAULT_MASTER_CATALOG) as Array<keyof MasterCatalog>) {
    if (!Array.isArray(next[key]) || next[key].length > 10000) throw new RecordError(`Danh mục ${key} không hợp lệ.`);
    const ids = new Set<string>();
    for (const item of next[key]) { if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new RecordError(`Mã định danh trống hoặc trùng trong ${key}.`); ids.add(item.id); }
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
  for (const key of ['pillars', 'castTiers', 'niches', 'formats'] as const) {
    const seen = new Set<string>();
    for (const item of next[key]) {
      const row = item as unknown as Record<string, unknown>;
      const code = String(row.code || row.tierCode || row.nicheName || row.name || '').trim().toLowerCase();
      if (!code || seen.has(code)) throw new RecordError(`Tên/mã trống hoặc trùng trong ${key}.`);
      seen.add(code);
    }
  }
  const changed = previous.brands.filter(b => !next.brands.some(n => n.id === b.id && n.name === b.name));
  const changedStores = previous.stores.filter(s => !next.stores.some(n => n.id === s.id && n.storeName === s.storeName && n.brandName === s.brandName));
  const removedProducts = previous.products.filter(p => !next.products.some(n => n.id === p.id && n.sku === p.sku));
  if (changed.length || changedStores.length || removedProducts.length) {
    const profiles = await listProfiles();
    const { data: policy } = await readPolicy();
    // If PostgreSQL is configured, inability to inspect dependencies must block deletion.
    const plans = process.env.DATABASE_URL ? await prisma.monthlyPlan.findMany({ where: { deletedAt: null }, select: { data: true } }) : [];
    for (const b of changed) {
      const needle = brandKey(b.name);
      const matches = (name?: string) => !!name && brandKey(name) === needle;
      if (policy.internalStaff.some(s => s.picBrands.some(matches)) || previous.stores.some(s => matches(s.brandName)) || previous.products.some(p => matches(p.brandName)) || profiles.some(p => matches(p.brandName)) || INITIAL_DEALS.some(d => matches(d.brandName)) || INITIAL_MONTHLY_PLANS.some(p => matches(p.brandName) || matches(p.parentBrand)) || plans.some(p => JSON.stringify(p.data).includes(b.name))) {
        throw new RecordError(`Không đổi tên/xóa ${b.name}: còn hồ sơ, gian hàng, sản phẩm hoặc kế hoạch liên kết. Hãy tạm dừng thương hiệu.`, 409);
      }
    }
    for (const store of changedStores) {
      if (INITIAL_MONTHLY_PLANS.some(p => p.storeId === store.id || p.storeName === store.storeName) || INITIAL_DEALS.some(d => d.storeName === store.storeName) || plans.some(p => JSON.stringify(p.data).includes(store.id) || JSON.stringify(p.data).includes(store.storeName)) || previous.products.some(p => p.storeName === store.storeName)) throw new RecordError(`Không đổi tên, chuyển brand hoặc xóa ${store.storeName}: còn dữ liệu liên kết. Hãy tạm dừng gian hàng.`, 409);
    }
    for (const product of removedProducts) {
      if (profiles.some(p => p.products.some(item => item.skuCode === product.sku))) throw new RecordError(`Không đổi SKU hoặc xóa ${product.sku}: đang dùng trong hồ sơ thương hiệu. Hãy chọn Tạm ngừng.`, 409);
    }
  }
}
