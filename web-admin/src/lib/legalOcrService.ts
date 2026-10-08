// ==============================================================================
// UPBASE B2C MARKETING OPERATIONS HUB — TESSERACT LOCAL OCR SERVICE
// Động cơ nhận diện ký tự quang học (OCR) nội bộ 100% — Không phụ thuộc API ngoài
// Tự động bóc tách Căn cước công dân (CCCD) & Giấy phép Đăng ký kinh doanh (ĐKKD)
// ==============================================================================

import path from 'path';
import fs from 'fs';
import { createWorker, OEM } from 'tesseract.js';
import { 
  LegalDocumentType, 
  OcrLegalExtractionResult, 
  RecommendedContractTemplate,
  OcrExtractedFields 
} from './types';

function getTesseractOptions() {
  const candidateWorkerPaths = [
    path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js'),
    path.join(process.cwd(), 'web-admin/node_modules/tesseract.js/src/worker-script/node/index.js'),
  ];
  const workerPath = candidateWorkerPaths.find(p => fs.existsSync(p));

  const candidateLangPaths = [
    process.cwd(),
    path.join(process.cwd(), 'web-admin'),
  ];
  const langPath = candidateLangPaths.find(p => fs.existsSync(path.join(p, 'vie.traineddata'))) || process.cwd();

  return {
    workerPath,
    langPath,
    gzip: false,
  };
}

let cachedWorker: any = null;

async function getOrInitWorker() {
  if (cachedWorker) return cachedWorker;

  const options = getTesseractOptions();
  try {
    const worker = await createWorker(['vie', 'eng'], OEM.LSTM_ONLY, options);
    cachedWorker = worker;
    return worker;
  } catch (err) {
    console.warn('[Tesseract: vie worker init fallback to eng]', err);
    const worker = await createWorker('eng', OEM.LSTM_ONLY, options);
    cachedWorker = worker;
    return worker;
  }
}

import { SAMPLE_OCR_PRESETS } from './ocrPresets';
export { SAMPLE_OCR_PRESETS };

/**
 * Xử lý bóc tách tài liệu pháp lý bằng Tesseract OCR Engine (Local 100%)
 */
export async function processLegalOcr(params: {
  imageBase64?: string;
  documentTypeHint?: 'AUTO' | 'CCCD' | 'BUSINESS_LICENSE';
  fileName?: string;
  presetKey?: keyof typeof SAMPLE_OCR_PRESETS;
  apiKey?: string;
}): Promise<OcrLegalExtractionResult> {
  const { imageBase64, documentTypeHint = 'AUTO', fileName = 'document.jpg', presetKey } = params;

  // 1. Dữ liệu Preset mẫu (khi người dùng click chọn mẫu test)
  if (presetKey && SAMPLE_OCR_PRESETS[presetKey]) {
    return {
      ...SAMPLE_OCR_PRESETS[presetKey],
      extractedAt: new Date().toISOString()
    };
  }

  if (!imageBase64) {
    throw new Error('Không tìm thấy dữ liệu ảnh để bóc tách OCR.');
  }

  // 2. Chạy Tesseract OCR Engine trực tiếp trên máy chủ nội bộ (100% Offline)
  try {
    return await extractWithTesseract(imageBase64, fileName, documentTypeHint);
  } catch (error: any) {
    console.error('[Tesseract Local OCR Execution Error]:', error);
    throw new Error(`Lỗi nhận diện Tesseract OCR: ${error.message || 'Không thể đọc được ảnh'}`);
  }
}

/**
 * Trích xuất trực tiếp bằng Tesseract OCR Engine (Đọc ảnh thật 100% bằng ngôn ngữ Tiếng Việt + Tiếng Anh)
 */
