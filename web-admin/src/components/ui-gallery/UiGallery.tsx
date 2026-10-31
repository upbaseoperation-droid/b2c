'use client';

/**
 * Trang mẫu thành phần giao diện (route /ui, chỉ quản trị viên). Người làm màn mới nhìn và chọn
 * thành phần ở đây thay vì tự viết. Quy chuẩn: DESIGN_SYSTEM.md; kế hoạch: UI_SYNC_PLAN.md.
 * File này chỉ dùng thành phần trong components/ui và token màu, nên qua ui:check với baseline 0.
 */

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ActionMenu,
  BulkBar,
  Button,
  Chips,
  Combobox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Pagination,
  Panel,
  PeriodPicker,
  Person,
  Segmented,
  Select,
  Stat,
  StatRow,
  STATUS,
  StepBar,
  Status,
  Tabs,
  Textarea,
} from '../ui';
import type { Column } from '../ui';
import { formatVnd } from '@/lib/format';

const SWATCHES = [
  { name: 'canvas', cls: 'bg-canvas', note: 'Nền trang' },
  { name: 'surface', cls: 'bg-surface', note: 'Bảng, modal, ô nhập' },
  { name: 'sunken', cls: 'bg-sunken', note: 'Nhãn trung tính' },
  { name: 'primary', cls: 'bg-primary', note: 'Nút chính' },
  { name: 'accent', cls: 'bg-accent', note: 'Liên kết, tab đang chọn' },
  { name: 'accent-soft', cls: 'bg-accent-soft', note: 'Nền trạng thái đang chạy' },
  { name: 'positive', cls: 'bg-positive', note: 'Đã duyệt, hoàn tất' },
  { name: 'warning', cls: 'bg-warning', note: 'Chờ duyệt, thiếu dữ liệu' },
  { name: 'critical', cls: 'bg-critical', note: 'Quá hạn, lỗi, xóa' },
];

const TYPE_SCALE = [
  { cls: 'text-xl font-semibold', spec: '20 · 600', use: 'Tiêu đề trang' },
  { cls: 'text-base font-semibold', spec: '16 · 600', use: 'Tiêu đề khối' },
  { cls: 'text-sm', spec: '14 · 400', use: 'Nội dung, form, mô tả' },
  { cls: 'text-xs', spec: '13 · 400', use: 'Ô bảng, danh sách' },
  { cls: 'text-2xs text-ink-3', spec: '12 · 400', use: 'Nhãn, chú thích' },
];

interface Row {
  id: string;
  name: string;
  owner: string;
  amount: number;
  status: keyof typeof STATUS;
}

const ROWS: Row[] = [
  { id: 'DF-001', name: 'Chiến dịch Ngày đôi 11.11', owner: 'Nguyễn Thị Ngọc Tâm', amount: 120_000_000, status: 'running' },
  { id: 'DF-002', name: 'Booking KOC KL4–KL5', owner: 'Lê Phương Thảo', amount: 86_500_000, status: 'pending' },
  { id: 'DF-003', name: 'Kịch bản video nước tắm thảo dược', owner: 'Đặng Thị Yến Nhi', amount: 24_000_000, status: 'approved' },
  { id: 'DF-004', name: 'Nghiệm thu video tháng 10', owner: 'Trần Hữu Chiến', amount: 0, status: 'overdue' },
  { id: 'DF-005', name: 'Hợp đồng khung CTV', owner: 'Lê Phương Thảo', amount: 12_000_000, status: 'draft' },
];

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Công việc', render: (r) => <span className="font-medium text-ink">{r.name}</span>, width: 220 },
  { key: 'id', header: 'Mã', render: (r) => <span className="font-code text-2xs text-ink-2">{r.id}</span>, width: 90 },
  { key: 'owner', header: 'Phụ trách', render: (r) => <Person name={r.owner} /> },
  { key: 'amount', header: 'Ngân sách', align: 'right', render: (r) => <span className="tabular-nums">{r.amount ? formatVnd(r.amount) : '—'}</span> },
  { key: 'status', header: 'Trạng thái', render: (r) => <Status tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Status> },
];

const CODE = 'font-code text-2xs text-ink-2';

