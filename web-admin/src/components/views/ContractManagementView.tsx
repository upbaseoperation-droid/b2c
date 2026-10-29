'use client';

/**
 * Hợp đồng: danh sách hồ sơ → hồ sơ chi tiết → form tạo/sửa theo mẫu pháp chế,
 * kèm Quản lý danh mục & biểu mẫu hợp đồng chuẩn của Pháp chế.
 * Dữ liệu và quyền lấy từ máy chủ (/api/contracts); giao diện không tự cấp quyền.
 * Từ màn Booking, nút “HĐ” mở hồ sơ của booking đó, chưa có thì mở form tạo đã điền sẵn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FilePlus2, FileText, FolderKanban, Plus, RefreshCw, Upload } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, DocBlock, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import { Button, Chips, DataTable, EmptyState, FilterBar, Modal, PageActions, Pagination, Panel, Person, Segmented, Stat, StatRow, Status } from '../ui';
import type { Column } from '../ui';
import { ApiError, contractApi, type ContractBootstrap } from '../contracts/api';
import { browserDemoEnabled, downloadBrowserDemo, enableBrowserDemo } from '../contracts/browserDemo';
import { computeSigningProgress, contractStatus, isAcceptance, OFFICIAL_3STAGE_TEMPLATE_IDS, resolveActiveLegalProfile } from '../contracts/contractUi';
import { ContractCatalogView, CATEGORY_LABELS } from '../contracts/ContractCatalogView';
import { ContractDetail } from '../contracts/ContractDetail';
import { ContractDocumentViewer } from '../contracts/ContractDocumentViewer';
import { ContractForm, type ContractFormInit, type ContractFormPayload } from '../contracts/ContractForm';
import { ContractSetReconciliationView } from '../contracts/ContractSetReconciliationView';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { detectSubjectKind } from '../../lib/contracts/contractRules';
import { documentOfTemplate, type ContractDocument } from '../../lib/planDealLink';

/** Yêu cầu mở hồ sơ của một booking hoặc KOC / Hồ sơ pháp lý (từ màn Booking hoặc Danh bạ KOC). `nonce` đổi mỗi lần bấm. */
export interface ContractIntent {
  dealId?: string;
  deal?: BookingDealItem;
  kocId?: string;
  legalProfileId?: string;
  nonce: number;
  /** Loại tài liệu cần mở hoặc soạn của deal/KOC: hợp đồng nguyên tắc, SOW hoặc biên bản nghiệm thu. */
  document?: ContractDocument;
  fromBooking?: boolean;
}

type Screen =
  | { mode: 'list' }
  | { mode: 'sets' }
  | { mode: 'catalog' }
  | { mode: 'detail'; id: string }
  | { mode: 'form'; editId?: string; init?: ContractFormInit };
type Filter = 'ALL' | 'MINE' | 'REVIEW' | 'SIGN' | 'DONE' | 'NEED_ACCEPTANCE';

