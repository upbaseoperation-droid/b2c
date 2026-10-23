const fs = require('fs');
const readline = require('readline');
const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function generateEnrichedKocTemplate() {
  console.log('=== BẮT ĐẦU QUY TRÌNH HỢP NHẤT DỮ LIỆU ĐA NGUỒN CHO KOC ERD ===');

  // --- NGUỒN 1: Bảng 3.4 KOCs tổng hợp ---
  console.log('1. Đang đọc B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx...');
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
  console.log(`-> Nạp thành công ${map34.size} KOC từ bảng 3.4.`);

  // --- NGUỒN 2: Bảng 3.2 List duyệt book ---
  console.log('2. Đang đọc B2C_Quản lý Booking_3.2 List duyệt book.xlsx...');
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
  console.log(`-> Nạp thành công ${map32.size} kênh từ bảng 3.2.`);

  // --- NGUỒN 3: Bảng 3.1 List KOC chưa duyệt (từ B2C_Quản lý Booking (1).xlsx) ---
  console.log('3. Đang đọc Bảng 3.1 List KOC chưa duyệt & 7.1 KOL Livestream...');
  const wbBig = new ExcelJS.Workbook();
  await wbBig.xlsx.readFile('./B2C_Quản lý Booking (1).xlsx');

  const ws31un = wbBig.getWorksheet('3.1 List KOC chưa duyệt');
  const map31un = new Map();
  if (ws31un) {
    ws31un.eachRow((row, r) => {
      if (r === 1) return;
      const cid = (row.getCell(1).text || '').trim().toLowerCase();
      if (!cid) return;
      const bankName = (row.getCell(9).text || '').trim();
      const bankAcc = (row.getCell(8).text || '').trim();
      const bankHolder = (row.getCell(7).text || '').trim();
      const cccd = (row.getCell(10).text || '').trim();
      const addr = (row.getCell(11).text || '').trim();
      const pic = (row.getCell(3).text || row.getCell(14).text || '').trim();
      const price = typeof row.getCell(5).value === 'number' ? row.getCell(5).value : parseFloat(row.getCell(5).text) || 0;
      const tep = (row.getCell(15).text || '').trim();

      if (!map31un.has(cid)) {
        map31un.set(cid, { bankName, bankAcc, bankHolder, cccd, addr, pic, price, tep });
      } else {
        const cur = map31un.get(cid);
        if (!cur.bankName && bankName) cur.bankName = bankName;
        if (!cur.bankAcc && bankAcc) cur.bankAcc = bankAcc;
        if (!cur.bankHolder && bankHolder) cur.bankHolder = bankHolder;
        if (!cur.cccd && cccd) cur.cccd = cccd;
        if (!cur.addr && addr) cur.addr = addr;
        if (!cur.pic && pic) cur.pic = pic;
        if (!cur.tep && tep) cur.tep = tep;
        if (price > 0 && cur.price === 0) cur.price = price;
      }
    });
  }
  console.log(`-> Nạp thành công ${map31un.size} KOC từ bảng 3.1 chưa duyệt.`);

  // --- NGUỒN 4: Bảng 7.1 KOL Livestream ---
  const wsLive = wbBig.getWorksheet('7.1 KOL livestream');
  const mapLive = new Map();
  if (wsLive) {
    wsLive.eachRow((row, r) => {
      if (r === 1) return;
      const cid = (row.getCell(1).text || '').trim().toLowerCase();
      if (!cid) return;
      const contact = (row.getCell(14).text || '').trim();
      const managerName = (row.getCell(15).text || '').trim();
      const network = (row.getCell(12).text || '').trim();
      const networkLink = (row.getCell(13).text || '').trim();
      mapLive.set(cid, { contact, managerName, network, networkLink });
    });
  }
  console.log(`-> Nạp thành công ${mapLive.size} KOL Livestream từ bảng 7.1.`);

  // --- NGUỒN 5: Tệp CSV Listing KOCs All (72.977 dòng) ---
  console.log('5. Đang đọc tệp CSV 3.1 Listing KOCs All để lấy địa chỉ nhận hàng và SĐT bổ sung...');
  const mapCsv = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream('./B2C_Quản lý Booking_3.1 Listing KOCs_All (Đồng bộ hoá).csv'),
    crlfDelay: Infinity
  });

  let csvLineCount = 0;
  for await (const line of rl) {
    csvLineCount++;
    if (csvLineCount === 1) continue;
    const parts = line.split(',');
    if (parts.length < 15) continue;
    const cid = (parts[0] || '').replace(/[\"\r\n]/g, '').trim().toLowerCase();
    if (!cid || cid.length > 50) continue;

    const email = (parts[10] || '').replace(/[\"\r\n]/g, '').trim();
    const zalo = (parts[11] || '').replace(/[\"\r\n]/g, '').trim();
    const tepKenh = (parts[23] || '').replace(/[\"\r\n]/g, '').trim();
    const shipping = (parts[42] || '').replace(/[\"\r\n]/g, '').trim();
    const pic = (parts[47] || parts[21] || '').replace(/[\"\r\n]/g, '').trim();

    if (!mapCsv.has(cid)) {
      mapCsv.set(cid, { email, zalo, tepKenh, shipping, pic });
    } else {
      const cur = mapCsv.get(cid);
      if (!cur.email && email && email.includes('@')) cur.email = email;
      if (!cur.zalo && zalo && zalo.length >= 8) cur.zalo = zalo;
      if (!cur.tepKenh && tepKenh) cur.tepKenh = tepKenh;
      if (!cur.shipping && shipping && shipping.length > 5) cur.shipping = shipping;
      if (!cur.pic && pic) cur.pic = pic;
    }
  }
  console.log(`-> Nạp thành công ${mapCsv.size} KOC từ CSV Listing.`);

  // --- NGUỒN 6: Master Danh bạ KOC chuẩn hóa ---
  console.log('6. Đang đọc Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx...');
  const wbMaster = new ExcelJS.Workbook();
  await wbMaster.xlsx.readFile('./Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx');
  const wsMaster = wbMaster.getWorksheet('1_Master_KOC_KOL_ChuanHoa');

  // Khởi tạo Workbook đầu ra
  const outWb = new ExcelJS.Workbook();
  outWb.creator = 'UpBase B2C Ops Hub & UpAffiliate Engine';
  outWb.created = new Date();

  const wsOut = outWb.addWorksheet('Master_KOC_Template_ERD', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }]
  });

  // Định nghĩa các cột (52 Cột hoàn chỉnh theo ERD UpAffiliate)
  const columnsDef = [
    // Nhóm 1: ĐỊNH DANH KOC (Entity: KocProfile)
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'STT', key: 'stt', width: 8, align: 'center' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Mã Kênh [channelId] (*Khóa chính)', key: 'channelId', width: 22, align: 'left', bold: true },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Tên Kênh / Nghệ Danh [stageName]', key: 'stageName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Họ Tên Thật / Chủ TK [realName]', key: 'realName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Link Kênh TikTok [channelUrl]', key: 'channelUrl', width: 32, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Nền Tảng [mainChannel]', key: 'platform', width: 14, align: 'center' },

    // Nhóm 2: VẬN HÀNH & PIC PHỤ TRÁCH (RẤT QUAN TRỌNG)
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: '🌟 PIC HỢP TÁC GẦN NHẤT [latestAssignedPic]', key: 'latestAssignedPic', width: 25, align: 'left', highlight: true },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Tháng/Ngày Book Gần Nhất [latestCollabDate]', key: 'latestCollabDate', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Brand Hợp Tác Gần Nhất [latestBrand]', key: 'latestBrand', width: 22, align: 'left' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Mã BO Gần Nhất [latestBoCode]', key: 'latestBoCode', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Số PIC Từng Làm Việc [workedPicsCount]', key: 'workedPicsCount', width: 15, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Danh Sách PIC Từng Làm Việc [workedPicsList]', key: 'workedPicsList', width: 35, align: 'left' },

    // Nhóm 3: PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ (THEO YÊU CẦU NGƯỜI DÙNG)
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: '🌟 PHÂN LOẠI THIẾU THÔNG TIN [missingInfoCategory]', key: 'missingCategory', width: 34, align: 'left', highlight: true },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Chi Tiết Các Trường Bị Thiếu [missingFieldsDetail]', key: 'missingFields', width: 35, align: 'left' },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Trạng Thái Bổ Sung Dữ Liệu [enrichmentStatus]', key: 'enrichmentStatus', width: 28, align: 'center' },

    // Nhóm 4: PHÂN HẠNG & TỆP KÊNH (Entity: Taxonomy & Catalog)
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Khung Lương [salaryGrade / KL]', key: 'salaryGrade', width: 15, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Phân Nhóm [segment]', key: 'segment', width: 18, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Tệp Kênh Chuẩn [tepKenh]', key: 'tepKenh', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 1 [kocCategory]', key: 'kocCategory', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 2', key: 'top2Category', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Trụ Cột Nội Dung [pillarContent]', key: 'pillar', width: 20, align: 'left' },

    // Nhóm 5: LIÊN HỆ & HẬU CẦN GỬI MẪU (MỚI BỔ SUNG ĐỊA CHỈ & QUẢN LÝ)
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Số Điện Thoại / Zalo [phone / zalo]', key: 'zalo', width: 18, align: 'center' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Email [email]', key: 'email', width: 26, align: 'left' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: '🏠 ĐỊA CHỈ NHẬN HÀNG MẪU [shippingAddress]', key: 'shippingAddress', width: 35, align: 'left', highlight: true },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Người Đại Diện / Quản Lý MCN [managerOrNetwork]', key: 'managerOrNetwork', width: 25, align: 'left' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Phương Thức Liên Hệ Khác [otherContactMethod]', key: 'otherContact', width: 22, align: 'left' },

    // Nhóm 6: PHÁP LÝ & TÀI KHOẢN CHI TRẢ
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số CCCD / CMND [cccd]', key: 'cccd', width: 18, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Mã Số Thuế [taxCode]', key: 'taxCode', width: 16, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Tên Chủ Tài Khoản [bankAccountName]', key: 'bankAccountName', width: 25, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số Tài Khoản (STK) [bankAccount]', key: 'bankAccount', width: 20, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Ngân Hàng [bankName]', key: 'bankName', width: 20, align: 'left' },
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
    'ĐỊNH DANH KOC (KocProfile)': { fill: '1E3A8A', font: 'FFFFFF' },
    'VẬN HÀNH & PIC PHỤ TRÁCH': { fill: 'B45309', font: 'FFFFFF' },
    'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ': { fill: '991B1B', font: 'FFFFFF' },
    'PHÂN HẠNG & TỆP KÊNH': { fill: '374151', font: 'FFFFFF' },
    'LIÊN HỆ & HẬU CẦN': { fill: '065F46', font: 'FFFFFF' },
    'PHÁP LÝ & CHI TRẢ': { fill: '4C1D95', font: 'FFFFFF' },
    'CHỈ SỐ KÊNH (KALODATA)': { fill: '1E293B', font: 'FFFFFF' },
    'LỊCH SỬ BOOKING & ĐƠN GIÁ': { fill: '0F766E', font: 'FFFFFF' },
  };

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

  for (let c = 1; c <= columnsDef.length; c++) {
    const cell = wsOut.getCell(2, c);
    const colDef = columnsDef[c - 1];
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colDef.highlight ? 'FFFDE047' : 'FFF3F4F6' }
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

  // --- 7. ĐỐI SOÁT, HỢP NHẤT VÀ BỔ SUNG DỮ LIỆU ---
  console.log('--- Tiến hành hợp nhất và bổ sung chéo từ tất cả nguồn ---');

  const stats = {
    totalKoc: 0,
    fullyCompleted: 0,
    missingLegal: 0,
    missingBank: 0,
    missingLegalAndBank: 0,
    missingContactOnly: 0,
    rawNoProfile: 0,
    
    // Thống kê số lượng trường được cứu (cứu từ 3.1 chưa duyệt, csv, live)
    enrichedCccdCount: 0,
    enrichedBankCount: 0,
    enrichedAddressCount: 0,
    enrichedZaloCount: 0,
    enrichedEmailCount: 0,
    enrichedPicCount: 0,
    enrichedPriceCount: 0,

    picStats: {},
  };

  let rowCounter = 2;

  wsMaster.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    stats.totalKoc++;
    rowCounter++;

    const channelId = (row.getCell(2).text || '').trim();
    const channelIdLower = channelId.toLowerCase();
    const linkKenh = (row.getCell(3).text || '').trim();
    const nenTang = (row.getCell(4).text || 'TikTok').trim();
    let phanHangKl = (row.getCell(5).text || '').trim();
    let cccd = (row.getCell(8).text || '').trim();
    let mst = (row.getCell(9).text || '').trim();
    let tenChuTk = (row.getCell(10).text || '').trim();
    let stk = (row.getCell(11).text || '').trim();
    let nganHang = (row.getCell(12).text || '').trim();
    let loaiTkThue = (row.getCell(13).text || '').trim();
    
    let latestPic = (row.getCell(14).text || '').trim();
    const latestCollabDate = (row.getCell(15).text || '').trim();
    const latestBrand = (row.getCell(16).text || '').trim();
    const latestBoCode = (row.getCell(17).text || '').trim();
    const workedPicsCount = row.getCell(18).value || 0;
    const workedPicsList = (row.getCell(19).text || '').trim();

    let donGiaGanNhat = typeof row.getCell(20).value === 'number' ? row.getCell(20).value : parseFloat(row.getCell(20).text) || 0;
    const donGiaMin = typeof row.getCell(21).value === 'number' ? row.getCell(21).value : parseFloat(row.getCell(21).text) || 0;
    const donGiaMax = typeof row.getCell(22).value === 'number' ? row.getCell(22).value : parseFloat(row.getCell(22).text) || 0;
    const tongVideoPaid = typeof row.getCell(23).value === 'number' ? row.getCell(23).value : parseInt(row.getCell(23).text) || 0;
    const tongVideoFoc = typeof row.getCell(24).value === 'number' ? row.getCell(24).value : parseInt(row.getCell(24).text) || 0;
    const tongChiPhi = typeof row.getCell(25).value === 'number' ? row.getCell(25).value : parseFloat(row.getCell(25).text) || 0;
    const tongGmv30d = typeof row.getCell(26).value === 'number' ? row.getCell(26).value : parseFloat(row.getCell(26).text) || 0;
    const mcnGroup = (row.getCell(27).text || '').trim();
    const linkHopDong = (row.getCell(28).text || '').trim();

    // 1. Lấy từ 3.4
    const data34 = map34.get(channelIdLower) || {};
    let zalo = data34.zalo || '';
    let email = data34.email || '';
    let otherContact = data34.otherContact || '';
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

    // 2. Lấy từ 3.2
    const data32 = map32.get(channelIdLower) || {};
    let tepKenh = data32.tepKenh || '';
    let segment = data32.segment || '';
    let kocCategory = top1Cat || data32.kocCat || '';
    let pillar = data32.pillar || '';

    // 3. Lấy từ 3.1 Unapproved
    const data31un = map31un.get(channelIdLower) || {};
    let shippingAddress = data31un.addr || '';
    let enrichedFlags = [];

    // Bổ sung CCCD từ 3.1 unapproved nếu master thiếu
    if (!cccd && !mst && data31un.cccd) {
      cccd = data31un.cccd;
      enrichedFlags.push('Đã bổ sung CCCD từ Bảng 3.1');
      stats.enrichedCccdCount++;
    }

    // Bổ sung STK / Ngân hàng từ 3.1 unapproved nếu master thiếu
    if (!stk && data31un.bankAcc) {
      stk = data31un.bankAcc;
      enrichedFlags.push('Đã bổ sung STK từ Bảng 3.1');
      stats.enrichedBankCount++;
    }
    if (!nganHang && data31un.bankName) {
      nganHang = data31un.bankName;
    }
    if (!tenChuTk && data31un.bankHolder) {
      tenChuTk = data31un.bankHolder;
    }

    // Bổ sung Tệp kênh / Báo giá từ 3.1 unapproved nếu thiếu
    if (!tepKenh && data31un.tep) {
      tepKenh = data31un.tep;
    }
    if (donGiaGanNhat === 0 && data31un.price > 0) {
      donGiaGanNhat = data31un.price;
      stats.enrichedPriceCount++;
    }

    // 4. Lấy từ CSV 3.1 Listing All
    const dataCsv = mapCsv.get(channelIdLower) || {};
    if (!shippingAddress && dataCsv.shipping) {
      shippingAddress = dataCsv.shipping;
      enrichedFlags.push('Đã bổ sung Địa chỉ từ CSV Listing');
      stats.enrichedAddressCount++;
    } else if (shippingAddress) {
      stats.enrichedAddressCount++;
    }

    if (!zalo && dataCsv.zalo) {
      zalo = dataCsv.zalo;
      enrichedFlags.push('Đã bổ sung Zalo từ CSV Listing');
      stats.enrichedZaloCount++;
    }
    if (!email && dataCsv.email) {
      email = dataCsv.email;
      enrichedFlags.push('Đã bổ sung Email từ CSV Listing');
      stats.enrichedEmailCount++;
    }
    if (!tepKenh && dataCsv.tepKenh) {
      tepKenh = dataCsv.tepKenh;
    }

    // 5. Lấy từ 7.1 KOL Livestream
    const dataLive = mapLive.get(channelIdLower) || {};
    let managerOrNetwork = '';
    if (dataLive.managerName || dataLive.network) {
      managerOrNetwork = [dataLive.managerName, dataLive.network].filter(Boolean).join(' - ');
    }
    if (!otherContact && dataLive.contact) {
      otherContact = dataLive.contact;
    }

    // 6. Hoàn thiện PIC phụ trách gần nhất
    if (!latestPic) {
      if (data34.pic34) latestPic = data34.pic34;
      else if (data32.pic32) latestPic = data32.pic32;
      else if (data31un.pic) latestPic = data31un.pic;
      else if (dataCsv.pic) latestPic = dataCsv.pic;
      
      if (latestPic) {
        enrichedFlags.push('Đã truy vết PIC');
        stats.enrichedPicCount++;
      } else {
        latestPic = 'Chưa có PIC tiếp cận';
      }
    }

    // Đánh giá các thành phần thông tin sau khi bổ sung
    const hasLegal = Boolean(cccd || mst);
    const hasBank = Boolean(stk && (nganHang || tenChuTk));
    const hasContact = Boolean(zalo || email || otherContact);
    const hasAddress = Boolean(shippingAddress);

    // Xây dựng danh sách trường còn thiếu sau bổ sung
    const missingItems = [];
    if (!cccd && !mst) missingItems.push('CCCD/MST');
    if (!stk) missingItems.push('Số TK');
    if (!nganHang) missingItems.push('Ngân hàng');
    if (!tenChuTk) missingItems.push('Chủ TK');
    if (!zalo && !email && !otherContact) missingItems.push('SĐT/Zalo');
    if (!shippingAddress) missingItems.push('Địa chỉ nhận mẫu');
    if (!tepKenh && !kocCategory) missingItems.push('Tệp kênh/Ngành');
    if (donGiaGanNhat === 0) missingItems.push('Báo giá Video');
    if (!linkHopDong) missingItems.push('File Hợp đồng');

    const missingFieldsDetail = missingItems.length > 0 ? missingItems.join('; ') : 'Đầy đủ tất cả';

    // Phân loại hồ sơ sau khi bổ sung
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

    const enrichmentNote = enrichedFlags.length > 0 ? enrichedFlags.join(' | ') : 'Gốc từ Master';

    // Ghi dòng vào Sheet 1
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
      enrichmentNote,

      // Phân hạng
      phanHangKl || 'Chưa định khung',
      segment || (followers > 500000 ? 'Key Creator' : 'Massive Creator'),
      tepKenh || 'Chưa phân tệp',
      kocCategory || 'Reviewer',
      top2Cat,
      pillar || 'Review trực tiếp',

      // Liên hệ & Hậu cần
      zalo,
      email,
      shippingAddress,
      managerOrNetwork,
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

    columnsDef.forEach((col, cIdx) => {
      const cell = outRow.getCell(cIdx + 1);
      cell.alignment = { 
        horizontal: col.align || 'left', 
        vertical: 'middle' 
      };
      if (col.format) {
        cell.numFmt = col.format;
      }
      
      // Styling highlight
      if (col.key === 'latestAssignedPic') {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F9FF' }
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
      } else if (col.key === 'shippingAddress' && shippingAddress) {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF065F46' } };
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

  // Bật Auto-Filter
  wsOut.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: rowCounter, column: columnsDef.length }
  };

  console.log(`Đã xuất ${stats.totalKoc} dòng dữ liệu KOC đã được bổ sung.`);

  // --- SHEET 2: BÁO CÁO THỐNG KÊ & HIỆU QUẢ BỔ SUNG DỮ LIỆU ---
  console.log('--- Đang tạo Sheet 2: Báo cáo Thống kê & Hiệu quả Bổ sung Dữ liệu ---');
  const wsStats = outWb.addWorksheet('Bao_Cao_Thong_Ke_Va_ERD');
  wsStats.views = [{ showGridLines: true }];

  wsStats.mergeCells('A1:G1');
  const titleCell = wsStats.getCell('A1');
  titleCell.value = 'BÁO CÁO TỔNG HỢP HIỆN TRẠNG HỒ SƠ KOC SAU BỔ SUNG ĐA NGUỒN & TỪ ĐIỂN DỮ LIỆU ERD';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  wsStats.getRow(1).height = 35;

  // Bảng Hiệu quả cứu dữ liệu
  wsStats.getCell('A3').value = '1. HIỆU QUẢ BỔ SUNG DỮ LIỆU TỪ CÁC PHÂN HỆ LARK (3.1 CHƯA DUYỆT, CSV LISTING, 7.1 LIVESTREAM)';
  wsStats.getCell('A3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF065F46' } };

  wsStats.getRow(4).values = ['STT', 'Hạng mục dữ liệu được bổ sung', 'Số lượng KOC được cứu', 'Nguồn bổ sung thành công', 'Ý nghĩa đối với vận hành'];
  wsStats.getRow(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 5; c++) {
    wsStats.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    wsStats.getCell(4, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const enrichSummaryRows = [
    [1, 'Bổ sung CCCD / MST', stats.enrichedCccdCount, 'Bảng 3.1 List KOC chưa duyệt', 'Đủ điều kiện làm HĐNT và khấu trừ thuế TNCN'],
    [2, 'Bổ sung Số tài khoản & Ngân hàng', stats.enrichedBankCount, 'Bảng 3.1 List KOC chưa duyệt', 'Đủ điều kiện chuyển khoản thù lao booking'],
    [3, 'Bổ sung Địa chỉ nhận hàng mẫu', stats.enrichedAddressCount, 'Bảng 3.1 chưa duyệt & CSV Listing All', 'Hỗ trợ tạo đơn gửi mẫu trải nghiệm (SLA 48h)'],
    [4, 'Bổ sung Số điện thoại / Zalo', stats.enrichedZaloCount, 'Tệp CSV Listing KOCs All (72k dòng)', 'Có ngay phương thức liên hệ cho Booking PIC'],
    [5, 'Bổ sung Email KOC', stats.enrichedEmailCount, 'Tệp CSV Listing KOCs All', 'Hỗ trợ gửi thư mời hợp tác tự động'],
    [6, 'Truy vết PIC phụ trách', stats.enrichedPicCount, 'Bảng 3.1 chưa duyệt & CSV Listing', 'Gán chính xác nhân sự đầu mối chăm sóc'],
  ];

  enrichSummaryRows.forEach(r => {
    const row = wsStats.addRow(r);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).alignment = { horizontal: 'right' };
  });

  // Bảng 2: Phân loại hiện trạng hồ sơ
  const statusTableStart = wsStats.rowCount + 3;
  wsStats.getCell(`A${statusTableStart - 1}`).value = '2. HIỆN TRẠNG HỒ SƠ 4.811 KOC SAU KHI ĐƯỢC BỔ SUNG ĐA NGUỒN';
  wsStats.getCell(`A${statusTableStart - 1}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF991B1B' } };

  wsStats.getRow(statusTableStart).values = ['STT', 'Phân loại tình trạng hồ sơ', 'Số lượng KOC', 'Tỷ lệ (%)', 'Mức độ rủi ro vận hành', 'Hành động khuyến nghị cho Booking PIC'];
  wsStats.getRow(statusTableStart).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 6; c++) {
    wsStats.getCell(statusTableStart, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    wsStats.getCell(statusTableStart, c).alignment = { horizontal: 'center', vertical: 'middle' };
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

  const totalRow = wsStats.addRow(['', 'TỔNG CỘNG DANH BẠ KOC', stats.totalKoc, 1.0, '', '']);
  totalRow.font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(3).numFmt = '#,##0';
  totalRow.getCell(4).numFmt = '0.0%';

  // Bảng 3: Thống kê theo PIC phụ trách gần nhất
  const picTableStart = wsStats.rowCount + 3;
  wsStats.getCell(`A${picTableStart - 1}`).value = '3. PHÂN BỔ DANH BẠ KOC THEO PIC PHỤ TRÁCH GẦN NHẤT (ĐỂ GIAO VIỆC THU THẬP BÙ)';
  wsStats.getCell(`A${picTableStart - 1}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

  wsStats.getRow(picTableStart).values = ['STT', 'Tên PIC Phụ Trách Gần Nhất', 'Tổng KOC Quản Lý', 'KOC Đã Đầy Đủ', 'KOC Bị Thiếu Hồ Sơ', 'Tỷ Lệ Thiếu (%)', 'Mục tiêu hoàn thiện tuần'];
  wsStats.getRow(picTableStart).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 7; c++) {
    wsStats.getCell(picTableStart, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
    wsStats.getCell(picTableStart, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

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

  // Bảng 4: Từ điển dữ liệu ERD
  const erdRowStart = wsStats.rowCount + 3;
  wsStats.getCell(`A${erdRowStart - 1}`).value = '4. TỪ ĐIỂN DỮ LIỆU CÁC CỘT TRÊN ERD (DATA DICTIONARY)';
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
    [3, 'KocProfile', 'realName', 'Họ tên thật / Chủ tài khoản', 'String', 'Cột 10 trên Bảng 3.2 / 3.4 / 3.1', 'Khớp 100% với CCCD và tài khoản ngân hàng để làm HĐ.'],
    [4, 'KocProfile', 'channelUrl', 'Link kênh TikTok', 'String (URL)', 'Cột 3 trên Bảng 3.4', 'Link mở trực tiếp hồ sơ Creator trên TikTok.'],
    [5, 'KocProfile', 'salaryGrade', 'Khung lương (KL1 - KL7, TAP)', 'Enum (SalaryGrade)', 'Cột 9 trên Bảng 3.4 / Cột 56 Bảng 3.2', 'Bắt buộc. Căn cứ kiểm soát trần chi phí của nhãn hàng.'],
    [6, 'KocProfile', 'segment', 'Phân nhóm Creator (Massive, Mid, Key, Top)', 'Enum (CreatorSegment)', 'Cột 82 trên Bảng 3.2', 'Dùng để lập cơ cấu ngân sách và chiến lược hợp tác.'],
    [7, 'KocProfile', 'tepKenh', 'Tệp kênh chuẩn (25 tệp)', 'String (TepKenh)', 'Cột 37 trên Bảng 3.2 & Bảng 3.1', 'Phân loại nội dung kênh: Review Nữ, Mẹ bé, Beauty...'],
    [8, 'KocProfile', 'kocCategory', 'Nhóm ngành hàng Top 1 (9 nhóm)', 'Enum (KocCategory)', 'Cột 42 trên Bảng 3.4 / Cột 88 Bảng 3.2', 'Ngành hàng chủ lực Creator có thế mạnh ra số.'],
    [9, 'KocProfile', 'latestAssignedPic', 'PIC hợp tác gần nhất', 'String', 'Master / Bảng 3.2 / 3.1 / CSV', 'Nhân viên phụ trách mối quan hệ và liên hệ KOC.'],
    [10, 'KocProfile', 'missingCategory', 'Phân loại thiếu thông tin', 'Enum (Calculated)', 'Tính toán tự động từ CCCD, STK, Zalo, Giá', 'Trường quản trị chất lượng dữ liệu để giao việc bổ sung.'],
    [11, 'KocProfile', 'phone / zalo', 'Số điện thoại / Zalo', 'String', 'Cột 6 trên Bảng 3.4 & CSV Listing', 'Kênh liên lạc chính để gửi brief, kịch bản, chốt deal.'],
    [12, 'KocProfile', 'shippingAddress', 'Địa chỉ nhận hàng mẫu', 'String', 'Bảng 3.1 chưa duyệt, 3.3 & CSV', 'Địa chỉ gửi sản phẩm mẫu để KOC trải nghiệm.'],
    [13, 'KocProfile', 'managerOrNetwork', 'Người đại diện / MCN Network', 'String', 'Bảng 7.1 KOL livestream', 'Người đại diện hoặc đối tác MCN quản lý Creator.'],
    [14, 'KocProfile', 'cccd', 'Số CCCD / CMND (12 số)', 'String (12 chars)', 'Cột 26 Bảng 3.2 & Bảng 3.1', 'Bắt buộc khi ký hợp đồng và kê khai thuế TNCN 10%.'],
    [15, 'KocProfile', 'bankAccount', 'Số tài khoản ngân hàng', 'String', 'Cột 24 Bảng 3.2 & Bảng 3.1', 'Tài khoản nhận thanh toán thù lao booking.'],
    [16, 'KocProfile', 'bankName', 'Tên ngân hàng', 'String', 'Cột 25 Bảng 3.2 & Bảng 3.1', 'Ngân hàng thụ hưởng chuyển khoản.'],
    [17, 'KocProfile', 'rateCardVideo', 'Đơn giá net video gần nhất', 'Decimal (VNĐ)', 'Cột 8 Bảng 3.4 / 18 Bảng 3.2 / 3.1', 'Mức thù lao thực nhận của KOC cho 1 video.'],
    [18, 'KocProfile', 'followersCount', 'Lượng người theo dõi', 'Integer', 'Cột 25 trên Bảng 3.4 (Kalodata)', 'Quy mô ảnh hưởng của kênh.'],
    [19, 'KocProfile', 'avgViews', 'Lượt xem trung bình / video', 'Integer', 'Cột 31 trên Bảng 3.4 (Kalodata)', 'Chất lượng traffic tự nhiên của kênh.'],
    [20, 'KocProfile', 'contractDriveUrl', 'Link hợp đồng Drive', 'String (URL)', 'Cột 47 trên Bảng 3.2 / Cột 28 Master', 'Lưu trữ hợp đồng nguyên tắc hoặc biên bản thỏa thuận.'],
  ];

  erdDict.forEach(item => {
    const row = wsStats.addRow(item);
    row.getCell(1).alignment = { horizontal: 'center' };
  });

  wsStats.columns = [
    { width: 8 },
    { width: 32 },
    { width: 25 },
    { width: 30 },
    { width: 25 },
    { width: 35 },
    { width: 45 },
  ];

  const outputPath = path.resolve('E:/Upbase/B2C/Master_KOC_UpAffiliate_ERD_Template.xlsx');
  console.log('Đang ghi file vào đĩa:', outputPath);
  await outWb.xlsx.writeFile(outputPath);
  console.log('=== HOÀN TẤT XUẤT FILE BỔ SUNG THÀNH CÔNG! ===');
}

generateEnrichedKocTemplate().catch(console.error);