export function UiGallery() {
  const [segment, setSegment] = useState<'week' | 'month'>('month');
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [chip, setChip] = useState<'all' | 'pending' | 'done'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [kocId, setKocId] = useState('');
  const [select, setSelect] = useState('b2c');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [period, setPeriod] = useState('2026/11');
  const [picked, setPicked] = useState(3);
  const [step, setStep] =useState<'brief' | 'script' | 'shoot' | 'air' | null>('script');

  // 2.000 mục để thấy Combobox cuộn ảo, tìm không dấu theo nhiều trường.
  const kocOptions = useMemo(
    () => Array.from({ length: 2000 }, (_, i) => ({
      value: `koc-${i}`,
      label: `kocmau${i + 1} (@kocmau${i + 1})`,
      hint: i % 3 === 0 ? 'Nguyễn Thị Hương · 2 hồ sơ' : 'Trần Văn Nam',
      searchText: `09${String(10000000 + i)}`,
    })),
    [],
  );

  const shown = ROWS.filter((r) => (chip === 'all' ? true : chip === 'pending' ? r.status === 'pending' : r.status === 'done' || r.status === 'approved'))
    .filter((r) => !search.trim() || `${r.name} ${r.id} ${r.owner}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold text-ink">Thành phần giao diện</h1>
        <p className="text-sm text-ink-2">Chọn thành phần ở đây thay vì tự viết. Quy chuẩn trong <code className={CODE}>DESIGN_SYSTEM.md</code>; kiểm tra bằng <code className={CODE}>npm run ui:check</code>.</p>
      </div>

      <Panel title="Màu">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className={`${s.cls} w-10 h-10 rounded-md border border-line shrink-0`} />
              <span className="min-w-0 leading-tight">
                <span className="block text-sm text-ink">{s.name}</span>
                <span className="block text-2xs text-ink-3 truncate" title={s.note}>{s.note}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Chữ">
        <div className="divide-y divide-line">
          {TYPE_SCALE.map((t) => (
            <div key={t.cls} className="flex items-baseline justify-between gap-4 py-2">
              <span className={t.cls}>Quản lý Deal và Booking</span>
              <span className="text-2xs text-ink-3 shrink-0">{t.spec} · {t.use}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Nút và trạng thái">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Plus}>Tạo mới</Button>
            <Button>Lưu nháp</Button>
            <Button variant="ghost">Hủy</Button>
            <Button variant="danger" icon={Trash2}>Xóa</Button>
            <Button size="sm">Nút nhỏ</Button>
            <Button disabled>Vô hiệu</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((k) => (
              <Status key={k} tone={STATUS[k].tone}>{STATUS[k].label}</Status>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Số liệu">
        <StatRow>
          <Stat label="Ngân sách" value="3,94 tỷ" note="68 gian hàng" />
          <Stat label="Video đã air" value="1.118" note="KL1–KL7" tone="positive" />
          <Stat label="Chờ duyệt" value="17" note="Quá hạn 3" tone="warning" />
          <Stat label="Lỗi nghiệm thu" value="2" tone="critical" />
        </StatRow>
      </Panel>

      <Panel title="Chọn kỳ">
        <div className="flex flex-wrap items-center gap-4">
          <PeriodPicker value={period} onChange={setPeriod} options={['2026/08', '2026/09', '2026/10', '2026/11']} label="Chọn tháng" />
          <PeriodPicker value={period} onChange={setPeriod} options={['2026/08', '2026/09', '2026/10', '2026/11']} allLabel="Tất cả tháng" label="Chọn tháng, có tất cả" />
        </div>
        <p className="mt-3 text-2xs text-ink-3">Một kiểu chọn kỳ cho mọi màn: nút lùi, ô chọn, nút tiến. Đặt ở thanh trên, bên trái. Kỳ đang chọn: {period || 'tất cả'}.</p>
      </Panel>

      <Panel title="Thao tác hàng loạt">
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setPicked((n) => n + 1)}>Chọn thêm một dòng</Button>
            <span className="text-2xs text-ink-3">Thanh chỉ hiện khi đã chọn ít nhất một dòng.</span>
          </div>
          <BulkBar count={picked} unit="video" onClear={() => setPicked(0)}>
            <Button size="sm">Gán CTV</Button>
            <Button size="sm">Duyệt kịch bản ({picked})</Button>
            <Button size="sm" variant="primary">Nghiệm thu ({picked})</Button>
            <Button size="sm" variant="danger" icon={Trash2}>Xóa ({picked})</Button>
          </BulkBar>
        </div>
      </Panel>

      <Panel title="Thanh bước">
        <StepBar
          label="Bước quy trình"
          unit="video"
          value={step}
          onChange={setStep}
          steps={[
            { key: 'brief', label: 'Nhận Brief và sản phẩm', count: 12 },
            { key: 'script', label: 'Soạn và duyệt kịch bản', count: 8 },
            { key: 'shoot', label: 'Quay và kiểm tra video', count: 0 },
            { key: 'air', label: 'Duyệt Brand và đăng', count: 5 },
          ]}
        />
        <p className="mt-3 text-2xs text-ink-3">Nhãn không đánh số; thứ tự do thành phần tự hiện. Bấm lại bước đang chọn để bỏ lọc.</p>
      </Panel>

      <Panel title="Form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên công việc *" htmlFor="ui-name"><Input id="ui-name" placeholder="Nhập tên" /></Field>
          <Field label="Khối" htmlFor="ui-select">
            <Select id="ui-select" value={select} onChange={(e) => setSelect(e.target.value)}>
              <option value="b2c">Marketing B2C</option>
              <option value="ops">Vận hành</option>
              <option value="fin">Tài chính</option>
            </Select>
          </Field>
          <Field label="KOC (2.000 mục, tìm không dấu, cuộn ảo)" htmlFor="ui-koc" className="sm:col-span-2">
            <Combobox id="ui-koc" value={kocId} onChange={(v) => setKocId(v)} options={kocOptions} clearable placeholder="Gõ tên, kênh hoặc SĐT…" />
          </Field>
          <Field label="Ghi chú" htmlFor="ui-note" className="sm:col-span-2"><Textarea id="ui-note" rows={3} placeholder="Ghi chú ngắn" /></Field>
        </div>
      </Panel>

      <Panel title="Lọc, tab và bảng" flush>
        <div className="grid gap-3 p-4">
          <Tabs items={[{ key: 'all', label: 'Tất cả', count: ROWS.length }, { key: 'mine', label: 'Của tôi', count: 2 }]} value={tab} onChange={setTab} />
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: 'Tìm công việc, mã, người phụ trách' }}
            filters={<Segmented items={[{ key: 'week', label: 'Tuần' }, { key: 'month', label: 'Tháng' }]} value={segment} onChange={setSegment} />}
            chips={<Chips items={[{ key: 'all', label: 'Tất cả' }, { key: 'pending', label: 'Chờ duyệt' }, { key: 'done', label: 'Đã xong' }]} value={chip} onChange={setChip} label="Lọc theo trạng thái" />}
            resultCount={shown.length}
          />
        </div>
        <DataTable
          columns={[...COLUMNS, { key: 'act', header: '', align: 'right', render: (r) => <ActionMenu items={[{ label: 'Mở chi tiết', onSelect: () => setLastAction(`Mở ${r.id}`) }, { label: 'Xóa', danger: true, onSelect: () => setLastAction(`Xóa ${r.id}`) }]} /> }]}
          rows={shown}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Không có kết quả" description="Đổi bộ lọc hoặc từ khóa." />}
        />
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-2xs text-ink-3">{lastAction ? `Vừa chọn: ${lastAction}` : 'Chưa chọn thao tác nào'}</span>
          <Pagination page={page} pageSize={pageSize} total={47} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </Panel>

      <Panel title="Hộp thoại">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModalOpen(true)}>Mở hộp thoại</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Từ chối (cần lý do)</Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Hộp thoại mẫu" footer={<Button variant="primary" onClick={() => setModalOpen(false)}>Đóng</Button>}>
          <p className="text-sm text-ink-2">Chỉ xem hoặc sửa nhanh một mục thì dùng Modal. Bản ghi nhiều phần thì thay trang.</p>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          title="Từ chối kế hoạch?"
          message="Người trình sẽ nhận lý do bên dưới."
          confirmLabel="Từ chối"
          tone="danger"
          reason={{ label: 'Lý do', placeholder: 'Nêu rõ cần sửa gì', required: true }}
          onConfirm={(reason) => { setLastAction(`Từ chối: ${reason ?? ''}`); setConfirmOpen(false); }}
          onCancel={() => setConfirmOpen(false)}
        />
      </Panel>
    </div>
  );
}