async function extractWithTesseract(
  base64Data: string, 
  fileName: string, 
  documentTypeHint?: string
): Promise<OcrLegalExtractionResult> {
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  // Khởi tạo hoặc tái sử dụng Tesseract worker với đường dẫn chuẩn hóa
  const worker = await getOrInitWorker();

  // Đặt timeout 15 giây để đảm bảo không bao giờ bị treo vĩnh viễn
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Tesseract OCR xử lý quá thời gian quy định (15 giây). Vui lòng thử lại với ảnh rõ nét hơn.'));
    }, 15000);
  });

  let data;
  try {
    const result = await Promise.race([worker.recognize(imageBuffer), timeoutPromise]);
    data = result.data;
  } catch (err: any) {
    // Nếu gặp lỗi worker, reset cached worker để yêu cầu sau tạo lại sạch
    try {
      if (cachedWorker) {
        await cachedWorker.terminate();
      }
    } catch (_) {}
    cachedWorker = null;
    throw err;
  }

  const rawText = data?.text || '';
  const confidence = (data?.confidence || 80) / 100;

  return parseLegalDocumentFromOcrText(rawText, fileName, confidence, documentTypeHint);
}

/**
 * Bóc tách ký tự và trích xuất cấu trúc văn bản pháp lý từ chuỗi ký tự OCR thực tế
 */
