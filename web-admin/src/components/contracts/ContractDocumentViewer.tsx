'use client';

/**
 * Khung xem trực tiếp văn bản hợp đồng trên nền trang giấy A4.
 * Hỗ trợ đối soát nhanh các trường đã điền / còn trống, nhảy tới mục chưa điền,
 * đối chiếu phiên bản, xem chế độ bản in chuẩn và in/xuất PDF trực tiếp.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Highlighter,
  Maximize2,
  Minimize2,
  Printer,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AcceptanceScreenshotItem, ContractField, DocBlock, DocParagraph, DocTable, SigningPerson } from '../../lib/contracts/types';
import { formatNumber } from '../../lib/format';
import { Button, Modal } from '../ui';
import {
  isTwoTimePaymentField,
  parseSavedSowJobs,
  resolvePaymentScheduleOption,
  SOW_JOBS_META_KEY,
} from './contractUi';

export interface ContractDocumentViewerProps {
  title?: string;
  templateName?: string;
  blocks?: DocBlock[];
  paragraphs?: string[];
  fields?: ContractField[];
  values?: Record<string, string>;
  compareValues?: Record<string, string>;
  activeFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
  downloadHref?: string;
  versionSelector?: React.ReactNode;
  signingPeople?: SigningPerson[];
  signingDocumentId?: string;
  partnerName?: string;
  maxHeight?: string;
  compactToolbar?: boolean;
  isTemplatePreview?: boolean;
  acceptanceScreenshots?: AcceptanceScreenshotItem[];
}

export function ContractDocumentViewer({
  title,
  templateName,
  blocks = [],
  paragraphs = [],
  fields = [],
  values = {},
  compareValues,
  activeFieldKey,
  onSelectField,
  downloadHref,
  versionSelector,
  signingPeople,
  signingDocumentId,
  partnerName,
  maxHeight = '760px',
  compactToolbar = false,
  isTemplatePreview = false,
  acceptanceScreenshots = [],
}: ContractDocumentViewerProps) {
  const [highlight, setHighlight] = useState(true);
  const [zoom, setZoom] = useState<number>(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [missingCursor, setMissingCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  // Danh sách các trường duy nhất (mỗi key 1 lần) để thống kê tiến độ điền
  const allUniqueFields = useMemo(
    () => [...new Map(fields.map(f => [f.key, f])).values()],
    [fields],
  );
  const paymentScheduleOption = useMemo(
    () => resolvePaymentScheduleOption(values, undefined, allUniqueFields),
    [values, allUniqueFields],
  );
  const uniqueFields = useMemo(
    () =>
      isTemplatePreview || paymentScheduleOption === 'TWO_TIMES'
        ? allUniqueFields
        : allUniqueFields.filter(f => !isTwoTimePaymentField(f)),
    [allUniqueFields, isTemplatePreview, paymentScheduleOption],
  );
  const requiredFields = useMemo(() => uniqueFields.filter(f => f.required), [uniqueFields]);
  const missingRequired = useMemo(
    () => requiredFields.filter(f => !values[f.key]?.trim()),
    [requiredFields, values],
  );
  const filledCount = useMemo(
    () => uniqueFields.filter(f => Boolean(values[f.key]?.trim())).length,
    [uniqueFields, values],
  );

  // Map (part:paragraph) -> danh sách các trường nằm trong đoạn đó
  const fieldsByParagraph = useMemo(() => {
    const map = new Map<string, ContractField[]>();
    for (const f of fields) {
      const coord = `${f.part}:${f.paragraph}`;
      const list = map.get(coord) || [];
      list.push(f);
      map.set(coord, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    }
    return map;
  }, [fields]);

  // Cuộn tới trường đang chọn trên mặt giấy A4
  useEffect(() => {
    if (!activeFieldKey || !containerRef.current) return;
    const target = containerRef.current.querySelector<HTMLElement>(
      `[data-field-key="${CSS.escape(activeFieldKey)}"]`,
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFieldKey]);

  const jumpToNextMissing = () => {
    const pool = missingRequired.length > 0 ? missingRequired : uniqueFields.filter(f => !values[f.key]?.trim());
    if (pool.length === 0) return;
    const nextField = pool[missingCursor % pool.length];
    setMissingCursor(c => c + 1);
    setHighlight(true);
    if (containerRef.current) {
      const el = containerRef.current.querySelector<HTMLElement>(
        `[data-field-key="${CSS.escape(nextField.key)}"]`,
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onSelectField?.(nextField.key);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${title || templateName || 'Hợp đồng'}</title>
  <style>
    @page { size: A4; margin: 18mm 18mm 18mm 22mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.55;
      color: #000;
      margin: 0;
      padding: 0;
    }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table.doc-grid td, table.doc-grid th { border: 1px solid #222; padding: 5px 8px; vertical-align: top; }
    table.doc-party td { padding: 2px 4px; vertical-align: top; border: none; }
    table.doc-signature td { width: 50%; text-align: center; vertical-align: top; padding: 8px 12px 72px; border: none; }
    p { margin: 4px 0; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .italic { font-style: italic; }
    .doc-header { border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 14px; font-size: 10pt; color: #444; }
    .doc-footer { border-top: 1px solid #ccc; padding-top: 6px; margin-top: 18px; font-size: 10pt; color: #444; }
    .field-mark { background: transparent !important; border: none !important; padding: 0 !important; color: inherit !important; }
    .doc-screenshot-section { margin: 16px 0; page-break-inside: avoid; }
    .doc-screenshot-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .doc-screenshot-card { width: 47%; border: 1px solid #333; padding: 6px; box-sizing: border-box; page-break-inside: avoid; }
    .doc-screenshot-card img { width: 100%; max-height: 250px; object-fit: contain; background: #000; display: block; margin: 0 auto 6px; }
  </style>
</head>
<body>${printRef.current.innerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const headerBlocks = useMemo(
    () => blocks.filter(b => b.part.startsWith('word/header')),
    [blocks],
  );
  const footerBlocks = useMemo(
    () => blocks.filter(b => b.part.startsWith('word/footer')),
    [blocks],
  );
  const bodyBlocks = useMemo(
    () => blocks.filter(b => !b.part.startsWith('word/header') && !b.part.startsWith('word/footer')),
    [blocks],
  );

  const renderParagraphContent = (p: DocParagraph) => {
    const coord = `${p.part}:${p.paragraph}`;
    const pFields = fieldsByParagraph.get(coord);
    const text = p.text;

    if (!pFields || pFields.length === 0) {
      if (!text.trim()) return <span className="inline-block h-2" />;
      if (!isTemplatePreview && /^Điều\s*…$/i.test(text.trim())) {
        return '—';
      }
      if (p.boldPrefix && p.boldPrefix > 0 && p.boldPrefix < text.length) {
        return (
          <>
            <span className="font-semibold">{text.slice(0, p.boldPrefix)}</span>
            {text.slice(p.boldPrefix)}
          </>
        );
      }
      return text;
    }

    // Trường hợp ô bảng trống hoàn toàn (start === undefined)
    if (pFields.length === 1 && pFields[0].start === undefined) {
      return renderFieldToken(pFields[0], text || '………………');
    }

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    pFields.forEach((f, idx) => {
      const start = Math.max(cursor, f.start ?? 0);
      const end = Math.max(start, f.end ?? text.length);
      if (start > cursor) {
        const prefixSlice = text.slice(cursor, start);
        if (cursor === 0 && p.boldPrefix && p.boldPrefix > 0) {
          const bEnd = Math.min(prefixSlice.length, p.boldPrefix);
          nodes.push(
            <React.Fragment key={`txt-${idx}`}>
              <span className="font-semibold">{prefixSlice.slice(0, bEnd)}</span>
              {prefixSlice.slice(bEnd)}
            </React.Fragment>,
          );
        } else {
          nodes.push(<React.Fragment key={`txt-${idx}`}>{prefixSlice}</React.Fragment>);
        }
      }
      const rawPlaceholder = text.slice(start, end) || '……';
      nodes.push(
        <React.Fragment key={`fld-${f.key}-${idx}`}>
          {renderFieldToken(f, rawPlaceholder)}
        </React.Fragment>,
      );
      cursor = end;
    });

    if (cursor < text.length) {
      nodes.push(<React.Fragment key="txt-tail">{text.slice(cursor)}</React.Fragment>);
    }
    return nodes;
  };

  const renderFieldToken = (f: ContractField, rawPlaceholder: string) => {
    const val = values[f.key]?.trim() || '';
    const prevVal = compareValues ? compareValues[f.key]?.trim() || '' : undefined;
    const changed = prevVal !== undefined && prevVal !== val;
    const isSelected = activeFieldKey === f.key;
    const fieldTitle = f.title || f.label;

    if (!highlight) {
      return (
        <span
          data-field-key={f.key}
          onClick={onSelectField ? () => onSelectField(f.key) : undefined}
          className={`field-mark ${onSelectField ? 'cursor-pointer hover:underline' : ''}`}
          title={fieldTitle}
        >
          {val || rawPlaceholder}
        </span>
      );
    }

    if (val) {
      return (
        <span
          data-field-key={f.key}
          role={onSelectField ? 'button' : undefined}
          tabIndex={onSelectField ? 0 : undefined}
          onClick={onSelectField ? () => onSelectField(f.key) : undefined}
          onKeyDown={onSelectField ? e => (e.key === 'Enter' || e.key === ' ') && onSelectField(f.key) : undefined}
          title={
            changed
              ? `${fieldTitle} · Đổi từ "${prevVal || 'Trống'}" sang "${val}"`
              : `${fieldTitle}: ${val}${onSelectField ? ' (Bấm để sửa ô này)' : ''}`
          }
          className={`field-mark inline px-1 py-0.5 rounded-xs font-medium text-ink transition-colors ${
            changed
              ? 'bg-accent-soft text-accent border-b-2 border-accent'
              : 'bg-accent-soft/45 border-b border-accent/50'
          } ${isSelected ? 'ring-2 ring-accent bg-accent-soft' : ''} ${
            onSelectField ? 'cursor-pointer hover:bg-accent-soft/80' : ''
          }`}
        >
          {val}
        </span>
      );
    }

    const isCompactOptional =
      !f.required &&
      /link kênh (shopee|facebook|instagram|youtube|threads)|post-only|production-only|phiên bản cắt ngắn|điều khoản điều chỉnh/i.test(
        fieldTitle,
      );
    if (isCompactOptional) {
      return (
        <span
          data-field-key={f.key}
          role={onSelectField ? 'button' : undefined}
          tabIndex={onSelectField ? 0 : undefined}
          onClick={onSelectField ? () => onSelectField(f.key) : undefined}
          onKeyDown={onSelectField ? e => (e.key === 'Enter' || e.key === ' ') && onSelectField(f.key) : undefined}
          title={`${fieldTitle} (Tùy chọn — Bấm để điền nếu có)`}
          className={`field-mark inline px-1 rounded-xs text-ink-3 border-b border-dashed border-line-strong transition-colors ${
            isSelected ? 'ring-2 ring-accent bg-warning-soft text-ink' : ''
          } ${onSelectField ? 'cursor-pointer hover:text-accent hover:border-accent' : ''}`}
        >
          {rawPlaceholder || '……'}
        </span>
      );
    }

    return (
      <span
        data-field-key={f.key}
        role={onSelectField ? 'button' : undefined}
        tabIndex={onSelectField ? 0 : undefined}
        onClick={onSelectField ? () => onSelectField(f.key) : undefined}
        onKeyDown={onSelectField ? e => (e.key === 'Enter' || e.key === ' ') && onSelectField(f.key) : undefined}
        title={`${fieldTitle}${f.required ? ' (Bắt buộc điền)' : ' (Tùy chọn)'}${onSelectField ? ' · Bấm để nhập' : ''}`}
        className={`field-mark inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-sans text-2xs leading-snug transition-colors ${
          f.required
            ? 'bg-warning-soft/75 text-warning-strong border border-dashed border-warning font-medium'
            : 'bg-sunken text-ink-2 border border-dashed border-line-strong'
        } ${isSelected ? 'ring-2 ring-accent bg-warning-soft' : ''} ${
          onSelectField ? 'cursor-pointer hover:border-accent' : ''
        }`}
      >
        [{fieldTitle}{f.required ? ' *' : ''}]
      </span>
    );
  };

  const renderBlock = (block: DocBlock, idx: string): React.ReactNode => {
    if (block.kind === 'p') {
      const trimmed = block.text.trim();
      const hasField = fieldsByParagraph.has(`${block.part}:${block.paragraph}`);
      if (!trimmed && !hasField) {
        return <div key={idx} className="h-2" />;
      }
      const isMainTitle = /^(HỢP ĐỒNG|BIÊN BẢN NGHIỆM THU|PHỤ LỤC|SOW|BẢNG KÊ NỘI DUNG)/i.test(trimmed);
      const isMotto = /^Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/i.test(trimmed);
      const isClause = /^(ĐIỀU|Điều|MỤC|Mục|PHẦN|Phần)\s+\d+/i.test(trimmed);
      const alignClass =
        block.align === 'center'
          ? 'text-center'
          : block.align === 'right'
            ? 'text-right'
            : block.align === 'justify'
              ? 'text-justify'
              : 'text-left';

      return (
        <React.Fragment key={idx}>
          <p
            className={`${alignClass} ${block.bold ? 'font-semibold' : ''} ${block.italic ? 'italic' : ''} ${
              isMainTitle
                ? 'text-lg uppercase tracking-wide font-semibold mt-4 mb-1 text-black'
                : isClause
                  ? 'mt-4 mb-1 text-base font-semibold text-black'
                  : 'my-1 text-black'
            }`}
          >
            <span className={isMotto ? 'inline-block font-semibold' : undefined}>
              {renderParagraphContent(block)}
            </span>
          </p>
          {isMotto && (
            <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-5" />
          )}
        </React.Fragment>
      );
    }

    return renderTable(block, idx);
  };

  const renderTable = (table: DocTable, idx: string) => {
    if (table.variant === 'signature') {
      return (
        <div key={idx} className="overflow-x-auto">
          <table className="doc-signature w-full min-w-[480px] sm:min-w-0 mt-7 mb-4 table-fixed border-collapse">
            <tbody>
              {table.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => {
                    const signer = rIdx === 0 && signingPeople ? signingPeople[cIdx] : undefined;
                    const defaultPartyRole = cIdx === 0 ? 'Đại diện Bên A (UpBase)' : `Đại diện Bên B (${partnerName || 'KOC / Đối tác'})`;
                    return (
                      <td
                        key={cIdx}
                        colSpan={cell.colSpan}
                        className="w-1/2 align-top text-center px-3 pt-2 pb-12"
                      >
                        {cell.blocks.map((b, bIdx) => renderBlock(b, `${idx}-r${rIdx}-c${cIdx}-${bIdx}`))}
                        {signer ? (
                          <div
                            className={`mt-4 mx-auto max-w-[260px] rounded-lg border px-3.5 py-2.5 font-sans text-left text-2xs space-y-1 ${
                              signer.action === 2
                                ? 'border-positive/50 bg-positive-soft/75 text-ink'
                                : signer.action === 3
                                  ? 'border-critical/50 bg-critical-soft/75 text-ink'
                                  : 'border-warning/50 bg-warning-soft/75 text-ink'
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between gap-1.5 font-semibold ${
                                signer.action === 2
                                  ? 'text-positive'
                                  : signer.action === 3
                                    ? 'text-critical'
                                    : 'text-warning-strong'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                {signer.action === 2 ? 'Đã ký điện tử · MISA weSign' : signer.status}
                              </span>
                            </div>
                            <div className="font-semibold text-xs text-ink">{signer.name}</div>
                            <div className="text-2xs text-ink-2">
                              {signer.roleLabel || defaultPartyRole}
                              {signer.email ? ` · ${signer.email}` : ''}
                            </div>
                            {signer.at && (
                              <div className="text-2xs text-ink-3 font-code">
                                Ký lúc: {signer.at}
                              </div>
                            )}
                            {signingDocumentId && (
                              <div className="text-2xs text-ink-3 font-code truncate pt-0.5 border-t border-line/60">
                                Mã chứng thực: {signingDocumentId}
                              </div>
                            )}
                          </div>
                        ) : (
                          !isTemplatePreview && (
                            <div className="mt-4 mx-auto max-w-[240px] rounded-lg border border-dashed border-line-strong bg-sunken/40 px-3 py-2.5 font-sans text-center text-2xs text-ink-3 space-y-0.5">
                              <div className="font-medium text-ink-2">{defaultPartyRole}</div>
                              <div>Vị trí đóng dấu &amp; chữ ký số weSign</div>
                            </div>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (table.variant === 'party') {
      return (
        <table key={idx} className="doc-party w-full my-2 border-collapse">
          <tbody>
            {table.rows.map((row, rIdx) => {
              const isKeyValueRow = row.length >= 3;
              return (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      colSpan={cell.colSpan || (row.length === 1 ? 3 : undefined)}
                      className={`align-top py-0.5 ${
                        isKeyValueRow && cIdx === 0
                          ? 'w-[140px] sm:w-[175px] pr-1 font-medium'
                          : isKeyValueRow && cIdx === 1
                            ? 'w-4 text-center px-0.5'
                            : 'pl-1'
                      }`}
                    >
                      {cell.blocks.map((b, bIdx) => renderBlock(b, `${idx}-r${rIdx}-c${cIdx}-${bIdx}`))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    const getCellText = (cell?: DocTable['rows'][number][number]) =>
      cell?.blocks
        .map(b => (b.kind === 'p' ? b.text : ''))
        .join(' ')
        .trim() || '';

    const firstColHeader = getCellText(table.rows[0]?.[0]);
    const isSttCol = /^STT$/i.test(firstColHeader);

    const isPaymentChoiceTable =
      table.rows.length >= 2 &&
      table.rows.every(r => /^Thanh toán\s*(0?1\s*lần|0?2\s*lần|theo\s*SOW)/i.test(getCellText(r[0])));

    const rowsToRender = (() => {
      if (!isPaymentChoiceTable || isTemplatePreview) return table.rows;
      if (paymentScheduleOption === 'TWO_TIMES') {
        const matched = table.rows.filter(r => /Thanh toán\s*0?2\s*lần/i.test(getCellText(r[0])));
        return matched.length > 0 ? matched : table.rows;
      }
      if (paymentScheduleOption === 'BY_SOW') {
        const matched = table.rows.filter(r => /Thanh toán\s*theo\s*SOW/i.test(getCellText(r[0])));
        if (matched.length > 0) return matched;
      }
      const matchedOne = table.rows.filter(r => /Thanh toán\s*0?1\s*lần/i.test(getCellText(r[0])));
      return matchedOne.length > 0 ? matchedOne : [table.rows[0]];
    })();

    const getCellColStart = (r: DocTable['rows'][number], targetCellIdx: number) => {
      let col = 0;
      for (let i = 0; i < targetCellIdx; i++) {
        col += r[i]?.colSpan || 1;
      }
      return col;
    };

    const computeRowSpan = (startRowIdx: number, colStart: number): number => {
      let span = 1;
      for (let r = startRowIdx + 1; r < rowsToRender.length; r++) {
        const nextRow = rowsToRender[r];
        let curCol = 0;
        let matchedContinue = false;
        for (let c = 0; c < nextRow.length; c++) {
          if (curCol === colStart) {
            if (nextRow[c].vMerge === 'continue') {
              matchedContinue = true;
            }
            break;
          }
          curCol += nextRow[c].colSpan || 1;
        }
        if (matchedContinue) span++;
        else break;
      }
      return span;
    };

    return (
      <div key={idx} className="my-3 overflow-x-auto">
        <table className="doc-grid w-full border-collapse border border-[#333] text-[13.5px]">
          <tbody>
            {rowsToRender.map((row, rIdx) => {
              const isHeader = rIdx === 0 && row.length >= 3 && !isPaymentChoiceTable;
              return (
                <tr key={rIdx} className={isHeader ? 'bg-[#f4f3ef] font-semibold' : undefined}>
                  {row.map((cell, cIdx) => {
                    if (cell.vMerge === 'continue') return null;
                    const colStart = getCellColStart(row, cIdx);
                    const rowSpan = cell.vMerge === 'restart' ? computeRowSpan(rIdx, colStart) : undefined;
                    return (
                      <td
                        key={cIdx}
                        colSpan={cell.colSpan}
                        rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                        className={`border border-[#333] px-2.5 py-1.5 align-top ${
                          cIdx === 0 && row.length >= 2
                            ? isSttCol
                              ? 'w-12 text-center'
                              : 'w-[155px] font-medium'
                            : ''
                        }`}
                      >
                        {cell.blocks.map((b, bIdx) => renderBlock(b, `${idx}-r${rIdx}-c${cIdx}-${bIdx}`))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const savedJobTables = useMemo(
    () => parseSavedSowJobs(values[SOW_JOBS_META_KEY]),
    [values],
  );

  const renderMultiJobSowTablesBlock = () => {
    if (!savedJobTables || savedJobTables.length <= 1) return null;
    const isSowOrAcceptanceDoc =
      /SOW|PHỤ LỤC|BBNT|NGHIỆM THU/i.test(templateName || '') ||
      /SOW|PHỤ LỤC|BBNT|NGHIỆM THU/i.test(title || '') ||
      savedJobTables.length > 1;
    if (!isSowOrAcceptanceDoc) return null;

    const grandTotalNet = savedJobTables.reduce((sum, job) => {
      const vNet = Math.max(0, Number(job.videoFeeNetVnd) || 0) * Math.max(1, Number(job.quantity) || 1);
      const aNet = (job.addonItems || [])
        .filter(a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED')
        .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
      return sum + vNet + aNet;
    }, 0);

    return (
      <div className="my-5 pt-3 border-t border-[#333] space-y-4">
        <p className="font-semibold text-[14px] uppercase text-[#111]">
          CHI TIẾT BẢNG CÔNG VIỆC THEO TỪNG JOB TRONG PHỤ LỤC ({savedJobTables.length} JOB · {savedJobTables.length} BẢNG CÔNG VIỆC)
        </p>

        {savedJobTables.map((job, jIdx) => {
          const qty = Math.max(1, Number(job.quantity) || 1);
          const videoTotal = Math.max(0, Number(job.videoFeeNetVnd) || 0) * qty;
          const activeAddons = (job.addonItems || []).filter(a => a.includedInSow !== false);
          const addonsTotal = activeAddons
            .filter(a => a.acceptanceStatus !== 'DROPPED')
            .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
          const jobSubtotal = videoTotal + addonsTotal;

          return (
            <div key={job.id || jIdx} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#111]">
                <span>
                  Bảng công việc #{jIdx + 1} · Mã Job: {job.jobCode} — {job.productName || 'Sản phẩm chiến dịch'} ({job.mediaChannel || 'TikTok'})
                </span>
                <span>
                  Ngày dự kiến đăng: {job.airDate || 'Theo kế hoạch'}
                </span>
              </div>

              <table className="doc-grid w-full border-collapse border border-[#333] text-[13px]">
                <thead>
                  <tr className="bg-[#f4f3ef] font-semibold">
                    <th className="border border-[#333] px-2 py-1.5 w-10 text-center">STT</th>
                    <th className="border border-[#333] px-2.5 py-1.5 text-left">Hạng mục công việc trong Job #{jIdx + 1}</th>
                    <th className="border border-[#333] px-2.5 py-1.5 text-left">Đầu việc bàn giao / Thời hạn</th>
                    <th className="border border-[#333] px-2 py-1.5 w-16 text-center">SL</th>
                    <th className="border border-[#333] px-2.5 py-1.5 w-32 text-right">Thành tiền Net (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#333] px-2 py-1.5 text-center">1</td>
                    <td className="border border-[#333] px-2.5 py-1.5">
                      <span className="font-semibold">Sản xuất &amp; đăng tải Video ({job.productName || 'Sản phẩm'})</span>
                      <div className="text-2xs text-[#444]">
                        Kênh: {job.mediaChannel || 'TikTok'}
                        {job.videoUrl ? ` · Link Air: ${job.videoUrl}` : ''}
                      </div>
                    </td>
                    <td className="border border-[#333] px-2.5 py-1.5">
                      Đăng tải dự kiến: {job.airDate || '—'}
                    </td>
                    <td className="border border-[#333] px-2 py-1.5 text-center">{qty}</td>
                    <td className="border border-[#333] px-2.5 py-1.5 text-right font-semibold">
                      {formatNumber(videoTotal)}
                    </td>
                  </tr>

                  {activeAddons.map((addon, aIdx) => (
                    <tr key={addon.id || aIdx}>
                      <td className="border border-[#333] px-2 py-1.5 text-center">{aIdx + 2}</td>
                      <td className="border border-[#333] px-2.5 py-1.5">
                        <span>{addon.termLabel}</span>
                        {addon.evidenceCodeOrUrl && (
                          <div className="text-2xs text-[#444]">Mã / Link: {addon.evidenceCodeOrUrl}</div>
                        )}
                      </td>
                      <td className="border border-[#333] px-2.5 py-1.5">
                        Thời hạn: {addon.durationDays || 30} ngày
                        {addon.acceptanceStatus === 'DROPPED' ? ' (Hủy / Khấu trừ)' : ''}
                      </td>
                      <td className="border border-[#333] px-2 py-1.5 text-center">1</td>
                      <td className="border border-[#333] px-2.5 py-1.5 text-right">
                        {addon.acceptanceStatus === 'DROPPED'
                          ? '0 (Hủy)'
                          : addon.allocatedCostVnd > 0
                            ? formatNumber(addon.allocatedCostVnd)
                            : '0 (Gộp gói)'}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-[#faf9f5] font-semibold">
                    <td colSpan={4} className="border border-[#333] px-2.5 py-1.5 text-right">
                      Cộng Bảng công việc #{jIdx + 1} ({job.jobCode}) — Tiền Net:
                    </td>
                    <td className="border border-[#333] px-2.5 py-1.5 text-right">
                      {formatNumber(jobSubtotal)} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {savedJobTables.length > 1 && (
          <div className="border border-[#333] bg-[#f4f3ef] px-3 py-2 flex items-center justify-between text-[13.5px] font-semibold text-[#111]">
            <span>TỔNG CỘNG GIÁ TRỊ NET TOÀN DEAL ({savedJobTables.length} BẢNG CÔNG VIỆC / JOB):</span>
            <span>{formatNumber(grandTotalNet)} VNĐ</span>
          </div>
        )}
      </div>
    );
  };

  const renderAcceptanceScreenshotsBlock = () => {
    if (!acceptanceScreenshots || acceptanceScreenshots.length === 0) return null;
    const inspectionMeta = acceptanceScreenshots.find(s => s.inspectionMeta)?.inspectionMeta;

    return (
      <div className="doc-screenshot-section my-5 pt-3 border-t border-[#333] space-y-3">
        {inspectionMeta && (
          <div className="border border-[#333] p-3 bg-[#faf9f5] rounded-xs text-xs leading-snug space-y-1.5">
            <p className="font-semibold text-xs text-[#111]">
              Thông tin Link Air, chỉ số tương tác &amp; đối soát kịch bản nghiệm thu
            </p>
            <p className="text-[#222]">
              <span className="font-semibold">• Link bài đăng (Link Air):</span>{' '}
              <span className="font-code break-all">{inspectionMeta.resolvedUrl}</span>
            </p>
            <p className="text-[#222]">
              <span className="font-semibold">• Kênh đăng tải:</span> @{inspectionMeta.authorHandle} ({inspectionMeta.authorNickname}) ·{' '}
              <span className="font-semibold">Mã Video ID:</span> {inspectionMeta.videoId || '—'} ·{' '}
              <span className="font-semibold">Ngày giờ đăng:</span> {inspectionMeta.publishedTimeFormatted || '—'} ·{' '}
              <span className="font-semibold">Thời lượng:</span> {inspectionMeta.durationSeconds} giây
            </p>
            <p className="text-[#222]">
              <span className="font-semibold">• Chỉ số tương tác tại thời điểm nghiệm thu:</span>{' '}
              Lượt xem: <span className="font-semibold">{formatNumber(inspectionMeta.viewsCount)}</span> · Thả tim: <span className="font-semibold">{formatNumber(inspectionMeta.likesCount)}</span> · Bình luận: <span className="font-semibold">{formatNumber(inspectionMeta.commentsCount)}</span> · Chia sẻ: <span className="font-semibold">{formatNumber(inspectionMeta.sharesCount)}</span> · Lượt lưu: <span className="font-semibold">{formatNumber(inspectionMeta.savesCount)}</span> (ER: <span className="font-semibold">{inspectionMeta.engagementRate}%</span>)
            </p>
            <p className="text-[#222]">
              <span className="font-semibold">• Giỏ hàng TikTok Shop:</span>{' '}
              {inspectionMeta.hasCartAnchor
                ? `Đã gắn giỏ hàng (${inspectionMeta.cartAnchorTitle || 'Sản phẩm chiến dịch'})`
                : 'Chưa gắn giỏ hàng trên bài đăng'}
            </p>
            <p className="text-[#222]">
              <span className="font-semibold">• Đối soát kịch bản &amp; nội dung:</span>{' '}
              {inspectionMeta.scriptSummaryNote}
              {inspectionMeta.hashtags.length > 0 ? ` · Hashtag: ${inspectionMeta.hashtags.slice(0, 6).join(' ')}` : ''}
            </p>
          </div>
        )}

        <div>
          <p className="font-semibold text-xs text-[#111] mb-2">
            Hình ảnh chụp màn hình video lúc sản phẩm xuất hiện (Minh chứng nghiệm thu)
          </p>
          <div className="doc-screenshot-grid grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
            {acceptanceScreenshots.map((shot, sIdx) => (
              <div
                key={shot.id || sIdx}
                className="doc-screenshot-card border border-[#333] p-2.5 bg-[#faf9f5] rounded-xs text-xs leading-snug"
              >
                <div className="bg-black rounded-xs overflow-hidden mb-2 flex items-center justify-center max-h-[240px]">
                  <img
                    src={shot.imageDataUrl}
                    alt={shot.note || `Khung hình sản phẩm mốc ${shot.timeLabel}`}
                    className="max-h-[240px] w-auto object-contain mx-auto"
                  />
                </div>
                <p className="font-semibold text-[#111]">
                  Ảnh #{sIdx + 1}: Khung hình sản phẩm tại giây {shot.timeLabel}
                  {shot.matchedTerm ? ` — ${shot.matchedTerm}` : ''}
                </p>
                {shot.note && <p className="text-[#333] mt-0.5">Ghi chú: {shot.note}</p>}
                {shot.videoUrl && (
                  <p className="text-2xs text-[#555] font-code break-all mt-0.5">
                    Link video: {shot.videoUrl}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSheet = (inModal = false) => {
    const sigIdx = bodyBlocks.findIndex(
      b => b.kind === 'table' && b.variant === 'signature'
    );
    const beforeSigBlocks = sigIdx >= 0 ? bodyBlocks.slice(0, sigIdx) : bodyBlocks;
    const fromSigBlocks = sigIdx >= 0 ? bodyBlocks.slice(sigIdx) : [];

    return (
      <div
        ref={inModal ? undefined : containerRef}
        style={inModal ? undefined : { maxHeight }}
        className="overflow-auto bg-sunken p-3 sm:p-5 lg:p-6 rounded-b-xl"
      >
        <div
          ref={inModal ? undefined : printRef}
          style={{
            fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
            fontSize: `${Math.round(14 * (zoom / 100))}px`,
            lineHeight: 1.6,
          }}
          className="mx-auto w-full max-w-[816px] min-h-[1056px] bg-white text-black shadow-2xs border border-line-strong rounded-none px-6 py-8 sm:px-14 sm:py-12"
        >
          {/* Header biểu mẫu chuẩn Microsoft Word */}
          <div className="doc-header mb-6 pb-2 border-b border-[#d8d8d8] text-2xs text-[#555] flex items-center justify-between gap-2">
            <span className="font-sans font-medium tracking-wide text-[#666]">Phòng Pháp chế · UpBase B2C</span>
            <div className="text-right font-code text-[#333]">
              {headerBlocks.length > 0 ? (
                headerBlocks.map((b, i) => renderBlock(b, `hdr-${i}`))
              ) : (
                <span>{templateName || title || 'Hồ sơ pháp lý B2C'}</span>
              )}
            </div>
          </div>

          {/* Nội dung chính của hợp đồng */}
          {bodyBlocks.length > 0 ? (
            <div className="space-y-1">
              {beforeSigBlocks.map((b, i) => renderBlock(b, `body-pre-${i}`))}
              {renderMultiJobSowTablesBlock()}
              {renderAcceptanceScreenshotsBlock()}
              {fromSigBlocks.map((b, i) => renderBlock(b, `body-sig-${i}`))}
            </div>
          ) : (
            <div className="space-y-2">
              {paragraphs.map((p, i) => p && <p key={i}>{p}</p>)}
              {renderMultiJobSowTablesBlock()}
              {renderAcceptanceScreenshotsBlock()}
            </div>
          )}

          {/* Footer biểu mẫu chuẩn Microsoft Word */}
          <div className="doc-footer mt-10 pt-2 border-t border-[#d8d8d8] text-2xs text-[#666] flex flex-wrap items-center justify-between gap-2">
            {footerBlocks.length > 0 ? (
              footerBlocks.map((b, i) => (
                <div key={`ftr-${i}`}>{renderBlock(b, `ftr-${i}`)}</div>
              ))
            ) : (
              <span>Hệ thống Quản lý Hợp đồng B2C UpBase</span>
            )}
            <span className="font-code">Trang 1 / 1</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
      {/* Thanh công cụ kiểm tra hợp đồng */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
            <FileText className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
            <span className="truncate">{templateName || 'Bản xem văn bản hợp đồng (A4)'}</span>
          </span>

          {uniqueFields.length > 0 && (
            isTemplatePreview ? (
              <span className="text-2xs text-ink-3 tabular-nums">
                · {uniqueFields.length} vị trí điền ({requiredFields.length} bắt buộc)
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md border ${
                  missingRequired.length === 0
                    ? 'border-positive/30 bg-positive-soft/60 text-positive font-medium'
                    : 'border-warning/40 bg-warning-soft/70 text-warning-strong font-medium'
                }`}
              >
                {missingRequired.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                    Đủ {requiredFields.length}/{requiredFields.length} mục bắt buộc · Đã điền {filledCount}/{uniqueFields.length} ô
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-warning-strong" />
                    Còn {missingRequired.length} mục bắt buộc chưa điền ({requiredFields.length - missingRequired.length}/{requiredFields.length})
                  </>
                )}
              </span>
            )
          )}

          {!isTemplatePreview && missingRequired.length > 0 && (
            <button
              type="button"
              onClick={jumpToNextMissing}
              className="text-2xs font-medium text-accent hover:underline"
            >
              Tới mục trống tiếp theo →
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {versionSelector}

          <button
            type="button"
            onClick={() => setHighlight(v => !v)}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-2xs font-medium border transition-colors ${
              highlight
                ? 'bg-accent-soft/50 border-accent/40 text-accent'
                : 'bg-surface border-line text-ink-2 hover:bg-sunken'
            }`}
            title="Bật/tắt tô màu các vị trí điền dữ liệu trên mặt hợp đồng"
          >
            {highlight ? <Highlighter className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {highlight ? 'Đang đánh dấu chỗ điền' : 'Bản in chuẩn'}
          </button>

          {!compactToolbar && (
            <div className="hidden sm:inline-flex items-center border border-line rounded-md bg-surface">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(80, z - 10))}
                className="h-7 px-1.5 text-ink-2 hover:bg-sunken"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-2xs tabular-nums text-ink-2">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(130, z + 10))}
                className="h-7 px-1.5 text-ink-2 hover:bg-sunken"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:bg-sunken"
            title="In hoặc xuất PDF chuẩn trang A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">In / PDF</span>
          </button>

          {downloadHref && (
            <a
              href={downloadHref}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:bg-sunken"
              title="Tải file Word (.docx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải Word</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line bg-surface text-2xs font-medium text-ink-2 hover:bg-sunken"
            title="Phóng to toàn màn hình"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {renderSheet(false)}

      {/* Chế độ xem rộng toàn màn hình */}
      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={title || templateName || 'Xem hợp đồng'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" icon={Highlighter} onClick={() => setHighlight(v => !v)}>
                {highlight ? 'Chuyển sang bản in chuẩn' : 'Bật đánh dấu chỗ điền'}
              </Button>
              <Button size="sm" variant="ghost" icon={Printer} onClick={handlePrint}>
                In / Lưu PDF
              </Button>
            </div>
            <Button size="sm" icon={Minimize2} onClick={() => setFullscreen(false)}>
              Đóng khung phóng to
            </Button>
          </div>
        }
      >
        <div className="-mx-2">{renderSheet(true)}</div>
      </Modal>
    </div>
  );
}
