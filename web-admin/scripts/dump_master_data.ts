import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const masterDir = 'E:/Upbase/B2C/Master data';

async function dumpAll() {
  const files = [
    'B2C_Quản lý Booking_5.1 Stores.xlsx',
    'B2C_Quản lý Booking_5.3 Phân loại video.xlsx',
    'B2C_Quản lý Booking_5.4 Tệp KOCs.xlsx',
    'B2C_Quản lý Booking_5.5 Pillar content.xlsx',
    'B2C_Quản lý Booking_5.6 Tệp cast.xlsx',
    'B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx',
  ];

  const result: Record<string, any> = {};

  for (const file of files) {
    const filePath = path.join(masterDir, file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    result[file] = {};

    for (const worksheet of workbook.worksheets) {
      const rows: any[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : row.values;
        rows.push(values);
      });
      result[file][worksheet.name] = {
        totalRows: rows.length,
        headers: rows[0],
        sampleRows: rows.slice(1, 10),
        allRows: rows.length <= 50 ? rows.slice(1) : undefined
      };
    }
  }

  fs.writeFileSync('E:/Upbase/B2C/Master data/master_data_dump.json', JSON.stringify(result, null, 2), 'utf-8');
  console.log('Dump completed to E:/Upbase/B2C/Master data/master_data_dump.json');
}

dumpAll();
