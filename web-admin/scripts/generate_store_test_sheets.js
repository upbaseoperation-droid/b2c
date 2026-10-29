const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const OUTPUT_DIR = path.resolve(__dirname, '../../test_sheets_gian_hang');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 8 gian hàng trọng điểm theo Cột 55 File 4.1.1 + các gian hàng tiêu biểu khác
const STORES_CONFIG = [
  {
    code: 'ClubClio_TikTok',
    name: 'ClubClio TikTok Shop',
    brand: 'ClubClio',
    platform: 'TikTok Shop',
    pic: 'Nguyễn Thị Ngọc Tâm',
    category: 'Mỹ phẩm & Trang điểm',
    products: ['Phấn nước Clio Kill Cover Mesh Glow', 'Son kem lì Clio Chiffon Blur Tint', 'Mascara Clio Kill Lash Superproof'],
    sampleKocs: [
      { idKenh: 'linh.makeup.tips', tenKenh: 'Linh Linh Beauty', follower: 320000, giaNet: 3500000, aov: 420000, soMon: 85, brandChon: 'Yes' },
      { idKenh: 'tra.mi.skincare', tenKenh: 'Trà Mi Skincare', follower: 180000, giaNet: 2000000, aov: 390000, soMon: 45, brandChon: 'Cân nhắc' },
      { idKenh: 'quynh.review', tenKenh: 'Quỳnh Hương Review', follower: 550000, giaNet: 6000000, aov: 450000, soMon: 130, brandChon: 'Chờ duyệt' }
    ]
  },
  {
    code: 'ClubClio_Shopee',
    name: 'ClubClio Shopee Mall',
    brand: 'ClubClio',
    platform: 'Shopee Mall',
    pic: 'Nguyễn Thị Ngọc Tâm',
    category: 'Mỹ phẩm & Trang điểm',
    products: ['Combo Cushion Clio + Lõi Refill', 'Kẻ mắt Clio Waterproof Pen Liner', 'Bảng mắt Clio Pro Eye Palette'],
    sampleKocs: [
      { idKenh: 'ha.linh.official', tenKenh: 'Hà Linh Official', follower: 1200000, giaNet: 15000000, aov: 520000, soMon: 350, brandChon: 'Yes' },
      { idKenh: 'phuong.ly.beauty', tenKenh: 'Phương Ly Makeup', follower: 240000, giaNet: 2500000, aov: 410000, soMon: 60, brandChon: 'Yes' }
    ]
  },
  {
    code: 'Cindy_Bloom',
    name: 'Cindy Bloom Official Store',
    brand: 'Cindy Bloom',
    platform: 'TikTok Shop',
    pic: 'Nguyễn Thị Hồng Ngát',
    category: 'Nước hoa & Hương thơm',
    products: ['Nước hoa Cindy Bloom Romantic Muse 50ml', 'Xịt thơm toàn thân Body Mist 100ml', 'Set quà tặng Cindy Bloom Special'],
    sampleKocs: [
      { idKenh: 'ngoc.perfume', tenKenh: 'Ngọc Scent Corner', follower: 95000, giaNet: 1500000, aov: 280000, soMon: 55, brandChon: 'Yes' },
      { idKenh: 'hoang.fragrance', tenKenh: 'Hoàng Mùi Hương', follower: 140000, giaNet: 2200000, aov: 310000, soMon: 70, brandChon: 'Yes' }
    ]
  },
  {
    code: 'Mine_Official',
    name: 'Mine Official Store',
    brand: 'Mine',
    platform: 'TikTok Shop',
    pic: 'Nguyễn Thị Hồng Ngát',
    category: 'Chăm sóc cá nhân',
    products: ['Sữa tắm hương nước hoa Mine 500ml', 'Dưỡng thể sáng da Mine Glow Body Cream', 'Tẩy tế bào chết Mine Coffee Scrub'],
    sampleKocs: [
      { idKenh: 'thao.vlog.daily', tenKenh: 'Thảo Daily Routine', follower: 210000, giaNet: 2500000, aov: 230000, soMon: 90, brandChon: 'Yes' },
      { idKenh: 'van.anh.skincare', tenKenh: 'Vân Anh Chăm Da', follower: 115000, giaNet: 1800000, aov: 250000, soMon: 40, brandChon: 'Chờ duyệt' }
    ]
  },
  {
    code: 'EUPC_Store',
    name: 'EUPC Official Store',
    brand: 'EUPC',
    platform: 'TikTok Shop',
    pic: 'Phan Diệu Ánh',
    category: 'Chăm sóc cá nhân & Tiêu dùng',
    products: ['Nước giặt xả sinh học EUPC Care 3.6kg', 'Nước lau sàn thiên nhiên EUPC Clean', 'Xịt khử mùi đa năng EUPC Fresh'],
    sampleKocs: [
      { idKenh: 'me.bong.family', tenKenh: 'Gia Đình Mẹ Bống', follower: 380000, giaNet: 4000000, aov: 195000, soMon: 160, brandChon: 'Yes' },
      { idKenh: 'bep.nha.an', tenKenh: 'Bếp Nhà An An', follower: 175000, giaNet: 2000000, aov: 180000, soMon: 80, brandChon: 'Yes' }
    ]
  },
  {
    code: 'LOccitane_VN',
    name: "L'Occitane Vietnam Official",
    brand: "L'Occitane",
    platform: 'Shopee Mall',
    pic: 'Nguyễn Thị Ngọc Tâm',
    category: 'Mỹ phẩm cao cấp',
    products: ['Kem dưỡng tay Shea Butter Hand Cream 150ml', 'Dầu dưỡng tóc phục hồi Aromachologie', 'Serum dưỡng ban đêm Reset Overnight 50ml'],
    sampleKocs: [
      { idKenh: 'mai.lifestyle', tenKenh: 'Mai Mai Luxury Life', follower: 450000, giaNet: 8000000, aov: 850000, soMon: 95, brandChon: 'Yes' },
      { idKenh: 'khanh.vogue', tenKenh: 'Khánh Linh Lifestyle', follower: 620000, giaNet: 12000000, aov: 920000, soMon: 140, brandChon: 'Yes' }
    ]
  },
  {
    code: 'Bye_Bye_Blemish',
    name: 'Bye Bye Blemish Vietnam',
    brand: 'Bye Bye Blemish',
    platform: 'TikTok Shop',
    pic: 'Nguyễn Quỳnh Trang',
    category: 'Dược mỹ phẩm trị mụn',
    products: ['Chấm mụn Drying Lotion Bye Bye Blemish 30ml', 'Serum trị mụn Tea Tree Blemish Serum', 'Miếng dán mụn Micro-Needling Acne Patch'],
    sampleKocs: [
      { idKenh: 'bs.dan.da', tenKenh: 'Bác Sĩ Dân Da Liễu', follower: 310000, giaNet: 5000000, aov: 320000, soMon: 110, brandChon: 'Yes' },
      { idKenh: 'chau.acne.care', tenKenh: 'Châu Trị Mụn Cùng Bạn', follower: 145000, giaNet: 2200000, aov: 290000, soMon: 65, brandChon: 'Yes' }
    ]
  },
  {
    code: 'Rejuran_Official',
    name: 'Rejuran Cosmetics Vietnam',
    brand: 'Rejuran',
    platform: 'TikTok Shop',
    pic: 'Nguyễn Thị Ngọc Tâm',
    category: 'Mỹ phẩm phục hồi cao cấp',
    products: ['Serum cá hồi Rejuran Healer Turnover Ampoule Dual Effect', 'Kem dưỡng Rejuran Healer Nutritive Cream', 'Mặt nạ phục hồi Rejuran Mask Box 5 miếng'],
    sampleKocs: [
      { idKenh: 'dr.kim.antiaging', tenKenh: 'Dr. Kim Trẻ Hóa Da', follower: 280000, giaNet: 7500000, aov: 1250000, soMon: 70, brandChon: 'Yes' },
      { idKenh: 'thu.ha.beauty', tenKenh: 'Thu Hà Skincare Lab', follower: 190000, giaNet: 4500000, aov: 1100000, soMon: 45, brandChon: 'Yes' }
    ]
  },
  {
    code: '82x_TikTok_SoCom',
    name: '82x_TikTok_SoCom',
    brand: '82x',
    platform: 'TikTok Shop',
    pic: 'Vân Ngọc',
    category: 'Nước uống làm đẹp & Collagen',
    products: ['Collagen 82x The Pink 10 chai', 'Nước uống 82x Classic Placenta 500g', '82x Sakura Collagen 500g'],
    sampleKocs: [
      { idKenh: 'tam.collagen', tenKenh: 'Tâm Tâm Sức Khỏe', follower: 220000, giaNet: 4500000, aov: 890000, soMon: 60, brandChon: 'Yes' },
      { idKenh: 'lan.healthy', tenKenh: 'Lan Lan Wellness', follower: 160000, giaNet: 3000000, aov: 750000, soMon: 35, brandChon: 'Yes' }
    ]
  },
  {
    code: 'AQUA_Shopee_SoCom',
    name: 'AQUA VIETNAM_Shopee_SoCom',
    brand: 'AQUA VIETNAM',
    platform: 'Shopee Mall',
    pic: 'Vân Ngọc',
    category: 'Gia dụng & Đời sống',
    products: ['Nồi chiên không dầu AQUA 6L', 'Máy xay sinh tố đa năng AQUA', 'Bình đun siêu tốc AQUA 1.8L'],
    sampleKocs: [
      { idKenh: 'yeu.bep.nha', tenKenh: 'Yêu Bếp Nghiện Nhà', follower: 510000, giaNet: 6500000, aov: 680000, soMon: 120, brandChon: 'Yes' },
      { idKenh: 'gia.dung.thong.minh', tenKenh: 'Gia Dụng Tiện Ích', follower: 340000, giaNet: 4000000, aov: 550000, soMon: 85, brandChon: 'Yes' }
    ]
  }
];

