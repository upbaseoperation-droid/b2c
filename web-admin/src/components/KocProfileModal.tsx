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
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  duplicates?: DuplicateMatch[];
}

/** Xem nhanh hồ sơ KOC từ màn khác (Booking). Cùng nội dung với trang chi tiết trong Danh bạ KOC. */
export const KocProfileModal: React.FC<KocProfileModalProps> = ({ isOpen, onClose, koc, onOpenQuickBook, deals, currentUser, duplicates }) => {
  if (!isOpen || !koc) return null;
  return (
    <Modal open={isOpen} onClose={onClose} title={koc.stageName} size="xl">
      <KocProfile
        koc={koc}
        layout="modal"
        deals={deals}
        currentUser={currentUser}
        duplicates={duplicates}
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
