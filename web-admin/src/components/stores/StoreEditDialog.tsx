'use client';

/**
 * Hộp thoại chỉnh sửa thông số định danh gian hàng — theo chuẩn Design System.
 */

import React, { useState } from 'react';
import {
  type StorePortfolioItem,
  type StoreDifficultyTier,
  STORE_COEFFICIENT_TABLE_2,
  getStoreCoefficientByTier,
  normalizeStoreCoefficient,
} from '../../lib/types';
import { Button, Field, Input, Modal, Select } from '../ui';

export interface StoreEditDialogProps {
  open: boolean;
  onClose: () => void;
  store: StorePortfolioItem;
  onSave: (updated: StorePortfolioItem) => void;
  onOpenMonthlyPlan?: (store: StorePortfolioItem) => void;
}

export function StoreEditDialog({
  open,
  onClose,
  store,
  onSave,
}: StoreEditDialogProps) {
  const normalizedCoef = normalizeStoreCoefficient(
    store.difficultyTier,
    store.difficultyMultiplier
  );
  const initialTier = normalizedCoef.tier;

  const [storeName, setStoreName] = useState(store.storeName);
  const [storeOperationId, setStoreOperationId] = useState(store.storeOperationId || store.id);
  const [servicePackage, setServicePackage] = useState(store.servicePackage || 'E2E-S');
  const [platformStoreId, setPlatformStoreId] = useState(store.platformStoreId || '');
  const [affiliateRate, setAffiliateRate] = useState(store.affiliateRate || 15);
  const [difficultyTier, setDifficultyTier] = useState<StoreDifficultyTier>(initialTier);
  const [requiresSparkAds, setRequiresSparkAds] = useState(store.requiresSparkAds || false);
  const [storeUrl, setStoreUrl] = useState(store.storeUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    const updatedMultiplier = getStoreCoefficientByTier(difficultyTier);

    const updated: StorePortfolioItem = {
      ...store,
      storeName: storeName.trim(),
      storeOperationId: storeOperationId.trim(),
      servicePackage,
      platformStoreId: platformStoreId.trim() || undefined,
      affiliateRate: Number(affiliateRate) || 15,
      difficultyTier,
      difficultyMultiplier: updatedMultiplier,
      requiresSparkAds,
      storeUrl: storeUrl.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cập nhật thông số gian hàng — ${store.storeName}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Lưu thông tin
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tên gian hàng vận hành *">
            <Input
              required
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
            />
          </Field>

          <Field label="Mã vận hành Upbase (SO ID) *">
            <Input
              required
              className="font-code"
              value={storeOperationId}
              onChange={e => setStoreOperationId(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Gói dịch vụ">
            <Input
              value={servicePackage}
              onChange={e => setServicePackage(e.target.value)}
            />
          </Field>

          <Field label="Shop ID kỹ thuật sàn">
            <Input
              className="font-code"
              placeholder="VD: TTS_VN_839219"
              value={platformStoreId}
              onChange={e => setPlatformStoreId(e.target.value)}
            />
          </Field>

          <Field label="Hoa hồng Affiliate (%)">
            <Input
              type="number"
              min={0}
              max={100}
              className="font-code"
              value={affiliateRate}
              onChange={e => setAffiliateRate(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Hệ số gian hàng">
          <Select
            value={difficultyTier}
            onChange={e => setDifficultyTier(e.target.value as StoreDifficultyTier)}
          >
            {STORE_COEFFICIENT_TABLE_2.rows.map(rule => (
              <option key={rule.tier} value={rule.tier}>
                {rule.tier} — Hệ số ×{rule.multiplierLabel}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Link gian hàng sàn (URL)">
          <Input
            type="url"
            placeholder="https://..."
            value={storeUrl}
            onChange={e => setStoreUrl(e.target.value)}
          />
        </Field>

        <div className="pt-2 border-t border-line">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresSparkAds}
              onChange={e => setRequiresSparkAds(e.target.checked)}
              className="rounded border-line-strong text-primary focus:ring-focus"
            />
            <span className="text-[13px] text-ink font-medium">
              Bắt buộc ủy quyền mã Spark Ads
            </span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
