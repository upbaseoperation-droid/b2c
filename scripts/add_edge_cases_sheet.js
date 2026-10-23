const fs = require('fs');
const readline = require('readline');
const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function addEdgeCasesSheet() {
  console.log('=== BẮT ĐẦU TẠO SHEET EDGE CASES & CÁC TRƯỜNG HỢP BẤT THƯỜNG ===');
  const filePath = path.resolve('E:/Upbase/B2C/Master_KOC_UpAffiliate_ERD_Template.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  // Xóa sheet cũ nếu đã tồn tại
  const existingSheet = wb.getWorksheet('Edge_Cases_Bat_Thuong');
  if (existingSheet) {
    wb.removeWorksheet(existingSheet.id);
  }

  const ws = wb.addWorksheet('Edge_Cases_Bat_Thuong', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 20 }]
  });

  const wsMaster = wb.getWorksheet('Master_KOC_Template_ERD');

  // Thu thập dữ liệu bất thường từ Sheet 1
  const edgeCaseDetails = [];

  // Map STK -> channels
  const stkMap = new Map();
  // Map CCCD -> channels
  const cccdMap = new Map();

  wsMaster.eachRow((row, r) => {
    if (r <= 2) return;
    const cid = (row.getCell(2).text || '').trim();
    if (!cid) return;

    const realName = (row.getCell(4).text || '').trim();
    const pic = (row.getCell(7).text || '').trim();
    const workedPicsCount = typeof row.getCell(11).value === 'number' ? row.getCell(11).value : parseInt(row.getCell(11).text) || 0;
    const workedPicsList = (row.getCell(12).text || '').trim();
    const cccdFlag = (row.getCell(13).text || '').trim();
    const cccdCount = typeof row.getCell(14).value === 'number' ? row.getCell(14).value : parseInt(row.getCell(14).text) || 0;
    const allCccds = (row.getCell(15).text || '').trim();
    const sharedInfo = (row.getCell(16).text || '').trim();

    const cccd = (row.getCell(30).text || '').trim();
    const mst = (row.getCell(31).text || '').trim();
    const bankAccountName = (row.getCell(32).text || '').trim();
    const bankAccount = (row.getCell(33).text || '').trim();
    const bankName = (row.getCell(34).text || '').trim();
    const taxType = (row.getCell(35).text || '').trim();

    const rateRecent = typeof row.getCell(46).value === 'number' ? row.getCell(46).value : parseFloat(row.getCell(46).text) || 0;
    const rateMin = typeof row.getCell(47).value === 'number' ? row.getCell(47).value : parseFloat(row.getCell(47).text) || 0;
    const rateMax = typeof row.getCell(48).value === 'number' ? row.getCell(48).value : parseFloat(row.getCell(48).text) || 0;
    const totalCost = typeof row.getCell(51).value === 'number' ? row.getCell(51).value : parseFloat(row.getCell(51).text) || 0;

    // Track STK
    if (bankAccount) {
      const cleanStk = bankAccount.replace(/[\s\.\-\/\:]/g, '');
      if (cleanStk.length >= 6) {
        if (!stkMap.has(cleanStk)) stkMap.set(cleanStk, []);
        stkMap.get(cleanStk).push({ cid, realName: bankAccountName || realName, bank: bankName, pic });
      }
    }

    // Track CCCD
    if (cccd) {
      const cleanCccd = cccd.replace(/[\s\.\-\/\:]/g, '');
      if (cleanCccd.length >= 8) {
        if (!cccdMap.has(cleanCccd)) cccdMap.set(cleanCccd, []);
        cccdMap.get(cleanCccd).push({ cid, realName, pic });
      }
    }

    // EC-01: KOC có nhiều hơn 1 CCCD
    if (cccdCount > 1) {
      edgeCaseDetails.push({
        cid,
        realName: realName || bankAccountName,
        pic,
        code: 'EC-01: KOC có > 1 CCCD',
        risk: '🔴 Nghiêm trọng',
        detail: `Ghi nhận ${cccdCount} số CCCD khác nhau qua các đợt: [${allCccds}]`,
        action: 'Kế toán/Pháp chế yêu cầu KOC chụp 2 mặt CCCD chính chủ mới nhất để chốt duy nhất 1 mã định danh.'
      });
    }

    // EC-04: Xung đột nhiều PIC (Dẫm chân >= 5 PIC)
    if (workedPicsCount >= 5) {
      edgeCaseDetails.push({
        cid,
        realName: realName || bankAccountName,
        pic,
        code: 'EC-04: Xung đột nhiều PIC (>=5 PIC)',
        risk: '🟠 Rủi ro cao',
        detail: `KOC từng làm việc với ${workedPicsCount} chuyên viên khác nhau: ${workedPicsList}`,
        action: 'Lead Booking chỉ định duy nhất 1 PIC chính (Key PIC) làm đầu mối đàm phán, tránh bị KOC ép giá chênh lệch.'
      });
    }

    // EC-05: Biến động đơn giá cực đoan (Max >= 5 lần Min)
    if (rateMin > 0 && rateMax > 0 && rateMax >= rateMin * 5) {
      const ratio = (rateMax / rateMin).toFixed(1);
      edgeCaseDetails.push({
        cid,
        realName: realName || bankAccountName,
        pic,
        code: 'EC-05: Biến động giá cực đoan',
        risk: '🟡 Trung bình',
        detail: `Đơn giá Min: ${rateMin.toLocaleString('vi-VN')}₫ vs Max: ${rateMax.toLocaleString('vi-VN')}₫ (Chênh lệch ${ratio} lần)`,
        action: 'Xác minh lại phạm vi công việc giữa các đợt: video có cast riêng hay gói trọn gói, tránh áp nhầm khung lương KL.'
      });
    }

    // EC-06: Định dạng CCCD bất thường (chứa chữ cái hoặc ký tự rác)
    if (cccd) {
      const clean = cccd.replace(/[\s\.\-\/\:]/g, '');
      if (/[a-zA-Z]/.test(clean) || (clean.length < 9 && clean.length > 0)) {
        edgeCaseDetails.push({
          cid,
          realName: realName || bankAccountName,
          pic,
          code: 'EC-06: Ký tự CCCD bất thường/lỗi',
          risk: '🔴 Nghiêm trọng',
          detail: `Chuỗi CCCD ghi nhận: "${cccd}" (Chứa chữ cái hoặc không đủ 9/12 số chuẩn)`,
          action: 'Yêu cầu PIC liên hệ cập nhật lại số CCCD chuẩn trước kỳ quyết toán thuế TNCN.'
        });
      }
    }
  });

  // EC-02: Dùng chung STK & EC-03: Trùng STK khác tên chủ TK
  stkMap.forEach((channels, stk) => {
    if (channels.length > 1) {
      const distinctNames = new Set(channels.map(x => (x.realName || '').toLowerCase().trim()).filter(Boolean));
      if (distinctNames.size > 1) {
        // EC-03: Trùng STK nhưng KHÁC TÊN
        channels.forEach(ch => {
          edgeCaseDetails.push({
            cid: ch.cid,
            realName: ch.realName,
            pic: ch.pic,
            code: 'EC-03: Trùng STK nhưng Khác Tên Chủ TK',
            risk: '🔴 Nghiêm trọng (Rủi ro chuyển nhầm)',
            detail: `Số TK ${stk} (${ch.bank}) được dùng cho các KOC khác nhau: [${Array.from(distinctNames).join(' vs ')}]`,
            action: 'Kế toán chặn chuyển tiền tự động, kiểm tra giấy ủy quyền nhận tiền hoặc xác thực chính chủ tài khoản.'
          });
        });
      } else {
        // EC-02: Dùng chung STK (cùng chủ / MCN)
        channels.forEach(ch => {
          edgeCaseDetails.push({
            cid: ch.cid,
            realName: ch.realName,
            pic: ch.pic,
            code: 'EC-02: Kênh dùng chung STK Ngân hàng',
            risk: '🟡 Trung bình',
            detail: `STK ${stk} (${ch.bank}) được dùng chung bởi ${channels.length} kênh: ${channels.map(x => x.cid).join(', ')}`,
            action: 'Xác nhận KOC sở hữu nhiều kênh hoặc qua đơn vị quản lý MCN để gom chung 1 phụ lục thanh toán.'
          });
        });
      }
    }
  });

  // EC-08: Dùng chung CCCD qua nhiều kênh
  cccdMap.forEach((channels, cccd) => {
    if (channels.length > 1) {
      channels.forEach(ch => {
        edgeCaseDetails.push({
          cid: ch.cid,
          realName: ch.realName,
          pic: ch.pic,
          code: 'EC-08: Dùng chung CCCD trên nhiều kênh',
          risk: '🟡 Trung bình',
          detail: `Số CCCD ${cccd} khai báo cho ${channels.length} kênh khác nhau: ${channels.map(x => x.cid).join(', ')}`,
          action: 'Kiểm tra xem đây là cùng 1 Creator có nhiều nick phụ hay qua công ty quản lý.'
        });
      });
    }
  });

  console.log(`Tổng số bản ghi Edge Cases được phát hiện: ${edgeCaseDetails.length}`);

  // --- THIẾT KẾ GIAO DIỆN SHEET 3 ---
  // Tiêu đề Sheet 3
  ws.mergeCells('A1:G1');
  const tCell = ws.getCell('A1');
  tCell.value = 'HỒ SƠ CÁC TRƯỜNG HỢP BẤT THƯỜNG (EDGE CASES) & RỦI RO VẬN HÀNH BOOKING B2C';
  tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF991B1B' } };
  tCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 35;

  // PHẦN 1: MA TRẬN 8 NHÓM EDGE CASES
  ws.getCell('A3').value = 'I. MA TRẬN PHÂN LOẠI & QUY TẮC XỬ LÝ 8 NHÓM TRƯỜNG HỢP BẤT THƯỜNG (EDGE CASES)';
  ws.getCell('A3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

  ws.getRow(4).values = [
    'Mã EC',
    'Tên Trường Hợp Bất Thường',
    'Phân Loại Rủi Ro',
    'Số Lượng KOC/Bản Ghi',
    'Mức Độ Nghiêm Trọng',
    'Nguyên Nhân Nghiệp Vụ Thực Tế',
    'Quy Tắc Xử Lý Chuẩn Trong Hệ Thống UpAffiliate / B2C'
  ];
  ws.getRow(4).height = 28;
  ws.getRow(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 7; c++) {
    ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    ws.getCell(4, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const matrixRows = [
    [
      'EC-01',
      'KOC có nhiều hơn 1 CCCD khác nhau',
      'Pháp lý & Thuế',
      161,
      '🔴 Nghiêm trọng',
      'KOC đổi từ CMND 9 số sang CCCD 12 số, hoặc dùng CCCD của người thân/trợ lý ở các hợp đồng khác nhau.',
      'Khóa tài khoản thanh toán tự động; yêu cầu PIC gửi ảnh CCCD 2 mặt mới nhất để chốt 1 định danh duy nhất trước khi làm ĐNTT.'
    ],
    [
      'EC-02',
      'Nhiều kênh dùng chung 1 STK Ngân hàng',
      'Thanh toán & MCN',
      127,
      '🟡 Trung bình',
      'Creator sở hữu nhiều kênh nội dung (kênh chính + kênh phụ), hoặc các KOC thuộc cùng 1 công ty MCN quản lý nhận tiền tập trung.',
      'Cho phép gom nhiều BO của các kênh này vào cùng 1 phụ lục hợp đồng SOW tháng để thanh toán 1 lần theo quy tắc BR-04.'
    ],
    [
      'EC-03',
      'Trùng Số Tài Khoản nhưng Khác Tên Chủ TK',
      'Thanh toán & Rủi ro sai tiền',
      6,
      '🔴 Nghiêm trọng',
      'Nhân sự gõ nhầm số tài khoản của KOC này sang KOC khác, hoặc mượn tài khoản của bên thứ ba không có giấy ủy quyền.',
      'Cảnh báo đỏ trên giao diện duyệt chi; Kế toán tạm dừng chuyển khoản đến khi có xác nhận chính thức từ KOC.'
    ],
    [
      'EC-04',
      'Xung đột nhiều PIC (KOC từng làm việc >= 5 PIC)',
      'Vận hành & Handoff',
      260,
      '🟠 Cao',
      'KOC làm việc qua nhiều tháng/brand khác nhau nên mỗi kỳ lại có 1 chuyên viên mới liên hệ (tối đa tới 15 PIC).',
      'Hệ thống tự động hiển thị "PIC phụ trách gần nhất" và "Danh sách các PIC từng làm việc"; tự động gán Key PIC để tránh bị hớ giá.'
    ],
    [
      'EC-05',
      'Biến động đơn giá cực đoan (Max >= 5 lần Min)',
      'Tài chính & Khung lương',
      1665,
      '🟡 Trung bình',
      'KOC vừa nhận suất gửi mẫu miễn phí (FOC 0đ) vừa nhận gói Paid, hoặc giá tăng vọt khi view tăng đột biến qua các thời kỳ.',
      'Tách bạch rõ giá Paid và suất FOC; kiểm tra trần chi phí KL1-KL7 của nhãn hàng trước khi chốt deal (BRD mục 7.1).'
    ],
    [
      'EC-06',
      'Ký tự CCCD bất thường (Chứa chữ hoặc ký tự rác)',
      'Chất lượng Dữ liệu',
      15,
      '🔴 Nghiêm trọng',
      'Nhân sự gõ nhầm chữ cái hoặc ký tự thử nghiệm (như "ưefwefwf", ký tự dấu chấm, khoảng trắng thừa) vào ô CCCD.',
      'Đặt bộ lọc Regex kiểm tra tự động `^[0-9]{9}$|^[0-9]{12}$`; chặn lưu dữ liệu rác vào CSDL.'
    ],
    [
      'EC-07',
      'Đối soát tạm ứng & thanh toán bất thường',
      'Kế toán & Thu chi hộ',
      160,
      '🟠 Cao',
      'Số tiền tạm ứng thực tế không khớp với thù lao nghiệm thu sau khi trừ phạt vi phạm hoặc hủy hạng mục phụ Wave 1.',
      'Tự động phân bổ lại tỷ trọng chi phí và khấu trừ phần việc bị hủy khỏi đợt quyết toán cuối kỳ theo quy chuẩn BRD 7.4.'
    ],
    [
      'EC-08',
      'Dùng chung số CCCD trên nhiều kênh',
      'Pháp lý & Thuế',
      22,
      '🟡 Trung bình',
      'Creator mở nhiều nick TikTok để đăng nội dung chéo (reup/cross-post), kê khai cùng 1 mã số thuế cá nhân.',
      'Hệ thống liên kết các kênh mạng xã hội về cùng 1 hồ sơ Master KOC độc lập (theo thiết kế HUB-2.4 & shared-104).'
    ],
  ];

  matrixRows.forEach((r, idx) => {
    const row = ws.addRow(r);
    row.height = 36;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { bold: true };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).font = { bold: true };
    row.getCell(6).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(7).alignment = { wrapText: true, vertical: 'middle' };

    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    }
  });

  // PHẦN 2: DANH SÁCH CHI TIẾT TỪNG BẢN GHI BẤT THƯỜNG
  const detailStart = ws.rowCount + 3;
  ws.getCell(`A${detailStart - 1}`).value = `II. DANH SÁCH CHI TIẾT ${edgeCaseDetails.length} TRƯỜNG HỢP BẤT THƯỜNG CẦN XỬ LÝ (SẮP XẾP THEO MỨC ĐỘ RỦI RO)`;
  ws.getCell(`A${detailStart - 1}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF991B1B' } };

  ws.getRow(detailStart).values = [
    'STT',
    'Mã Kênh TikTok (*channelId)',
    'Tên KOC / Chủ Tài Khoản',
    'PIC Phụ Trách Gần Nhất',
    'Loại Trường Hợp Bất Thường',
    'Mức Độ Rủi Ro',
    'Chi Tiết Dữ Liệu Bất Thường',
    'Hành Động Khuyến Nghị Cần Xử Lý'
  ];
  ws.getRow(detailStart).height = 28;
  ws.getRow(detailStart).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 8; c++) {
    ws.getCell(detailStart, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    ws.getCell(detailStart, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Sắp xếp: Rủi ro Nghiêm trọng -> Cao -> Trung bình
  const riskPriority = { '🔴 Nghiêm trọng': 1, '🔴 Nghiêm trọng (Rủi ro chuyển nhầm)': 1, '🟠 Cao': 2, '🟠 Rủi ro cao': 2, '🟡 Trung bình': 3 };
  edgeCaseDetails.sort((a, b) => (riskPriority[a.risk] || 99) - (riskPriority[b.risk] || 99));

  edgeCaseDetails.forEach((item, idx) => {
    const row = ws.addRow([
      idx + 1,
      item.cid,
      item.realName || '—',
      item.pic || 'Chưa có PIC',
      item.code,
      item.risk,
      item.detail,
      item.action
    ]);
    row.height = 22;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { bold: true };
    row.getCell(2).alignment = { vertical: 'middle' };
    row.getCell(3).alignment = { vertical: 'middle' };
    row.getCell(4).alignment = { vertical: 'middle' };
    row.getCell(5).alignment = { vertical: 'middle' };
    row.getCell(5).font = { bold: true };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).font = { bold: true };
    row.getCell(7).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(8).alignment = { wrapText: true, vertical: 'middle' };

    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  // Auto-filter cho bảng chi tiết
  ws.autoFilter = {
    from: { row: detailStart, column: 1 },
    to: { row: ws.rowCount, column: 8 }
  };

  // Căn chỉnh độ rộng cột
  ws.columns = [
    { width: 8 },
    { width: 25 },
    { width: 30 },
    { width: 25 },
    { width: 35 },
    { width: 20 },
    { width: 50 },
    { width: 55 },
  ];

  console.log('Đang lưu tệp Excel...');
  await wb.xlsx.writeFile(filePath);
  console.log('=== HOÀN TẤT THÊM SHEET EDGE CASES THÀNH CÔNG! ===');
}

addEdgeCasesSheet().catch(console.error);
