'use client';

/**
 * Hợp đồng: danh sách hồ sơ → hồ sơ chi tiết → form tạo/sửa theo mẫu pháp chế,
 * kèm Quản lý danh mục & biểu mẫu hợp đồng chuẩn của Pháp chế.
 * Dữ liệu và quyền lấy từ máy chủ (/api/contracts); giao diện không tự cấp quyền.
 * Từ màn Booking, nút “HĐ” mở hồ sơ của booking đó, chưa có thì mở form tạo đã điền sẵn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, FolderKanban, Plus } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, DocBlock, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import { Button, Chips, DataTable, EmptyState, FilterBar, Modal, PageActions, Pagination, Panel, Person, Segmented, Status } from '../ui';
import type { Column } from '../ui';
import { ApiError, contractApi, type ContractBootstrap } from '../contracts/api';
import { browserDemoEnabled, downloadBrowserDemo, enableBrowserDemo } from '../contracts/browserDemo';
import { contractStatus, isAcceptance } from '../contracts/contractUi';
import { ContractCatalogView, CATEGORY_LABELS } from '../contracts/ContractCatalogView';
import { ContractDetail } from '../contracts/ContractDetail';
import { ContractDocumentViewer } from '../contracts/ContractDocumentViewer';
import { ContractForm, type ContractFormInit, type ContractFormPayload } from '../contracts/ContractForm';
import { OperationalReportDrawer } from '../OperationalReportDrawer';

/** Yêu cầu mở hồ sơ của một booking (từ màn Booking). `nonce` đổi mỗi lần bấm. */
export interface ContractIntent { dealId: string; nonce: number }

type Screen =
  | { mode: 'list' }
  | { mode: 'catalog' }
  | { mode: 'detail'; id: string }
  | { mode: 'form'; editId?: string; init?: ContractFormInit };
type Filter = 'ALL' | 'MINE' | 'REVIEW' | 'SIGN' | 'DONE' | 'NEED_ACCEPTANCE';

