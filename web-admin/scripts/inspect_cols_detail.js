const ExcelJS = require('exceljs');
const path = require('path');

function colToLetter(col) {
  let temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter;
}

async function inspectColsDetail() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_3.2 List duyệt book.xlsx'));
  const ws = wb.worksheets[0];
  const row1 = ws.getRow(1);
  const row2 = ws.getRow(2);
  const row3 = ws.getRow(3);
  const row4 = ws.getRow(4);

  const targetCols = [
    6,  // F: Ngày air/live real
    9,  // I: Link air/Link nghiệm thu
    16, // P: Ngày điền link air
    19, // S: Định dạng nghiệm thu
    30, // AD: Trạng thái phiếu thanh toán
    51, // AY: Đối soát chi phí (nghiệm thu mã BO)
    60, // BH: Link air format chuẩn
    61, // BI: P.Ngày air
    86, // CJ: P.Ngày KOC gửi kịch bản
    87, // CK: P.Ngày KOC gửi demo
    103 // CX: P.Ngày làm ĐNTT
  ];

  console.log('--- CHI TIẾT CÁC CỘT NGHIỆM THU TRONG FILE 3.2 LIST DUYỆT BOOK ---');
  targetCols.forEach(colIdx => {
    const letter = colToLetter(colIdx);
    const header = row1.getCell(colIdx).value;
    const sample1 = row2.getCell(colIdx).value;
    const sample2 = row3.getCell(colIdx).value;
    const sample3 = row4.getCell(colIdx).value;

    console.log('----------------------------------------------------');
    console.log('Cột index: ' + colIdx + ' | Chữ cái Excel: Cột ' + letter);
    console.log('Tên hiển thị trên Lark/Excel: "' + header + '"');
    console.log('Dữ liệu mẫu 1:', sample1);
    console.log('Dữ liệu mẫu 2:', sample2);
    console.log('Dữ liệu mẫu 3:', sample3);
  });
}

inspectColsDetail();
