'use client';

/**
 * Hợp đồng: danh sách hồ sơ → hồ sơ chi tiết → form tạo/sửa theo mẫu pháp chế.
 * Dữ liệu và quyền lấy từ máy chủ (/api/contracts); giao diện không tự cấp quyền.
 * Từ màn Booking, nút “HĐ” mở hồ sơ của booking đó, chưa có thì mở form tạo đã điền sẵn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Plus } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, DocBlock, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import { Button, Chips, DataTable, EmptyState, FilterBar, Modal, PageActions, Pagination, Panel, Person, Status } from '../ui';
import type { Column } from '../ui';
import { ApiError, contractApi, type ContractBootstrap } from '../contracts/api';
import { browserDemoEnabled, downloadBrowserDemo, enableBrowserDemo } from '../contracts/browserDemo';
import { ROLE_LABEL, contractStatus, isAcceptance } from '../contracts/contractUi';
import { ContractDetail } from '../contracts/ContractDetail';
import { ContractDocumentViewer } from '../contracts/ContractDocumentViewer';
import { ContractForm, type ContractFormInit, type ContractFormPayload } from '../contracts/ContractForm';

/** Yêu cầu mở hồ sơ của một booking (từ màn Booking). `nonce` đổi mỗi lần bấm. */
export interface ContractIntent { dealId: string; nonce: number }

type Screen = { mode: 'list' } | { mode: 'detail'; id: string } | { mode: 'form'; editId?: string; init?: ContractFormInit };
type Filter = 'ALL' | 'MINE' | 'REVIEW' | 'SIGN' | 'DONE';