// Định nghĩa 57 cột chuẩn theo đúng thứ tự A -> BE của Sheet Upbase B2C
const COLUMNS_SPEC = [
  { col: 'A', header: 'Ngày điền', key: 'ngayDien', width: 14 },
  { col: 'B', header: 'Tháng', key: 'thang', width: 10 },
  { col: 'C', header: 'Nhân sự điền', key: 'nhanSuDien', width: 18 },
  { col: 'D', header: 'Đợt listing', key: 'dot', width: 12 },
  { col: 'E', header: 'Store', key: 'store', width: 22 },
  { col: 'F', header: 'Sản phẩm', key: 'sanPham', width: 30 },
  { col: 'G', header: '🎃id kênh', key: 'idKenh', width: 20 },
  { col: 'H', header: 'Tên người ảnh hưởng (Tên kênh)', key: 'tenKenh', width: 22 },
  { col: 'I', header: '🎃Link kênh', key: 'linkKenh', width: 32 },
  { col: 'J', header: 'Follower', key: 'follower', width: 12 },
  { col: 'K', header: '🎃 Tệp kênh', key: 'tepKenh', width: 18 },
  { col: 'L', header: 'Content tag', key: 'contentTag', width: 18 },
  { col: 'M', header: 'Tệp Booking', key: 'tepBooking', width: 14 },
  { col: 'N', header: 'Giá đã hợp tác trước đó (Giá dự kiến)', key: 'giaDaHopTacTruocDo', width: 16 },
  { col: 'O', header: 'Loại giá (Booking, Code ads, reup Gắn giỏ, SDHA)', key: 'loaiGia', width: 16 },
  { col: 'P', header: 'Giá net video', key: 'giaNetVideo', width: 15 },
  { col: 'Q', header: 'Phí booking kèm thuế TNCN', key: 'phiBookingKemThue', width: 18 },
  { col: 'R', header: 'Trạng thái Quy trình Booking - Tech', key: 'trangThai', width: 20 },
  { col: 'S', header: 'Đề xuất từ UpBase', key: 'deXuatUpBase', width: 16 },
  { col: 'T', header: 'Content note', key: 'contentNote', width: 26 },
  { col: 'U', header: 'Brand chọn', key: 'brandChon', width: 15 },
  { col: 'V', header: 'Lý do từ chối', key: 'lyDoTuChoi', width: 20 },
  { col: 'W', header: 'Thành quả hợp tác với UB', key: 'thanhQuaHopTac', width: 24 },
  { col: 'X', header: 'Thành quả hợp tác với brand ngoài', key: 'thanhQuaBrandNgoai', width: 24 },
  { col: 'Y', header: 'Doanh số (nếu có)', key: 'doanhSo', width: 16 },
  { col: 'Z', header: 'Doanh số ước tính trong 30 ngày', key: 'doanhSoUocTinh30d', width: 16 },
  { col: 'AA', header: 'Số món bán ra', key: 'soMonBanRa', width: 14 },
  { col: 'AB', header: 'GPM', key: 'gpm', width: 12 },
  { col: 'AC', header: 'GMV từ mỗi khách hàng/ AOV', key: 'aov', width: 16 },
  { col: 'AD', header: 'View trung bình video/ trung vị video', key: 'viewTrungBinh', width: 16 },
  { col: 'AE', header: 'Cost per view', key: 'costPerView', width: 14 },
  { col: 'AF', header: 'Tỉ trọng GMV từ video', key: 'gmvTuVideoPct', width: 14 },
  { col: 'AG', header: 'Tỉ trọng GMV từ Live', key: 'gmvTuLivePct', width: 14 },
  { col: 'AH', header: 'Tỉ trọng GMV từ thẻ sản phẩm', key: 'gmvTuTheSanPhamPct', width: 14 },
  { col: 'AI', header: 'Tỉ trọng ngành hàng', key: 'tiTrongNganhHang', width: 20 },
  { col: 'AJ', header: 'Tỉ trọng Nam', key: 'namPct', width: 12 },
  { col: 'AK', header: 'Tỉ trọng Nữ', key: 'nuPct', width: 12 },
  { col: 'AL', header: 'Tỉ trọng 18-24', key: 'tuoi18_24Pct', width: 12 },
  { col: 'AM', header: 'Tỉ trọng 25-34', key: 'tuoi25_34Pct', width: 12 },
  { col: 'AN', header: 'Other', key: 'tuoiOtherPct', width: 10 },
  { col: 'AO', header: 'Location', key: 'location', width: 14 },
  { col: 'AP', header: 'Ngày air plan', key: 'ngayAirPlan', width: 14 },
  { col: 'AQ', header: 'GMV Target', key: 'gmvTarget', width: 15 },
  { col: 'AR', header: 'View trung vị', key: 'viewTrungVi', width: 14 },
  { col: 'AS', header: 'CTR', key: 'ctrPct', width: 10 },
  { col: 'AT', header: 'CR', key: 'crPct', width: 10 },
  { col: 'AU', header: 'View Target', key: 'viewTarget', width: 14 },
  { col: 'AV', header: 'Tỷ lệ tương tác', key: 'tyLeTuongTacPct', width: 14 },
  { col: 'AW', header: 'Email', key: 'email', width: 22 },
  { col: 'AX', header: 'Zalo', key: 'zalo', width: 14 },
  { col: 'AY', header: 'Người nhận hàng', key: 'nguoiNhanHang', width: 18 },
  { col: 'AZ', header: 'SĐT nhận hàng', key: 'sdtNhanHang', width: 16 },
  { col: 'BA', header: 'Địa chỉ nhận hàng', key: 'diaChiNhanHang', width: 30 },
  { col: 'BB', header: 'Tên tài khoản ngân hàng', key: 'tenTaiKhoanNganHang', width: 20 },
  { col: 'BC', header: 'Số tài khoản', key: 'soTaiKhoan', width: 18 },
  { col: 'BD', header: 'Ngân hàng', key: 'nganHang', width: 16 },
  { col: 'BE', header: 'Số CCCD', key: 'soCccd', width: 16 },
  // Cột định danh kỹ thuật cho luồng sync web-admin
  { col: 'BF', header: 'Mã dòng (Row ID)', key: 'rowId', width: 22 }
];

