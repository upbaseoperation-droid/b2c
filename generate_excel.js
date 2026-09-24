const ExcelJS = require('./web-admin/node_modules/exceljs');
const path = require('path');

async function createEvaluationWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Upbase B2C Operations';
  workbook.lastModifiedBy = 'Upbase Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Colors & Styles
  const primaryNavy = '1E293B'; // Dark Slate
  const headerBlue = '2563EB';  // Blue
  const accentTeal = '0D9488';  // Teal
  const accentAmber = 'D97706'; // Amber
  const lightGray = 'F8FAFC';
  const borderGray = 'CBD5E1';

  const defaultBorder = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } }
  };

  const headerFont = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  const dataFont = { name: 'Segoe UI', size: 10 };
  const titleFont = { name: 'Segoe UI', size: 16, bold: true, color: { argb: primaryNavy } };
  const subtitleFont = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '64748B' } };

  // ==========================================
  // SHEET 1: DASHBOARD TỔNG HỢP (SUMMARY)
  // ==========================================
  const wsSummary = workbook.addWorksheet('1. Tổng Hợp & Xếp Loại', {
    views: [{ showGridLines: true }]
  });

  // Title
  wsSummary.mergeCells('B2:O2');
  wsSummary.getCell('B2').value = 'BẢNG TỔNG HỢP ĐÁNH GIÁ WORKLOAD & HIỆU SUẤT NHÂN SỰ MKT B2C';
  wsSummary.getCell('B2').font = titleFont;
  wsSummary.getCell('B2').alignment = { vertical: 'middle' };
  wsSummary.getRow(2).height = 28;

  wsSummary.mergeCells('B3:O3');
  wsSummary.getCell('B3').value = 'Kỳ đánh giá: Tháng 10/2026 | Cơ chế đánh giá kép: Năng lực tải (Workload) & Kết quả đầu ra (SLA, Output, GMV)';
  wsSummary.getCell('B3').font = subtitleFont;

  // Header Row 1 (Group header)
  wsSummary.mergeCells('B5:E5');
  wsSummary.getCell('B5').value = 'THÔNG TIN NHÂN SỰ';
  wsSummary.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
  wsSummary.getCell('B5').font = headerFont;
  wsSummary.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('F5:I5');
  wsSummary.getCell('F5').value = 'TẢI LƯỢNG CÔNG VIỆC (WORKLOAD & CAPACITY)';
  wsSummary.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentTeal } };
  wsSummary.getCell('F5').font = headerFont;
  wsSummary.getCell('F5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('J5:M5');
  wsSummary.getCell('J5').value = 'KẾT QUẢ ĐẦU RA & HIỆU SUẤT (PERFORMANCE - 100 ĐIỂM)';
  wsSummary.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  wsSummary.getCell('J5').font = headerFont;
  wsSummary.getCell('J5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('N5:P5');
  wsSummary.getCell('N5').value = 'XẾP LOẠI & ĐÁNH GIÁ KÉP';
  wsSummary.getCell('N5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentAmber } };
  wsSummary.getCell('N5').font = headerFont;
  wsSummary.getCell('N5').alignment = { horizontal: 'center', vertical: 'middle' };

  const summaryHeaders = [
    'STT', 'Mã NV', 'Họ và Tên', 'Vị trí / Vai trò', 'Team',
    'Điểm Tải Thực Tế (Pts)', 'Định Mức Chuẩn (Pts)', 'Tỷ Lệ Tải (%)', 'Trạng Thái Workload',
    'Điểm SLA (30đ)', 'Điểm Sản Lượng (40đ)', 'Điểm GMV/Doanh Số (30đ)', 'Tổng Điểm KPI (100đ)',
    'Xếp Loại KPI', 'Đánh Giá Kép (Matrix)', 'Đề Xuất Quản Lý'
  ];

  const row6 = wsSummary.getRow(6);
  row6.height = 26;
  summaryHeaders.forEach((text, idx) => {
    const colIndex = idx + 1; // Col A is 1
    const cell = row6.getCell(colIndex);
    cell.value = text;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = defaultBorder;
  });

  // Sample Staff Data
  const staffData = [
    { stt: 1, id: 'UB-B2C-01', name: 'Nguyễn Thu Trang', role: 'KOC Booking Lead', team: 'Booking Team', actualPts: 185, cap: 160, sla: 28.5, prod: 38.0, gmv: 27.0 },
    { stt: 2, id: 'UB-B2C-02', name: 'Trần Minh Đức', role: 'Senior Booking Executive', team: 'Booking Team', actualPts: 195, cap: 160, sla: 29.0, prod: 42.0, gmv: 29.5 },
    { stt: 3, id: 'UB-B2C-03', name: 'Lê Hoàng Yến', role: 'Booking Specialist', team: 'Booking Team', actualPts: 152, cap: 160, sla: 27.0, prod: 35.0, gmv: 24.0 },
    { stt: 4, id: 'UB-B2C-04', name: 'Phạm Quỳnh Anh', role: 'Booking Junior', team: 'Booking Team', actualPts: 110, cap: 160, sla: 25.0, prod: 28.0, gmv: 20.0 },
    { stt: 5, id: 'UB-B2C-05', name: 'Vũ Đức Thắng', role: 'Content Lead / Video', team: 'Content Team', actualPts: 172, cap: 160, sla: 30.0, prod: 39.0, gmv: 26.5 },
    { stt: 6, id: 'UB-B2C-06', name: 'Đặng Mai Phương', role: 'Short-form Video Creator', team: 'Content Team', actualPts: 158, cap: 160, sla: 26.0, prod: 36.0, gmv: 25.0 },
    { stt: 7, id: 'UB-B2C-07', name: 'Hoàng Kim Ngân', role: 'Scriptwriter & Reviewer', team: 'Content Team', actualPts: 164, cap: 160, sla: 28.0, prod: 37.0, gmv: 24.0 },
    { stt: 8, id: 'UB-B2C-08', name: 'Bùi Tuấn Hưng', role: 'Brand & Campaign Lead', team: 'Brand Team', actualPts: 180, cap: 160, sla: 29.5, prod: 38.5, gmv: 28.0 },
    { stt: 9, id: 'UB-B2C-09', name: 'Ngô Bảo Trâm', role: 'Brand Executive', team: 'Brand Team', actualPts: 148, cap: 160, sla: 27.0, prod: 34.0, gmv: 23.0 },
    { stt: 10, id: 'UB-B2C-10', name: 'Đỗ Hữu Nam', role: 'Performance Media Buyer', team: 'Brand Team', actualPts: 165, cap: 160, sla: 28.0, prod: 36.0, gmv: 28.5 },
  ];

  staffData.forEach((staff, i) => {
    const rowIdx = 7 + i;
    const r = wsSummary.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = staff.stt;
    r.getCell(2).value = staff.id;
    r.getCell(3).value = staff.name;
    r.getCell(4).value = staff.role;
    r.getCell(5).value = staff.team;

    // Load Points
    r.getCell(6).value = staff.actualPts;
    r.getCell(7).value = staff.cap;
    // Load Ratio %
    r.getCell(8).value = { formula: `F${rowIdx}/G${rowIdx}` };
    r.getCell(8).numFmt = '0.0%';

    // Workload Status Formula
    r.getCell(9).value = {
      formula: `IF(H${rowIdx}>=1.15,"🔥 Quá tải (Overload)",IF(H${rowIdx}<=0.75,"⚠️ Thiếu việc (Underload)","✅ Tối ưu (Optimal)"))`
    };

    // Performance Breakdown
    r.getCell(10).value = staff.sla;
    r.getCell(11).value = staff.prod;
    r.getCell(12).value = staff.gmv;

    // Total KPI
    r.getCell(13).value = { formula: `J${rowIdx}+K${rowIdx}+L${rowIdx}` };
    r.getCell(13).numFmt = '0.0';

    // Xếp loại KPI
    r.getCell(14).value = {
      formula: `IF(M${rowIdx}>=90,"Hạng A (Xuất sắc)",IF(M${rowIdx}>=75,"Hạng B (Đạt yêu cầu)",IF(M${rowIdx}>=60,"Hạng C (Cần cải thiện)","Hạng D (Không đạt)")))`
    };

    // Đánh giá kép (Matrix)
    r.getCell(15).value = {
      formula: `IF(AND(H${rowIdx}>=1.15,M${rowIdx}>=85),"🌟 Ngôi sao gánh team (Cần san sẻ tải)",IF(AND(H${rowIdx}>=1.15,M${rowIdx}<75),"🚨 Nghẽn cổ chai (Cần rà soát quy trình)",IF(AND(H${rowIdx}<=0.75,M${rowIdx}<75),"⚠️ Năng suất thấp (Xem xét điều chuyển)","✨ Ổn định vững chắc")))`
    };

    // Đề xuất quản lý
    r.getCell(16).value = staff.actualPts > 180 ? 'Hỗ trợ thêm cộng tác viên/junior' : (staff.actualPts < 130 ? 'Bổ sung thêm chiến dịch mới' : 'Duy trì năng suất hiện tại');

    // Styling
    for (let c = 1; c <= 16; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 2, 8, 9, 14].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([6, 7, 10, 11, 12, 13].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  // Summary Row
  const totalRowIdx = 7 + staffData.length;
  const totRow = wsSummary.getRow(totalRowIdx);
  totRow.height = 24;
  totRow.getCell(3).value = 'TRUNG BÌNH PHÒNG BAN';
  totRow.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true };
  totRow.getCell(6).value = { formula: `AVERAGE(F7:F${totalRowIdx - 1})` };
  totRow.getCell(6).numFmt = '0.0';
  totRow.getCell(7).value = { formula: `AVERAGE(G7:G${totalRowIdx - 1})` };
  totRow.getCell(7).numFmt = '0.0';
  totRow.getCell(8).value = { formula: `AVERAGE(H7:H${totalRowIdx - 1})` };
  totRow.getCell(8).numFmt = '0.0%';
  totRow.getCell(10).value = { formula: `AVERAGE(J7:J${totalRowIdx - 1})` };
  totRow.getCell(10).numFmt = '0.0';
  totRow.getCell(11).value = { formula: `AVERAGE(K7:K${totalRowIdx - 1})` };
  totRow.getCell(11).numFmt = '0.0';
  totRow.getCell(12).value = { formula: `AVERAGE(L7:L${totalRowIdx - 1})` };
  totRow.getCell(12).numFmt = '0.0';
  totRow.getCell(13).value = { formula: `AVERAGE(M7:M${totalRowIdx - 1})` };
  totRow.getCell(13).numFmt = '0.0';

  for (let c = 1; c <= 16; c++) {
    const cell = totRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = defaultBorder;
    cell.font = { name: 'Segoe UI', size: 10, bold: true };
  }

  // Column Widths
  wsSummary.columns = [
    { width: 6 },  // STT
    { width: 14 }, // Mã NV
    { width: 22 }, // Họ Tên
    { width: 24 }, // Vị trí
    { width: 16 }, // Team
    { width: 16 }, // Điểm Tải
    { width: 16 }, // Định Mức
    { width: 14 }, // Tỷ Lệ Tải
    { width: 24 }, // Trạng Thái Workload
    { width: 14 }, // Điểm SLA
    { width: 16 }, // Điểm Sản Lượng
    { width: 18 }, // Điểm Doanh Số
    { width: 16 }, // Tổng Điểm KPI
    { width: 20 }, // Xếp Loại KPI
    { width: 32 }, // Đánh Giá Kép
    { width: 30 }  // Đề Xuất Quản Lý
  ];

  // ==========================================
  // SHEET 2: THEO DÕI WORKLOAD CHI TIẾT
  // ==========================================
  const wsWorkload = workbook.addWorksheet('2. Nhật Ký Workload', {
    views: [{ showGridLines: true }]
  });

  wsWorkload.mergeCells('A2:M2');
  wsWorkload.getCell('A2').value = 'NHẬT KÝ ĐẦU VIỆC & PHÂN BỔ TẢI LƯỢNG CHI TIẾT';
  wsWorkload.getCell('A2').font = titleFont;
  wsWorkload.getRow(2).height = 26;

  wsWorkload.mergeCells('A3:M3');
  wsWorkload.getCell('A3').value = 'Ghi nhận chi tiết từng task phát sinh, tự động tính tổng điểm tải (Story Points) dựa trên catalog định mức';
  wsWorkload.getCell('A3').font = subtitleFont;

  const workloadHeaders = [
    'Mã Task', 'Ngày Giao', 'Nhân Sự Phụ Trách', 'Vai Trò', 'Chiến Dịch / Brand',
    'Tên Đầu Việc / Hạng Mục', 'Độ Phức Tạp (1-3)', 'Điểm Chuẩn / Đơn Vị', 'Số Lượng (Đơn Vị)',
    'Tổng Điểm Tải (Pts)', 'Hạn Chót (SLA)', 'Ngày Hoàn Thành', 'Trạng Thái', 'Tiến Độ'
  ];

  const rW5 = wsWorkload.getRow(5);
  rW5.height = 26;
  workloadHeaders.forEach((h, idx) => {
    const c = rW5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const sampleTasks = [
    { code: 'TSK-001', date: '2026-10-01', staff: 'Nguyễn Thu Trang', role: 'KOC Booking Lead', camp: 'Mega Sale 10.10', name: 'Đàm phán Deal KOC Tier 1 (Mega/Celeb)', comp: 3, stdPt: 3.0, qty: 5, sla: '2026-10-03', done: '2026-10-03', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-002', date: '2026-10-01', staff: 'Trần Minh Đức', role: 'Senior Booking Executive', camp: 'Mega Sale 10.10', name: 'Chốt Deal KOC Affiliate thường (TikTok/Shopee)', comp: 1, stdPt: 1.0, qty: 35, sla: '2026-10-05', done: '2026-10-05', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-003', date: '2026-10-02', staff: 'Lê Hoàng Yến', role: 'Booking Specialist', camp: 'Kháng Nắng Đa Tầng', name: 'Gửi hàng mẫu KOC & nghiệm thu mã Spark Ads', comp: 1, stdPt: 0.5, qty: 40, sla: '2026-10-06', done: '2026-10-06', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-004', date: '2026-10-02', staff: 'Vũ Đức Thắng', role: 'Content Lead / Video', camp: 'Mega Sale 10.10', name: 'Sản xuất Video Short Hero (Concept Viral)', comp: 3, stdPt: 3.5, qty: 6, sla: '2026-10-05', done: '2026-10-05', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-005', date: '2026-10-03', staff: 'Đặng Mai Phương', role: 'Short-form Video Creator', camp: 'Kháng Nắng Đa Tầng', name: 'Quay dựng Video ngắn TikTok review trải nghiệm', comp: 2, stdPt: 2.5, qty: 15, sla: '2026-10-08', done: '2026-10-07', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-006', date: '2026-10-03', staff: 'Hoàng Kim Ngân', role: 'Scriptwriter & Reviewer', camp: 'Mega Sale 10.10', name: 'Viết kịch bản chi tiết 4 phần (Hook, Pain, USP, CTA)', comp: 2, stdPt: 1.5, qty: 25, sla: '2026-10-07', done: '2026-10-07', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-007', date: '2026-10-01', staff: 'Bùi Tuấn Hưng', role: 'Brand & Campaign Lead', camp: 'Mega Sale 10.10', name: 'Xây dựng Campaign Master Brief & phân bổ ngân sách', comp: 3, stdPt: 5.0, qty: 2, sla: '2026-10-02', done: '2026-10-02', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-008', date: '2026-10-04', staff: 'Đỗ Hữu Nam', role: 'Performance Media Buyer', camp: 'Mega Sale 10.10', name: 'Setup & tối ưu chiến dịch TikTok Shop Ads / Spark Ads', comp: 2, stdPt: 2.0, qty: 20, sla: '2026-10-09', done: '2026-10-09', status: 'Hoàn thành', progress: '100%' },
    { code: 'TSK-009', date: '2026-10-05', staff: 'Phạm Quỳnh Anh', role: 'Booking Junior', camp: 'Thu Đông 2026', name: 'Lọc danh bạ & tiếp cận 50 KOC mới ngành Mỹ Phẩm', comp: 1, stdPt: 1.0, qty: 25, sla: '2026-10-10', done: '', status: 'Đang thực hiện', progress: '60%' },
    { code: 'TSK-010', date: '2026-10-06', staff: 'Ngô Bảo Trâm', role: 'Brand Executive', camp: 'Thu Đông 2026', name: 'Lập báo cáo P&L & phân tích GMV affiliate tuần 1', comp: 2, stdPt: 2.0, qty: 3, sla: '2026-10-10', done: '', status: 'Đang thực hiện', progress: '75%' }
  ];

  sampleTasks.forEach((t, i) => {
    const rowIdx = 6 + i;
    const r = wsWorkload.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = t.code;
    r.getCell(2).value = t.date;
    r.getCell(3).value = t.staff;
    r.getCell(4).value = t.role;
    r.getCell(5).value = t.camp;
    r.getCell(6).value = t.name;
    r.getCell(7).value = t.comp;
    r.getCell(8).value = t.stdPt;
    r.getCell(9).value = t.qty;
    // Total Points = Std * Qty
    r.getCell(10).value = { formula: `H${rowIdx}*I${rowIdx}` };
    r.getCell(10).numFmt = '0.0';
    r.getCell(11).value = t.sla;
    r.getCell(12).value = t.done;
    r.getCell(13).value = t.status;
    r.getCell(14).value = t.progress;

    for (let c = 1; c <= 14; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 2, 7, 11, 12, 13, 14].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([8, 9, 10].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  wsWorkload.columns = [
    { width: 12 }, // Mã Task
    { width: 12 }, // Ngày giao
    { width: 22 }, // Nhân sự
    { width: 24 }, // Vai trò
    { width: 22 }, // Campaign
    { width: 36 }, // Tên Task
    { width: 14 }, // Độ phức tạp
    { width: 16 }, // Điểm Chuẩn
    { width: 16 }, // Số Lượng
    { width: 16 }, // Tổng Điểm
    { width: 14 }, // Hạn chót
    { width: 14 }, // Ngày xong
    { width: 16 }, // Trạng thái
    { width: 12 }  // Tiến độ
  ];

  // ==========================================
  // SHEET 3: ĐÁNH GIÁ HIỆU SUẤT (KPI & SLA)
  // ==========================================
  const wsKpi = workbook.addWorksheet('3. Chi Tiết KPI & SLA', {
    views: [{ showGridLines: true }]
  });

  wsKpi.mergeCells('A2:P2');
  wsKpi.getCell('A2').value = 'BẢNG THEO DÕI & TÍNH ĐIỂM KPI - SLA - GMV CHI TIẾT';
  wsKpi.getCell('A2').font = titleFont;
  wsKpi.getRow(2).height = 26;

  wsKpi.mergeCells('A3:P3');
  wsKpi.getCell('A3').value = 'Tách bạch 3 trụ cột: Kỷ luật SLA (30%) + Sản lượng đầu ra (40%) + Doanh thu GMV đóng góp (30%)';
  wsKpi.getCell('A3').font = subtitleFont;

  // Group Header
  wsKpi.mergeCells('A5:C5');
  wsKpi.getCell('A5').value = 'NHÂN SỰ';
  wsKpi.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
  wsKpi.getCell('A5').font = headerFont;
  wsKpi.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsKpi.mergeCells('D5:G5');
  wsKpi.getCell('D5').value = '1. KỶ LUẬT & TUÂN THỦ SLA (TRỌNG SỐ 30%)';
  wsKpi.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  wsKpi.getCell('D5').font = headerFont;
  wsKpi.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsKpi.mergeCells('H5:K5');
  wsKpi.getCell('H5').value = '2. SẢN LƯỢNG ĐẦU RA OUTPUT (TRỌNG SỐ 40%)';
  wsKpi.getCell('H5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
  wsKpi.getCell('H5').font = headerFont;
  wsKpi.getCell('H5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsKpi.mergeCells('L5:O5');
  wsKpi.getCell('L5').value = '3. TÁC ĐỘNG KINH DOANH GMV (TRỌNG SỐ 30%)';
  wsKpi.getCell('L5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '854D0E' } };
  wsKpi.getCell('L5').font = headerFont;
  wsKpi.getCell('L5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsKpi.mergeCells('P5:P5');
  wsKpi.getCell('P5').value = 'TỔNG ĐIỂM';
  wsKpi.getCell('P5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
  wsKpi.getCell('P5').font = headerFont;
  wsKpi.getCell('P5').alignment = { horizontal: 'center', vertical: 'middle' };

  const kpiHeaders = [
    'Mã NV', 'Họ và Tên', 'Vai Trò',
    'Tổng Task Nhận', 'Task Đúng Hạn', 'Tỷ Lệ SLA (%)', 'Điểm SLA (30đ)',
    'Chỉ Tiêu Cam Kết (Target)', 'Thực Tế Đạt (Actual)', '% Đạt Sản Lượng', 'Điểm Output (40đ)',
    'Mục Tiêu GMV (VNĐ)', 'GMV Thực Đạt (VNĐ)', '% Đạt GMV', 'Điểm GMV (30đ)',
    'Tổng KPI (100đ)'
  ];

  const rK6 = wsKpi.getRow(6);
  rK6.height = 26;
  kpiHeaders.forEach((h, idx) => {
    const c = rK6.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '64748B' } };
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const kpiDetails = [
    { id: 'UB-B2C-01', name: 'Nguyễn Thu Trang', role: 'KOC Booking Lead', totalTask: 40, onTime: 38, tgtOut: 20, actOut: 22, tgtGmv: 400000000, actGmv: 420000000 },
    { id: 'UB-B2C-02', name: 'Trần Minh Đức', role: 'Senior Booking Executive', totalTask: 50, onTime: 49, tgtOut: 35, actOut: 40, tgtGmv: 500000000, actGmv: 560000000 },
    { id: 'UB-B2C-03', name: 'Lê Hoàng Yến', role: 'Booking Specialist', totalTask: 35, onTime: 32, tgtOut: 25, actOut: 24, tgtGmv: 300000000, actGmv: 280000000 },
    { id: 'UB-B2C-04', name: 'Phạm Quỳnh Anh', role: 'Booking Junior', totalTask: 25, onTime: 21, tgtOut: 20, actOut: 16, tgtGmv: 200000000, actGmv: 160000000 },
    { id: 'UB-B2C-05', name: 'Vũ Đức Thắng', role: 'Content Lead / Video', totalTask: 30, onTime: 30, tgtOut: 12, actOut: 13, tgtGmv: 300000000, actGmv: 310000000 },
    { id: 'UB-B2C-06', name: 'Đặng Mai Phương', role: 'Short-form Video Creator', totalTask: 28, onTime: 25, tgtOut: 15, actOut: 15, tgtGmv: 250000000, actGmv: 245000000 },
    { id: 'UB-B2C-07', name: 'Hoàng Kim Ngân', role: 'Scriptwriter & Reviewer', totalTask: 32, onTime: 30, tgtOut: 25, actOut: 26, tgtGmv: 250000000, actGmv: 240000000 },
    { id: 'UB-B2C-08', name: 'Bùi Tuấn Hưng', role: 'Brand & Campaign Lead', totalTask: 15, onTime: 15, tgtOut: 3, actOut: 3, tgtGmv: 1000000000, actGmv: 1050000000 },
    { id: 'UB-B2C-09', name: 'Ngô Bảo Trâm', role: 'Brand Executive', totalTask: 20, onTime: 18, tgtOut: 4, actOut: 4, tgtGmv: 600000000, actGmv: 540000000 },
    { id: 'UB-B2C-10', name: 'Đỗ Hữu Nam', role: 'Performance Media Buyer', totalTask: 25, onTime: 24, tgtOut: 20, actOut: 21, tgtGmv: 800000000, actGmv: 850000000 },
  ];

  kpiDetails.forEach((k, i) => {
    const rowIdx = 7 + i;
    const r = wsKpi.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = k.id;
    r.getCell(2).value = k.name;
    r.getCell(3).value = k.role;

    // SLA
    r.getCell(4).value = k.totalTask;
    r.getCell(5).value = k.onTime;
    r.getCell(6).value = { formula: `E${rowIdx}/D${rowIdx}` };
    r.getCell(6).numFmt = '0.0%';
    r.getCell(7).value = { formula: `F${rowIdx}*30` };
    r.getCell(7).numFmt = '0.0';

    // Output
    r.getCell(8).value = k.tgtOut;
    r.getCell(9).value = k.actOut;
    r.getCell(10).value = { formula: `I${rowIdx}/H${rowIdx}` };
    r.getCell(10).numFmt = '0.0%';
    r.getCell(11).value = { formula: `MIN(45, J${rowIdx}*40)` };
    r.getCell(11).numFmt = '0.0';

    // GMV
    r.getCell(12).value = k.tgtGmv;
    r.getCell(12).numFmt = '#,##0 "đ"';
    r.getCell(13).value = k.actGmv;
    r.getCell(13).numFmt = '#,##0 "đ"';
    r.getCell(14).value = { formula: `M${rowIdx}/L${rowIdx}` };
    r.getCell(14).numFmt = '0.0%';
    r.getCell(15).value = { formula: `MIN(35, N${rowIdx}*30)` };
    r.getCell(15).numFmt = '0.0';

    // Total Score
    r.getCell(16).value = { formula: `G${rowIdx}+K${rowIdx}+O${rowIdx}` };
    r.getCell(16).numFmt = '0.0';

    for (let c = 1; c <= 16; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 6, 10, 14].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([4, 5, 7, 8, 9, 11, 12, 13, 15, 16].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  wsKpi.columns = [
    { width: 14 }, // Mã NV
    { width: 22 }, // Họ Tên
    { width: 24 }, // Vai trò
    { width: 14 }, // Tổng task
    { width: 14 }, // Đúng hạn
    { width: 14 }, // Tỷ lệ SLA
    { width: 16 }, // Điểm SLA
    { width: 16 }, // Target Output
    { width: 16 }, // Actual Output
    { width: 16 }, // % Đạt Output
    { width: 16 }, // Điểm Output
    { width: 20 }, // Target GMV
    { width: 20 }, // Actual GMV
    { width: 14 }, // % Đạt GMV
    { width: 16 }, // Điểm GMV
    { width: 16 }  // Tổng Điểm KPI
  ];

  // ==========================================
  // SHEET 4: CATALOG ĐỊNH MỨC CÔNG VIỆC (STANDARD PTS)
  // ==========================================
  const wsCatalog = workbook.addWorksheet('4. Từ Điển Định Mức Task', {
    views: [{ showGridLines: true }]
  });

  wsCatalog.mergeCells('A2:G2');
  wsCatalog.getCell('A2').value = 'TỪ ĐIỂN ĐỊNH MỨC CÔNG VIỆC & QUY ĐỔI ĐIỂM TẢI (STORY POINTS)';
  wsCatalog.getCell('A2').font = titleFont;
  wsCatalog.getRow(2).height = 26;

  wsCatalog.mergeCells('A3:G3');
  wsCatalog.getCell('A3').value = 'Bảng tra cứu chuẩn hóa thời gian và độ phức tạp cho các tác vụ đặc thù phòng Marketing B2C';
  wsCatalog.getCell('A3').font = subtitleFont;

  const catalogHeaders = [
    'Mã Định Mức', 'Nhóm Nghiệp Vụ', 'Tên Tác Vụ Tiêu Chuẩn', 'Độ Phức Tạp',
    'Điểm Tải (Pts / Task)', 'Thời Gian Ước Tính (Giờ)', 'Định Mức Tuần / Nhân Sự (100% Load = 40 Pts)'
  ];

  const rC5 = wsCatalog.getRow(5);
  rC5.height = 26;
  catalogHeaders.forEach((h, idx) => {
    const c = rC5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const catalogItems = [
    // Booking
    { code: 'BK-01', group: 'KOC Booking', name: 'Tiếp cận & Chốt 01 deal KOC Affiliate thường (TikTok/Shopee)', level: 'Thấp', pt: 1.0, hours: 2.0, capWeek: '35 - 40 deals' },
    { code: 'BK-02', group: 'KOC Booking', name: 'Đàm phán Deal KOC Tier 1 / Celeb / KOL Độc Quyền', level: 'Cao', pt: 3.0, hours: 6.0, capWeek: '8 - 10 deals' },
    { code: 'BK-03', group: 'KOC Booking', name: 'Đóng gói, gửi hàng mẫu & kiểm tra vận chuyển (Logistics)', level: 'Rất thấp', pt: 0.3, hours: 0.5, capWeek: '80 - 100 đơn' },
    { code: 'BK-04', group: 'KOC Booking', name: 'Nghiệm thu video, lấy mã Spark Ads & kiểm tra giỏ hàng', level: 'Thấp', pt: 0.5, hours: 1.0, capWeek: '50 - 60 videos' },
    { code: 'BK-05', group: 'KOC Booking', name: 'Quản lý phiên Livestream KOC 2 tiếng & support kỹ thuật', level: 'Trung bình', pt: 2.5, hours: 5.0, capWeek: '10 - 12 phiên' },
    
    // Content
    { code: 'CT-01', group: 'Content Creation', name: 'Nghiên cứu góc tiếp cận (Angle) & Viết 01 kịch bản chi tiết 4 phần', level: 'Trung bình', pt: 1.5, hours: 3.0, capWeek: '20 - 25 kịch bản' },
    { code: 'CT-02', group: 'Content Creation', name: 'Sản xuất & Quay dựng hoàn thiện 01 Short Video (TikTok/Reels)', level: 'Cao', pt: 2.5, hours: 5.0, capWeek: '12 - 15 videos' },
    { code: 'CT-03', group: 'Content Creation', name: 'Sản xuất 01 Video Hero Viral (Concept sáng tạo đặc biệt)', level: 'Rất cao', pt: 4.0, hours: 8.0, capWeek: '6 - 8 videos' },
    { code: 'CT-04', group: 'Content Creation', name: 'Thẩm định & Duyệt kịch bản KOC (Script Review & Feedback)', level: 'Thấp', pt: 0.5, hours: 1.0, capWeek: '50 - 60 kịch bản' },
    { code: 'CT-05', group: 'Content Creation', name: 'Thiết kế Key Visual / Thumbnail / Banner chiến dịch', level: 'Thấp', pt: 1.0, hours: 2.0, capWeek: '30 - 35 ấn phẩm' },

    // Brand
    { code: 'BR-01', group: 'Brand & Campaign', name: 'Xây dựng Campaign Strategy, Big Idea & Master Brief', level: 'Rất cao', pt: 5.0, hours: 10.0, capWeek: '4 - 5 chiến dịch/tháng' },
    { code: 'BR-02', group: 'Brand & Campaign', name: 'Lập kế hoạch phân bổ ngân sách & chỉ tiêu KPI các team', level: 'Trung bình', pt: 2.0, hours: 4.0, capWeek: '1 - 2 kế hoạch/tuần' },
    { code: 'BR-03', group: 'Brand & Campaign', name: 'Tổng hợp báo cáo P&L, ROI & Phân tích hiệu quả chiến dịch', level: 'Trung bình', pt: 2.0, hours: 4.0, capWeek: '1 báo cáo/tuần' },

    // Performance
    { code: 'PF-01', group: 'Performance Ads', name: 'Setup & chạy tối ưu chiến dịch TikTok Shop Ads / GMV Max', level: 'Trung bình', pt: 2.0, hours: 4.0, capWeek: '15 - 20 campaign' },
    { code: 'PF-02', group: 'Performance Ads', name: 'Test A/B mẫu quảng cáo & gắn mã Spark Ads hàng ngày', level: 'Thấp', pt: 1.0, hours: 2.0, capWeek: '30 - 35 ads' }
  ];

  catalogItems.forEach((item, i) => {
    const rowIdx = 6 + i;
    const r = wsCatalog.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = item.code;
    r.getCell(2).value = item.group;
    r.getCell(3).value = item.name;
    r.getCell(4).value = item.level;
    r.getCell(5).value = item.pt;
    r.getCell(5).numFmt = '0.0';
    r.getCell(6).value = item.hours;
    r.getCell(6).numFmt = '0.0';
    r.getCell(7).value = item.capWeek;

    for (let c = 1; c <= 7; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 4].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([5, 6].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  wsCatalog.columns = [
    { width: 14 }, // Mã
    { width: 22 }, // Nhóm
    { width: 45 }, // Tác vụ
    { width: 16 }, // Độ phức tạp
    { width: 18 }, // Điểm Tải
    { width: 20 }, // Giờ ước tính
    { width: 30 }  // Định mức tuần
  ];

  const exportPath = path.resolve('E:/Upbase/B2C/Bang_Danh_Gia_Workload_Va_Hieu_Suat_MKT_B2C.xlsx');
  await workbook.xlsx.writeFile(exportPath);
  console.log('SUCCESS: Evaluation Workbook created at', exportPath);
}

// ============================================================================
// WORKBOOK 2: BẢNG KẾ HOẠCH TỔNG HỢP 4 CHẶNG & ĐỐI SOÁT NMV GAP (CHUẨN FILE 4.1 & 4.1.1)
// ============================================================================
async function createPlanOrderWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Upbase Growth & Booking';
  workbook.lastModifiedBy = 'Upbase Operations';
  workbook.created = new Date();
  workbook.modified = new Date();

  const primaryNavy = '1E293B';
  const headerDark = '334155';
  const headerBlue = '1D4ED8';
  const headerTeal = '0F766E';
  const headerAmber = 'B45309';
  const headerSlate = '475569';
  const borderGray = 'CBD5E1';

  const defaultBorder = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } }
  };

  const headerFont = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
  const dataFont = { name: 'Segoe UI', size: 10 };
  const titleFont = { name: 'Segoe UI', size: 15, bold: true, color: { argb: primaryNavy } };
  const subtitleFont = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };

  // -------------------------------------------------------------
  // SHEET 1: ĐỐI SOÁT 4 CHẶNG & NMV GAP (FOUR-STAGE TRACKING)
  // -------------------------------------------------------------
  const wsFourStage = workbook.addWorksheet('1. Đối Soát 4 Chặng & NMV', {
    views: [{ showGridLines: true }]
  });

  wsFourStage.mergeCells('B2:Q2');
  wsFourStage.getCell('B2').value = 'BẢNG ĐỐI SOÁT KẾ HOẠCH GIAN HÀNG 4 CHẶNG & GAP NMV THỰC TẾ';
  wsFourStage.getCell('B2').font = titleFont;
  wsFourStage.getRow(2).height = 28;

  wsFourStage.mergeCells('B3:Q3');
  wsFourStage.getCell('B3').value = 'Chuẩn hóa theo File 4.1 Plan order tổng: 1. Plan Đầu Tháng -> 2. Số Duyệt -> 3. Sau Điều Chỉnh -> 4. Report MTD | NMV = GMV * (1 - Tỷ lệ hủy)';
  wsFourStage.getCell('B3').font = subtitleFont;

  // Group Headers
  wsFourStage.mergeCells('B5:E5');
  wsFourStage.getCell('B5').value = 'THÔNG TIN CHIẾN DỊCH & GIAN HÀNG';
  wsFourStage.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerDark } };
  wsFourStage.getCell('B5').font = headerFont;
  wsFourStage.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsFourStage.mergeCells('F5:H5');
  wsFourStage.getCell('F5').value = '1. PLAN ĐẦU THÁNG';
  wsFourStage.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerTeal } };
  wsFourStage.getCell('F5').font = headerFont;
  wsFourStage.getCell('F5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsFourStage.mergeCells('I5:K5');
  wsFourStage.getCell('I5').value = '2. SỐ DUYỆT (CHỐT)';
  wsFourStage.getCell('I5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  wsFourStage.getCell('I5').font = headerFont;
  wsFourStage.getCell('I5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsFourStage.mergeCells('L5:N5');
  wsFourStage.getCell('L5').value = '3. SAU ĐIỀU CHỈNH';
  wsFourStage.getCell('L5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerAmber } };
  wsFourStage.getCell('L5').font = headerFont;
  wsFourStage.getCell('L5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsFourStage.mergeCells('O5:R5');
  wsFourStage.getCell('O5').value = '4. THỰC TẾ MTD & GAP ĐỐI SOÁT';
  wsFourStage.getCell('O5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
  wsFourStage.getCell('O5').font = headerFont;
  wsFourStage.getCell('O5').alignment = { horizontal: 'center', vertical: 'middle' };

  const fourStageCols = [
    'STT', 'Mã Demand', 'Gian Hàng / Store', 'Kênh / Phân Hệ', 'Tỷ Lệ Hủy Định Mức',
    'Plan GMV (VNĐ)', 'Plan Ngân Sách', 'Plan CIR (%)',
    'Duyệt GMV (VNĐ)', 'Duyệt Ngân Sách', 'Duyệt NMV Thuần',
    'Điều Chỉnh GMV', 'Điều Chỉnh Ngân Sách', 'Điều Chỉnh NMV',
    'Thực Tế MTD GMV', 'Thực Tế NMV Thuần', 'NMV Gap (VNĐ)', 'Đánh Giá Tiến Độ'
  ];

  const rFS6 = wsFourStage.getRow(6);
  rFS6.height = 26;
  fourStageCols.forEach((col, idx) => {
    const c = rFS6.getCell(idx + 1);
    c.value = col;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerSlate } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const fourStageData = [
    { stt: 1, code: 'GD-1010-SENKA', store: 'Senka Official Store', channel: 'Video Affiliate KOC', cancel: 0.08, planGmv: 520000000, planBud: 105000000, appGmv: 500000000, appBud: 98000000, adjGmv: 490000000, adjBud: 95000000, actGmv: 345000000 },
    { stt: 2, code: 'GD-1010-SENKA', store: 'Senka Official Store', channel: 'Video Self-Channel', cancel: 0.06, planGmv: 150000000, planBud: 22000000, appGmv: 140000000, appBud: 18000000, adjGmv: 140000000, adjBud: 18000000, actGmv: 92000000 },
    { stt: 3, code: 'GD-1010-SENKA', store: 'Senka Official Store', channel: 'Livestream Inhouse/CTV', cancel: 0.10, planGmv: 280000000, planBud: 35000000, appGmv: 250000000, appBud: 30000000, adjGmv: 250000000, adjBud: 30000000, actGmv: 178000000 },
    { stt: 4, code: 'GD-1010-CURE', store: 'Cure Natural Aqua Gel', channel: 'Video Affiliate KOC', cancel: 0.07, planGmv: 320000000, planBud: 65000000, appGmv: 300000000, appBud: 60000000, adjGmv: 300000000, adjBud: 60000000, actGmv: 215000000 },
    { stt: 5, code: 'GD-1010-CURE', store: 'Cure Natural Aqua Gel', channel: 'Video Self-Channel', cancel: 0.05, planGmv: 80000000, planBud: 12000000, appGmv: 75000000, appBud: 10000000, adjGmv: 75000000, adjBud: 10000000, actGmv: 58000000 },
    { stt: 6, code: 'GD-1010-BIO', store: 'Bio-Essence Flagship Store', channel: 'Video Affiliate KOC', cancel: 0.09, planGmv: 450000000, planBud: 90000000, appGmv: 420000000, appBud: 85000000, adjGmv: 410000000, adjBud: 82000000, actGmv: 290000000 },
    { stt: 7, code: 'GD-1010-BIO', store: 'Bio-Essence Flagship Store', channel: 'Livestream Inhouse/CTV', cancel: 0.12, planGmv: 220000000, planBud: 28000000, appGmv: 200000000, appBud: 25000000, adjGmv: 200000000, adjBud: 25000000, actGmv: 135000000 },
    { stt: 8, code: 'GD-1010-PERI', store: 'Peripera Vietnam Club', channel: 'Video Affiliate KOC', cancel: 0.08, planGmv: 600000000, planBud: 130000000, appGmv: 580000000, appBud: 120000000, adjGmv: 580000000, adjBud: 120000000, actGmv: 410000000 },
  ];

  fourStageData.forEach((d, i) => {
    const rowIdx = 7 + i;
    const r = wsFourStage.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = d.stt;
    r.getCell(2).value = d.code;
    r.getCell(3).value = d.store;
    r.getCell(4).value = d.channel;
    r.getCell(5).value = d.cancel;
    r.getCell(5).numFmt = '0.0%';

    // Plan
    r.getCell(6).value = d.planGmv;
    r.getCell(6).numFmt = '#,##0';
    r.getCell(7).value = d.planBud;
    r.getCell(7).numFmt = '#,##0';
    r.getCell(8).value = { formula: `G${rowIdx}/F${rowIdx}` };
    r.getCell(8).numFmt = '0.0%';

    // Approved
    r.getCell(9).value = d.appGmv;
    r.getCell(9).numFmt = '#,##0';
    r.getCell(10).value = d.appBud;
    r.getCell(10).numFmt = '#,##0';
    r.getCell(11).value = { formula: `I${rowIdx}*(1-E${rowIdx})` };
    r.getCell(11).numFmt = '#,##0';

    // Adjusted
    r.getCell(12).value = d.adjGmv;
    r.getCell(12).numFmt = '#,##0';
    r.getCell(13).value = d.adjBud;
    r.getCell(13).numFmt = '#,##0';
    r.getCell(14).value = { formula: `L${rowIdx}*(1-E${rowIdx})` };
    r.getCell(14).numFmt = '#,##0';

    // Actual MTD & NMV Gap
    r.getCell(15).value = d.actGmv;
    r.getCell(15).numFmt = '#,##0';
    r.getCell(16).value = { formula: `O${rowIdx}*(1-E${rowIdx})` };
    r.getCell(16).numFmt = '#,##0';
    r.getCell(17).value = { formula: `P${rowIdx}-N${rowIdx}` };
    r.getCell(17).numFmt = '+#,##0;-#,##0;0';

    // Status
    r.getCell(18).value = {
      formula: `IF(P${rowIdx}>=N${rowIdx}*0.75,"✅ Đúng Tiến Độ",IF(P${rowIdx}>=N${rowIdx}*0.55,"⚠️ Chậm Tiến Độ","🔥 Báo Động Hụt NMV"))`
    };

    for (let c = 1; c <= 18; c++) {
      const cell = r.getCell(c);
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

  wsFourStage.columns = [
    { width: 6 },  // STT
    { width: 16 }, // Mã Demand
    { width: 26 }, // Gian hàng
    { width: 24 }, // Kênh
    { width: 14 }, // Tỷ lệ hủy
    { width: 16 }, // Plan GMV
    { width: 16 }, // Plan Bud
    { width: 12 }, // Plan CIR
    { width: 16 }, // Duyệt GMV
    { width: 16 }, // Duyệt Bud
    { width: 16 }, // Duyệt NMV
    { width: 16 }, // Adj GMV
    { width: 16 }, // Adj Bud
    { width: 16 }, // Adj NMV
    { width: 16 }, // Act GMV
    { width: 16 }, // Act NMV
    { width: 18 }, // NMV Gap
    { width: 22 }  // Tiến độ
  ];

  // -------------------------------------------------------------
  // SHEET 2: KẾ HOẠCH KOC AFFILIATE 7 BẬC (KL1 - KL7)
  // -------------------------------------------------------------
  const wsKoc = workbook.addWorksheet('2. Kế Hoạch KOC Affiliate', {
    views: [{ showGridLines: true }]
  });

  wsKoc.mergeCells('B2:M2');
  wsKoc.getCell('B2').value = 'KẾ HOẠCH PHÂN BỔ KOC AFFILIATE THEO 7 BẬC (TIÊU CHUẨN MEUP & UPBASE)';
  wsKoc.getCell('B2').font = titleFont;
  wsKoc.getRow(2).height = 26;

  wsKoc.mergeCells('B3:M3');
  wsKoc.getCell('B3').value = 'Bậc KL1-KL2 (Affiliate tự do/FOC) | KL3 (Micro) | KL4-KL5 (Macro) | KL6-KL7 (Celeb) - Chặn trần định mức KL4+ <= 45%';
  wsKoc.getCell('B3').font = subtitleFont;

  const kocHeaders = [
    'Bậc KOC', 'Nhóm Bậc', 'Mô Tả Tiêu Chuẩn', 'Nền Tảng Chính',
    'Số Lượng KOC', 'Đơn Giá Cast (VNĐ)', 'Chi Phí Cast (VNĐ)', 'Chi Phí Mẫu FOC (VNĐ)',
    'Tổng Ngân Sách (VNĐ)', 'Tỷ Trọng Ngân Sách (%)', 'Target GMV / KOC', 'Tổng GMV Dự Kiến (VNĐ)', 'CIR Dự Phóng (%)'
  ];

  const rKOC5 = wsKoc.getRow(5);
  rKOC5.height = 26;
  kocHeaders.forEach((h, idx) => {
    const c = rKOC5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerTeal } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const kocTiersData = [
    { code: 'KL1', group: 'FOC Sample', desc: 'Affiliate tự do, nhận mẫu miễn phí 0đ cast', channel: 'TikTok / Shopee', count: 40, cast: 0, sample: 120000, gmvPerKoc: 4000000 },
    { code: 'KL2', group: 'Affiliate Thường', desc: 'KOC hạt giống có lượng bán đều đặn', channel: 'TikTok / Shopee', count: 25, cast: 800000, sample: 150000, gmvPerKoc: 8000000 },
    { code: 'KL3', group: 'Micro KOC', desc: 'Followers 50k-200k, video chuyển đổi tốt', channel: 'TikTok Shop', count: 12, cast: 3500000, sample: 200000, gmvPerKoc: 28000000 },
    { code: 'KL4', group: 'Macro Nhỏ', desc: 'Followers 200k-500k, review chuyên sâu ngành da', channel: 'TikTok / Reels', count: 4, cast: 9000000, sample: 250000, gmvPerKoc: 60000000 },
    { code: 'KL5', group: 'Macro Lớn', desc: 'Followers 500k-1M, có tầm ảnh hưởng lớn', channel: 'TikTok Shop', count: 2, cast: 18000000, sample: 300000, gmvPerKoc: 110000000 },
    { code: 'KL6', group: 'Celeb / Top Creator', desc: 'Người nổi tiếng / Beauty Blogger danh tiếng', channel: 'Đa kênh', count: 1, cast: 35000000, sample: 500000, gmvPerKoc: 200000000 },
    { code: 'KL7', group: 'Đại Sứ Chiến Dịch', desc: 'KOL ký độc quyền Mega Day', channel: 'Toàn diện', count: 0, cast: 60000000, sample: 500000, gmvPerKoc: 400000000 }
  ];

  kocTiersData.forEach((k, i) => {
    const rowIdx = 6 + i;
    const r = wsKoc.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = k.code;
    r.getCell(2).value = k.group;
    r.getCell(3).value = k.desc;
    r.getCell(4).value = k.channel;
    r.getCell(5).value = k.count;

    r.getCell(6).value = k.cast;
    r.getCell(6).numFmt = '#,##0';
    r.getCell(7).value = { formula: `E${rowIdx}*F${rowIdx}` };
    r.getCell(7).numFmt = '#,##0';

    r.getCell(8).value = { formula: `E${rowIdx}*${k.sample}` };
    r.getCell(8).numFmt = '#,##0';

    r.getCell(9).value = { formula: `G${rowIdx}+H${rowIdx}` };
    r.getCell(9).numFmt = '#,##0';

    // Tỷ trọng ngân sách = Tổng / SUM($I$6:$I$12)
    r.getCell(10).value = { formula: `I${rowIdx}/$I$13` };
    r.getCell(10).numFmt = '0.0%';

    r.getCell(11).value = k.gmvPerKoc;
    r.getCell(11).numFmt = '#,##0';

    r.getCell(12).value = { formula: `E${rowIdx}*K${rowIdx}` };
    r.getCell(12).numFmt = '#,##0';

    r.getCell(13).value = { formula: `IF(L${rowIdx}>0, I${rowIdx}/L${rowIdx}, 0)` };
    r.getCell(13).numFmt = '0.0%';

    for (let c = 1; c <= 13; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([1, 2, 4, 10, 13].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([5, 6, 7, 8, 9, 11, 12].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  // Total Row KOC
  const totKocRow = wsKoc.getRow(13);
  totKocRow.height = 24;
  totKocRow.getCell(2).value = 'TỔNG CỘNG AFFILIATE';
  totKocRow.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true };
  totKocRow.getCell(5).value = { formula: 'SUM(E6:E12)' };
  totKocRow.getCell(7).value = { formula: 'SUM(G6:G12)' };
  totKocRow.getCell(7).numFmt = '#,##0';
  totKocRow.getCell(8).value = { formula: 'SUM(H6:H12)' };
  totKocRow.getCell(8).numFmt = '#,##0';
  totKocRow.getCell(9).value = { formula: 'SUM(I6:I12)' };
  totKocRow.getCell(9).numFmt = '#,##0';
  totKocRow.getCell(10).value = { formula: 'SUM(J6:J12)' };
  totKocRow.getCell(10).numFmt = '100.0%';
  totKocRow.getCell(12).value = { formula: 'SUM(L6:L12)' };
  totKocRow.getCell(12).numFmt = '#,##0';
  totKocRow.getCell(13).value = { formula: 'I13/L13' };
  totKocRow.getCell(13).numFmt = '0.0%';

  for (let c = 1; c <= 13; c++) {
    const cell = totKocRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = defaultBorder;
    cell.font = { name: 'Segoe UI', size: 10, bold: true };
  }

  wsKoc.columns = [
    { width: 10 }, // Bậc
    { width: 18 }, // Nhóm
    { width: 36 }, // Mô tả
    { width: 18 }, // Nền tảng
    { width: 14 }, // Số lượng
    { width: 16 }, // Đơn giá Cast
    { width: 18 }, // Chi phí Cast
    { width: 18 }, // Chi phí Mẫu
    { width: 20 }, // Tổng Ngân Sách
    { width: 16 }, // Tỷ Trọng
    { width: 18 }, // Target GMV/KOC
    { width: 22 }, // Tổng GMV
    { width: 14 }  // CIR
  ];

  // -------------------------------------------------------------
  // SHEET 3: VIDEO SELF-CHANNEL (INHOUSE & REUP)
  // -------------------------------------------------------------
  const wsSelf = workbook.addWorksheet('3. Video Self-Channel', {
    views: [{ showGridLines: true }]
  });

  wsSelf.mergeCells('B2:K2');
  wsSelf.getCell('B2').value = 'KẾ HOẠCH SẢN XUẤT VIDEO INHOUSE & MA TRẬN PHÂN PHỐI REUP ĐA NỀN TẢNG';
  wsSelf.getCell('B2').font = titleFont;
  wsSelf.getRow(2).height = 26;

  wsSelf.mergeCells('B3:K3');
  wsSelf.getCell('B3').value = 'Khai thác tối đa tài nguyên video: 01 Video Inhouse gốc -> Phân bổ reup 4 kênh (TikTok Shop, Shopee Video, FB Reels, Threads)';
  wsSelf.getCell('B3').font = subtitleFont;

  const selfHeaders = [
    'Hạng Mục Sản Xuất', 'Định Dạng / Thể Loại', 'Số Lượng Video', 'Chi Phí Sản Xuất / Video',
    'Tổng Chi Phí Inhouse', 'Reup TikTok Shop', 'Reup Shopee Video', 'Reup Facebook Reels', 'Reup Threads',
    'Target GMV Đóng Góp', 'CIR Kênh (%)'
  ];

  const rS5 = wsSelf.getRow(5);
  rS5.height = 26;
  selfHeaders.forEach((h, idx) => {
    const c = rS5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const selfData = [
    { cat: 'Video Hero / Viral Hook', format: 'Short Drama & Visual Hook', count: 6, unitCost: 1500000, tt: 6, sp: 6, fb: 6, th: 6, gmv: 55000000 },
    { cat: 'Video Review Trải Nghiệm', format: 'Before - After & Test SP', count: 10, unitCost: 800000, tt: 10, sp: 10, fb: 10, th: 8, gmv: 50000000 },
    { cat: 'Video Bán Hàng Trực Diện', format: 'Deal Sốc & Giới Thiệu Combo', count: 8, unitCost: 500000, tt: 8, sp: 8, fb: 8, th: 4, gmv: 35000000 },
    { cat: 'Video Chăm Sóc Khách Hàng', format: 'Hướng Dẫn Sử Dụng & FAQ', count: 4, unitCost: 400000, tt: 4, sp: 4, fb: 4, th: 2, gmv: 10000000 }
  ];

  selfData.forEach((s, i) => {
    const rowIdx = 6 + i;
    const r = wsSelf.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = s.cat;
    r.getCell(2).value = s.format;
    r.getCell(3).value = s.count;
    r.getCell(4).value = s.unitCost;
    r.getCell(4).numFmt = '#,##0';
    r.getCell(5).value = { formula: `C${rowIdx}*D${rowIdx}` };
    r.getCell(5).numFmt = '#,##0';
    r.getCell(6).value = s.tt;
    r.getCell(7).value = s.sp;
    r.getCell(8).value = s.fb;
    r.getCell(9).value = s.th;
    r.getCell(10).value = s.gmv;
    r.getCell(10).numFmt = '#,##0';
    r.getCell(11).value = { formula: `E${rowIdx}/J${rowIdx}` };
    r.getCell(11).numFmt = '0.0%';

    for (let c = 1; c <= 11; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([3, 6, 7, 8, 9, 11].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([4, 5, 10].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  wsSelf.columns = [
    { width: 28 }, // Hạng mục
    { width: 26 }, // Thể loại
    { width: 14 }, // Số lượng
    { width: 20 }, // Đơn giá
    { width: 22 }, // Tổng chi phí
    { width: 16 }, // TT
    { width: 16 }, // SP
    { width: 16 }, // FB
    { width: 14 }, // Threads
    { width: 22 }, // Target GMV
    { width: 14 }  // CIR
  ];

  // -------------------------------------------------------------
  // SHEET 4: KẾ HOẠCH LIVESTREAM GIAN HÀNG
  // -------------------------------------------------------------
  const wsLive = workbook.addWorksheet('4. Livestream Gian Hàng', {
    views: [{ showGridLines: true }]
  });

  wsLive.mergeCells('B2:K2');
  wsLive.getCell('B2').value = 'KẾ HOẠCH LIVESTREAM GIAN HÀNG (INHOUSE STUDIO & CTV)';
  wsLive.getCell('B2').font = titleFont;
  wsLive.getRow(2).height = 26;

  wsLive.mergeCells('B3:K3');
  wsLive.getCell('B3').value = 'Phân loại theo quy chuẩn Upbase: Inhouse Studio HCM (Ca 3h), Inhouse Studio HN (Ca 3h), CTV ngoài (Ca 2h)';
  wsLive.getCell('B3').font = subtitleFont;

  const liveHeaders = [
    'Mô Hình Live', 'Studio / Đội Ngũ', 'Thời Lượng / Ca (Giờ)', 'Số Phiên Dự Kiến',
    'Tổng Số Giờ Live', 'Chi Phí Host / Ca', 'Chi Phí Kỹ Thuật & Setup', 'Tổng Ngân Sách Live',
    'Target NMV (Sau Hủy)', 'NMV / Giờ Live', 'CIR Livestream (%)'
  ];

  const rL5 = wsLive.getRow(5);
  rL5.height = 26;
  liveHeaders.forEach((h, idx) => {
    const c = rL5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerAmber } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const liveData = [
    { model: 'Live Inhouse HCM', team: 'Studio HCM (2 Hosts + Ops)', hoursPerShift: 3, shifts: 16, hostCost: 600000, techCost: 300000, nmv: 140000000 },
    { model: 'Live Inhouse HN', team: 'Studio HN (1 Host + Kỹ thuật)', hoursPerShift: 3, shifts: 8, hostCost: 500000, techCost: 250000, nmv: 60000000 },
    { model: 'Live CTV Ngoài', team: 'Host CTV Độc Lập', hoursPerShift: 2, shifts: 10, hostCost: 800000, techCost: 150000, nmv: 50000000 }
  ];

  liveData.forEach((l, i) => {
    const rowIdx = 6 + i;
    const r = wsLive.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = l.model;
    r.getCell(2).value = l.team;
    r.getCell(3).value = l.hoursPerShift;
    r.getCell(4).value = l.shifts;
    r.getCell(5).value = { formula: `C${rowIdx}*D${rowIdx}` };

    r.getCell(6).value = l.hostCost;
    r.getCell(6).numFmt = '#,##0';
    r.getCell(7).value = l.techCost;
    r.getCell(7).numFmt = '#,##0';
    r.getCell(8).value = { formula: `D${rowIdx}*(F${rowIdx}+G${rowIdx})` };
    r.getCell(8).numFmt = '#,##0';

    r.getCell(9).value = l.nmv;
    r.getCell(9).numFmt = '#,##0';
    r.getCell(10).value = { formula: `I${rowIdx}/E${rowIdx}` };
    r.getCell(10).numFmt = '#,##0';
    r.getCell(11).value = { formula: `H${rowIdx}/I${rowIdx}` };
    r.getCell(11).numFmt = '0.0%';

    for (let c = 1; c <= 11; c++) {
      const cell = r.getCell(c);
      cell.font = dataFont;
      cell.border = defaultBorder;
      if ([3, 4, 5, 11].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([6, 7, 8, 9, 10].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    }
  });

  wsLive.columns = [
    { width: 22 }, // Mô hình
    { width: 28 }, // Đội ngũ
    { width: 18 }, // Giờ/ca
    { width: 16 }, // Số phiên
    { width: 16 }, // Tổng giờ
    { width: 18 }, // Phí host
    { width: 22 }, // Setup
    { width: 22 }, // Tổng ngân sách
    { width: 22 }, // Target NMV
    { width: 18 }, // NMV/giờ
    { width: 16 }  // CIR
  ];

  // -------------------------------------------------------------
  // SHEET 5: TEMPLATE INPUT PLAN TUẦN (FILE 4.1.1)
  // -------------------------------------------------------------
  const ws411 = workbook.addWorksheet('5. Template Input Plan 4.1.1', {
    views: [{ showGridLines: true }]
  });

  ws411.mergeCells('B2:O2');
  ws411.getCell('B2').value = 'BIỂU MẪU NHẬP LIỆU KẾ HOẠCH TUẦN CHI TIẾT (CHUẨN SHEET 4.1.1)';
  ws411.getCell('B2').font = titleFont;
  ws411.getRow(2).height = 26;

  ws411.mergeCells('B3:O3');
  ws411.getCell('B3').value = 'Dành cho Booking PIC & Content Creator lập kế hoạch phân bổ chi tiết theo tuần và chiến dịch lớn';
  ws411.getCell('B3').font = subtitleFont;

  const h411 = [
    'Mã Kế Hoạch', 'Gian Hàng', 'Tuần Kế Hoạch', 'Tháng / Năm', 'Ngân Sách Tuần',
    'Số KL1 (FOC)', 'Số KL2 (Aff)', 'Số KL3 (Micro)', 'Số KL4 (Macro)', 'Số KL5 (Macro+)', 'Số KL6 (Celeb)', 'Số KL7 (Ambassador)',
    'Tổng Số KOC', 'Mục Tiêu GMV Tuần', 'Ghi Chú Chiến Lược'
  ];

  const r411_5 = ws411.getRow(5);
  r411_5.height = 26;
  h411.forEach((h, idx) => {
    const c = r411_5.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerDark } };
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = defaultBorder;
  });

  const sample411 = [
    { id: 'PL-411-W1-SENKA', store: 'Senka Official Store', week: 'Tuần 1 (01-07/10)', m: '10/2026', bud: 22000000, kl1: 10, kl2: 6, kl3: 3, kl4: 1, kl5: 0, kl6: 0, kl7: 0, gmv: 95000000, note: 'Khởi động tháng, tập trung phủ sample KOC hạt giống' },
    { id: 'PL-411-W2-SENKA', store: 'Senka Official Store', week: 'Tuần 2 (Mega 10.10)', m: '10/2026', bud: 50000000, kl1: 15, kl2: 10, kl3: 5, kl4: 2, kl5: 1, kl6: 1, kl7: 0, gmv: 260000000, note: 'Đỉnh điểm chiến dịch Mega 10.10, đẩy mạnh Celeb và Spark Ads' },
    { id: 'PL-411-W3-SENKA', store: 'Senka Official Store', week: 'Tuần 3 (15-21/10)', m: '10/2026', bud: 15000000, kl1: 8, kl2: 5, kl3: 2, kl4: 1, kl5: 0, kl6: 0, kl7: 0, gmv: 70000000, note: 'Duy trì nhịp bán hàng hậu Mega, tập trung review trải nghiệm' },
    { id: 'PL-411-W4-SENKA', store: 'Senka Official Store', week: 'Tuần 4 (Payday 25-31)', m: '10/2026', bud: 18000000, kl1: 7, kl2: 4, kl3: 2, kl4: 0, kl5: 1, kl6: 0, kl7: 0, gmv: 75000000, note: 'Đẩy số đợt lương về (Payday), đẩy mạnh voucher sàn' }
  ];

  sample411.forEach((w, i) => {
    const rowIdx = 6 + i;
    const r = ws411.getRow(rowIdx);
    r.height = 22;

    r.getCell(1).value = w.id;
    r.getCell(2).value = w.store;
    r.getCell(3).value = w.week;
    r.getCell(4).value = w.m;
    r.getCell(5).value = w.bud;
    r.getCell(5).numFmt = '#,##0';

    r.getCell(6).value = w.kl1;
    r.getCell(7).value = w.kl2;
    r.getCell(8).value = w.kl3;
    r.getCell(9).value = w.kl4;
    r.getCell(10).value = w.kl5;
    r.getCell(11).value = w.kl6;
    r.getCell(12).value = w.kl7;

    r.getCell(13).value = { formula: `SUM(F${rowIdx}:L${rowIdx})` };
    r.getCell(14).value = w.gmv;
    r.getCell(14).numFmt = '#,##0';
    r.getCell(15).value = w.note;

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

  ws411.columns = [
    { width: 18 }, // Mã
    { width: 24 }, // Store
    { width: 22 }, // Tuần
    { width: 14 }, // Tháng
    { width: 18 }, // Ngân sách
    { width: 12 }, // KL1
    { width: 12 }, // KL2
    { width: 12 }, // KL3
    { width: 12 }, // KL4
    { width: 12 }, // KL5
    { width: 12 }, // KL6
    { width: 14 }, // KL7
    { width: 14 }, // Tổng KOC
    { width: 20 }, // GMV Tuần
    { width: 36 }  // Ghi chú
  ];

  const planExportPath = path.resolve('E:/Upbase/B2C/Bang_Ke_Hoach_Thang_4_Chung_4.1.xlsx');
  await workbook.xlsx.writeFile(planExportPath);
  console.log('SUCCESS: Plan Order Workbook created at', planExportPath);
}

async function runGenerators() {
  await createEvaluationWorkbook();
  await createPlanOrderWorkbook();
}

runGenerators().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