export function ContractManagementView({
  deals = [],
  kocs = [],
  intent,
  onNotify,
  demoMode = false,
}: {
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  intent?: ContractIntent | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  demoMode?: boolean;
}) {
  const [data, setData] = useState<ContractBootstrap | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadedTemplate, setLoadedTemplate] = useState<LegalTemplate | null>(null);
  const [quickViewRecord, setQuickViewRecord] = useState<ContractRecord | null>(null);
  const [quickViewDoc, setQuickViewDoc] = useState<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> } | null>(null);

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
  }, [refresh]);

  // Tải chi tiết mẫu pháp chế khi mở cửa sổ Mẫu pháp chế
  useEffect(() => {
    if (!showTemplates || !data?.templates.length) return;
    const targetId = selectedTemplateId || data.templates[0].id;
    if (!selectedTemplateId) setSelectedTemplateId(targetId);
    let cancelled = false;
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${targetId}`)
      .then(r => { if (!cancelled) setLoadedTemplate(r.template); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [showTemplates, selectedTemplateId, data?.templates]);

  // Tải văn bản hợp đồng khi bấm Xem nhanh trên bảng danh sách
  useEffect(() => {
    if (!quickViewRecord) { setQuickViewDoc(null); return; }
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
  const matches: Record<Filter, (r: ContractRecord) => boolean> = {
    ALL: () => true,
    MINE: r => r.ownerId === me?.id,
    REVIEW: waitingMe,
    SIGN: awaitingSign,
    DONE: done,
  };

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.records || []).filter(r => !q || `${r.title} ${r.brand} ${r.partner} ${r.dealCode || ''}`.toLowerCase().includes(q));
  }, [data, search]);
  const rows = searched.filter(matches[filter]);
  const pageSize = 20;
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

  const chips = (['ALL', 'MINE', 'REVIEW', 'SIGN', 'DONE'] as Filter[]).map(key => ({
    key,
    label: { ALL: 'Tất cả', MINE: 'Của tôi', REVIEW: 'Chờ tôi duyệt', SIGN: 'Chờ ký', DONE: 'Đã ký' }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ',
      width: 260,
      render: r => (
        <div className="min-w-0 max-w-[340px] leading-tight">
          <span className="block truncate font-medium text-ink">{r.title}</span>
          <span className="block truncate text-2xs text-ink-3">{data?.templates.find(t => t.id === r.templateId)?.name || r.templateId} · phiên bản {r.version}</span>
        </div>
      ),
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
      {screen.mode === 'list' && (
        <PageActions>
          <Button icon={FileText} onClick={() => setShowTemplates(true)}>Mẫu pháp chế</Button>
          {canCreate && <Button variant="primary" icon={Plus} onClick={() => setScreen({ mode: 'form' })}>Tạo hợp đồng</Button>}
        </PageActions>
      )}

      {screen.mode === 'form' ? (
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
                  description="Tạo hợp đồng từ mẫu pháp chế, hoặc bấm “HĐ” ở một booking để tạo hợp đồng đã điền sẵn."
                  action={canCreate && <Button variant="primary" icon={Plus} onClick={() => setScreen({ mode: 'form' })}>Tạo hợp đồng</Button>}
                />
              ) : (
                <EmptyState title="Không có hồ sơ khớp" description="Đổi bộ lọc hoặc tìm bằng tên khác." />
              )
            }
          />
          <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
        </Panel>
      )}

      {data.demoActors.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 rounded-xl bg-warning-soft text-[13px] text-ink-2">
          <span className="font-medium text-ink">Môi trường thử</span>
          <span>Đang dùng: {data.actor.name} ({data.actor.roles.map(r => ROLE_LABEL[r].toLowerCase()).join(', ')})</span>
          <span className="text-ink-3">Đổi vai trò:</span>
          {data.demoActors.map(a => (
            <Button
              key={a.id}
              size="sm"
              variant={a.id === data.actor.id ? 'secondary' : 'ghost'}
              disabled={busy || a.id === data.actor.id}
              onClick={async () => {
                setBusy(true);
                try { await contractApi('/api/contracts/demo', { id: a.id }); await refresh(); } catch (e) { onNotify?.((e as Error).message, 'error'); } finally { setBusy(false); }
              }}
            >
              {a.name.replace(' (kiểm thử)', '')}
            </Button>
          ))}
          <span className="text-ink-3">
            Dữ liệu chỉ lưu trên máy này.{!data.config.wesign && ' Ký điện tử dùng chế độ ký thử.'}
          </span>
        </div>
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

      {/* Cửa sổ Mẫu pháp chế: chọn mẫu và xem trực tiếp bố cục A4 ngay trên màn hình */}
      <Modal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Mẫu pháp chế"
        description="Bản gốc do pháp chế ban hành. Bấm vào từng mẫu để kiểm tra trực tiếp văn bản và các trường điền."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            {loadedTemplate ? (
              <a
                href={`/api/contracts/templates/${loadedTemplate.id}?download=1`}
                className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
              >
                <Download className="w-4 h-4" strokeWidth={1.75} />
                Tải file mẫu ({loadedTemplate.filename})
              </a>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowTemplates(false)}>Đóng</Button>
              {canCreate && loadedTemplate && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setShowTemplates(false);
                    setScreen({ mode: 'form', init: { templateId: loadedTemplate.id, kind: loadedTemplate.kind } });
                  }}
                >
                  Soạn hợp đồng theo mẫu này
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
          <ul className="divide-y divide-line border border-line rounded-lg overflow-hidden bg-surface">
            {data.templates.map(t => {
              const active = (selectedTemplateId || data.templates[0]?.id) === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                      active ? 'bg-accent/10 text-ink font-medium' : 'hover:bg-sunken text-ink-2'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-[13px] truncate">{t.name}</span>
                      <span className="block text-2xs text-ink-3">{t.version}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="min-w-0">
            {loadedTemplate ? (
              <ContractDocumentViewer
                title={loadedTemplate.name}
                templateName={`${loadedTemplate.name} (${loadedTemplate.version})`}
                blocks={loadedTemplate.blocks || []}
                paragraphs={loadedTemplate.paragraphs}
                fields={loadedTemplate.fields}
                values={{}}
                downloadHref={`/api/contracts/templates/${loadedTemplate.id}?download=1`}
                maxHeight="62vh"
                compactToolbar
              />
            ) : (
              <div className="p-8 text-center text-[13px] text-ink-3 border border-line rounded-xl">
                Đang tải nội dung mẫu pháp chế…
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
