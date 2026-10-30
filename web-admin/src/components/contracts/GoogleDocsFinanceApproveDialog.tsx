'use client';

import React, { useState } from 'react';
import { CheckCircle2, CreditCard, FileCheck, Send, ShieldCheck } from 'lucide-react';
import type { ContractRecord } from '../../lib/contracts/types';
import { Button, Field, Input, Modal, Textarea } from '../ui';

export interface GoogleDocsFinanceApproveDialogProps {
  open: boolean;
  record: ContractRecord;
  busy: boolean;
  onClose: () => void;
  onConfirm: (data: { note: string; partyAEmail?: string; partyBEmail?: string }) => Promise<void>;
}

export function GoogleDocsFinanceApproveDialog({
  open,
  record,
  busy,
  onClose,
  onConfirm,
}: GoogleDocsFinanceApproveDialogProps) {
  const [note, setNote] = useState(
    'Kế toán đã kiểm tra và thẩm định toàn bộ các điều khoản tài chính & đối soát thảo luận trên Google Docs. Phê duyệt gửi ký WeSign.',
  );
  const [partyAEmail, setPartyAEmail] = useState('marketing-lead@upbase.vn');
  const [partyBEmail, setPartyBEmail] = useState(record.values['partnerEmail'] || '');

  const routing = record.googleDocsReviewRouting;
  const commentsCount = record.googleDocsComments?.length || 0;
  const financeClauses = routing?.financeClauses || [];
  const legalClauses = routing?.legalClauses || [];

  const handleApprove = async () => {
    await onConfirm({
      note,
      partyAEmail: partyAEmail.trim() || undefined,
      partyBEmail: partyBEmail.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kế toán phê duyệt chốt (FINAL) & Đẩy sang WeSign"
      size="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Tóm tắt hồ sơ và các điều khoản */}
        <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink text-sm truncate">{record.title}</span>
            <span className="text-2xs font-mono text-ink-3">Phiên bản {record.version}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-ink-2 pt-1 border-t border-line">
            <div>
              <span className="text-2xs text-ink-3 block">Đối tác (KOC):</span>
              <span className="font-medium text-ink">{record.partner}</span>
            </div>
            <div>
              <span className="text-2xs text-ink-3 block">Nhãn hàng:</span>
              <span className="font-medium text-ink">{record.brand}</span>
            </div>
          </div>

          <div className="rounded-lg bg-accent-soft/30 border border-line p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-accent font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Thẩm định tài chính Kế toán:</span>
            </div>
            <p className="text-ink-2">
              {financeClauses.length > 0
                ? `Đã rà soát ${financeClauses.length} điều khoản tài chính (${financeClauses.join(', ')}).`
                : 'Các điều khoản tài chính tuân thủ theo hạn mức duyệt.'}
            </p>
            {legalClauses.length > 0 && (
              <p className="text-2xs text-ink-3">
                Các điều khoản pháp lý ({legalClauses.join(', ')}) đã được phân luồng kiểm tra.
              </p>
            )}
          </div>

          {/* Vết kiểm toán comment */}
          <div className="flex items-center gap-2 text-ink-2 pt-1">
            <ShieldCheck className="w-4 h-4 text-positive shrink-0" />
            <span>
              Hệ thống sẽ tự động chốt đóng băng{' '}
              <strong className="text-ink">{commentsCount} bình luận/thảo luận</strong> của các bên vào nhật ký hợp đồng.
            </span>
          </div>
        </div>

        <Field label="Ghi chú phê duyệt của Kế toán" htmlFor="finance-note">
          <Textarea
            id="finance-note"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nhập nhận xét hoặc căn cứ phê duyệt..."
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Email đại diện UpBase ký" htmlFor="partyA-email">
            <Input
              id="partyA-email"
              type="email"
              value={partyAEmail}
              onChange={e => setPartyAEmail(e.target.value)}
              placeholder="marketing-lead@upbase.vn"
            />
          </Field>
          <Field label="Email KOC nhận ký WeSign" htmlFor="partyB-email">
            <Input
              id="partyB-email"
              type="email"
              value={partyBEmail}
              onChange={e => setPartyBEmail(e.target.value)}
              placeholder="koc@example.com"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            variant="primary"
            icon={Send}
            disabled={busy}
            onClick={handleApprove}
          >
            {busy ? 'Đang gửi...' : 'Phê duyệt & Đẩy sang WeSign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
