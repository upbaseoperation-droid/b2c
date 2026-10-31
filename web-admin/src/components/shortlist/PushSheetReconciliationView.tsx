'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  FileSpreadsheet,
  PlusCircle,
  HelpCircle,
  Search,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Button, Status, Pagination } from '../ui';
import { formatVnd } from '../../lib/format';

export interface PushFieldChangeDetail {
  column: string;
  columnLetter?: string;
  sheetValue: string;
  appValue: string;
  diffKind?: 'PRICE' | 'DATE' | 'DECISION' | 'PRODUCT' | 'TEXT' | 'STATUS';
  diffSummary?: string;
}

export interface PushRowDiffDetail {
  rowId?: string;
  key?: string;
  handle?: string;
  kocName: string;
  briefCode?: string;
  action: 'ADD' | 'UPDATE' | 'SKIP' | 'SHEET_ONLY';
  sheetRowNum?: number;
  matchedBy?: 'ROW_ID' | 'COMPOSITE' | 'HANDLE' | 'NONE';
  brandDecisionOnSheet?: string;
  rejectionReasonOnSheet?: string;
  productName?: string;
  price?: string | number;
  assignedStaff?: string;
  airDate?: string;
  fieldChanges: PushFieldChangeDetail[];
}

export interface PushSheetReconciliationReport {
  added: number;
  updated: number;
  skipped: number;
  sheetOnlyCount?: number;
  totalInSheet: number;
  diffs: PushRowDiffDetail[];
}

