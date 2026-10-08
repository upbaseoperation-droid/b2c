import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const masterDir = 'E:/Upbase/B2C/Master data';

async function inspectFiles() {
  const files = fs.readdirSync(masterDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} Excel files in ${masterDir}\n`);

  for (const file of files) {
    const filePath = path.join(masterDir, file);
    console.log(`===================================================================`);
    console.log(`FILE: ${file}`);
    console.log(`===================================================================`);

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);
      console.log(`Worksheets (${workbook.worksheets.length}): ${workbook.worksheets.map(w => w.name).join(', ')}`);

      for (const worksheet of workbook.worksheets) {
        console.log(`\n--- Sheet: "${worksheet.name}" (Rows: ${worksheet.rowCount}, Cols: ${worksheet.columnCount}) ---`);
        
        // Print first 5 rows
        let rowCount = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowCount < 8) {
            const values = Array.isArray(row.values) ? row.values.slice(1) : row.values;
            console.log(`Row ${rowNumber}:`, JSON.stringify(values));
            rowCount++;
          }
        });
      }
    } catch (err: any) {
      console.error(`Error reading ${file}:`, err.message);
    }
    console.log('\n');
  }
}

inspectFiles();
