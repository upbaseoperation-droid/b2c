'use client';

import React from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Video,
} from 'lucide-react';
import type { BookingDealItem, DealContractAppendixStatus } from '../../lib/types';
import {
  formatNumber,
  formatVnd,
  formatVndShort,
  maskSensitivePii,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS,
  buildBookingDealFromApprovedItem,
  computeWeekLabelFromDate,
  ensureDealJobsForApprovedItem,
  type ApprovedBookingListItem,
  type ApprovedBookingPaymentStatus,
} from '../../lib/approvedBookingList';
import { PAYMENT_STATUS_OPTIONS } from './ApprovedBookingHelpers';
import { ActionMenu, Button, Pagination, Status } from '../ui';

export interface ApprovedBookingLarkGridProps {
  filteredItems: ApprovedBookingListItem[];
  paginatedListItems: ApprovedBookingListItem[];
  selectedIds: string[];
  toggleSelectAll: () => void;
  toggleSelectOne: (id: string) => void;
  viewColumnMode: 'ALL_32' | 'BOOKING_FOCUS' | 'ACCEPTANCE_FOCUS';
  canViewFullPii: boolean;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  setEditingRowId: React.Dispatch<React.SetStateAction<string | null>>;
  handleFieldChange: <K extends keyof ApprovedBookingListItem>(
    id: string,
    field: K,
    value: ApprovedBookingListItem[K]
  ) => void;
  handlePullBrandApprovedFromSheets: () => void;
  handleAddDirectApprovedRow: () => void;
  openDealBuilderModal: (item: ApprovedBookingListItem) => void;
  openDrawerForItem: (
    item: ApprovedBookingListItem,
    tab?: 'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE'
  ) => void;
  openAcceptanceModalForRow: (row?: ApprovedBookingListItem) => void;
  openLarkPaymentModalForItem: (
    item?: ApprovedBookingListItem,
    reqType?: 'ADVANCE' | 'SETTLEMENT'
  ) => void;
  openDeepVideoInspector: (item?: ApprovedBookingListItem, overrideUrl?: string) => void;
  setQuickViewApprovedItem: (item: ApprovedBookingListItem | null) => void;
  setDraftBbntPreviewDeal: (deal: BookingDealItem | null) => void;
  onOpenContractForDeal?: (
    deal: BookingDealItem,
    document?: 'HDNT' | 'SOW' | 'BBNT'
  ) => void;
}

