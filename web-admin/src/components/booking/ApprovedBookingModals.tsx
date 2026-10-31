'use client';

import React from 'react';
import {
  Check,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Lock,
  Send,
  ShoppingBag,
  Sparkles,
  Unlock,
} from 'lucide-react';
import type { BookingDealItem, DealRightsTermItem } from '../../lib/types';
import {
  formatNumber,
  formatVnd,
  formatVndShort,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  buildBookingDealFromApprovedItem,
  buildDefaultAddonServicesForDeal,
  computeAirSlaStatus,
  computeDealSowJobSubtotal,
  computeLivestreamDurationEvaluation,
  computeWeekLabelFromDate,
  ensureDealJobsForApprovedItem,
  evaluateVideoEffectivenessLabel,
  generateMasterContractCode,
  isLivestreamBookingItem,
  isValidLivestreamProofUrl,
  recalculateApprovedBookingItem,
  type ApprovedBookingListItem,
  type DealSowJobItem,
} from '../../lib/approvedBookingList';
import { normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import { BOOKING_REPORT_COLUMNS } from '../../lib/bookingReportSheet';
import type { TikTokVideoInspectionResult } from '../../lib/tiktokVideoInspector';
import type {
  ParsedAcceptanceDraftRow,
  SheetSyncComparisonReportState,
} from './ApprovedBookingHelpers';
import {
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';

export interface ApprovedBookingModalsProps {
  bookingScope: 'ALL' | 'TIKTOK_VIDEO' | 'LIVESTREAM';
  items: ApprovedBookingListItem[];
  filteredItems: ApprovedBookingListItem[];
  itemsByHandleMap: Map<string, ApprovedBookingListItem[]>;

  // 1. Video & Rights Acceptance Modal
  isAcceptanceModalOpen: boolean;
  setIsAcceptanceModalOpen: (v: boolean) => void;
  isInspectingTikTokLinks: boolean;
  parsedAcceptanceRows: ParsedAcceptanceDraftRow[];
  handleInspectRealTikTokVideos: () => Promise<void>;
  handleConfirmVideoAcceptanceMapping: () => void;
  handleSaveAcceptanceAndOpenLarkApproval: () => void;
  selectedTargetBoItemId: string;
  handleSelectTargetBoInModal: (nextBoItemId: string) => void;
  defaultAcceptanceAirDate: string;
  setDefaultAcceptanceAirDate: (v: string) => void;
  acceptanceModalStats: {
    total: number;
    matchedCount: number;
    onTimeCount: number;
    totalCost: number;
    totalGmv: number;
    avgRoi: number;
    winnerCount: number;
  };
  acceptanceBulkText: string;
  setAcceptanceBulkText: (v: string) => void;
  setRowFieldOverrides: React.Dispatch<
    React.SetStateAction<
      Record<
        number,
        Partial<
          Pick<
            ParsedAcceptanceDraftRow,
            'actualAirDate' | 'sparkAdsCode' | 'views30d' | 'gmv30d' | 'orders30d'
          >
        >
      >
    >
  >;
  setRowManualBoMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  updateDraftRowField: <
    K extends 'actualAirDate' | 'sparkAdsCode' | 'views30d' | 'gmv30d' | 'orders30d',
  >(
    rowIdx: number,
    field: K,
    value: ParsedAcceptanceDraftRow[K]
  ) => void;
  inspectedVideosMap: Record<string, TikTokVideoInspectionResult>;
  openDeepVideoInspector: (item?: ApprovedBookingListItem, overrideUrl?: string) => void;
  stage2AddonEdits: Record<string, DealRightsTermItem[]>;
  stage2DealJobsEdits: Record<string, DealSowJobItem[]>;
  setStage2DealJobsEdits: React.Dispatch<React.SetStateAction<Record<string, DealSowJobItem[]>>>;
  stage2ActiveJobIdxMap: Record<string, number>;
  setStage2ActiveJobIdxMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setDraftBbntPreviewDeal: (deal: BookingDealItem | null) => void;

  // 2. Livestream Acceptance Modal
  isLiveAcceptanceModalOpen: boolean;
  setIsLiveAcceptanceModalOpen: (v: boolean) => void;
  liveAccTargetId: string;
  liveAccProofUrl: string;
  setLiveAccProofUrl: (v: string) => void;
  liveAccActualDate: string;
  setLiveAccActualDate: (v: string) => void;
  liveAccStartTime: string;
  setLiveAccStartTime: (v: string) => void;
  liveAccEndTime: string;
  setLiveAccEndTime: (v: string) => void;
  liveAccSessionsCount: number;
  setLiveAccSessionsCount: (v: number) => void;
  liveAccCommittedMinutes: number;
  setLiveAccCommittedMinutes: (v: number) => void;
  liveAccActualMinutes: number;
  setLiveAccActualMinutes: (v: number) => void;
  liveAccActualGmv: number;
  setLiveAccActualGmv: (v: number) => void;
  liveAccActualOrders: number;
  setLiveAccActualOrders: (v: number) => void;
  liveAccActualViews: number;
  setLiveAccActualViews: (v: number) => void;
  liveAccBonusAmount: number;
  setLiveAccBonusAmount: (v: number) => void;
  liveAccCustomPenalty: string;
  setLiveAccCustomPenalty: (v: string) => void;
  liveAccNote: string;
  setLiveAccNote: (v: string) => void;
  populateLiveAcceptanceFromItem: (target: ApprovedBookingListItem) => void;
  handleSaveLivestreamAcceptance: (openLarkModalAfter?: boolean) => void;

  // 3. Report Schema Modal
  isReportSchemaModalOpen: boolean;
  setIsReportSchemaModalOpen: (v: boolean) => void;
  reportSchemaGroupFilter: string;
  setReportSchemaGroupFilter: (v: string) => void;
  isSyncingReportSheet: boolean;
  handlePushReportSheetToGoogle: () => Promise<void>;

  // 4. Sync Comparison Report Modal
  syncComparisonReport: SheetSyncComparisonReportState | null;
  setSyncComparisonReport: (v: SheetSyncComparisonReportState | null) => void;
  syncDiffFilter: 'ALL' | 'CHANGED' | 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'EXTRA';
  setSyncDiffFilter: (
    v: 'ALL' | 'CHANGED' | 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'EXTRA'
  ) => void;
  confirmExecutePushReportSheet: () => Promise<void>;
  confirmExecutePullReportSheet: () => void;
  confirmExecutePullListingSheets: () => void;
}

export const ApprovedBookingModals: React.FC<ApprovedBookingModalsProps> = ({
  bookingScope,
  items,
  filteredItems,
  itemsByHandleMap,
  isAcceptanceModalOpen,
  setIsAcceptanceModalOpen,
  isInspectingTikTokLinks,
  parsedAcceptanceRows,
  handleInspectRealTikTokVideos,
  handleConfirmVideoAcceptanceMapping,
  handleSaveAcceptanceAndOpenLarkApproval,
  selectedTargetBoItemId,
  handleSelectTargetBoInModal,
  defaultAcceptanceAirDate,
  setDefaultAcceptanceAirDate,
  acceptanceModalStats,
  acceptanceBulkText,
  setAcceptanceBulkText,
  setRowFieldOverrides,
  setRowManualBoMap,
  updateDraftRowField,
  inspectedVideosMap,
  openDeepVideoInspector,
  stage2AddonEdits,
  stage2DealJobsEdits,
  setStage2DealJobsEdits,
  stage2ActiveJobIdxMap,
  setStage2ActiveJobIdxMap,
  setDraftBbntPreviewDeal,
  isLiveAcceptanceModalOpen,
  setIsLiveAcceptanceModalOpen,
  liveAccTargetId,
  liveAccProofUrl,
  setLiveAccProofUrl,
  liveAccActualDate,
  setLiveAccActualDate,
  liveAccStartTime,
  setLiveAccStartTime,
  liveAccEndTime,
  setLiveAccEndTime,
  liveAccSessionsCount,
  setLiveAccSessionsCount,
  liveAccCommittedMinutes,
  setLiveAccCommittedMinutes,
  liveAccActualMinutes,
  setLiveAccActualMinutes,
  liveAccActualGmv,
  setLiveAccActualGmv,
  liveAccActualOrders,
  setLiveAccActualOrders,
  liveAccActualViews,
  setLiveAccActualViews,
  liveAccBonusAmount,
  setLiveAccBonusAmount,
  liveAccCustomPenalty,
  setLiveAccCustomPenalty,
  liveAccNote,
  setLiveAccNote,
  populateLiveAcceptanceFromItem,
  handleSaveLivestreamAcceptance,
  isReportSchemaModalOpen,
  setIsReportSchemaModalOpen,
  reportSchemaGroupFilter,
  setReportSchemaGroupFilter,
  isSyncingReportSheet,
  handlePushReportSheetToGoogle,
  syncComparisonReport,
  setSyncComparisonReport,
  syncDiffFilter,
  setSyncDiffFilter,
  confirmExecutePushReportSheet,
  confirmExecutePullReportSheet,
  confirmExecutePullListingSheets,
}) => {
  return (
    <>
      {/* Hộp thoại Nghiệm thu video & quyền lợi */}
      <Modal
        open={isAcceptanceModalOpen}
        onClose={() => setIsAcceptanceModalOpen(false)}
        title="Nghiệm thu video & quyền lợi"
        size="2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAcceptanceModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="secondary"
              icon={isInspectingTikTokLinks ? Loader2 : Sparkles}
              disabled={isInspectingTikTokLinks || parsedAcceptanceRows.length === 0}
              onClick={() => void handleInspectRealTikTokVideos()}
            >
              {isInspectingTikTokLinks ? 'Đang quét TikTok...' : 'Quét số liệu TikTok'}
            </Button>
            <Button
              variant="secondary"
              icon={Check}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={handleConfirmVideoAcceptanceMapping}
            >
              Lưu nghiệm thu ({parsedAcceptanceRows.length})
            </Button>
            <Button
              variant="primary"
              icon={Send}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={handleSaveAcceptanceAndOpenLarkApproval}
            >
              Lưu &amp; Lập ĐNTT Lark
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tầng 1: Chọn BO mục tiêu + Ngày air mặc định + Dải KPI tóm tắt đợt nghiệm thu */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-lg bg-sunken border border-line items-end">
            <div className="lg:col-span-5">
              <Field label="Chọn Deal & Phụ lục SOW cần nghiệm thu (Hoặc tự động tìm theo @id_kênh)">
                <Select
                  value={selectedTargetBoItemId}
                  onChange={(e) => handleSelectTargetBoInModal(e.target.value)}
                >
                  <option value="AUTO">
                    Tự động tìm Deal &amp; Phụ lục SOW theo @id_kênh KOC trong link video TikTok
                  </option>
                  {filteredItems.map((boItem) => (
                    <option key={boItem.id} value={boItem.id}>
                      {boItem.maBooking ? `[${boItem.maBooking}]` : '[Chưa tạo Deal]'} @
                      {boItem.idKenh} — {boItem.storeName} · {boItem.sanPham} (
                      {formatVnd(boItem.chiPhiBookingNetCuoi)})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field label="Ngày air thực tế mặc định">
                <Input
                  type="date"
                  value={defaultAcceptanceAirDate}
                  onChange={(e) => setDefaultAcceptanceAirDate(e.target.value)}
                />
              </Field>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="px-3 py-2 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Khớp Deal</div>
                <div className="text-xs font-semibold text-ink tabular-nums">
                  {acceptanceModalStats.matchedCount}/{acceptanceModalStats.total} video
                </div>
              </div>
              <div className="px-3 py-2 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Đúng hạn SLA</div>
                <div className="text-xs font-semibold text-positive tabular-nums">
                  {acceptanceModalStats.onTimeCount}/{acceptanceModalStats.total}
                </div>
              </div>
              <div className="px-3 py-2 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Tổng GMV 30d</div>
                <div className="text-xs font-semibold text-positive tabular-nums">
                  {formatVndShort(acceptanceModalStats.totalGmv)}
                </div>
              </div>
              <div className="px-3 py-2 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">ROI bình quân</div>
                <div className="text-xs font-semibold text-ink tabular-nums">
                  {acceptanceModalStats.avgRoi}x ({acceptanceModalStats.winnerCount} Win)
                </div>
              </div>
            </div>
          </div>

          {/* Tầng 2: Ô dán nhanh danh sách link TikTok (hỗ trợ dán 1 hoặc nhiều link) */}
          <Field label="Dán Link Video TikTok cần nghiệm thu (Mỗi dòng 1 video: Link_TikTok | Mã_Spark_Ads | Views_30d | GMV_30d | Đơn_30d | Ngày_Air)">
            <Textarea
              rows={3}
              value={acceptanceBulkText}
              onChange={(e) => {
                setRowFieldOverrides({});
                setAcceptanceBulkText(e.target.value);
              }}
              placeholder="https://www.tiktok.com/@katthy.review/video/7425819201928371 | #SPARK-KATTHY | 32000 | 18500000 | 64 | 2026-10-25"
              className="font-code text-xs"
            />
          </Field>

          {/* Tầng 3: Bảng đối soát & chỉnh sửa trực tiếp các trường nghiệm thu cho từng dòng */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">
                Bảng đối soát nghiệm thu ({acceptanceModalStats.matchedCount}/
                {acceptanceModalStats.total} dòng đã gắn Deal &amp; SOW)
              </span>
            </div>
            <div className="max-h-80 overflow-x-auto overflow-y-auto">
              <table className="w-full text-xs border-collapse min-w-[1020px]">
                <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-left">
                  <tr>
                    <th className="px-3 py-2 border-r border-line w-[180px]">
                      Kênh KOC &amp; Link Video
                    </th>
                    <th className="px-3 py-2 border-r border-line min-w-[250px]">
                      Chọn Deal &amp; Phụ lục SOW (Hạng mục Video + DV gia tăng)
                    </th>
                    <th className="px-3 py-2 border-r border-line w-[160px]">
                      Ngày air thực tế &amp; SLA
                    </th>
                    <th className="px-3 py-2 border-r border-line w-[145px]">Mã Spark Ads</th>
                    <th className="px-3 py-2 border-r border-line w-[195px] text-right">
                      Views · Đơn · GMV 30d
                    </th>
                    <th className="px-3 py-2 text-right w-[165px]">ROI · Đánh giá · ĐNTT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsedAcceptanceRows.map((row, idx) => {
                    const m = row.matchedItem;
                    const finalCost = m?.chiPhiBookingNetCuoi || 0;
                    const remainPay = Math.max(
                      0,
                      finalCost - (m?.soTienTamUngTruoc || 0)
                    );
                    const roi =
                      finalCost > 0
                        ? Number((row.gmv30d / finalCost).toFixed(2))
                        : 0;
                    const gpm =
                      row.views30d > 0
                        ? Math.round((row.gmv30d / row.views30d) * 1000)
                        : 0;
                    const effectivenessLabel = evaluateVideoEffectivenessLabel(
                      roi,
                      row.views30d,
                      finalCost
                    );
                    const sla = computeAirSlaStatus(
                      m?.plannedAirDate || '',
                      row.actualAirDate
                    );
                    const cleanHandle = normalizeTikTokId(row.channelHandle).toLowerCase();
                    const sameChannelBoList = cleanHandle
                      ? itemsByHandleMap.get(cleanHandle) || []
                      : [];
                    const sameChannelIdSet = new Set(sameChannelBoList.map((sc) => sc.id));
                    const otherBoList = filteredItems.filter(
                      (it) => !sameChannelIdSet.has(it.id)
                    );
                    const insp =
                      (row.videoId ? inspectedVideosMap[row.videoId] : undefined) ||
                      (cleanHandle ? inspectedVideosMap[cleanHandle] : undefined);

                    return (
                      <tr
                        key={row.videoId || row.linkAir || `${row.channelHandle}-${idx}`}
                        className="hover:bg-sunken/30 align-top"
                      >
                        <td className="px-3 py-2 border-r border-line space-y-1">
                          <div className="font-code font-semibold text-ink">
                            @{row.channelHandle || m?.idKenh || 'Chưa rõ'}
                          </div>
                          {row.videoId && (
                            <div className="font-code text-2xs text-ink-3">
                              ID: {row.videoId}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {row.linkAir && (
                              <a
                                href={row.linkAir}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-2xs font-semibold text-positive hover:underline"
                              >
                                Mở video ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openDeepVideoInspector(m, row.linkAir)}
                              className="text-2xs font-semibold text-accent hover:underline"
                            >
                              Soi kịch bản &amp; giỏ
                            </button>
                          </div>
                          {insp && (
                            <div className="pt-1 border-t border-line space-y-0.5 text-2xs">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  className={`px-2 py-0.2 rounded font-semibold ${
                                    insp.verdict === 'ĐẠT_CHUẨN'
                                      ? 'bg-positive-soft text-positive'
                                      : insp.verdict === 'CẦN_KIỂM_TRA'
                                        ? 'bg-warning-soft text-warning'
                                        : 'bg-critical-soft text-critical'
                                  }`}
                                >
                                  {insp.verdict === 'ĐẠT_CHUẨN'
                                    ? 'Đạt Brief'
                                    : insp.verdict === 'CẦN_KIỂM_TRA'
                                      ? 'Cần kiểm tra'
                                      : 'Lệch Brief'}
                                </span>
                                <span className="inline-flex items-center gap-0.5 text-ink-2">
                                  <ShoppingBag className="w-2.5 h-2.5 text-accent" />
                                  {insp.contentCheck.hasCartAnchor
                                    ? 'Có giỏ'
                                    : 'Không giỏ'}
                                </span>
                              </div>
                              {insp.contentCheck.hookFirst3Seconds && (
                                <div
                                  className="text-ink-3 truncate max-w-[165px]"
                                  title={insp.contentCheck.hookFirst3Seconds}
                                >
                                  Hook: &ldquo;{insp.contentCheck.hookFirst3Seconds}&rdquo;
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-line space-y-1">
                          <select
                            value={m?.id || ''}
                            onChange={(e) => {
                              const pickedId = e.target.value;
                              setRowManualBoMap((prev) => ({
                                ...prev,
                                [idx]: pickedId,
                              }));
                            }}
                            className="w-full h-7 px-2 rounded border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-ink"
                          >
                            <option value="">
                              -- Tự động tìm trên Sheet Listing Brand --
                            </option>
                            {sameChannelBoList.length > 0 && (
                              <optgroup
                                label={`Deal & Phụ lục SOW của kênh @${row.channelHandle} (${sameChannelBoList.length})`}
                              >
                                {sameChannelBoList.map((bo) => (
                                  <option key={bo.id} value={bo.id}>
                                    {bo.maBooking || 'Sẽ tự cấp BO'} · {bo.storeName} ·{' '}
                                    {bo.sanPham} ({formatVnd(bo.chiPhiBookingNetCuoi)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {otherBoList.length > 0 && (
                              <optgroup label="Chọn Deal & Phụ lục SOW khác trong danh sách">
                                {otherBoList.map((bo) => (
                                  <option key={bo.id} value={bo.id}>
                                    {bo.maBooking || 'Chưa cấp BO'} · @{bo.idKenh} ·{' '}
                                    {bo.storeName} · {bo.sanPham}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {m ? (
                            <div className="flex items-center justify-between gap-1 text-2xs text-positive font-medium">
                              <span>
                                ✓ Deal:{' '}
                                <span className="font-code font-semibold text-ink">
                                  {m.maBooking || 'Tự cấp khi lưu'}
                                </span>{' '}
                                · {m.sanPham}
                              </span>
                              <span className="font-code font-semibold text-ink">
                                Net: {formatVnd(finalCost)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-2xs text-warning">
                              Chưa có trong List duyệt — sẽ tự tìm từ Sheet Listing Brand
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-line space-y-1">
                          <input
                            type="date"
                            value={row.actualAirDate}
                            onChange={(e) =>
                              updateDraftRowField(idx, 'actualAirDate', e.target.value)
                            }
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                          <div className="flex items-center justify-between gap-1 text-2xs font-code">
                            <span className="text-ink-3">
                              KH: {m?.plannedAirDate || '—'} (
                              {computeWeekLabelFromDate(row.actualAirDate)})
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded font-sans font-semibold ${
                                sla.statusText.startsWith('Trễ')
                                  ? 'bg-critical-soft text-critical'
                                  : sla.statusText === 'Đúng hạn' ||
                                      sla.statusText.startsWith('Sớm')
                                    ? 'bg-positive-soft text-positive'
                                    : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {sla.statusText}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-2 border-r border-line space-y-1">
                          <input
                            type="text"
                            value={row.sparkAdsCode}
                            onChange={(e) =>
                              updateDraftRowField(idx, 'sparkAdsCode', e.target.value)
                            }
                            placeholder="#SPARK-..."
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                          <div className="text-2xs text-ink-3">
                            {row.sparkAdsCode ? 'Đã có mã ủy quyền Ads' : 'Chưa nhập mã Ads'}
                          </div>
                        </td>

                        <td className="px-3 py-2 border-r border-line space-y-1">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">View</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(row.views30d) || 0)}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'views30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                className="w-full bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">Đơn</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(row.orders30d) || 0)}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'orders30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                className="w-full bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 h-6 px-2 rounded border border-line bg-surface">
                            <span className="text-2xs font-medium text-positive shrink-0">
                              GMV
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(Number(row.gmv30d) || 0)}
                              onChange={(e) =>
                                updateDraftRowField(
                                  idx,
                                  'gmv30d',
                                  parseThousandNumberInput(e.target.value)
                                )
                              }
                              className="w-full bg-transparent text-right font-code font-semibold text-xs text-positive tabular-nums focus:outline-none"
                            />
                          </div>
                        </td>

                        <td className="px-3 py-2 text-right space-y-0.5">
                          <div className="font-code font-semibold text-xs text-ink tabular-nums">
                            ROI: {roi > 0 ? `${roi}x` : '0.00x'}{' '}
                            <span className="text-2xs font-normal text-ink-3">
                              (GPM {formatVndShort(gpm)})
                            </span>
                          </div>
                          <div>
                            <span
                              className={`inline-block px-2 py-0.2 rounded text-2xs font-semibold ${
                                effectivenessLabel.startsWith('Winner')
                                  ? 'bg-positive-soft text-positive'
                                  : effectivenessLabel.startsWith('Đạt KPI') ||
                                      effectivenessLabel.startsWith('FOC Hiệu quả')
                                    ? 'bg-accent-soft text-accent'
                                    : effectivenessLabel.startsWith('Cần tối ưu')
                                      ? 'bg-critical-soft text-critical'
                                      : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {effectivenessLabel}
                            </span>
                          </div>
                          {m && (
                            <div className="text-2xs font-code text-positive font-semibold">
                              Đủ ĐK ĐNTT · Còn trả: {formatVndShort(remainPay)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tầng 4 (Bước 2): Nghiệm thu theo từng Bảng công việc (Job) & Quyền lợi theo Deal */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink inline-flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Bước 2: Nghiệm thu theo từng Bảng công việc (Job) &amp; Quyền lợi trong Phụ lục SOW
              </span>
            </div>

            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {parsedAcceptanceRows.map((row, idx) => {
                const m = row.matchedItem;
                if (!m) return null;
                const baseJobs = ensureDealJobsForApprovedItem({
                  ...m,
                  linkAir: row.linkAir || m.linkAir,
                  actualAirDate: row.actualAirDate || m.actualAirDate,
                  sparkAdsCode: row.sparkAdsCode || m.sparkAdsCode,
                });
                const currentDealJobs = stage2DealJobsEdits[m.id] || baseJobs;
                const activeJobIdx = Math.min(
                  Math.max(0, stage2ActiveJobIdxMap[m.id] || 0),
                  Math.max(0, currentDealJobs.length - 1)
                );
                const activeJob = currentDealJobs[activeJobIdx] || currentDealJobs[0];
                const hasVideoStep1 = Boolean(
                  row.linkAir?.trim() ||
                    m.linkAir?.trim() ||
                    row.actualAirDate?.trim() ||
                    activeJob?.linkAir?.trim()
                );

                const currentAddons =
                  activeJob?.addonServices && activeJob.addonServices.length > 0
                    ? activeJob.addonServices
                    : stage2AddonEdits[m.id] ||
                      (m.addonServices && m.addonServices.length > 0
                        ? m.addonServices
                        : buildDefaultAddonServicesForDeal({
                            maBooking: activeJob?.jobCode || m.maBooking || 'DEAL',
                            totalNet:
                              (activeJob
                                ? computeDealSowJobSubtotal(activeJob).plannedJobNet
                                : 0) || m.chiPhiBookingNetCuoi,
                            sparkAdsCode:
                              activeJob?.sparkAdsCode || row.sparkAdsCode || m.sparkAdsCode,
                            actualAirDate:
                              activeJob?.actualAirDate || row.actualAirDate || m.actualAirDate,
                            includeDefaultAddons: true,
                          }));

                const totalVideoCostAllJobs = currentDealJobs.reduce(
                  (s, j) => s + (Number(j.videoAssetNetCost) || 0),
                  0
                );
                const totalAddonsCostAllJobs = currentDealJobs.reduce(
                  (s, j) =>
                    s +
                    (j.addonServices || []).reduce(
                      (sa, a) => sa + (Number(a.allocatedCostVnd) || 0),
                      0
                    ),
                  0
                );
                const totalDroppedCostAllJobs = currentDealJobs.reduce(
                  (s, j) =>
                    s +
                    (j.addonServices || [])
                      .filter((a) => a.acceptanceStatus === 'DROPPED')
                      .reduce((sa, a) => sa + (Number(a.allocatedCostVnd) || 0), 0),
                  0
                );
                const totalDealNet =
                  totalVideoCostAllJobs + totalAddonsCostAllJobs || m.chiPhiBookingNetCuoi;
                const effectiveDealPayable = Math.max(
                  0,
                  totalDealNet - totalDroppedCostAllJobs - (m.soTienTamUngTruoc || 0)
                );

                const updateActiveJobInModal = (patch: Partial<DealSowJobItem>) => {
                  const nextJobs = currentDealJobs.map((j, jIdx) => {
                    if (jIdx !== activeJobIdx) return j;
                    return { ...j, ...patch };
                  });
                  setStage2DealJobsEdits((prev) => ({
                    ...prev,
                    [m.id]: nextJobs,
                  }));
                };

                return (
                  <div
                    key={`${m.id}-${idx}`}
                    className="p-3 rounded-lg border border-line bg-sunken/30 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-code font-semibold text-ink">
                          Deal: {m.maBooking || 'Sẽ cấp mã BO'} · @{m.idKenh} (
                          {currentDealJobs.length} Job · {currentDealJobs.length} Bảng CV)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-2xs text-ink-2">
                          HĐNT:{' '}
                          {m.masterContractCode || generateMasterContractCode(m.idKenh, m.kocId)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-2xs text-ink-2">
                          Phụ lục: {m.contractAppendixCode || `PL-${m.maBooking || 'DEAL'}-01`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-code text-2xs">
                        <span>
                          Video ({currentDealJobs.length} Job): {formatVnd(totalVideoCostAllJobs)}
                        </span>
                        <span>+ DV kèm: {formatVnd(totalAddonsCostAllJobs)}</span>
                        {totalDroppedCostAllJobs > 0 && (
                          <span className="text-critical font-semibold">
                            - Khấu trừ hủy: {formatVnd(totalDroppedCostAllJobs)}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-positive-soft text-positive font-semibold">
                          Thanh toán Deal: {formatVnd(effectiveDealPayable)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const mergedItem = recalculateApprovedBookingItem({
                              ...m,
                              linkAir: row.linkAir || m.linkAir,
                              actualAirDate: row.actualAirDate || m.actualAirDate,
                              sparkAdsCode: row.sparkAdsCode || m.sparkAdsCode,
                              dealJobs: currentDealJobs,
                            });
                            setDraftBbntPreviewDeal(buildBookingDealFromApprovedItem(mergedItem));
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-soft text-accent font-sans font-semibold text-2xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Xem nháp BBNT ({currentDealJobs.length} Bảng CV)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {currentDealJobs.map((jItem, jIdx) => {
                        const isSelectedJob = jIdx === activeJobIdx;
                        const sub = computeDealSowJobSubtotal(jItem);
                        return (
                          <button
                            key={jItem.id || jIdx}
                            type="button"
                            onClick={() =>
                              setStage2ActiveJobIdxMap((prev) => ({
                                ...prev,
                                [m.id]: jIdx,
                              }))
                            }
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-2xs transition-colors ${
                              isSelectedJob
                                ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                                : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                            }`}
                          >
                            <span className="font-code text-accent font-semibold">
                              Bảng CV #{jIdx + 1} · {jItem.jobCode}
                            </span>
                            <span className="truncate max-w-[130px]">
                              {jItem.productName || jItem.jobTitle}
                            </span>
                            <span className="font-code text-ink">
                              {formatVndShort(sub.acceptedJobNet)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {activeJob && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded border border-line bg-surface">
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Link Video nghiệm thu ({activeJob.jobCode})
                          </span>
                          <input
                            type="text"
                            value={
                              activeJobIdx === 0
                                ? activeJob.linkAir || row.linkAir || ''
                                : activeJob.linkAir || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({
                                linkAir: e.target.value,
                                acceptanceStatus: e.target.value.trim()
                                  ? 'DA_NGHIEM_THU'
                                  : 'CHUA_NGHIEM_THU',
                              })
                            }
                            placeholder="https://www.tiktok.com/@koc/video/..."
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Ngày lên sóng thực tế ({activeJob.jobCode})
                          </span>
                          <input
                            type="date"
                            value={
                              activeJobIdx === 0
                                ? activeJob.actualAirDate || row.actualAirDate || ''
                                : activeJob.actualAirDate || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({ actualAirDate: e.target.value })
                            }
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Mã Spark Ads ({activeJob.jobCode})
                          </span>
                          <input
                            type="text"
                            value={
                              activeJobIdx === 0
                                ? activeJob.sparkAdsCode || row.sparkAdsCode || ''
                                : activeJob.sparkAdsCode || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({ sparkAdsCode: e.target.value })
                            }
                            placeholder="#SPARK-..."
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                      </div>
                    )}

                    {!hasVideoStep1 ? (
                      <div className="flex items-center gap-2 p-2 rounded bg-warning-soft text-warning text-xs font-medium">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Đang khóa Bước 2: Cần điền Link Video nghiệm thu ở Bước 1 trước khi nghiệm thu các phần dịch vụ gia tăng của Bảng công việc.
                        </span>
                      </div>
                    ) : currentAddons.length === 0 ? (
                      <div className="text-ink-3 text-xs">
                        Bảng công việc #{activeJobIdx + 1} ({activeJob?.jobCode}) chỉ gồm 1 Video thuần (không có dịch vụ gia tăng đi kèm).
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentAddons.map((addon, addonIdx) => {
                          const effectiveStatus =
                            addon.acceptanceStatus === 'LOCKED_BY_VIDEO'
                              ? 'PENDING_ACCEPTANCE'
                              : addon.acceptanceStatus || 'PENDING_ACCEPTANCE';
                          return (
                            <div
                              key={addon.id || addonIdx}
                              className="p-2 rounded border border-line bg-surface space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-ink inline-flex items-center gap-1">
                                  <Unlock className="w-3.5 h-3.5 text-positive shrink-0" />
                                  {addon.termLabel}
                                </span>
                                <span className="font-code text-2xs text-ink-3">
                                  {addon.allocatedCostVnd
                                    ? formatVnd(addon.allocatedCostVnd)
                                    : 'Gộp trong gói Job'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={
                                    addon.termType === 'ADS_CODE'
                                      ? addon.evidenceCodeOrUrl ||
                                        activeJob?.sparkAdsCode ||
                                        row.sparkAdsCode ||
                                        ''
                                      : addon.evidenceCodeOrUrl || ''
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const nextList = currentAddons.map((a, i) =>
                                      i === addonIdx
                                        ? {
                                            ...a,
                                            evidenceCodeOrUrl: val,
                                            acceptanceStatus: val.trim()
                                              ? ('VERIFIED' as const)
                                              : a.acceptanceStatus,
                                          }
                                        : a
                                    );
                                    updateActiveJobInModal({ addonServices: nextList });
                                  }}
                                  placeholder="Mã Spark Ads / Link bài Reup / Link bàn giao file..."
                                  className="sm:col-span-7 h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                />
                                <select
                                  value={effectiveStatus}
                                  onChange={(e) => {
                                    const nextSt = e.target
                                      .value as DealRightsTermItem['acceptanceStatus'];
                                    const nextList = currentAddons.map((a, i) =>
                                      i === addonIdx
                                        ? {
                                            ...a,
                                            acceptanceStatus: nextSt,
                                          }
                                        : a
                                    );
                                    updateActiveJobInModal({ addonServices: nextList });
                                  }}
                                  className={`sm:col-span-5 h-7 px-2 rounded border text-xs font-semibold ${
                                    effectiveStatus === 'VERIFIED'
                                      ? 'bg-positive-soft text-positive border-line'
                                      : effectiveStatus === 'DROPPED'
                                        ? 'bg-critical-soft text-critical border-line'
                                        : 'bg-warning-soft text-warning border-line'
                                  }`}
                                >
                                  <option value="VERIFIED">Đã nghiệm thu</option>
                                  <option value="PENDING_ACCEPTANCE">Chờ trả quyền lợi</option>
                                  <option value="DROPPED">Không thực hiện (Khấu trừ)</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Hộp thoại Nghiệm thu Phiên Livestream chuyên biệt (Bảng 3.2 — 3 Khối BR-LIVE-01..08) */}
      <Modal
        open={isLiveAcceptanceModalOpen}
        onClose={() => setIsLiveAcceptanceModalOpen(false)}
        title="Nghiệm thu Phiên Livestream & Quyết toán Cát-xê (Bảng 3.2 → 6.1)"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsLiveAcceptanceModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="secondary"
              icon={Check}
              onClick={() => handleSaveLivestreamAcceptance(false)}
            >
              Lưu nghiệm thu Live
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => handleSaveLivestreamAcceptance(true)}
            >
              Lưu &amp; Lập ĐNTT Lark (6.1)
            </Button>
          </>
        }
      >
        {(() => {
          const liveTarget =
            items.find((i) => i.id === liveAccTargetId) ||
            filteredItems.find((i) => isLivestreamBookingItem(i)) ||
            filteredItems[0];
          const agreedNet = liveTarget?.chiPhiBookingNetCuoi || 0;
          const advancePaid = liveTarget?.soTienTamUngTruoc || 0;
          const targetGmv = liveTarget?.liveTargetGmv || 0;
          const kpiType = liveTarget?.liveKpiType || 'Tham chiếu';
          const durationEval = computeLivestreamDurationEvaluation(
            liveAccCommittedMinutes,
            liveAccActualMinutes,
            agreedNet
          );
          const effectivePenalty =
            liveAccCustomPenalty.trim() !== ''
              ? Math.max(0, Number(liveAccCustomPenalty.replace(/\D/g, '')) || 0)
              : durationEval.autoDeductionVnd;
          const remainingPayable = Math.max(
            0,
            agreedNet + liveAccBonusAmount - effectivePenalty - advancePaid
          );
          const gmvAchievementPct =
            targetGmv > 0 ? Math.round((liveAccActualGmv / targetGmv) * 100) : 0;
          const roiActual =
            agreedNet > 0 ? (liveAccActualGmv / agreedNet).toFixed(2) : '0.00';
          const proofValid = isValidLivestreamProofUrl(liveAccProofUrl);

          return (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-sunken border border-line grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7">
                  <Field label="Chọn Phiên Livestream cần nghiệm thu (Bảng 3.2)">
                    <Select
                      value={liveTarget?.id || ''}
                      onChange={(e) => {
                        const found = items.find((x) => x.id === e.target.value);
                        if (found) populateLiveAcceptanceFromItem(found);
                      }}
                    >
                      {filteredItems
                        .filter((x) => isLivestreamBookingItem(x) || bookingScope === 'LIVESTREAM')
                        .map((bo) => (
                          <option key={bo.id} value={bo.id}>
                            [{bo.maBooking || 'LIVE'}] @{bo.idKenh} ({bo.tenKenh}) — {bo.brandName} ·
                            Cát-xê {formatVnd(bo.chiPhiBookingNetCuoi)}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
                  <Status tone="info">{liveTarget?.livePackageType || 'Phiên Livestream'}</Status>
                  <Status tone={kpiType === 'Cam kết' ? 'warning' : 'neutral'}>
                    KPI {kpiType}: {formatVndShort(targetGmv)}
                  </Status>
                  <Status tone="positive">HH {liveTarget?.liveCommissionPct ?? 15}%</Status>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                  <span className="text-xs font-semibold text-ink">
                    1. Bằng chứng Nghiệm thu (Google Drive / Lark Folder) &amp; Đối soát Thời lượng
                    (BR-LIVE-02)
                  </span>
                  <Status
                    tone={
                      durationEval.status === 'PASS_100'
                        ? 'positive'
                        : durationEval.status === 'PARTIAL_DEDUCT'
                          ? 'warning'
                          : durationEval.status === 'FAIL_HOLD'
                            ? 'critical'
                            : 'neutral'
                    }
                  >
                    {durationEval.statusLabel}
                  </Status>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <Field label="Link Folder Bằng chứng / Replay (Google Drive Folder · Lark Folder · Google Sheets · TikTok)">
                      <Input
                        value={liveAccProofUrl}
                        onChange={(e) => setLiveAccProofUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/... hoặc https://upbase.sg.larksuite.com/drive/folder/..."
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="Ngày lên sóng thực tế">
                      <Input
                        type="date"
                        value={liveAccActualDate}
                        onChange={(e) => setLiveAccActualDate(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-3">
                    <Field label="Khung giờ phát sóng">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input
                          aria-label="Giờ bắt đầu"
                          value={liveAccStartTime}
                          onChange={(e) => setLiveAccStartTime(e.target.value)}
                          placeholder="20:00"
                        />
                        <Input
                          aria-label="Giờ kết thúc"
                          value={liveAccEndTime}
                          onChange={(e) => setLiveAccEndTime(e.target.value)}
                          placeholder="22:00"
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="md:col-span-3">
                    <Field label="Số buổi live (Đồng bộ 6.1)">
                      <Input
                        type="number"
                        min={1}
                        value={liveAccSessionsCount}
                        onChange={(e) =>
                          setLiveAccSessionsCount(Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-3">
                    <Field label="Phút cam kết">
                      <Input
                        type="number"
                        min={15}
                        step={15}
                        value={liveAccCommittedMinutes}
                        onChange={(e) =>
                          setLiveAccCommittedMinutes(Math.max(15, Number(e.target.value) || 0))
                        }
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-3">
                    <Field label="Phút thực tế đã live">
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={liveAccActualMinutes}
                        onChange={(e) =>
                          setLiveAccActualMinutes(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-2xs px-2.5 py-2 rounded bg-sunken">
                  <span className="text-ink-2">
                    Trạng thái Link bằng chứng:{' '}
                    <strong className={proofValid ? 'text-positive' : 'text-warning'}>
                      {proofValid
                        ? 'Hợp lệ (Đã mở khóa kiểm tra Link trên Phiếu 6.1)'
                        : 'Chưa nhập hoặc chưa đúng định dạng URL'}
                    </strong>
                  </span>
                  {liveAccProofUrl.trim() && proofValid && (
                    <a
                      href={liveAccProofUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Mở Folder bằng chứng <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                  <span className="text-xs font-semibold text-ink">
                    2. Chỉ số Doanh thu Phiên Live (Ghi nhận vào 3.2 &amp; Đồng bộ Tổng NMV sang
                    6.1)
                  </span>
                  <div className="flex items-center gap-2">
                    <Status
                      tone={
                        targetGmv <= 0 || gmvAchievementPct >= 100
                          ? 'positive'
                          : kpiType === 'Cam kết'
                            ? 'critical'
                            : 'warning'
                      }
                    >
                      Đạt {gmvAchievementPct}% KPI GMV ({roiActual}x ROI)
                    </Status>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Doanh thu GMV / NMV thực tế phiên Live (VNĐ)">
                    <Input
                      type="number"
                      min={0}
                      step={1000000}
                      value={liveAccActualGmv}
                      onChange={(e) =>
                        setLiveAccActualGmv(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </Field>
                  <Field label="Số đơn hàng phát sinh trong phiên">
                    <Input
                      type="number"
                      min={0}
                      value={liveAccActualOrders}
                      onChange={(e) =>
                        setLiveAccActualOrders(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </Field>
                  <Field label="Tổng lượt xem Live (Views / Peak PCU)">
                    <Input
                      type="number"
                      min={0}
                      value={liveAccActualViews}
                      onChange={(e) =>
                        setLiveAccActualViews(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </Field>
                </div>

                {liveTarget?.liveGmvBonusTier && (
                  <div className="text-2xs text-ink-2 px-2.5 py-1.5 rounded bg-sunken">
                    Chính sách thưởng GMV trên SOW:{' '}
                    <strong className="text-ink">{liveTarget.liveGmvBonusTier}</strong>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                  <span className="text-xs font-semibold text-ink">
                    3. Bảng tính Quyết toán Cát-xê Phiên Live
                  </span>
                  <span className="text-xs font-semibold text-positive tabular-nums">
                    Cần thanh toán Net: {formatVnd(remainingPayable)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Thưởng nóng vượt mốc GMV (VNĐ)">
                    <Input
                      type="number"
                      min={0}
                      step={500000}
                      value={liveAccBonusAmount}
                      onChange={(e) =>
                        setLiveAccBonusAmount(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </Field>
                  <Field label="Khấu trừ thiếu giờ / vi phạm SOW (VNĐ)">
                    <Input
                      type="number"
                      min={0}
                      step={500000}
                      value={
                        liveAccCustomPenalty !== ''
                          ? liveAccCustomPenalty
                          : String(durationEval.autoDeductionVnd)
                      }
                      onChange={(e) => setLiveAccCustomPenalty(e.target.value)}
                    />
                  </Field>
                  <Field label="Ghi chú nghiệm thu / Giải trình">
                    <Input
                      value={liveAccNote}
                      onChange={(e) => setLiveAccNote(e.target.value)}
                      placeholder="Ghi chú đối soát giỏ hàng, thời lượng..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs tabular-nums">
                  <div className="p-2 rounded border border-line bg-canvas">
                    <div className="text-2xs text-ink-3">Cát-xê cứng Net</div>
                    <div className="font-semibold text-ink">{formatVnd(agreedNet)}</div>
                  </div>
                  <div className="p-2 rounded border border-line bg-canvas">
                    <div className="text-2xs text-ink-3">+ Thưởng GMV</div>
                    <div className="font-semibold text-positive">
                      +{formatVnd(liveAccBonusAmount)}
                    </div>
                  </div>
                  <div className="p-2 rounded border border-line bg-canvas">
                    <div className="text-2xs text-ink-3">- Khấu trừ</div>
                    <div className="font-semibold text-critical">
                      -{formatVnd(effectivePenalty)}
                    </div>
                  </div>
                  <div className="p-2 rounded border border-line bg-canvas">
                    <div className="text-2xs text-ink-3">- Đã tạm ứng</div>
                    <div className="font-semibold text-ink-2">-{formatVnd(advancePaid)}</div>
                  </div>
                  <div className="p-2 rounded border border-line bg-positive-soft/40">
                    <div className="text-2xs text-ink-2">Còn thanh toán Net</div>
                    <div className="font-semibold text-positive">
                      {formatVnd(remainingPayable)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Hộp thoại Cấu trúc Sheet 3 — Kết quả (28 cột A -> AB) */}
      <Modal
        open={isReportSchemaModalOpen}
        onClose={() => setIsReportSchemaModalOpen(false)}
        title="Cấu trúc Sheet 3 — Kết quả (28 cột A → AB)"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-ink-2">
              Tab: <code className="font-mono text-ink">Template Report Video - đã chốt</code> ·{' '}
              <code className="font-mono text-ink">Báo cáo &amp; Nghiệm thu</code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReportSchemaModalOpen(false)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileSpreadsheet}
                disabled={isSyncingReportSheet}
                onClick={() => {
                  setIsReportSchemaModalOpen(false);
                  void handlePushReportSheetToGoogle();
                }}
              >
                Đẩy Sheet Kết quả
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <Segmented
            value={reportSchemaGroupFilter}
            onChange={setReportSchemaGroupFilter}
            items={[
              { key: 'ALL', label: `Tất cả (${BOOKING_REPORT_COLUMNS.length})` },
              ...Array.from(new Set(BOOKING_REPORT_COLUMNS.map((c) => c.group))).map((grp) => ({
                key: grp,
                label: grp,
              })),
            ]}
          />

          <div className="max-h-[440px] overflow-y-auto border border-line rounded-lg">
            <DataTable
              columns={[
                {
                  key: 'col',
                  header: 'Cột',
                  width: 85,
                  render: (r) => (
                    <span className="font-mono text-xs font-semibold text-ink">
                      #{r.index} ({r.excelCol})
                    </span>
                  ),
                },
                {
                  key: 'header',
                  header: 'Tên cột',
                  render: (r) => (
                    <span className="font-medium text-xs text-ink">
                      {r.header.replace(/\n/g, ' ')}
                    </span>
                  ),
                },
                {
                  key: 'group',
                  header: 'Nhóm',
                  width: 170,
                  render: (r) => <span className="text-xs text-ink-2">{r.group}</span>,
                },
                {
                  key: 'source',
                  header: 'Nguồn dữ liệu / Công thức',
                  render: (r) =>
                    r.formulaBuilder ? (
                      <code className="text-2xs font-mono bg-sunken px-2 py-0.5 rounded border border-line text-ink">
                        {r.formulaBuilder(3)}
                      </code>
                    ) : (
                      <span className="text-xs text-ink-2">
                        {r.fillMode === 'BOOKING_MASTER'
                          ? 'Đẩy từ Quản lý Deal & Booking'
                          : r.fillMode === 'SELLER_DATA'
                            ? 'TikTok Seller / Nghiệm thu'
                            : 'Báo cáo Ads TikTok'}
                      </span>
                    ),
                },
              ]}
              rows={BOOKING_REPORT_COLUMNS.filter(
                (c) => reportSchemaGroupFilter === 'ALL' || c.group === reportSchemaGroupFilter
              )}
              rowKey={(r) => r.key}
            />
          </div>
        </div>
      </Modal>

      {/* Hộp thoại Đối soát đồng bộ Google Sheet */}
      <Modal
        open={Boolean(syncComparisonReport)}
        onClose={() => setSyncComparisonReport(null)}
        title={syncComparisonReport?.title || 'Đối soát đồng bộ Google Sheet'}
        size="lg"
        footer={
          syncComparisonReport ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="text-xs text-ink-2">
                Phạm vi:{' '}
                <span className="font-medium text-ink">
                  {syncComparisonReport.targetStoresLabel}
                </span>
                {syncComparisonReport.missingSheetStores &&
                  syncComparisonReport.missingSheetStores.length > 0 && (
                    <span className="text-warning ml-2">
                      ({syncComparisonReport.missingSheetStores.length} gian chưa gắn Link Sheet)
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSyncComparisonReport(null)}
                >
                  {syncComparisonReport.stage === 'COMPLETED' ? 'Đóng' : 'Hủy'}
                </Button>
                {syncComparisonReport.stage === 'PREVIEW' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={
                      isSyncingReportSheet
                        ? Loader2
                        : syncComparisonReport.mode === 'PUSH_REPORT_SHEET'
                          ? FileSpreadsheet
                          : Check
                    }
                    disabled={isSyncingReportSheet}
                    onClick={() => {
                      if (syncComparisonReport.mode === 'PUSH_REPORT_SHEET') {
                        void confirmExecutePushReportSheet();
                      } else if (syncComparisonReport.mode === 'PULL_REPORT_SHEET') {
                        confirmExecutePullReportSheet();
                      } else {
                        confirmExecutePullListingSheets();
                      }
                    }}
                  >
                    {isSyncingReportSheet
                      ? 'Đang đồng bộ…'
                      : syncComparisonReport.mode === 'PUSH_REPORT_SHEET'
                        ? `Xác nhận Đẩy (${syncComparisonReport.addedCount + syncComparisonReport.updatedCount + syncComparisonReport.unchangedCount} dòng)`
                        : syncComparisonReport.mode === 'PULL_REPORT_SHEET'
                          ? `Xác nhận Cập nhật (${syncComparisonReport.updatedCount} dòng)`
                          : `Xác nhận Đồng bộ (${syncComparisonReport.addedCount + syncComparisonReport.updatedCount} dòng)`}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {syncComparisonReport && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                value={
                  syncDiffFilter === 'CHANGED' ||
                  syncDiffFilter === 'UNCHANGED' ||
                  syncDiffFilter === 'ALL'
                    ? syncDiffFilter
                    : 'ALL'
                }
                onChange={(val) => setSyncDiffFilter(val as typeof syncDiffFilter)}
                items={[
                  {
                    key: 'CHANGED',
                    label: `Thay đổi (${
                      syncComparisonReport.addedCount +
                      syncComparisonReport.updatedCount +
                      (syncComparisonReport.mode === 'PULL_REPORT_SHEET'
                        ? syncComparisonReport.extraCount
                        : 0)
                    })`,
                  },
                  {
                    key: 'UNCHANGED',
                    label: `Đã khớp (${syncComparisonReport.unchangedCount})`,
                  },
                  {
                    key: 'ALL',
                    label: `Tất cả (${syncComparisonReport.diffRows.length})`,
                  },
                ]}
              />
              {syncComparisonReport.stage === 'COMPLETED' && (
                <Status tone="positive">Đã đồng bộ</Status>
              )}
            </div>

            <StatRow size="sm">
              <Stat
                label="Thêm mới"
                value={syncComparisonReport.addedCount}
                numeric={syncComparisonReport.addedCount}
                tone={syncComparisonReport.addedCount > 0 ? 'positive' : undefined}
              />
              <Stat
                label="Cập nhật"
                value={syncComparisonReport.updatedCount}
                numeric={syncComparisonReport.updatedCount}
                tone={syncComparisonReport.updatedCount > 0 ? 'warning' : undefined}
              />
              <Stat
                label="Đã khớp"
                value={syncComparisonReport.unchangedCount}
                numeric={syncComparisonReport.unchangedCount}
              />
              <Stat
                label={syncComparisonReport.extraLabel}
                value={syncComparisonReport.extraCount}
                numeric={syncComparisonReport.extraCount}
              />
            </StatRow>

            <div className="max-h-[380px] overflow-y-auto border border-line rounded-lg">
              <DataTable
                columns={[
                  {
                    key: 'deal',
                    header: 'Mã BO & Gian hàng',
                    width: 155,
                    render: (r) => (
                      <div>
                        <div className="font-mono text-xs font-semibold text-ink">
                          {r.dealCode || '—'}
                        </div>
                        <div className="text-2xs text-ink-2">{r.store}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'koc',
                    header: 'KOC & Sản phẩm',
                    width: 190,
                    render: (r) => (
                      <div>
                        <div className="text-xs font-medium text-ink">
                          {r.tenKoc}{' '}
                          <span className="text-ink-2">(@{r.idKenh.replace(/^@/, '')})</span>
                        </div>
                        <div className="text-2xs text-ink-2 truncate max-w-[180px]">
                          {r.sanPham || '—'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Trạng thái',
                    width: 120,
                    render: (r) => {
                      if (r.status === 'ADDED') return <Status tone="positive">Thêm mới</Status>;
                      if (r.status === 'UPDATED') return <Status tone="warning">Cập nhật</Status>;
                      if (r.status === 'PRESERVED_SHEET')
                        return <Status tone="info">Giữ trên Sheet</Status>;
                      if (r.status === 'UNMATCHED_SHEET')
                        return <Status tone="critical">Chưa khớp</Status>;
                      return <Status tone="neutral">Đã khớp</Status>;
                    },
                  },
                  {
                    key: 'diffs',
                    header: 'Đối soát dữ liệu (Trước → Sau)',
                    render: (r) => (
                      <div className="space-y-1">
                        {r.fieldDiffs.length > 0 ? (
                          r.fieldDiffs.map((fd, i) => (
                            <div key={i} className="text-xs flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{fd.field}:</span>
                              <span className="text-ink-2 font-mono">{fd.oldVal}</span>
                              <span className="text-ink-3">→</span>
                              <span className="font-semibold text-accent font-mono">
                                {fd.newVal}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-ink-2">
                            {r.preservedMetricsNote || 'Không thay đổi'}
                          </span>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={syncComparisonReport.diffRows.filter((r) => {
                  if (syncDiffFilter === 'ALL') return true;
                  if (syncDiffFilter === 'CHANGED') {
                    return (
                      r.status === 'ADDED' ||
                      r.status === 'UPDATED' ||
                      r.status === 'UNMATCHED_SHEET'
                    );
                  }
                  if (syncDiffFilter === 'UNCHANGED') return r.status === 'UNCHANGED';
                  return true;
                })}
                rowKey={(r) => r.id}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