export function ContractManagementView({
  deals = [],
  kocs = [],
  intent,
  onNotify,
  demoMode = false,
  currentUserId,
}: {
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  intent?: ContractIntent | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  demoMode?: boolean;
  currentUserId?: string;
}) {
  const [data, setData] = useState<ContractBootstrap | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [quickViewRecord, setQuickViewRecord] = useState<ContractRecord | null>(null);
  const [quickViewDoc, setQuickViewDoc] = useState<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> } | null>(null);
  const [isContractReportOpen, setIsContractReportOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (demoMode) enableBrowserDemo();
    const result = await contractApi<ContractBootstrap>('/api/contracts');
    setData(result); setLoadError(null); return result;
  }, [demoMode]);

  useEffect(() => {
    (async () => {
      if (process.env.NODE_ENV === 'development') await contractApi('/api/auth/me').catch(() => undefined);
      await refresh();
    })().catch(e => setLoadError(e instanceof ApiError ? e : new ApiError((e as Error).message, 503)));
  }, [refresh, currentUserId]);

  // Tải văn bản hợp đồng khi bấm Xem nhanh trên bảng danh sách
  useEffect(() => {
    if (!quickViewRecord) return;
    let cancelled = false;
    contractApi<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> }>(`/api/contracts/${quickViewRecord.id}/document?preview=1`)
      .then(r => { if (!cancelled) setQuickViewDoc(r); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [quickViewRecord]);

  // Mở theo booking khi được gọi từ màn Booking.
  const [handledIntent, setHandledIntent] = useState<number | null>(null);
  if (intent && data && handledIntent !== intent.nonce) {
    setHandledIntent(intent.nonce);
    const existing = data.records.filter(r => r.dealId === intent.dealId && !isAcceptance(r.templateId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    setScreen(existing ? { mode: 'detail', id: existing.id } : { mode: 'form', init: { dealId: intent.dealId, kind: 'CONTRACT' } });
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
      header: 'Hồ sơ',
      width: 260,
      render: r => {
        const tpl = data?.templates.find(t => t.id === r.templateId);
        const catLabel = tpl?.category ? CATEGORY_LABELS[tpl.category] : undefined;
        return (
          <div className="min-w-0 max-w-[340px] leading-tight">
            <span className="block truncate font-medium text-ink">{r.title}</span>
            <span className="block truncate text-2xs text-ink-3">
              {tpl?.name || r.templateId} · v{r.version}{catLabel ? ` · ${catLabel}` : ''}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: 'Đối tác · booking',
      width: 200,
      render: r => (
        <div className="min-w-0 max-w-[260px] leading-tight">
          <span className="block truncate text-ink">{r.partner}</span>
          <span className="block truncate text-2xs text-ink-3">{r.brand}{r.dealCode ? <> · <span className="font-code">{r.dealCode}</span></> : ''}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 170,
      render: r => {
        const s = contractStatus(r);
        return (
          <div className="grid gap-1 justify-items-start">
            <Status tone={s.tone}>{s.label}</Status>
            {s.note && <span className="text-2xs text-ink-3">{s.note}</span>}
          </div>
        );
      },
    },
    { key: 'owner', header: 'Người phụ trách', width: 160, render: r => <Person name={r.ownerName} size={20} /> },
    { key: 'updated', header: 'Cập nhật', width: 100, align: 'right', render: r => <span className="text-ink-2 tabular-nums">{formatDate(r.updatedAt)}</span> },
    {
      key: 'preview',
      header: 'Văn bản',
      width: 110,
      align: 'right',
      render: r => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setQuickViewRecord(r);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-2xs font-medium text-ink hover:bg-sunken"
        >
          <Eye className="w-3.5 h-3.5 text-accent" />
          Xem hợp đồng
        </button>
      ),
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

  const canCreate = data.actor.roles.includes('CREATOR');

  return (
    <div className="space-y-6" onClickCapture={e => {
      if (!browserDemoEnabled()) return;
      const link = (e.target as HTMLElement).closest('a');
      if (link?.getAttribute('href')?.startsWith('/api/contracts/')) { e.preventDefault(); downloadBrowserDemo(link.getAttribute('href')!).catch(error => onNotify?.(error.message, 'error')); }
    }}>
      {data.config.storage === 'BROWSER_DEMO' && <div role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-ink">Bản giả lập online · Dữ liệu thử chỉ lưu trong trình duyệt này. Dùng mẫu rút gọn để thử quy trình; bộ mẫu pháp chế gốc và kết nối Lark/MISA/AI đang chờ cấu hình. Không nhập dữ liệu thật hoặc dùng tài liệu thử để ký.</div>}

      {(screen.mode === 'list' || screen.mode === 'catalog') && (
        <>
          <PageActions>
            <Button variant="secondary" icon={FileText} onClick={() => setIsContractReportOpen(true)}>
              Báo cáo kiểm tra điều khoản & thuế
            </Button>
            {canCreate && <Button variant="primary" icon={Plus} onClick={() => setScreen({ mode: 'form' })}>Tạo hợp đồng</Button>}
          </PageActions>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={screen.mode === 'catalog' ? 'CATALOG' : 'RECORDS'}
              onChange={v => setScreen(v === 'CATALOG' ? { mode: 'catalog' } : { mode: 'list' })}
              items={[
                { key: 'RECORDS', label: `Hồ sơ hợp đồng (${data.records.length})` },
                { key: 'CATALOG', label: `Danh mục & Mẫu hợp đồng (${data.templates.length})` },
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
      ) : screen.mode === 'form' ? (
        <ContractForm
          key={screen.editId || `new-${screen.init?.dealId || ''}-${screen.init?.kind || ''}-${screen.init?.parentId || ''}-${screen.init?.templateId || ''}`}
          data={data}
          deals={deals}
          kocs={kocs}
          record={screen.editId ? record : undefined}
          init={screen.init}
          busy={busy}
          onCancel={() => setScreen(screen.editId ? { mode: 'detail', id: screen.editId } : { mode: 'list' })}
          onSave={(p: ContractFormPayload) => act({ action: screen.editId ? 'EDIT' : 'CREATE', ...p }, screen.editId ? 'Đã lưu phiên bản mới' : 'Đã lưu nháp hợp đồng')}
        />
      ) : screen.mode === 'detail' && record ? (
        <ContractDetail
          key={record.id}
          record={record}
          data={data}
          deals={deals}
          busy={busy}
          onBack={() => setScreen({ mode: 'list' })}
          onAction={act}
          onEdit={() => setScreen({ mode: 'form', editId: record.id })}
          onOpen={id => setScreen({ mode: 'detail', id })}
          onCreateAcceptance={() => setScreen({ mode: 'form', init: { dealId: record.dealId, kind: 'ACCEPTANCE', parentId: record.id } })}
        />
      ) : (
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
                <EmptyState title="Không có hồ sơ khớp" description="Đổi bộ lọc hoặc tìm bằng tên khác." />
              )
            }
          />
          <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
        </Panel>
      )}

      {/* Xem nhanh văn bản hợp đồng ngay từ bảng danh sách */}
      <Modal
        open={Boolean(quickViewRecord)}
        onClose={() => setQuickViewRecord(null)}
        title={quickViewRecord?.title || 'Xem hợp đồng'}
        description={quickViewRecord ? `${quickViewRecord.partner} · ${quickViewRecord.brand} · Phiên bản ${quickViewRecord.version}` : ''}
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
            maxHeight="65vh"
          />
        )}
      </Modal>

      <OperationalReportDrawer
        isOpen={isContractReportOpen}
        onClose={() => setIsContractReportOpen(false)}
        purposeId="CONTRACT_DRAFTING"
        moduleTitle="Báo Cáo Rà Soát Hồ Sơ Hợp Đồng, Điều Khoản Pháp Chế & Khấu Trừ Thuế TNCN"
        moduleSubtitle={`Tổng số hồ sơ hợp đồng/nghiệm thu: ${data.records.length} | Biểu mẫu pháp chế chuẩn: ${data.templates.length} | Hồ sơ hiển thị: ${rows.length}`}
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
