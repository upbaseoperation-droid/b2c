import { NextRequest, NextResponse } from 'next/server';
import { ensureServiceAccountLoaded, parseSpreadsheetId, getAccessToken } from '@/lib/server/googleSheets';

export const dynamic = 'force-dynamic';

const REPORT_TAB_NAME = 'Báo cáo & Nghiệm thu';

interface ReportRowData {
  thang: string;
  store: string;
  dot: string;
  dealCode: string;
  idKenh: string;
  tenKoc: string;
  sanPham: string;
  giaNet: number;
  giaGross: number;
  ngayAirPlan: string;
  ngayAirReal: string;
  tienDoAir: string;
  linkVideo: string;
  sparkAds: string;
  sparkExpiry: string;
  views30d: number;
  orders30d: number;
  gmv30d: number;
  roi30d: number;
  danhGia: string;
  rowId: string;
}

export async function GET(request: NextRequest) {
  const sa = await ensureServiceAccountLoaded();
  if (!sa.configured) {
    return NextResponse.json({ error: 'Service Account chưa được cấu hình.', code: 'UNCONFIGURED' }, { status: 400 });
  }

  const sheetUrl = request.nextUrl.searchParams.get('sheetUrl') || '';
  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID_URL' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(REPORT_TAB_NAME)}'!A2:U500`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        return NextResponse.json({ exists: false, message: `Tab "${REPORT_TAB_NAME}" chưa được tạo.` });
      }
      return NextResponse.json({ error: 'Không thể đọc dữ liệu Sheet', status: res.status }, { status: 500 });
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    const deals = rows.map((r, idx) => ({
      index: idx + 1,
      thang: r[0] || '',
      store: r[1] || '',
      dot: r[2] || '',
      dealCode: r[3] || '',
      idKenh: r[4] || '',
      tenKoc: r[5] || '',
      sanPham: r[6] || '',
      giaNet: Number(r[7]?.toString().replace(/[^\d]/g, '') || 0),
      giaGross: Number(r[8]?.toString().replace(/[^\d]/g, '') || 0),
      ngayAirPlan: r[9] || '',
      ngayAirReal: r[10] || '',
      tienDoAir: r[11] || '',
      linkVideo: r[12] || '',
      sparkAds: r[13] || '',
      sparkExpiry: r[14] || '',
      views30d: Number(r[15]?.toString().replace(/[^\d]/g, '') || 0),
      orders30d: Number(r[16]?.toString().replace(/[^\d]/g, '') || 0),
      gmv30d: Number(r[17]?.toString().replace(/[^\d]/g, '') || 0),
      roi30d: Number(r[18]?.toString().replace(/[^\d.]/g, '') || 0),
      danhGia: r[19] || '',
      rowId: r[20] || ''
    }));

    const totalGmv = deals.reduce((acc, d) => acc + d.gmv30d, 0);
    const totalViews = deals.reduce((acc, d) => acc + d.views30d, 0);
    const totalOrders = deals.reduce((acc, d) => acc + d.orders30d, 0);

    return NextResponse.json({
      exists: true,
      totalDeals: deals.length,
      totalViews,
      totalOrders,
      totalGmv,
      deals
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
  const { sheetUrl, deals } = body as { sheetUrl: string; deals: ReportRowData[] };

  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID_URL' }, { status: 400 });
  }

  if (!Array.isArray(deals) || deals.length === 0) {
    return NextResponse.json({ error: 'Danh sách deal rỗng.', code: 'EMPTY_DEALS' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const rows = deals.map(d => [
      d.thang || '',
      d.store || '',
      d.dot || '',
      d.dealCode || '',
      d.idKenh || '',
      d.tenKoc || '',
      d.sanPham || '',
      d.giaNet || 0,
      d.giaGross || 0,
      d.ngayAirPlan || '',
      d.ngayAirReal || '',
      d.tienDoAir || '',
      d.linkVideo || '',
      d.sparkAds || '',
      d.sparkExpiry || '',
      d.views30d || 0,
      d.orders30d || 0,
      d.gmv30d || 0,
      d.roi30d || 0,
      d.danhGia || '',
      d.rowId || ''
    ]);

    // Ghi đè hoặc append vào tab "Báo cáo & Nghiệm thu"
    const range = `'${encodeURIComponent(REPORT_TAB_NAME)}'!A2:U${rows.length + 1}`;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows })
    });

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json({ error: 'Lỗi ghi dữ liệu Google Sheet', details: errData }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      syncedRows: rows.length,
      updatedRange: range
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
