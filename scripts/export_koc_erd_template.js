const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function generateKocErdTemplate() {
  console.log('--- 1. BẮT ĐẦU ĐỌC DỮ LIỆU TỪ LARK & FILE CHUẨN HÓA ---');
  
  // 1. Đọc bảng 3.4 KOCs tổng hợp
  console.log('Đang đọc B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx...');
  const wb34 = new ExcelJS.Workbook();
  await wb34.xlsx.readFile('./B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx');
  const ws34 = wb34.worksheets[0];
  const map34 = new Map();
  ws34.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const channelId = (row.getCell(1).text || '').trim().toLowerCase();
    if (!channelId) return;
    map34.set(channelId, {
      email: (row.getCell(5).text || '').trim(),
      zalo: (row.getCell(6).text || '').trim(),
      otherContact: (row.getCell(7).text || '').trim(),
      followers: typeof row.getCell(25).value === 'number' ? row.getCell(25).value : parseFloat(row.getCell(25).text) || 0,
      avgViews: typeof row.getCell(31).value === 'number' ? row.getCell(31).value : parseFloat(row.getCell(31).text) || 0,
      maleRatio: row.getCell(20).value,
      femaleRatio: row.getCell(21).value,
      age18_24: row.getCell(22).value,
      age25_34: row.getCell(23).value,
      age35Plus: row.getCell(24).value,
      gmvVideoRatio: row.getCell(28).value,
      gmvLiveRatio: row.getCell(29).value,
      gmvProductCardRatio: row.getCell(30).value,
      top1Category: (row.getCell(42).text || '').trim(),
      top2Category: (row.getCell(44).text || '').trim(),
      kocScore: row.getCell(48).text || row.getCell(48).value || '',
      pic34: (row.getCell(46).text || row.getCell(11).text || '').trim(),
      brand34: (row.getCell(13).text || '').trim(),
      lastAirDate34: (row.getCell(17).text || '').trim(),
      gmvBestCase: typeof row.getCell(18).value === 'number' ? row.getCell(18).value : parseFloat(row.getCell(18).text) || 0,
    });
  });
  console.log(`Đã nạp ${map34.size} KOC từ bảng 3.4.`);

  // 2. Đọc bảng 3.2 List duyệt book (để bổ sung Tệp kênh, Segment, KOC category, Pillar)
  console.log('Đang đọc B2C_Quản lý Booking_3.2 List duyệt book.xlsx...');
  const wb32 = new ExcelJS.Workbook();
  await wb32.xlsx.readFile('./B2C_Quản lý Booking_3.2 List duyệt book.xlsx');
  const ws32 = wb32.worksheets[0];
  const map32 = new Map();
  ws32.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const channelId = (row.getCell(2).text || '').trim().toLowerCase();
    if (!channelId) return;
    const tepKenh = (row.getCell(37).text || '').trim();
    const segment = (row.getCell(82).text || '').trim();
    const kocCat = (row.getCell(88).text || '').trim();
    const pillar = (row.getCell(89).text || '').trim();
    const pic32 = (row.getCell(5).text || row.getCell(34).text || '').trim();

    const existing = map32.get(channelId);
    if (!existing) {
      map32.set(channelId, { tepKenh, segment, kocCat, pillar, pic32 });
    } else {
      if (!existing.tepKenh && tepKenh) existing.tepKenh = tepKenh;
      if (!existing.segment && segment) existing.segment = segment;
      if (!existing.kocCat && kocCat) existing.kocCat = kocCat;
      if (!existing.pillar && pillar) existing.pillar = pillar;
      if (!existing.pic32 && pic32) existing.pic32 = pic32;
    }
  });
  console.log(`Đã nạp ${map32.size} kênh từ bảng 3.2.`);

  // 3. Đọc Master KOC chuẩn hóa
  console.log('Đang đọc Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx...');
  const wbMaster = new ExcelJS.Workbook();
  await wbMaster.xlsx.readFile('./Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx');
  const wsMaster = wbMaster.getWorksheet('1_Master_KOC_KOL_ChuanHoa');

  // Khởi tạo Workbook đầu ra
  const outWb = new ExcelJS.Workbook();
  outWb.creator = 'UpBase B2C Ops Hub & UpAffiliate Engine';
  outWb.created = new Date();

  // Sheet 1: Master_KOC_Data
  const wsOut = outWb.addWorksheet('Master_KOC_Template_ERD', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }]
  });

  // Cấu hình Cột & Định danh Nhóm
  // Row 1: Tiêu đề Nhóm (Group Headers)
  // Row 2: Tiêu đề Cột kỹ thuật & ERD (Column Headers)
  const columnsDef = [
    // Nhóm 1: ĐỊNH DANH KOC (Entity: KocProfile)
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'STT', key: 'stt', width: 8, align: 'center' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Mã Kênh [channelId] (*Khóa chính)', key: 'channelId', width: 22, align: 'left', bold: true },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Tên Kênh / Nghệ Danh [stageName]', key: 'stageName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Họ Tên Thật / Chủ TK [realName]', key: 'realName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Link Kênh TikTok [channelUrl]', key: 'channelUrl', width: 32, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Nền Tảng [mainChannel]', key: 'platform', width: 14, align: 'center' },

    // Nhóm 2: VẬN HÀNH & PIC PHỤ TRÁCH (RẤT QUAN TRỌNG THEO YÊU CẦU)
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: '🌟 PIC HỢP TÁC GẦN NHẤT [latestAssignedPic]', key: 'latestAssignedPic', width: 25, align: 'left', highlight: true },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Tháng/Ngày Book Gần Nhất [latestCollabDate]', key: 'latestCollabDate', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Brand Hợp Tác Gần Nhất [latestBrand]', key: 'latestBrand', width: 22, align: 'left' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Mã BO Gần Nhất [latestBoCode]', key: 'latestBoCode', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Số PIC Từng Làm Việc [workedPicsCount]', key: 'workedPicsCount', width: 15, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Danh Sách PIC Từng Làm Việc [workedPicsList]', key: 'workedPicsList', width: 35, align: 'left' },

    // Nhóm 3: PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ (THEO YÊU CẦU NGƯỜI DÙNG)
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: '🌟 PHÂN LOẠI THIẾU THÔNG TIN [missingInfoCategory]', key: 'missingCategory', width: 32, align: 'left', highlight: true },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Chi Tiết Các Trường Bị Thiếu [missingFieldsDetail]', key: 'missingFields', width: 35, align: 'left' },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Trạng Thái Hồ Sơ Gốc [rawProfileStatus]', key: 'rawProfileStatus', width: 22, align: 'center' },

    // Nhóm 4: PHÂN HẠNG & TỆP KÊNH (Entity: Taxonomy & Catalog)
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Khung Lương [salaryGrade / KL]', key: 'salaryGrade', width: 15, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Phân Nhóm [segment]', key: 'segment', width: 18, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Tệp Kênh Chuẩn [tepKenh]', key: 'tepKenh', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 1 [kocCategory]', key: 'kocCategory', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 2', key: 'top2Category', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Trụ Cột Nội Dung [pillarContent]', key: 'pillar', width: 20, align: 'left' },

    // Nhóm 5: LIÊN HỆ & HẬU CẦN GỬI MẪU
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Số Điện Thoại / Zalo [phone / zalo]', key: 'zalo', width: 18, align: 'center' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Email [email]', key: 'email', width: 26, align: 'left' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Phương Thức Liên Hệ Khác [otherContactMethod]', key: 'otherContact', width: 22, align: 'left' },

    // Nhóm 6: PHÁP LÝ & TÀI KHOẢN CHI TRẢ (Entity: Contract & Legal)
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số CCCD / CMND [cccd]', key: 'cccd', width: 18, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Mã Số Thuế [taxCode]', key: 'taxCode', width: 16, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Tên Chủ Tài Khoản [bankAccountName]', key: 'bankAccountName', width: 25, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số Tài Khoản (STK) [bankAccount]', key: 'bankAccount', width: 20, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Ngân Hàng [bankName]', key: 'bankName', width: 18, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Loại Tài Khoản Thuế [taxAccountType]', key: 'taxAccountType', width: 25, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Link Hợp Đồng Drive [contractDriveUrl]', key: 'contractDriveUrl', width: 32, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'MCN / Dùng Chung CCCD [mcnGroup]', key: 'mcnGroup', width: 22, align: 'left' },

    // Nhóm 7: CHỈ SỐ KÊNH (Entity: Kalodata & Platform Metrics)
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Followers [followersCount]', key: 'followers', width: 15, align: 'right', format: '#,##0' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Views Trung Bình [avgViews]', key: 'avgViews', width: 15, align: 'right', format: '#,##0' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ Nam [maleRatio]', key: 'maleRatio', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ Nữ [femaleRatio]', key: 'femaleRatio', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Độ Tuổi 18-24', key: 'age18_24', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Độ Tuổi 25-34', key: 'age25_34', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Độ Tuổi > 35', key: 'age35Plus', width: 14, align: 'right' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ GMV Video', key: 'gmvVideoRatio', width: 15, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ GMV Livestream', key: 'gmvLiveRatio', width: 15, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Điểm Đánh Giá KOC [reliabilityScore]', key: 'kocScore', width: 15, align: 'center' },

    // Nhóm 8: LỊCH SỬ BOOKING & ĐƠN GIÁ (Entity: BookingDeal Metrics)
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Gần Nhất [rateCardVideo]', key: 'rateCardVideo', width: 18, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Min [rateCardMin]', key: 'rateCardMin', width: 16, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Max [rateCardMax]', key: 'rateCardMax', width: 16, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Video Paid [totalPaidVideos]', key: 'totalPaidVideos', width: 15, align: 'right', format: '#,##0' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Video FOC [totalFocVideos]', key: 'totalFocVideos', width: 15, align: 'right', format: '#,##0' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Chi Phí Đã Chi [totalPastCost]', key: 'totalPastCost', width: 20, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng GMV 30d [totalPastGmv]', key: 'totalPastGmv', width: 20, align: 'right', format: '#,##0 "₫"' },
  ];

  // Màu sắc nhóm Header Row 1
  const groupColors = {
    'ĐỊNH DANH KOC (KocProfile)': { fill: '1E3A8A', font: 'FFFFFF' },             // Xanh dương đậm
    'VẬN HÀNH & PIC PHỤ TRÁCH': { fill: 'B45309', font: 'FFFFFF' },               // Cam đậm (Nổi bật)
    'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ': { fill: '991B1B', font: 'FFFFFF' },       // Đỏ mận (Cảnh báo thông tin thiếu)
    'PHÂN HẠNG & TỆP KÊNH': { fill: '374151', font: 'FFFFFF' },                   // Xám than
    'LIÊN HỆ & HẬU CẦN': { fill: '065F46', font: 'FFFFFF' },                       // Xanh lá đậm
    'PHÁP LÝ & CHI TRẢ': { fill: '4C1D95', font: 'FFFFFF' },                       // Tím thẫm
    'CHỈ SỐ KÊNH (KALODATA)': { fill: '1E293B', font: 'FFFFFF' },                  // Slate
    'LỊCH SỬ BOOKING & ĐƠN GIÁ': { fill: '0F766E', font: 'FFFFFF' },              // Teal
  };

  // Thiết lập Header dòng 1 (Nhóm) và dòng 2 (Cột)
  const row1Values = [];
  const row2Values = [];

  columnsDef.forEach((col, idx) => {
    row1Values[idx + 1] = col.group;
    row2Values[idx + 1] = col.header;
    wsOut.getColumn(idx + 1).width = col.width;
  });

  wsOut.getRow(1).values = row1Values;
  wsOut.getRow(2).values = row2Values;
  wsOut.getRow(1).height = 26;
  wsOut.getRow(2).height = 34;

  // Merge cell cho Row 1 theo từng nhóm
  let startCol = 1;
  while (startCol <= columnsDef.length) {
    const curGroup = columnsDef[startCol - 1].group;
    let endCol = startCol;
    while (endCol < columnsDef.length && columnsDef[endCol].group === curGroup) {
      endCol++;
    }
    if (endCol > startCol) {
      wsOut.mergeCells(1, startCol, 1, endCol);
    }
    const cell = wsOut.getCell(1, startCol);
    const color = groupColors[curGroup] || { fill: '333333', font: 'FFFFFF' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + color.fill }
    };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + color.font } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    startCol = endCol + 1;
  }

  // Định dạng Header Row 2
  for (let c = 1; c <= columnsDef.length; c++) {
    const cell = wsOut.getCell(2, c);
    const colDef = columnsDef[c - 1];
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colDef.highlight ? 'FFFDE047' : 'FFF3F4F6' } // Vàng nhạt nếu là cột highlight PIC / Thiếu hồ sơ
    };
    cell.font = { 
      name: 'Arial', 
      size: 9.5, 
      bold: true, 
      color: { argb: colDef.highlight ? 'FF78350F' : 'FF1F2937' } 
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium', color: { argb: 'FF6B7280' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
  }

  // --- 4. TIẾN HÀNH DUYỆT VÀ ĐIỀN DỮ LIỆU ---
  console.log('--- Đang tính toán phân loại thông tin thiếu và mapping dữ liệu ---');
  
  // Bộ đếm thống kê cho Sheet 2
  const stats = {
    totalKoc: 0,
    fullyCompleted: 0,
    missingLegal: 0,
    missingBank: 0,
    missingLegalAndBank: 0,
    missingContactOnly: 0,
    rawNoProfile: 0,
    missingCategory: 0,
    missingRateCard: 0,
    picStats: {}, // PIC -> { total, full, missing }
  };

  let rowCounter = 2; // Bắt đầu ghi từ row 3

  wsMaster.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    stats.totalKoc++;
    rowCounter++;

    const channelId = (row.getCell(2).text || '').trim();
    const channelIdLower = channelId.toLowerCase();
    const linkKenh = (row.getCell(3).text || '').trim();
    const nenTang = (row.getCell(4).text || 'TikTok').trim();
    const phanHangKl = (row.getCell(5).text || '').trim();
    const rawStatus = (row.getCell(7).text || '').trim();
    const cccd = (row.getCell(8).text || '').trim();
    const mst = (row.getCell(9).text || '').trim();
    const tenChuTk = (row.getCell(10).text || '').trim();
    const stk = (row.getCell(11).text || '').trim();
    const nganHang = (row.getCell(12).text || '').trim();
    const loaiTkThue = (row.getCell(13).text || '').trim();
    
    // PIC và lịch sử làm việc từ Master
    let latestPic = (row.getCell(14).text || '').trim();
    const latestCollabDate = (row.getCell(15).text || '').trim();
    const latestBrand = (row.getCell(16).text || '').trim();
    const latestBoCode = (row.getCell(17).text || '').trim();
    const workedPicsCount = row.getCell(18).value || 0;
    const workedPicsList = (row.getCell(19).text || '').trim();

    const donGiaGanNhat = typeof row.getCell(20).value === 'number' ? row.getCell(20).value : parseFloat(row.getCell(20).text) || 0;
    const donGiaMin = typeof row.getCell(21).value === 'number' ? row.getCell(21).value : parseFloat(row.getCell(21).text) || 0;
    const donGiaMax = typeof row.getCell(22).value === 'number' ? row.getCell(22).value : parseFloat(row.getCell(22).text) || 0;
    const tongVideoPaid = typeof row.getCell(23).value === 'number' ? row.getCell(23).value : parseInt(row.getCell(23).text) || 0;
    const tongVideoFoc = typeof row.getCell(24).value === 'number' ? row.getCell(24).value : parseInt(row.getCell(24).text) || 0;
    const tongChiPhi = typeof row.getCell(25).value === 'number' ? row.getCell(25).value : parseFloat(row.getCell(25).text) || 0;
    const tongGmv30d = typeof row.getCell(26).value === 'number' ? row.getCell(26).value : parseFloat(row.getCell(26).text) || 0;
    const mcnGroup = (row.getCell(27).text || '').trim();
    const linkHopDong = (row.getCell(28).text || '').trim();

    // Dữ liệu bổ sung từ 3.4
    const data34 = map34.get(channelIdLower) || {};
    const zalo = data34.zalo || '';
    const email = data34.email || '';
    const otherContact = data34.otherContact || '';
    const followers = data34.followers || 0;
    const avgViews = data34.avgViews || 0;
    const maleRatio = data34.maleRatio || null;
    const femaleRatio = data34.femaleRatio || null;
    const age18_24 = data34.age18_24 || null;
    const age25_34 = data34.age25_34 || null;
    const age35Plus = data34.age35Plus || '';
    const gmvVideoRatio = data34.gmvVideoRatio || null;
    const gmvLiveRatio = data34.gmvLiveRatio || null;
    const top1Cat = data34.top1Category || '';
    const top2Cat = data34.top2Category || '';
    const kocScore = data34.kocScore || '';

    // Nếu master chưa có PIC mà 3.4 có thì bổ sung
    if (!latestPic && data34.pic34) {
      latestPic = data34.pic34;
    }

    // Dữ liệu bổ sung từ 3.2
    const data32 = map32.get(channelIdLower) || {};
    const tepKenh = data32.tepKenh || '';
    const segment = data32.segment || '';
    const kocCategory = top1Cat || data32.kocCat || '';
    const pillar = data32.pillar || '';

    if (!latestPic && data32.pic32) {
      latestPic = data32.pic32;
    }
    if (!latestPic) {
      latestPic = 'Chưa có PIC tiếp cận';
    }

    // Đánh giá các thành phần thông tin
    const hasLegal = Boolean(cccd || mst);
    const hasBank = Boolean(stk && (nganHang || tenChuTk));
    const hasContact = Boolean(zalo || email || otherContact);
    const hasCategory = Boolean(tepKenh || kocCategory || top1Cat);
    const hasRate = Boolean(donGiaGanNhat > 0 || phanHangKl);

    // Xây dựng danh sách cụ thể các trường bị thiếu
    const missingItems = [];
    if (!cccd && !mst) missingItems.push('CCCD/MST');
    if (!stk) missingItems.push('Số TK');
    if (!nganHang) missingItems.push('Ngân hàng');
    if (!tenChuTk) missingItems.push('Chủ TK');
    if (!zalo && !email && !otherContact) missingItems.push('SĐT/Zalo');
    if (!tepKenh && !kocCategory) missingItems.push('Tệp kênh/Ngành');
    if (donGiaGanNhat === 0) missingItems.push('Báo giá Video');
    if (!linkHopDong) missingItems.push('File Hợp đồng');

    const missingFieldsDetail = missingItems.length > 0 ? missingItems.join('; ') : 'Đầy đủ tất cả';

    // Phân loại chuẩn hóa trường "Phân Loại Thiếu Thông Tin"
    let missingCategory = '';
    if (hasLegal && hasBank && hasContact && donGiaGanNhat > 0) {
      missingCategory = '✅ ĐẦY ĐỦ HỒ SƠ CHUẨN';
      stats.fullyCompleted++;
    } else if (!hasLegal && hasBank && hasContact) {
      missingCategory = '⚠️ THIẾU PHÁP LÝ (Có STK & SĐT, thiếu CCCD/MST)';
      stats.missingLegal++;
    } else if (hasLegal && !hasBank && hasContact) {
      missingCategory = '⚠️ THIẾU TÀI KHOẢN NGÂN HÀNG (Có CCCD, thiếu STK)';
      stats.missingBank++;
    } else if (hasLegal && hasBank && !hasContact) {
      missingCategory = '⚠️ THIẾU LIÊN HỆ (Có CCCD/STK, thiếu SĐT/Zalo)';
      stats.missingContactOnly++;
    } else if (!hasLegal && !hasBank && hasContact) {
      missingCategory = '❗ THIẾU PHÁP LÝ & STK (Chỉ có SĐT/Zalo tiếp cận)';
      stats.missingLegalAndBank++;
    } else if (hasLegal && !hasBank && !hasContact) {
      missingCategory = '❗ THIẾU STK & LIÊN HỆ (Chỉ có CCCD/MST)';
      stats.missingBank++;
    } else if (!hasLegal && !hasBank && !hasContact) {
      missingCategory = '❌ HỒ SƠ THÔ (Thiếu toàn bộ Pháp lý, STK & Liên hệ)';
      stats.rawNoProfile++;
    } else {
      missingCategory = '⚠️ THIẾU THÔNG TIN BỔ SUNG (Cần rà soát)';
    }

    if (!hasCategory) stats.missingCategory++;
    if (donGiaGanNhat === 0) stats.missingRateCard++;

    // Thống kê theo PIC
    if (!stats.picStats[latestPic]) {
      stats.picStats[latestPic] = { total: 0, full: 0, missing: 0 };
    }
    stats.picStats[latestPic].total++;
    if (missingCategory.startsWith('✅')) {
      stats.picStats[latestPic].full++;
    } else {
      stats.picStats[latestPic].missing++;
    }

    // Ghi dòng vào sheet
    const rowValues = [
      rowCounter - 2,
      channelId,
      tenChuTk ? `${channelId} (${tenChuTk})` : channelId,
      tenChuTk,
      linkKenh || `https://www.tiktok.com/@${channelId}`,
      nenTang,

      // Vận hành & PIC
      latestPic,
      latestCollabDate || '',
      latestBrand || '',
      latestBoCode || '',
      workedPicsCount,
      workedPicsList || latestPic,

      // Đánh giá thiếu hồ sơ
      missingCategory,
      missingFieldsDetail,
      rawStatus,

      // Phân hạng
      phanHangKl || 'Chưa định khung',
      segment || (followers > 500000 ? 'Key Creator' : 'Massive Creator'),
      tepKenh || 'Chưa phân tệp',
      kocCategory || 'Reviewer',
      top2Cat,
      pillar || 'Review trực tiếp',

      // Liên hệ
      zalo,
      email,
      otherContact,

      // Pháp lý & Chi trả
      cccd,
      mst,
      tenChuTk,
      stk,
      nganHang,
      loaiTkThue || (cccd ? 'TK cá nhân tính thuế TNCN 10%' : ''),
      linkHopDong,
      mcnGroup,

      // Chỉ số kênh
      followers,
      avgViews,
      typeof maleRatio === 'number' ? maleRatio : null,
      typeof femaleRatio === 'number' ? femaleRatio : null,
      typeof age18_24 === 'number' ? age18_24 : null,
      typeof age25_34 === 'number' ? age25_34 : null,
      age35Plus,
      typeof gmvVideoRatio === 'number' ? gmvVideoRatio : null,
      typeof gmvLiveRatio === 'number' ? gmvLiveRatio : null,
      kocScore,

      // Lịch sử booking & giá
      donGiaGanNhat,
      donGiaMin,
      donGiaMax,
      tongVideoPaid,
      tongVideoFoc,
      tongChiPhi,
      tongGmv30d
    ];

    const outRow = wsOut.addRow(rowValues);
    outRow.height = 20;

    // Căn chỉnh và định dạng từng ô theo Column Definition
    columnsDef.forEach((col, cIdx) => {
      const cell = outRow.getCell(cIdx + 1);
      cell.alignment = { 
        horizontal: col.align || 'left', 
        vertical: 'middle' 
      };
      if (col.format) {
        cell.numFmt = col.format;
      }
      // Highlight màu cho cột PIC và cột Phân Loại Thiếu
      if (col.key === 'latestAssignedPic') {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F9FF' } // Xanh dương phấn rất nhạt
        };
      } else if (col.key === 'missingCategory') {
        cell.font = { 
          name: 'Arial', 
          size: 9.5, 
          bold: true,
          color: { 
            argb: missingCategory.startsWith('✅') ? 'FF065F46' : 
                  missingCategory.startsWith('⚠️') ? 'FFB45309' : 
                  missingCategory.startsWith('❗') ? 'FFC2410C' : 'FF991B1B' 
          } 
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { 
            argb: missingCategory.startsWith('✅') ? 'FFF0FDF4' : 
                  missingCategory.startsWith('⚠️') ? 'FFFFFBEB' : 
                  missingCategory.startsWith('❗') ? 'FFFFF7ED' : 'FFFEF2F2' 
          }
        };
      } else {
        cell.font = { name: 'Arial', size: 9 };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  // Bật Auto-Filter cho Row 2 trên toàn bộ cột
  wsOut.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: rowCounter, column: columnsDef.length }
  };

  console.log(`Đã xuất ${stats.totalKoc} dòng dữ liệu KOC vào Sheet 1.`);

  // --- SHEET 2: BÁO CÁO THỐNG KÊ & TỪ ĐIỂN ERD ---
  console.log('--- Đang tạo Sheet 2: Báo cáo Thống kê & Từ điển ERD ---');
  const wsStats = outWb.addWorksheet('Bao_Cao_Thong_Ke_Va_ERD');
  wsStats.views = [{ showGridLines: true }];

  // Tiêu đề Sheet 2
  wsStats.mergeCells('A1:G1');
  const titleCell = wsStats.getCell('A1');
  titleCell.value = 'BÁO CÁO TỔNG HỢP HIỆN TRẠNG HỒ SƠ KOC & TỪ ĐIỂN DỮ LIỆU ERD (UPBASE B2C / UPAFFILIATE)';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  wsStats.getRow(1).height = 35;

  // Bảng 1: Thống kê tình trạng hồ sơ
  wsStats.getCell('A3').value = '1. TỔNG QUAN TÌNH TRẠNG THIẾU THÔNG TIN HỒ SƠ';
  wsStats.getCell('A3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF991B1B' } };

  wsStats.getRow(4).values = ['STT', 'Phân loại tình trạng hồ sơ', 'Số lượng KOC', 'Tỷ lệ (%)', 'Mức độ rủi ro vận hành', 'Hành động khuyến nghị cho Booking PIC'];
  wsStats.getRow(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 6; c++) {
    wsStats.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    wsStats.getCell(4, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const statRows = [
    [1, 'Đầy đủ hồ sơ chuẩn (Pháp lý + STK + SĐT + Giá)', stats.fullyCompleted, stats.fullyCompleted / stats.totalKoc, 'An toàn', 'Sẵn sàng ký HĐNT, book video và thanh toán tức thì'],
    [2, 'Thiếu Pháp lý (Có STK & SĐT, thiếu CCCD/MST)', stats.missingLegal, stats.missingLegal / stats.totalKoc, 'Trung bình', 'PIC yêu cầu KOC chụp 2 mặt CCCD trước khi làm ĐNTT'],
    [3, 'Thiếu Tài khoản ngân hàng (Có CCCD, thiếu STK)', stats.missingBank, stats.missingBank / stats.totalKoc, 'Trung bình', 'PIC xin thông tin STK và Tên ngân hàng để chuyển khoản'],
    [4, 'Thiếu Liên hệ (Có CCCD/STK, thiếu SĐT/Zalo)', stats.missingContactOnly, stats.missingContactOnly / stats.totalKoc, 'Thấp', 'Rà soát lại tin nhắn trao đổi cũ để lấy lại số Zalo'],
    [5, 'Thiếu Pháp lý & STK (Chỉ có SĐT/Zalo tiếp cận)', stats.missingLegalAndBank, stats.missingLegalAndBank / stats.totalKoc, 'Cao', 'KOC mới chốt bước đầu, cần gửi form thu thập hồ sơ CCCD + STK'],
    [6, 'Hồ sơ thô (Thiếu toàn bộ Pháp lý, STK & SĐT)', stats.rawNoProfile, stats.rawNoProfile / stats.totalKoc, 'Rất cao', 'Data lọc từ Kalodata/đề xuất, cần cử Listing PIC tiếp cận'],
  ];

  statRows.forEach((r, idx) => {
    const row = wsStats.addRow(r);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).numFmt = '0.0%';
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  // Dòng Tổng
  const totalRow = wsStats.addRow(['', 'TỔNG CỘNG DANH BẠ KOC', stats.totalKoc, 1.0, '', '']);
  totalRow.font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(3).numFmt = '#,##0';
  totalRow.getCell(4).numFmt = '0.0%';

  // Bảng 2: Thống kê theo PIC phụ trách gần nhất (Để giao việc)
  const picTableStart = 14;
  wsStats.getCell(`A${picTableStart - 1}`).value = '2. THỐNG KÊ DANH BẠ KOC THEO PIC PHỤ TRÁCH GẦN NHẤT (ĐỂ GIAO VIỆC THU THẬP BÙ)';
  wsStats.getCell(`A${picTableStart - 1}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

  wsStats.getRow(picTableStart).values = ['STT', 'Tên PIC Phụ Trách Gần Nhất', 'Tổng KOC Quản Lý', 'KOC Đã Đầy Đủ', 'KOC Bị Thiếu Hồ Sơ', 'Tỷ Lệ Thiếu (%)', 'Mục tiêu hoàn thiện tuần'];
  wsStats.getRow(picTableStart).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 7; c++) {
    wsStats.getCell(picTableStart, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    wsStats.getCell(picTableStart, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Sắp xếp PIC theo số lượng KOC giảm dần
  const sortedPics = Object.entries(stats.picStats).sort((a, b) => b[1].total - a[1].total);
  sortedPics.forEach(([picName, pStat], idx) => {
    const row = wsStats.addRow([
      idx + 1,
      picName,
      pStat.total,
      pStat.full,
      pStat.missing,
      pStat.total > 0 ? pStat.missing / pStat.total : 0,
      pStat.missing > 0 ? `Bổ sung ${Math.min(pStat.missing, 10)} KOC/tuần` : 'Đã chuẩn 100%'
    ]);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '0.0%';
    row.getCell(6).alignment = { horizontal: 'right' };
  });

  // Bảng 3: Từ điển dữ liệu ERD
  const erdRowStart = wsStats.rowCount + 3;
  wsStats.getCell(`A${erdRowStart - 1}`).value = '3. TỪ ĐIỂN DỮ LIỆU CÁC CỘT TRÊN ERD (DATA DICTIONARY)';
  wsStats.getCell(`A${erdRowStart - 1}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF374151' } };

  wsStats.getRow(erdRowStart).values = ['STT', 'Mã thực thể ERD', 'Tên trường kỹ thuật', 'Tên hiển thị tiếng Việt', 'Kiểu dữ liệu', 'Nguồn gốc trên Lark Base', 'Quy tắc nghiệp vụ & Bắt buộc'];
  wsStats.getRow(erdRowStart).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 7; c++) {
    wsStats.getCell(erdRowStart, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    wsStats.getCell(erdRowStart, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const erdDict = [
    [1, 'KocProfile', 'channelId', 'Mã kênh TikTok (*Khóa chính)', 'String (Unique)', 'Cột 1 trên Bảng 3.4 & Bảng 3.2', 'Bắt buộc. Định danh duy nhất của KOC trên sàn.'],
    [2, 'KocProfile', 'stageName', 'Tên kênh / Nghệ danh', 'String', 'Cột 7 trên Bảng 3.1 / Tên tài khoản', 'Tên hiển thị công khai của Creator.'],
    [3, 'KocProfile', 'realName', 'Họ tên thật / Chủ tài khoản', 'String', 'Cột 10 trên Bảng 3.2 / 3.4', 'Khớp 100% với CCCD và tài khoản ngân hàng để làm HĐ.'],
    [4, 'KocProfile', 'channelUrl', 'Link kênh TikTok', 'String (URL)', 'Cột 3 trên Bảng 3.4', 'Link mở trực tiếp hồ sơ Creator trên TikTok.'],
    [5, 'KocProfile', 'salaryGrade', 'Khung lương (KL1 - KL7, TAP)', 'Enum (SalaryGrade)', 'Cột 9 trên Bảng 3.4 / Cột 56 Bảng 3.2', 'Bắt buộc. Căn cứ kiểm soát trần chi phí của nhãn hàng.'],
    [6, 'KocProfile', 'segment', 'Phân nhóm Creator (Massive, Mid, Key, Top)', 'Enum (CreatorSegment)', 'Cột 82 trên Bảng 3.2', 'Dùng để lập cơ cấu ngân sách và chiến lược hợp tác.'],
    [7, 'KocProfile', 'tepKenh', 'Tệp kênh chuẩn (25 tệp)', 'String (TepKenh)', 'Cột 37 trên Bảng 3.2', 'Phân loại nội dung kênh: Review Nữ, Mẹ bé, Beauty...'],
    [8, 'KocProfile', 'kocCategory', 'Nhóm ngành hàng Top 1 (9 nhóm)', 'Enum (KocCategory)', 'Cột 42 trên Bảng 3.4 / Cột 88 Bảng 3.2', 'Ngành hàng chủ lực Creator có thế mạnh ra số.'],
    [9, 'KocProfile', 'latestAssignedPic', 'PIC hợp tác gần nhất', 'String', 'Cột 14 Master / Cột 5 & 34 Bảng 3.2', 'Nhân viên phụ trách mối quan hệ và liên hệ KOC.'],
    [10, 'KocProfile', 'missingCategory', 'Phân loại thiếu thông tin', 'Enum (Calculated)', 'Tính toán tự động từ CCCD, STK, Zalo, Giá', 'Trường quản trị chất lượng dữ liệu để giao việc bổ sung.'],
    [11, 'KocProfile', 'phone / zalo', 'Số điện thoại / Zalo', 'String', 'Cột 6 trên Bảng 3.4', 'Kênh liên lạc chính để gửi brief, kịch bản, chốt deal.'],
    [12, 'KocProfile', 'cccd', 'Số CCCD / CMND (12 số)', 'String (12 chars)', 'Cột 26 trên Bảng 3.2', 'Bắt buộc khi ký hợp đồng và kê khai thuế TNCN 10%.'],
    [13, 'KocProfile', 'bankAccount', 'Số tài khoản ngân hàng', 'String', 'Cột 24 trên Bảng 3.2', 'Tài khoản nhận thanh toán thù lao booking.'],
    [14, 'KocProfile', 'bankName', 'Tên ngân hàng', 'String', 'Cột 25 trên Bảng 3.2', 'Ngân hàng thụ hưởng chuyển khoản.'],
    [15, 'KocProfile', 'rateCardVideo', 'Đơn giá net video gần nhất', 'Decimal (VNĐ)', 'Cột 8 trên Bảng 3.4 / Cột 18 Bảng 3.2', 'Mức thù lao thực nhận của KOC cho 1 video.'],
    [16, 'KocProfile', 'followersCount', 'Lượng người theo dõi', 'Integer', 'Cột 25 trên Bảng 3.4 (Kalodata)', 'Quy mô ảnh hưởng của kênh.'],
    [17, 'KocProfile', 'avgViews', 'Lượt xem trung bình / video', 'Integer', 'Cột 31 trên Bảng 3.4 (Kalodata)', 'Chất lượng traffic tự nhiên của kênh.'],
    [18, 'KocProfile', 'contractDriveUrl', 'Link hợp đồng Drive', 'String (URL)', 'Cột 47 trên Bảng 3.2 / Cột 28 Master', 'Lưu trữ hợp đồng nguyên tắc hoặc biên bản thỏa thuận.'],
  ];

  erdDict.forEach(item => {
    const row = wsStats.addRow(item);
    row.getCell(1).alignment = { horizontal: 'center' };
  });

  // Tự căn độ rộng các cột trong Sheet 2
  wsStats.columns = [
    { width: 8 },
    { width: 32 },
    { width: 22 },
    { width: 28 },
    { width: 25 },
    { width: 35 },
    { width: 45 },
  ];

  // Lưu file Excel
  const outputPath = path.resolve('E:/Upbase/B2C/Master_KOC_UpAffiliate_ERD_Template.xlsx');
  console.log('Đang ghi file vào đĩa:', outputPath);
  await outWb.xlsx.writeFile(outputPath);
  console.log('--- HOÀN TẤT XUẤT FILE THÀNH CÔNG! ---');
}

generateKocErdTemplate().catch(console.error);
