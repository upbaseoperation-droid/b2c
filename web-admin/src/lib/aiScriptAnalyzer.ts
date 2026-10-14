import {
  BrandKnowledgeBase,
  DetailedHeroSku,
  AiScriptAnalysisResult,
  AiAnalysisDimension,
  AiDetectedIssue
} from './types';

export function analyzeScriptWithAi(
  scriptText: string,
  brand: BrandKnowledgeBase,
  targetSku?: DetailedHeroSku
): AiScriptAnalysisResult {
  const cleanScript = (scriptText || '').trim();
  const lowerScript = cleanScript.toLowerCase();

  const issues: AiDetectedIssue[] = [];

  // 1. Kiểm tra từ ngữ bị cấm & nhạy cảm
  let blacklistDeductions = 0;
  for (const bw of brand.blacklistKeywords) {
    const kwLower = bw.keyword.toLowerCase();
    if (
      lowerScript.includes(kwLower) ||
      (kwLower.includes('/') && kwLower.split('/').some(part => lowerScript.includes(part.trim())))
    ) {
      const isCritical = bw.severity === 'CRITICAL_BANNED';
      blacklistDeductions += isCritical ? 25 : 15;

      issues.push({
        id: `iss-bl-${bw.id}-${Date.now()}`,
        type: 'BLACKLIST_WORD',
        title: isCritical
          ? `Có từ cấm: "${bw.keyword}"`
          : `Từ ngữ nhạy cảm / nhắc đối thủ: "${bw.keyword}"`,
        detectedText: bw.keyword,
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        rationale: bw.rationale,
        replacementSuggestion: bw.alternativeSuggestion
      });
    }
  }

  // 2. Kiểm tra câu khuyến cáo pháp lý bắt buộc
  let disclaimerScore = 20;
  let hasMandatoryDisclaimer = true;

  const mandatoryCerts = brand.certifications.filter(c => c.mandatoryDisclaimerText);
  for (const cert of mandatoryCerts) {
    const disc = cert.mandatoryDisclaimerText!.toLowerCase();
    const keyPhrases = ['không phải là thuốc', 'tùy cơ địa', 'hiệu quả tùy thuộc', 'đọc kỹ hướng dẫn'];
    const matchedPhrase = keyPhrases.find(p => disc.includes(p));

    if (matchedPhrase && !lowerScript.includes(matchedPhrase)) {
      hasMandatoryDisclaimer = false;
      disclaimerScore = 0;
      issues.push({
        id: `iss-disc-${cert.id}`,
        type: 'MISSING_DISCLAIMER',
        title: 'Thiếu câu khuyến cáo pháp lý bắt buộc',
        severity: 'CRITICAL',
        rationale: `Theo ${cert.docTitle}: Cần bổ sung câu khuyến cáo trong lời thoại hoặc chữ chạy trên màn hình.`,
        replacementSuggestion: cert.mandatoryDisclaimerText
      });
    }
  }

  // 3. Kiểm tra thông tin sản phẩm
  const activeSku = targetSku || brand.skus[0];
  let matchedUspsCount = 0;
  const totalUspsCount = activeSku ? activeSku.uniqueSellingPoints.length : 3;

  if (activeSku) {
    for (const usp of activeSku.uniqueSellingPoints) {
      const uspWords = usp.toLowerCase().split(' ').filter(w => w.length > 3);
      const isMatched = uspWords.some(w => lowerScript.includes(w));
      if (isMatched) {
        matchedUspsCount++;
      }
    }

    if (matchedUspsCount === 0) {
      issues.push({
        id: `iss-usp-missing`,
        type: 'MISSING_USP',
        title: `Chưa nêu rõ công dụng chính của ${activeSku.name}`,
        severity: 'WARNING',
        rationale: 'Kịch bản chưa nhắc đến các điểm chính của sản phẩm theo hồ sơ nhãn hàng.',
        replacementSuggestion: activeSku.uniqueSellingPoints.slice(0, 2).join('; ')
      });
    }
  }

  const uspScore = Math.min(25, Math.round((matchedUspsCount / (totalUspsCount || 1)) * 25));

  // 4. Kiểm tra cách diễn đạt theo định vị nhãn hàng
  let toneAlignmentScore = 80;
  if (brand.toneTag === 'BÁC_SĨ_CHUYÊN_GIA') {
    const medicalKeywords = ['kiểm nghiệm', 'da liễu', 'bác sĩ', 'thành phần', 'ph', 'cơ chế', 'lâm sàng', 'hoạt chất', 'axit'];
    const matchedCount = medicalKeywords.filter(k => lowerScript.includes(k)).length;
    if (matchedCount >= 2) {
      toneAlignmentScore = 95;
    } else if (matchedCount === 0) {
      toneAlignmentScore = 60;
      issues.push({
        id: `iss-tone-weak`,
        type: 'TONE_MISMATCH',
        title: 'Chưa nêu rõ thành phần hoặc cơ chế sản phẩm',
        severity: 'SUGGESTION',
        rationale: `Nhãn hàng ${brand.brandName} yêu cầu giải thích rõ thành phần và công dụng thực tế thay vì chỉ nhận xét chung chung.`,
        replacementSuggestion: 'Bổ sung thông tin thành phần chính và hướng dẫn sử dụng cụ thể.'
      });
    }
  } else if (brand.toneTag === 'MẸ_BỈM_CHÂN_THỰC') {
    const momKeywords = ['bé', 'mẹ', 'con', 'dịu nhẹ', 'an toàn', 'lành tính', 'hữu cơ', 'tắm', 'ngứa'];
    const matchedCount = momKeywords.filter(k => lowerScript.includes(k)).length;
    if (matchedCount >= 2) toneAlignmentScore = 95;
  }

  // 5. Kiểm tra bố cục kịch bản 4 phần
  let structureScore = 0;
  const hasHook = cleanScript.length >= 25;
  if (hasHook) {
    structureScore += 8;
  } else {
    issues.push({
      id: `iss-weak-hook`,
      type: 'WEAK_HOOK',
      title: 'Đoạn mở đầu quá ngắn',
      severity: 'WARNING',
      rationale: 'Đoạn mở đầu cần nêu rõ tình huống sử dụng hoặc vấn đề của người dùng trong 3 giây đầu.',
      replacementSuggestion: `Nêu trực tiếp vấn đề thường gặp khi dùng ${activeSku?.name || 'sản phẩm'} để dẫn vào nội dung.`
    });
  }

  const hasPain =
    lowerScript.includes('mụn') ||
    lowerScript.includes('dầu') ||
    lowerScript.includes('khô') ||
    lowerScript.includes('ngứa') ||
    lowerScript.includes('đau') ||
    lowerScript.includes('lo') ||
    lowerScript.includes('bết') ||
    cleanScript.length >= 60;
  if (hasPain) structureScore += 7;

  const hasSolution =
    lowerScript.includes(brand.brandName.toLowerCase()) ||
    Boolean(activeSku && lowerScript.includes(activeSku.name.toLowerCase().split(' ')[0]));
  if (hasSolution) structureScore += 8;

  const hasCta =
    lowerScript.includes('giỏ hàng') ||
    lowerScript.includes('link') ||
    lowerScript.includes('voucher') ||
    lowerScript.includes('mua') ||
    lowerScript.includes('ưu đãi') ||
    lowerScript.includes('bấm');
  if (hasCta) structureScore += 7;

  // Tính điểm tổng hợp
  const baseScore = 30 + uspScore + toneAlignmentScore * 0.2 + structureScore + disclaimerScore;
  let finalScore = Math.max(0, Math.min(100, Math.round(baseScore - blacklistDeductions)));

  const hasCritical = issues.some(i => i.severity === 'CRITICAL');
  if (hasCritical && finalScore > 65) {
    finalScore = 64;
  }

  const complianceStatus: 'PASS' | 'WARNING' | 'FAIL' =
    finalScore >= 85 ? 'PASS' : finalScore >= 65 ? 'WARNING' : 'FAIL';

  const summaryVerdict =
    complianceStatus === 'PASS'
      ? `Đạt yêu cầu (${finalScore}/100). Không có từ cấm, đủ nội dung chính theo quy định của ${brand.brandName}.`
      : complianceStatus === 'WARNING'
        ? `Cần chỉnh sửa (${finalScore}/100): Có ${issues.length} mục cần rà soát lại trước khi gửi nhãn hàng duyệt.`
        : `Chưa đạt (${finalScore}/100): Có từ ngữ bị cấm hoặc thiếu câu khuyến cáo pháp lý bắt buộc. Cần sửa lại kịch bản.`;

  const dimensions: AiAnalysisDimension[] = [
    {
      name: 'Từ ngữ bị cấm & nhạy cảm',
      score: Math.max(0, 30 - blacklistDeductions),
      maxScore: 30,
      status: blacklistDeductions === 0 ? 'EXCELLENT' : blacklistDeductions <= 15 ? 'WARNING' : 'CRITICAL',
      feedback:
        blacklistDeductions === 0
          ? 'Không phát hiện từ cấm trong hồ sơ nhãn hàng.'
          : `Có ${issues.filter(i => i.type === 'BLACKLIST_WORD').length} cụm từ vi phạm quy định nhãn hàng.`
    },
    {
      name: 'Câu khuyến cáo pháp lý',
      score: disclaimerScore,
      maxScore: 20,
      status: hasMandatoryDisclaimer ? 'EXCELLENT' : 'CRITICAL',
      feedback: hasMandatoryDisclaimer
        ? 'Đầy đủ câu khuyến cáo theo hồ sơ công bố.'
        : 'Thiếu câu khuyến cáo pháp lý bắt buộc.'
    },
    {
      name: 'Thông tin & công dụng sản phẩm',
      score: uspScore,
      maxScore: 25,
      status: uspScore >= 20 ? 'EXCELLENT' : uspScore >= 12 ? 'GOOD' : 'WARNING',
      feedback: `Đã nêu ${matchedUspsCount}/${totalUspsCount} ý chính của ${activeSku ? activeSku.name : 'sản phẩm'}.`
    },
    {
      name: 'Giọng văn theo nhãn hàng',
      score: Math.round(toneAlignmentScore * 0.15),
      maxScore: 15,
      status: toneAlignmentScore >= 85 ? 'EXCELLENT' : 'GOOD',
      feedback:
        toneAlignmentScore >= 85
          ? `Phù hợp với định hướng nội dung của ${brand.brandName}.`
          : `Cần bổ sung thêm chi tiết thực tế theo yêu cầu của ${brand.brandName}.`
    },
    {
      name: 'Bố cục kịch bản 4 phần',
      score: Math.min(10, Math.round(structureScore * 0.35)),
      maxScore: 10,
      status: structureScore >= 25 ? 'EXCELLENT' : structureScore >= 18 ? 'GOOD' : 'WARNING',
      feedback: `${hasHook ? 'Đủ mở đầu' : 'Mở đầu ngắn'} • ${hasSolution ? 'Có tên sản phẩm' : 'Thiếu tên sản phẩm'} • ${hasCta ? 'Có hướng dẫn mua hàng' : 'Thiếu hướng dẫn giỏ hàng'}`
    }
  ];

  // Gợi ý bản sửa trực tiếp trên văn bản gốc của KOC (thay từ cấm + thêm khuyến cáo pháp lý)
  let rewrittenText = cleanScript;

  for (const bw of brand.blacklistKeywords) {
    if (bw.alternativeSuggestion) {
      const reg = new RegExp(bw.keyword, 'gi');
      rewrittenText = rewrittenText.replace(reg, bw.alternativeSuggestion);
    }
  }

  if (!hasMandatoryDisclaimer && mandatoryCerts[0]?.mandatoryDisclaimerText) {
    rewrittenText += `\n\n(Khuyến cáo: ${mandatoryCerts[0].mandatoryDisclaimerText})`;
  }

  const lines = rewrittenText.split('\n').filter(Boolean);
  const hookText = lines[0] || '';
  const painText = lines[1] || '';
  const uspText = lines[2] || '';
  const ctaText = lines[3] || '';

  return {
    overallScore: finalScore,
    complianceStatus,
    summaryVerdict,
    dimensions,
    issues,
    matchedUspsCount,
    totalUspsCount,
    toneAlignmentScore,
    hasMandatoryDisclaimer,
    rewrittenScript: {
      hook: hookText,
      painPoint: painText,
      solutionAndUsp: uspText,
      callToAction: ctaText,
      fullText: rewrittenText
    }
  };
}
