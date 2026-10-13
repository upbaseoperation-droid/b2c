'use client';

/**
 * Modal xem nhanh Hồ sơ Gian hàng (Dùng chung StoreProfile layout="modal" theo Quy tắc 10 DESIGN_SYSTEM.md).
 */

import React from 'react';
import type { BookingDealItem, BrandDetail, StorePortfolioItem } from '../../../lib/types';
import { Modal } from '../../ui';
import { StoreProfile } from '../../stores/StoreProfile';

export interface StoreDetailModalProps {
  store: StorePortfolioItem | null;
  isOpen: boolean;
  onClose: () => void;
  brand?: BrandDetail;
  deals?: BookingDealItem[];
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreManagement?: (storeName: string) => void;
  onOpenEdit?: (store: StorePortfolioItem) => void;
  onOpenHandover?: (store: StorePortfolioItem) => void;
}

export function StoreDetailModal({
  store,
  isOpen,
  onClose,
  brand,
  deals = [],
  onNavigateToBrandProfile,
  onOpenEdit,
  onOpenHandover,
}: StoreDetailModalProps) {
  if (!isOpen || !store) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      title={`Hồ sơ ${store.storeName}`}
    >
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        <StoreProfile
          store={store}
          brand={brand}
          deals={deals}
          layout="modal"
          onNavigateToBrandProfile={onNavigateToBrandProfile}
          onOpenEdit={onOpenEdit}
          onOpenHandover={onOpenHandover}
        />
      </div>
    </Modal>
  );
}
