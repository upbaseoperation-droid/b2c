import ExcelJS from 'exceljs';
import path from 'path';

async function checkHeaders() {
  const masterDir = 'E:/Upbase/B2C/Master data';
  const files = [
    'B2C_Quản lý Booking_5.1 Stores.xlsx',
    'B2C_Quản lý Booking_5.3 Phân loại video.xlsx',
    'B2C_Quản lý Booking_5.4 Tệp KOCs.xlsx',
    'B2C_Quản lý Booking_5.5 Pillar content.xlsx',
    'B2C_Quản lý Booking_5.6 Tệp cast.xlsx',
    'B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx'
  ];
  for (const f of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(masterDir, f));
    console.log('=== FILE:', f, '===');
    wb.worksheets.forEach(ws => {
      const r1 = ws.getRow(1).values;
      console.log('Sheet:', ws.name, '| Total rows:', ws.rowCount, '| Headers:', JSON.stringify(r1));
      const r2 = ws.getRow(2).values;
      console.log('Sample Row 2:', JSON.stringify(r2));
    });
    console.log('\n');
  }
}
checkHeaders();
