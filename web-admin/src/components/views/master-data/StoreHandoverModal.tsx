'use client';

/**
 * Modal Bàn giao Chuyên viên PIC Gian hàng (Dùng chung StoreHandoverDialog theo chuẩn Design System).
 */

import React from 'react';
import type { StorePortfolioItem } from '../../../lib/types';
import { StoreHandoverDialog } from '../../stores/StoreHandoverDialog';

export interface StoreHandoverModalProps {
  store: StorePortfolioItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirmHandover: (updatedStore: StorePortfolioItem, logEntry: {
    fromPic: string;
    toPic: string;
    effectiveDate: string;
    reason: string;
  }) => void;
}

export function StoreHandoverModal({
  store,
  isOpen,
  onClose,
  onConfirmHandover,
}: StoreHandoverModalProps) {
  return (
    <StoreHandoverDialog
      open={isOpen}
      onClose={onClose}
      store={store}
      onConfirmHandover={onConfirmHandover}
    />
  );
}
