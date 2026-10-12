/**
 * Import file Lark "B2C_Quản lý Booking_4.1 Plan order tổng" (export .xlsx) → dữ liệu chuẩn hoá cho Ops Hub.
 *
 * Mapping và quy tắc: blueprint/1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md (HUB-1.9), DEC-006.
 *
 * Cách chạy (từ thư mục web-admin):
 *   npx tsx scripts/import_plan_order_41.ts "<đường dẫn file .xlsx>" [thư mục output]
 *
 * Output mặc định: web-admin/.import-output/plan_order_41/ (đã gitignore — có tên nhân sự, không commit):
 *   - records.json    : 1 bản ghi / Record ID, đã làm sạch, chỉ phạm vi B2C phụ trách = 1
 *   - metrics_long.csv: dạng dọc  record × scope × metric × (plan | actual)
 *   - anomalies.csv   : các dòng lệch quy tắc (cần owner 4.1 xử lý)
 *   - summary.json    : thống kê nhanh
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// DEC-006: Gross = Net × (1 + VAT) × (1 + TNCN). Hệ số theo chính sách thuế, đổi được theo kỳ.
const VAT_RATE = 0.08;
const PIT_RATE = 0.10;
const GROSS_FACTOR = (1 + VAT_RATE) * (1 + PIT_RATE); // 1.188 → Net/Gross ≈ 0.8418
const RATIO_TOLERANCE = 0.002;

const KL_TIERS = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const;
const FOC_TIERS = ['TAP Brand', 'TAP', 'TAP UpAffiliate'] as const;

// 36 cột nguồn được dùng (HUB-1.9 mục 3). Mọi cột khác bị bỏ qua.
const COL = {
  recordId: 'Record ID',
  orderNo: 'Order no',
  month: 'Tháng',
  storeCode: 'Mã GH',
  storeName: 'Gian hàng',
  brand: 'Brand',
  platform: 'Sàn',
  service: 'Service',
  liveStatus: 'Live/Off',
  b2cScope: 'B2C phụ trách',
  growthPic: 'Growth_PIC',
  accountPic: 'Account PIC',
  bookingPic: 'Booking PIC',
  livestreamPic: 'Livestream phụ trách',
  planStatus: 'Chốt plan',
  // Plan video affiliate
  videoAffSource: 'Số video affiliate',
  costAffGross: 'Chi phí booking video affiliate',
  costAffNet: '(Net) Chi phí video affiliate',
  // Plan self channel (Booking)
  selfVideos: 'Booking - Số video self channel',
  costSelfGross: 'Booking - Chi phí video self channel',
  costSelfNet: '(Net) Chi phí video self channel',
  // Plan livestream
  liveAffSessions: 'Số phiên livestream affiliate',
  liveAffCost: 'Chi phí booking livestream affiliate',
  liveSelfInhouseSessions: 'Inhouse️ - Số phiên livestream self channel (3h)',
  liveSelfCtvSessions: 'CTV ngoài - Số phiên livestream self channel (2h)',
  // Plan doanh số
  gmvAffPlan: '(Plan) GMV video affiliate',
  gmvSelfPlan: '(Plan) GMV video self channel',
  // Thực đạt / tiến độ
  rFoc: 'R.FOC',
  rCast: 'R.Cast',
  approvedVideoAff: '(Duyệt) Số video affiliate',
  actualCostAff: '(Actual) Chi phí video affiliate',
  actualCostSelf: '(Actual) Chi phí video self channel',
  gmvAffReport: '(Report) GMV video affiliate',
  nmvReport: '(Report) NMV',
  rLiveAffSessions: 'R.Số phiên livestream affiliate',
} as const;

type Cell = ExcelJS.CellValue;

function raw(v: Cell): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return (v as { result?: unknown }).result ?? null;
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map(t => t.text).join('');
    if ('text' in v) return (v as { text: unknown }).text;
    return null;
  }
  return v;
}

function text(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Số trong export Lark có thể là number, "1,234", "₫1,234", "12.5%". Trả null nếu không đọc được. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[₫%\s]/g, '').replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

const n0 = (v: unknown) => num(v) ?? 0;

/** Chuẩn hoá multi-select lặp ("Chốt, Chốt, Chốt") về một giá trị. */
function singleSelect(v: unknown): string {
  const parts = [...new Set(text(v).split(',').map(s => s.trim()).filter(Boolean))];
  return parts.join(', ');
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Anomaly {
  recordId: string;
  orderNo: string;
  code: string;
  detail: string;
}

async function run() {
  const [inputPath, outArg] = process.argv.slice(2);
  if (!inputPath) {
    console.error('Thiếu đường dẫn file. Dùng: npx tsx scripts/import_plan_order_41.ts "<file.xlsx>" [outDir]');
    process.exit(1);
  }
  const outDir = path.resolve(outArg ?? '.import-output/plan_order_41');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inputPath);
  const ws = wb.worksheets[0];
  const headers = (ws.getRow(1).values as Cell[]).slice(1).map(h => text(raw(h)));

  const missing = [...Object.values(COL), ...KL_TIERS, ...FOC_TIERS].filter(h => !headers.includes(h));
  if (missing.length) {
    console.error('Không tìm thấy cột (Lark đã đổi tên?):', missing.join(' | '));
    process.exit(1);
  }
  const idx = new Map(headers.map((h, i) => [h, i + 1]));

  const records: Record<string, unknown>[] = [];
  const longRows: string[] = ['recordId,orderNo,month,storeCode,scope,metric,plan,actual'];
  const anomalies: Anomaly[] = [];
  const seenOrders = new Map<string, number>();
  let totalRows = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;
    const get = (h: string) => raw(row.getCell(idx.get(h)!).value);

    if (num(get(COL.b2cScope)) !== 1) return; // DEC-006: phạm vi B2C = cột "B2C phụ trách"

    const recordId = text(get(COL.recordId));
    const orderNo = text(get(COL.orderNo));
    const month = text(get(COL.month));
    const storeCode = text(get(COL.storeCode));
    const flag = (code: string, detail: string) => anomalies.push({ recordId, orderNo, code, detail });

    if (!/^\d{4}\/\d{2}$/.test(month) || month < '2000/01') flag('INVALID_MONTH', `Tháng = "${month}"`);
    if (!storeCode) flag('MISSING_STORE_CODE', 'Thiếu Mã GH — ghép store theo tên gian hàng');
    seenOrders.set(orderNo, (seenOrders.get(orderNo) ?? 0) + 1);

    // DEC-006: KL1–7 chỉ tính video có cast; FOC = các loại TAP. Ops Hub tự tính tổng, không tin cột tổng nguồn.
    const kl = Object.fromEntries(KL_TIERS.map(t => [t, n0(get(t))]));
    const foc = FOC_TIERS.reduce((s, t) => s + n0(get(t)), 0);
    const cast = Object.values(kl).reduce((s, v) => s + v, 0);
    const videoAff = foc + cast;
    const videoAffSource = n0(get(COL.videoAffSource));
    if (Math.abs(videoAffSource - videoAff) > 0.5) {
      flag('VIDEO_AFF_MISMATCH', `Nguồn "Số video affiliate" = ${videoAffSource}, tính lại FOC ${foc} + ΣKL ${cast} = ${videoAff}`);
    }

    // DEC-006: dùng Net, song song lưu Gross; kiểm tra Net = Gross / 1.188.
    const costPairs: [string, number, number][] = [
      ['VIDEO_AFF', n0(get(COL.costAffGross)), n0(get(COL.costAffNet))],
      ['SELF_CHANNEL', n0(get(COL.costSelfGross)), n0(get(COL.costSelfNet))],
    ];
    for (const [scope, gross, net] of costPairs) {
      if (gross > 0 && net > 0 && Math.abs(net / gross - 1 / GROSS_FACTOR) > RATIO_TOLERANCE) {
        flag('NET_GROSS_RATIO', `${scope}: Net/Gross = ${(net / gross).toFixed(4)}, kỳ vọng ${(1 / GROSS_FACTOR).toFixed(4)}`);
      } else if ((gross > 0) !== (net > 0)) {
        flag('NET_GROSS_MISSING', `${scope}: Gross ${gross}, Net ${net}`);
      }
    }

    const planStatusRaw = text(get(COL.planStatus));
    const planStatus = singleSelect(planStatusRaw);

    const plan = {
      videoAff: { foc, cast, total: videoAff, byTier: kl, costGross: costPairs[0][1], costNet: costPairs[0][2] },
      selfChannel: { videos: n0(get(COL.selfVideos)), costGross: costPairs[1][1], costNet: costPairs[1][2] },
      liveAff: { sessions: n0(get(COL.liveAffSessions)), cost: n0(get(COL.liveAffCost)) },
      liveSelf: { inhouseSessions: n0(get(COL.liveSelfInhouseSessions)), ctvSessions: n0(get(COL.liveSelfCtvSessions)) },
      gmv: { videoAff: n0(get(COL.gmvAffPlan)), selfChannel: n0(get(COL.gmvSelfPlan)) },
    };
    const actual = {
      videoAff: {
        foc: n0(get(COL.rFoc)),
        cast: n0(get(COL.rCast)),
        byTier: Object.fromEntries(KL_TIERS.map(t => [t, n0(get(`R.${t}`))])),
        approved: n0(get(COL.approvedVideoAff)),
        costNet: n0(get(COL.actualCostAff)),
      },
      selfChannel: { costNet: n0(get(COL.actualCostSelf)) },
      liveAff: { sessions: n0(get(COL.rLiveAffSessions)) },
      gmv: { videoAff: n0(get(COL.gmvAffReport)), nmv: n0(get(COL.nmvReport)) },
    };

    records.push({
      recordId,
      orderNo,
      month,
      storeCode: storeCode || null,
      storeName: text(get(COL.storeName)),
      brand: text(get(COL.brand)),
      platform: text(get(COL.platform)),
      service: text(get(COL.service)),
      liveStatus: text(get(COL.liveStatus)),
      planStatus,
      // Tên người giữ nguyên để đối chiếu; map sang staffCode ở bước sau (tên có thể trùng).
      pics: {
        growth: text(get(COL.growthPic)) || null,
        account: text(get(COL.accountPic)) || null,
        booking: text(get(COL.bookingPic)) || null,
        livestream: text(get(COL.livestreamPic)) || null,
      },
      plan,
      actual,
    });

    const line = (scope: string, metric: string, p: number | null, a: number | null) =>
      longRows.push([recordId, orderNo, month, storeCode, scope, metric, p ?? '', a ?? ''].map(csvEscape).join(','));
    line('VIDEO_AFF', 'FOC', foc, actual.videoAff.foc);
    for (const t of KL_TIERS) line('VIDEO_AFF', t, kl[t], actual.videoAff.byTier[t]);
    line('VIDEO_AFF', 'TOTAL', videoAff, actual.videoAff.foc + actual.videoAff.cast);
    line('VIDEO_AFF', 'APPROVED', null, actual.videoAff.approved);
    line('VIDEO_AFF', 'COST_NET', plan.videoAff.costNet, actual.videoAff.costNet);
    line('VIDEO_AFF', 'COST_GROSS', plan.videoAff.costGross, null);
    line('VIDEO_AFF', 'GMV', plan.gmv.videoAff, actual.gmv.videoAff);
    line('SELF_CHANNEL', 'VIDEOS', plan.selfChannel.videos, null);
    line('SELF_CHANNEL', 'COST_NET', plan.selfChannel.costNet, actual.selfChannel.costNet);
    line('SELF_CHANNEL', 'COST_GROSS', plan.selfChannel.costGross, null);
    line('SELF_CHANNEL', 'GMV', plan.gmv.selfChannel, null);
    line('LIVE_AFF', 'SESSIONS', plan.liveAff.sessions, actual.liveAff.sessions);
    line('LIVE_AFF', 'COST', plan.liveAff.cost, null);
    line('LIVE_SELF_INHOUSE', 'SESSIONS', plan.liveSelf.inhouseSessions, null);
    line('LIVE_SELF_CTV', 'SESSIONS', plan.liveSelf.ctvSessions, null);
    line('STORE', 'NMV', null, actual.gmv.nmv);
  });

  for (const [orderNo, count] of seenOrders) {
    if (count > 1) anomalies.push({ recordId: '', orderNo, code: 'DUPLICATE_ORDER_NO', detail: `${count} bản ghi` });
  }

  const byCode = anomalies.reduce<Record<string, number>>((m, a) => ((m[a.code] = (m[a.code] ?? 0) + 1), m), {});
  const byMonth = records.reduce<Record<string, number>>((m, r) => ((m[r.month as string] = (m[r.month as string] ?? 0) + 1), m), {});
  const summary = {
    source: path.basename(inputPath),
    importedAt: new Date().toISOString(),
    rules: { b2cScopeColumn: COL.b2cScope, grossFactor: GROSS_FACTOR, vat: VAT_RATE, pit: PIT_RATE },
    totalRows,
    b2cRecords: records.length,
    stores: new Set(records.map(r => r.storeName)).size,
    byMonth: Object.fromEntries(Object.entries(byMonth).sort()),
    anomalies: byCode,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'records.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(outDir, 'metrics_long.csv'), longRows.join('\n'));
  fs.writeFileSync(
    path.join(outDir, 'anomalies.csv'),
    ['recordId,orderNo,code,detail', ...anomalies.map(a => [a.recordId, a.orderNo, a.code, a.detail].map(csvEscape).join(','))].join('\n'),
  );
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Đã ghi output vào ${outDir}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