interface PushSheetReconciliationViewProps {
  report: PushSheetReconciliationReport;
  targetTabName: string;
  storeName: string;
  sheetUrl?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PushSheetReconciliationView: React.FC<PushSheetReconciliationViewProps> = ({
  report,
  targetTabName,
  storeName,
  sheetUrl,
  onNotify,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<
    'ALL' | 'DIFF_ONLY' | 'ADD_ONLY' | 'SHEET_ONLY' | 'SAME_ONLY'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Đếm tổng số ô chênh lệch trên toàn bộ các dòng UPDATE
  const totalDiffCells = useMemo(() => {
    return report.diffs.reduce((acc, d) => {
      if (d.action === 'UPDATE') {
        return acc + d.fieldChanges.length;
      }
      return acc;
    }, 0);
  }, [report.diffs]);

  const sheetOnlyCount = useMemo(() => {
    if (typeof report.sheetOnlyCount === 'number') return report.sheetOnlyCount;
    return report.diffs.filter((d) => d.action === 'SHEET_ONLY').length;
  }, [report]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bộ lọc danh sách dòng đối soát
  const filteredDiffs = useMemo(() => {
    let list = report.diffs;

    if (selectedFilter === 'DIFF_ONLY') {
      list = list.filter((d) => d.action === 'UPDATE');
    } else if (selectedFilter === 'ADD_ONLY') {
      list = list.filter((d) => d.action === 'ADD');
    } else if (selectedFilter === 'SHEET_ONLY') {
      list = list.filter((d) => d.action === 'SHEET_ONLY');
    } else if (selectedFilter === 'SAME_ONLY') {
      list = list.filter((d) => d.action === 'SKIP');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        const handleMatch = (d.handle || '').toLowerCase().includes(q);
        const nameMatch = (d.kocName || '').toLowerCase().includes(q);
        const prodMatch = (d.productName || '').toLowerCase().includes(q);
        const colMatch = d.fieldChanges.some(
          (fc) =>
            fc.column.toLowerCase().includes(q) ||
            fc.sheetValue.toLowerCase().includes(q) ||
            fc.appValue.toLowerCase().includes(q)
        );
        return handleMatch || nameMatch || prodMatch || colMatch;
      });
    }

    return list;
  }, [report.diffs, selectedFilter, searchQuery]);

  // Reset về trang 1 khi người dùng đổi bộ lọc hoặc tìm kiếm
  React.useEffect(() => {
    setPage(1);
  }, [selectedFilter, searchQuery]);

  const totalDiffs = filteredDiffs.length;
  const paginatedDiffs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDiffs.slice(start, start + pageSize);
  }, [filteredDiffs, page, pageSize]);

  const handleCopySummary = () => {
    const lines: string[] = [
      `📊 [BÁO CÁO ĐỐI SOÁT GOOGLE SHEET - ${storeName}]`,
      `• Tab đích: "${targetTabName}" (Tổng ${report.totalInSheet} dòng trên Sheet)`,
      `• Tổng KOC đối soát: ${report.diffs.length} dòng`,
      `• ⚠️ Cùng có nhưng lệch dữ liệu: ${report.updated} dòng (${totalDiffCells} ô chênh lệch)`,
      `• ➕ Chỉ có trên App (Sẽ thêm mới): +${report.added} dòng`,
      `• 📋 Chỉ có trên Google Sheet: ${sheetOnlyCount} dòng`,
      `• 🛡️ Trùng khớp 100%: ${report.skipped} dòng`,
      '',
    ];

    if (report.updated > 0) {
      lines.push('--- CHI TIẾT CÁC Ô LỆCH DỮ LIỆU ---');
      report.diffs
        .filter((d) => d.action === 'UPDATE')
        .forEach((d) => {
          lines.push(`- @${d.handle || d.kocName} (Dòng #${d.sheetRowNum || '?'}):`);
          d.fieldChanges.forEach((fc) => {
            lines.push(
              `   + ${fc.column}: Sheet [${fc.sheetValue || 'Trống'}] → App [${fc.appValue || 'Trống'}] ${
                fc.diffSummary ? `(${fc.diffSummary})` : ''
              }`
            );
          });
        });
      lines.push('');
    }

    if (report.added > 0) {
      lines.push('--- DANH SÁCH SẼ THÊM MỚI VÀO CUỐI SHEET ---');
      report.diffs
        .filter((d) => d.action === 'ADD')
        .forEach((d) => {
          lines.push(`- @${d.handle || d.kocName} (${d.kocName})`);
        });
      lines.push('');
    }

    if (sheetOnlyCount > 0) {
      lines.push('--- DÒNG CHỈ CÓ TRÊN GOOGLE SHEET (APP CHƯA CÓ) ---');
      report.diffs
        .filter((d) => d.action === 'SHEET_ONLY')
        .forEach((d) => {
          lines.push(
            `- Dòng #${d.sheetRowNum}: @${d.handle || d.kocName} | SP: ${d.productName || '—'} | Giá: ${
              d.price || '—'
            } | Brand: ${d.brandDecisionOnSheet || 'Chưa duyệt'}`
          );
        });
      lines.push('');
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
    onNotify?.('Đã sao chép tóm tắt đối soát vào bộ nhớ tạm!', 'success');
  };

  return (
    <div className="space-y-3">
      {/* 1. THẺ KPI ĐỐI SOÁT TRỰC QUAN (4 CHỈ SỐ CỐT LÕI) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Card 1: Lệch dữ liệu từng ô (Cùng có nhưng lệch gì) */}
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'DIFF_ONLY' ? 'ALL' : 'DIFF_ONLY')}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedFilter === 'DIFF_ONLY'
              ? 'bg-warning-soft/70 border-warning shadow-sm'
              : 'bg-surface border-line hover:bg-sunken'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span className="font-medium text-warning-strong flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Lệch dữ liệu ô
            </span>
            <span className="font-mono text-2xs px-1 rounded bg-warning-soft text-warning-strong">
              {totalDiffCells} ô lệch
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">{report.updated}</span>
            <span className="text-2xs text-ink-3">dòng KOC</span>
          </div>
          <div className="text-2xs text-ink-3 truncate mt-0.5">
            Cả 2 bên cùng có, lệch giá/ngày/SP
          </div>
        </button>

        {/* Card 2: Chỉ có trên App (Sẽ thêm vào Sheet) */}
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'ADD_ONLY' ? 'ALL' : 'ADD_ONLY')}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedFilter === 'ADD_ONLY'
              ? 'bg-positive-soft/70 border-positive shadow-sm'
              : 'bg-surface border-line hover:bg-sunken'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span className="font-medium text-positive-strong flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-positive" /> Chỉ có trên App
            </span>
            <span className="font-mono text-2xs px-1 rounded bg-positive-soft text-positive-strong">
              +{report.added}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">+{report.added}</span>
            <span className="text-2xs text-ink-3">dòng mới</span>
          </div>
          <div className="text-2xs text-ink-3 truncate mt-0.5">
            Sẽ thêm mới vào cuối Sheet
          </div>
        </button>

        {/* Card 3: Chỉ có trên Google Sheet (Bên Sheet có, App chưa có) */}
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'SHEET_ONLY' ? 'ALL' : 'SHEET_ONLY')}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedFilter === 'SHEET_ONLY'
              ? 'bg-warning-soft/70 border-warning shadow-sm'
              : 'bg-surface border-line hover:bg-sunken'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span className="font-medium text-warning flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-warning" /> Chỉ có trên Sheet
            </span>
            <span className="font-mono text-2xs px-1 rounded bg-warning-soft text-warning">
              {sheetOnlyCount}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">{sheetOnlyCount}</span>
            <span className="text-2xs text-ink-3">dòng Sheet</span>
          </div>
          <div className="text-2xs text-ink-3 truncate mt-0.5">
            Brand tự thêm / Chưa đồng bộ
          </div>
        </button>

        {/* Card 4: Khớp hoàn toàn 100% */}
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'SAME_ONLY' ? 'ALL' : 'SAME_ONLY')}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedFilter === 'SAME_ONLY'
              ? 'bg-sunken border-line-strong shadow-sm'
              : 'bg-surface border-line hover:bg-sunken'
          }`}
        >
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span className="font-medium text-ink flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-positive" /> Khớp 100% dữ liệu
            </span>
            <span className="font-mono text-2xs px-1 rounded bg-sunken text-ink-2">
              {report.skipped}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">{report.skipped}</span>
            <span className="text-2xs text-ink-3">dòng</span>
          </div>
          <div className="text-2xs text-ink-3 truncate mt-0.5">
            Dữ liệu 2 bên giống hệt nhau
          </div>
        </button>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, TAB VÀ NÚT SAO CHÉP */}
      <div className="p-2 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-2 text-2xs">
        {/* Bộ nút phân loại tab */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`px-2 py-1 rounded text-2xs font-medium transition ${
              selectedFilter === 'ALL'
                ? 'bg-ink text-white font-semibold'
                : 'text-ink-2 hover:bg-surface'
            }`}
          >
            Tất cả ({report.diffs.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('DIFF_ONLY')}
            className={`px-2 py-1 rounded text-2xs font-medium transition flex items-center gap-1 ${
              selectedFilter === 'DIFF_ONLY'
                ? 'bg-warning text-white font-semibold'
                : 'text-warning-strong hover:bg-warning-soft'
            }`}
          >
            <span>⚠️ Lệch ô</span>
            <span className="font-bold">({report.updated})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('ADD_ONLY')}
            className={`px-2 py-1 rounded text-2xs font-medium transition flex items-center gap-1 ${
              selectedFilter === 'ADD_ONLY'
                ? 'bg-positive text-white font-semibold'
                : 'text-positive-strong hover:bg-positive-soft'
            }`}
          >
            <span>➕ Thêm mới</span>
            <span className="font-bold">(+{report.added})</span>
          </button>
          {sheetOnlyCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('SHEET_ONLY')}
              className={`px-2 py-1 rounded text-2xs font-medium transition flex items-center gap-1 ${
                selectedFilter === 'SHEET_ONLY'
                  ? 'bg-warning text-white font-semibold'
                  : 'text-warning hover:bg-warning-soft'
              }`}
            >
              <span>📋 Chỉ có trên Sheet</span>
              <span className="font-bold">({sheetOnlyCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedFilter('SAME_ONLY')}
            className={`px-2 py-1 rounded text-2xs font-medium transition flex items-center gap-1 ${
              selectedFilter === 'SAME_ONLY'
                ? 'bg-ink-3 text-white font-semibold'
                : 'text-ink-3 hover:bg-surface'
            }`}
          >
            <span>🛡️ Khớp nhau</span>
            <span className="font-bold">({report.skipped})</span>
          </button>
        </div>

        {/* Ô tìm kiếm nhanh KOC và nút Copy */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[240px]">
          <div className="relative w-44 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kênh, KOC, cột lệch…"
              className="w-full pl-7 pr-2 py-1 text-2xs rounded border border-line bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>

          <Button
            size="sm"
            variant="secondary"
            icon={copiedSummary ? Check : Copy}
            onClick={handleCopySummary}
          >
            {copiedSummary ? 'Đã copy' : 'Copy tóm tắt'}
          </Button>
        </div>
      </div>

      {/* 3. KHU VỰC HIỂN THỊ DANH SÁCH ĐỐI SOÁT TRỰC QUAN */}
      <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
        {filteredDiffs.length === 0 ? (
          <div className="p-8 text-center text-ink-3 border border-dashed border-line rounded-lg space-y-1">
            <div className="font-medium text-xs text-ink-2">Không tìm thấy dòng KOC nào</div>
            <div className="text-2xs">
              {searchQuery
                ? `Không có kết quả khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm từ khóa khác.`
                : 'Mục này hiện không có dòng dữ liệu nào.'}
            </div>
          </div>
        ) : (
          paginatedDiffs.map((d, idx) => {
            const isUpdate = d.action === 'UPDATE';
            const isAdd = d.action === 'ADD';
            const isSheetOnly = d.action === 'SHEET_ONLY';
            const isSkip = d.action === 'SKIP';

            return (
              <div
                key={`${d.handle}-${d.sheetRowNum || idx}`}
                className={`rounded-lg border transition-all text-xs ${
                  isUpdate
                    ? 'bg-surface border-warning/70 shadow-sm'
                    : isAdd
                      ? 'bg-positive-soft/20 border-positive/30'
                      : isSheetOnly
                        ? 'bg-warning-soft/25 border-warning/30'
                        : 'bg-sunken/40 border-line opacity-80'
                }`}
              >
                {/* Header thẻ KOC */}
                <div className="p-3 flex flex-wrap items-center justify-between gap-2 border-b border-line/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-ink">@{d.handle || d.kocName}</span>
                    {d.kocName && d.kocName !== (d.handle || '') && (
                      <span className="text-2xs text-ink-2">({d.kocName})</span>
                    )}

                    {/* Vị trí trên Google Sheet */}
                    {d.sheetRowNum ? (
                      <span className="px-2 py-0.5 rounded bg-sunken text-ink-2 font-mono text-2xs border border-line">
                        Sheet Dòng #{d.sheetRowNum}
                      </span>
                    ) : null}

                    {/* Khớp theo mã */}
                    {d.matchedBy === 'ROW_ID' && (
                      <span className="text-2xs font-mono text-positive bg-positive-soft px-1 rounded">
                        RowID ✓
                      </span>
                    )}
                  </div>

                  {/* Badge phân loại trạng thái đối soát */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUpdate && (
                      <Status tone="warning">
                        ⚠️ Lệch {d.fieldChanges.length} ô dữ liệu
                      </Status>
                    )}
                    {isAdd && (
                      <Status tone="positive">
                        + Thêm dòng mới vào cuối Sheet
                      </Status>
                    )}
                    {isSheetOnly && (
                      <Status tone="warning">
                        📋 Có trên Sheet · App chưa có
                      </Status>
                    )}
                    {isSkip && (
                      <Status tone="neutral">
                        ✓ Khớp dữ liệu 100%
                      </Status>
                    )}

                    {/* Kết quả Brand chọn nếu có trên Sheet */}
                    {d.brandDecisionOnSheet && (
                      <span
                        className={`text-2xs px-2 py-0.5 rounded font-semibold border ${
                          d.brandDecisionOnSheet.toLowerCase() === 'yes'
                            ? 'bg-positive-soft text-positive border-positive/30'
                            : d.brandDecisionOnSheet.toLowerCase() === 'no'
                              ? 'bg-critical-soft text-critical border-critical/30'
                              : 'bg-sunken text-ink-2 border-line'
                        }`}
                      >
                        Brand chọn: {d.brandDecisionOnSheet}
                      </span>
                    )}
                  </div>
                </div>

                {/* TH 1: CÙNG CÓ NHƯNG LỆCH DỮ LIỆU TỪNG Ô (action === 'UPDATE') */}
                {isUpdate && (
                  <div className="p-3 space-y-2">
                    <div className="text-2xs font-semibold text-warning-strong flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-warning" />
                      Chi tiết các ô bị lệch giữa Google Sheet và Web Admin:
                    </div>

                    <div className="border border-line rounded-md overflow-hidden bg-surface">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-sunken text-2xs font-semibold text-ink-2 border-b border-line">
                          <tr>
                            <th className="py-2 px-3 w-[28%]">Trường thông tin / Cột</th>
                            <th className="py-2 px-3 w-[30%]">Trên Google Sheet hiện tại</th>
                            <th className="py-2 px-3 w-[4%] text-center"></th>
                            <th className="py-2 px-3 w-[38%]">Trên Web Admin dự kiến ghi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line text-2xs">
                          {d.fieldChanges.map((fc, fIdx) => (
                            <tr key={fIdx} className="hover:bg-sunken/30">
                              <td className="py-2 px-3 font-medium text-ink">
                                <div>{fc.column}</div>
                                {fc.columnLetter && (
                                  <span className="text-2xs font-mono text-ink-3">
                                    Cột {fc.columnLetter}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-block px-2 py-0.5 rounded bg-critical-soft border border-critical/30 text-critical line-through font-mono text-2xs">
                                  {fc.sheetValue || '(Trống)'}
                                </span>
                              </td>
                              <td className="py-2 px-1 text-center text-ink-3">
                                <ArrowRight className="w-3.5 h-3.5 inline text-ink-3" />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-block px-2 py-0.5 rounded bg-positive-soft border border-positive/30 text-positive font-semibold font-mono text-2xs">
                                    {fc.diffKind === 'PRICE' && !isNaN(Number(fc.appValue)) && Number(fc.appValue) > 0
                                      ? `${new Intl.NumberFormat('vi-VN').format(Number(fc.appValue))}đ`
                                      : fc.appValue || '(Trống)'}
                                  </span>
                                  {fc.diffSummary && (
                                    <span className="text-2xs font-semibold px-1 rounded bg-warning-soft text-warning-strong">
                                      {fc.diffSummary}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TH 2: CHỈ CÓ TRÊN APP (SẼ THÊM MỚI VÀO SHEET) (action === 'ADD') */}
                {isAdd && (
                  <div className="p-3 bg-positive-soft/30 text-2xs space-y-2">
                    <div className="text-positive font-medium">
                      KOC này chưa có trên file Google Sheet của Brand. Khi bạn bấm{' '}
                      <strong>Xác nhận Đẩy</strong>, hệ thống sẽ thêm một dòng mới vào cuối bảng tính:
                    </div>
                    {d.fieldChanges.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-positive/60">
                        {d.fieldChanges.map((fc, fIdx) => (
                          <div key={fIdx} className="bg-surface p-2 rounded border border-positive/30">
                            <span className="text-2xs text-ink-3 block">{fc.column}:</span>
                            <span className="font-semibold text-ink font-mono text-2xs">
                              {fc.appValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TH 3: CHỈ CÓ TRÊN GOOGLE SHEET (APP CHƯA CÓ) (action === 'SHEET_ONLY') */}
                {isSheetOnly && (
                  <div className="p-3 bg-warning-soft/40 text-2xs space-y-2">
                    <div className="text-warning font-medium flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                      <span>
                        Dòng này đang tồn tại trên Google Sheet của Brand (có thể do Brand tự thêm hoặc đợt trước) nhưng không có trong danh sách đẩy từ Web Admin.
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-warning/60">
                      <div className="bg-surface p-2 rounded border border-warning/30">
                        <span className="text-2xs text-ink-3 block">Sản phẩm trên Sheet:</span>
                        <span className="font-medium text-ink text-2xs">
                          {d.productName || '(Trống)'}
                        </span>
                      </div>
                      <div className="bg-surface p-2 rounded border border-warning/30">
                        <span className="text-2xs text-ink-3 block">Giá trên Sheet:</span>
                        <span className="font-medium text-ink font-mono text-2xs">
                          {d.price || '(Trống)'}
                        </span>
                      </div>
                      <div className="bg-surface p-2 rounded border border-warning/30">
                        <span className="text-2xs text-ink-3 block">Kết quả Brand trên Sheet:</span>
                        <span className="font-semibold text-ink text-2xs">
                          {d.brandDecisionOnSheet || 'Chưa phản hồi'}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xs text-warning italic">
                      🛡️ Cơ chế an toàn: Hệ thống bảo lưu dòng này, tuyệt đối không xóa dữ liệu của Brand.
                    </div>
                  </div>
                )}

                {/* TH 4: KHỚP NHAU 100% (action === 'SKIP') */}
                {isSkip && (
                  <div className="px-3 py-2 text-2xs text-ink-3 flex items-center justify-between">
                    <span>
                      Dữ liệu trên Web Admin và Google Sheet giống nhau 100%, không cần cập nhật.
                    </span>
                    <span className="text-positive font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> An toàn
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Phân trang danh sách đối soát khi số dòng lớn (tối ưu DOM, mượt mà khi tới hàng trăm/nghìn dòng) */}
      {totalDiffs > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalDiffs}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
          pageSizes={[15, 25, 50, 100]}
        />
      )}
    </div>
  );
};