function populateWorksheet(ws, storeConfig) {
  // Set sheet view
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 5 }];

  // Header row
  const headerRow = ws.getRow(1);
  COLUMNS_SPEC.forEach((c, idx) => {
    headerRow.getCell(idx + 1).value = c.header;
    ws.getColumn(idx + 1).width = c.width;
  });

  // Header style
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Be Vietnam Pro', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF24457A' } // Token accent #24457A
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data rows
  const today = '29/10/2026';
  const month = '2026/10';

  storeConfig.sampleKocs.forEach((koc, kIdx) => {
    const rowNum = kIdx + 2;
    const row = ws.getRow(rowNum);
    const prod = storeConfig.products[kIdx % storeConfig.products.length];
    const rowId = `ROW-${storeConfig.code}-${String(kIdx + 1).padStart(3, '0')}`;

    const values = {
      ngayDien: today,
      thang: month,
      nhanSuDien: storeConfig.pic,
      dot: 'Đợt 1',
      store: storeConfig.name,
      sanPham: prod,
      idKenh: koc.idKenh,
      tenKenh: koc.tenKenh,
      linkKenh: { formula: `CONCAT("https://www.tiktok.com/@", G${rowNum})` },
      follower: koc.follower,
      tepKenh: storeConfig.category,
      contentTag: 'Review trực tiếp',
      tepBooking: koc.giaNet <= 2000000 ? 'KL2' : (koc.giaNet <= 5000000 ? 'KL3' : 'KL4'),
      giaDaHopTacTruocDo: koc.giaNet * 0.95,
      loaiGia: 'Booking',
      giaNetVideo: koc.giaNet,
      phiBookingKemThue: { formula: `ROUND(P${rowNum}/0.9, 0)` },
      trangThai: 'Đã đề xuất',
      deXuatUpBase: 'Recommend',
      contentNote: `Video ngắn review thực tế tính năng nổi bật của ${prod}, có call to action gắn giỏ hàng`,
      brandChon: koc.brandChon,
      lyDoTuChoi: koc.brandChon === 'No' ? 'Chưa phù hợp tệp khách hàng' : '',
      thanhQuaHopTac: 'Đã hợp tác chiến dịch T9/2026 đạt ROI 2.8',
      thanhQuaBrandNgoai: 'Kênh tương tác tốt trong ngành làm đẹp',
      doanhSo: { formula: `AA${rowNum}*AC${rowNum}` },
      doanhSoUocTinh30d: koc.soMon * koc.aov * 1.1,
      soMonBanRa: koc.soMon,
      gpm: 1850000,
      aov: koc.aov,
      viewTrungBinh: Math.round(koc.follower * 0.15),
      costPerView: { formula: `ROUND(P${rowNum}/AD${rowNum}, 1)` },
      gmvTuVideoPct: 0.65,
      gmvTuLivePct: 0.25,
      gmvTuTheSanPhamPct: 0.10,
      tiTrongNganhHang: storeConfig.category,
      namPct: 0.20,
      nuPct: 0.80,
      tuoi18_24Pct: 0.55,
      tuoi25_34Pct: 0.35,
      tuoiOtherPct: 0.10,
      location: 'Việt Nam',
      ngayAirPlan: '05/11/2026',
      gmvTarget: { formula: `ROUND(AD${rowNum}*0.04*0.02*AC${rowNum}, 0)` },
      viewTrungVi: Math.round(koc.follower * 0.12),
      ctrPct: 0.04,
      crPct: 0.02,
      viewTarget: Math.round(koc.follower * 0.18),
      tyLeTuongTacPct: 0.045,
      email: `${koc.idKenh.replace(/\./g, '')}@gmail.com`,
      zalo: `098****${String(100 + kIdx * 33).slice(0, 3)}`,
      nguoiNhanHang: koc.tenKenh,
      sdtNhanHang: `098****${String(100 + kIdx * 33).slice(0, 3)}`,
      diaChiNhanHang: 'Hà Nội / TP. Hồ Chí Minh',
      tenTaiKhoanNganHang: koc.tenKenh.toUpperCase(),
      soTaiKhoan: `1903****${String(456 + kIdx * 111)}`,
      nganHang: 'Techcombank',
      soCccd: `0012****${String(7890 + kIdx * 10)}`,
      rowId: rowId
    };

    COLUMNS_SPEC.forEach((c, idx) => {
      const cell = row.getCell(idx + 1);
      const val = values[c.key];
      if (val && typeof val === 'object' && val.formula) {
        cell.value = val;
      } else {
        cell.value = val !== undefined ? val : '';
      }

      cell.font = { name: 'Be Vietnam Pro', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Format số nguyên tiền tệ VND
      if (['follower', 'giaDaHopTacTruocDo', 'giaNetVideo', 'phiBookingKemThue', 'doanhSo', 'doanhSoUocTinh30d', 'soMonBanRa', 'gpm', 'aov', 'viewTrungBinh', 'gmvTarget', 'viewTrungVi', 'viewTarget'].includes(c.key)) {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (['gmvTuVideoPct', 'gmvTuLivePct', 'gmvTuTheSanPhamPct', 'namPct', 'nuPct', 'tuoi18_24Pct', 'tuoi25_34Pct', 'tuoiOtherPct', 'ctrPct', 'crPct', 'tyLeTuongTacPct'].includes(c.key)) {
        cell.numFmt = '0.0%';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (['ngayDien', 'thang', 'dot', 'brandChon', 'rowId'].includes(c.key)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Tô màu Brand chọn
      if (c.key === 'brandChon') {
        if (cell.value === 'Yes') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // positive light
          cell.font = { name: 'Be Vietnam Pro', size: 9, bold: true, color: { argb: 'FF166534' } };
        } else if (cell.value === 'No') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // critical light
          cell.font = { name: 'Be Vietnam Pro', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // warning light
          cell.font = { name: 'Be Vietnam Pro', size: 9, bold: true, color: { argb: 'FF92400E' } };
        }
      }
    });

    row.height = 22;
  });
}

async function run() {
  console.log('=== BẮT ĐẦU TẠO CÁC FILE SHEET TEST CHO CÁC GIAN HÀNG ===\n');

  // 1. Tạo từng file riêng biệt cho mỗi gian hàng
  for (const store of STORES_CONFIG) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Upbase B2C System';
    wb.lastModifiedBy = 'Upbase Admin';
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet(store.brand || store.name);
    populateWorksheet(ws, store);

    const fileName = `${store.code}_Booking_Sheet_Test.xlsx`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    await wb.xlsx.writeFile(filePath);
    console.log(`[ĐÃ TẠO] ${fileName}`);
  }

  // 2. Tạo 1 file tổng hợp Master chứa tất cả các tab gian hàng
  const masterWb = new ExcelJS.Workbook();
  masterWb.creator = 'Upbase B2C System';
  masterWb.created = new Date();

  for (const store of STORES_CONFIG) {
    // Tên tab tối đa 31 ký tự trong Excel và phải là duy nhất
    const tabName = store.code.replace(/_/g, ' ').slice(0, 31);
    const ws = masterWb.addWorksheet(tabName);
    populateWorksheet(ws, store);
  }

  const masterFileName = 'Master_All_Stores_B2C_Test.xlsx';
  const masterFilePath = path.join(OUTPUT_DIR, masterFileName);
  await masterWb.xlsx.writeFile(masterFilePath);
  console.log(`[ĐÃ TẠO MASTER TỔNG HỢP] ${masterFileName}`);

  console.log(`\nHoàn tất! Tổng cộng 11 file Excel đã được tạo tại thư mục:\n${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error('Lỗi khi tạo file:', err);
  process.exit(1);
});
