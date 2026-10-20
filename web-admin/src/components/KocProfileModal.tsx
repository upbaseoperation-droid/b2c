'use client';

import React from 'react';
import type { BookingDealItem, KocItem, UserProfile } from '../lib/types';
import { Modal } from './ui';
import { KocProfile } from './koc/KocProfile';
import type { DuplicateMatch } from './koc/kocUtils';

interface KocProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  koc: KocItem | null;
  onOpenQuickBook?: (koc: KocItem) => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
  selectedBrand?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  duplicates?: DuplicateMatch[];
}

/** Xem nhanh hồ sơ KOC từ màn khác (Booking). Cùng nội dung với trang chi tiết trong Danh bạ KOC. */
export const KocProfileModal: React.FC<KocProfileModalProps> = ({
  isOpen,
  onClose,
  koc,
  onOpenQuickBook,
  onUpdateKoc,
  selectedBrand,
  onNotify,
  deals,
  currentUser,
  duplicates,
}) => {
  if (!isOpen || !koc) return null;
  return (
    <Modal open={isOpen} onClose={onClose} title={koc.stageName} size="xl">
      <KocProfile
        koc={koc}
        layout="modal"
        deals={deals}
        currentUser={currentUser}
        duplicates={duplicates}
        selectedBrand={selectedBrand}
        onUpdateKoc={onUpdateKoc}
        onNotify={onNotify}
        onCreateBooking={
          onOpenQuickBook
            ? (k) => {
                onClose();
                onOpenQuickBook(k);
              }
            : undefined
        }
      />
    </Modal>
  );
};
