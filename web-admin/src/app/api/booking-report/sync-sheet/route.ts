import { NextRequest, NextResponse } from 'next/server';
import { ensureServiceAccountLoaded, parseSpreadsheetId, getAccessToken } from '@/lib/server/googleSheets';
import {
  BOOKING_REPORT_COLUMNS,
  BOOKING_REPORT_HEADERS,
  BOOKING_REPORT_LEGEND_ROW,
  createEmptyReportSheetRow,
  extractVideoIdFromUrl,
  formatMonthLabelForReport,
  parseSheetValuesToReportRows,
  serializeReportRowToSheetCells,
  type BookingReportSheetRow,
} from '@/lib/bookingReportSheet';

export const dynamic = 'force-dynamic';

const REPORT_TAB_NAME = 'Báo cáo & Nghiệm thu';

export interface IncomingDealReportPayload {
  thang?: string;
  store?: string;
  brand?: string;
  dot?: string;
  dealCode?: string;
  pic?: string;
  kocTier?: string;
  hinhThucHopTac?: string;
  idKenh?: string;
  tenKoc?: string;
  sanPham?: string;
  contentAngle?: string;
  contentPillar?: string;
  giaNet?: number;
  giaGross?: number;
  ngayAirPlan?: string;
  ngayAirReal?: string;
  tienDoAir?: string;
  linkVideo?: string;
  videoId?: string;
  sparkAds?: string;
  sparkExpiry?: string;
  views14d?: number;
  gmv14d?: number;
  views30d?: number;
  orders30d?: number;
  gmv30d?: number;
  gpm30d?: number;
  roi30d?: number;
  danhGia?: string;
  rowId?: string;
  reportRow?: Partial<BookingReportSheetRow>;
}

const normKey = (s?: string) =>
  String(s || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();

function buildFormattingBatchRequests(sheetId: number, totalDataRows: number) {
  const maxRow = Math.max(totalDataRows + 10, 50);
  const colorRgb: Record<'blue' | 'black' | 'red' | 'orange', { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    blue: { red: 0.067, green: 0.333, blue: 0.8 }, // #1155CC
    red: { red: 0.85, green: 0.08, blue: 0.08 },   // #D91414
    orange: { red: 0.9, green: 0.45, blue: 0 },    // #E67300
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [
    // 1. Freeze 2 dòng tiêu đề & 3 cột định danh (Tháng, Gian hàng, Mã Booking)
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 2,
            frozenColumnCount: 3,
          },
        },
        fields: 'gridProperties(frozenRowCount,frozenColumnCount)',
      },
    },
    // 2. Chiều cao dòng 1 (Note: 26px) và dòng 2 (Headers: 42px)
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 26 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 42 },
        fields: 'pixelSize',
      },
    },
    // 3. Nền dòng 1 (Note) xám nhạt #F4F5F7, chữ đậm
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: BOOKING_REPORT_COLUMNS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.957, green: 0.961, blue: 0.969 },
            textFormat: { bold: true, fontSize: 10, fontFamily: 'Arial' },
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
      },
    },
    // Màu chữ chú thích trên dòng 1 (B1: Xanh, C1: Đen, D1: Cam, E1: Đỏ)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: colorRgb.blue } } },
        fields: 'userEnteredFormat.textFormat(bold,foregroundColor)',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 },
        cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: colorRgb.black } } },
        fields: 'userEnteredFormat.textFormat(bold,foregroundColor)',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: colorRgb.orange } } },
        fields: 'userEnteredFormat.textFormat(bold,foregroundColor)',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 },
        cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: colorRgb.red } } },
        fields: 'userEnteredFormat.textFormat(bold,foregroundColor)',
      },
    },
    // 4. Nền dòng 2 (Header 28 cột) vàng chuẩn #FFF258, chữ đậm, căn giữa, tự xuống dòng
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: BOOKING_REPORT_COLUMNS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1.0, green: 0.949, blue: 0.345 }, // #FFF258
            textFormat: { bold: true, fontSize: 10, fontFamily: 'Arial' },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
      },
    },
  ];

  // 5. Tô màu chữ dòng 2 theo nhóm màu chuẩn (blue / black / red / orange)
  let startIdx = 0;
  while (startIdx < BOOKING_REPORT_COLUMNS.length) {
    let endIdx = startIdx;
    const colColor = BOOKING_REPORT_COLUMNS[startIdx].color;
    while (
      endIdx + 1 < BOOKING_REPORT_COLUMNS.length &&
      BOOKING_REPORT_COLUMNS[endIdx + 1].color === colColor
    ) {
      endIdx++;
    }
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: startIdx,
          endColumnIndex: endIdx + 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              fontSize: 10,
              fontFamily: 'Arial',
              foregroundColor: colorRgb[colColor],
            },
          },
        },
        fields: 'userEnteredFormat.textFormat(bold,fontSize,fontFamily,foregroundColor)',
      },
    });
    startIdx = endIdx + 1;
  }

  // 6. Định dạng số (Number Format) và độ rộng cột cho toàn bộ 28 cột
  BOOKING_REPORT_COLUMNS.forEach((col, idx) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: idx, endIndex: idx + 1 },
        properties: { pixelSize: col.width },
        fields: 'pixelSize',
      },
    });

    if (col.numberFormat !== 'NONE') {
      const pattern =
        col.numberFormat === 'PERCENT'
          ? '0.00%'
          : col.numberFormat === 'DECIMAL'
            ? '0.00'
            : '#,##0';
      const type = col.numberFormat === 'PERCENT' ? 'PERCENT' : 'NUMBER';
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 2,
            endRowIndex: maxRow,
            startColumnIndex: idx,
            endColumnIndex: idx + 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type, pattern },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      });
    }
  });

  return requests;
}

