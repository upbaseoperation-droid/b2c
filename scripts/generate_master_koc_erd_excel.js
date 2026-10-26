/**
 * Script tái tạo file Master Data KOC chuẩn hóa ERD:
 * File đích: E:/Upbase/B2C/Master_KOC_UpAffiliate_ERD_Template.xlsx
 * Gồm 3 Sheet:
 * 1. Master_KOC_Template_ERD: Toàn bộ danh bạ KOC chuẩn hóa với 34 cột dữ liệu phân nhóm theo ERD.
 * 2. Edge_Cases_Bat_Thuong: Toàn bộ các cảnh báo dị biệt (EC-01 -> EC-08) về CCCD, STK, xung đột PIC, giá cực đoan.
 * 3. Thong_Ke_Tong_Quan: Báo cáo tỷ lệ hoàn thiện hồ sơ, phân bổ theo phân hạng/ngành hàng và Từ điển dữ liệu ERD.
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));
const { REAL_FLAGSHIP_KOCS, REAL_KOC_COOPERATION_DEALS } = require('../web-admin/src/lib/realKocMasterData.ts');

async function generateMasterKocErdWorkbook() {
  console.log('=== BẮT ĐẦU TẠO FILE MASTER KOC ERD TEMPLATE ===');
  console.log(`Số lượng KOC gốc: ${REAL_FLAGSHIP_KOCS.length}`);
  console.log(`Số lượng Deals lịch sử: ${REAL_KOC_COOPERATION_DEALS.length}`);

  const outWb = new ExcelJS.Workbook();
  outWb.creator = 'UpBase B2C Ops Hub & UpAffiliate Engine';
  outWb.created = new Date();

  // -------------------------------------------------------------
  // 1. SHEET 1: Master_KOC_Template_ERD
  // -------------------------------------------------------------
  const wsOut = outWb.addWorksheet('Master_KOC_Template_ERD', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }]
  });

  const columnsDef = [
    // Nhóm 1: ĐỊNH DANH KOC (KocProfile)
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'STT', key: 'stt', width: 8, align: 'center' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Mã Kênh [channelId] (*Khóa chính)', key: 'channelId', width: 22, align: 'left', bold: true },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Tên Kênh / Nghệ Danh [stageName]', key: 'stageName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Họ Tên Thật / Chủ TK [realName]', key: 'realName', width: 24, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Link Kênh TikTok [channelUrl]', key: 'channelUrl', width: 32, align: 'left' },
    { group: 'ĐỊNH DANH KOC (KocProfile)', header: 'Nền Tảng [mainChannel]', key: 'platform', width: 14, align: 'center' },

    // Nhóm 2: VẬN HÀNH & PIC PHỤ TRÁCH
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: '⭐ PIC HỢP TÁC GẦN NHẤT [latestAssignedPic]', key: 'latestAssignedPic', width: 25, align: 'left', highlight: true },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Tháng/Ngày Book Gần Nhất [latestCollabDate]', key: 'latestCollabDate', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Brand Hợp Tác Gần Nhất [latestBrand]', key: 'latestBrand', width: 22, align: 'left' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Mã BO Gần Nhất [latestBoCode]', key: 'latestBoCode', width: 18, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Số PIC Từng Làm Việc [workedPicsCount]', key: 'workedPicsCount', width: 15, align: 'center' },
    { group: 'VẬN HÀNH & PIC PHỤ TRÁCH', header: 'Danh Sách PIC Từng Làm Việc [workedPicsList]', key: 'workedPicsList', width: 35, align: 'left' },

    // Nhóm 3: PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: '⚠️ PHÂN LOẠI THIẾU THÔNG TIN [missingInfoCategory]', key: 'missingCategory', width: 32, align: 'left', highlight: true },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Chi Tiết Các Trường Bị Thiếu [missingFieldsDetail]', key: 'missingFields', width: 35, align: 'left' },
    { group: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', header: 'Trạng Thái Hồ Sơ Gốc [rawProfileStatus]', key: 'rawProfileStatus', width: 22, align: 'center' },

    // Nhóm 4: PHÂN HẠNG & TỆP KÊNH
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Khung Lương [salaryGrade / KL]', key: 'salaryGrade', width: 15, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Phân Nhóm [segment]', key: 'segment', width: 18, align: 'center' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Tệp Kênh Chuẩn [tepKenh]', key: 'tepKenh', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 1 [kocCategory]', key: 'kocCategory', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Ngành Hàng Top 2', key: 'top2Category', width: 22, align: 'left' },
    { group: 'PHÂN HẠNG & TỆP KÊNH', header: 'Trụ Cột Nội Dung [pillarContent]', key: 'pillar', width: 20, align: 'left' },

    // Nhóm 5: LIÊN HỆ & HẬU CẦN
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Số Điện Thoại / Zalo [phone / zalo]', key: 'zalo', width: 18, align: 'center' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Email [email]', key: 'email', width: 26, align: 'left' },
    { group: 'LIÊN HỆ & HẬU CẦN', header: 'Địa Chỉ Nhận Hàng Mẫu [shippingAddress]', key: 'shippingAddress', width: 35, align: 'left' },

    // Nhóm 6: PHÁP LÝ & CHI TRẢ
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số CCCD / CMND [cccd]', key: 'cccd', width: 18, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Mã Số Thuế [taxCode]', key: 'taxCode', width: 16, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Tên Chủ Tài Khoản [bankAccountName]', key: 'bankAccountName', width: 25, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Số Tài Khoản (STK) [bankAccount]', key: 'bankAccount', width: 20, align: 'center' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Ngân Hàng [bankName]', key: 'bankName', width: 18, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Loại Tài Khoản Thuế [taxAccountType]', key: 'taxAccountType', width: 25, align: 'left' },
    { group: 'PHÁP LÝ & CHI TRẢ', header: 'Link Hợp Đồng Drive [contractDriveUrl]', key: 'contractDriveUrl', width: 32, align: 'left' },

    // Nhóm 7: CHỈ SỐ KÊNH (KALODATA)
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Followers [followersCount]', key: 'followers', width: 15, align: 'right', format: '#,##0' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Views Trung Bình [avgViews]', key: 'avgViews', width: 15, align: 'right', format: '#,##0' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ Nam [maleRatio]', key: 'maleRatio', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Tỉ Lệ Nữ [femaleRatio]', key: 'femaleRatio', width: 14, align: 'right', format: '0.0%' },
    { group: 'CHỈ SỐ KÊNH (KALODATA)', header: 'Điểm Đánh Giá KOC [reliabilityScore]', key: 'kocScore', width: 15, align: 'center' },

    // Nhóm 8: LỊCH SỬ BOOKING & ĐƠN GIÁ
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Gần Nhất [rateCardVideo]', key: 'rateCardVideo', width: 18, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Min [rateCardMin]', key: 'rateCardMin', width: 16, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Đơn Giá Max [rateCardMax]', key: 'rateCardMax', width: 16, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Video Paid [totalPaidVideos]', key: 'totalPaidVideos', width: 15, align: 'right', format: '#,##0' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Video FOC [totalFocVideos]', key: 'totalFocVideos', width: 15, align: 'right', format: '#,##0' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng Chi Phí Đã Chi [totalPastCost]', key: 'totalPastCost', width: 20, align: 'right', format: '#,##0 "₫"' },
    { group: 'LỊCH SỬ BOOKING & ĐƠN GIÁ', header: 'Tổng GMV 30d [totalPastGmv]', key: 'totalPastGmv', width: 20, align: 'right', format: '#,##0 "₫"' },
  ];

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
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color.fill } };
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

  // Thu thập dữ liệu bất thường và thống kê
  const edgeCaseDetails = [];
  const stkMap = new Map(); // cleanStk -> Array
  const cccdMap = new Map(); // cleanCccd -> Array

  const stats = {
    totalKoc: REAL_FLAGSHIP_KOCS.length,
    fullyCompleted: 0,
    missingLegal: 0,
    missingBank: 0,
    missingLegalAndBank: 0,
    missingContactOnly: 0,
    rawNoProfile: 0,
    missingCategory: 0,
    missingRateCard: 0,
    salaryGradeCounts: {},
    tepKenhCounts: {},
    picStats: {},
  };

  REAL_FLAGSHIP_KOCS.forEach((koc, index) => {
    const stt = index + 1;
    const cid = koc.channelId || '';
    const realName = koc.realName || koc.companyName || '';
    const pic = koc.latestAssignedPic || koc.bookingPic || 'Chưa gán';
    const cccd = (koc.cccd || '').trim();
    const mst = (koc.taxCode || '').trim();
    const bankAccount = (koc.bankAccount || '').trim();
    const bankName = (koc.bankName || '').trim();
    const bankAccountName = koc.realName || koc.companyName || '';
    const phone = koc.phone || koc.zalo || '';
    const rateCard = koc.rateCardVideo || 0;
    const rateMin = koc.minRate || rateCard;
    const rateMax = koc.maxRate || rateCard;
    const workedPicsCount = koc.workedPicsCount || 1;
    const workedPicsList = koc.workedPicsList || pic;

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

    // Đánh giá thiếu thông tin
    const hasLegal = Boolean(cccd || mst);
    const hasBank = Boolean(bankAccount && bankName);
    const hasContact = Boolean(phone || koc.email);
    const hasCat = Boolean(koc.tepKenh || koc.kocCategory);
    const hasRate = rateCard > 0;

    let missingCategory = '1. Hồ sơ đầy đủ (Chuẩn)';
    let missingDetail = 'Đầy đủ pháp lý & ngân hàng';

    if (!hasLegal && !hasBank) {
      missingCategory = '2. Thiếu cả CCCD/MST và Ngân hàng';
      missingDetail = 'Thiếu CCCD, STK, Ngân hàng';
      stats.missingLegalAndBank++;
    } else if (!hasLegal && hasBank) {
      missingCategory = '3. Thiếu CCCD/MST (Có Ngân hàng)';
      missingDetail = 'Thiếu CCCD/MST';
      stats.missingLegal++;
    } else if (hasLegal && !hasBank) {
      missingCategory = '4. Thiếu Ngân hàng (Có CCCD/MST)';
      missingDetail = 'Thiếu STK, Tên ngân hàng';
      stats.missingBank++;
    } else if (!hasContact) {
      missingCategory = '5. Thiếu thông tin liên hệ (SĐT/Zalo/Email)';
      missingDetail = 'Thiếu SĐT / Zalo / Email';
      stats.missingContactOnly++;
    } else {
      stats.fullyCompleted++;
    }

    if (!hasCat) stats.missingCategory++;
    if (!hasRate) stats.missingRateCard++;

    const grade = koc.salaryGrade || 'Chưa xếp hạng';
    stats.salaryGradeCounts[grade] = (stats.salaryGradeCounts[grade] || 0) + 1;
    const tep = koc.tepKenh || 'Chưa phân tệp';
    stats.tepKenhCounts[tep] = (stats.tepKenhCounts[tep] || 0) + 1;

    // Edge cases checks
    if (workedPicsCount >= 5) {
      edgeCaseDetails.push({
        cid,
        realName: realName || bankAccountName,
        pic,
        code: 'EC-04: Xung đột nhiều PIC (>=5 PIC)',
        risk: '🟠 Rủi ro cao',
        detail: `KOC từng làm việc với ${workedPicsCount} chuyên viên khác nhau: ${workedPicsList}`,
        action: 'Lead Booking chỉ định duy nhất 1 PIC chính làm đầu mối đàm phán, tránh bị ép giá chênh lệch.'
      });
    }

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

    if ((koc.totalPastCost || 0) > 0 && !hasBank) {
      edgeCaseDetails.push({
        cid,
        realName: realName || bankAccountName,
        pic,
        code: 'EC-07: Có chi phí phát sinh nhưng thiếu STK',
        risk: '🔴 Nghiêm trọng',
        detail: `Đã phát sinh ${Number(koc.totalPastCost).toLocaleString('vi-VN')}₫ thù lao nhưng chưa cập nhật số tài khoản ngân hàng`,
        action: 'Kế toán yêu cầu PIC hoàn thiện hồ sơ ngân hàng trước khi giải ngân các đơn kế tiếp.'
      });
    }

    // Row values for sheet 1
    const rowData = [
      stt,
      cid,
      koc.stageName || cid,
      realName || '—',
      koc.channelLink || (cid ? `https://www.tiktok.com/@${cid}` : '—'),
      'TikTok',

      pic,
      koc.latestBookMonth || '—',
      koc.brandName || '—',
      koc.latestBoCode || '—',
      workedPicsCount,
      workedPicsList,

      missingCategory,
      missingDetail,
      koc.statusKoc || 'Đã hợp tác',

      koc.salaryGrade || 'KL4',
      koc.segment || 'Key Creator',
      koc.tepKenh || '—',
      koc.kocCategory || '—',
      'Chăm sóc cá nhân & Làm đẹp',
      'Review & Trải nghiệm thực tế',

      phone || '—',
      koc.email || '—',
      koc.shippingAddress || '—',

      cccd || '—',
      mst || '—',
      bankAccountName || realName || '—',
      bankAccount || '—',
      bankName || '—',
      koc.taxAccountType || (mst ? 'Hộ kinh doanh / Doanh nghiệp' : 'Cá nhân (TNCN 10%)'),
      koc.contractDriveUrl || '—',

      koc.followers || 0,
      koc.avgViews || 0,
      koc.maleRatio ? koc.maleRatio / 100 : 0.25,
      koc.femaleRatio ? koc.femaleRatio / 100 : 0.75,
      koc.reliabilityScore || 9.0,

      rateCard,
      rateMin,
      rateMax,
      koc.totalPaidVideos || 0,
      koc.totalFocVideos || 0,
      koc.totalPastCost || 0,
      koc.totalPastGmv || 0,
    ];

    const dataRow = wsOut.addRow(rowData);
    dataRow.height = 20;

    // Định dạng cell
    columnsDef.forEach((def, colIdx) => {
      const c = dataRow.getCell(colIdx + 1);
      c.font = { name: 'Arial', size: 9 };
      c.alignment = {
        horizontal: def.align || 'left',
        vertical: 'middle'
      };
      if (def.format) {
        c.numFmt = def.format;
      }
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };

      // Highlight cột cảnh báo nếu thiếu
      if (def.key === 'missingCategory' && missingCategory !== '1. Hồ sơ đầy đủ (Chuẩn)') {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: missingCategory.includes('Thiếu cả') ? 'FFFEE2E2' : 'FFFFFBEB' }
        };
      }
    });
  });

  // Quét EC-02 và EC-03: Trùng STK
  stkMap.forEach((channels, stk) => {
    if (channels.length > 1) {
      const distinctNames = new Set(channels.map(x => (x.realName || '').toLowerCase().trim()).filter(Boolean));
      if (distinctNames.size > 1) {
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

  // Quét EC-08: Dùng chung CCCD qua nhiều kênh
  cccdMap.forEach((channels, cccdVal) => {
    if (channels.length > 1) {
      channels.forEach(ch => {
        edgeCaseDetails.push({
          cid: ch.cid,
          realName: ch.realName,
          pic: ch.pic,
          code: 'EC-08: Dùng chung CCCD trên nhiều kênh',
          risk: '🟡 Cần kiểm tra',
          detail: `Số CCCD ${cccdVal} được dùng chung trên ${channels.length} kênh: ${channels.map(x => x.cid).join(', ')}`,
          action: 'Kiểm tra xem đây là cùng 1 Creator mở nhiều kênh hay đăng ký thông tin hộ.'
        });
      });
    }
  });

  // -------------------------------------------------------------
  // 2. SHEET 2: Edge_Cases_Bat_Thuong
  // -------------------------------------------------------------
  console.log(`Số trường hợp Edge Cases phát hiện: ${edgeCaseDetails.length}`);
  const wsEdge = outWb.addWorksheet('Edge_Cases_Bat_Thuong', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }]
  });

  wsEdge.getRow(1).values = ['DANH SÁCH CÁC TRƯỜNG HỢP DỊ BIỆT & RỦI RO DỮ LIỆU KOC B2C (EDGE CASES)'];
  wsEdge.mergeCells(1, 1, 1, 7);
  wsEdge.getRow(1).height = 28;
  wsEdge.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  wsEdge.getCell(1, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsEdge.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

  const edgeHeaders = ['STT', 'Mã Kênh KOC', 'Họ Tên / Chủ TK', 'PIC Phụ Trách', 'Mã Lỗi / Dị Biệt', 'Mức Độ Rủi Ro', 'Chi Tiết Bất Thường & Hướng Xử Lý'];
  const edgeWidths = [8, 22, 25, 22, 32, 20, 55];
  wsEdge.getRow(2).values = edgeHeaders;
  wsEdge.getRow(2).height = 26;
  edgeWidths.forEach((w, idx) => wsEdge.getColumn(idx + 1).width = w);

  for (let c = 1; c <= 7; c++) {
    const cell = wsEdge.getCell(2, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  edgeCaseDetails.forEach((ec, idx) => {
    const row = wsEdge.addRow([
      idx + 1,
      ec.cid,
      ec.realName || '—',
      ec.pic || '—',
      ec.code,
      ec.risk,
      `${ec.detail} => HƯỚNG XỬ LÝ: ${ec.action}`
    ]);
    row.height = 22;
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : (c === 6 ? 'center' : 'left') };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      if (c === 6) {
        if (ec.risk.includes('Nghiêm trọng')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else if (ec.risk.includes('Rủi ro')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
        }
      }
    }
  });

  // -------------------------------------------------------------
  // 3. SHEET 3: Thong_Ke_Tong_Quan & Data Dictionary
  // -------------------------------------------------------------
  const wsStats = outWb.addWorksheet('Thong_Ke_Tong_Quan');
  wsStats.getColumn(1).width = 8;
  wsStats.getColumn(2).width = 38;
  wsStats.getColumn(3).width = 18;
  wsStats.getColumn(4).width = 15;
  wsStats.getColumn(5).width = 45;

  wsStats.mergeCells('B2:E2');
  wsStats.getCell('B2').value = 'BÁO CÁO THỐNG KÊ CHẤT LƯỢNG MASTER DATA KOC & TỪ ĐIỂN DỮ LIỆU ERD';
  wsStats.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  wsStats.getCell('B2').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  wsStats.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
  wsStats.getRow(2).height = 30;

  const kpis = [
    ['1. Tổng số hồ sơ KOC trong Master Data', stats.totalKoc, '100.0%', 'Toàn bộ danh bạ phòng B2C'],
    ['2. Hồ sơ hoàn chỉnh đầy đủ (CCCD + STK + Liên hệ)', stats.fullyCompleted, `${((stats.fullyCompleted / stats.totalKoc) * 100).toFixed(1)}%`, 'Đạt chuẩn ký hợp đồng và chi trả'],
    ['3. Thiếu cả CCCD/MST và Ngân hàng', stats.missingLegalAndBank, `${((stats.missingLegalAndBank / stats.totalKoc) * 100).toFixed(1)}%`, 'Cần chuyên viên bổ sung trước khi duyệt book'],
    ['4. Thiếu CCCD/MST (Đã có tài khoản ngân hàng)', stats.missingLegal, `${((stats.missingLegal / stats.totalKoc) * 100).toFixed(1)}%`, 'Cần thu thập CCCD để quyết toán thuế'],
    ['5. Thiếu Ngân hàng (Đã có CCCD/MST)', stats.missingBank, `${((stats.missingBank / stats.totalKoc) * 100).toFixed(1)}%`, 'Cần xin số tài khoản chính chủ'],
    ['6. Thiếu thông tin liên hệ (SĐT / Zalo / Email)', stats.missingContactOnly, `${((stats.missingContactOnly / stats.totalKoc) * 100).toFixed(1)}%`, 'Chưa có đầu mối liên hệ gửi brief'],
    ['7. Tổng số cảnh báo dị biệt (Edge Cases)', edgeCaseDetails.length, '—', 'Xem chi tiết tại Sheet Edge_Cases_Bat_Thuong'],
  ];

  wsStats.getRow(4).values = ['', 'CHỈ SỐ QUẢN TRỊ DỮ LIỆU GỐC', 'SỐ LƯỢNG', 'TỶ LỆ %', 'GHI CHÚ NGHIỆP VỤ'];
  wsStats.getRow(4).height = 24;
  for (let c = 2; c <= 5; c++) {
    const cell = wsStats.getCell(4, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  kpis.forEach((kpi, idx) => {
    const r = 5 + idx;
    const row = wsStats.getRow(r);
    row.values = ['', kpi[0], kpi[1], kpi[2], kpi[3]];
    row.height = 22;
    for (let c = 2; c <= 5; c++) {
      const cell = wsStats.getCell(r, c);
      cell.font = { name: 'Arial', size: 9.5 };
      cell.alignment = { vertical: 'middle', horizontal: c === 3 || c === 4 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  // TỪ ĐIỂN DỮ LIỆU ERD
  const erdDictRowStart = 15;
  wsStats.mergeCells(`B${erdDictRowStart}:E${erdDictRowStart}`);
  wsStats.getCell(`B${erdDictRowStart}`).value = 'TỪ ĐIỂN THUỘC TÍNH DỮ LIỆU CHUẨN ERD (DATA DICTIONARY)';
  wsStats.getCell(`B${erdDictRowStart}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  wsStats.getCell(`B${erdDictRowStart}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsStats.getCell(`B${erdDictRowStart}`).alignment = { horizontal: 'center', vertical: 'middle' };
  wsStats.getRow(erdDictRowStart).height = 26;

  const erdDictHeaders = ['', 'Tên Trường Dữ Liệu', 'Thuộc Tính ERD', 'Kiểu Dữ Liệu', 'Quy Tắc Nghiệp Vụ'];
  wsStats.getRow(erdDictRowStart + 1).values = erdDictHeaders;
  wsStats.getRow(erdDictRowStart + 1).height = 24;
  for (let c = 2; c <= 5; c++) {
    const cell = wsStats.getCell(erdDictRowStart + 1, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const erdEntries = [
    ['Mã Kênh TikTok', 'channelId', 'String (Unique)', 'Khóa chính định danh duy nhất của Creator trên hệ thống'],
    ['Họ Tên Thật', 'realName', 'String', 'Họ tên chính chủ trên CCCD và tài khoản ngân hàng thụ hưởng'],
    ['Khung Lương Vận Hành', 'salaryGrade', 'Enum (KL1 - KL7)', 'Mức trần thù lao đàm phán theo quy chế phòng B2C'],
    ['Phân Nhóm Creator', 'segment', 'Enum (Massive, Mid, Key, Top)', 'Phân khúc hợp tác và cơ cấu ngân sách nhãn hàng'],
    ['Tệp Kênh Chuẩn', 'tepKenh', 'String (25 tệp)', 'Phân loại nội dung kênh: Review Nữ, Mẹ bé, Mỹ phẩm, Thời trang...'],
    ['PIC Hợp Tác Gần Nhất', 'latestAssignedPic', 'String', 'Chuyên viên phụ trách mối quan hệ đàm phán gần nhất'],
    ['Số CCCD / Mã Số Thuế', 'cccd / taxCode', 'String (12 số / 10 số)', 'Bắt buộc khi ký hợp đồng và khấu trừ thuế TNCN 10%'],
    ['Tài Khoản Ngân Hàng', 'bankAccount & bankName', 'String', 'Tài khoản nhận thanh toán thù lao booking'],
    ['Đơn Giá Video', 'rateCardVideo', 'Decimal (VNĐ)', 'Đơn giá net thực nhận của KOC cho 1 video hợp tác'],
    ['Chỉ Số Kalodata', 'followers & avgViews', 'Integer', 'Quy mô người theo dõi và tương tác trung bình của kênh'],
  ];

  erdEntries.forEach((entry, idx) => {
    const r = erdDictRowStart + 2 + idx;
    const row = wsStats.getRow(r);
    row.values = ['', entry[0], entry[1], entry[2], entry[3]];
    row.height = 22;
    for (let c = 2; c <= 5; c++) {
      const cell = wsStats.getCell(r, c);
      cell.font = { name: 'Arial', size: 9.5 };
      cell.alignment = { vertical: 'middle', horizontal: c === 3 || c === 4 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  // -------------------------------------------------------------
  // GHI FILE RA ĐĨA
  // -------------------------------------------------------------
  const outputPath = path.resolve('E:/Upbase/B2C/Master_KOC_UpAffiliate_ERD_Template.xlsx');
  console.log('Đang ghi file Excel ra đĩa:', outputPath);
  await outWb.xlsx.writeFile(outputPath);
  console.log('=== HOÀN TẤT! ĐÃ TẠO LẠI THÀNH CÔNG FILE MASTER KOC ERD ===');
  console.log(`Đường dẫn file: ${outputPath}`);
}

generateMasterKocErdWorkbook().catch(console.error);
