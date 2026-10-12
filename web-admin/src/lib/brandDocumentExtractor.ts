// ==============================================================================
// TRÍCH XUẤT THÔNG TIN TÀI LIỆU NHÃN HÀNG (BRAND DOCUMENT EXTRACTOR)
// Đọc và bóc tách hồ sơ Brand Guideline, Công bố BYT, Lâm sàng & Danh mục SKU
// ==============================================================================

import { 
  BrandFileCategory, 
  ExtractedBrandInfo, 
  BrandDocumentFile, 
  BrandKnowledgeBase,
  BrandLegalCertification,
  DetailedHeroSku,
  BlacklistKeyword,
  WhitelistKeyword
} from './types';

// Dữ liệu mẫu hồ sơ các tệp tài liệu tiêu chuẩn đã được thẩm định
export const SAMPLE_BRAND_DOCUMENTS: BrandDocumentFile[] = [
  // 1. NHÃN HÀNG SENKA (NHẬT BẢN)
  {
    id: 'doc-senka-01',
    brandId: 'kb-senka',
    brandName: 'Senka',
    fileName: 'Senka_Brand_Guideline_Official_2026.pdf',
    fileSizeFormatted: '4.8 MB',
    fileType: 'pdf',
    category: 'BRAND_GUIDELINE',
    uploadDate: '2026-09-15',
    uploadedBy: 'Vân Ngọc (Account Lead)',
    status: 'ĐÃ_TRÍCH_XUẤT',
    notes: 'Quy chuẩn nhận diện, thông điệp truyền thông và danh mục từ cấm Q3-Q4/2026',
    extractedData: {
      documentType: 'BRAND_GUIDELINE',
      brandName: 'Senka',
      slogan: 'Sạch Sâu Tinh Khiết — Dịu Êm Làn Da Chuẩn Nhật',
      toneOfVoice: 'Khoa học, trong trẻo, gần gũi, tôn vinh làn da mộc tự nhiên.',
      targetAudience: 'Nữ giới 16-28 tuổi, học sinh, sinh viên, nhân viên văn phòng, da dầu mụn.',
      confidenceScore: 98,
      rawTextPreview: `[TRÍCH ĐOẠN BRAND GUIDELINE SENKA 2026]
Thương hiệu: Senka (Tập đoàn Shiseido Nhật Bản).
Slogan cốt lõi: Sạch Sâu Tinh Khiết — Dịu Êm Làn Da Chuẩn Nhật.
Định vị: Sữa rửa mặt tạo bọt làm sạch sâu số 1 Nhật Bản 15 năm liền.
Tone giọng: Bác sĩ chuyên gia / Da liễu khoa học, nhẹ nhàng, gần gũi, trung thực.
Từ cấm kỵ (Blacklist):
- "Trị dứt điểm mụn": Sai quy định mỹ phẩm BYT -> Đổi thành "Hỗ trợ làm sạch bã nhờn, ngừa khuẩn mụn".
- "100% không khô căng": Quảng cáo thổi phồng -> Đổi thành "Gấp đôi Hyaluronic Acid duy trì màng ẩm tự nhiên".
- "Tốt hơn Hada Labo/Biore": So sánh trực tiếp đối thủ vi phạm luật cạnh tranh.
Quy chuẩn hình ảnh:
- Do: Cận cảnh bọt tơ tằm siêu mịn xốp trên tay hoặc máy tạo bọt; ánh sáng ban ngày tự nhiên.
- Don't: Không để sản phẩm dính bẩn nắp chai; không để chung khung hình với sữa rửa mặt hãng khác.`,
      blacklistKeywords: [
        {
          keyword: 'Trị dứt điểm mụn',
          rationale: 'Vi phạm quy chế quản lý mỹ phẩm của Bộ Y tế (mỹ phẩm không có chức năng trị bệnh).',
          alternativeSuggestion: 'Hỗ trợ làm sạch bã nhờn, ngăn ngừa tác nhân gây mụn'
        },
        {
          keyword: '100% không khô căng',
          rationale: 'Dùng từ tuyệt đối không có căn cứ định lượng lâm sàng.',
          alternativeSuggestion: 'Gấp đôi Hyaluronic Acid giúp duy trì độ ẩm tự nhiên'
        },
        {
          keyword: 'Tốt hơn Biore hay Hada Labo',
          rationale: 'Nghiêm cấm so sánh dìm hàng trực tiếp thương hiệu đối thủ.',
          alternativeSuggestion: 'Công nghệ bọt tơ tằm trắng độc quyền từ Viện nghiên cứu Shiseido'
        }
      ],
      whitelistKeywords: [
        {
          phrase: 'Bọt tơ tằm trắng Mayu Haku siêu mịn',
          exampleUsage: 'Lớp bọt tơ tằm dày xốp len lỏi sâu vào lỗ chân lông cuốn trôi bụi mịn.'
        },
        {
          phrase: 'Gấp đôi Hyaluronic Acid khóa ẩm',
          exampleUsage: 'Rửa xong da sạch thoáng mà vẫn mướt mịn nhờ gấp đôi Hyaluronic Acid.'
        }
      ],
      visualDos: [
        'Quay cận cảnh chất bọt xốp dày đặc úp ngược không rơi',
        'Ánh sáng tự nhiên, nền phòng tắm tối giản chuẩn phong cách Nhật',
        'Logo Senka đặt ở góc phải trên hoặc chính diện sản phẩm'
      ],
      visualDonts: [
        'Không để chung khung hình với bất kỳ sản phẩm làm sạch nào khác',
        'Không dùng hiệu ứng phóng đại da mặt bị lột tẩy bong tróc'
      ],
      extractedAt: '2026-09-15 10:30'
    }
  },
  {
    id: 'doc-senka-02',
    brandId: 'kb-senka',
    brandName: 'Senka',
    fileName: 'Phieu_tiep_nhan_cong_bo_my_pham_Senka_Perfect_Whip.pdf',
    fileSizeFormatted: '1.2 MB',
    fileType: 'pdf',
    category: 'LEGAL_CERTIFICATE',
    uploadDate: '2026-09-18',
    uploadedBy: 'Phương Thảo (Legal Lead)',
    status: 'ĐÃ_TRÍCH_XUẤT',
    notes: 'Phiếu công bố mỹ phẩm nhập khẩu cấp bởi Cục Quản lý Dược - Bộ Y tế',
    extractedData: {
      documentType: 'LEGAL_CERTIFICATE',
      brandName: 'Senka',
      productName: 'Sữa Rửa Mặt Tạo Bọt Senka Perfect Whip 120g',
      skuCode: 'SNK-PW-120G',
      certNumber: '142856/21/CBMP-QLD',
      issuingAuthority: 'Cục Quản lý Dược — Bộ Y tế Việt Nam',
      mandatoryDisclaimer: 'Sản phẩm là mỹ phẩm làm sạch da, không có tác dụng thay thế thuốc chữa bệnh.',
      confidenceScore: 99,
      rawTextPreview: `BỘ Y TẾ — CỤC QUẢN LÝ DƯỢC
PHIẾU TIẾP NHẬN BẢN CÔNG BỐ SẢN PHẨM MỸ PHẨM
Số tiếp nhận: 142856/21/CBMP-QLD
Tên sản phẩm: Senka Perfect Whip Facial Foam (Sữa rửa mặt tạo bọt Senka Perfect Whip)
Quy cách: Tuýp 120g
Nhà sản xuất: Shiseido Co., Ltd. (Tokyo, Nhật Bản)
Đơn vị nhập khẩu & chịu trách nhiệm đưa sản phẩm ra thị trường: Công ty TNHH Mỹ phẩm Shiseido Việt Nam
Mục đích sử dụng: Làm sạch sâu bụi bẩn, dầu thừa, giữ ẩm dịu nhẹ cho da mặt.`,
      scientificMechanism: 'Hạt bọt micro bọt tơ tằm trắng kết hợp phức hợp dưỡng ẩm tơ tằm thiên nhiên và Sodium Hyaluronate.',
      extractedAt: '2026-09-18 14:15'
    }
  },
  {
    id: 'doc-senka-03',
    brandId: 'kb-senka',
    brandName: 'Senka',
    fileName: 'Bang_thong_tin_SKU_Perfect_Whip_Acne_Care.xlsx',
    fileSizeFormatted: '850 KB',
    fileType: 'xlsx',
    category: 'PRODUCT_CATALOG',
    uploadDate: '2026-09-22',
    uploadedBy: 'Quỳnh Như (Content Lead)',
    status: 'CHƯA_ĐỌC',
    notes: 'Bảng đặc tính kỹ thuật SKU Senka Perfect Whip Acne Care dành cho da mụn'
  },

  // 2. NHÃN HÀNG NATURE'S WAY (ÚC)
  {
    id: 'doc-nw-01',
    brandId: 'kb-naturesway',
    brandName: "Nature's Way",
    fileName: 'Giay_xac_nhan_quang_cao_Kids_Smart_Gummies.pdf',
    fileSizeFormatted: '2.4 MB',
    fileType: 'pdf',
    category: 'LEGAL_CERTIFICATE',
    uploadDate: '2026-08-20',
    uploadedBy: 'Phương Thảo (Legal Lead)',
    status: 'ĐÃ_TRÍCH_XUẤT',
    notes: 'Giấy xác nhận nội dung quảng cáo thực phẩm bảo vệ sức khỏe cấp bởi Cục An Toàn Thực Phẩm',
    extractedData: {
      documentType: 'LEGAL_CERTIFICATE',
      brandName: "Nature's Way",
      productName: 'Kids Smart Vita Gummies Cold & Flu, Immunity 60 viên',
      skuCode: 'NW-KIDS-IMMUN-60',
      certNumber: '3152/2023/XNQC-ATTP',
      issuingAuthority: 'Cục An Toàn Thực Phẩm — Bộ Y tế',
      mandatoryDisclaimer: 'Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.',
      confidenceScore: 100,
      rawTextPreview: `BỘ Y TẾ — CỤC AN TOÀN THỰC PHẨM
GIẤY XÁC NHẬN NỘI DUNG QUẢNG CÁO SỐ: 3152/2023/XNQC-ATTP
Tên sản phẩm: Thực phẩm bảo vệ sức khỏe Nature's Way Kids Smart Vita Gummies Cold & Flu, Immunity
Thương hiệu: Nature's Way (Úc)
Câu tuyên bố bắt buộc theo Nghị định 15/2018/NĐ-CP:
"Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh."
(Bắt buộc phải đọc rõ bằng lời thoại hoặc hiển thị tối thiểu 5 giây trên màn hình video).
Nghiêm cấm: Dùng từ "Thuốc bổ", "Trị dứt điểm biếng ăn", "Khỏi ốm vặt 100%".`,
      blacklistKeywords: [
        {
          keyword: 'Thuốc bổ tăng cân',
          rationale: 'Sản phẩm là TPCN, nghiêm cấm gọi là thuốc theo Luật Quảng Cáo và Nghị định 15.',
          alternativeSuggestion: 'Kẹo dẻo bổ sung vitamin và kẽm hỗ trợ tăng cường đề kháng'
        },
        {
          keyword: 'Khỏi ốm vặt 100%',
          rationale: 'Hành vi cam kết hiệu quả chữa bệnh không có căn cứ.',
          alternativeSuggestion: 'Giúp bé giảm nguy cơ mắc các bệnh đường hô hấp trên khi giao mùa'
        }
      ],
      extractedAt: '2026-08-20 09:20'
    }
  },
  {
    id: 'doc-nw-02',
    brandId: 'kb-naturesway',
    brandName: "Nature's Way",
    fileName: 'Bao_cao_kiem_nghiem_lam_sang_ViatGummies_Zinc.pdf',
    fileSizeFormatted: '3.6 MB',
    fileType: 'pdf',
    category: 'CLINICAL_TRIAL',
    uploadDate: '2026-09-02',
    uploadedBy: 'Hà My (Content Creator)',
    status: 'CHƯA_ĐỌC',
    notes: 'Báo cáo chỉ số hấp thu Kẽm và Vitamin C dạng kẹo dẻo cho trẻ 2-12 tuổi'
  },

  // 3. NHÃN HÀNG KUTIESKIN (VIỆT NAM / PHÁP)
  {
    id: 'doc-kuti-01',
    brandId: 'kb-kutieskin',
    brandName: 'Kutieskin',
    fileName: 'Chung_nhan_kiem_nghiem_da_lieu_vien_Pasteur_Kutieskin.pdf',
    fileSizeFormatted: '1.9 MB',
    fileType: 'pdf',
    category: 'CLINICAL_TRIAL',
    uploadDate: '2026-09-10',
    uploadedBy: 'Minh Hoàng (B2C Lead)',
    status: 'ĐÃ_TRÍCH_XUẤT',
    notes: 'Kết quả thử nghiệm kích ứng da liễu và chứng nhận an toàn cho trẻ từ 5 ngày tuổi',
    extractedData: {
      documentType: 'CLINICAL_TRIAL',
      brandName: 'Kutieskin',
      productName: 'Kem Bôi Dịu Da Trẻ Em Kutieskin 30g',
      skuCode: 'KUTI-DIUDA-30G',
      certNumber: 'KNG-2023-0889/PASTEUR',
      issuingAuthority: 'Viện Kiểm Nghiệm Da Liễu Trung Ương & Viện Pasteur',
      clinicalClaims: '100% không chứa Corticoid, Paraben. 96.8% làm dịu mẩn đỏ sau 24h ở trẻ sơ sinh.',
      scientificMechanism: 'Công nghệ Aminovector nhập khẩu từ Pháp kết hợp Nano Bạc và chiết xuất Yến mạch Pháp.',
      confidenceScore: 97,
      rawTextPreview: `KẾT QUẢ THỬ NGHIỆM ĐỘ AN TOÀN DA LIỄU
Mẫu thử: Kem bôi dịu da Kutieskin (Tuýp 30g)
Đơn vị sản xuất: Nhà máy Dược phẩm Công nghệ cao CVI Pharma
Kết quả phân tích:
- Hàm lượng Corticoid (Dexamethasone, Betamethasone...): ÂM TÍNH (Không phát hiện)
- Hàm lượng Paraben: ÂM TÍNH
- Đánh giá kích ứng trên da trẻ sơ sinh: Cấp độ 0 (Hoàn toàn dịu lành)
- Tỷ lệ giảm ngứa, dịu vết muỗi đốt sau 24 giờ: 96.8%`,
      ingredients: [
        { name: 'Aminovector nhập khẩu Pháp', percentage: 'Chuẩn lâm sàng', benefit: 'Kháng viêm dịu ngứa tức thì' },
        { name: 'Nano Bạc (Nano Silver)', percentage: 'Chuẩn y tế', benefit: 'Bảo vệ màng da, ngừa vi khuẩn' },
        { name: 'Bơ Shea & Yến mạch Pháp', percentage: 'Tự nhiên', benefit: 'Cấp ẩm và phục hồi tổn thương da' }
      ],
      extractedAt: '2026-09-10 16:45'
    }
  }
];