export const ApprovedBookingLarkGrid: React.FC<ApprovedBookingLarkGridProps> = ({
  filteredItems,
  paginatedListItems,
  selectedIds,
  toggleSelectAll,
  toggleSelectOne,
  viewColumnMode,
  canViewFullPii,
  page,
  pageSize,
  setPage,
  setPageSize,
  setEditingRowId,
  handleFieldChange,
  handlePullBrandApprovedFromSheets,
  handleAddDirectApprovedRow,
  openDealBuilderModal,
  openDrawerForItem,
  openAcceptanceModalForRow,
  openLarkPaymentModalForItem,
  openDeepVideoInspector,
  setQuickViewApprovedItem,
  setDraftBbntPreviewDeal,
  onOpenContractForDeal,
}) => {
  return (
    <>
      <div className="overflow-x-auto max-h-[75vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-sunken border-b border-line">
            <tr>
              <th className="sticky left-0 z-30 bg-sunken px-2 py-2 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredItems.length > 0 && selectedIds.length === filteredItems.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-line"
                />
              </th>
              <th className="sticky left-[38px] z-30 bg-sunken px-3 py-2 border-r border-line w-[142px] min-w-[142px] max-w-[142px] text-left">
                <div className="font-semibold text-ink truncate">Mã Deal &amp; Phụ lục SOW</div>
              </th>
              <th className="sticky left-[180px] z-30 bg-sunken px-3 py-2 border-r border-line w-[168px] min-w-[168px] max-w-[168px] text-left shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                <div className="font-semibold text-ink truncate">Kênh KOC &amp; Link</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[175px] text-left">
                <div className="font-semibold text-ink">Gian hàng &amp; Đợt</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[170px] text-left">
                <div className="font-semibold text-ink">Sản phẩm &amp; Pillar</div>
              </th>

              <th className="px-3 py-2 border-r border-line min-w-[140px] text-left">
                <div className="font-semibold text-ink">Ngày air chốt</div>
              </th>
              {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                <th className="px-3 py-2 border-r border-line min-w-[115px] text-right">
                  <div className="font-semibold text-ink">Giá đề xuất Net</div>
                </th>
              )}
              <th className="px-3 py-2 border-r border-line min-w-[145px] text-right">
                <div className="font-semibold text-ink">Giá chốt cuối (Net)</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[130px] text-right">
                <div className="font-semibold text-ink">Gross &amp; Bậc KL</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[135px] text-right">
                <div className="font-semibold text-ink">Tạm ứng &amp; Còn lại</div>
              </th>

              {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                <th className="px-3 py-2 border-r border-line min-w-[180px] text-left">
                  <div className="font-semibold text-ink">Loại TK thuế &amp; Hợp tác</div>
                </th>
              )}

              <th className="px-3 py-2 border-r border-line min-w-[220px] text-left">
                <div className="font-semibold text-ink">1. Hợp đồng (HĐNT) &amp; Link</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[220px] text-left">
                <div className="font-semibold text-ink">2. Phụ lục (PL SOW) &amp; Link</div>
              </th>
              <th className="px-3 py-2 border-r border-line min-w-[220px] text-left">
                <div className="font-semibold text-ink">3. Biên bản (BBNT) &amp; Link</div>
              </th>

              {viewColumnMode !== 'BOOKING_FOCUS' && (
                <>
                  <th className="px-3 py-2 border-r border-line min-w-[235px] text-left">
                    <div className="font-semibold text-ink">Link video nghiệm thu</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[140px] text-left">
                    <div className="font-semibold text-ink">Ngày air thực tế</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[120px] text-left">
                    <div className="font-semibold text-ink">SLA Tiến độ</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[155px] text-left">
                    <div className="font-semibold text-ink">Mã Spark Ads</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[205px] text-right">
                    <div className="font-semibold text-ink">Views · Đơn · GMV 30d</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[150px] text-right">
                    <div className="font-semibold text-ink">ROI &amp; Đánh giá</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[165px] text-left">
                    <div className="font-semibold text-ink">Thanh toán &amp; Luồng Lark</div>
                  </th>
                  <th className="px-3 py-2 border-r border-line min-w-[175px] text-left">
                    <div className="font-semibold text-ink">Ngân hàng &amp; CCCD</div>
                  </th>
                </>
              )}

              <th className="px-3 py-2 text-right min-w-[135px]">
                <div className="font-semibold text-ink">Thao tác</div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={19} className="py-12 text-center text-ink-3">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-7 h-7 text-ink-3" />
                    <div className="font-medium text-ink">
                      Chưa có dòng KOC nào trong List duyệt book theo bộ lọc hiện tại
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={RefreshCw}
                        onClick={handlePullBrandApprovedFromSheets}
                      >
                        Đồng bộ dòng Brand duyệt từ Sheet
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Plus}
                        onClick={handleAddDirectApprovedRow}
                      >
                        Thêm dòng
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedListItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const stickyCellBg = isSelected
                  ? 'bg-accent-soft'
                  : 'bg-surface group-hover:bg-sunken';
                return (
                  <tr
                    key={item.id}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setEditingRowId((prev) => (prev === item.id ? null : prev));
                      }
                    }}
                    className={`group ${
                      isSelected ? 'bg-accent-soft/30' : 'hover:bg-sunken/40'
                    } transition-colors`}
                  >
                    <td
                      className={`sticky left-0 z-10 ${stickyCellBg} px-2 py-2 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item.id)}
                        className="rounded border-line"
                      />
                    </td>

                    <td
                      className={`sticky left-[38px] z-10 ${stickyCellBg} px-3 py-2 border-r border-line w-[142px] min-w-[142px] max-w-[142px] align-middle`}
                    >
                      {item.bookingOrderCreated && item.maBooking ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-positive-soft text-positive font-code text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.maBooking}</span>
                          </span>
                          <div
                            className="text-2xs font-code text-ink-2 truncate"
                            title={`HĐNT: ${item.masterContractCode || '—'} · Phụ lục Deal: ${item.contractAppendixCode || '—'}`}
                          >
                            {item.contractAppendixCode || `PL-${item.maBooking}-01`} (
                            {item.contractAppendixStatus || 'CHỜ_KÝ'})
                          </div>
                          <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                            <span
                              className="truncate"
                              title="Số Job (Bảng công việc) và Dịch vụ đi kèm trong Phụ lục SOW"
                            >
                              {ensureDealJobsForApprovedItem(item).length} Job (
                              {ensureDealJobsForApprovedItem(item).length} Bảng CV) +{' '}
                              {(item.addonServices || []).length} DV
                            </span>
                            <button
                              type="button"
                              onClick={() => openDealBuilderModal(item)}
                              className="font-semibold text-accent hover:underline shrink-0"
                            >
                              Sửa Deal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Status tone="warning">Chờ tạo deal</Status>
                          <div>
                            <button
                              type="button"
                              onClick={() => openDealBuilderModal(item)}
                              className="text-2xs font-semibold text-accent hover:underline"
                            >
                              + Tạo Deal &amp; Phụ lục
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    <td
                      className={`sticky left-[180px] z-10 ${stickyCellBg} px-3 py-2 border-r border-line w-[168px] min-w-[168px] max-w-[168px] align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.idKenh}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'idKenh', e.target.value)
                            }
                            onDoubleClick={() => {
                              if (item.idKenh || item.kocId) {
                                setQuickViewApprovedItem(item);
                              }
                            }}
                            placeholder="Nhập @id_kênh..."
                            className="w-full min-w-0 h-7 px-2 rounded border border-line bg-surface font-semibold text-xs text-ink"
                          />
                          <button
                            type="button"
                            onClick={() => setQuickViewApprovedItem(item)}
                            disabled={!item.idKenh && !item.kocId}
                            title={`Xem nhanh thông tin KOC, hiệu suất kênh & lịch sử hợp tác (@${item.idKenh})`}
                            className="h-7 w-7 rounded border border-line bg-surface text-accent hover:bg-sunken inline-flex items-center justify-center shrink-0 disabled:opacity-40"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                          <button
                            type="button"
                            onClick={() => setQuickViewApprovedItem(item)}
                            className="truncate max-w-[100px] text-left text-accent hover:underline font-medium"
                            title={`Xem hồ sơ & lịch sử KOC: ${item.tenKenh || item.idKenh}`}
                          >
                            {item.tenKenh || item.tepKenh || 'Xem KOC'}
                          </button>
                          {item.linkKenh && (
                            <a
                              href={item.linkKenh}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink-2 hover:text-accent hover:underline shrink-0"
                            >
                              Kênh ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle">
                      <div
                        className="font-semibold text-ink truncate max-w-[175px]"
                        title={item.storeName}
                      >
                        {item.storeName}
                      </div>
                      <div className="text-2xs text-ink-3">
                        {item.brandName} · {item.thangPlan} · {item.dot}
                      </div>
                      <div className="text-2xs text-ink-3">PIC: {item.nguoiPhuTrach}</div>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle space-y-1">
                      <input
                        type="text"
                        value={item.sanPham}
                        onChange={(e) => handleFieldChange(item.id, 'sanPham', e.target.value)}
                        placeholder="Sản phẩm..."
                        className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                      />
                      <div className="text-2xs text-ink-3 truncate" title={item.pillarContent}>
                        Pillar: {item.pillarContent}
                      </div>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle">
                      <input
                        type="date"
                        value={item.plannedAirDate}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'plannedAirDate', e.target.value)
                        }
                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink focus:outline-none focus:border-ink"
                      />
                      <div className="text-2xs text-ink-3 mt-0.5">
                        Tuần KH: {computeWeekLabelFromDate(item.plannedAirDate) || '—'}
                      </div>
                    </td>

                    {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                      <td className="px-3 py-2 border-r border-line align-middle text-right font-code text-xs text-ink-3 tabular-nums">
                        {formatVnd(item.giaDeXuatNet)}
                      </td>
                    )}

                    <td className="px-3 py-2 border-r border-line align-middle">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(Number(item.chiPhiBookingNetCuoi) || 0)}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            'chiPhiBookingNetCuoi',
                            parseThousandNumberInput(e.target.value)
                          )
                        }
                        className="w-full h-7 px-2 rounded border border-line bg-surface text-right font-code font-semibold text-xs text-ink tabular-nums focus:outline-none focus:border-ink"
                      />
                      <div className="text-2xs text-right font-code text-ink-3 mt-0.5">
                        Video: {formatVndShort(item.videoAssetNetCost ?? item.chiPhiBookingNetCuoi)}
                        {(item.addonServicesNetCost || 0) > 0
                          ? ` · DV: +${formatVndShort(item.addonServicesNetCost || 0)}`
                          : ' · DV: Gộp gói'}
                      </div>
                      {(item.khauTruHangMucHuy || 0) > 0 && (
                        <div className="text-2xs text-right font-code text-critical font-semibold">
                          Khấu trừ phần hủy: -{formatVndShort(item.khauTruHangMucHuy || 0)}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle text-right">
                      <div className="font-code font-semibold text-xs text-ink tabular-nums">
                        {formatVnd(item.chiPhiGrossKemThue)}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.2 rounded bg-sunken border border-line font-code text-2xs font-semibold text-ink-2 mt-0.5">
                        {item.klGrade}
                      </span>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle text-right space-y-1">
                      <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                        <span className="text-2xs text-ink-3 shrink-0">Cọc</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(Number(item.soTienTamUngTruoc) || 0)}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'soTienTamUngTruoc',
                              parseThousandNumberInput(e.target.value)
                            )
                          }
                          placeholder="0"
                          className="w-full bg-transparent text-right font-code text-xs text-ink tabular-nums focus:outline-none"
                        />
                      </div>
                      <div className="text-2xs font-code font-semibold text-ink tabular-nums">
                        Còn trả: {formatVnd(item.soTienCanThanhToan)}
                      </div>
                    </td>

                    {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                      <td className="px-3 py-2 border-r border-line align-middle space-y-1">
                        <select
                          value={item.loaiTaiKhoanThanhToan}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'loaiTaiKhoanThanhToan',
                              e.target.value
                            )
                          }
                          className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                        >
                          {LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 text-2xs text-ink-3">
                          <span>Hợp tác: {item.hinhThucHopTac}</span>
                          <span>·</span>
                          <span>{item.dinhDangNghiemThu}</span>
                        </div>
                      </td>
                    )}

                    <td className="px-3 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                      <input
                        type="text"
                        value={item.masterContractCode || ''}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'masterContractCode', e.target.value)
                        }
                        placeholder="Mã HĐNT (VD: 291026/HDNT/...)"
                        className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                      />
                      <input
                        type="text"
                        value={item.masterContractGoogleDocsUrl || ''}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'masterContractGoogleDocsUrl', e.target.value)
                        }
                        placeholder="Link Google Docs HĐNT..."
                        className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                      />
                      <div className="flex items-center justify-between gap-1 text-2xs">
                        <input
                          type="text"
                          value={item.masterContractSignedUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'masterContractSignedUrl', e.target.value)
                          }
                          placeholder="Link HĐNT đã ký..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        {item.masterContractGoogleDocsUrl && (
                          <a
                            href={item.masterContractGoogleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline font-medium shrink-0"
                          >
                            GDocs↗
                          </a>
                        )}
                        {item.masterContractSignedUrl && (
                          <a
                            href={item.masterContractSignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-positive hover:underline font-medium shrink-0"
                          >
                            Ký↗
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={item.contractAppendixCode || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'contractAppendixCode', e.target.value)
                          }
                          placeholder="Mã Phụ lục SOW..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                        />
                        <select
                          value={item.contractAppendixStatus || 'CHỜ_KÝ'}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'contractAppendixStatus',
                              e.target.value as DealContractAppendixStatus
                            )
                          }
                          className="h-6 px-1 rounded border border-line bg-surface text-2xs text-ink shrink-0"
                        >
                          <option value="CHƯA_LẬP">Chưa lập</option>
                          <option value="CHỜ_KÝ">Chờ ký</option>
                          <option value="ĐÃ_KÝ">Đã ký</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={item.contractAppendixGoogleDocsUrl || ''}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            'contractAppendixGoogleDocsUrl',
                            e.target.value
                          )
                        }
                        placeholder="Link Google Docs PL SOW..."
                        className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                      />
                      <div className="flex items-center justify-between gap-1 text-2xs">
                        <input
                          type="text"
                          value={item.contractAppendixSignedUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'contractAppendixSignedUrl', e.target.value)
                          }
                          placeholder="Link PL SOW đã ký..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        {item.contractAppendixGoogleDocsUrl && (
                          <a
                            href={item.contractAppendixGoogleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline font-medium shrink-0"
                          >
                            GDocs↗
                          </a>
                        )}
                        {item.contractAppendixSignedUrl && (
                          <a
                            href={item.contractAppendixSignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-positive hover:underline font-medium shrink-0"
                          >
                            Ký↗
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={item.bbntCode || ''}
                          onChange={(e) => handleFieldChange(item.id, 'bbntCode', e.target.value)}
                          placeholder="Mã BBNT..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                        />
                        <select
                          value={item.bbntStatus || 'CHƯA_LẬP'}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'bbntStatus',
                              e.target.value as DealContractAppendixStatus
                            )
                          }
                          className="h-6 px-1 rounded border border-line bg-surface text-2xs text-ink shrink-0"
                        >
                          <option value="CHƯA_LẬP">Chưa lập</option>
                          <option value="CHỜ_KÝ">Chờ ký</option>
                          <option value="ĐÃ_KÝ">Đã ký</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={item.bbntGoogleDocsUrl || ''}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'bbntGoogleDocsUrl', e.target.value)
                        }
                        placeholder="Link Google Docs BBNT..."
                        className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                      />
                      <div className="flex items-center justify-between gap-1 text-2xs">
                        <input
                          type="text"
                          value={item.bbntSignedUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'bbntSignedUrl', e.target.value)
                          }
                          placeholder="Link BBNT đã ký..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        {item.bbntGoogleDocsUrl && (
                          <a
                            href={item.bbntGoogleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline font-medium shrink-0"
                          >
                            GDocs↗
                          </a>
                        )}
                        {item.bbntSignedUrl && (
                          <a
                            href={item.bbntSignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-positive hover:underline font-medium shrink-0"
                          >
                            Ký↗
                          </a>
                        )}
                      </div>
                    </td>

                    {viewColumnMode !== 'BOOKING_FOCUS' && (
                      <>
                        <td className="px-3 py-2 border-r border-line align-middle">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.linkAir}
                              onChange={(e) =>
                                handleFieldChange(item.id, 'linkAir', e.target.value)
                              }
                              placeholder="Dán link video TikTok nghiệm thu..."
                              className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                            />
                            {item.linkAir ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={item.linkAir}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-2xs font-semibold text-positive hover:underline"
                                    >
                                      Mở video ↗
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => openDeepVideoInspector(item)}
                                      className="text-2xs font-semibold text-accent hover:underline"
                                      title="Kiểm tra 5 tiêu chí Brief, Hook 3s & Giỏ hàng TikTok Shop"
                                    >
                                      · Đối soát Brief &amp; Giỏ
                                    </button>
                                  </div>
                                  <span className="px-2 py-0.2 rounded bg-positive-soft text-positive text-2xs font-semibold">
                                    B1: Đã nghiệm thu Video
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 text-2xs">
                                  <span
                                    className={
                                      item.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
                                        ? 'text-positive font-semibold'
                                        : 'text-warning font-semibold'
                                    }
                                  >
                                    {item.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
                                      ? `B2: Đã nghiệm thu đủ (${(item.addonServices || []).filter((a) => a.acceptanceStatus === 'VERIFIED').length} DV)`
                                      : `B2: Chờ nghiệm thu phần khác (${(item.addonServices || []).filter((a) => a.acceptanceStatus === 'PENDING_ACCEPTANCE').length} DV)`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openDrawerForItem(item, 'ACCEPTANCE')}
                                    className="font-semibold text-accent hover:underline"
                                  >
                                    Nghiệm thu Asset →
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                                <span>B1: Chưa có Video · B2: Đang khóa</span>
                                <button
                                  type="button"
                                  onClick={() => openAcceptanceModalForRow(item)}
                                  className="font-semibold text-accent hover:underline"
                                >
                                  + Nghiệm thu
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle">
                          <input
                            type="date"
                            value={item.actualAirDate}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'actualAirDate', e.target.value)
                            }
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                          <div className="text-2xs font-code text-ink-3 mt-0.5">
                            Tuần real:{' '}
                            <span className="font-semibold text-ink">{item.tuanReal || '—'}</span> ·
                            Tháng: {item.thangAirReal || '—'}
                          </div>
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              item.trangThaiSlaAir.startsWith('Trễ')
                                ? 'bg-critical-soft text-critical'
                                : item.trangThaiSlaAir === 'Đúng hạn' ||
                                    item.trangThaiSlaAir.startsWith('Sớm')
                                  ? 'bg-positive-soft text-positive'
                                  : 'bg-sunken text-ink-3 border border-line'
                            }`}
                          >
                            {item.trangThaiSlaAir}
                          </span>
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle">
                          <input
                            type="text"
                            value={item.sparkAdsCode}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'sparkAdsCode', e.target.value)
                            }
                            placeholder="Mã Spark Ads..."
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle text-right space-y-1">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">View</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(item.views30d) || 0)}
                                onChange={(e) =>
                                  handleFieldChange(
                                    item.id,
                                    'views30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                title="Views 30 ngày"
                                className="w-full min-w-0 bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">Đơn</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(item.orders30d) || 0)}
                                onChange={(e) =>
                                  handleFieldChange(
                                    item.id,
                                    'orders30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                title="Số đơn hàng 30 ngày"
                                className="w-full min-w-0 bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                            <span className="text-2xs font-medium text-positive shrink-0">GMV</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(Number(item.gmv30d) || 0)}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'gmv30d',
                                  parseThousandNumberInput(e.target.value)
                                )
                              }
                              title="GMV 30 ngày (VNĐ)"
                              className="w-full min-w-0 bg-transparent text-right font-code font-semibold text-xs text-positive tabular-nums focus:outline-none"
                            />
                          </div>
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle text-right space-y-0.5">
                          <div className="font-code font-semibold text-xs text-ink tabular-nums">
                            ROI: {item.roi30d.toFixed(2)}x
                          </div>
                          <div className="text-2xs font-code text-ink-3 tabular-nums">
                            GPM: {formatVnd(item.gpm30d)}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.2 rounded text-2xs font-semibold truncate max-w-[140px] ${
                              item.danhGiaHieuQuaVideo.startsWith('Winner')
                                ? 'bg-positive-soft text-positive'
                                : item.danhGiaHieuQuaVideo.startsWith('Đạt KPI') ||
                                    item.danhGiaHieuQuaVideo.startsWith('FOC Hiệu quả')
                                  ? 'bg-accent-soft text-accent'
                                  : item.danhGiaHieuQuaVideo.startsWith('Cần tối ưu')
                                    ? 'bg-critical-soft text-critical'
                                    : 'bg-sunken text-ink-3'
                            }`}
                            title={item.danhGiaHieuQuaVideo}
                          >
                            {item.danhGiaHieuQuaVideo}
                          </span>
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle space-y-1">
                          <select
                            value={item.trangThaiPhieuThanhToan}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'trangThaiPhieuThanhToan',
                                e.target.value as ApprovedBookingPaymentStatus
                              )
                            }
                            className={`w-full h-7 px-2 rounded border text-xs font-semibold ${
                              item.trangThaiPhieuThanhToan === 'Đã thanh toán'
                                ? 'bg-positive-soft text-positive border-line'
                                : item.trangThaiPhieuThanhToan === 'Đủ điều kiện ĐNTT' ||
                                    item.trangThaiPhieuThanhToan === 'Đã lập ĐNTT'
                                  ? 'bg-accent-soft text-accent border-line'
                                  : 'bg-surface text-ink border-line'
                            }`}
                          >
                            {PAYMENT_STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <div className="text-2xs font-code text-ink-2 truncate">
                            TT theo Deal:{' '}
                            <span className="font-semibold text-ink">
                              {formatVnd(item.soTienCanThanhToan)}
                            </span>
                          </div>
                          {item.larkApprovalInstanceCode ? (
                            <div className="flex items-center justify-between gap-1 text-2xs">
                              <span
                                className="px-2 py-0.2 rounded bg-accent-soft text-accent font-code font-semibold truncate"
                                title={
                                  item.larkApprovalRouteSummary || item.larkApprovalInstanceCode
                                }
                              >
                                {item.larkSlipCode || item.larkApprovalInstanceCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => openLarkPaymentModalForItem(item)}
                                className="font-semibold text-accent hover:underline shrink-0"
                              >
                                Luồng Lark
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1 text-2xs">
                              <span
                                className="font-code text-ink-3 truncate max-w-[115px]"
                                title={item.noiDungChuyenKhoan}
                              >
                                {item.noiDungChuyenKhoan}
                              </span>
                              {item.bookingOrderCreated && (
                                <button
                                  type="button"
                                  onClick={() => openLarkPaymentModalForItem(item)}
                                  className="font-semibold text-accent hover:underline shrink-0"
                                >
                                  + Lark Approval
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-line align-middle text-2xs">
                          <div className="font-medium text-ink truncate max-w-[170px]">
                            {item.tenTaiKhoanNganHang || '—'}
                          </div>
                          <div className="font-code text-ink-2">
                            {maskSensitivePii(item.soTaiKhoan, canViewFullPii)} ·{' '}
                            {item.nganHang || '—'}
                          </div>
                          <div className="font-code text-2xs text-ink-3">
                            CCCD: {maskSensitivePii(item.soCccd, canViewFullPii)}
                          </div>
                        </td>
                      </>
                    )}

                    <td className="px-3 py-2 align-middle text-right">
                      <div
                        className="inline-flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!item.bookingOrderCreated ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openDealBuilderModal(item)}
                          >
                            Tạo Deal
                          </Button>
                        ) : item.contractAppendixStatus !== 'ĐÃ_KÝ' && onOpenContractForDeal ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              onOpenContractForDeal(
                                buildBookingDealFromApprovedItem(item),
                                'SOW'
                              )
                            }
                          >
                            Ký SOW
                          </Button>
                        ) : item.acceptanceStatus !== 'DA_NGHIEM_THU' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openAcceptanceModalForRow(item)}
                          >
                            Nghiệm thu
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openLarkPaymentModalForItem(item)}
                          >
                            Lập ĐNTT
                          </Button>
                        )}

                        <ActionMenu
                          items={[
                            {
                              label: 'Xem hồ sơ Deal & SOW',
                              icon: Eye,
                              onSelect: () => openDrawerForItem(item),
                            },
                            {
                              label: 'Sửa cấu hình Deal & SOW',
                              icon: FileCheck,
                              onSelect: () => openDealBuilderModal(item),
                            },
                            ...(onOpenContractForDeal
                              ? [
                                  {
                                    label: 'Hợp đồng nguyên tắc (HĐNT)',
                                    icon: FileText,
                                    onSelect: () =>
                                      onOpenContractForDeal(
                                        buildBookingDealFromApprovedItem(item),
                                        'HDNT'
                                      ),
                                  },
                                  {
                                    label: 'Phụ lục SOW',
                                    icon: FileText,
                                    onSelect: () =>
                                      onOpenContractForDeal(
                                        buildBookingDealFromApprovedItem(item),
                                        'SOW'
                                      ),
                                  },
                                  {
                                    label: 'Biên bản nghiệm thu (BBNT)',
                                    icon: FileText,
                                    onSelect: () =>
                                      onOpenContractForDeal(
                                        buildBookingDealFromApprovedItem(item),
                                        'BBNT'
                                      ),
                                  },
                                ]
                              : []),
                            {
                              label: 'Xem nháp BBNT',
                              icon: FileText,
                              onSelect: () =>
                                setDraftBbntPreviewDeal(buildBookingDealFromApprovedItem(item)),
                            },
                            {
                              label: 'Nghiệm thu video & quyền lợi',
                              icon: Video,
                              onSelect: () => openAcceptanceModalForRow(item),
                            },
                            {
                              label: 'Luồng duyệt thanh toán Lark',
                              icon: Send,
                              onSelect: () => openLarkPaymentModalForItem(item),
                            },
                            {
                              label: 'Xem hồ sơ KOC',
                              icon: Eye,
                              onSelect: () => setQuickViewApprovedItem(item),
                            },
                            ...(item.linkAir
                              ? [
                                  {
                                    label: 'Đối soát kịch bản & giỏ hàng',
                                    icon: Eye,
                                    onSelect: () => openDeepVideoInspector(item),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={filteredItems.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </>
  );
};
