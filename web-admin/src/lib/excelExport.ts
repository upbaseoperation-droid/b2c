import ExcelJS from 'exceljs';
import { GrowthDemandItem, GrowthDemandBreakdownTier } from './types';
import { MOCK_WEEKLY_PLANS_411 } from './mockData';

export async function exportPlanOrderToExcel(demand: GrowthDemandItem, breakdown: GrowthDemandBreakdownTier[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Upbase Growth & Booking';
  workbook.lastModifiedBy = 'Upbase Web Admin';
  workbook.created = new Date();

  const primaryNavy = '1E293B';
  const headerDark = '334155';
  const headerBlue = '1D4ED8';
  const headerTeal = '0F766E';
  const headerAmber = 'B45309';
  const headerSlate = '475569';
  const borderGray = 'CBD5E1';

  const defaultBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } }
  };

  const headerFont = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
  const dataFont = { name: 'Segoe UI', size: 10 };
  const titleFont = { name: 'Segoe UI', size: 15, bold: true, color: { argb: primaryNavy } };
  const subtitleFont = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };

  // --------------------------------------------------------------------------
  // SHEET 1: ĐỐI SOÁT 4 CHẶNG & NMV GAP
  // --------------------------------------------------------------------------
  const ws1 = workbook.addWorksheet('1. Đối Soát 4 Chặng & NMV', { views: [{ showGridLines: true }] });
  ws1.mergeCells('B2:Q2');
  ws1.getCell('B2').value = `BẢNG ĐỐI SOÁT KẾ HOẠCH GIAN HÀNG 4 CHẶNG - ${demand.brandName.toUpperCase()}`;
  ws1.getCell('B2').font = titleFont;
  ws1.getRow(2).height = 28;

  ws1.mergeCells('B3:Q3');
  ws1.getCell('B3').value = `Mã: ${demand.code} | Tháng: ${demand.month} | Tỷ lệ hủy định mức: ${((demand.cancellationRate || 0.08) * 100).toFixed(1)}% | Chuẩn File 4.1 Plan order tổng`;
  ws1.getCell('B3').font = subtitleFont;

  // Header groups
  ws1.mergeCells('B5:E5');
  ws1.getCell('B5').value = 'THÔNG TIN CHIẾN DỊCH & GIAN HÀNG';
  ws1.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerDark } };
  ws1.getCell('B5').font = headerFont;
  ws1.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('F5:H5');
  ws1.getCell('F5').value = '1. PLAN ĐẦU THÁNG';
  ws1.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerTeal } };
  ws1.getCell('F5').font = headerFont;
  ws1.getCell('F5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('I5:K5');
  ws1.getCell('I5').value = '2. SỐ DUYỆT (CHỐT)';
  ws1.getCell('I5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  ws1.getCell('I5').font = headerFont;
  ws1.getCell('I5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('L5:N5');
  ws1.getCell('L5').value = '3. SAU ĐIỀU CHỈNH';
  ws1.getCell('L5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerAmber } };
  ws1.getCell('L5').font = headerFont;
  ws1.getCell('L5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('O5:R5');
  ws1.getCell('O5').value = '4. THỰC TẾ MTD & GAP ĐỐI SOÁT';
  ws1.getCell('O5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
  ws1.getCell('O5').font = headerFont;
  ws1.getCell('O5').alignment = { horizontal: 'center', vertical: 'middle' };

  const fourStageCols = [
    'STT', 'Mã Demand', 'Gian Hàng', 'Kênh / Phân Hệ', 'Tỷ Lệ Hủy',
    'Plan GMV', 'Plan Ngân Sách', 'Plan CIR (%)',
    'Duyệt GMV', 'Duyệt Ngân Sách', 'Duyệt NMV Thuần',
    'Điều Chỉnh GMV', 'Điều Chỉnh Ngân Sách', 'Điều Chỉnh NMV',
    'Thực Tế GMV MTD', 'Thực Tế NMV Thuần', 'NMV Gap (VNĐ)', 'Đánh Giá'
  ];

  const rFS6 = ws1.getRow(6);
  rFS6.height = 26;
  fourStageCols.forEach((col, idx) => {
    const c = rFS6.getCell(idx + 1);
    c.value = col;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerSlate } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = defaultBorder;
  });

  const ft = demand.fourStageTracking;
  const cancelRate = demand.cancellationRate || 0.08;
  const fourRows = [
    {
      channel: 'Video KOC Affiliate',
      cancel: cancelRate,
      planGmv: demand.targetGmv,
      planBudget: demand.totalAssignedBudget,
      approvedGmv: ft?.approvedNmv ? ft.approvedNmv / Math.max(0.1, 1 - cancelRate) : demand.targetGmv * 0.95,
      approvedBudget: ft?.approvedBudget || demand.totalAssignedBudget * 0.95,
      adjustedGmv: ft?.adjustedNmv ? ft.adjustedNmv / Math.max(0.1, 1 - cancelRate) : demand.targetGmv * 0.95,
      adjustedBudget: ft?.adjustedBudget || demand.totalAssignedBudget * 0.95,
      actualGmv: ft?.reportedNmvMtd ? ft.reportedNmvMtd / Math.max(0.1, 1 - cancelRate) : demand.targetGmv * 0.65,
    }
  ];

  fourRows.forEach((r, idx) => {
    const rowIdx = 7 + idx;
    const row = ws1.getRow(rowIdx);
    row.height = 22;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = demand.code;
    row.getCell(3).value = demand.brandName;
    row.getCell(4).value = r.channel;
    row.getCell(5).value = r.cancel;
    row.getCell(5).numFmt = '0.0%';

    row.getCell(6).value = r.planGmv;
    row.getCell(6).numFmt = '#,##0';
    row.getCell(7).value = r.planBudget;
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).value = { formula: `G${rowIdx}/F${rowIdx}` };
    row.getCell(8).numFmt = '0.0%';

    row.getCell(9).value = r.approvedGmv;
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).value = r.approvedBudget;
    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).value = { formula: `I${rowIdx}*(1-E${rowIdx})` };
    row.getCell(11).numFmt = '#,##0';

    row.getCell(12).value = r.adjustedGmv;
    row.getCell(12).numFmt = '#,##0';
    row.getCell(13).value = r.adjustedBudget;
    row.getCell(13).numFmt = '#,##0';
    row.getCell(14).value = { formula: `L${rowIdx}*(1-E${rowIdx})` };
    row.getCell(14).numFmt = '#,##0';

    row.getCell(15).value = r.actualGmv;
    row.getCell(15).numFmt = '#,##0';
    row.getCell(16).value = { formula: `O${rowIdx}*(1-E${rowIdx})` };
    row.getCell(16).numFmt = '#,##0';
    row.getCell(17).value = { formula: `P${rowIdx}-N${rowIdx}` };
    row.getCell(17).numFmt = '+#,##0;-#,##0;0';

    row.getCell(18).value = {
      formula: `IF(P${rowIdx}>=N${rowIdx}*0.75,"✅ Đúng Tiến Độ",IF(P${rowIdx}>=N${rowIdx}*0.55,"⚠️ Chậm Tiến Độ","🔥 Báo Động Hụt NMV"))`
    };

    for (let c = 1; c <= 18; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 2, 5, 8, 18].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  ws1.columns = [
    { width: 6 }, { width: 16 }, { width: 24 }, { width: 22 }, { width: 12 },
    { width: 16 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 20 }
  ];

  // --------------------------------------------------------------------------
  // SHEET 2: CHI TIẾT PHÂN BỔ KOC AFFILIATE
  // --------------------------------------------------------------------------
  const ws2 = workbook.addWorksheet('2. Kế Hoạch KOC Affiliate', { views: [{ showGridLines: true }] });
  ws2.mergeCells('B2:K2');
  ws2.getCell('B2').value = `CHI TIẾT PHÂN BỔ KOC AFFILIATE - ${demand.brandName}`;
  ws2.getCell('B2').font = titleFont;
  ws2.getRow(2).height = 26;

  const kocHeaders = [
    'STT', 'Bậc KOC / KOL', 'Cấp Bậc Nhân Sự PIC', 'Số Lượng Target',
    'Đơn Giá TB / KOC (VNĐ)', 'Ngân Sách Phân Bổ (VNĐ)', 'Tỷ Trọng Ngân Sách (%)',
    'Target GMV / KOC (VNĐ)', 'Tổng GMV Dự Kiến (VNĐ)', 'ROI Benchmark', 'Ghi Chú Chiến Lược'
  ];

  const rK2 = ws2.getRow(5);
  rK2.height = 26;
  kocHeaders.forEach((h, idx) => {
    const c = rK2.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerTeal } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = defaultBorder;
  });

  breakdown.forEach((t, idx) => {
    const rowIdx = 6 + idx;
    const r = ws2.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = t.tierLabel;
    r.getCell(3).value = t.salaryGradeLabel;
    r.getCell(4).value = t.targetCount;
    r.getCell(5).value = t.estimatedAvgCost;
    r.getCell(5).numFmt = '#,##0';
    r.getCell(6).value = { formula: `D${rowIdx}*E${rowIdx}` };
    r.getCell(6).numFmt = '#,##0';
    r.getCell(7).value = { formula: `F${rowIdx}/$F$10` };
    r.getCell(7).numFmt = '0.0%';
    r.getCell(8).value = t.estimatedGmvPerKoc;
    r.getCell(8).numFmt = '#,##0';
    r.getCell(9).value = { formula: `D${rowIdx}*H${rowIdx}` };
    r.getCell(9).numFmt = '#,##0';
    r.getCell(10).value = `${t.historicalRoiBenchmark}x`;
    r.getCell(11).value = t.notes || '';

    for (let c = 1; c <= 11; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 4, 7, 10].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([5, 6, 8, 9].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  // Total Row KOC
  const totKoc = ws2.getRow(10);
  totKoc.height = 24;
  totKoc.getCell(2).value = 'TỔNG CỘNG AFFILIATE';
  totKoc.getCell(4).value = { formula: 'SUM(D6:D9)' };
  totKoc.getCell(6).value = { formula: 'SUM(F6:F9)' };
  totKoc.getCell(6).numFmt = '#,##0';
  totKoc.getCell(7).value = { formula: 'SUM(G6:G9)' };
  totKoc.getCell(7).numFmt = '100.0%';
  totKoc.getCell(9).value = { formula: 'SUM(I6:I9)' };
  totKoc.getCell(9).numFmt = '#,##0';

  for (let c = 1; c <= 11; c++) {
    const cell = totKoc.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = defaultBorder;
    cell.font = { name: 'Segoe UI', size: 10, bold: true };
  }

  ws2.columns = [
    { width: 6 }, { width: 22 }, { width: 20 }, { width: 14 },
    { width: 18 }, { width: 20 }, { width: 14 }, { width: 18 },
    { width: 22 }, { width: 14 }, { width: 32 }
  ];

  // --------------------------------------------------------------------------
  // SHEET 3: VIDEO SELF-CHANNEL (INHOUSE & REUP)
  // --------------------------------------------------------------------------
  if (demand.selfChannelPlan) {
    const ws3 = workbook.addWorksheet('3. Video Self-Channel', { views: [{ showGridLines: true }] });
    ws3.mergeCells('B2:H2');
    ws3.getCell('B2').value = `KẾ HOẠCH VIDEO SELF-CHANNEL - ${demand.brandName}`;
    ws3.getCell('B2').font = titleFont;
    ws3.getRow(2).height = 26;

    const selfHeaders = [
      'Chỉ Tiêu Sản Xuất', 'Giá Trị Kế Hoạch', 'Ma Trận Reup Đa Kênh', 'Số Lượng Đăng'
    ];

    const rS4 = ws3.getRow(5);
    rS4.height = 26;
    selfHeaders.forEach((h, idx) => {
      const c = rS4.getCell(idx + 1);
      c.value = h;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
      c.font = headerFont;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = defaultBorder;
    });

    const sp = demand.selfChannelPlan;
    const selfRows = [
      { k: 'Số lượng Video Kế Hoạch', v: `${sp.plannedVideos} Videos`, rk: 'Reup TikTok Shop', rv: `${sp.reupTargets.tiktok} bài` },
      { k: 'Số lượng Video Đã Duyệt', v: `${sp.approvedVideos} Videos`, rk: 'Reup Shopee Video', rv: `${sp.reupTargets.shopee} bài` },
      { k: 'Số lượng Video Báo Cáo', v: `${sp.reportedVideos} Videos`, rk: 'Reup Facebook Reels', rv: `${sp.reupTargets.facebook} bài` },
      { k: 'Ngân Sách Sản Xuất Inhouse', v: `${sp.productionBudget.toLocaleString()} đ`, rk: 'Reup Threads Video', rv: `${sp.reupTargets.threads} bài` },
    ];

    selfRows.forEach((r, idx) => {
      const rowIdx = 6 + idx;
      const row = ws3.getRow(rowIdx);
      row.height = 22;
      row.getCell(1).value = r.k;
      row.getCell(2).value = r.v;
      row.getCell(3).value = r.rk;
      row.getCell(4).value = r.rv;
      for (let c = 1; c <= 4; c++) {
        row.getCell(c).font = dataFont;
        row.getCell(c).border = defaultBorder;
        row.getCell(c).alignment = { vertical: 'middle' };
      }
    });

    ws3.columns = [{ width: 34 }, { width: 24 }, { width: 24 }, { width: 16 }];
  }

  // --------------------------------------------------------------------------
  // SHEET 4: LIVESTREAM GIAN HÀNG
  // --------------------------------------------------------------------------
  if (demand.livestreamPlan) {
    const ws4 = workbook.addWorksheet('4. Livestream Gian Hàng', { views: [{ showGridLines: true }] });
    ws4.mergeCells('B2:H2');
    ws4.getCell('B2').value = `KẾ HOẠCH LIVESTREAM GIAN HÀNG - ${demand.brandName}`;
    ws4.getCell('B2').font = titleFont;
    ws4.getRow(2).height = 26;

    const liveHeaders = [
      'Phân Hệ Livestream', 'Số Phiên Dự Kiến', 'Thời Lượng / Phiên', 'Tổng Giờ Live',
      'Chi Phí Host / Kỹ Thuật', 'Target GMV Kế Hoạch', 'CIR Live'
    ];

    const rL4 = ws4.getRow(5);
    rL4.height = 26;
    liveHeaders.forEach((h, idx) => {
      const c = rL4.getCell(idx + 1);
      c.value = h;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerAmber } };
      c.font = headerFont;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = defaultBorder;
    });

    const lp = demand.livestreamPlan;
    const liveRows = [
      { name: 'Inhouse Studio HCM (Ca 3h)', shifts: lp.inhouseSessionsHcm, hoursPer: 3, totalH: lp.inhouseSessionsHcm * 3, bud: lp.inhouseSessionsHcm * 900000, gmv: lp.plannedGmv * 0.55 },
      { name: 'Inhouse Studio HN (Ca 3h)', shifts: lp.inhouseSessionsHn, hoursPer: 3, totalH: lp.inhouseSessionsHn * 3, bud: lp.inhouseSessionsHn * 750000, gmv: lp.plannedGmv * 0.25 },
      { name: 'CTV Host Ngoài (Ca 2h)', shifts: lp.ctvSessions, hoursPer: 2, totalH: lp.ctvSessions * 2, bud: lp.ctvSessions * 950000, gmv: lp.plannedGmv * 0.20 },
    ];

    liveRows.forEach((r, idx) => {
      const rowIdx = 6 + idx;
      const row = ws4.getRow(rowIdx);
      row.height = 22;
      row.getCell(1).value = r.name;
      row.getCell(2).value = r.shifts;
      row.getCell(3).value = `${r.hoursPer} tiếng`;
      row.getCell(4).value = r.totalH;
      row.getCell(5).value = r.bud;
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).value = r.gmv;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).value = { formula: `E${rowIdx}/F${rowIdx}` };
      row.getCell(7).numFmt = '0.0%';

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).font = dataFont;
        row.getCell(c).border = defaultBorder;
        if ([2, 3, 4, 7].includes(c)) {
          row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([5, 6].includes(c)) {
          row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          row.getCell(c).alignment = { vertical: 'middle' };
        }
      }
    });

    ws4.columns = [
      { width: 28 }, { width: 18 }, { width: 18 }, { width: 14 },
      { width: 22 }, { width: 22 }, { width: 14 }
    ];
  }

  // --------------------------------------------------------------------------
  // SHEET 5: BIỂU MẪU INPUT PLAN 4.1.1 THEO TUẦN
  // --------------------------------------------------------------------------
  const ws5 = workbook.addWorksheet('5. Template Input Plan 4.1.1', { views: [{ showGridLines: true }] });
  ws5.mergeCells('B2:O2');
  ws5.getCell('B2').value = 'BIỂU MẪU NHẬP LIỆU KẾ HOẠCH TUẦN CHI TIẾT (CHUẨN SHEET 4.1.1)';
  ws5.getCell('B2').font = titleFont;
  ws5.getRow(2).height = 26;

  const h411 = [
    'Mã Kế Hoạch', 'Gian Hàng', 'Tuần Kế Hoạch', 'Tháng / Năm', 'Ngân Sách Tuần',
    'Số KL1 (FOC)', 'Số KL2 (Aff)', 'Số KL3 (Micro)', 'Số KL4 (Macro)', 'Số KL5 (Macro+)', 'Số KL6 (Celeb)', 'Số KL7 (Ambassador)',
    'Tổng Số KOC', 'Mục Tiêu GMV Tuần', 'Ghi Chú Chiến Lược'
  ];

  const r5_5 = ws5.getRow(5);
  r5_5.height = 26;
  h411.forEach((h, idx) => {
    const c = r5_5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerDark } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = defaultBorder;
  });

  MOCK_WEEKLY_PLANS_411.forEach((w, idx) => {
    const rowIdx = 6 + idx;
    const r = ws5.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = w.id;
    r.getCell(2).value = w.storeName;
    r.getCell(3).value = w.week;
    r.getCell(4).value = '10/2026';
    r.getCell(5).value = w.totalAffiliateBudget;
    r.getCell(5).numFmt = '#,##0';

    r.getCell(6).value = w.kocTiersCount.kl1;
    r.getCell(7).value = w.kocTiersCount.kl2;
    r.getCell(8).value = w.kocTiersCount.kl3;
    r.getCell(9).value = w.kocTiersCount.kl4;
    r.getCell(10).value = w.kocTiersCount.kl5;
    r.getCell(11).value = w.kocTiersCount.kl6;
    r.getCell(12).value = w.kocTiersCount.kl7;

    r.getCell(13).value = { formula: `SUM(F${rowIdx}:L${rowIdx})` };
    r.getCell(14).value = w.targetGmv || (w.totalAffiliateBudget * 4.5);
    r.getCell(14).numFmt = '#,##0';
    r.getCell(15).value = w.notes || '';

    for (let c = 1; c <= 15; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([5, 14].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  ws5.columns = [
    { width: 18 }, { width: 24 }, { width: 22 }, { width: 14 }, { width: 18 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 36 }
  ];

  // Trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bang_Ke_Hoach_Thang_4_Chung_${demand.code}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadWeeklyTemplate411() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Upbase Growth Operations';
  const ws = workbook.addWorksheet('Input Plan 4.1.1', { views: [{ showGridLines: true }] });

  ws.mergeCells('A1:O1');
  ws.getCell('A1').value = 'BIỂU MẪU NHẬP LIỆU KẾ HOẠCH TUẦN (FILE 4.1.1 INPUT PLAN)';
  ws.getCell('A1').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: '1E293B' } };

  const headers = [
    'Mã Plan', 'Gian Hàng', 'Tuần', 'Tháng', 'Ngân Sách (VNĐ)',
    'KL1 (FOC)', 'KL2 (Aff)', 'KL3 (Micro)', 'KL4 (Macro)', 'KL5 (Macro+)', 'KL6 (Celeb)', 'KL7 (Ambassador)',
    'Tổng KOC', 'Target GMV (VNĐ)', 'Ghi Chú Kế Hoạch'
  ];

  const r2 = ws.getRow(3);
  r2.height = 24;
  headers.forEach((h, idx) => {
    const c = r2.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  MOCK_WEEKLY_PLANS_411.forEach((w, i) => {
    const rIdx = 4 + i;
    const r = ws.getRow(rIdx);
    r.getCell(1).value = w.id;
    r.getCell(2).value = w.storeName;
    r.getCell(3).value = w.week;
    r.getCell(4).value = '10/2026';
    r.getCell(5).value = w.totalAffiliateBudget;
    r.getCell(6).value = w.kocTiersCount.kl1;
    r.getCell(7).value = w.kocTiersCount.kl2;
    r.getCell(8).value = w.kocTiersCount.kl3;
    r.getCell(9).value = w.kocTiersCount.kl4;
    r.getCell(10).value = w.kocTiersCount.kl5;
    r.getCell(11).value = w.kocTiersCount.kl6;
    r.getCell(12).value = w.kocTiersCount.kl7;
    r.getCell(13).value = { formula: `SUM(F${rIdx}:L${rIdx})` };
    r.getCell(14).value = w.targetGmv || (w.totalAffiliateBudget * 4.5);
    r.getCell(15).value = w.notes || '';
  });

  ws.columns = [
    { width: 16 }, { width: 22 }, { width: 18 }, { width: 12 }, { width: 16 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 32 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Template_Input_Plan_4.1.1.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
