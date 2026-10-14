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
import type { ContractField, DocBlock, DocParagraph, DocTable, SigningPerson } from '../../lib/contracts/types';
import { Button, Modal } from '../ui';

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
  maxHeight?: string;
  compactToolbar?: boolean;
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
  maxHeight = '760px',
  compactToolbar = false,
}: ContractDocumentViewerProps) {
  const [highlight, setHighlight] = useState(true);
  const [zoom, setZoom] = useState<number>(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [missingCursor, setMissingCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  // Danh sách các trường duy nhất (mỗi key 1 lần) để thống kê tiến độ điền
  const uniqueFields = useMemo(
    () => [...new Map(fields.map(f => [f.key, f])).values()],
    [fields],
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
      if (p.boldPrefix && p.boldPrefix > 0 && p.boldPrefix < text.length) {
        return (
          <>
            <strong className="font-semibold">{text.slice(0, p.boldPrefix)}</strong>
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
              <strong className="font-semibold">{prefixSlice.slice(0, bEnd)}</strong>
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
          className={`field-mark inline rounded px-1 py-0.5 font-medium transition-all ${
            changed
              ? 'bg-blue-100 text-blue-950 border-b-2 border-blue-600'
              : 'bg-emerald-50/95 text-emerald-950 border-b-2 border-emerald-600/70'
          } ${isSelected ? 'ring-2 ring-accent bg-amber-100/90' : ''} ${
            onSelectField ? 'cursor-pointer hover:bg-emerald-100' : ''
          }`}
        >
          {val}
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
        className={`field-mark inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-sans text-[12px] leading-snug transition-all ${
          f.required
            ? 'bg-amber-50 text-amber-900 border border-dashed border-amber-500 font-medium'
            : 'bg-neutral-100 text-neutral-600 border border-dashed border-neutral-400'
        } ${isSelected ? 'ring-2 ring-accent bg-amber-100' : ''} ${
          onSelectField ? 'cursor-pointer hover:bg-amber-100/80' : ''
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
      const isMainTitle = /^(HỢP ĐỒNG|BIÊN BẢN NGHIỆM THU)/i.test(trimmed);
      const isMotto = /^Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/i.test(trimmed);
      const isClause = /^ĐIỀU\s+\d+/i.test(trimmed);
      const alignClass =
        block.align === 'center'
          ? 'text-center'
          : block.align === 'right'
            ? 'text-right'
            : block.align === 'justify'
              ? 'text-justify'
              : 'text-left';

      return (
        <p
          key={idx}
          className={`${alignClass} ${block.bold ? 'font-semibold' : ''} ${block.italic ? 'italic' : ''} ${
            isMainTitle
              ? 'text-[17px] uppercase tracking-wide mt-4 mb-1 text-[#111]'
              : isClause
                ? 'mt-3.5 mb-1 text-[14.5px] text-[#111]'
                : 'my-1'
          }`}
        >
          <span className={isMotto ? 'inline-block border-b border-[#222] pb-1 px-4' : undefined}>
            {renderParagraphContent(block)}
          </span>
        </p>
      );
    }

    return renderTable(block, idx);
  };

  const renderTable = (table: DocTable, idx: string) => {
    if (table.variant === 'signature') {
      return (
        <table key={idx} className="doc-signature w-full mt-7 mb-4 table-fixed border-collapse">
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => {
                  const signer = rIdx === 0 && signingPeople ? signingPeople[cIdx] : undefined;
                  return (
                    <td
                      key={cIdx}
                      colSpan={cell.colSpan}
                      className="w-1/2 align-top text-center px-3 pt-2 pb-16"
                    >
                      {cell.blocks.map((b, bIdx) => renderBlock(b, `${idx}-r${rIdx}-c${cIdx}-${bIdx}`))}
                      {signer && (
                        <div
                          className={`mt-4 inline-flex flex-col items-center rounded-md border px-3 py-2 font-sans text-[12px] ${
                            signer.action === 2
                              ? 'border-emerald-600/60 bg-emerald-50/90 text-emerald-900'
                              : signer.action === 3
                                ? 'border-red-500/60 bg-red-50 text-red-900'
                                : 'border-amber-500/60 bg-amber-50/80 text-amber-900'
                          }`}
                        >
                          <span className="font-semibold uppercase tracking-wide">
                            {signer.action === 2 ? 'Đã ký xác nhận' : signer.status}
                          </span>
                          <span className="font-medium mt-0.5">{signer.name}</span>
                          {signer.email && <span className="text-2xs opacity-75">{signer.email}</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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

    return (
      <div key={idx} className="my-3 overflow-x-auto">
        <table className="doc-grid w-full border-collapse border border-[#333] text-[13.5px]">
          <tbody>
            {table.rows.map((row, rIdx) => {
              const isHeader = rIdx === 0 && row.length >= 2;
              return (
                <tr key={rIdx} className={isHeader ? 'bg-[#f4f3ef] font-semibold' : undefined}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      colSpan={cell.colSpan}
                      className={`border border-[#333] px-2.5 py-1.5 align-top ${
                        cIdx === 0 && row.length >= 3 ? 'w-12 text-center' : ''
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
      </div>
    );
  };

  const renderSheet = (inModal = false) => (
    <div
      ref={inModal ? undefined : containerRef}
      style={inModal ? undefined : { maxHeight }}
      className="overflow-auto bg-sunken/80 p-3 sm:p-6 rounded-b-xl"
    >
      <div
        ref={inModal ? undefined : printRef}
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: `${Math.round(14.5 * (zoom / 100))}px`,
          lineHeight: 1.6,
        }}
        className="mx-auto w-full max-w-[810px] bg-white text-[#141413] shadow-[0_2px_14px_rgba(0,0,0,0.07)] border border-[#d8d5ce] rounded-sm px-6 py-8 sm:px-14 sm:py-11 selection:bg-amber-200/70"
      >
        {/* Header biểu mẫu pháp chế */}
        {headerBlocks.length > 0 && (
          <div className="doc-header mb-5 pb-2 border-b border-[#e2dfd8] text-[12px] text-[#575653] flex items-center justify-between gap-2">
            <span>Biểu mẫu Pháp chế Upbase</span>
            <div className="text-right font-mono">
              {headerBlocks.map((b, i) => renderBlock(b, `hdr-${i}`))}
            </div>
          </div>
        )}

        {/* Nội dung chính của hợp đồng */}
        {bodyBlocks.length > 0 ? (
          <div className="space-y-1">
            {bodyBlocks.map((b, i) => renderBlock(b, `body-${i}`))}
          </div>
        ) : (
          <div className="space-y-2">
            {paragraphs.map((p, i) => p && <p key={i}>{p}</p>)}
          </div>
        )}

        {/* Footer số hiệu & trang */}
        {footerBlocks.length > 0 && (
          <div className="doc-footer mt-8 pt-3 border-t border-[#e2dfd8] text-[12px] text-[#575653] flex flex-wrap items-center justify-between gap-2">
            {footerBlocks.map((b, i) => (
              <div key={`ftr-${i}`}>{renderBlock(b, `ftr-${i}`)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
      {/* Thanh công cụ kiểm tra hợp đồng */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <FileText className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
            <span className="truncate">{templateName || 'Bản xem văn bản hợp đồng (A4)'}</span>
          </span>

          {uniqueFields.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-2xs ${
                missingRequired.length === 0
                  ? 'text-ink-2'
                  : 'text-amber-800 font-medium'
              }`}
            >
              {missingRequired.length === 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đủ {requiredFields.length}/{requiredFields.length} mục bắt buộc · Đã điền {filledCount}/{uniqueFields.length} ô
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Còn {missingRequired.length} mục bắt buộc chưa điền ({requiredFields.length - missingRequired.length}/{requiredFields.length})
                </>
              )}
            </span>
          )}

          {missingRequired.length > 0 && (
            <button
              type="button"
              onClick={jumpToNextMissing}
              className="text-2xs font-medium text-accent hover:underline"
            >
              Tới mục trống tiếp theo
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
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
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

      {/* Chú thích màu đánh dấu để nhân viên mới nhìn hiểu ngay */}
      {highlight && uniqueFields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 bg-sunken/50 border-b border-line text-2xs text-ink-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border-b-2 border-emerald-600 inline-block" />
              Thông tin đã điền
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-50 border border-dashed border-amber-500 inline-block" />
              Mục bắt buộc còn trống
            </span>
            {compareValues && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border-b-2 border-blue-600 inline-block" />
                Nội dung mới thay đổi
              </span>
            )}
          </div>
          {onSelectField && (
            <span>Bấm trực tiếp vào vị trí đánh dấu trên hợp đồng để chuyển tới ô nhập</span>
          )}
        </div>
      )}

      {renderSheet(false)}

      {/* Chế độ xem rộng toàn màn hình */}
      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={title || templateName || 'Xem hợp đồng'}
        description="Kiểm tra toàn văn hợp đồng trên trang giấy A4."
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