/**
 * Trích xuất tự động thông tin từ tệp tài liệu nhãn hàng
 * (Hỗ trợ phân tích văn bản từ nội dung file tải lên hoặc dùng dữ liệu có sẵn)
 */
export async function extractInformationFromBrandFile(params: {
  fileName: string;
  category: BrandFileCategory;
  brandName: string;
  fileTextContent?: string;
  fileBase64?: string;
  presetDocumentId?: string;
}): Promise<ExtractedBrandInfo> {
  const { fileName, category, brandName, fileTextContent, presetDocumentId } = params;

  // 1. Nếu có ID mẫu sẵn thì trả về dữ liệu mẫu chuẩn nghiệp vụ
  if (presetDocumentId) {
    const matched = SAMPLE_BRAND_DOCUMENTS.find(d => d.id === presetDocumentId);
    if (matched?.extractedData) {
      return {
        ...matched.extractedData,
        extractedAt: new Date().toLocaleString('vi-VN')
      };
    }
  }

  // 2. Kiểm tra nếu file tên quen thuộc trong kho mẫu
  const matchByName = SAMPLE_BRAND_DOCUMENTS.find(
    d => d.fileName.toLowerCase() === fileName.toLowerCase() || 
         (d.brandName.toLowerCase() === brandName.toLowerCase() && d.category === category)
  );
  if (matchByName?.extractedData) {
    return {
      ...matchByName.extractedData,
      extractedAt: new Date().toLocaleString('vi-VN')
    };
  }

  // 3. Phân tích nội dung văn bản (Heuristics & Rule-based Business Parser)
  const text = fileTextContent || `Tài liệu: ${fileName}\nNhãn hàng: ${brandName}\nLoại: ${category}`;

  const extracted: ExtractedBrandInfo = {
    documentType: category,
    brandName,
    rawTextPreview: text.slice(0, 500),
    confidenceScore: 90,
    extractedAt: new Date().toLocaleString('vi-VN')
  };

  // Quét số công bố / giấy tiếp nhận
  const certMatch = text.match(/(?:Số|Số tiếp nhận|XNQC|CBMP)[\s:]*([0-9A-Z\/\-_]+)/i);
  if (certMatch) {
    extracted.certNumber = certMatch[1].trim();
  }

  // Quét cơ quan cấp
  if (text.includes('Bộ Y tế') || text.includes('Cục Quản lý Dược')) {
    extracted.issuingAuthority = 'Cục Quản lý Dược — Bộ Y tế';
  } else if (text.includes('Cục An toàn thực phẩm') || text.includes('ATTP')) {
    extracted.issuingAuthority = 'Cục An Toàn Thực Phẩm — Bộ Y tế';
  } else if (text.includes('Pasteur') || text.includes('Da liễu')) {
    extracted.issuingAuthority = 'Viện Kiểm Nghiệm Da Liễu Trung Ương';
  }

  // Quét tuyên bố bắt buộc (Disclaimer)
  if (text.toLowerCase().includes('không phải là thuốc')) {
    extracted.mandatoryDisclaimer = 'Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.';
  } else if (text.toLowerCase().includes('mỹ phẩm')) {
    extracted.mandatoryDisclaimer = 'Sản phẩm là mỹ phẩm chăm sóc da, không có tác dụng thay thế thuốc chữa bệnh.';
  }

  // Quét thành phần hoạt chất
  const detectedIngredients: { name: string; percentage?: string; benefit?: string }[] = [];
  const commonIngredients = [
    { key: 'Hyaluronic Acid', benefit: 'Cấp ẩm và ngậm nước đa tầng' },
    { key: 'Bọt tơ tằm', benefit: 'Làm sạch sâu bụi bẩn và bã nhờn' },
    { key: 'Vitamin C', benefit: 'Chống oxy hóa và làm sáng đều màu da' },
    { key: 'Kẽm', benefit: 'Hỗ trợ tăng sức đề kháng và hạn chế vi khuẩn' },
    { key: 'Aminovector', benefit: 'Kháng viêm dịu ngứa da liễu' },
    { key: 'Nano Bạc', benefit: 'Bảo vệ màng tế bào da dịu nhẹ' },
    { key: 'Bơ Shea', benefit: 'Dưỡng ẩm mềm mịn' },
    { key: 'Niacinamide', benefit: 'Kiểm soát dầu thừa và củng cố hàng rào da' }
  ];

  for (const item of commonIngredients) {
    if (text.toLowerCase().includes(item.key.toLowerCase())) {
      detectedIngredients.push({
        name: item.key,
        percentage: 'Chuẩn nghiên cứu',
        benefit: item.benefit
      });
    }
  }
  if (detectedIngredients.length > 0) {
    extracted.ingredients = detectedIngredients;
  }

  // Quét từ cấm Blacklist
  const detectedBlacklist: { keyword: string; rationale: string; alternativeSuggestion?: string }[] = [];
  const bannedRules = [
    { word: 'trị dứt điểm', rationale: 'Vi phạm quy chế mỹ phẩm và thực phẩm chức năng.', alt: 'Hỗ trợ ngăn ngừa và cải thiện' },
    { word: '100%', rationale: 'Khẳng định tuyệt đối không có kiểm chứng lâm sàng.', alt: 'Được kiểm nghiệm da liễu phù hợp với đa số người dùng' },
    { word: 'thuốc bổ', rationale: 'Không được gọi TPCN là thuốc bổ theo luật quảng cáo.', alt: 'Sản phẩm bổ sung dưỡng chất' },
    { word: 'chữa khỏi', rationale: 'Quảng cáo sai công năng thực tế của sản phẩm.', alt: 'Hỗ trợ bảo vệ và phục hồi' }
  ];

  for (const b of bannedRules) {
    if (text.toLowerCase().includes(b.word)) {
      detectedBlacklist.push({
        keyword: b.word,
        rationale: b.rationale,
        alternativeSuggestion: b.alt
      });
    }
  }
  if (detectedBlacklist.length > 0) {
    extracted.blacklistKeywords = detectedBlacklist;
  }

  // Tùy theo loại tài liệu, đặt tên sản phẩm / Slogan mặc định
  if (category === 'BRAND_GUIDELINE') {
    extracted.slogan = `Tuyên ngôn chất lượng từ ${brandName}`;
    extracted.toneOfVoice = 'Chuyên gia, gần gũi, minh bạch thông tin thành phần.';
  } else if (category === 'LEGAL_CERTIFICATE') {
    extracted.productName = `Sản phẩm chủ lực ${brandName}`;
  }

  return extracted;
}

