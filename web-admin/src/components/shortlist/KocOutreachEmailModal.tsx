'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit2,
  ExternalLink,
  FileText,
  History,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Unlock,
  User,
} from 'lucide-react';
import type { KocItem, StorePortfolioItem, UserRole } from '../../lib/types';
import type { StaffListingSheetRow } from '../../lib/staffBrandListingSheet';
import { normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import { formatVndShort } from '../../lib/format';
import {
  DEFAULT_KOC_EMAIL_TEMPLATES,
  KOC_EMAIL_CATEGORY_LABELS,
  KOC_EMAIL_MERGE_VARIABLES,
  buildGmailComposeUrl,
  buildLarkMailWebUrl,
  buildMailtoUrl,
  buildZaloChatUrl,
  hydrateKocOutreachEmailStateFromServer,
  loadKocOutreachEmailState,
  recommendTemplateForRow,
  renderKocOutreachEmail,
  renderKocOutreachZaloMessage,
  saveKocOutreachEmailState,
  type EmailDeliveryMode,
  type KocEmailOutreachLogItem,
  type KocEmailServerConfig,
  type KocEmailTemplateCategory,
  type KocEmailTemplateItem,
  type KocEmailTemplateStatus,
  type KocOutreachEmailState,
} from '../../lib/kocOutreachEmailService';
import { Button, Field, Input, Modal, Segmented, Select, Status, Tabs, Textarea } from '../ui';

function makeCustomTemplateId(prefix: string): string {
  return `${prefix}-${new Date().getTime()}`;
}

export interface KocOutreachEmailModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'COMPOSE' | 'TEMPLATES' | 'SETTINGS_LOGS';
  targetRows: StaffListingSheetRow[];
  allSheetRows: StaffListingSheetRow[];
  sheetKey: string;
  activeMonth: string;
  activeStoreName: string;
  activeStoreObj?: StorePortfolioItem;
  allStores: StorePortfolioItem[];
  allKocs: KocItem[];
  currentUserName: string;
  currentRole?: UserRole;
  onUpdateRowFields: (
    rowId: string,
    patch: Partial<Pick<StaffListingSheetRow, 'email' | 'trangThai' | 'zalo'>>
  ) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const MANAGER_ROLES: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'LEADER',
];

