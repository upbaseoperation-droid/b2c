'use client';

/**
 * Hộp thoại chỉnh sửa thông số gian hàng — theo chuẩn Design System.
 */

import React, { useState } from 'react';
import {
  type StorePortfolioItem,
  type StoreDifficultyTier,
  STORE_COEFFICIENT_TABLE_2,
  getStoreCoefficientByTier,
  normalizeStoreCoefficient,
  getStoreTierByCoefficient,
  formatStoreCoefficient,
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
  onSave
}: StoreEditDialogProps) {
  const normalizedCoef = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
  const initialTier = normalizedCoef.tier;

  const [storeName, setStoreName] = useState(store.storeName);
  const [storeOperationId, setStoreOperationId] = useState(store.storeOperationId || store.id);
  const [servicePackage, setServicePackage] = useState(store.servicePackage || 'E2E-S');
  const [platformStoreId, setPlatformStoreId] = useState(store.platformStoreId || '');
  const [affiliateRate, setAffiliateRate] = useState(store.affiliateRate || 15);
  const [difficultyTier, setDifficultyTier] = useState<StoreDifficultyTier>(initialTier);
  const [requiresSparkAds, setRequiresSparkAds] = useState(store.requiresSparkAds || false);
  const [monthlyBudget, setMonthlyBudget] = useState(store.budgetNet ?? store.monthlyBudget ?? 0);
  const [monthlyTargetGmv, setMonthlyTargetGmv] = useState(store.monthlyTargetGmv ?? 0);
  const [targetAffiliateContents, setTargetAffiliateContents] = useState(store.targetAffiliateContents ?? 0);
  const [targetSelfChannelContents, setTargetSelfChannelContents] = useState(store.targetSelfChannelContents ?? 0);
  const [targetFocVideos, setTargetFocVideos] = useState(store.targetFocVideos ?? 0);
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
      monthlyBudget: Number(monthlyBudget) || 0,
      budgetNet: Number(monthlyBudget) || 0,
      monthlyTargetGmv: Number(monthlyTargetGmv) || 0,
      targetAffiliateContents: Number(targetAffiliateContents) || 0,
      targetSelfChannelContents: Number(targetSelfChannelContents) || 0,
      targetFocVideos: Number(targetFocVideos) || 0,
      storeUrl: storeUrl.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    onSave(updated);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cập nhật thông số gian hàng [${store.storeName}]`}
      description="Cấu hình hạn mức kế hoạch, hệ số gian hàng (Bảng 2), gói dịch vụ và thông số sàn"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit}>Lưu thông tin</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tên gian hàng vận hành *">
            <Input
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </Field>

          <Field label="Mã vận hành Upbase (SO ID) *">
            <Input
              required
              className="font-code"
              value={storeOperationId}
              onChange={(e) => setStoreOperationId(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Gói dịch vụ">
            <Input
              value={servicePackage}
              onChange={(e) => setServicePackage(e.target.value)}
            />
          </Field>

          <Field label="Shop ID kỹ thuật sàn">
            <Input
              className="font-code"
              placeholder="VD: TTS_VN_839219"
              value={platformStoreId}
              onChange={(e) => setPlatformStoreId(e.target.value)}
            />
          </Field>

          <Field label="Hoa hồng Affiliate (%)">
            <Input
              type="number"
              min={0}
              max={100}
              className="font-code"
              value={affiliateRate}
              onChange={(e) => setAffiliateRate(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field
          label="Hệ số gian hàng — Bảng 2 (HS phạm vi cho việc cấp Sàn và cấp Brand)"
          hint="Áp dụng theo store, không theo brand. Một store chỉ áp dụng một hệ số trong cùng kỳ."
        >
          <Select
            value={difficultyTier}
            onChange={(e) => setDifficultyTier(e.target.value as StoreDifficultyTier)}
          >
            {STORE_COEFFICIENT_TABLE_2.rows.map((rule) => (
              <option key={rule.tier} value={rule.tier}>
                {rule.tier} — Hệ số {rule.multiplierLabel} ({rule.definition})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Link gian hàng sàn (URL)">
          <Input
            type="url"
            placeholder="https://..."
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
          />
        </Field>

        <div className="pt-2 border-t border-line space-y-3">
          <span className="text-[13px] font-semibold text-ink block">
            Hạn mức Kế hoạch Tháng (File 4.1 Plan Order)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hạn mức Net kế toán duyệt (VNĐ)">
              <Input
                type="number"
                min={0}
                step={1000000}
                className="font-code"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              />
            </Field>

            <Field label="Mục tiêu doanh số NMV (VNĐ)">
              <Input
                type="number"
                min={0}
                step={1000000}
                className="font-code"
                value={monthlyTargetGmv}
                onChange={(e) => setMonthlyTargetGmv(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Target video Affiliate">
              <Input
                type="number"
                min={0}
                className="font-code"
                value={targetAffiliateContents}
                onChange={(e) => setTargetAffiliateContents(Number(e.target.value))}
              />
            </Field>

            <Field label="Target video kênh Brand">
              <Input
                type="number"
                min={0}
                className="font-code"
                value={targetSelfChannelContents}
                onChange={(e) => setTargetSelfChannelContents(Number(e.target.value))}
              />
            </Field>

            <Field label="Target suất mẫu FOC">
              <Input
                type="number"
                min={0}
                className="font-code"
                value={targetFocVideos}
                onChange={(e) => setTargetFocVideos(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="pt-2 border-t border-line">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresSparkAds}
              onChange={(e) => setRequiresSparkAds(e.target.checked)}
              className="rounded border-line-strong text-primary focus:ring-focus"
            />
            <span className="text-[13px] text-ink font-medium">Bắt buộc ủy quyền mã Spark Ads</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