/**
 * Đồng bộ dữ liệu vừa trích xuất vào Hồ sơ Nhãn hàng (Brand Knowledge Base)
 */
export function applyExtractedDataToBrandKnowledgeBase(
  currentBrand: BrandKnowledgeBase,
  extracted: ExtractedBrandInfo
): { updatedBrand: BrandKnowledgeBase; summaryChanges: string[] } {
  const updated: BrandKnowledgeBase = { ...currentBrand };
  const summaryChanges: string[] = [];

  // 1. Cập nhật slogan & tone giọng nếu là Brand Guideline
  if (extracted.slogan && extracted.slogan !== updated.slogan) {
    updated.slogan = extracted.slogan;
    summaryChanges.push(`Cập nhật Slogan: "${extracted.slogan}"`);
  }
  if (extracted.toneOfVoice && extracted.toneOfVoice !== updated.toneOfVoice) {
    updated.toneOfVoice = extracted.toneOfVoice;
    summaryChanges.push(`Cập nhật Tone giọng: "${extracted.toneOfVoice}"`);
  }
  if (extracted.targetAudience && !updated.targetPersonaSummary) {
    updated.targetPersonaSummary = extracted.targetAudience;
    summaryChanges.push('Bổ sung Đối tượng mục tiêu');
  }

  // 2. Thêm giấy phép / chứng nhận pháp lý nếu có số công bố
  if (extracted.certNumber) {
    const existingCertIdx = updated.certifications.findIndex(c => c.docNumber === extracted.certNumber);
    const newCert: BrandLegalCertification = {
      id: `cert-${Date.now()}`,
      docTitle: extracted.productName ? `Phiếu tiếp nhận công bố: ${extracted.productName}` : 'Giấy phép quảng cáo & Công bố sản phẩm',
      docType: extracted.documentType === 'LEGAL_CERTIFICATE' ? 'XÁC_NHẬN_QUẢNG_CÁO' : 'KIỂM_NGHIỆM_LÂM_SÀNG',
      issuingAuthority: extracted.issuingAuthority || 'Cục Quản lý Dược — Bộ Y tế',
      docNumber: extracted.certNumber,
      issueDate: '2023-01-01',
      summaryKeyFindings: extracted.clinicalClaims || 'Đã kiểm nghiệm an toàn theo quy chuẩn BYT',
      mandatoryDisclaimerText: extracted.mandatoryDisclaimer
    };

    if (existingCertIdx >= 0) {
      updated.certifications[existingCertIdx] = { ...updated.certifications[existingCertIdx], ...newCert };
      summaryChanges.push(`Cập nhật giấy phép số ${extracted.certNumber}`);
    } else {
      updated.certifications = [newCert, ...updated.certifications];
      summaryChanges.push(`Bổ sung giấy phép mới: ${extracted.certNumber}`);
    }
  }

  // 3. Thêm từ khóa cấm Blacklist
  if (extracted.blacklistKeywords && extracted.blacklistKeywords.length > 0) {
    let addedCount = 0;
    extracted.blacklistKeywords.forEach(kw => {
      const exists = updated.blacklistKeywords.some(b => b.keyword.toLowerCase() === kw.keyword.toLowerCase());
      if (!exists) {
        const newKw: BlacklistKeyword = {
          id: `bl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          keyword: kw.keyword,
          category: 'LEGAL_MEDICAL',
          severity: 'CRITICAL_BANNED',
          rationale: kw.rationale,
          alternativeSuggestion: kw.alternativeSuggestion
        };
        updated.blacklistKeywords = [newKw, ...updated.blacklistKeywords];
        addedCount++;
      }
    });
    if (addedCount > 0) {
      summaryChanges.push(`Thêm ${addedCount} từ khóa cấm vào Từ điển Blacklist`);
    }
  }

  // 4. Thêm từ khóa khuyến khích Whitelist
  if (extracted.whitelistKeywords && extracted.whitelistKeywords.length > 0) {
    let addedCount = 0;
    extracted.whitelistKeywords.forEach(wkw => {
      const exists = updated.whitelistKeywords.some(w => w.phrase.toLowerCase() === wkw.phrase.toLowerCase());
      if (!exists) {
        const newWkw: WhitelistKeyword = {
          id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          phrase: wkw.phrase,
          category: 'USP_CLAIM',
          exampleUsage: wkw.exampleUsage || '',
          benefitNotes: 'Trích xuất từ quy chuẩn thương hiệu'
        };
        updated.whitelistKeywords = [newWkw, ...updated.whitelistKeywords];
        addedCount++;
      }
    });
    if (addedCount > 0) {
      summaryChanges.push(`Thêm ${addedCount} từ khóa khuyến khích vào Whitelist`);
    }
  }

  // 5. Thêm quy chuẩn hình ảnh
  if (extracted.visualDos && extracted.visualDos.length > 0) {
    const newDos = extracted.visualDos.filter(d => !updated.visualDoList.includes(d));
    if (newDos.length > 0) {
      updated.visualDoList = [...updated.visualDoList, ...newDos];
      summaryChanges.push(`Bổ sung ${newDos.length} quy chuẩn hình ảnh Do's`);
    }
  }
  if (extracted.visualDonts && extracted.visualDonts.length > 0) {
    const newDonts = extracted.visualDonts.filter(d => !updated.visualDontList.includes(d));
    if (newDonts.length > 0) {
      updated.visualDontList = [...updated.visualDontList, ...newDonts];
      summaryChanges.push(`Bổ sung ${newDonts.length} điều cấm kỵ Visual Don'ts`);
    }
  }

  updated.lastUpdated = new Date().toISOString().split('T')[0];
  updated.updatedBy = 'Hệ thống trích xuất tài liệu';

  return {
    updatedBrand: updated,
    summaryChanges
  };
}
