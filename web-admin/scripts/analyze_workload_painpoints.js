const ExcelJS = require('exceljs');
const path = require('path');

async function checkKenhT9() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'test claude workload nhân sự.xlsx'));
  const ws = wb.getWorksheet('Thực trạng video kênh T9');
  console.log('--- Thực trạng video kênh T9 ---');
  let outOfScopeCount = 0;
  let delayConceptCount = 0;
  let delayScriptCount = 0;
  let changeCtvCount = 0;
  let totalRows = 0;
  const outOfScopeSamples = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const store = row.getCell(1).value;
    const pic = row.getCell(2).value;
    const outOfScope = row.getCell(13).value;
    const ctvChange = row.getCell(16).value;
    const delayConcept = row.getCell(17).value;
    const delayScript = row.getCell(18).value;

    if (store && pic) {
      totalRows++;
      if (outOfScope && String(outOfScope).trim() !== '' && String(outOfScope).trim() !== 'Không') {
        outOfScopeCount++;
        if (outOfScopeSamples.length < 5) {
          outOfScopeSamples.push({ store, pic, outOfScope: String(outOfScope).trim() });
        }
      }
      if (ctvChange && String(ctvChange).trim() !== '' && String(ctvChange).trim() !== 'Không') changeCtvCount++;
      if (delayConcept && String(delayConcept).trim() !== '' && String(delayConcept).trim() !== 'Không') delayConceptCount++;
      if (delayScript && String(delayScript).trim() !== '' && String(delayScript).trim() !== 'Không') delayScriptCount++;
    }
  }

  console.log('Tổng số gian hàng làm video kênh được khảo sát:', totalRows);
  console.log('Số gian phải làm việc NGOÀI PHẠM VI (Out of scope): ' + outOfScopeCount + ' / ' + totalRows + ' (' + ((outOfScopeCount/totalRows)*100).toFixed(1) + '%)');
  console.log('Số gian bị THAY ĐỔI CTV LIÊN TỤC: ' + changeCtvCount + ' (' + ((changeCtvCount/totalRows)*100).toFixed(1) + '%)');
  console.log('Số gian bị DUYỆT ĐỊNH HƯỚNG MUỘN (từ Brand/Lead): ' + delayConceptCount + ' (' + ((delayConceptCount/totalRows)*100).toFixed(1) + '%)');
  console.log('Số gian bị DUYỆT KỊCH BẢN MUỘN: ' + delayScriptCount + ' (' + ((delayScriptCount/totalRows)*100).toFixed(1) + '%)');

  console.log('\nTop ví dụ việc ngoài phạm vi (Out of Scope) của chuyên viên:');
  outOfScopeSamples.forEach((x, i) => {
    console.log((i + 1) + '. Gian ' + x.store + ' (PIC: ' + x.pic + '):');
    console.log('   Note: ' + x.outOfScope.replace(/\n/g, ' '));
  });
}

checkKenhT9();
