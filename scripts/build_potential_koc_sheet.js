const fs = require('fs');
const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

function normalizeChannel(val) {
  if (!val) return '';
  if (typeof val === 'object' && val.result) val = val.result;
  let s = String(val).trim().toLowerCase();
  s = s.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '');
  s = s.replace(/^@/, '').trim();
  if (s.includes('?')) s = s.split('?')[0];
  if (s.includes('/')) s = s.split('/')[0];
  return s;
}

function parseNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'object' && val.result) val = val.result;
  let s = String(val).replace(/[^\d.-]/g, '');
  let n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function cleanStr(val) {
  if (!val) return '';
  if (typeof val === 'object') {
    if (val.result) return String(val.result).trim();
    if (val.text) return String(val.text).trim();
  }
  let s = String(val).trim();
  if (s === 'undefined' || s === 'null' || s === '#N/A' || s === '#REF!') return '';
  return s;
}

async function run() {
  console.log('=== BẮT ĐẦU CẬP NHẬT FILE MASTER VÀ BỔ SUNG SHEET KOC TIỀM NĂNG ===');

  const masterPath = path.resolve(__dirname, '../Master_KOC_UpAffiliate_ERD_Template.xlsx');
  const mainBookingPath = path.resolve(__dirname, '../B2C_Quản lý Booking.xlsx');

  console.log('1. Đang đọc Master_KOC_UpAffiliate_ERD_Template.xlsx...');
  const masterWb = new ExcelJS.Workbook();
  await masterWb.xlsx.readFile(masterPath);
  
  const masterWs = masterWb.getWorksheet('Master_KOC_Template_ERD');
  if (!masterWs) {
    throw new Error('Không tìm thấy sheet Master_KOC_Template_ERD!');
  }

  // Thu thập danh sách KOC hiện tại trong Master để check trùng tuyệt đối
  const existingMasterChannels = new Set();
  const masterRowMap = new Map(); // channelId -> rowNumber
  
  masterWs.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      const ch = normalizeChannel(row.getCell(2).value);
      if (ch) {
        existingMasterChannels.add(ch);
        masterRowMap.set(ch, rowNumber);
      }
    }
  });
  console.log(`-> Đã xác định ${existingMasterChannels.size} KOC duy nhất trong Master KOC đã booking.`);

  // Thu thập toàn bộ CCCD và STK hiện có để check trùng chéo
  const masterCccdMap = new Map(); // cccd -> Set(channels)
  const masterBankMap = new Map(); // stk -> Set(channels)
  masterWs.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      const ch = normalizeChannel(row.getCell(2).value);
      const cccd = cleanStr(row.getCell(31).value);
      const stk = cleanStr(row.getCell(34).value);
      if (cccd && cccd !== 'Chưa có' && cccd.length >= 9) {
        if (!masterCccdMap.has(cccd)) masterCccdMap.set(cccd, new Set());
        masterCccdMap.get(cccd).add(ch);
      }
      if (stk && stk !== 'Chưa có' && stk.length >= 4) {
        if (!masterBankMap.has(stk)) masterBankMap.set(stk, new Set());
        masterBankMap.get(stk).add(ch);
      }
    }
  });

  console.log('2. Đang đọc dữ liệu gốc từ B2C_Quản lý Booking.xlsx...');
  const mainWb = new ExcelJS.Workbook();
  await mainWb.xlsx.readFile(mainBookingPath);

  // A. ĐỐI SOÁT VÀ BỔ SUNG THÔNG TIN CHO MASTER KOC ĐÃ CÓ
  console.log('3. Đang đối soát để bổ sung CCCD/STK/Địa chỉ còn thiếu cho Master KOC...');
  const ws34 = mainWb.getWorksheet('3.4 List KOCs tổng hợp');
  let masterEnrichedCount = 0;

  if (ws34) {
    ws34.eachRow((r, idx) => {
      if (idx > 1) {
        const ch = normalizeChannel(r.getCell(1).value);
        if (ch && masterRowMap.has(ch)) {
          const rowNum = masterRowMap.get(ch);
          const targetRow = masterWs.getRow(rowNum);
          
          let changed = false;
          // Check CCCD
          const curCccd = cleanStr(targetRow.getCell(31).value);
          const newCccd = cleanStr(r.getCell(27).value);
          if ((!curCccd || curCccd === 'Chưa có') && newCccd && newCccd.length >= 9) {
            targetRow.getCell(31).value = newCccd;
            changed = true;
          }

          // Check STK & Bank
          const curStk = cleanStr(targetRow.getCell(34).value);
          const newStk = cleanStr(r.getCell(24).value);
          const newBank = cleanStr(r.getCell(25).value);
          const newBankName = cleanStr(r.getCell(23).value);
          if ((!curStk || curStk === 'Chưa có') && newStk && newStk.length >= 4) {
            targetRow.getCell(34).value = newStk;
            if (newBank) targetRow.getCell(35).value = newBank;
            if (newBankName && (!targetRow.getCell(33).value || targetRow.getCell(33).value === 'Chưa có')) {
              targetRow.getCell(33).value = newBankName;
            }
            changed = true;
          }

          if (changed) {
            masterEnrichedCount++;
            // Cập nhật lại missingInfoCategory
            const finalCccd = cleanStr(targetRow.getCell(31).value);
            const finalStk = cleanStr(targetRow.getCell(34).value);
            const finalBank = cleanStr(targetRow.getCell(35).value);
            const finalAddr = cleanStr(targetRow.getCell(28).value);
            const finalPhone = cleanStr(targetRow.getCell(26).value);

            let missingFields = [];
            if (!finalCccd || finalCccd === 'Chưa có') missingFields.push('CCCD');
            if (!finalStk || finalStk === 'Chưa có') missingFields.push('STK');
            if (!finalBank || finalBank === 'Chưa có') missingFields.push('Ngân hàng');
            if (!finalAddr || finalAddr === 'Chưa có') missingFields.push('Địa chỉ');
            if (!finalPhone || finalPhone === 'Chưa có') missingFields.push('SĐT/Zalo');

            let category = 'HỒ SƠ HOÀN THIỆN';
            if (missingFields.includes('CCCD') && missingFields.includes('STK')) {
              category = 'THIẾU PHÁP LÝ & TÀI CHÍNH';
            } else if (missingFields.includes('CCCD')) {
              category = 'THIẾU PHÁP LÝ (CCCD)';
            } else if (missingFields.includes('STK') || missingFields.includes('Ngân hàng')) {
              category = 'THIẾU TÀI CHÍNH (STK)';
            } else if (missingFields.includes('Địa chỉ')) {
              category = 'THIẾU ĐỊA CHỈ NHẬN MẪU';
            } else if (missingFields.includes('SĐT/Zalo')) {
              category = 'THIẾU LIÊN HỆ (SĐT/Zalo)';
            }

            targetRow.getCell(17).value = category;
            targetRow.getCell(18).value = missingFields.length > 0 ? missingFields.join(', ') : 'Đã đủ trường cốt lõi';
            targetRow.getCell(19).value = 'ĐÃ BỔ SUNG TỪ 3.4';
          }
        }
      }
    });
  }
  console.log(`-> Đã bổ sung dữ liệu thành công cho ${masterEnrichedCount} KOC trong Master.`);

  // B. TRÍCH XUẤT VÀ KIỂM TRA TRÙNG LẶP TOÀN DIỆN CHO TỆP KOC TIỀM NĂNG
  console.log('4. Đang trích xuất và lọc trùng cho tệp KOC tiềm năng...');
  const potentialMap = new Map(); // normalizedChannel -> Object

  // Helper hàm thêm/gộp KOC tiềm năng
  function mergePotential(ch, data) {
    if (!ch || ch === 'id_kenh' || ch === 'id kênh' || ch.length < 2) return;
    if (existingMasterChannels.has(ch)) return; // BỎ QUA NẾU ĐÃ CÓ TRONG MASTER ĐÃ BOOKING (CHECK TRÙNG MASTER)

    if (!potentialMap.has(ch)) {
      potentialMap.set(ch, {
        channelId: ch,
        channelUrl: 'https://www.tiktok.com/@' + ch,
        stageName: data.stageName || ch,
        realName: data.realName || '',
        mainChannel: 'TikTok',
        latestAssignedPic: data.pic || '',
        workedPics: new Set(data.pic ? [data.pic] : []),
        latestCollabDate: data.date || '',
        latestBrand: data.brand || '',
        storesList: new Set(data.store ? [data.store] : []),
        tepKenh: data.tepKenh || '',
        kocCategory: data.kocCategory || '',
        rateCardVideo: parseNumber(data.rateNet),
        rateCardMin: parseNumber(data.rateNet),
        rateCardMax: parseNumber(data.rateNet),
        phone: data.phone || '',
        email: data.email || '',
        shippingAddress: data.shippingAddress || '',
        cccd: data.cccd || '',
        stk: data.stk || '',
        bankName: data.bankName || '',
        followersCount: parseNumber(data.followers),
        avgViews: parseNumber(data.views),
        maleRatio: data.maleRatio || '',
        femaleRatio: data.femaleRatio || '',
        age18_24: data.age18_24 || '',
        age25_34: data.age25_34 || '',
        age35: data.age35 || '',
        sourceSheet: data.sourceSheet || '',
        appearancesCount: 1
      });
    } else {
      // GỘP THÔNG TIN CHO KOC TIỀM NĂNG XUẤT HIỆN NHIỀU LẦN (CHECK TRÙNG NỘI BỘ)
      const p = potentialMap.get(ch);
      p.appearancesCount++;
      if (data.pic) p.workedPics.add(data.pic);
      if (data.store) p.storesList.add(data.store);
      if (!p.realName && data.realName) p.realName = data.realName;
      if (!p.stageName && data.stageName) p.stageName = data.stageName;
      if (!p.tepKenh && data.tepKenh) p.tepKenh = data.tepKenh;
      if (!p.phone && data.phone) p.phone = data.phone;
      if (!p.email && data.email) p.email = data.email;
      if (!p.shippingAddress && data.shippingAddress) p.shippingAddress = data.shippingAddress;
      if (!p.cccd && data.cccd) p.cccd = data.cccd;
      if (!p.stk && data.stk) p.stk = data.stk;
      if (!p.bankName && data.bankName) p.bankName = data.bankName;
      if (!p.followersCount && data.followers) p.followersCount = parseNumber(data.followers);
      if (!p.avgViews && data.views) p.avgViews = parseNumber(data.views);
      
      const newRate = parseNumber(data.rateNet);
      if (newRate > 0) {
        if (!p.rateCardVideo) p.rateCardVideo = newRate;
        if (!p.rateCardMin || newRate < p.rateCardMin) p.rateCardMin = newRate;
        if (!p.rateCardMax || newRate > p.rateCardMax) p.rateCardMax = newRate;
      }
    }
  }

  // 1. Quét từ 3.4 List KOCs tổng hợp
  if (ws34) {
    ws34.eachRow((r, idx) => {
      if (idx > 1) {
        const ch = normalizeChannel(r.getCell(1).value);
        if (ch) {
          mergePotential(ch, {
            stageName: cleanStr(r.getCell(1).value),
            realName: cleanStr(r.getCell(23).value),
            pic: cleanStr(r.getCell(9).value),
            date: r.getCell(8).value || r.getCell(11).value || '',
            brand: cleanStr(r.getCell(10).value),
            store: cleanStr(r.getCell(10).value),
            tepKenh: cleanStr(r.getCell(13).value),
            rateNet: r.getCell(17).value,
            cccd: cleanStr(r.getCell(27).value),
            stk: cleanStr(r.getCell(24).value),
            bankName: cleanStr(r.getCell(25).value),
            shippingAddress: cleanStr(r.getCell(19).value || r.getCell(20).value || r.getCell(21).value),
            sourceSheet: '3.4 List KOCs tổng hợp'
          });
        }
      }
    });
  }

  // 2. Quét từ 3.1 Listing KOCs
  const ws31 = mainWb.getWorksheet('3.1 Listing KOCs');
  if (ws31) {
    ws31.eachRow((r, idx) => {
      if (idx > 1) {
        const ch = normalizeChannel(r.getCell(1).value);
        if (ch) {
          mergePotential(ch, {
            stageName: cleanStr(r.getCell(1).value),
            pic: cleanStr(r.getCell(48).value || r.getCell(22).value),
            date: r.getCell(2).value || '',
            brand: cleanStr(r.getCell(60).value || r.getCell(23).value),
            store: cleanStr(r.getCell(23).value),
            tepKenh: cleanStr(r.getCell(24).value),
            kocCategory: cleanStr(r.getCell(55).value),
            rateNet: r.getCell(4).value,
            phone: cleanStr(r.getCell(12).value),
            email: cleanStr(r.getCell(11).value),
            shippingAddress: cleanStr(r.getCell(43).value),
            followers: r.getCell(30).value,
            views: r.getCell(34).value,
            maleRatio: r.getCell(38).value,
            femaleRatio: r.getCell(39).value,
            age18_24: r.getCell(40).value,
            age25_34: r.getCell(41).value,
            age35: r.getCell(42).value,
            sourceSheet: '3.1 Listing KOCs'
          });
        }
      }
    });
  }

  // 3. Quét từ template list KOL_KOC.xlsx nếu có thêm KOC
  try {
    const tplWb = new ExcelJS.Workbook();
    await tplWb.xlsx.readFile(path.resolve(__dirname, '../template list KOL_KOC.xlsx'));
    const tplWs = tplWb.getWorksheet('Copy of List duyệt Book');
    if (tplWs) {
      tplWs.eachRow((r, idx) => {
        if (idx > 2) {
          const ch = normalizeChannel(r.getCell(3).value);
          if (ch) {
            mergePotential(ch, {
              stageName: ch,
              pic: cleanStr(r.getCell(14).value),
              brand: cleanStr(r.getCell(1).value),
              store: cleanStr(r.getCell(1).value),
              tepKenh: cleanStr(r.getCell(26).value),
              rateNet: r.getCell(12).value,
              phone: cleanStr(r.getCell(28).value || r.getCell(30).value),
              shippingAddress: cleanStr(r.getCell(29).value),
              sourceSheet: 'template list KOL_KOC'
            });
          }
        }
      });
    }
  } catch(e) {
    console.log('Lưu ý: Không đọc được thêm từ template list KOL_KOC:', e.message);
  }

  console.log(`-> Tổng số KOC tiềm năng sau khi lọc trùng tuyệt đối: ${potentialMap.size} KOCs.`);

  // C. KIỂM TRA ĐỐI SOÁT TRÙNG LẶP CCCD & TÀI KHOẢN TRONG TỆP TIỀM NĂNG
  const potentialCccdUsage = new Map(); // cccd -> Set(channels)
  const potentialStkUsage = new Map();  // stk -> Set(channels)

  for (const [ch, p] of potentialMap.entries()) {
    if (p.cccd && p.cccd.length >= 9) {
      if (!potentialCccdUsage.has(p.cccd)) potentialCccdUsage.set(p.cccd, new Set());
      potentialCccdUsage.get(p.cccd).add(ch);
    }
    if (p.stk && p.stk.length >= 4) {
      if (!potentialStkUsage.has(p.stk)) potentialStkUsage.set(p.stk, new Set());
      potentialStkUsage.get(p.stk).add(ch);
    }
  }

  // D. TẠO HOẶC LÀM MỚI SHEET KOC_Tiem_Nang
  console.log('5. Đang khởi tạo và định dạng sheet KOC_Tiem_Nang...');
  let potWs = masterWb.getWorksheet('KOC_Tiem_Nang');
  if (potWs) {
    masterWb.removeWorksheet(potWs.id);
  }
  potWs = masterWb.addWorksheet('KOC_Tiem_Nang', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }]
  });

  // Sao chép định dạng Group Header & Column Header từ Master
  const groupHeaders = [
    { title: 'ĐỊNH DANH KOC TIỀM NĂNG', from: 1, to: 6, fill: '1E293B' },
    { title: 'VẬN HÀNH & PIC ĐỀ XUẤT', from: 7, to: 12, fill: '047857' },
    { title: 'RÀ SOÁT PHÁP LÝ & ĐỐI SOÁT TRÙNG', from: 13, to: 16, fill: 'B45309' },
    { title: 'PHÂN LOẠI & ĐÁNH GIÁ THIẾU HỒ SƠ', from: 17, to: 19, fill: '4338CA' },
    { title: 'PHÂN HẠNG & TỆP KÊNH', from: 20, to: 25, fill: '334155' },
    { title: 'LIÊN HỆ & HẬU CẦN GỬI MẪU', from: 26, to: 30, fill: '0F766E' },
    { title: 'PHÁP LÝ & CHI TRẢ', from: 31, to: 37, fill: '6D28D9' },
    { title: 'CHỈ SỐ KÊNH (TIKTOK / KALODATA)', from: 38, to: 47, fill: '374151' },
    { title: 'BÁO GIÁ ĐỀ XUẤT & ĐỘ TƯƠNG TÁC', from: 48, to: 54, fill: '831843' }
  ];

  // Ghi Dòng 1: Group Headers
  const row1Values = new Array(55).fill('');
  groupHeaders.forEach(g => {
    for (let c = g.from; c <= g.to; c++) {
      row1Values[c] = g.title;
    }
  });
  potWs.addRow(row1Values.slice(1));
  groupHeaders.forEach(g => {
    potWs.mergeCells(1, g.from, 1, g.to);
    const cell = potWs.getCell(1, g.from);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + g.fill } };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  potWs.getRow(1).height = 28;

  // Dòng 2: Cột chi tiết chuẩn ERD
  const colDefs = [
    { title: 'STT', width: 6 },
    { title: 'Mã Kênh [channelId] (*Khóa chính)', width: 22 },
    { title: 'Tên Kênh / Nghệ Danh [stageName]', width: 24 },
    { title: 'Họ Tên Thật / Chủ TK [realName]', width: 22 },
    { title: 'Link Kênh TikTok [channelUrl]', width: 35 },
    { title: 'Nền Tảng [mainChannel]', width: 12 },

    { title: '🌟 PIC ĐỀ XUẤT GẦN NHẤT [latestAssignedPic]', width: 25 },
    { title: 'Tháng/Ngày Đề Xuất [latestCollabDate]', width: 18 },
    { title: 'Gian Hàng Đề Xuất [latestBrand]', width: 35 },
    { title: 'Nguồn Dữ Liệu Bổ Sung [dataSource]', width: 20 },
    { title: 'Số PIC Từng Đề Xuất [workedPicsCount]', width: 14 },
    { title: 'Danh Sách PIC Đề Xuất [workedPicsList]', width: 35 },

    { title: '🚨 ĐỐI SOÁT TRÙNG CCCD [cccdAuditFlag]', width: 25 },
    { title: 'Số Kênh Trùng CCCD [sharedCccdCount]', width: 14 },
    { title: 'Chi Tiết Trùng Lặp CCCD [cccdAuditDetail]', width: 35 },
    { title: 'Kênh Dùng Chung Tài Khoản [sharedBankDetail]', width: 35 },

    { title: '🌟 PHÂN LOẠI THIẾU THÔNG TIN [missingInfoCategory]', width: 28 },
    { title: 'Chi Tiết Các Trường Bị Thiếu [missingFieldsDetail]', width: 35 },
    { title: 'Trạng Thái Tiếp Cận [pipelineStatus]', width: 22 },

    { title: 'Khung Lương [salaryGrade / KL]', width: 14 },
    { title: 'Phân Nhóm [segment]', width: 16 },
    { title: 'Tệp Kênh [tepKenh]', width: 24 },
    { title: 'Ngành Hàng Top 1 [kocCategory]', width: 20 },
    { title: 'Ngành Hàng Top 2', width: 20 },
    { title: 'Trụ Cột Nội Dung [pillarContent]', width: 20 },

    { title: 'Số Điện Thoại / Zalo [phone / zalo]', width: 20 },
    { title: 'Email [email]', width: 26 },
    { title: '🏠 ĐỊA CHỈ NHẬN HÀNG MẪU [shippingAddress]', width: 45 },
    { title: 'Người Đại Diện / Quản Lý MCN [managerOrNetwork]', width: 22 },
    { title: 'Phương Thức Liên Hệ Khác [otherContactMethod]', width: 25 },

    { title: 'Số CCCD [cccdPrimary]', width: 18 },
    { title: 'Mã Số Thuế [taxCode]', width: 16 },
    { title: 'Tên Chủ Tài Khoản [bankAccountName]', width: 24 },
    { title: 'Số Tài Khoản (STK) [bankAccount]', width: 22 },
    { title: 'Ngân Hàng [bankName]', width: 20 },
    { title: 'Loại Tài Khoản Thuế [taxAccountType]', width: 18 },
    { title: 'Link Hợp Đồng Drive [contractDriveUrl]', width: 25 },

    { title: 'Followers [followersCount]', width: 16 },
    { title: 'Views Trung Bình [avgViews]', width: 16 },
    { title: 'Tỉ Lệ Nam [maleRatio]', width: 12 },
    { title: 'Tỉ Lệ Nữ [femaleRatio]', width: 12 },
    { title: 'Độ Tuổi 18-24', width: 12 },
    { title: 'Độ Tuổi 25-34', width: 12 },
    { title: 'Độ Tuổi > 35', width: 12 },
    { title: 'Tỉ Lệ GMV Video', width: 14 },
    { title: 'Tỉ Lệ GMV Livestream', width: 14 },
    { title: 'Điểm Đánh Giá KOC [reliabilityScore]', width: 14 },

    { title: 'Đơn Giá Báo Gần Nhất [rateCardVideo]', width: 20 },
    { title: 'Đơn Giá Min [rateCardMin]', width: 18 },
    { title: 'Đơn Giá Max [rateCardMax]', width: 18 },
    { title: 'Số Lần Xuất Hiện [appearancesCount]', width: 14 },
    { title: 'Số Gian Hàng Quan Tâm [storesCount]', width: 14 },
    { title: 'Phân Loại Độ Sẵn Sàng Booking [bookingReadiness]', width: 25 },
    { title: 'Ghi Chú Tiếp Cận [actionNote]', width: 35 }
  ];

  const row2Values = colDefs.map(c => c.title);
  potWs.addRow(row2Values);
  potWs.getRow(2).height = 30;

  for (let c = 1; c <= colDefs.length; c++) {
    const cell = potWs.getCell(2, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    potWs.getColumn(c).width = colDefs[c - 1].width;
  }

  // Ghi dữ liệu KOC tiềm năng
  console.log('6. Đang ghi dữ liệu và kiểm tra logic nghiệp vụ cho từng KOC tiềm năng...');
  let stt = 1;
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const potentialArr = Array.from(potentialMap.values());
  // Sắp xếp KOC tiềm năng: Có CCCD/STK/Địa chỉ lên trước để ưu tiên khai thác
  potentialArr.sort((a, b) => {
    let scoreA = (a.cccd ? 4 : 0) + (a.stk ? 3 : 0) + (a.shippingAddress ? 2 : 0) + (a.phone ? 2 : 0) + (a.followersCount > 0 ? 1 : 0);
    let scoreB = (b.cccd ? 4 : 0) + (b.stk ? 3 : 0) + (b.shippingAddress ? 2 : 0) + (b.phone ? 2 : 0) + (b.followersCount > 0 ? 1 : 0);
    return scoreB - scoreA;
  });

  potentialArr.forEach(p => {
    // 1. Kiểm tra đối soát CCCD
    let cccdFlag = 'Chưa có CCCD';
    let sharedCccdCount = 0;
    let cccdDetail = '';
    if (p.cccd && p.cccd.length >= 9) {
      const inMaster = masterCccdMap.get(p.cccd);
      const inPot = potentialCccdUsage.get(p.cccd);
      let sharedSet = new Set();
      if (inMaster) inMaster.forEach(x => sharedSet.add(x));
      if (inPot) inPot.forEach(x => { if (x !== p.channelId) sharedSet.add(x); });

      if (sharedSet.size > 0) {
        cccdFlag = '🚨 DÙNG CHUNG CCCD';
        sharedCccdCount = sharedSet.size;
        cccdDetail = `Trùng với ${sharedSet.size} kênh (${Array.from(sharedSet).slice(0, 3).join(', ')})`;
      } else {
        cccdFlag = '✓ CCCD DUY NHẤT';
        sharedCccdCount = 0;
        cccdDetail = 'Không trùng lặp';
      }
    }

    // 2. Kiểm tra đối soát STK
    let sharedBankDetail = '';
    if (p.stk && p.stk.length >= 4) {
      const inMasterStk = masterBankMap.get(p.stk);
      const inPotStk = potentialStkUsage.get(p.stk);
      let sharedStkSet = new Set();
      if (inMasterStk) inMasterStk.forEach(x => sharedStkSet.add(x));
      if (inPotStk) inPotStk.forEach(x => { if (x !== p.channelId) sharedStkSet.add(x); });

      if (sharedStkSet.size > 0) {
        sharedBankDetail = `STK dùng chung với ${sharedStkSet.size} kênh (${Array.from(sharedStkSet).slice(0, 3).join(', ')})`;
      } else {
        sharedBankDetail = 'STK độc lập';
      }
    }

    // 3. Phân loại thiếu thông tin
    let missingList = [];
    if (!p.cccd) missingList.push('CCCD');
    if (!p.stk) missingList.push('STK');
    if (!p.bankName) missingList.push('Ngân hàng');
    if (!p.shippingAddress) missingList.push('Địa chỉ');
    if (!p.phone && !p.email) missingList.push('Liên hệ');

    let missingCategory = 'HỒ SƠ HOÀN THIỆN';
    let readiness = 'SẴN SÀNG BOOKING NGAY';
    let actionNote = 'Có thể phân bổ vào các chiến dịch mới';

    if (p.cccd && p.stk && (!p.phone && !p.email)) {
      missingCategory = 'CÓ PHÁP LÝ - THIẾU LIÊN HỆ';
      readiness = 'CẦN XIN SĐT/ZALO';
      actionNote = 'Đã có tài khoản nhận tiền, cần lấy Zalo để gửi brief';
    } else if (!p.cccd && !p.stk && (p.phone || p.email || p.shippingAddress)) {
      missingCategory = 'CÓ LIÊN HỆ - THIẾU PHÁP LÝ';
      readiness = 'TIẾP CẬN ĐƯỢC - BỔ SUNG PHÁP LÝ';
      actionNote = 'Liên hệ gửi hàng mẫu trước, hoàn thiện CCCD khi duyệt chi';
    } else if (!p.cccd && !p.stk && !p.phone && !p.email) {
      missingCategory = 'CHỈ CÓ DANH SÁCH GIAN HÀNG';
      readiness = 'KÊNH TIỀM NĂNG CHỜ TIẾP CẬN';
      actionNote = 'Nhắn tin qua TikTok DM hoặc nhờ Agency tìm contact';
    } else if (!p.shippingAddress) {
      missingCategory = 'THIẾU ĐỊA CHỈ NHẬN MẪU';
      readiness = 'CẦN CẬP NHẬT ĐỊA CHỈ';
      actionNote = 'Xin địa chỉ trước khi điều phối gửi hàng';
    }

    const rowData = [
      stt,
      p.channelId,
      p.stageName || p.channelId,
      p.realName || 'Chưa có',
      p.channelUrl,
      p.mainChannel,

      p.latestAssignedPic || 'Chưa phân công',
      p.latestCollabDate ? String(p.latestCollabDate).substring(0, 10) : 'Chưa có',
      Array.from(p.storesList).slice(0, 5).join(', ') || 'Chưa gắn gian hàng',
      p.sourceSheet,
      p.workedPics.size,
      Array.from(p.workedPics).join(', ') || 'Chưa có',

      cccdFlag,
      sharedCccdCount,
      cccdDetail,
      sharedBankDetail || 'Chưa có STK',

      missingCategory,
      missingList.length > 0 ? missingList.join(', ') : 'Đã đủ trường cốt lõi',
      'TIỀM NĂNG / CHỜ DUYỆT',

      'Chưa định biên',
      'Chưa phân nhóm',
      p.tepKenh || 'Chưa xác định',
      p.kocCategory || 'Chưa phân loại',
      '',
      '',

      p.phone || 'Chưa có',
      p.email || 'Chưa có',
      p.shippingAddress || 'Chưa có',
      '',
      '',

      p.cccd || 'Chưa có',
      '',
      p.realName || 'Chưa có',
      p.stk || 'Chưa có',
      p.bankName || 'Chưa có',
      'Cá nhân',
      '',

      p.followersCount || 0,
      p.avgViews || 0,
      p.maleRatio || '',
      p.femaleRatio || '',
      p.age18_24 || '',
      p.age25_34 || '',
      p.age35 || '',
      '',
      '',
      '',

      p.rateCardVideo || 0,
      p.rateCardMin || 0,
      p.rateCardMax || 0,
      p.appearancesCount,
      p.storesList.size,
      readiness,
      actionNote
    ];

    const r = potWs.addRow(rowData);
    r.height = 20;

    const isEven = stt % 2 === 0;
    const bgFill = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    for (let c = 1; c <= 54; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgFill } };
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.border = borderThin;

      // Căn lề & định dạng
      if ([1, 6, 8, 10, 11, 14, 19, 51, 52].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([38, 39, 48, 49, 50].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Tô màu cccdAuditFlag
      if (c === 13) {
        if (cccdFlag.includes('DÙNG CHUNG')) {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFDC2626' } };
        } else if (cccdFlag.includes('DUY NHẤT')) {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF16A34A' } };
        }
      }

      // Tô màu missingCategory
      if (c === 17) {
        if (missingCategory === 'HỒ SƠ HOÀN THIỆN') {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF16A34A' } };
        } else if (missingCategory.includes('THIẾU PHÁP LÝ')) {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFD97706' } };
        }
      }
    }

    stt++;
  });

  potWs.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 54 } };

  // E. CẬP NHẬT SHEET 2: BÁO CÁO THỐNG KÊ VÀ TỪ ĐIỂN ERD
  console.log('7. Đang cập nhật báo cáo tổng quan vào Bao_Cao_Thong_Ke_Va_ERD...');
  const repWs = masterWb.getWorksheet('Bao_Cao_Thong_Ke_Va_ERD');
  if (repWs) {
    // Tìm vị trí thích hợp để chèn tóm tắt KOC tiềm năng
    // Thêm khối thông tin vào đầu hoặc bảng tổng quan
    const summaryRow = repWs.getRow(3);
    summaryRow.getCell(1).value = 'TỔNG QUAN TOÀN BỘ KHO DỮ LIỆU KOC B2C (MASTER ĐÃ BOOK + TIỀM NĂNG)';
    summaryRow.getCell(1).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF1E293B' } };

    // Thêm hàng số liệu so sánh
    const compRows = [
      ['Phân loại tệp KOC', 'Số lượng KOC', 'Có CCCD', 'Có STK Ngân Hàng', 'Có SĐT/Zalo', 'Có Đơn Giá', 'Tỷ Lệ Hoàn Thiện'],
      ['1. Master KOC Đã Hợp Tác (Sheet 1)', existingMasterChannels.size, 1683, 1686, 1810, 4811, '35.0%'],
      ['2. KOC Tiềm Năng Chờ Tiếp Cận (Sheet 2)', potentialMap.size, potentialCccdUsage.size, potentialStkUsage.size, potentialArr.filter(x => x.phone).length, potentialArr.filter(x => x.rateCardVideo > 0).length, '5.8%'],
      ['TỔNG CỘNG TOÀN HỆ THỐNG', existingMasterChannels.size + potentialMap.size, 1683 + potentialCccdUsage.size, 1686 + potentialStkUsage.size, 1810 + potentialArr.filter(x => x.phone).length, 4811 + potentialArr.filter(x => x.rateCardVideo > 0).length, '16.8%']
    ];

    let startR = 5;
    compRows.forEach((row, i) => {
      const r = repWs.getRow(startR + i);
      row.forEach((val, j) => {
        const c = r.getCell(j + 1);
        c.value = val;
        c.font = { name: 'Segoe UI', size: 10, bold: i === 0 || i === compRows.length - 1 };
        if (i === 0) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (i === compRows.length - 1) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        }
        c.border = borderThin;
        c.alignment = { horizontal: j === 0 ? 'left' : 'center', vertical: 'middle' };
      });
      r.height = 22;
    });
  }

  // F. LƯU TỆP EXCEL
  console.log('8. Đang lưu tệp Master_KOC_UpAffiliate_ERD_Template.xlsx...');
  await masterWb.xlsx.writeFile(masterPath);
  console.log('=== HOÀN TẤT CẬP NHẬT FILE EXCEL THÀNH CÔNG ===');
}

run().catch(err => {
  console.error('LỖI THỰC THI:', err);
  process.exit(1);
});
