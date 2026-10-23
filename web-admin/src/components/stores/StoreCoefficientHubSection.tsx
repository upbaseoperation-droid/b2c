'use client';

import React, { useState, useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import {
  StorePortfolioItem,
  BrandDetail,
  InputPlanBreakdownState,
  UserProfile,
  StoreDifficultyTier,
  STORE_COEFFICIENT_TABLE_2,
  normalizeStoreCoefficient,
  getStoreCoefficientByTier,
} from '../../lib/types';
import {
  Button,
  ChannelTag,
  FilterBar,
  Chips,
  Select,
  Panel,
  BrandAvatar,
  Person,
} from '../ui';

export interface StoreCoefficientHubSectionProps {
  stores: StorePortfolioItem[];
  brands?: BrandDetail[];
  plans?: InputPlanBreakdownState[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  currentUser?: UserProfile | null;
  onUpdateStore?: (updated: StorePortfolioItem) => void;
  onBulkUpdateStores?: (updatedStores: StorePortfolioItem[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  compactReferenceTable?: boolean;
}

const TIER_STYLES: Record<
  StoreDifficultyTier,
  {
    activeBtn: string;
    cardActive: string;
    badgeBg: string;
  }
> = {
  'Cơ bản': {
    activeBtn: 'bg-surface-2 text-ink border-ink font-semibold shadow-2xs',
    cardActive: 'border-ink bg-surface-2/60 ring-1 ring-ink',
    badgeBg: 'bg-surface-2 text-ink-2 border-line',
  },
  'Tiêu chuẩn': {
    activeBtn: 'bg-brand text-white border-brand font-semibold shadow-2xs',
    cardActive: 'border-brand bg-brand/5 ring-1 ring-brand',
    badgeBg: 'bg-brand/10 text-brand border-brand/30',
  },
  'Vừa': {
    activeBtn: 'bg-warning text-white border-warning font-semibold shadow-2xs',
    cardActive: 'border-warning bg-warning-soft/50 ring-1 ring-warning',
    badgeBg: 'bg-warning-soft text-warning border-warning/30',
  },
  'Khó': {
    activeBtn: 'bg-danger text-white border-danger font-semibold shadow-2xs',
    cardActive: 'border-danger bg-danger-soft/50 ring-1 ring-danger',
    badgeBg: 'bg-danger-soft text-danger border-danger/30',
  },
};

function matchesPlatformFilter(storePlatform: string, filterKey: string): boolean {
  if (filterKey === 'ALL') return true;
  const p = (storePlatform || '').toLowerCase();
  if (filterKey === 'Shopee') return p.includes('shopee');
  if (filterKey === 'TikTok Shop') return p.includes('tiktok');
  if (filterKey === 'Lazada') return p.includes('lazada');
  return storePlatform === filterKey;
}

function getStorePrimaryPic(store: StorePortfolioItem): string {
  return (
    store.b2cOwnerName ||
    store.primaryPic ||
    (store.b2cOwners && store.b2cOwners[0]) ||
    'Chưa giao'
  );
}

export const StoreCoefficientHubSection: React.FC<StoreCoefficientHubSectionProps> = ({
  stores,
  currentUser,
  onUpdateStore,
  onBulkUpdateStores,
  onNotify,
}) => {
  const isManager =
    !currentUser || ['ADMIN', 'MANAGER', 'GROWTH_MANAGER'].includes(currentUser.role);

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | StoreDifficultyTier>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [picFilter, setPicFilter] = useState<string>('ALL');

  const [localStoreOverrides, setLocalStoreOverrides] = useState<
    Record<string, Partial<StorePortfolioItem>>
  >({});

  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());

  const mergedStores = useMemo(() => {
    if (onUpdateStore || onBulkUpdateStores) return stores;
    return stores.map(store => {
      const override = localStoreOverrides[store.id];
      return override ? { ...store, ...override } : store;
    });
  }, [stores, localStoreOverrides, onUpdateStore, onBulkUpdateStores]);

  const brandNames = useMemo(() => {
    const set = new Set<string>();
    mergedStores.forEach(s => {
      if (s.brandName) set.add(s.brandName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [mergedStores]);

  const picNames = useMemo(() => {
    const set = new Set<string>();
    mergedStores.forEach(s => {
      const pic = getStorePrimaryPic(s);
      if (pic && pic !== 'Chưa giao') set.add(pic);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [mergedStores]);

  const tierCounts = useMemo(() => {
    const counts: Record<StoreDifficultyTier, number> = {
      'Cơ bản': 0,
      'Tiêu chuẩn': 0,
      'Vừa': 0,
      'Khó': 0,
    };
    mergedStores.forEach(s => {
      const norm = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
      counts[norm.tier] = (counts[norm.tier] || 0) + 1;
    });
    return counts;
  }, [mergedStores]);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedStores.filter(store => {
      const norm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
      if (tierFilter !== 'ALL' && norm.tier !== tierFilter) return false;
      if (!matchesPlatformFilter(store.platform, platformFilter)) return false;
      if (brandFilter !== 'ALL' && store.brandName !== brandFilter) return false;
      const pic = getStorePrimaryPic(store);
      if (picFilter !== 'ALL' && pic !== picFilter) return false;

      if (q) {
        const match =
          store.storeName.toLowerCase().includes(q) ||
          store.brandName.toLowerCase().includes(q) ||
          (store.storeOperationId || '').toLowerCase().includes(q) ||
          pic.toLowerCase().includes(q) ||
          (store.bookingLeader || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [mergedStores, searchQuery, tierFilter, platformFilter, brandFilter, picFilter]);

  const platformChips = useMemo(() => {
    const countFor = (plat: string) =>
      mergedStores.filter(s => matchesPlatformFilter(s.platform, plat)).length;
    return [
      { key: 'ALL', label: 'Tất cả sàn', count: countFor('ALL') },
      { key: 'TikTok Shop', label: 'TikTok Shop', count: countFor('TikTok Shop') },
      { key: 'Shopee', label: 'Shopee', count: countFor('Shopee') },
      { key: 'Lazada', label: 'Lazada', count: countFor('Lazada') },
    ];
  }, [mergedStores]);

  const applyTierToStore = (store: StorePortfolioItem, newTier: StoreDifficultyTier) => {
    if (!isManager) {
      onNotify?.('Chỉ Quản lý B2C mới có quyền thay đổi hệ số gian hàng.', 'warning');
      return;
    }
    const newMultiplier = getStoreCoefficientByTier(newTier);
    const updated: StorePortfolioItem = {
      ...store,
      difficultyTier: newTier,
      difficultyMultiplier: newMultiplier,
      updatedAt: new Date().toISOString(),
    };

    setLocalStoreOverrides(prev => ({
      ...prev,
      [store.id]: {
        difficultyTier: newTier,
        difficultyMultiplier: newMultiplier,
      },
    }));

    onUpdateStore?.(updated);
    onNotify?.(
      `Đã cập nhật [${store.storeName}] sang mức ${newTier} (×${newMultiplier
        .toFixed(2)
        .replace('.', ',')}).`,
      'success'
    );
  };

  const handleBulkAssignTier = (targetTier: StoreDifficultyTier) => {
    if (!isManager) {
      onNotify?.('Chỉ Quản lý B2C mới có quyền thay đổi hệ số gian hàng.', 'warning');
      return;
    }
    if (selectedStoreIds.size === 0) return;

    const newMultiplier = getStoreCoefficientByTier(targetTier);
    const targetStores = mergedStores.filter(s => selectedStoreIds.has(s.id));

    const updatedStores: StorePortfolioItem[] = [];
    const nextOverrides: Record<string, Partial<StorePortfolioItem>> = {};

    targetStores.forEach(store => {
      const updated: StorePortfolioItem = {
        ...store,
        difficultyTier: targetTier,
        difficultyMultiplier: newMultiplier,
        updatedAt: new Date().toISOString(),
      };
      updatedStores.push(updated);
      nextOverrides[store.id] = {
        difficultyTier: targetTier,
        difficultyMultiplier: newMultiplier,
      };
    });

    setLocalStoreOverrides(prev => ({ ...prev, ...nextOverrides }));

    if (onBulkUpdateStores) {
      onBulkUpdateStores(updatedStores);
    } else if (onUpdateStore) {
      updatedStores.forEach(u => onUpdateStore(u));
    }

    onNotify?.(
      `Đã gán mức ${targetTier} (×${newMultiplier
        .toFixed(2)
        .replace('.', ',')}) cho ${updatedStores.length} gian hàng.`,
      'success'
    );
    setSelectedStoreIds(new Set());
  };

  const toggleSelectStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const allFilteredSelected =
    filteredStores.length > 0 && filteredStores.every(s => selectedStoreIds.has(s.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedStoreIds(prev => {
        const next = new Set(prev);
        filteredStores.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStoreIds(prev => {
        const next = new Set(prev);
        filteredStores.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 THẺ LỌC NHANH THEO MỨC HỆ SỐ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STORE_COEFFICIENT_TABLE_2.rows.map(rule => {
          const isSelected = tierFilter === rule.tier;
          const count = tierCounts[rule.tier] || 0;
          const style = TIER_STYLES[rule.tier];

          return (
            <button
              key={rule.tier}
              type="button"
              onClick={() => setTierFilter(isSelected ? 'ALL' : rule.tier)}
              className={`text-left rounded-xl border px-4 py-3 transition cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? style.cardActive
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{rule.tier}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${style.badgeBg}`}
                >
                  ×{rule.multiplierLabel}
                </span>
              </div>
              <span className="text-xs font-semibold text-ink-2 tabular-nums">
                {count} gian hàng
              </span>
            </button>
          );
        })}
      </div>

      {/* DANH SÁCH GIAN HÀNG & SETUP HỆ SỐ */}
      <Panel flush>
        <div className="p-4 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm tên gian hàng, thương hiệu, mã SO, chuyên viên PIC...',
              }}
              chips={
                <Chips
                  items={platformChips}
                  value={platformFilter}
                  onChange={setPlatformFilter}
                />
              }
              resultCount={
                searchQuery.trim() ||
                tierFilter !== 'ALL' ||
                brandFilter !== 'ALL' ||
                picFilter !== 'ALL'
                  ? filteredStores.length
                  : undefined
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {tierFilter !== 'ALL' && (
              <Button size="sm" variant="ghost" onClick={() => setTierFilter('ALL')}>
                Bỏ lọc mức {tierFilter}
              </Button>
            )}
            <Select
              value={picFilter}
              onChange={e => setPicFilter(e.target.value)}
              className="w-44 h-8 text-xs"
            >
              <option value="ALL">Tất cả PIC ({picNames.length})</option>
              {picNames.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="w-44 h-8 text-xs"
            >
              <option value="ALL">Tất cả thương hiệu ({brandNames.length})</option>
              {brandNames.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* THANH GÁN HÀNG LOẠT — CHỈ HIỆN KHI ĐÃ TÍCH CHỌN GIAN HÀNG */}
        {selectedStoreIds.size > 0 && (
          <div className="px-4 py-2.5 bg-brand/5 border-b border-brand/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <span>Đã chọn {selectedStoreIds.size} gian hàng</span>
              <button
                type="button"
                onClick={() => setSelectedStoreIds(new Set())}
                className="text-ink-3 hover:text-ink underline cursor-pointer font-normal"
              >
                Bỏ chọn
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-2 mr-1">Gán nhanh hệ số:</span>
              {STORE_COEFFICIENT_TABLE_2.rows.map(rule => (
                <Button
                  key={rule.tier}
                  size="sm"
                  variant="secondary"
                  disabled={!isManager}
                  onClick={() => handleBulkAssignTier(rule.tier)}
                >
                  {rule.tier} (×{rule.multiplierLabel})
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/60 border-b border-line text-2xs font-semibold uppercase tracking-wider text-ink-3">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="inline-flex items-center justify-center text-ink-3 hover:text-ink cursor-pointer"
                    title="Chọn tất cả gian hàng đang hiển thị"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Gian hàng &amp; Sàn</th>
                <th className="py-2.5 px-3">Thương hiệu</th>
                <th className="py-2.5 px-3">Nhân sự phụ trách (PIC)</th>
                <th className="py-2.5 px-3 text-right">Hệ số gian hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-3">
                    Không tìm thấy gian hàng phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStores.map(store => {
                  const norm = normalizeStoreCoefficient(
                    store.difficultyTier,
                    store.difficultyMultiplier
                  );
                  const isChecked = selectedStoreIds.has(store.id);
                  const pic = getStorePrimaryPic(store);

                  return (
                    <tr
                      key={store.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-brand/5' : 'hover:bg-surface-2/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleSelectStore(store.id)}
                          className="inline-flex items-center justify-center text-ink-3 hover:text-ink cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-brand" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. Gian hàng & Sàn */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-ink">{store.storeName}</span>
                          <ChannelTag channel={store.platform} />
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5 font-mono">
                          {store.storeOperationId || store.id} · Gói{' '}
                          {store.servicePackage || 'E2E-S'}
                        </div>
                      </td>

                      {/* 2. Thương hiệu */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <BrandAvatar
                            brandName={store.brandName}
                            brandId={store.brandId}
                            size={20}
                          />
                          <span className="font-medium text-ink-2">{store.brandName}</span>
                        </div>
                      </td>

                      {/* 3. Chuyên viên PIC */}
                      <td className="py-2.5 px-3 align-middle">
                        <Person name={pic} size={18} />
                        {store.hasBookingLeader && store.bookingLeader && (
                          <div className="text-2xs text-ink-3 mt-0.5">
                            TN: {store.bookingLeader}
                          </div>
                        )}
                      </td>

                      {/* 4. Bộ chọn 4 mức Hệ số */}
                      <td className="py-2.5 px-3 align-middle text-right">
                        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-2/70 border border-line">
                          {STORE_COEFFICIENT_TABLE_2.rows.map(rule => {
                            const active = norm.tier === rule.tier;
                            return (
                              <button
                                key={rule.tier}
                                type="button"
                                disabled={!isManager}
                                onClick={() => applyTierToStore(store, rule.tier)}
                                className={`px-2.5 py-1 rounded-md text-xs border transition cursor-pointer ${
                                  active
                                    ? TIER_STYLES[rule.tier].activeBtn
                                    : 'bg-transparent border-transparent text-ink-2 hover:text-ink hover:bg-surface'
                                } ${!isManager ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <span>{rule.tier}</span>{' '}
                                <span className="font-mono text-2xs opacity-90">
                                  {rule.multiplierLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