export async function GET(request: NextRequest) {
  const sa = await ensureServiceAccountLoaded();
  if (!sa.configured) {
    return NextResponse.json({ error: 'Service Account chưa được cấu hình.', code: 'UNCONFIGURED' }, { status: 400 });
  }

  const sheetUrl = request.nextUrl.searchParams.get('sheetUrl') || '';
  const targetTab = (request.nextUrl.searchParams.get('tab') || request.nextUrl.searchParams.get('tabName') || REPORT_TAB_NAME).trim() || REPORT_TAB_NAME;
  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID_URL' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(targetTab)}'!A1:CD500`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        return NextResponse.json({ exists: false, message: `Tab "${targetTab}" chưa được tạo.` });
      }
      return NextResponse.json({ error: 'Không thể đọc dữ liệu Sheet', status: res.status }, { status: 500 });
    }

    const data = await res.json();
    const allValues: string[][] = data.values || [];
    const parsed = parseSheetValuesToReportRows(allValues);

    const deals = parsed.rows.map((r, idx) => {
      const views30 = r.view || 0;
      const gmv30 = r.gmvTotal || 0;
      const orders30 = r.ordersTotal || 0;
      const roiVal =
        r.roiTotal ||
        (r.totalCost > 0 ? Number((r.gmvTotal / r.totalCost).toFixed(2)) : 0);

      let danhGia = r.danhGia || '';
      if (!danhGia) {
        if (!r.videoUrl && !r.airDate) danhGia = 'Chờ lên bài';
        else if (roiVal >= 5) danhGia = 'Vượt Target';
        else if (roiVal >= 2) danhGia = 'Đạt Target';
        else if (gmv30 > 0 || views30 > 0) danhGia = 'Cần tối ưu';
      }

      return {
        index: idx + 1,
        thang: r.thangReport,
        store: r.store,
        dot: '',
        dealCode: r.bookingId,
        pic: r.pic,
        kocTier: r.kocTier,
        idKenh: r.creatorName,
        tenKoc: r.kocName || r.creatorName,
        sanPham: r.product,
        giaNet: r.costBookingNet,
        giaGross: r.costBookingGross,
        costAds: r.costAds,
        totalCost: r.totalCost,
        ngayAirPlan: r.planAirDate,
        ngayAirReal: r.airDate,
        tienDoAir: r.tienDoAir || (r.airDate ? 'Đã lên bài' : 'Chờ lên bài'),
        linkVideo: r.videoUrl,
        videoId: r.videoId,
        sparkAds: r.sparkAdsCode,
        sparkExpiry: '',
        views14d: 0,
        gmv14d: 0,
        views30d: views30,
        orders30d: orders30,
        gmv30d: gmv30,
        gpm30d: r.gpm,
        gmvAds: r.gmvAds,
        roasAds: r.roasAds,
        roi30d: roiVal,
        danhGia,
        rowId: r.rowId || r.bookingId,
        reportRow: r,
      };
    });

    const totalGmv = deals.reduce((acc, d) => acc + d.gmv30d, 0);
    const totalViews = deals.reduce((acc, d) => acc + d.views30d, 0);
    const totalOrders = deals.reduce((acc, d) => acc + d.orders30d, 0);
    const totalBookingNet = deals.reduce((acc, d) => acc + d.giaNet, 0);
    const totalBookingGross = deals.reduce((acc, d) => acc + d.giaGross, 0);
    const totalAdsCost = deals.reduce((acc, d) => acc + d.costAds, 0);
    const totalCost = deals.reduce((acc, d) => acc + d.totalCost, 0);

    return NextResponse.json({
      exists: true,
      tabName: targetTab,
      columnCount: BOOKING_REPORT_COLUMNS.length,
      totalDeals: deals.length,
      totalViews,
      totalOrders,
      totalGmv,
      totalBookingNet,
      totalBookingGross,
      totalAdsCost,
      totalCost,
      overallRoi: totalCost > 0 ? Number((totalGmv / totalCost).toFixed(2)) : 0,
      deals,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sa = await ensureServiceAccountLoaded();
  if (!sa.configured) {
    return NextResponse.json({ error: 'Service Account chưa được cấu hình.', code: 'UNCONFIGURED' }, { status: 400 });
  }

  const body = await request.json();
  const { sheetUrl, deals, tabName, formatTemplate = true, dryRun = false } = body as {
    sheetUrl: string;
    deals: IncomingDealReportPayload[];
    tabName?: string;
    formatTemplate?: boolean;
    dryRun?: boolean;
  };
  const targetTab = (tabName || REPORT_TAB_NAME).trim() || REPORT_TAB_NAME;

  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID_URL' }, { status: 400 });
  }

  if (!Array.isArray(deals) || deals.length === 0) {
    return NextResponse.json({ error: 'Danh sách deal rỗng.', code: 'EMPTY_DEALS' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();

    // 1. Kiểm tra metadata của Spreadsheet để lấy sheetId của targetTab
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title,gridProperties))`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaJson = metaRes.ok ? await metaRes.json() : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSheetProp = metaJson?.sheets?.find((s: any) => s?.properties?.title === targetTab)?.properties;
    let sheetId: number | null = existingSheetProp?.sheetId ?? null;
    const tabExistedBefore = sheetId !== null;

    // 2. Đọc dữ liệu hiện có trên tab để:
    //    - So sánh chi tiết từng dòng & từng trường (Đọc - So sánh - Báo cáo)
    //    - Giữ nguyên số liệu Seller & Ads (Chữ cam) đã có trên Sheet
    //    - Bảo toàn các dòng chỉ có trên Sheet (không nằm trong bộ lọc đẩy hiện tại)
    const existingRowsList: BookingReportSheetRow[] = [];
    const existingByKey = new Map<string, { row: BookingReportSheetRow; index: number }>();

    if (tabExistedBefore) {
      const existingRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(targetTab)}'!A1:CD500`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => null);

      if (existingRes && existingRes.ok) {
        const existingData = await existingRes.json().catch(() => null);
        if (existingData?.values) {
          const parsedExisting = parseSheetValuesToReportRows(existingData.values);
          parsedExisting.rows.forEach((r, idx) => {
            existingRowsList.push(r);
            const entry = { row: r, index: idx };
            if (r.bookingId) existingByKey.set(`bo::${normKey(r.bookingId)}`, entry);
            if (r.rowId) existingByKey.set(`id::${normKey(r.rowId)}`, entry);
            if (r.videoId) existingByKey.set(`vid::${normKey(r.videoId)}`, entry);
            if (r.creatorName) {
              existingByKey.set(`koc::${normKey(r.creatorName)}::${normKey(r.product)}`, entry);
              existingByKey.set(`koc::${normKey(r.creatorName)}`, entry);
            }
          });
        }
      }
    }

    const matchedExistingIndices = new Set<number>();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    interface ReportSyncDiffItem {
      dealCode: string;
      store: string;
      idKenh: string;
      tenKoc: string;
      sanPham: string;
      status: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'PRESERVED_SHEET';
      fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }>;
      preservedMetricsNote?: string;
    }

    const diffItems: ReportSyncDiffItem[] = [];
    const mergedDataRows: BookingReportSheetRow[] = [];

    // 3. Đối soát từng dòng Deal từ Web với dữ liệu hiện có trên Sheet 3
    deals.forEach((d) => {
      const cleanHandle = (d.idKenh || d.reportRow?.creatorName || '').replace(/^@/, '').trim();
      const extractedVid =
        d.videoId ||
        d.reportRow?.videoId ||
        extractVideoIdFromUrl(d.linkVideo || d.reportRow?.videoUrl) ||
        '';
      const matchedEntry =
        (d.dealCode ? existingByKey.get(`bo::${normKey(d.dealCode)}`) : undefined) ||
        (d.rowId ? existingByKey.get(`id::${normKey(d.rowId)}`) : undefined) ||
        (extractedVid ? existingByKey.get(`vid::${normKey(extractedVid)}`) : undefined) ||
        (cleanHandle && d.sanPham ? existingByKey.get(`koc::${normKey(cleanHandle)}::${normKey(d.sanPham)}`) : undefined) ||
        (cleanHandle ? existingByKey.get(`koc::${normKey(cleanHandle)}`) : undefined);

      const existing = matchedEntry?.row;
      if (matchedEntry) {
        matchedExistingIndices.add(matchedEntry.index);
      }

      const base = {
        ...createEmptyReportSheetRow(),
        ...(existing || {}),
        ...(d.reportRow || {}),
      };

      const netCost = d.giaNet ?? base.costBookingNet ?? 0;
      const grossCost = d.giaGross ?? (netCost > 0 ? Math.round(netCost / 0.9) : base.costBookingGross || 0);
      const totalView = Math.max(base.view || 0, d.views30d || 0, d.views14d || 0);
      const totalOrders = Math.max(base.ordersTotal || 0, d.orders30d || 0);
      const totalGmv = Math.max(base.gmvTotal || 0, d.gmv30d || 0, d.gmv14d || 0);
      const resolvedUrl =
        d.linkVideo ||
        base.videoUrl ||
        (cleanHandle && extractedVid ? `https://www.tiktok.com/@${cleanHandle}/video/${extractedVid}` : '');
      const resolvedAirDate = d.ngayAirReal || base.airDate || '';
      const resolvedMonthReport = formatMonthLabelForReport(d.thang || base.thangReport || '2026/10');
      const resolvedVideoId = extractedVid || existing?.videoId || '';

      const mergedRow: BookingReportSheetRow = {
        ...base,
        thangReport: resolvedMonthReport,
        store: d.store || base.store || '',
        bookingId: d.dealCode || base.bookingId || d.rowId || '',
        pic: d.pic || base.pic || '',
        kocTier: d.kocTier || base.kocTier || 'KL1',
        creatorName: cleanHandle,
        kocName: d.tenKoc || base.kocName || cleanHandle,
        product: d.sanPham || base.product || '',
        planAirDate: d.ngayAirPlan || base.planAirDate || '',
        airDate: resolvedAirDate,
        videoUrl: resolvedUrl,
        videoId: resolvedVideoId,
        sparkAdsCode: d.sparkAds || base.sparkAdsCode || '',
        costBookingNet: netCost,
        costBookingGross: grossCost,
        costAds: existing?.costAds || base.costAds || 0,
        totalCost: grossCost + (existing?.costAds || base.costAds || 0),
        view: totalView,
        interactions: existing?.interactions || base.interactions || 0,
        click: existing?.click || base.click || (totalView > 0 ? Math.round(totalView * 0.055) : 0),
        ordersTotal: totalOrders,
        gmvTotal: totalGmv,
        gpm: d.gpm30d || existing?.gpm || base.gpm || (totalView > 0 ? Math.round((totalGmv / totalView) * 1000) : 0),
        gmvAds: existing?.gmvAds || base.gmvAds || 0,
      };

      mergedDataRows.push(mergedRow);

      if (!existing) {
        addedCount += 1;
        diffItems.push({
          dealCode: mergedRow.bookingId,
          store: mergedRow.store,
          idKenh: mergedRow.creatorName,
          tenKoc: mergedRow.kocName,
          sanPham: mergedRow.product,
          status: 'ADDED',
          fieldDiffs: [
            {
              field: 'Thêm mới Deal lên Sheet 3',
              oldVal: 'Chưa có trên Sheet',
              newVal: `Net: ${netCost.toLocaleString('vi-VN')}đ${resolvedAirDate ? ` · Air: ${resolvedAirDate}` : ''}`,
            },
          ],
        });
      } else {
        const fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }> = [];
        const checkStr = (label: string, oldV?: string, newV?: string) => {
          const a = String(oldV || '').trim();
          const b = String(newV || '').trim();
          if (b && a !== b) {
            fieldDiffs.push({ field: label, oldVal: a || '—', newVal: b });
          }
        };
        const checkNum = (label: string, oldV?: number, newV?: number, isCurrency = false) => {
          const a = Math.round(Number(oldV || 0));
          const b = Math.round(Number(newV || 0));
          if (b > 0 && a !== b) {
            fieldDiffs.push({
              field: label,
              oldVal: a > 0 ? `${a.toLocaleString('vi-VN')}${isCurrency ? 'đ' : ''}` : '0',
              newVal: `${b.toLocaleString('vi-VN')}${isCurrency ? 'đ' : ''}`,
            });
          }
        };

        checkStr('Mã Booking', existing.bookingId, mergedRow.bookingId);
        checkStr('PIC', existing.pic, mergedRow.pic);
        checkStr('Bậc KOC', existing.kocTier, mergedRow.kocTier);
        checkStr('Sản phẩm', existing.product, mergedRow.product);
        checkStr('Ngày Air dự kiến', existing.planAirDate, mergedRow.planAirDate);
        checkStr('Ngày Air thực tế', existing.airDate, mergedRow.airDate);
        checkStr('ID video', existing.videoId, mergedRow.videoId);
        checkStr('Mã Spark Ads', existing.sparkAdsCode, mergedRow.sparkAdsCode);
        checkNum('Giá Booking Net', existing.costBookingNet, mergedRow.costBookingNet, true);
        checkNum('Views', existing.view, mergedRow.view, false);
        checkNum('Đơn hàng', existing.ordersTotal, mergedRow.ordersTotal, false);
        checkNum('GMV video', existing.gmvTotal, mergedRow.gmvTotal, true);

        const preservedParts: string[] = [];
        if ((existing.view || 0) > 0) preservedParts.push(`Views: ${existing.view.toLocaleString('vi-VN')}`);
        if ((existing.gmvTotal || 0) > 0) preservedParts.push(`GMV: ${existing.gmvTotal.toLocaleString('vi-VN')}đ`);
        if ((existing.costAds || 0) > 0) preservedParts.push(`Ads: ${existing.costAds.toLocaleString('vi-VN')}đ`);

        if (fieldDiffs.length > 0) {
          updatedCount += 1;
          diffItems.push({
            dealCode: mergedRow.bookingId,
            store: mergedRow.store,
            idKenh: mergedRow.creatorName,
            tenKoc: mergedRow.kocName,
            sanPham: mergedRow.product,
            status: 'UPDATED',
            fieldDiffs,
            preservedMetricsNote: preservedParts.length > 0 ? `Giữ nguyên: ${preservedParts.join(' · ')}` : undefined,
          });
        } else {
          unchangedCount += 1;
          diffItems.push({
            dealCode: mergedRow.bookingId,
            store: mergedRow.store,
            idKenh: mergedRow.creatorName,
            tenKoc: mergedRow.kocName,
            sanPham: mergedRow.product,
            status: 'UNCHANGED',
            fieldDiffs: [],
            preservedMetricsNote: preservedParts.length > 0 ? `Đã khớp (${preservedParts.join(' · ')})` : 'Đã khớp 100%',
          });
        }
      }
    });

    // 4. Bảo toàn các dòng đang có sẵn trên Sheet 3 nhưng không nằm trong danh sách đẩy lần này
    let preservedSheetOnlyCount = 0;
    existingRowsList.forEach((existingRow, idx) => {
      if (!matchedExistingIndices.has(idx)) {
        preservedSheetOnlyCount += 1;
        mergedDataRows.push(existingRow);
        diffItems.push({
          dealCode: existingRow.bookingId || `Dòng #${idx + 3}`,
          store: existingRow.store || '—',
          idKenh: existingRow.creatorName || '—',
          tenKoc: existingRow.kocName || existingRow.creatorName || '—',
          sanPham: existingRow.product || '—',
          status: 'PRESERVED_SHEET',
          fieldDiffs: [
            {
              field: 'Dòng có sẵn trên Sheet 3',
              oldVal: `GMV: ${(existingRow.gmvTotal || 0).toLocaleString('vi-VN')}đ`,
              newVal: 'Giữ nguyên trên Sheet (không ghi đè)',
            },
          ],
        });
      }
    });

    // Nếu là chế độ dryRun (Đọc & So sánh trước khi đẩy), trả về ngay báo cáo đối soát mà KHÔNG ghi lên Google Sheet
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        tabName: targetTab,
        tabExistedBefore,
        columnCount: BOOKING_REPORT_COLUMNS.length,
        totalDealsToPush: deals.length,
        existingSheetRowsCount: existingRowsList.length,
        addedCount,
        updatedCount,
        unchangedCount,
        preservedSheetOnlyCount,
        diffItems,
      });
    }

    // 5. Thực thi ghi thật lên Google Sheet (khi dryRun = false)
    if (sheetId === null) {
      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetTab,
                  gridProperties: {
                    rowCount: Math.max(mergedDataRows.length + 50, 200),
                    columnCount: BOOKING_REPORT_COLUMNS.length,
                  },
                },
              },
            },
          ],
        }),
      });
      const addData = addRes.ok ? await addRes.json() : null;
      sheetId = addData?.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    } else {
      const currentCols = existingSheetProp?.gridProperties?.columnCount || 26;
      const currentRows = existingSheetProp?.gridProperties?.rowCount || 100;
      if (currentCols !== BOOKING_REPORT_COLUMNS.length || currentRows < mergedDataRows.length + 10) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId,
                    gridProperties: {
                      rowCount: Math.max(currentRows, mergedDataRows.length + 50),
                      columnCount: BOOKING_REPORT_COLUMNS.length,
                    },
                  },
                  fields: 'gridProperties(rowCount,columnCount)',
                },
              },
            ],
          }),
        }).catch(() => null);
      }
    }

    const serializedRows = mergedDataRows.map((row, idx) =>
      serializeReportRowToSheetCells(row, idx + 3, true)
    );

    const allValues = [BOOKING_REPORT_LEGEND_ROW, BOOKING_REPORT_HEADERS, ...serializedRows];
    const range = `'${encodeURIComponent(targetTab)}'!A1:AB${allValues.length}`;

    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: allValues }),
      }
    );

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => null);
      return NextResponse.json({ error: 'Lỗi ghi dữ liệu Google Sheet', details: errData }, { status: 500 });
    }

    if (formatTemplate && sheetId !== null) {
      const formatRequests = buildFormattingBatchRequests(sheetId, serializedRows.length);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: formatRequests }),
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      tabName: targetTab,
      columnCount: BOOKING_REPORT_COLUMNS.length,
      syncedRows: serializedRows.length,
      addedCount,
      updatedCount,
      unchangedCount,
      preservedSheetOnlyCount,
      diffItems,
      updatedRange: range,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