export function ContractManagementView({
  deals = [],
  kocs = [],
  intent,
  onNotify,
  onSyncDealContractStatus,
  onBackToBooking,
  demoMode = false,
  currentUserId,
}: {
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  intent?: ContractIntent | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSyncDealContractStatus?: (dealId: string, patch: Partial<BookingDealItem>) => void;
  onBackToBooking?: () => void;
  demoMode?: boolean;
  currentUserId?: string;
}) {
  const effectiveDeals = useMemo(() => {
    if (!intent?.deal) return deals;
    return deals.some(d => d.id === intent.deal!.id)
      ? deals.map(d => (d.id === intent.deal!.id ? intent.deal! : d))
      : [intent.deal, ...deals];
  }, [deals, intent]);
  const [data, setData] = useState<ContractBootstrap | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [quickViewRecord, setQuickViewRecord] = useState<ContractRecord | null>(null);
  const [quickViewDoc, setQuickViewDoc] = useState<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> } | null>(null);
  const quickViewRecordId = quickViewRecord?.id || '';
  const [prevQuickViewRecordId, setPrevQuickViewRecordId] = useState(quickViewRecordId);
  if (quickViewRecordId !== prevQuickViewRecordId) {
    setPrevQuickViewRecordId(quickViewRecordId);
    setQuickViewDoc(null);
  }
  const [isContractReportOpen, setIsContractReportOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (demoMode) enableBrowserDemo();
    const result = await contractApi<ContractBootstrap>('/api/contracts');
    setData(result); setLoadError(null); return result;
  }, [demoMode]);

  useEffect(() => {
    (async () => {
      if (currentUserId?.startsWith('contract-demo-')) {
        await contractApi('/api/contracts/demo', { id: currentUserId }).catch(() => undefined);
      } else if (process.env.NODE_ENV === 'development') {
        await contractApi('/api/auth/me').catch(() => undefined);
      }
      await refresh();
    })().catch(e => setLoadError(e instanceof ApiError ? e : new ApiError((e as Error).message, 503)));
  }, [refresh, currentUserId]);

  // Tải văn bản hợp đồng khi bấm Xem nhanh trên bảng danh sách
  useEffect(() => {
    // quickViewDoc cleared during render when quickViewRecordId changes
    if (!quickViewRecord) return;
    let cancelled = false;
    contractApi<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> }>(`/api/contracts/${quickViewRecord.id}/document?preview=1`)
      .then(r => { if (!cancelled) setQuickViewDoc(r); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [quickViewRecord]);

  // Mở theo booking hoặc KOC / Hồ sơ pháp lý khi được gọi từ màn Booking hoặc Danh bạ KOC.
  const [handledIntent, setHandledIntent] = useState<number | null>(null);
  if (intent && data && handledIntent !== intent.nonce) {
    setHandledIntent(intent.nonce);
    const latest = (rs: ContractRecord[]) => [...rs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (intent.kocId && !intent.dealId) {
      const koc = kocs.find(k => k.id === intent.kocId);
      const activeProf = resolveActiveLegalProfile(koc, undefined, intent.legalProfileId);
      const baseSubject = detectSubjectKind(koc);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const doc = intent.document || 'HDNT';
      const templateId = doc === 'HDNT' ? `${subject}-HDNT` : doc === 'SOW' ? `${subject}-SOW` : `${subject}-VID-BBNT`;
      setScreen({
        mode: 'form',
        init: {
          kocId: intent.kocId,
          legalProfileId: intent.legalProfileId || activeProf?.id,
          kind: doc === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT',
          docStage: doc,
          templateId,
        },
      });
    } else if (intent.document) {
      // Deal của kế hoạch: mở hồ sơ đã có của đúng loại tài liệu, chưa có thì mở form soạn theo mẫu bản mới
      const doc = intent.document;
      const deal = intent.deal || effectiveDeals.find(d => d.id === intent.dealId);
      const koc = kocs.find(k => k.id === (intent.kocId || deal?.kocId));
      const activeProf = resolveActiveLegalProfile(koc, deal, intent.legalProfileId || deal?.legalProfileId);
      const baseSubject = detectSubjectKind(koc, deal);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const sameDeal = (r: ContractRecord) => r.dealId === intent.dealId || Boolean(deal?.dealCode && r.dealCode === deal.dealCode);
      const sameKocForDoc = (r: ContractRecord) => sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId);
      const existing = latest(data.records.filter(r => documentOfTemplate(r.templateId) === doc && (doc === 'HDNT' ? sameKocForDoc(r) : sameDeal(r))));
      if (existing) setScreen({ mode: 'detail', id: existing.id });
      else {
        const templateId = doc === 'HDNT' ? `${subject}-HDNT` : doc === 'SOW' ? `${subject}-SOW` : `${subject}-VID-BBNT`;
        if (!data.templates.some(t => t.id === templateId)) {
          onNotify?.(subject === 'CTV' && doc === 'SOW' ? 'KOC thuộc nhóm CTV kênh không có SOW, chỉ có hợp đồng nguyên tắc và biên bản nghiệm thu theo tháng.' : `Chưa có mẫu ${templateId} trong danh mục biểu mẫu.`, 'warning');
          setScreen({ mode: 'list' });
        } else {
          const sameKoc = (r: ContractRecord) => sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId);
          const framework = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'HDNT' && sameKoc(r)));
          const sow = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'SOW' && sameDeal(r)));
          const parentId = doc === 'SOW' ? framework?.id : doc === 'BBNT' ? sow?.id || framework?.id : undefined;
          setScreen({ mode: 'form', init: { dealId: intent.dealId, kocId: intent.kocId || deal?.kocId, legalProfileId: intent.legalProfileId || deal?.legalProfileId || activeProf?.id, kind: doc === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT', docStage: doc, templateId, parentId } });
        }
      }
    } else {
      const deal = intent.deal || effectiveDeals.find(d => d.id === intent.dealId);
      const sameDeal = (r: ContractRecord) => r.dealId === intent.dealId || Boolean(deal?.dealCode && r.dealCode === deal.dealCode);
      const existing = latest(data.records.filter(r => sameDeal(r) && !isAcceptance(r.templateId)));
      const koc = kocs.find(k => k.id === (intent.kocId || deal?.kocId));
      const activeProf = resolveActiveLegalProfile(koc, deal, intent.legalProfileId || deal?.legalProfileId);
      const baseSubject = detectSubjectKind(koc, deal);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const framework = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'HDNT' && (sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId))));
      const nextStage = subject === 'CTV' ? 'HDNT' : 'SOW';
      const nextTemplateId = nextStage === 'SOW' ? `${subject}-SOW` : `${subject}-HDNT`;
      setScreen(
        existing
          ? { mode: 'detail', id: existing.id }
          : {
              mode: 'form',
              init: {
                dealId: intent.dealId,
                kocId: intent.kocId || deal?.kocId,
                legalProfileId: intent.legalProfileId || deal?.legalProfileId || activeProf?.id,
                kind: 'CONTRACT',
                docStage: nextStage,
                templateId: nextTemplateId,
                parentId: framework?.id,
              },
            },
      );
    }
  }

  const record = screen.mode === 'detail' || (screen.mode === 'form' && screen.editId)
    ? data?.records.find(r => r.id === (screen.mode === 'detail' ? screen.id : screen.editId))
    : undefined;

  /** Gửi một thao tác lên máy chủ. Thành công: tải lại, mở hồ sơ, báo bằng toast. */
  const act = async (payload: Record<string, unknown>, done = 'Đã cập nhật hồ sơ') => {
    setBusy(true);
    try {
      const result = await contractApi<{ record: ContractRecord }>('/api/contracts', { id: record?.id, revision: record?.revision, ...payload });
      await refresh();
      if ((result.record.dealId || result.record.dealCode) && onSyncDealContractStatus) {
        const docKind = documentOfTemplate(result.record.templateId);
        const isCompleted = result.record.signing.at(-1)?.status === 'COMPLETED';
        const vMap = result.record.values || {};
        const docDate = vMap['token:[DDMMYY]'] || vMap['token:[DD/MM/YYYY]'] || '';
        const kocCode = vMap['token:[ID KOC]'] || result.record.dealCode || 'KOC';
        const targetDealId = result.record.dealId || effectiveDeals.find(d => d.dealCode === result.record.dealCode)?.id || result.record.dealCode || '';
        const signedUrl =
          result.record.signing.at(-1)?.signedFileUrl ||
          result.record.contractSystem?.signedFileUrl ||
          (isCompleted ? `/api/contracts/${result.record.id}/document?version=${result.record.version}` : undefined);
        if (docKind === 'SOW') {
          onSyncDealContractStatus(targetDealId, {
            dealCode: result.record.dealCode,
            contractAppendixCode:
              result.record.contractSystem?.contractCode || `PL01-${docDate || '26'}/${kocCode}`,
            contractAppendixStatus: isCompleted ? 'ĐÃ_KÝ' : 'CHỜ_KÝ',
            contractAppendixGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
            contractAppendixSignedUrl: signedUrl,
          });
        } else if (docKind === 'HDNT') {
          onSyncDealContractStatus(targetDealId, {
            dealCode: result.record.dealCode,
            masterContractCode:
              result.record.contractSystem?.contractCode || `${docDate || '26'}/${kocCode}/HĐNT-UPB`,
            masterContractStatus: isCompleted ? 'ĐÃ_KÝ' : 'CHỜ_KÝ',
            masterContractGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
            masterContractSignedUrl: signedUrl,
          });
        } else if (docKind === 'BBNT') {
          onSyncDealContractStatus(targetDealId, {
            dealCode: result.record.dealCode,
            bbntCode:
              result.record.contractSystem?.contractCode || `BBNT-${docDate || '26'}/${kocCode}`,
            bbntStatus: isCompleted ? 'ĐÃ_KÝ' : 'CHỜ_KÝ',
            bbntGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
            bbntSignedUrl: signedUrl,
          });
        }
      }
      setScreen({ mode: 'detail', id: result.record.id });
      onNotify?.(done, 'success');
      return result.record;
    } catch (e) {
      onNotify?.((e as Error).message, 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  // Đang xem hồ sơ có luồng ký thật: đọc lại tiến độ mỗi 2 phút (máy chủ chỉ ghi khi có thay đổi).
  useEffect(() => {
    const s = record?.signing.at(-1);
    if (screen.mode !== 'detail' || !data?.config.wesign || !s || s.provider === 'DEMO' || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(s.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || busy) return;
      contractApi('/api/contracts', { id: record!.id, revision: record!.revision, action: 'SYNC_WESIGN' }).then(() => refresh()).catch(() => undefined);
    }, 120000);
    return () => clearInterval(timer);
  }, [screen.mode, record, data?.config.wesign, busy, refresh]);

  const me = data?.actor;
  const waitingMe = (r: ContractRecord) => r.approval === 'IN_REVIEW' && r.steps.some(s => s.reviewerId === me?.id && s.status === 'PENDING');
  const awaitingSign = (r: ContractRecord) => r.approval === 'APPROVED' && r.signing.at(-1)?.status !== 'COMPLETED';
  const done = (r: ContractRecord) => r.signing.at(-1)?.status === 'COMPLETED';
  const needAcceptance = (r: ContractRecord) =>
    r.signing.at(-1)?.status === 'COMPLETED' &&
    !isAcceptance(r.templateId) &&
    !(r.templateId.endsWith('-HDNT') && r.templateId !== 'CTV-HDNT') &&
    !(data?.records || []).some(child => child.parentId === r.id);

  const matches: Record<Filter, (r: ContractRecord) => boolean> = {
    ALL: () => true,
    MINE: r => r.ownerId === me?.id,
    REVIEW: waitingMe,
    SIGN: awaitingSign,
    DONE: done,
    NEED_ACCEPTANCE: needAcceptance,
  };

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.records || []).filter(r => !q || `${r.title} ${r.brand} ${r.partner} ${r.dealCode || ''}`.toLowerCase().includes(q));
  }, [data, search]);
  const rows = searched.filter(matches[filter]);
  const pageSize = 20;
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

  const chips = (['ALL', 'MINE', 'REVIEW', 'SIGN', 'DONE', 'NEED_ACCEPTANCE'] as Filter[]).map(key => ({
    key,
    label: {
      ALL: 'Tất cả',
      MINE: 'Của tôi',
      REVIEW: 'Chờ tôi duyệt',
      SIGN: 'Chờ ký',
      DONE: 'Đã ký',
      NEED_ACCEPTANCE: 'Cần lập nghiệm thu',
    }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ & Giai đoạn',
      width: 230,
      render: r => {
        const tpl = data?.templates.find(t => t.id === r.templateId);
        const docStage = documentOfTemplate(r.templateId);
        const stageBadge =
          docStage === 'HDNT'
            ? { label: '1. HĐNT Khung', cls: 'bg-sunken border-line text-ink-2' }
            : docStage === 'SOW'
              ? { label: '2. Phụ lục SOW', cls: 'bg-accent-soft/50 border-accent/30 text-accent' }
              : { label: '3. Nghiệm thu BBNT', cls: 'bg-positive-soft/60 border-positive/30 text-positive' };
        return (
          <div className="min-w-0 max-w-[270px] leading-tight space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${stageBadge.cls}`}>
                {stageBadge.label}
              </span>
              <span className="block truncate font-semibold text-ink">{r.title}</span>
            </div>
            <span className="block truncate text-2xs text-ink-3">
              {r.isKocOwnForm && r.customFile ? `Tệp KOC: ${r.customFile.filename}` : (tpl?.name || r.templateId)} · v{r.version}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: 'Đối tác KOC · Booking',
      width: 170,
      render: r => (
        <div className="min-w-0 max-w-[210px] leading-tight space-y-0.5">
          <span className="block truncate font-medium text-ink">{r.partner}</span>
          <span className="block truncate text-2xs text-ink-3">
            {r.brand}
            {r.dealCode ? (
              <>
                {' · '}
                <span className="font-code font-medium text-ink-2">{r.dealCode}</span>
              </>
            ) : (
              ' · Hợp đồng khung'
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'links',
      header: 'Mã HĐ / PL / BBNT & Đường link',
      width: 215,
      render: r => {
        const code = r.contractSystem?.contractCode || r.signing.at(-1)?.contractCode || r.title;
        const parentCode = r.contractSystem?.parentContractCode;
        const gdocsUrl = r.contractSystem?.googleDocsUrl;
        const docxUrl = r.contractSystem?.exportedDocxUrl || `/api/contracts/${r.id}/document?version=${r.version}`;
        const signedUrl =
          r.signing.at(-1)?.signedFileUrl ||
          r.contractSystem?.signedFileUrl ||
          (r.signing.at(-1)?.status === 'COMPLETED' ? `/api/contracts/${r.id}/document?version=${r.version}` : undefined);
        return (
          <div className="min-w-0 max-w-[225px] leading-tight space-y-1" onClick={e => e.stopPropagation()}>
            <div className="font-code text-xs font-semibold text-ink truncate" title={code}>
              {code}
            </div>
            {parentCode && (
              <div className="font-code text-2xs text-ink-3 truncate" title={`Kế thừa: ${parentCode}`}>
                Kế thừa: {parentCode}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-2xs">
              {gdocsUrl && (
                <a
                  href={gdocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  Google Docs ↗
                </a>
              )}
              <a
                href={docxUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink-2 hover:text-ink hover:underline"
              >
                File .docx ↗
              </a>
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-positive hover:underline"
                >
                  Bản đã ký ↗
                </a>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái duyệt',
      width: 130,
      render: r => {
        const s = contractStatus(r);
        return (
          <div className="grid gap-0.5 justify-items-start leading-tight">
            <Status tone={s.tone}>{s.label}</Status>
            {s.note && <span className="text-2xs text-ink-3 truncate max-w-[130px]">{s.note}</span>}
          </div>
        );
      },
    },
    {
      key: 'signing',
      header: 'Ký số 2 bên (weSign)',
      width: 185,
      render: r => {
        const attempt = r.signing.at(-1);
        const prog = computeSigningProgress(attempt);
        if (!attempt || !prog) {
          return (
            <span className="text-2xs text-ink-3">
              {r.approval === 'APPROVED' ? 'Sẵn sàng trình ký' : 'Chưa trình ký'}
            </span>
          );
        }
        const pA = attempt.people[0];
        const pB = attempt.people[1];
        const aDone = pA?.action === 2 || attempt.status === 'COMPLETED';
        const bDone = pB?.action === 2 || attempt.status === 'COMPLETED';
        return (
          <div className="grid gap-1 min-w-[155px] max-w-[190px] leading-tight">
            <div className="flex items-center justify-between gap-1 text-2xs">
              <div className="flex items-center gap-1">
                <span
                  className={`px-1.5 py-0.5 rounded border text-2xs font-medium ${
                    aDone ? 'border-positive/30 bg-positive-soft text-positive' : 'border-line bg-sunken text-ink-3'
                  }`}
                >
                  Bên A {aDone ? '✓' : '…'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border text-2xs font-medium ${
                    bDone ? 'border-positive/30 bg-positive-soft text-positive' : 'border-line bg-sunken text-ink-3'
                  }`}
                >
                  Bên B {bDone ? '✓' : '…'}
                </span>
              </div>
              <span className="font-code text-ink-2 tabular-nums">{prog.progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
              <div
                className={`h-full ${
                  attempt.status === 'COMPLETED'
                    ? 'bg-positive'
                    : attempt.status === 'REJECTED'
                      ? 'bg-critical'
                      : 'bg-accent'
                }`}
                style={{ width: `${Math.max(6, prog.progressPercent)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    { key: 'owner', header: 'Người phụ trách', width: 130, render: r => <Person name={r.ownerName} size={20} /> },
    { key: 'updated', header: 'Cập nhật', width: 85, align: 'right', render: r => <span className="text-ink-2 tabular-nums text-xs">{formatDate(r.updatedAt)}</span> },
    {
      key: 'preview',
      header: 'Thao tác nhanh',
      width: 175,
      align: 'right',
      render: r => {
        const isSigned = r.signing.at(-1)?.status === 'COMPLETED';
        const isSow = documentOfTemplate(r.templateId) === 'SOW';
        const isHdnt = r.templateId.endsWith('-HDNT') && r.templateId !== 'CTV-HDNT';
        const hasChild = (data?.records || []).some(c => c.parentId === r.id);
        return (
          <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setQuickViewRecord(r)}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-2xs font-medium text-ink hover:bg-sunken"
            >
              <Eye className="w-3.5 h-3.5 text-accent" />
              Xem A4
            </button>
            {!isSigned && (data?.demoActors.length ?? 0) > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await contractApi<{ record: ContractRecord }>('/api/contracts', {
                      id: r.id,
                      revision: r.revision,
                      action: 'DEMO_FAST_SIGN',
                    });
                    await refresh();
                    if ((result.record.dealId || result.record.dealCode) && onSyncDealContractStatus) {
                      const docKind = documentOfTemplate(result.record.templateId);
                      const vMap = result.record.values || {};
                      const docDate = vMap['token:[DDMMYY]'] || vMap['token:[DD/MM/YYYY]'] || '';
                      const kocCode = vMap['token:[ID KOC]'] || result.record.dealCode || 'KOC';
                      const targetDealId =
                        result.record.dealId ||
                        effectiveDeals.find(d => d.dealCode === result.record.dealCode)?.id ||
                        result.record.dealCode ||
                        '';
                      const signedUrl =
                        result.record.signing.at(-1)?.signedFileUrl ||
                        result.record.contractSystem?.signedFileUrl ||
                        `/api/contracts/${result.record.id}/document?version=${result.record.version}`;
                      if (docKind === 'SOW') {
                        onSyncDealContractStatus(targetDealId, {
                          dealCode: result.record.dealCode,
                          contractAppendixCode:
                            result.record.contractSystem?.contractCode || `PL01-${docDate || '26'}/${kocCode}`,
                          contractAppendixStatus: 'ĐÃ_KÝ',
                          contractAppendixGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
                          contractAppendixSignedUrl: signedUrl,
                        });
                      } else if (docKind === 'HDNT') {
                        onSyncDealContractStatus(targetDealId, {
                          dealCode: result.record.dealCode,
                          masterContractCode:
                            result.record.contractSystem?.contractCode || `${docDate || '26'}/${kocCode}/HĐNT-UPB`,
                          masterContractStatus: 'ĐÃ_KÝ',
                          masterContractGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
                          masterContractSignedUrl: signedUrl,
                        });
                      } else if (docKind === 'BBNT') {
                        onSyncDealContractStatus(targetDealId, {
                          dealCode: result.record.dealCode,
                          bbntCode:
                            result.record.contractSystem?.contractCode || `BBNT-${docDate || '26'}/${kocCode}`,
                          bbntStatus: 'ĐÃ_KÝ',
                          bbntGoogleDocsUrl: result.record.contractSystem?.googleDocsUrl,
                          bbntSignedUrl: signedUrl,
                        });
                      }
                    }
                    onNotify?.(
                      isSow
                        ? `Đã ký đủ 2 bên Phụ lục SOW (${r.title}) — Đã khóa cấu hình Deal`
                        : `Đã ký đủ 2 bên (${r.title})`,
                      'success',
                    );
                  } catch (err) {
                    onNotify?.((err as Error).message, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-positive/40 bg-positive-soft/70 px-2 py-1 text-2xs font-semibold text-positive hover:bg-positive-soft"
                title="Xác nhận đã ký đủ 2 bên (Bên A & Bên B)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ký 2 bên
              </button>
            )}
            {isSigned && isHdnt && (
              <button
                type="button"
                onClick={() =>
                  setScreen({
                    mode: 'form',
                    init: {
                      dealId: r.dealId,
                      kocId: r.kocId,
                      kind: 'CONTRACT',
                      docStage: 'SOW',
                      parentId: r.id,
                      templateId: r.templateId.replace(/-HDNT$/, '-SOW'),
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent-soft/60 px-2 py-1 text-2xs font-semibold text-accent hover:bg-accent-soft"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Lập SOW
              </button>
            )}
            {isSigned && isSow && !hasChild && (
              <button
                type="button"
                onClick={() =>
                  setScreen({
                    mode: 'form',
                    init: {
                      dealId: r.dealId,
                      kocId: r.kocId,
                      kind: 'ACCEPTANCE',
                      docStage: 'BBNT',
                      parentId: r.id,
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent-soft/60 px-2 py-1 text-2xs font-semibold text-accent hover:bg-accent-soft"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Lập BBNT
              </button>
            )}
          </div>
        );
      },
    },
  ];

  /* ------------------------------------------------------------ Render */

  if (loadError && !data) {
    return (
      <Panel>
        <EmptyState
          title={loadError.status === 401 ? 'Cần đăng nhập Lark để xem hợp đồng' : loadError.status === 403 ? 'Tài khoản chưa được cấp quyền hợp đồng' : 'Chưa tải được hợp đồng'}
          description={loadError.message}
          action={<div className="flex gap-2"><Button onClick={() => { enableBrowserDemo(); refresh().catch(() => undefined); }}>Mở bản giả lập</Button>{loadError.status === 401 ? <a href="/api/auth/lark/login?returnTo=/" className="text-[13px] text-accent hover:underline">Đăng nhập Lark</a> : <Button onClick={() => refresh().catch(() => undefined)}>Thử lại</Button>}</div>}
        />
      </Panel>
    );
  }
  if (!data) return <p className="text-[13px] text-ink-3 px-1">Đang tải hồ sơ hợp đồng…</p>;

  const canCreate = data.actor.roles.some(r => ['CREATOR', 'LEAD'].includes(r));

  return (
    <div className="space-y-3.5" onClickCapture={e => {
      if (!browserDemoEnabled()) return;
      const link = (e.target as HTMLElement).closest('a');
      if (link?.getAttribute('href')?.startsWith('/api/contracts/')) { e.preventDefault(); downloadBrowserDemo(link.getAttribute('href')!).catch(error => onNotify?.(error.message, 'error')); }
    }}>
      {(screen.mode === 'list' || screen.mode === 'sets' || screen.mode === 'catalog') && (
        <>
          <PageActions>
            {data.records.some(r => r.signing.length > 0 && r.signing.at(-1)!.provider !== 'DEMO' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.signing.at(-1)!.status)) && (
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await contractApi<{ syncedCount?: number; changedCount?: number }>('/api/contracts/integrations/wesign/sync', {});
                    await refresh();
                    onNotify?.(`Đã đồng bộ ${res.syncedCount ?? 0} luồng ký weSign (${res.changedCount ?? 0} cập nhật mới).`, 'success');
                  } catch (e) {
                    onNotify?.((e as Error).message, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Đồng bộ tiến độ weSign
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={FileText} onClick={() => setIsContractReportOpen(true)}>
              Kiểm tra điều khoản & thuế
            </Button>
            {canCreate && (
              <>
                <Button size="sm" variant="secondary" icon={Upload} onClick={() => setScreen({ mode: 'form', init: { isKocOwnForm: true } })}>
                  Tải hợp đồng (.docx)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileText}
                  onClick={() =>
                    setScreen({
                      mode: 'form',
                      init: { docStage: 'SOW', kind: 'CONTRACT', templateId: 'IND-SOW' },
                    })
                  }
                >
                  Ký Phụ lục SOW (Bắt đầu Deal)
                </Button>
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setScreen({ mode: 'form' })}>
                  Tạo hợp đồng
                </Button>
              </>
            )}
          </PageActions>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={
                screen.mode === 'catalog'
                  ? 'CATALOG'
                  : screen.mode === 'sets'
                    ? 'SETS'
                    : 'RECORDS'
              }
              onChange={v =>
                setScreen(
                  v === 'CATALOG'
                    ? { mode: 'catalog' }
                    : v === 'SETS'
                      ? { mode: 'sets' }
                      : { mode: 'list' },
                )
              }
              items={[
                { key: 'RECORDS', label: `Hồ sơ hợp đồng (${data.records.length})` },
                { key: 'SETS', label: 'Bộ hồ sơ & Chỉ số phụ thuộc (HĐNT ↔ SOW ↔ BBNT)' },
                { key: 'CATALOG', label: `Bộ 11 biểu mẫu chuẩn (${data.templates.filter(t => t.scope === 'KOC_CUSTOM' || OFFICIAL_3STAGE_TEMPLATE_IDS.includes(t.id as never)).length})` },
              ]}
            />
          </div>
        </>
      )}

      {screen.mode === 'catalog' ? (
        <ContractCatalogView
          data={data}
          onRefresh={refresh}
          onNotify={onNotify}
          onUseTemplate={(tpl: LegalTemplate) =>
            setScreen({ mode: 'form', init: { templateId: tpl.id, kind: tpl.kind } })
          }
        />
      ) : screen.mode === 'sets' ? (
        <ContractSetReconciliationView
          data={data}
          deals={effectiveDeals}
          kocs={kocs}
          busy={busy}
          onOpenRecord={id => setScreen({ mode: 'detail', id })}
          onQuickViewRecord={rec => setQuickViewRecord(rec)}
          onCreateStageDoc={init => setScreen({ mode: 'form', init })}
          onSyncRecordValues={async (targetRecord, nextValues) => {
            setBusy(true);
            try {
              await contractApi<{ record: ContractRecord }>('/api/contracts', {
                id: targetRecord.id,
                revision: targetRecord.revision,
                action: 'EDIT',
                title: targetRecord.title,
                brand: targetRecord.brand,
                partner: targetRecord.partner,
                templateId: targetRecord.templateId,
                values: nextValues,
                kocId: targetRecord.kocId,
                dealId: targetRecord.dealId,
                dealCode: targetRecord.dealCode,
                parentId: targetRecord.parentId,
                hasCustomTerms: targetRecord.hasCustomTerms,
                customTermsSummary: targetRecord.customTermsSummary,
                acceptanceScreenshots: targetRecord.acceptanceScreenshots,
              });
              await refresh();
              onNotify?.(`Đã đồng bộ chuẩn hóa chỉ số cho "${targetRecord.title}"`, 'success');
            } catch (err) {
              onNotify?.((err as Error).message, 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : screen.mode === 'form' ? (
        <ContractForm
          key={screen.editId || `new-${screen.init?.dealId || ''}-${screen.init?.kocId || ''}-${screen.init?.legalProfileId || ''}-${screen.init?.kind || ''}-${screen.init?.docStage || ''}-${screen.init?.parentId || ''}-${screen.init?.templateId || ''}-${screen.init?.isKocOwnForm ? 'koc' : 'std'}`}
          data={data}
          deals={effectiveDeals}
          kocs={kocs}
          record={screen.editId ? record : undefined}
          init={screen.init}
          busy={busy}
          onCancel={() => setScreen(screen.editId ? { mode: 'detail', id: screen.editId } : { mode: 'list' })}
          onBackToBooking={intent?.fromBooking ? onBackToBooking : undefined}
          onQuickFrameworkCreated={() => { void refresh(); }}
          onSave={(p: ContractFormPayload) => act({ action: screen.editId ? 'EDIT' : 'CREATE', ...p }, screen.editId ? 'Đã lưu phiên bản mới' : 'Đã lưu nháp hợp đồng')}
        />
      ) : screen.mode === 'detail' && record ? (
        (() => {
          const curIdx = rows.findIndex(r => r.id === record.id);
          const prevRec = curIdx > 0 ? rows[curIdx - 1] : undefined;
          const nextRec = curIdx >= 0 && curIdx < rows.length - 1 ? rows[curIdx + 1] : undefined;
          return (
            <ContractDetail
              key={record.id}
              record={record}
              data={data}
              deals={effectiveDeals}
              busy={busy}
              onBack={() => setScreen({ mode: 'list' })}
              onBackToBooking={intent?.fromBooking ? onBackToBooking : undefined}
              onPrev={prevRec ? () => setScreen({ mode: 'detail', id: prevRec.id }) : undefined}
              onNext={nextRec ? () => setScreen({ mode: 'detail', id: nextRec.id }) : undefined}
              positionLabel={curIdx >= 0 ? `${curIdx + 1}/${rows.length}` : undefined}
              onAction={act}
              onEdit={() => setScreen({ mode: 'form', editId: record.id })}
              onOpen={id => setScreen({ mode: 'detail', id })}
              onCreateAcceptance={() => setScreen({ mode: 'form', init: { dealId: record.dealId, kind: 'ACCEPTANCE', parentId: record.id } })}
              onCreateSow={() => setScreen({ mode: 'form', init: { dealId: record.dealId, kind: 'CONTRACT', parentId: record.id, templateId: record.templateId.replace(/-HDNT$/, '-SOW') } })}
              kocs={kocs}
            />
          );
        })()
      ) : (
        <div className="space-y-4">
          <StatRow>
            <Stat
              label="Tổng hồ sơ pháp lý"
              value={`${data.records.length} bộ`}
              note={`${data.records.filter(r => documentOfTemplate(r.templateId) === 'HDNT').length} HĐNT · ${data.records.filter(r => documentOfTemplate(r.templateId) === 'SOW').length} Phụ lục SOW · ${data.records.filter(r => documentOfTemplate(r.templateId) === 'BBNT').length} BBNT`}
            />
            <Stat
              label="Đang chờ duyệt nội bộ"
              value={`${data.records.filter(r => r.approval === 'IN_REVIEW').length} bộ`}
              tone={data.records.some(waitingMe) ? 'warning' : undefined}
              note={`${data.records.filter(waitingMe).length} hồ sơ đang chờ lượt duyệt của bạn`}
            />
            <Stat
              label="Đang trình ký weSign 2 bên"
              value={`${data.records.filter(awaitingSign).length} bộ`}
              tone={data.records.some(awaitingSign) ? 'warning' : undefined}
              note="Theo dõi chữ ký Bên A (UpBase) & Bên B (KOC)"
            />
            <Stat
              label="Đã ký hoàn tất"
              value={`${data.records.filter(done).length} bộ`}
              tone="positive"
              note={`${data.records.filter(needAcceptance).length} Phụ lục SOW đã ký chờ lập BBNT`}
            />
          </StatRow>

          <Panel flush>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{ value: search, onChange: setSearch, placeholder: 'Tên hồ sơ, đối tác, nhãn hàng, mã booking' }}
                chips={<Chips items={chips} value={filter} onChange={setFilter} />}
                resultCount={search.trim() ? rows.length : undefined}
              />
            </div>
            <DataTable
              columns={columns}
              rows={rows.slice((page - 1) * pageSize, page * pageSize)}
              rowKey={r => r.id}
              onRowClick={r => setScreen({ mode: 'detail', id: r.id })}
              empty={
                data.records.length === 0 ? (
                  <EmptyState
                    title="Chưa có hợp đồng nào"
                    description="Tạo hợp đồng từ danh mục mẫu pháp chế, hoặc bấm “HĐ” ở một booking để tạo hợp đồng đã điền sẵn."
                    action={
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" icon={FolderKanban} onClick={() => setScreen({ mode: 'catalog' })}>
                          Xem danh mục mẫu hợp đồng
                        </Button>
                        {canCreate && <Button variant="primary" icon={Plus} onClick={() => setScreen({ mode: 'form' })}>Tạo hợp đồng</Button>}
                      </div>
                    }
                  />
                ) : (
                  <EmptyState title="Không có hồ sơ khớp" />
                )
              }
            />
            <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
          </Panel>
        </div>
      )}

      {/* Xem nhanh văn bản hợp đồng ngay từ bảng danh sách */}
      <Modal
        open={Boolean(quickViewRecord)}
        onClose={() => setQuickViewRecord(null)}
        title={quickViewRecord?.title || 'Xem hợp đồng'}
        size="lg"
        footer={
          quickViewRecord && (
            <div className="flex items-center justify-between w-full gap-2">
              <a
                href={`/api/contracts/${quickViewRecord.id}/document`}
                className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
              >
                <Download className="w-4 h-4" />
                Tải file Word (.docx)
              </a>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setQuickViewRecord(null)}>Đóng</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = quickViewRecord.id;
                    setQuickViewRecord(null);
                    setScreen({ mode: 'detail', id });
                  }}
                >
                  Mở chi tiết & xử lý hồ sơ
                </Button>
              </div>
            </div>
          )
        }
      >
        {quickViewRecord && (
          <ContractDocumentViewer
            title={quickViewRecord.title}
            templateName={`${data.templates.find(t => t.id === quickViewRecord.templateId)?.name || quickViewRecord.templateId} · Phiên bản ${quickViewRecord.version}`}
            blocks={quickViewDoc?.blocks || []}
            paragraphs={quickViewDoc?.paragraphs || []}
            fields={quickViewDoc?.fields || []}
            values={quickViewDoc?.values || quickViewRecord.values}
            downloadHref={`/api/contracts/${quickViewRecord.id}/document`}
            signingPeople={quickViewRecord.signing.at(-1)?.people}
            signingDocumentId={quickViewRecord.signing.at(-1)?.documentId}
            partnerName={quickViewRecord.partner}
            acceptanceScreenshots={quickViewRecord.acceptanceScreenshots}
            maxHeight="65vh"
          />
        )}
      </Modal>

      <OperationalReportDrawer
        isOpen={isContractReportOpen}
        onClose={() => setIsContractReportOpen(false)}
        purposeId="CONTRACT_DRAFTING"
        moduleTitle="Báo Cáo Rà Soát Hồ Sơ Hợp Đồng, Điều Khoản Pháp Chế & Khấu Trừ Thuế TNCN"
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Quản Lý Hợp Đồng, Biên Bản Nghiệm Thu & Thuế TNCN]`,
          `- Tổng quan hồ sơ pháp lý B2C: ${data.records.length} hồ sơ, ${data.templates.length} mẫu hợp đồng & biên bản nghiệm thu chuẩn.`,
          `- Đang chờ duyệt: ${data.records.filter(r => r.approval === 'IN_REVIEW').length} bộ | Chờ ký: ${data.records.filter(awaitingSign).length} bộ | Đã ký hoàn tất: ${data.records.filter(done).length} bộ | Cần lập nghiệm thu: ${data.records.filter(needAcceptance).length} bộ.`,
          ...rows.slice(0, 8).map(
            r => `- Hồ sơ ${r.id} | Tiêu đề: ${r.title} | Đối tác/KOC: ${r.partner} | Nhãn hàng: ${r.brand} | Trạng thái: ${contractStatus(r).label} | Phiên bản: v${r.version} | Cập nhật: ${formatDate(r.updatedAt)}`
          ),
        ].join('\n')}
        customSystemPrompt="Kiểm tra danh sách hồ sơ hợp đồng và biên bản nghiệm thu hiện tại: (1) Rà soát rủi ro điều khoản sử dụng hình ảnh KOC chạy Spark Ads 30-90 ngày và thời hạn giữ link giỏ hàng vàng, (2) Kiểm tra quy định khấu trừ thuế TNCN 10% đối với cá nhân kinh doanh/KOC có phát sinh thù lao từ 2.000.000đ/lần trở lên, (3) Liệt kê các hồ sơ đang tắc ở bước chờ duyệt pháp chế hoặc chờ ký số để đôn đốc giải ngân đúng hạn."
        onNotify={onNotify}
      />
    </div>
  );
}
