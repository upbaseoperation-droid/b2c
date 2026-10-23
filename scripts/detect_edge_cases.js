const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function detectEdgeCases() {
  console.log('Loading Master_KOC_UpAffiliate_ERD_Template.xlsx...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('./Master_KOC_UpAffiliate_ERD_Template.xlsx');
  const ws = wb.getWorksheet('Master_KOC_Template_ERD');

  const edgeCases = {
    multiCccd: [], // > 1 CCCD
    sharedCccd: [], // 1 CCCD nhiều kênh
    sharedBankAcc: [], // 1 STK nhiều kênh
    invalidCccdFormat: [], // CCCD rác / chứa chữ / < 9 số
    companyWithTncnTax: [], // Tên Công ty nhưng tính thuế TNCN 10% hoặc cá nhân tính VAT
    extremePriceVariation: [], // Giá min/max lệch > 5 lần
    manyPicsCollision: [], // Làm việc với >= 5 PIC
    highSpendNoContract: [], // Chi phí > 10 triệu nhưng không có link hợp đồng Drive
    nameAccountMismatch: [], // Trùng STK khác tên chủ TK
  };

  const stkToChannels = new Map(); // stk -> [{ cid, name, bank }]
  const cccdToChannels = new Map(); // cccd -> [cid]

  ws.eachRow((row, r) => {
    if (r <= 2) return;
    const cid = (row.getCell(2).text || '').trim();
    if (!cid) return;

    const realName = (row.getCell(4).text || '').trim();
    const pic = (row.getCell(7).text || '').trim();
    const workedPicsCount = typeof row.getCell(11).value === 'number' ? row.getCell(11).value : parseInt(row.getCell(11).text) || 0;
    const workedPicsList = (row.getCell(12).text || '').trim();
    const cccdFlag = (row.getCell(13).text || '').trim();
    const cccdCount = typeof row.getCell(14).value === 'number' ? row.getCell(14).value : parseInt(row.getCell(14).text) || 0;
    const allCccds = (row.getCell(15).text || '').trim();
    const sharedInfo = (row.getCell(16).text || '').trim();

    const cccd = (row.getCell(30).text || '').trim();
    const mst = (row.getCell(31).text || '').trim();
    const bankAccountName = (row.getCell(32).text || '').trim();
    const bankAccount = (row.getCell(33).text || '').trim();
    const bankName = (row.getCell(34).text || '').trim();
    const taxType = (row.getCell(35).text || '').trim();
    const contractUrl = (row.getCell(36).text || '').trim();

    const rateRecent = typeof row.getCell(46).value === 'number' ? row.getCell(46).value : parseFloat(row.getCell(46).text) || 0;
    const rateMin = typeof row.getCell(47).value === 'number' ? row.getCell(47).value : parseFloat(row.getCell(47).text) || 0;
    const rateMax = typeof row.getCell(48).value === 'number' ? row.getCell(48).value : parseFloat(row.getCell(48).text) || 0;
    const totalCost = typeof row.getCell(51).value === 'number' ? row.getCell(51).value : parseFloat(row.getCell(51).text) || 0;

    // 1. Multi CCCD
    if (cccdCount > 1) {
      edgeCases.multiCccd.push({ cid, realName, pic, cccdCount, allCccds });
    }

    // 2. Track Shared CCCD
    if (cccd) {
      const cleanCccd = cccd.replace(/[\s\.\-\/\:]/g, '');
      if (cleanCccd.length >= 8) {
        if (!cccdToChannels.has(cleanCccd)) cccdToChannels.set(cleanCccd, []);
        cccdToChannels.get(cleanCccd).push({ cid, realName, pic });
      }
    }

    // 3. Track Shared STK & Name Mismatch
    if (bankAccount) {
      const cleanStk = bankAccount.replace(/[\s\.\-\/\:]/g, '');
      if (cleanStk.length >= 6) {
        if (!stkToChannels.has(cleanStk)) stkToChannels.set(cleanStk, []);
        stkToChannels.get(cleanStk).push({ cid, realName: bankAccountName || realName, bank: bankName, pic });
      }
    }

    // 4. Invalid CCCD format
    if (cccd) {
      const clean = cccd.replace(/[\s\.\-\/\:]/g, '');
      if (/[a-zA-Z]/.test(clean) || (clean.length !== 9 && clean.length !== 12 && clean.length !== 10 && clean.length !== 13)) {
        edgeCases.invalidCccdFormat.push({ cid, cccd, realName, pic });
      }
    }

    // 5. Company vs Personal Tax Mismatch
    const isCompany = /công ty|tnhh|cty|cp|jsc|corp|enterprise|metaverse/i.test(bankAccountName);
    if (isCompany && /tncn/i.test(taxType)) {
      edgeCases.companyWithTncnTax.push({ cid, bankAccountName, taxType, pic });
    } else if (!isCompany && bankAccountName && /vat 8%/i.test(taxType)) {
      edgeCases.companyWithTncnTax.push({ cid, bankAccountName, taxType, pic, note: 'Tên cá nhân nhưng tích thuế VAT 8%' });
    }

    // 6. Extreme Price Variation (> 5x)
    if (rateMin > 0 && rateMax > 0 && rateMax >= rateMin * 5) {
      edgeCases.extremePriceVariation.push({ cid, rateMin, rateMax, ratio: (rateMax / rateMin).toFixed(1), pic });
    }

    // 7. Many PICs collision (>= 5 PICs)
    if (workedPicsCount >= 5) {
      edgeCases.manyPicsCollision.push({ cid, workedPicsCount, workedPicsList, pic });
    }

    // 8. High spend no contract
    if (totalCost >= 10000000 && !contractUrl) {
      edgeCases.highSpendNoContract.push({ cid, totalCost, realName, pic });
    }
  });

  // Calculate Shared CCCD
  cccdToChannels.forEach((list, cccd) => {
    if (list.length > 1) {
      edgeCases.sharedCccd.push({ cccd, count: list.length, channels: list.map(x => x.cid).join(', ') });
    }
  });

  // Calculate Shared STK & Name mismatch
  stkToChannels.forEach((list, stk) => {
    if (list.length > 1) {
      const distinctNames = new Set(list.map(x => x.realName.toLowerCase()).filter(Boolean));
      edgeCases.sharedBankAcc.push({
        stk,
        count: list.length,
        channels: list.map(x => x.cid).join(', '),
        names: list.map(x => x.realName).join(' | '),
        isNameMismatch: distinctNames.size > 1
      });
      if (distinctNames.size > 1) {
        edgeCases.nameAccountMismatch.push({
          stk,
          channels: list.map(x => x.cid).join(', '),
          names: Array.from(distinctNames).join(' vs ')
        });
      }
    }
  });

  console.log('--- KẾT QUẢ QUÉT CÁC EDGE CASE TRÊN TOÀN BỘ DANH BẠ KOC ---');
  console.log(`1. KOC có nhiều hơn 1 CCCD (> 1 CCCD): ${edgeCases.multiCccd.length}`);
  console.log(`2. Số CCCD được dùng chung cho nhiều kênh (Shared CCCD): ${edgeCases.sharedCccd.length}`);
  console.log(`3. Số Tài khoản ngân hàng được dùng chung cho nhiều kênh (Shared STK): ${edgeCases.sharedBankAcc.length}`);
  console.log(`4. Trùng STK nhưng KHÁC TÊN chủ tài khoản (Nguy cơ chuyển nhầm): ${edgeCases.nameAccountMismatch.length}`);
  console.log(`5. Định dạng CCCD/MST bất thường (chứa chữ, sai độ dài 9/12 số): ${edgeCases.invalidCccdFormat.length}`);
  console.log(`6. Lệch loại tài khoản thuế (Tên Công ty nhưng tính thuế TNCN 10% hoặc ngược lại): ${edgeCases.companyWithTncnTax.length}`);
  console.log(`7. Đơn giá biến động cực đoan (Max >= 5 lần Min trên cùng 1 kênh): ${edgeCases.extremePriceVariation.length}`);
  console.log(`8. Dẫm chân nhân sự (KOC từng làm việc với >= 5 PIC khác nhau): ${edgeCases.manyPicsCollision.length}`);
  console.log(`9. Đã chi số tiền lớn (>= 10 triệu) nhưng CHƯA CÓ LINK HỢP ĐỒNG: ${edgeCases.highSpendNoContract.length}`);
}

detectEdgeCases().catch(console.error);