export const KocOutreachEmailModal: React.FC<KocOutreachEmailModalProps> = ({
  open,
  onClose,
  initialTab = 'COMPOSE',
  targetRows,
  allSheetRows,
  sheetKey,
  activeMonth,
  activeStoreName,
  activeStoreObj,
  allStores,
  allKocs,
  currentUserName,
  currentRole = 'BOOKING_MEMBER',
  onUpdateRowFields,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'TEMPLATES' | 'SETTINGS_LOGS'>(
    initialTab
  );

  // Trạng thái lưu trữ Mẫu thư, Cấu hình máy chủ & Nhật ký gửi
  const [emailState, setEmailState] = useState<KocOutreachEmailState>(() =>
    loadKocOutreachEmailState()
  );

  // Quyền Trưởng phòng quản lý mẫu thư (mặc định bật cho Manager/Admin/Leader hoặc cho phép bật trực tiếp để quản trị)
  const isDefaultManager =
    MANAGER_ROLES.includes(currentRole) ||
    currentUserName.includes('Yến Nhi') ||
    currentUserName.includes('Ngọc Tâm') ||
    currentUserName.includes('Giang') ||
    currentUserName.includes('Quản trị');
  const [managerModeEnabled, setManagerModeEnabled] = useState<boolean>(isDefaultManager);

  // Danh sách dòng KOC đưa vào phiên gửi mail
  const candidateRows = useMemo(() => {
    const safeTargets = Array.isArray(targetRows) ? targetRows : [];
    const safeAll = Array.isArray(allSheetRows) ? allSheetRows : [];
    return safeTargets.length > 0 ? safeTargets : safeAll;
  }, [targetRows, allSheetRows]);

  const [selectedRecipientRowIds, setSelectedRecipientRowIds] = useState<string[]>([]);
  const [activePreviewRowId, setActivePreviewRowId] = useState<string>('');
  const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'HAS_EMAIL' | 'NO_EMAIL'>('ALL');

  // Tra cứu KOC gốc trong Danh bạ để lấy email dự phòng nếu cột AO trong Sheet chưa có
  const kocByHandleMap = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of allKocs) {
      const h = normalizeTikTokId(k.channelId).toLowerCase();
      if (h) map.set(h, k);
    }
    return map;
  }, [allKocs]);

  // Bản nháp sửa Email & Zalo nhanh cho từng dòng KOC ngay trong Modal
  const [emailDraftByRowId, setEmailDraftByRowId] = useState<Record<string, string>>({});
  const [zaloDraftByRowId, setZaloDraftByRowId] = useState<Record<string, string>>({});
  const wasOpenRef = useRef<boolean>(false);

  const getEffectiveRowEmail = useCallback(
    (row: StaffListingSheetRow): string => {
      const draft = emailDraftByRowId[row.id];
      if (draft !== undefined) return draft.trim();
      const clean = normalizeTikTokId(row.idKenh).toLowerCase();
      return (row.email || kocByHandleMap.get(clean)?.email || '').trim();
    },
    [emailDraftByRowId, kocByHandleMap]
  );

  const getEffectiveRowZalo = useCallback(
    (row: StaffListingSheetRow): string => {
      const draft = zaloDraftByRowId[row.id];
      if (draft !== undefined) return draft.trim();
      const clean = normalizeTikTokId(row.idKenh).toLowerCase();
      const matchedKoc = kocByHandleMap.get(clean);
      return (row.zalo || matchedKoc?.zalo || matchedKoc?.phone || '').trim();
    },
    [zaloDraftByRowId, kocByHandleMap]
  );

  // Chọn mẫu thư trong Tab COMPOSE
  const approvedTemplates = useMemo(
    () =>
      (Array.isArray(emailState?.templates) ? emailState.templates : []).filter(
        (t) => t && t.status !== 'ARCHIVED'
      ),
    [emailState]
  );

  const activePreviewRow = useMemo(
    () =>
      candidateRows.find((r) => r.id === activePreviewRowId) ||
      candidateRows[0],
    [candidateRows, activePreviewRowId]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [composeSubjectDraft, setComposeSubjectDraft] = useState<string>('');
  const [composeBodyDraft, setComposeBodyDraft] = useState<string>('');
  const [composeMode, setComposeMode] = useState<
    'PREVIEW_MERGED' | 'ZALO_CHAT' | 'EDIT_TEMPLATE'
  >('PREVIEW_MERGED');

  // Thông tin PIC & tùy chọn gửi
  const [picName, setPicName] = useState<string>(currentUserName || 'Chuyên viên Booking B2C');
  const [picPhone, setPicPhone] = useState<string>('0988 654 321');
  const [picEmail, setPicEmail] = useState<string>(
    emailState.serverConfig.senderEmail || 'booking.b2c@upbase.vn'
  );
  const [ccEmails, setCcEmails] = useState<string>(
    emailState.serverConfig.defaultCcEmails || ''
  );
  const [customNoteForKoc, setCustomNoteForKoc] = useState<string>('');
  const [hideExactFeeInEmail, setHideExactFeeInEmail] = useState<boolean>(false);
  const [isSendingBatch, setIsSendingBatch] = useState<boolean>(false);
  const [configDraft, setConfigDraft] = useState<KocEmailServerConfig>(() => ({
    ...emailState.serverConfig,
  }));
  const [isEditingSender, setIsEditingSender] = useState<boolean>(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState<boolean>(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown kênh gửi khác khi click ra ngoài
  useEffect(() => {
    if (!isMoreActionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreActionsOpen]);

  // Khởi tạo danh sách chọn, bản nháp email & mẫu gợi ý khi bắt đầu mở Modal
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const ids = candidateRows.map((r) => r.id);
      const map: Record<string, string> = {};
      const zMap: Record<string, string> = {};
      for (const r of candidateRows) {
        const clean = normalizeTikTokId(r.idKenh).toLowerCase();
        const matched = kocByHandleMap.get(clean);
        map[r.id] = (r.email || matched?.email || '').trim();
        zMap[r.id] = (r.zalo || matched?.zalo || matched?.phone || '').trim();
      }
      const firstRow = candidateRows[0];
      const recommended = recommendTemplateForRow(
        firstRow,
        approvedTemplates,
        activeStoreObj?.brandName
      );
      void hydrateKocOutreachEmailStateFromServer().then((remote) => {
        setActiveTab(initialTab);
        if (isDefaultManager) setManagerModeEnabled(true);
        setSelectedRecipientRowIds(ids);
        setActivePreviewRowId(ids[0] || '');
        setEmailDraftByRowId(map);
        setZaloDraftByRowId(zMap);
        setEmailState(remote);
        setConfigDraft({ ...remote.serverConfig });
        if (recommended) {
          setSelectedTemplateId(recommended.id);
          setComposeSubjectDraft(recommended.subjectTemplate);
          setComposeBodyDraft(recommended.bodyTemplate);
        }
      });
    }
  }, [
    open,
    initialTab,
    isDefaultManager,
    candidateRows,
    kocByHandleMap,
    approvedTemplates,
    activeStoreObj?.brandName,
  ]);

  const currentComposeTemplate = useMemo(
    () =>
      approvedTemplates.find((t) => t.id === selectedTemplateId) ||
      approvedTemplates[0] ||
      DEFAULT_KOC_EMAIL_TEMPLATES[0],
    [approvedTemplates, selectedTemplateId]
  );

  const handleSelectComposeTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = approvedTemplates.find((t) => t.id === tplId);
    if (found) {
      setComposeSubjectDraft(found.subjectTemplate);
      setComposeBodyDraft(found.bodyTemplate);
    }
  };

  const handleAutoMatchTemplateForPreviewRow = () => {
    const rec = recommendTemplateForRow(
      activePreviewRow,
      approvedTemplates,
      activeStoreObj?.brandName
    );
    if (rec) {
      handleSelectComposeTemplate(rec.id);
      onNotify?.(`Đã chọn mẫu "${rec.name}" khớp với tệp ${activePreviewRow?.tepBooking || 'KOC'}.`, 'info');
    }
  };

  // Nội dung thư đã cá nhân hóa cho dòng KOC đang xem trước
  const renderedPreview = useMemo(() => {
    if (!activePreviewRow) {
      return { subject: '', body: '', recipientEmail: '' };
    }
    const clean = normalizeTikTokId(activePreviewRow.idKenh).toLowerCase();
    const rowWithDraftEmail: StaffListingSheetRow = {
      ...activePreviewRow,
      email: getEffectiveRowEmail(activePreviewRow),
    };
    return renderKocOutreachEmail({
      subjectTemplate: composeSubjectDraft || currentComposeTemplate.subjectTemplate,
      bodyTemplate: composeBodyDraft || currentComposeTemplate.bodyTemplate,
      row: rowWithDraftEmail,
      store: activeStoreObj,
      kocDirectoryItem: kocByHandleMap.get(clean),
      staffName: picName,
      staffPhone: picPhone,
      staffEmail: picEmail,
      customNote: customNoteForKoc,
      signatureBlock: emailState.serverConfig.signatureBlock,
      hideExactFeeInEmail,
    });
  }, [
    activePreviewRow,
    composeSubjectDraft,
    composeBodyDraft,
    currentComposeTemplate,
    activeStoreObj,
    kocByHandleMap,
    picName,
    picPhone,
    picEmail,
    customNoteForKoc,
    emailState.serverConfig.signatureBlock,
    hideExactFeeInEmail,
    getEffectiveRowEmail,
  ]);

  // Lọc danh sách người nhận bên trái
  const filteredCandidateRows = useMemo(() => {
    return candidateRows.filter((r) => {
      const em = getEffectiveRowEmail(r);
      const hasValidEmail = em.includes('@');
      if (recipientFilter === 'HAS_EMAIL') return hasValidEmail;
      if (recipientFilter === 'NO_EMAIL') return !hasValidEmail;
      return true;
    });
  }, [candidateRows, recipientFilter, getEffectiveRowEmail]);

  // Đếm số KOC đã chọn có email hợp lệ
  const selectedRowsWithValidEmail = useMemo(() => {
    const selSet = new Set(selectedRecipientRowIds);
    return candidateRows.filter(
      (r) => selSet.has(r.id) && getEffectiveRowEmail(r).includes('@')
    );
  }, [candidateRows, selectedRecipientRowIds, getEffectiveRowEmail]);

  // Tra cứu lịch sử gửi mail theo rowId hoặc idKenh
  const latestLogByHandle = useMemo(() => {
    const map = new Map<string, KocEmailOutreachLogItem>();
    for (const log of emailState.logs) {
      const h = normalizeTikTokId(log.idKenh).toLowerCase();
      if (h && !map.has(h)) {
        map.set(h, log);
      }
    }
    return map;
  }, [emailState.logs]);

  // Lưu email người dùng vừa gõ vào cột AO của Sheet
  const handleUpdateDraftEmailForRow = (row: StaffListingSheetRow, newEmail: string) => {
    setEmailDraftByRowId((prev) => ({ ...prev, [row.id]: newEmail }));
    const trimmed = newEmail.trim();
    if (trimmed.includes('@') || trimmed === '') {
      onUpdateRowFields(row.id, { email: trimmed });
    }
  };

  const handleCommitEmailForRow = (row: StaffListingSheetRow, newEmail: string) => {
    const trimmed = newEmail.trim();
    setEmailDraftByRowId((prev) => ({ ...prev, [row.id]: trimmed }));
    if (trimmed !== (row.email || '').trim()) {
      onUpdateRowFields(row.id, { email: trimmed });
    }
  };

  // Lưu SĐT / Zalo người dùng vừa gõ vào cột AX của Sheet & Master
  const handleUpdateDraftZaloForRow = (row: StaffListingSheetRow, newZalo: string) => {
    setZaloDraftByRowId((prev) => ({ ...prev, [row.id]: newZalo }));
    const trimmed = newZalo.trim();
    onUpdateRowFields(row.id, { zalo: trimmed });
  };

  const handleCommitZaloForRow = (row: StaffListingSheetRow, newZalo: string) => {
    const trimmed = newZalo.trim();
    setZaloDraftByRowId((prev) => ({ ...prev, [row.id]: trimmed }));
    if (trimmed !== (row.zalo || '').trim()) {
      onUpdateRowFields(row.id, { zalo: trimmed });
    }
  };

  // Nội dung tin nhắn Zalo ngắn gọn chuẩn hóa
  const renderedZaloPreview = useMemo(() => {
    if (!activePreviewRow) return '';
    const clean = normalizeTikTokId(activePreviewRow.idKenh).toLowerCase();
    return renderKocOutreachZaloMessage({
      row: activePreviewRow,
      store: activeStoreObj,
      kocDirectoryItem: kocByHandleMap.get(clean),
      staffName: picName,
      staffPhone: picPhone,
      customNote: customNoteForKoc,
      hideExactFee: hideExactFeeInEmail,
    });
  }, [
    activePreviewRow,
    activeStoreObj,
    kocByHandleMap,
    picName,
    picPhone,
    customNoteForKoc,
    hideExactFeeInEmail,
  ]);

  // Ghi nhận log khi mở Lark Mail / Gmail / Mailto / Copy / Zalo
  const recordQuickClientLog = (
    row: StaffListingSheetRow,
    method: 'LARK_MAIL_WEB' | 'GMAIL_WEB' | 'MAILTO_CLIENT' | 'COPIED' | 'ZALO_CHAT',
    status: 'OPENED_LARK' | 'OPENED_GMAIL' | 'COPIED' | 'OPENED_ZALO'
  ) => {
    const clean = normalizeTikTokId(row.idKenh).toLowerCase();
    const effEmail = getEffectiveRowEmail(row);
    const rendered = renderKocOutreachEmail({
      subjectTemplate: composeSubjectDraft || currentComposeTemplate.subjectTemplate,
      bodyTemplate: composeBodyDraft || currentComposeTemplate.bodyTemplate,
      row: { ...row, email: effEmail },
      store: activeStoreObj,
      kocDirectoryItem: kocByHandleMap.get(clean),
      staffName: picName,
      staffPhone: picPhone,
      staffEmail: picEmail,
      customNote: customNoteForKoc,
      signatureBlock: emailState.serverConfig.signatureBlock,
      hideExactFeeInEmail,
    });

    const newLog: KocEmailOutreachLogItem = {
      id: `mail-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: new Date().toISOString(),
      sheetKey,
      rowId: row.id,
      kocId: row.kocId,
      idKenh: row.idKenh,
      tenKenh: row.tenKenh,
      recipientEmail: effEmail || 'Chưa điền email',
      ccEmails,
      brandName:
        activeStoreObj?.brandName ||
        activeStoreName.split(/[-–—]/)[0].trim(),
      storeName: activeStoreName,
      monthKey: activeMonth,
      templateId: currentComposeTemplate.id,
      templateName: currentComposeTemplate.name,
      subject: rendered.subject,
      body: rendered.body,
      channelMethod: method,
      deliveryStatus: status,
      sentBy: currentUserName,
    };

    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: emailState.templates.map((t) =>
        t.id === currentComposeTemplate.id
          ? { ...t, usageCount: (t.usageCount || 0) + 1 }
          : t
      ),
      logs: [newLog, ...emailState.logs].slice(0, 300),
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);

    if (emailState.serverConfig.autoUpdateSheetStatusOnSend) {
      onUpdateRowFields(row.id, {
        email: effEmail || row.email,
        trangThai: 'Đang liên hệ',
      });
    }
  };

  // Mở Lark Mail Web & Tự động sao chép nội dung thư đã cá nhân hóa
  const handleOpenLarkMailForCurrentPreview = async () => {
    if (!activePreviewRow) return;
    const to = getEffectiveRowEmail(activePreviewRow);
    const fullClipboard = `Người nhận (To): ${to || ''}\nTiêu đề (Subject): ${renderedPreview.subject}\n\n${renderedPreview.body}`;
    try {
      await navigator.clipboard.writeText(renderedPreview.body);
    } catch {
      // ignore clipboard error
    }
    void fullClipboard;
    window.open(buildLarkMailWebUrl(), '_blank', 'noopener,noreferrer');
    recordQuickClientLog(activePreviewRow, 'LARK_MAIL_WEB', 'OPENED_LARK');
    onNotify?.(
      `Đã mở Lark Mail (mail.larksuite.com) và tự động copy sẵn nội dung thư của KOC ${
        activePreviewRow.tenKenh || activePreviewRow.idKenh
      }.`,
      'success'
    );
  };

  // Mở Gmail Web soạn sẵn cho KOC đang xem
  const handleOpenGmailForCurrentPreview = () => {
    if (!activePreviewRow) return;
    const to = getEffectiveRowEmail(activePreviewRow);
    const url = buildGmailComposeUrl({
      to,
      cc: ccEmails,
      subject: renderedPreview.subject,
      body: renderedPreview.body,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    recordQuickClientLog(activePreviewRow, 'GMAIL_WEB', 'OPENED_GMAIL');
    onNotify?.(
      `Đã mở cửa sổ Gmail soạn sẵn cho KOC ${activePreviewRow.tenKenh || activePreviewRow.idKenh}.`,
      'success'
    );
  };

  // Mở ứng dụng Mail mặc định (mailto:)
  const handleOpenMailtoForCurrentPreview = () => {
    if (!activePreviewRow) return;
    const to = getEffectiveRowEmail(activePreviewRow);
    const url = buildMailtoUrl({
      to,
      cc: ccEmails,
      subject: renderedPreview.subject,
      body: renderedPreview.body,
    });
    window.location.href = url;
    recordQuickClientLog(activePreviewRow, 'MAILTO_CLIENT', 'OPENED_GMAIL');
  };

  // Mở Zalo Chat (zalo.me) & tự động copy sẵn tin nhắn ngắn
  const handleOpenZaloForCurrentPreview = async () => {
    if (!activePreviewRow) return;
    const effZalo = getEffectiveRowZalo(activePreviewRow);
    try {
      await navigator.clipboard.writeText(renderedZaloPreview);
    } catch {
      // ignore clipboard error
    }
    const url = buildZaloChatUrl(effZalo);
    window.open(url, '_blank', 'noopener,noreferrer');
    recordQuickClientLog(activePreviewRow, 'ZALO_CHAT', 'OPENED_ZALO');
    onNotify?.(
      `Đã mở Zalo${effZalo ? ` (${effZalo})` : ''} và tự động copy sẵn tin nhắn gửi KOC ${
        activePreviewRow.tenKenh || activePreviewRow.idKenh
      }.`,
      'success'
    );
  };

  // Sao chép tin nhắn Zalo ngắn gọn
  const handleCopyZaloMessage = async () => {
    if (!activePreviewRow) return;
    try {
      await navigator.clipboard.writeText(renderedZaloPreview);
      recordQuickClientLog(activePreviewRow, 'ZALO_CHAT', 'COPIED');
      onNotify?.('Đã sao chép tin nhắn Zalo gửi KOC.', 'success');
    } catch {
      onNotify?.('Không thể truy cập Clipboard trình duyệt.', 'error');
    }
  };

  // Sao chép nội dung thư đã cá nhân hóa
  const handleCopyRenderedEmail = async (part: 'SUBJECT' | 'BODY' | 'FULL') => {
    if (!activePreviewRow) return;
    const textToCopy =
      part === 'SUBJECT'
        ? renderedPreview.subject
        : part === 'BODY'
          ? renderedPreview.body
          : `Tiêu đề: ${renderedPreview.subject}\nNgười nhận: ${
              getEffectiveRowEmail(activePreviewRow) || '(Chưa có email)'
            }\n\n${renderedPreview.body}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      if (part !== 'SUBJECT') {
        recordQuickClientLog(activePreviewRow, 'COPIED', 'COPIED');
      }
      onNotify?.(
        part === 'SUBJECT'
          ? 'Đã sao chép tiêu đề thư mời.'
          : part === 'BODY'
            ? 'Đã sao chép nội dung thư mời đã cá nhân hóa.'
            : 'Đã sao chép trọn bộ tiêu đề và nội dung thư mời.',
        'success'
      );
    } catch {
      onNotify?.('Không thể truy cập Clipboard trình duyệt.', 'error');
    }
  };

  // Gửi hàng loạt trực tiếp qua hệ thống
  const handleSendBatchDirect = async () => {
    if (selectedRowsWithValidEmail.length === 0) {
      onNotify?.(
        'Vui lòng tích chọn ít nhất 1 KOC đã có địa chỉ Email hợp lệ ở danh sách bên trái.',
        'warning'
      );
      return;
    }

    setIsSendingBatch(true);
    try {
      const brandName =
        activeStoreObj?.brandName ||
        activeStoreName.split(/[-–—]/)[0].trim();

      const messages = selectedRowsWithValidEmail.map((row) => {
        const clean = normalizeTikTokId(row.idKenh).toLowerCase();
        const effEmail = getEffectiveRowEmail(row);
        const rendered = renderKocOutreachEmail({
          subjectTemplate: composeSubjectDraft || currentComposeTemplate.subjectTemplate,
          bodyTemplate: composeBodyDraft || currentComposeTemplate.bodyTemplate,
          row: { ...row, email: effEmail },
          store: activeStoreObj,
          kocDirectoryItem: kocByHandleMap.get(clean),
          staffName: picName,
          staffPhone: picPhone,
          staffEmail: picEmail,
          customNote: customNoteForKoc,
          signatureBlock: emailState.serverConfig.signatureBlock,
          hideExactFeeInEmail,
        });

        return {
          rowId: row.id,
          sheetKey,
          kocId: row.kocId,
          idKenh: row.idKenh,
          tenKenh: row.tenKenh,
          to: effEmail,
          cc: ccEmails,
          brandName,
          storeName: activeStoreName,
          monthKey: activeMonth,
          templateId: currentComposeTemplate.id,
          templateName: currentComposeTemplate.name,
          subject: rendered.subject,
          body: rendered.body,
          sentBy: currentUserName,
        };
      });

      const res = await fetch('/api/integrations/koc-outreach-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_BATCH',
          messages,
          serverConfig: emailState.serverConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể gửi thư mời hợp tác.');
      }

      const returnedLogs: KocEmailOutreachLogItem[] = Array.isArray(data.logs)
        ? data.logs
        : [];

      const nextState: KocOutreachEmailState = {
        ...emailState,
        templates: emailState.templates.map((t) =>
          t.id === currentComposeTemplate.id
            ? {
                ...t,
                usageCount: (t.usageCount || 0) + (data.sentCount || messages.length),
              }
            : t
        ),
        logs: [...returnedLogs, ...emailState.logs].slice(0, 300),
        updatedAt: new Date().toISOString(),
      };
      setEmailState(nextState);
      saveKocOutreachEmailState(nextState, false);

      // Cập nhật email và cột Trạng thái (Cột Q) trên Sheet
      for (const row of selectedRowsWithValidEmail) {
        const effEmail = getEffectiveRowEmail(row);
        onUpdateRowFields(row.id, {
          email: effEmail,
          ...(emailState.serverConfig.autoUpdateSheetStatusOnSend
            ? { trangThai: 'Đang liên hệ' }
            : {}),
        });
      }

      onNotify?.(
        `Đã gửi thành công ${data.sentCount}/${messages.length} thư mời hợp tác KOC${
          emailState.serverConfig.autoUpdateSheetStatusOnSend
            ? ' và chuyển trạng thái Sheet sang "Đang liên hệ".'
            : '.'
        }`,
        'success'
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi khi gửi thư mời hợp tác.',
        'error'
      );
    } finally {
      setIsSendingBatch(false);
    }
  };

  // ============================================================================
  // TAB 2: QUẢN LÝ MẪU THƯ DÀNH CHO TRƯỞNG PHÒNG (TEMPLATES)
  // ============================================================================
  const [editingTemplateId, setEditingTemplateId] = useState<string>(
    DEFAULT_KOC_EMAIL_TEMPLATES[0].id
  );

  const selectedManagerTemplate = useMemo(
    () =>
      emailState.templates.find((t) => t.id === editingTemplateId) ||
      emailState.templates[0],
    [emailState.templates, editingTemplateId]
  );

  const [tplForm, setTplForm] = useState<KocEmailTemplateItem>(() =>
    selectedManagerTemplate || DEFAULT_KOC_EMAIL_TEMPLATES[0]
  );

  const uniqueBrandNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStores) {
      if (s.brandName) set.add(s.brandName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [allStores]);

  const handleCreateNewTemplate = () => {
    const newId = makeCustomTemplateId('tpl-custom');
    const nextNumber = emailState.templates.length + 1;
    const newTpl: KocEmailTemplateItem = {
      id: newId,
      code: `TPL-CUSTOM-0${nextNumber}`,
      name: `Mẫu thư mời hợp tác KOC mới #${nextNumber}`,
      category: 'PAID_BOOKING',
      status: managerModeEnabled ? 'APPROVED' : 'DRAFT',
      isDefaultForCategory: false,
      isLockedByManager: false,
      brandScope: 'ALL',
      createdBy: currentUserName,
      approvedBy: managerModeEnabled ? currentUserName : undefined,
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      subjectTemplate:
        '[{{thuong_hieu}} x UpBase] Lời mời hợp tác chiến dịch tháng {{thang_chien_dich}} — {{ten_koc}}',
      bodyTemplate: `Chào bạn {{ten_koc}},\n\nMình là {{ten_pic}} — Phụ trách Booking nhãn hàng {{thuong_hieu}} ({{gian_hang}}).\n\nNhãn hàng rất ấn tượng với kênh {{id_kenh}} và mong muốn mời bạn hợp tác giới thiệu sản phẩm {{san_pham}} trong {{dot_booking}} tháng {{thang_chien_dich}}:\n- Định hướng nội dung: {{content_tag}}\n- Ngân sách đề xuất: {{muc_cat_xe}}\n- Ngày lên sóng dự kiến: {{ngay_air_du_kien}}\n{{ghi_chu_rieng}}\n\nBạn phản hồi qua email hoặc Zalo {{sdt_pic}} để mình gửi Brief chi tiết nhé!\n\n{{chu_ky_phong}}`,
    };

    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: [newTpl, ...emailState.templates],
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);
    setEditingTemplateId(newId);
    setTplForm(newTpl);
    onNotify?.('Đã tạo mẫu thư mời mới.', 'success');
  };

  const handleDuplicateTemplate = (tpl: KocEmailTemplateItem) => {
    const newId = makeCustomTemplateId('tpl-copy');
    const copyTpl: KocEmailTemplateItem = {
      ...tpl,
      id: newId,
      code: `${tpl.code}-COPY`,
      name: `${tpl.name} (Bản sao)`,
      isDefaultForCategory: false,
      isLockedByManager: false,
      createdBy: currentUserName,
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };
    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: [copyTpl, ...emailState.templates],
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);
    setEditingTemplateId(newId);
    setTplForm(copyTpl);
    onNotify?.(`Đã nhân bản mẫu "${tpl.name}".`, 'info');
  };

  const handleSaveTemplateChanges = () => {
    if (!tplForm.name.trim() || !tplForm.subjectTemplate.trim() || !tplForm.bodyTemplate.trim()) {
      onNotify?.('Vui lòng nhập đầy đủ Tên mẫu, Tiêu đề và Nội dung thư.', 'warning');
      return;
    }

    const updatedTpl: KocEmailTemplateItem = {
      ...tplForm,
      approvedBy:
        tplForm.status === 'APPROVED'
          ? tplForm.approvedBy || currentUserName
          : undefined,
      updatedAt: new Date().toISOString(),
    };

    const nextTemplates = emailState.templates.map((t) => {
      if (t.id === updatedTpl.id) return updatedTpl;
      // Nếu đặt làm mặc định cho nhóm này, bỏ cờ mặc định ở các mẫu cùng nhóm khác
      if (
        updatedTpl.isDefaultForCategory &&
        t.category === updatedTpl.category &&
        t.brandScope === updatedTpl.brandScope
      ) {
        return { ...t, isDefaultForCategory: false };
      }
      return t;
    });

    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: nextTemplates,
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);

    // Nếu mẫu này đang được chọn ở Tab COMPOSE thì đồng bộ luôn
    if (selectedTemplateId === updatedTpl.id) {
      setComposeSubjectDraft(updatedTpl.subjectTemplate);
      setComposeBodyDraft(updatedTpl.bodyTemplate);
    }

    onNotify?.(`Đã lưu mẫu thư "${updatedTpl.name}".`, 'success');
  };

  const handleDeleteTemplate = (tplId: string) => {
    if (emailState.templates.length <= 1) {
      onNotify?.('Hệ thống cần giữ tối thiểu 1 mẫu thư mời hợp tác.', 'warning');
      return;
    }
    const target = emailState.templates.find((t) => t.id === tplId);
    const remaining = emailState.templates.filter((t) => t.id !== tplId);
    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: remaining,
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);
    setEditingTemplateId(remaining[0].id);
    setTplForm({ ...remaining[0] });
    onNotify?.(`Đã xóa mẫu thư "${target?.name || ''}".`, 'info');
  };

  const handleRestoreDefaultTemplates = () => {
    const restored = DEFAULT_KOC_EMAIL_TEMPLATES.map((t) => ({ ...t }));
    const nextState: KocOutreachEmailState = {
      ...emailState,
      templates: restored,
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);
    setEditingTemplateId(restored[0].id);
    setTplForm({ ...restored[0] });
    onNotify?.('Đã khôi phục 5 bộ mẫu thư mời hợp tác chuẩn B2C UpBase.', 'success');
  };

  const insertTokenIntoTemplateForm = (token: string, target: 'SUBJECT' | 'BODY') => {
    if (target === 'SUBJECT') {
      setTplForm((prev) => ({
        ...prev,
        subjectTemplate: `${prev.subjectTemplate} ${token}`,
      }));
    } else {
      setTplForm((prev) => ({
        ...prev,
        bodyTemplate: `${prev.bodyTemplate}${token}`,
      }));
    }
  };

  // ============================================================================
  // TAB 3: CẤU HÌNH MÁY CHỦ MAIL & NHẬT KÝ GỬI (SETTINGS_LOGS)
  // ============================================================================
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResultBanner, setTestResultBanner] = useState<string>('');
  const [inspectingLog, setInspectingLog] = useState<KocEmailOutreachLogItem | null>(null);

  const handleSaveServerConfig = () => {
    const nextState: KocOutreachEmailState = {
      ...emailState,
      serverConfig: { ...configDraft },
      updatedAt: new Date().toISOString(),
    };
    setEmailState(nextState);
    saveKocOutreachEmailState(nextState, true);
    onNotify?.('Đã lưu cấu hình máy chủ gửi mail và chữ ký chuẩn Phòng Booking.', 'success');
  };

  const handleTestMailConnection = async () => {
    setIsTestingConnection(true);
    setTestResultBanner('');
    try {
      const res = await fetch('/api/integrations/koc-outreach-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          serverConfig: configDraft,
        }),
      });
      const data = await res.json();
      const msg = data.message || 'Kết nối máy chủ gửi mail sẵn sàng.';
      setTestResultBanner(msg);
      onNotify?.(msg, 'success');
    } catch {
      setTestResultBanner('Không thể kiểm tra kết nối máy chủ gửi mail.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isComposeTemplateLockedForStaff =
    currentComposeTemplate.isLockedByManager && !managerModeEnabled;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Gửi thư mời hợp tác KOC — ${activeStoreName} (${activeMonth})`}
      size="3xl"
      footer={
        activeTab === 'COMPOSE' ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
              <span>
                Đã chọn <strong className="text-ink tabular-nums">{selectedRecipientRowIds.length}</strong> KOC
              </span>
              <span>·</span>
              <span>
                Sẵn sàng gửi:{' '}
                <strong className="text-positive tabular-nums">
                  {selectedRowsWithValidEmail.length}/{selectedRecipientRowIds.length}
                </strong>
              </span>
              {selectedRecipientRowIds.length > selectedRowsWithValidEmail.length && (
                <span className="text-warning font-medium">
                  (Thiếu {selectedRecipientRowIds.length - selectedRowsWithValidEmail.length} email)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>

              <div className="relative inline-block" ref={moreActionsRef}>
                <Button
                  variant="secondary"
                  onClick={() => setIsMoreActionsOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5"
                >
                  <span>Kênh gửi khác</span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
                </Button>
                {isMoreActionsOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 z-30 min-w-[210px] py-1 bg-surface border border-line rounded-lg shadow-lg origin-bottom-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        void handleOpenZaloForCurrentPreview();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors border-b border-line/70"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-accent" />
                      <span>Mở Zalo chat KOC (zalo.me)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        void handleCopyZaloMessage();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors border-b border-line/70"
                    >
                      <Copy className="w-3.5 h-3.5 text-ink-3" />
                      <span>Sao chép tin nhắn Zalo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        void handleCopyRenderedEmail('FULL');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-ink-3" />
                      <span>Sao chép toàn bộ email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        void handleOpenLarkMailForCurrentPreview();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                      <span>Mở trên Lark Mail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        handleOpenGmailForCurrentPreview();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                      <span>Mở trên Gmail Web</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreActionsOpen(false);
                        handleOpenMailtoForCurrentPreview();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken text-left transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-ink-3" />
                      <span>Mở ứng dụng Mail mặc định</span>
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                icon={Send}
                disabled={isSendingBatch || selectedRowsWithValidEmail.length === 0}
                onClick={() => void handleSendBatchDirect()}
              >
                {isSendingBatch
                  ? 'Đang gửi...'
                  : `Gửi thư mời (${selectedRowsWithValidEmail.length} KOC)`}
              </Button>
            </div>
          </div>
        ) : activeTab === 'TEMPLATES' ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={handleRestoreDefaultTemplates}
              >
                Khôi phục 5 mẫu chuẩn UpBase
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={Check}
                onClick={handleSaveTemplateChanges}
              >
                Lưu & phê duyệt mẫu
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button variant="primary" icon={Check} onClick={handleSaveServerConfig}>
              Lưu cấu hình gửi mail
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3.5">
        {/* Thanh chuyển Tab ghim cố định đầu hộp thoại */}
        <div className="sticky -top-3.5 sm:-top-4 z-10 bg-surface pt-1 -mx-4 sm:-mx-5 px-4 sm:px-5">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'COMPOSE',
                label: 'Soạn & gửi thư',
                count: candidateRows.length,
              },
              {
                key: 'TEMPLATES',
                label: 'Mẫu thư chuẩn',
                count: emailState.templates.length,
              },
              {
                key: 'SETTINGS_LOGS',
                label: 'Cấu hình & nhật ký',
                count: emailState.logs.length,
              },
            ]}
            actions={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('SETTINGS_LOGS')}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-2xs font-medium bg-sunken text-ink-2 border border-line hover:text-ink transition-colors"
                  title="Cấu hình gửi mail & nhật ký"
                >
                  <Settings className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <span>Cài đặt</span>
                </button>
                {isDefaultManager && (
                  <button
                    type="button"
                    onClick={() => setManagerModeEnabled((v) => !v)}
                    className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-2xs font-medium border transition-colors ${
                      managerModeEnabled
                        ? 'bg-positive-soft text-positive border-positive/30'
                        : 'text-ink-3 border-line hover:text-ink hover:bg-sunken'
                    }`}
                    title="Bật/tắt quyền quản trị mẫu thư"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{managerModeEnabled ? 'Trưởng phòng' : 'Chuyên viên'}</span>
                  </button>
                )}
              </div>
            }
          />
        </div>

        {/* ================================================================= */}
        {/* TAB 1: SOẠN & GỬI THƯ MỜI HỢP TÁC KOC                             */}
        {/* ================================================================= */}
        {activeTab === 'COMPOSE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Cột trái (4/12 cột): Danh sách KOC người nhận */}
            <div className="lg:col-span-4 min-w-0 flex flex-col border border-line rounded-xl overflow-hidden bg-surface">
              <div className="p-2.5 bg-sunken/70 border-b border-line space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Người nhận ({filteredCandidateRows.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRecipientRowIds(
                        selectedRecipientRowIds.length === candidateRows.length
                          ? []
                          : candidateRows.map((r) => r.id)
                      )
                    }
                    className="text-2xs font-medium text-accent hover:underline"
                  >
                    {selectedRecipientRowIds.length === candidateRows.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>

                {/* Bộ lọc nhanh trạng thái có Email */}
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { key: 'ALL', label: `Tất cả (${candidateRows.length})` },
                      {
                        key: 'HAS_EMAIL',
                        label: `Đủ (${
                          candidateRows.filter((r) => getEffectiveRowEmail(r).includes('@')).length
                        })`,
                      },
                      {
                        key: 'NO_EMAIL',
                        label: `Thiếu (${
                          candidateRows.filter((r) => !getEffectiveRowEmail(r).includes('@')).length
                        })`,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRecipientFilter(tab.key)}
                      className={`h-6 px-1 rounded text-2xs font-medium border transition-colors ${
                        recipientFilter === tab.key
                          ? 'bg-ink text-white border-ink'
                          : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-line max-h-[500px] overflow-y-auto">
                {filteredCandidateRows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3">
                    Không có KOC nào trong bộ lọc này.
                  </div>
                ) : (
                  filteredCandidateRows.map((row) => {
                    const isChecked = selectedRecipientRowIds.includes(row.id);
                    const isPreviewing = activePreviewRow?.id === row.id;
                    const emailVal = emailDraftByRowId[row.id] ?? row.email ?? '';
                    const hasValidEmail = emailVal.trim().includes('@');
                    const cleanHandle = normalizeTikTokId(row.idKenh).toLowerCase();
                    const prevSentLog = latestLogByHandle.get(cleanHandle);

                    return (
                      <div
                        key={row.id}
                        onClick={() => setActivePreviewRowId(row.id)}
                        className={`p-2.5 transition-colors cursor-pointer ${
                          isPreviewing
                            ? 'bg-accent-soft/45 border-l-2 border-l-accent'
                            : 'hover:bg-canvas'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() =>
                                setSelectedRecipientRowIds((prev) =>
                                  prev.includes(row.id)
                                    ? prev.filter((id) => id !== row.id)
                                    : [...prev, row.id]
                                )
                              }
                              className="mt-0.5 rounded border-line shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span
                                  className="text-xs font-semibold text-ink truncate"
                                  title={row.tenKenh || row.idKenh}
                                >
                                  {row.tenKenh || row.idKenh || 'Chưa rõ tên'}
                                </span>
                                <span className="text-2xs font-code text-ink-3 shrink-0">
                                  @{normalizeTikTokId(row.idKenh)}
                                </span>
                              </div>
                              <div className="text-2xs text-ink-3 truncate mt-0.5">
                                {row.tepBooking} ·{' '}
                                {Number(row.giaNetVideo) > 0
                                  ? formatVndShort(Number(row.giaNetVideo))
                                  : 'Freecast (0đ)'}{' '}
                                · SP: {row.sanPham || 'Chưa chọn'}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-2xs font-code">
                                <div className="flex items-center gap-1 min-w-0">
                                  <Mail className="w-3 h-3 text-ink-3 shrink-0" />
                                  {hasValidEmail ? (
                                    <span className="text-ink-2 truncate max-w-[120px]">{emailVal}</span>
                                  ) : (
                                    <span className="text-warning font-sans italic">
                                      Thiếu email
                                    </span>
                                  )}
                                </div>
                                {getEffectiveRowZalo(row) ? (
                                  <div className="flex items-center gap-0.5 text-accent shrink-0 font-medium">
                                    <MessageCircle className="w-3 h-3 shrink-0" />
                                    <span>{getEffectiveRowZalo(row)}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {prevSentLog ? (
                              <Status tone="positive">Đã gửi</Status>
                            ) : hasValidEmail ? (
                              <Status tone="info">Sẵn sàng</Status>
                            ) : (
                              <Status tone="warning">Thiếu email</Status>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cột phải (8/12 cột): Chọn mẫu, Người gửi & Trình soạn / Xem trước */}
            <div className="lg:col-span-8 min-w-0 space-y-3">
              {/* Thanh chọn Mẫu & Tùy chọn ẩn giá */}
              <div className="p-2.5 rounded-xl bg-sunken/70 border border-line space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-medium text-ink-2 shrink-0">Mẫu thư:</span>
                    <Select
                      value={currentComposeTemplate.id}
                      onChange={(e) => handleSelectComposeTemplate(e.target.value)}
                      className="w-full text-xs"
                    >
                      {approvedTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          [{tpl.code}] {tpl.name}
                          {tpl.isLockedByManager ? ' (Khóa chuẩn)' : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAutoMatchTemplateForPreviewRow}
                    >
                      Khớp mẫu KOC
                    </Button>
                    <label className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line bg-surface text-2xs text-ink cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hideExactFeeInEmail}
                        onChange={(e) => setHideExactFeeInEmail(e.target.checked)}
                        className="rounded border-line shrink-0"
                      />
                      <span>Ẩn giá Net</span>
                    </label>
                  </div>
                </div>

                {/* Sender Summary Bar - Thu gọn thông tin PIC */}
                <div className="rounded-lg border border-line bg-surface text-xs overflow-hidden">
                  <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                      <span className="text-ink-3 shrink-0">Người gửi:</span>
                      <span className="font-medium text-ink truncate">
                        {picName} ({picPhone} · {picEmail})
                      </span>
                      {ccEmails && (
                        <span className="text-ink-3 truncate hidden md:inline">
                          · CC: {ccEmails}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingSender((v) => !v)}
                      className="inline-flex items-center gap-1 text-2xs text-accent font-medium hover:underline shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingSender ? 'Thu gọn' : 'Chỉnh sửa'}</span>
                    </button>
                  </div>

                  {isEditingSender && (
                    <div className="p-3 border-t border-line bg-sunken/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <Field label="Người liên hệ (PIC)">
                        <Input
                          value={picName}
                          onChange={(e) => setPicName(e.target.value)}
                          placeholder="Tên chuyên viên"
                        />
                      </Field>
                      <Field label="SĐT / Zalo">
                        <Input
                          value={picPhone}
                          onChange={(e) => setPicPhone(e.target.value)}
                          placeholder="SĐT / Zalo"
                        />
                      </Field>
                      <Field label="Email liên hệ">
                        <Input
                          value={picEmail}
                          onChange={(e) => setPicEmail(e.target.value)}
                          placeholder="booking.b2c@upbase.vn"
                        />
                      </Field>
                      <Field label="CC quản lý">
                        <Input
                          value={ccEmails}
                          onChange={(e) => setCcEmails(e.target.value)}
                          placeholder="nhi.dty@upbase.vn"
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Lời nhắn bổ sung cho KOC */}
                <div className="flex items-center gap-2">
                  <Input
                    value={customNoteForKoc}
                    onChange={(e) => setCustomNoteForKoc(e.target.value)}
                    placeholder="Lời nhắn riêng cho KOC (VD: Ưu tiên gửi kèm quà tặng giới hạn...)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Khối Xem trước thư / Sửa mẫu gốc */}
              <div className="border border-line rounded-xl overflow-hidden bg-surface">
                <div className="px-3 py-1.5 bg-sunken/70 border-b border-line flex flex-wrap items-center justify-between gap-2">
                  <Segmented
                    value={composeMode}
                    onChange={setComposeMode}
                    items={[
                      {
                        key: 'PREVIEW_MERGED',
                        label: 'Xem trước Email',
                      },
                      {
                        key: 'ZALO_CHAT',
                        label: 'Tin nhắn Zalo',
                      },
                      {
                        key: 'EDIT_TEMPLATE',
                        label: isComposeTemplateLockedForStaff
                          ? 'Khung mẫu gốc (Đã khóa)'
                          : 'Khung mẫu gốc',
                      },
                    ]}
                  />

                  <div className="flex items-center gap-1.5">
                    {composeMode === 'ZALO_CHAT' ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={MessageCircle}
                          onClick={handleOpenZaloForCurrentPreview}
                        >
                          Mở Zalo chat
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Copy}
                          onClick={handleCopyZaloMessage}
                        >
                          Copy tin Zalo
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Copy}
                          onClick={() => void handleCopyRenderedEmail('SUBJECT')}
                        >
                          Copy tiêu đề
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Copy}
                          onClick={() => void handleCopyRenderedEmail('BODY')}
                        >
                          Copy nội dung
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {composeMode === 'PREVIEW_MERGED' ? (
                  <div className="divide-y divide-line">
                    {/* Người nhận (To) & Tiêu đề thư */}
                    <div className="px-3.5 py-2.5 bg-canvas/60 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-8 flex items-center gap-2 min-w-0">
                          <label className="text-ink-3 font-medium shrink-0">
                            Người nhận (To):
                          </label>
                          {activePreviewRow ? (
                            <input
                              type="email"
                              value={
                                emailDraftByRowId[activePreviewRow.id] ??
                                activePreviewRow.email ??
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateDraftEmailForRow(
                                  activePreviewRow,
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                handleCommitEmailForRow(
                                  activePreviewRow,
                                  e.target.value
                                )
                              }
                              placeholder={`Điền email của ${activePreviewRow.tenKenh || activePreviewRow.idKenh}...`}
                              className={`flex-1 min-w-0 h-8 px-2.5 rounded-md border text-xs font-code focus:outline-none ${
                                renderedPreview.recipientEmail.includes('@')
                                  ? 'border-line-strong bg-surface text-ink focus:border-focus'
                                  : 'border-warning bg-warning-soft/35 text-ink focus:border-warning'
                              }`}
                            />
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </div>
                        <div className="sm:col-span-4 min-w-0 truncate sm:text-right">
                          <span className="text-ink-3">Kênh: </span>
                          <strong className="text-ink">
                            {activePreviewRow?.tenKenh || activePreviewRow?.idKenh || '—'}
                          </strong>{' '}
                          <span className="text-ink-3 font-code">
                            (@{normalizeTikTokId(activePreviewRow?.idKenh || '')})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1.5 pt-1.5 border-t border-line/70">
                        <span className="text-ink-3 shrink-0">Tiêu đề:</span>
                        <strong className="text-ink font-semibold break-words">
                          {renderedPreview.subject}
                        </strong>
                      </div>
                    </div>

                    {/* Nội dung thư gửi KOC */}
                    <div className="p-3.5">
                      <pre className="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto">
                        {renderedPreview.body}
                      </pre>
                    </div>
                  </div>
                ) : composeMode === 'ZALO_CHAT' ? (
                  <div className="divide-y divide-line">
                    {/* SĐT / Zalo KOC */}
                    <div className="px-3.5 py-2.5 bg-canvas/60 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-8 flex items-center gap-2 min-w-0">
                          <label className="text-ink-3 font-medium shrink-0 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span>SĐT / Zalo:</span>
                          </label>
                          {activePreviewRow ? (
                            <input
                              type="tel"
                              value={
                                zaloDraftByRowId[activePreviewRow.id] ??
                                activePreviewRow.zalo ??
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateDraftZaloForRow(
                                  activePreviewRow,
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                handleCommitZaloForRow(
                                  activePreviewRow,
                                  e.target.value
                                )
                              }
                              placeholder={`Điền số điện thoại hoặc Zalo của ${activePreviewRow.tenKenh || activePreviewRow.idKenh}...`}
                              className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-line-strong bg-surface text-ink text-xs font-code focus:outline-none focus:border-focus"
                            />
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </div>
                        <div className="sm:col-span-4 min-w-0 flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={MessageCircle}
                            onClick={handleOpenZaloForCurrentPreview}
                          >
                            Mở chat zalo.me
                          </Button>
                        </div>
                      </div>

                      <div className="text-2xs text-ink-3">
                        Định dạng tin nhắn chào mời ngắn gọn, đầy đủ thông tin sản phẩm và cát-xê để gửi trực tiếp qua Zalo KOC.
                      </div>
                    </div>

                    {/* Khung nội dung tin nhắn Zalo */}
                    <div className="p-3.5">
                      <pre className="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto bg-sunken/40 p-3 rounded-lg border border-line">
                        {renderedZaloPreview}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 space-y-3">
                    {isComposeTemplateLockedForStaff && (
                      <div className="p-2.5 rounded-lg bg-warning-soft border border-warning/30 flex items-center justify-between gap-2 text-xs text-warning">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Mẫu chuẩn này đã được Trưởng phòng khóa cấu trúc. Bạn có thể nhập vào ô
                            &ldquo;Lời nhắn bổ sung&rdquo; ở trên hoặc bật quyền Trưởng phòng để chỉnh sửa.
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveTab('TEMPLATES')}
                        >
                          Mở mẫu thư
                        </Button>
                      </div>
                    )}

                    <Field label="Tiêu đề mẫu">
                      <Input
                        value={composeSubjectDraft}
                        disabled={isComposeTemplateLockedForStaff}
                        onChange={(e) => setComposeSubjectDraft(e.target.value)}
                      />
                    </Field>

                    <Field label="Nội dung mẫu">
                      <Textarea
                        rows={8}
                        value={composeBodyDraft}
                        disabled={isComposeTemplateLockedForStaff}
                        onChange={(e) => setComposeBodyDraft(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: QUẢN LÝ MẪU THƯ DÀNH CHO TRƯỞNG PHÒNG (TEMPLATES)          */}
        {/* ================================================================= */}
        {activeTab === 'TEMPLATES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Danh sách mẫu bên trái (4 cột) */}
            <div className="lg:col-span-4 border border-line rounded-xl overflow-hidden bg-surface flex flex-col">
              <div className="p-3 bg-sunken border-b border-line flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">
                  Kho mẫu thư chuẩn ({emailState.templates.length})
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleCreateNewTemplate}
                >
                  Tạo mẫu mới
                </Button>
              </div>

              <div className="divide-y divide-line max-h-[520px] overflow-y-auto">
                {emailState.templates.map((tpl) => {
                  const isActive = tpl.id === editingTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setEditingTemplateId(tpl.id);
                        setTplForm({ ...tpl });
                      }}
                      className={`p-3 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-accent-soft/35 border-l-2 border-l-ink'
                          : 'hover:bg-sunken/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-code text-2xs font-semibold text-ink-3">
                              [{tpl.code}]
                            </span>
                            {tpl.isDefaultForCategory && (
                              <Status tone="positive">Mặc định</Status>
                            )}
                            {tpl.isLockedByManager && (
                              <Status tone="warning">Khóa chuẩn</Status>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-ink mt-1 leading-snug">
                            {tpl.name}
                          </div>
                          <div className="text-2xs text-ink-3 mt-1">
                            Nhóm: {KOC_EMAIL_CATEGORY_LABELS[tpl.category]} · Brand:{' '}
                            {tpl.brandScope === 'ALL' ? 'Toàn bộ 42 Brand' : tpl.brandScope}
                          </div>
                          <div className="text-2xs text-ink-3 mt-0.5">
                            Duyệt bởi: {tpl.approvedBy || tpl.createdBy} · Đã gửi:{' '}
                            <strong className="text-ink">{tpl.usageCount || 0}</strong> lượt
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-2 flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Copy}
                          onClick={() => handleDuplicateTemplate(tpl)}
                        >
                          Nhân bản
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteTemplate(tpl.id)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trình biên tập mẫu thư dành cho Trưởng phòng bên phải (8 cột) */}
            <div className="lg:col-span-8 min-w-0 space-y-3">
              <div className="p-3.5 rounded-xl border border-line bg-surface space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3 min-w-0">
                    <Field label="Mã mẫu thư">
                      <Input
                        value={tplForm.code}
                        onChange={(e) =>
                          setTplForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-9 min-w-0">
                    <Field label="Tên mẫu thư mời hợp tác">
                      <Input
                        value={tplForm.name}
                        onChange={(e) =>
                          setTplForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Phân nhóm kịch bản Booking">
                    <Select
                      value={tplForm.category}
                      onChange={(e) =>
                        setTplForm((prev) => ({
                          ...prev,
                          category: e.target.value as KocEmailTemplateCategory,
                        }))
                      }
                      className="w-full"
                    >
                      {Object.entries(KOC_EMAIL_CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Phạm vi Thương hiệu áp dụng">
                    <Select
                      value={tplForm.brandScope}
                      onChange={(e) =>
                        setTplForm((prev) => ({ ...prev, brandScope: e.target.value }))
                      }
                      className="w-full"
                    >
                      <option value="ALL">Dùng chung cả 42 Thương hiệu B2C</option>
                      {uniqueBrandNames.map((b) => (
                        <option key={b} value={b}>
                          Riêng cho Brand: {b}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Trạng thái phê duyệt (Trưởng phòng)">
                    <Select
                      value={tplForm.status}
                      onChange={(e) =>
                        setTplForm((prev) => ({
                          ...prev,
                          status: e.target.value as KocEmailTemplateStatus,
                        }))
                      }
                      className="w-full"
                    >
                      <option value="APPROVED">Đã duyệt áp dụng (APPROVED)</option>
                      <option value="DRAFT">Bản nháp (DRAFT)</option>
                      <option value="ARCHIVED">Lưu trữ / Ngưng dùng (ARCHIVED)</option>
                    </Select>
                  </Field>
                </div>

                {/* Cờ quản trị của Trưởng phòng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-sunken border border-line">
                  <label className="flex items-center gap-2 text-xs text-ink font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tplForm.isDefaultForCategory}
                      onChange={(e) =>
                        setTplForm((prev) => ({
                          ...prev,
                          isDefaultForCategory: e.target.checked,
                        }))
                      }
                      className="rounded border-line"
                    />
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Đặt làm mẫu mặc định khi chọn nhóm kịch bản này</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-ink font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tplForm.isLockedByManager}
                      onChange={(e) =>
                        setTplForm((prev) => ({
                          ...prev,
                          isLockedByManager: e.target.checked,
                        }))
                      }
                      className="rounded border-line"
                    />
                    {tplForm.isLockedByManager ? (
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    )}
                    <span>Khóa cấu trúc mẫu chuẩn (Chuyên viên không tự ý sửa khung gốc)</span>
                  </label>
                </div>

                {/* Thanh chèn nhanh biến động vào mẫu */}
                <div className="p-2.5 rounded-lg bg-sunken/70 border border-line space-y-1.5">
                  <div className="text-2xs font-semibold text-ink-2">
                    Chèn trường dữ liệu vào nội dung:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {KOC_EMAIL_MERGE_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertTokenIntoTemplateForm(v.token, 'BODY')}
                        className="px-2 py-0.5 rounded text-2xs font-mono bg-surface border border-line text-ink hover:border-ink transition-colors"
                        title={`${v.label} — VD: ${v.sample}`}
                      >
                        {v.token}{' '}
                        <span className="font-sans text-ink-3">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Tiêu đề thư mẫu (Subject Template)">
                  <Input
                    value={tplForm.subjectTemplate}
                    onChange={(e) =>
                      setTplForm((prev) => ({
                        ...prev,
                        subjectTemplate: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Nội dung thư mẫu (Body Template)">
                  <Textarea
                    rows={12}
                    value={tplForm.bodyTemplate}
                    onChange={(e) =>
                      setTplForm((prev) => ({
                        ...prev,
                        bodyTemplate: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: CẤU HÌNH LARK MAIL / MÁY CHỦ GỬI MAIL & NHẬT KÝ ĐÃ GỬI    */}
        {/* ================================================================= */}
        {activeTab === 'SETTINGS_LOGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Cấu hình đầu mối gửi mail bên trái (5 cột) */}
            <div className="lg:col-span-5 min-w-0 p-3.5 rounded-xl border border-line bg-surface space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <Settings className="w-4 h-4 text-ink-2" />
                  <span>Cấu hình Kết nối Lark Mail & Máy chủ Gửi Thư</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isTestingConnection}
                  onClick={() => void handleTestMailConnection()}
                >
                  {isTestingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </Button>
              </div>

              {testResultBanner && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {testResultBanner}
                </div>
              )}

              <Field label="Phương thức kết nối gửi mail trực tiếp">
                <Select
                  value={configDraft.deliveryMode}
                  onChange={(e) =>
                    setConfigDraft((prev) => ({
                      ...prev,
                      deliveryMode: e.target.value as EmailDeliveryMode,
                    }))
                  }
                  className="w-full"
                >
                  <option value="LARK_SMTP">
                    Lark Mail SMTP (smtp.larksuite.com:465 — Mật khẩu ứng dụng Lark)
                  </option>
                  <option value="LARK_OPEN_API">
                    Lark Open Platform API & AnyCross Webhook (UpBase Lark App)
                  </option>
                  <option value="WEBHOOK_GMAIL">
                    Google Apps Script / Webhook Gmail Phòng Booking
                  </option>
                  <option value="RESEND_API">
                    Resend Email API (Gửi hàng loạt qua tên miền upbase.vn)
                  </option>
                  <option value="SMTP_RELAY">
                    Máy chủ SMTP khác / Gmail App Password
                  </option>
                </Select>
              </Field>

              {/* Khối cấu hình chuyên biệt cho LARK MAIL SMTP */}
              {configDraft.deliveryMode === 'LARK_SMTP' && (
                <div className="p-3 rounded-lg bg-sunken border border-line space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      Thiết lập tài khoản Lark Mail SMTP (SSL/TLS)
                    </span>
                    <a
                      href="https://mail.larksuite.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-2xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      <span>Mở Lark Mail Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Field label="Địa chỉ Email Lark (@upbase.vn)">
                      <Input
                        value={configDraft.larkMailboxEmail || ''}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkMailboxEmail: e.target.value,
                            senderEmail: e.target.value || prev.senderEmail,
                          }))
                        }
                        placeholder="booking.b2c@upbase.vn"
                      />
                    </Field>
                    <Field label="Mật khẩu ứng dụng Lark Mail (16 ký tự)">
                      <Input
                        type="password"
                        value={configDraft.larkAppPassword || ''}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkAppPassword: e.target.value,
                          }))
                        }
                        placeholder="Nhập Dedicated Password..."
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Field label="Lark SMTP Server">
                      <Input
                        value={configDraft.larkSmtpHost || 'smtp.larksuite.com'}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkSmtpHost: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Cổng SSL (Port)">
                      <Input
                        type="number"
                        value={configDraft.larkSmtpPort || 465}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkSmtpPort: Number(e.target.value) || 465,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* Khối cấu hình chuyên biệt cho LARK OPEN PLATFORM API / ANYCROSS */}
              {configDraft.deliveryMode === 'LARK_OPEN_API' && (
                <div className="p-3 rounded-lg bg-sunken border border-line space-y-2.5">
                  <div className="text-xs font-semibold text-ink">
                    Kết nối qua Lark Open Platform API / Lark AnyCross
                  </div>

                  <Field label="Hòm thư Lark nguồn (Mailbox gửi thư)">
                    <Input
                      value={configDraft.larkMailboxEmail || ''}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          larkMailboxEmail: e.target.value,
                          senderEmail: e.target.value || prev.senderEmail,
                        }))
                      }
                      placeholder="booking.b2c@upbase.vn"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Field label="Lark App ID (Mặc định UpBase)">
                      <Input
                        value={configDraft.larkAppId || 'cli_aa45bfd4edf85f05'}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkAppId: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Lark App Secret (Để trống dùng mặc định)">
                      <Input
                        type="password"
                        value={configDraft.larkAppSecret || ''}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            larkAppSecret: e.target.value,
                          }))
                        }
                        placeholder="Đã tích hợp sẵn trong máy chủ..."
                      />
                    </Field>
                  </div>

                  <Field label="URL Webhook Lark AnyCross / Lark Base Automation (Tùy chọn)">
                    <Input
                      value={configDraft.larkAnycrossWebhookUrl || ''}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          larkAnycrossWebhookUrl: e.target.value,
                        }))
                      }
                      placeholder="https://open.larksuite.com/anycross/trigger/callback/..."
                    />
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="Tên hiển thị người gửi">
                  <Input
                    value={configDraft.senderName}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({ ...prev, senderName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Email gửi đi chính thức">
                  <Input
                    value={configDraft.senderEmail}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({ ...prev, senderEmail: e.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="Email nhận phản hồi (Reply-To)">
                  <Input
                    value={configDraft.replyToEmail}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({ ...prev, replyToEmail: e.target.value }))
                    }
                  />
                </Field>
                <Field label="CC mặc định (Trưởng phòng / Leader)">
                  <Input
                    value={configDraft.defaultCcEmails}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        defaultCcEmails: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              {configDraft.deliveryMode === 'WEBHOOK_GMAIL' && (
                <Field label="URL Webhook Google Apps Script (Để trống nếu dùng Mở Gmail Web)">
                  <Input
                    value={configDraft.webhookUrl}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({ ...prev, webhookUrl: e.target.value }))
                    }
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </Field>
              )}

              {configDraft.deliveryMode === 'RESEND_API' && (
                <Field label="Khóa API Resend (re_...)">
                  <Input
                    type="password"
                    value={configDraft.resendApiKey}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({ ...prev, resendApiKey: e.target.value }))
                    }
                    placeholder="re_123456789..."
                  />
                </Field>
              )}

              {configDraft.deliveryMode === 'SMTP_RELAY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="SMTP Host">
                    <Input
                      value={configDraft.smtpHost}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({ ...prev, smtpHost: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="SMTP Port">
                    <Input
                      type="number"
                      value={configDraft.smtpPort}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          smtpPort: Number(e.target.value) || 587,
                        }))
                      }
                    />
                  </Field>
                </div>
              )}

              <Field label="Webhook Bot Nhóm Chat Lark B2C (Báo tự động vào nhóm khi gửi xong)">
                <Input
                  value={configDraft.larkNotifyBotWebhookUrl || ''}
                  onChange={(e) =>
                    setConfigDraft((prev) => ({
                      ...prev,
                      larkNotifyBotWebhookUrl: e.target.value,
                    }))
                  }
                  placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                />
              </Field>

              <Field label="Chữ ký chuẩn cuối thư ({{chu_ky_phong}})">
                <Textarea
                  rows={4}
                  value={configDraft.signatureBlock}
                  onChange={(e) =>
                    setConfigDraft((prev) => ({
                      ...prev,
                      signatureBlock: e.target.value,
                    }))
                  }
                />
              </Field>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-sunken border border-line text-xs text-ink font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={configDraft.autoUpdateSheetStatusOnSend}
                  onChange={(e) =>
                    setConfigDraft((prev) => ({
                      ...prev,
                      autoUpdateSheetStatusOnSend: e.target.checked,
                    }))
                  }
                  className="rounded border-line"
                />
                <span>
                  Tự động đổi Cột Q (Trạng thái) trên Sheet sang &ldquo;Đang liên hệ&rdquo; sau khi gửi mail
                </span>
              </label>
            </div>

            {/* Nhật ký gửi thư mời KOC bên phải (7 cột) */}
            <div className="lg:col-span-7 border border-line rounded-xl overflow-hidden bg-surface flex flex-col">
              <div className="p-3 bg-sunken border-b border-line flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <History className="w-4 h-4 text-ink-2" />
                  <span>Nhật ký Gửi Thư Mời Hợp Tác KOC ({emailState.logs.length} lượt)</span>
                </div>
              </div>

              <div className="divide-y divide-line max-h-[560px] overflow-y-auto">
                {emailState.logs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    Chưa có lượt gửi thư mời hợp tác nào được ghi nhận.
                  </div>
                ) : (
                  emailState.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 hover:bg-sunken/40 transition-colors space-y-1.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">
                            {log.tenKenh || log.idKenh}
                          </span>
                          <span className="font-mono text-2xs text-ink-3">
                            @{normalizeTikTokId(log.idKenh)}
                          </span>
                          <span className="text-2xs text-ink-3">→</span>
                          <span className="font-mono text-xs text-accent">
                            {log.recipientEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Status
                            tone={
                              log.deliveryStatus === 'FAILED' ? 'critical' : 'positive'
                            }
                          >
                            {log.channelMethod === 'SYSTEM_DIRECT'
                              ? 'Đã gửi qua Lark / Hệ thống'
                              : log.channelMethod === 'LARK_MAIL_WEB'
                                ? 'Mở Lark Mail'
                                : log.channelMethod === 'GMAIL_WEB'
                                  ? 'Mở Gmail Web'
                                  : log.channelMethod === 'MAILTO_CLIENT'
                                    ? 'Mở App Mail'
                                    : log.channelMethod === 'ZALO_CHAT'
                                      ? 'Mở Zalo Chat'
                                      : 'Đã Copy thư'}
                          </Status>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FileText}
                            onClick={() =>
                              setInspectingLog(
                                inspectingLog?.id === log.id ? null : log
                              )
                            }
                          >
                            {inspectingLog?.id === log.id ? 'Ẩn thư' : 'Xem thư'}
                          </Button>
                        </div>
                      </div>

                      <div className="text-2xs text-ink-2 font-medium truncate">
                        Tiêu đề: {log.subject}
                      </div>

                      <div className="text-2xs text-ink-3 flex flex-wrap items-center gap-2">
                        <span>Gian hàng: {log.storeName}</span>
                        <span>·</span>
                        <span>Mẫu: {log.templateName}</span>
                        <span>·</span>
                        <span>Người gửi: {log.sentBy}</span>
                        <span>·</span>
                        <span>
                          Thời gian: {new Date(log.sentAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {inspectingLog?.id === log.id && (
                        <pre className="mt-2 p-2.5 rounded-lg bg-sunken border border-line text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed">
                          {log.body}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