export function parseLegalDocumentFromOcrText(
  rawText: string, 
  fileName: string, 
  baseConfidence: number = 0.85,
  documentTypeHint?: string
): OcrLegalExtractionResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fields: OcrExtractedFields = {};
  const validationNotes: string[] = [];

  // =========================================================================
  // 1. Phân loại loại tài liệu (CCCD vs Doanh Nghiệp vs Hộ Kinh Doanh)
  // =========================================================================
  const isCccdSignal = /căn cước|can cuoc|citizen|identity|cmnd|chứng minh nhân dân|quê quán|nơi thường trú|nơi cư trú|có giá trị đến|giới tính|date of birth/i.test(rawText);
  const isHkdSignal = /hộ kinh doanh|ho kinh doanh|chủ hộ|đăng ký hộ/i.test(rawText);
  const isCompanySignal = /doanh nghiệp|công ty|tnhh|cổ phần|giám đốc|trụ sở chính|vốn điều lệ/i.test(rawText);

  let docType: LegalDocumentType = 'CCCD';
  if (documentTypeHint === 'CCCD') {
    docType = 'CCCD';
  } else if (documentTypeHint === 'BUSINESS_LICENSE') {
    docType = isHkdSignal ? 'BUSINESS_HOUSEHOLD' : 'BUSINESS_LICENSE';
  } else if (isHkdSignal) {
    docType = 'BUSINESS_HOUSEHOLD';
  } else if (isCompanySignal) {
    docType = 'BUSINESS_LICENSE';
  } else if (isCccdSignal) {
    docType = 'CCCD';
  } else {
    // Thử đoán theo số định danh: 12 số -> CCCD, 10 số -> MST Doanh Nghiệp
    const has12Digits = /\b\d{12}\b/.test(rawText.replace(/\s+/g, ''));
    const has10Digits = /\b\d{10}\b/.test(rawText.replace(/\s+/g, ''));
    if (has12Digits) docType = 'CCCD';
    else if (has10Digits) docType = 'BUSINESS_LICENSE';
  }

  // =========================================================================
  // 2. Trích xuất tài liệu CCCD (Cá Nhân)
  // =========================================================================
  if (docType === 'CCCD') {
    // 2.1 Số CCCD (12 chữ số) hoặc CMND (9 chữ số)
    // Ưu tiên dòng có mã vạch MRZ ở mặt sau chip CCCD: IDVNM...
    const mrzMatch = rawText.match(/[I1][D<0]VNM([0-9]{12})/i);
    // Nhãn "Số / No:" hoặc "Số định danh cá nhân / Personal identification number:"
    const idWithLabelMatch = rawText.match(/(?:Số|No|So|Số\s*\/[^\d\n]*|Số\s*định\s*danh[^\d\n]*)\s*[:/.]*\s*([0-9\s.-]{12,18})/i);
    // Định dạng nhóm số phân đoạn (vd: 001 201 019 876 hoặc 0012 0101 9876)
    const spaced12Match = rawText.match(/\b([0-9]{3}[\s.-]+[0-9]{3}[\s.-]+[0-9]{3}[\s.-]+[0-9]{3})\b/)
      || rawText.match(/\b([0-9]{4}[\s.-]+[0-9]{4}[\s.-]+[0-9]{4})\b/)
      || rawText.match(/\b([0-9]{3}[\s.-]+[0-9]{2}[\s.-]+[0-9]{3}[\s.-]+[0-9]{4})\b/);
    // Chuỗi 12 số liên tiếp
    const standalone12Match = rawText.match(/\b([0-9]{12})\b/);
    // Chuỗi 9 số CMND cũ
    const cmndMatch = rawText.match(/\b([0-9]{9})\b/);

    if (mrzMatch) {
      fields.idNumber = mrzMatch[1];
      validationNotes.push('Nhận diện số CCCD chuẩn xác từ mã vạch chip MRZ');
    } else if (idWithLabelMatch) {
      const cleanDigits = idWithLabelMatch[1].replace(/[\s.-]+/g, '');
      if (cleanDigits.length === 12) {
        fields.idNumber = cleanDigits;
        validationNotes.push('Nhận diện số CCCD chuẩn 12 chữ số theo dòng nhãn');
      }
    } else if (spaced12Match) {
      fields.idNumber = spaced12Match[1].replace(/[\s.-]+/g, '');
      validationNotes.push('Nhận diện số CCCD 12 chữ số (dạng phân đoạn)');
    } else if (standalone12Match) {
      fields.idNumber = standalone12Match[1];
      validationNotes.push('Nhận diện chuỗi 12 chữ số hợp lệ cho CCCD');
    } else if (cmndMatch) {
      fields.idNumber = cmndMatch[1];
      validationNotes.push('Nhận diện số CMND 9 chữ số (Mẫu cũ)');
    } else {
      // Heuristic sửa lỗi ký tự OCR phổ biến: O -> 0, I -> 1, l -> 1
      const fuzzyMatch = rawText.match(/\b([0-9OIl]{12})\b/);
      if (fuzzyMatch) {
        const repaired = fuzzyMatch[1].replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
        if (/^\d{12}$/.test(repaired)) {
          fields.idNumber = repaired;
          validationNotes.push('Đã hiệu chỉnh ký tự OCR sang định dạng số CCCD 12 chữ số');
        }
      }
      if (!fields.idNumber) {
        validationNotes.push('Chưa nhận diện rõ số CCCD 12 số (Vui lòng kiểm tra lại ảnh chụp hoặc tự điền)');
      }
    }

    // 2.2 Họ và tên (Full Name)
    let foundName = false;
    const nameLabelRegex = /.*(?:Họ,?\s*(?:chữ\s*đệm\s*)?và\s*tên|Họ\s*tên|Full\s*name)(?:\s*[\/|\\]\s*[^\n:]*)?\s*[:/.]*\s*/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Họ và tên|Họ, chữ đệm và tên|Full name|HỌ VÀ TÊN/i.test(line)) {
        let afterColon = line.replace(nameLabelRegex, '').trim();
        // Loại bỏ các trường gắn liền cùng dòng nếu có (ví dụ: Giới tính, Ngày sinh, Quốc tịch)
        afterColon = afterColon.replace(/\s*(?:Ngày\s*sinh|Date\s*of\s*birth|Giới\s*tính|Sex|Quốc\s*tịch|Nationality).*$/i, '').trim();

        if (afterColon && afterColon.length >= 3 && !/^(công dân|citizen|identity card|cộng hòa|độc lập)$/i.test(afterColon)) {
          fields.fullName = cleanFullName(afterColon);
          foundName = true;
          break;
        } else if (i + 1 < lines.length) {
          let nextLine = lines[i + 1].trim();
          if (nextLine && !/^(ngày sinh|date of birth|giới tính|sex|quốc tịch|nationality|quê quán|nơi thường trú)/i.test(nextLine)) {
            nextLine = nextLine.replace(/\s*(?:Ngày\s*sinh|Date\s*of\s*birth|Giới\s*tính|Sex|Quốc\s*tịch|Nationality).*$/i, '').trim();
            if (nextLine.length >= 2) {
              fields.fullName = cleanFullName(nextLine);
              foundName = true;
              break;
            }
          }
        }
      }
    }

    // Fallback tìm dòng chữ in hoa toàn bộ có từ 2 đến 5 từ (đặc trưng tên Việt Nam)
    if (!foundName) {
      for (const line of lines) {
        if (/^[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸ\s]{5,35}$/.test(line)) {
          if (!/CỘNG HÒA|ĐỘC LẬP|HẠNH PHÚC|CĂN CƯỚC|CÔNG DÂN|VIỆT NAM|GIÁ TRỊ|QLHC|CỤC CẢNH SÁT/i.test(line)) {
            fields.fullName = cleanFullName(line);
            break;
          }
        }
      }
    }

    // 2.3 Ngày sinh (DOB)
    const dobMatch = rawText.match(/(?:Ngày\s*sinh|Date\s*of\s*birth|sinh\s*ngày|Sinh|DOB)\s*[:/.]*\s*([0-3]?[0-9][\s/.-]+[0-1]?[0-9][\s/.-]+(?:19|20)[0-9]{2})/i) 
      || rawText.match(/\b([0-3]?[0-9][\s/.-]+[0-1]?[0-9][\s/.-]+(?:19|20)[0-9]{2})\b/);
    if (dobMatch) {
      fields.dob = dobMatch[1].replace(/\s+/g, '').replace(/[-.]/g, '/');
    }

    // 2.4 Giới tính
    const genderMatch = rawText.match(/(?:Giới\s*tính|Sex)\s*[:/.]*\s*(Nam|Nữ|Male|Female)/i);
    if (genderMatch) {
      const g = genderMatch[1].toLowerCase();
      fields.gender = (g === 'nam' || g === 'male') ? 'Nam' : 'Nữ';
    } else if (/\bNam\b/.test(rawText) && !/\bNữ\b/i.test(rawText)) {
      fields.gender = 'Nam';
    } else if (/\bNữ\b/i.test(rawText)) {
      fields.gender = 'Nữ';
    }

    // 2.5 Quốc tịch
    fields.nationality = 'Việt Nam';

    // 2.6 Nơi thường trú / Nơi cư trú
    const resLabelRegex = /.*(?:Nơi\s*(?:thường\s*trú|cư\s*trú)|Place\s*of\s*residence|Thường\s*trú)(?:\s*[\/|\\]\s*[^\n:]*)?\s*[:/.]*\s*/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Nơi thường trú|Nơi cư trú|Place of residence|Thường trú/i.test(line)) {
        let addr = line.replace(resLabelRegex, '').trim();
        if (!addr && i + 1 < lines.length) {
          addr = lines[i + 1].trim();
        }
        if (i + 2 < lines.length) {
          const next = lines[i + 2].trim();
          if (/xã|phường|thị trấn|quận|huyện|thị xã|tỉnh|thành phố|tp\b|hà nội|hồ chí minh|đà nẵng/i.test(next) && !/có giá trị|date of|ngày cấp|cục cảnh sát/i.test(next)) {
            addr += (addr ? ', ' : '') + next;
          }
        }
        if (addr) fields.permanentAddress = addr;
        break;
      }
    }

    // 2.7 Quê quán
    const originLabelRegex = /.*(?:Quê\s*quán|Place\s*of\s*origin|Nơi\s*sinh)(?:\s*[\/|\\]\s*[^\n:]*)?\s*[:/.]*\s*/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Quê quán|Place of origin/i.test(line)) {
        let origin = line.replace(originLabelRegex, '').trim();
        if (!origin && i + 1 < lines.length) {
          origin = lines[i + 1].trim();
        }
        if (origin) fields.originAddress = origin;
        break;
      }
    }

    // 2.8 Ngày cấp & Nơi cấp
    const issueMatch = rawText.match(/(?:Ngày cấp|Cấp ngày|Ngày, tháng, năm|Date, month, year)\s*[:/.]*\s*([0-3]?[0-9][\s/.-]+[0-1]?[0-9][\s/.-]+(?:19|20)[0-9]{2})/i);
    if (issueMatch) {
      fields.issueDate = issueMatch[1].replace(/\s+/g, '').replace(/[-.]/g, '/');
    }
    if (/Cục Cảnh sát|CỤC TRƯỞNG CỤC CẢNH SÁT|QLHC/i.test(rawText)) {
      fields.issuePlace = 'Cục Cảnh sát QLHC về TTXH';
    }

    // 2.9 Có giá trị đến / Ngày hết hạn
    const expiryMatch = rawText.match(/(?:Có giá trị đến|Date of expiry|Hạn sử dụng|Giá trị đến)\s*[:/.]*\s*([0-3]?[0-9][\s/.-]+[0-1]?[0-9][\s/.-]+(?:19|20)[0-9]{2}|Không thời hạn)/i);
    if (expiryMatch) {
      fields.expiryDate = expiryMatch[1].replace(/\s+/g, '').replace(/[-.]/g, '/');
    }
  }

  // =========================================================================
  // 3. Trích xuất Doanh Nghiệp (BUSINESS_LICENSE) hoặc Hộ Kinh Doanh (HKD)
  // =========================================================================
  if (docType === 'BUSINESS_LICENSE' || docType === 'BUSINESS_HOUSEHOLD') {
    // 3.1 Mã số thuế / Mã số doanh nghiệp (10 số hoặc 13 số có gạch nối)
    const taxMatch = rawText.match(/(?:Mã số doanh nghiệp|Mã số thuế|MST|Mã số)\s*[:/.]*\s*([0-9\s]{10,14}(?:-[0-9]{3})?)/i)
      || rawText.match(/\b([0-9]{10}(?:-[0-9]{3})?)\b/);
    if (taxMatch) {
      fields.taxCode = taxMatch[1].replace(/\s+/g, '');
      validationNotes.push(`Nhận diện Mã số thuế: ${fields.taxCode}`);
    }

    // 3.2 Tên công ty / Tên hộ kinh doanh
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/CÔNG TY TNHH|CÔNG TY CỔ PHẦN|HỘ KINH DOANH|DOANH NGHIỆP TƯ NHÂN/i.test(line)) {
        fields.companyName = line.toUpperCase().trim();
        break;
      } else if (/Tên công ty|Tên doanh nghiệp|Tên hộ kinh doanh/i.test(line)) {
        const afterColon = line.replace(/.*(Tên công ty|Tên doanh nghiệp|Tên hộ kinh doanh)\s*[:/.]?\s*/i, '').trim();
        if (afterColon) {
          fields.companyName = afterColon.toUpperCase();
          break;
        } else if (i + 1 < lines.length) {
          fields.companyName = lines[i + 1].toUpperCase();
          break;
        }
      }
    }

    // 3.3 Địa chỉ trụ sở chính
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Địa chỉ trụ sở|Địa chỉ|Trụ sở chính|Địa điểm kinh doanh/i.test(line)) {
        let addr = line.replace(/.*(Địa chỉ trụ sở chính|Địa chỉ trụ sở|Địa điểm kinh doanh|Địa chỉ)\s*[:/.]?\s*/i, '').trim();
        if (!addr && i + 1 < lines.length) {
          addr = lines[i + 1];
        }
        if (addr) fields.headquartersAddress = addr;
        break;
      }
    }

    // 3.4 Người đại diện theo pháp luật / Chủ hộ
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Người đại diện theo pháp luật|Chủ hộ kinh doanh|Chủ hộ|Đại diện pháp luật/i.test(line)) {
        let rep = line.replace(/.*(Người đại diện theo pháp luật|Chủ hộ kinh doanh|Chủ hộ|Đại diện pháp luật)\s*[:/.]?\s*/i, '').trim();
        if (!rep && i + 1 < lines.length) {
          rep = lines[i + 1];
        }
        if (rep) {
          fields.legalRepresentative = cleanFullName(rep);
          fields.legalRepTitle = docType === 'BUSINESS_HOUSEHOLD' ? 'Chủ hộ kinh doanh' : 'Giám đốc';
          break;
        }
      }
    }

    // 3.5 Ngày đăng ký
    const regDateMatch = rawText.match(/(?:Đăng ký lần đầu|ngày cấp|Đăng ký ngày)\s*[:/.]*\s*(?:ngày)?\s*([0-3]?[0-9][\s/.-]+[0-1]?[0-9][\s/.-]+(?:19|20)[0-9]{2})/i);
    if (regDateMatch) {
      fields.registrationDate = regDateMatch[1].replace(/\s+/g, '').replace(/[-.]/g, '/');
    }
  }

  // Tính toán confidence theo mức độ đầy đủ của trường
  let fieldCount = 0;
  if (fields.idNumber || fields.taxCode) fieldCount += 2;
  if (fields.fullName || fields.companyName) fieldCount += 2;
  if (fields.permanentAddress || fields.headquartersAddress) fieldCount += 1;
  if (fields.dob || fields.registrationDate) fieldCount += 1;

  const finalConfidence = Math.min(0.95, Math.max(0.65, (fieldCount / 6) * baseConfidence + 0.2));

  validationNotes.unshift('Bóc tách 100% bằng Động cơ Tesseract OCR Ngoại Tuyến (vie + eng)');

  return {
    documentType: docType,
    documentTypeLabel: docType === 'CCCD' ? 'Căn Cước Công Dân Gắn Chip (Tesseract Local OCR)' 
      : docType === 'BUSINESS_HOUSEHOLD' ? 'Đăng Ký Hộ Kinh Doanh (Tesseract Local OCR)'
      : 'Đăng Ký Doanh Nghiệp (Tesseract Local OCR)',
    confidence: Number(finalConfidence.toFixed(2)),
    extractedAt: new Date().toISOString(),
    fileName,
    fields,
    recommendedTemplate: getRecommendedTemplate(docType),
    validationNotes,
    rawTextPreview: rawText
  };
}

function cleanFullName(raw: string): string {
  return raw
    .replace(/^(?:họ,?\s*(?:chữ\s*đệm\s*)?và\s*tên|họ\s*và\s*tên|full\s*name|họ\s*tên|tên)\s*[:/.]*\s*/i, '')
    .replace(/^(?:ông|bà|mr|mrs|ms)\.?\s+/i, '')
    .replace(/[0-9:;.,()_=+*/~`!@#$%^&|\\<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getRecommendedTemplate(docType: LegalDocumentType): RecommendedContractTemplate {
  if (docType === 'CCCD') {
    return SAMPLE_OCR_PRESETS.CCCD_INDIVIDUAL.recommendedTemplate;
  } else if (docType === 'BUSINESS_HOUSEHOLD') {
    return SAMPLE_OCR_PRESETS.BUSINESS_HOUSEHOLD.recommendedTemplate;
  } else {
    return SAMPLE_OCR_PRESETS.BUSINESS_COMPANY.recommendedTemplate;
  }
}

