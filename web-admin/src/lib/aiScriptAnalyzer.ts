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

  // ---------------------------------------------------------
  // 1. Quét Từ Cấm & Nhạy Cảm (Blacklist Keywords Scan)
  // ---------------------------------------------------------
  let blacklistDeductions = 0;
  for (const bw of brand.blacklistKeywords) {
    const kwLower = bw.keyword.toLowerCase();
    // Check if the script contains this exact phrase or keyword
    if (lowerScript.includes(kwLower) || 
       (kwLower.includes('/') && kwLower.split('/').some(part => lowerScript.includes(part.trim())))) {
      const isCritical = bw.severity === 'CRITICAL_BANNED';
      blacklistDeductions += isCritical ? 25 : 15;

      issues.push({
        id: `iss-bl-${bw.id}-${Date.now()}`,
        type: 'BLACKLIST_WORD',
        title: isCritical ? `Vi Phạm Từ Cấm Nghiêm Ngặt: "${bw.keyword}"` : `Cảnh Báo Đối Thủ / Nhạy Cảm: "${bw.keyword}"`,
        detectedText: bw.keyword,
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        rationale: bw.rationale,
        replacementSuggestion: bw.alternativeSuggestion
      });
    }
  }

  // ---------------------------------------------------------
  // 2. Kiểm Tra Tuyên Bố Bắt Buộc (Mandatory Disclaimers)
  // ---------------------------------------------------------
  let disclaimerScore = 20;
  let hasMandatoryDisclaimer = true;

  const mandatoryCerts = brand.certifications.filter(c => c.mandatoryDisclaimerText);
  for (const cert of mandatoryCerts) {
    const disc = cert.mandatoryDisclaimerText!.toLowerCase();
    const keyPhrases = ['không phải là thuốc', 'tùy cơ địa', 'hiệu quả tùy thuộc'];
    const matchedPhrase = keyPhrases.find(p => disc.includes(p));

    if (matchedPhrase && !lowerScript.includes(matchedPhrase)) {
      hasMandatoryDisclaimer = false;
      disclaimerScore = 0;
      issues.push({
        id: `iss-disc-${cert.id}`,
        type: 'MISSING_DISCLAIMER',
        title: 'Thiếu Tuyên Bố Pháp Lý Bắt Buộc (Cảnh Báo Bộ Y Tế)',
        severity: 'CRITICAL',
        rationale: `Quy định bắt buộc theo ${cert.docTitle}: Phải có câu cảnh báo trong phần mô tả hoặc chạy chữ video.`,
        replacementSuggestion: cert.mandatoryDisclaimerText
      });
    }
  }

  // ---------------------------------------------------------
  // 3. Mức Độ Khai Thác Sản Phẩm & USPs (Hero SKU Alignment)
  // ---------------------------------------------------------
  const activeSku = targetSku || brand.skus[0];
  let matchedUspsCount = 0;
  const totalUspsCount = activeSku ? activeSku.uniqueSellingPoints.length : 3;

  if (activeSku) {
    for (const usp of activeSku.uniqueSellingPoints) {
      // Check keywords of the USP
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
        title: `Chưa Làm Nổi Bật USPs Độc Quyền Của Sản Phẩm ${activeSku.name}`,
        severity: 'WARNING',
        rationale: 'Kịch bản chưa nhắc tới các công năng cốt lõi đã được kiểm chứng lâm sàng của sản phẩm.',
        replacementSuggestion: activeSku.uniqueSellingPoints.slice(0, 2).join('; ')
      });
    }
  }

  const uspScore = Math.min(25, Math.round((matchedUspsCount / (totalUspsCount || 1)) * 25));

  // ---------------------------------------------------------
  // 4. Đối Soát Giọng Điệu (Tone of Voice Alignment)
  // ---------------------------------------------------------
  let toneAlignmentScore = 80;
  if (brand.toneTag === 'BÁC_SĨ_CHUYÊN_GIA') {
    const medicalKeywords = ['khoa học', 'kiểm nghiệm', 'da liễu', 'bác sĩ', 'thành phần', 'ph', 'cơ chế', 'lâm sàng', 'phức hợp', 'axit'];
    const matchedCount = medicalKeywords.filter(k => lowerScript.includes(k)).length;
    if (matchedCount >= 2) {
      toneAlignmentScore = 95;
    } else if (matchedCount === 0) {
      toneAlignmentScore = 60;
      issues.push({
        id: `iss-tone-weak`,
        type: 'TONE_MISMATCH',
        title: 'Giọng Điệu Chưa Đủ Chiều Sâu Khoa Học / Chuyên Gia',
        severity: 'SUGGESTION',
        rationale: `${brand.brandName} định vị là thương hiệu chuẩn y khoa da liễu. Kịch bản cần phân tích thành phần hoặc cơ chế khoa học thay vì chỉ nói cảm tính.`,
        replacementSuggestion: 'Bổ sung giải thích về độ pH 5.0 hoặc phức hợp hoạt chất chứng minh lâm sàng.'
      });
    }
  } else if (brand.toneTag === 'MẸ_BỈM_CHÂN_THỰC') {
    const momKeywords = ['bé', 'mẹ', 'con', 'dịu nhẹ', 'an toàn', 'lành tính', 'hữu cơ', 'tắm', 'ngứa'];
    const matchedCount = momKeywords.filter(k => lowerScript.includes(k)).length;
    if (matchedCount >= 2) toneAlignmentScore = 95;
  }

  // ---------------------------------------------------------
  // 5. Cấu Trúc Kịch Bản 4 Phần (Hook, Pain, Solution, CTA)
  // ---------------------------------------------------------
  let structureScore = 0;
  const hasHook = cleanScript.length > 0 && (
    lowerScript.includes('?') ||
    lowerScript.includes('đừng') ||
    lowerScript.includes('sự thật') ||
    lowerScript.includes('test') ||
    lowerScript.includes('nghe nói') ||
    cleanScript.length >= 30
  );
  if (hasHook) structureScore += 8;
  else {
    issues.push({
      id: `iss-weak-hook`,
      type: 'WEAK_HOOK',
      title: 'Hook 3 Giây Đầu Chưa Đủ Mạnh Hoặc Thiếu Câu Khơi Gợi Tò Mò',
      severity: 'WARNING',
      rationale: 'Trong 3 giây đầu trên TikTok, nếu không có câu hỏi kích thích hoặc phủ định giật gân, tỷ lệ giữ chân người xem (Watch Time) sẽ giảm hơn 65%.',
      replacementSuggestion: `Thử bắt đầu bằng: "Đừng vội mua ${activeSku?.name || 'sản phẩm'} này nếu bạn chưa biết sự thật sau..."`
    });
  }

  const hasPain = lowerScript.includes('mụn') || lowerScript.includes('dầu') || lowerScript.includes('khô') || lowerScript.includes('ngứa') || lowerScript.includes('đau') || lowerScript.includes('lo') || lowerScript.includes('bết');
  if (hasPain) structureScore += 7;

  const hasSolution = lowerScript.includes(brand.brandName.toLowerCase()) || (activeSku && lowerScript.includes(activeSku.name.toLowerCase().split(' ')[0]));
  if (hasSolution) structureScore += 8;

  const hasCta = lowerScript.includes('giỏ hàng') || lowerScript.includes('link') || lowerScript.includes('voucher') || lowerScript.includes('mua') || lowerScript.includes('săn') || lowerScript.includes('bấm');
  if (hasCta) structureScore += 7;

  // ---------------------------------------------------------
  // Tính Điểm Tổng Thể (Overall Score)
  // ---------------------------------------------------------
  let baseScore = 30 + uspScore + (toneAlignmentScore * 0.2) + structureScore + disclaimerScore;
  let finalScore = Math.max(0, Math.min(100, Math.round(baseScore - blacklistDeductions)));

  // If there is any CRITICAL issue, max score cannot exceed 65
  const hasCritical = issues.some(i => i.severity === 'CRITICAL');
  if (hasCritical && finalScore > 65) {
    finalScore = 64;
  }

  const complianceStatus: 'PASS' | 'WARNING' | 'FAIL' =
    finalScore >= 85 ? 'PASS' : finalScore >= 65 ? 'WARNING' : 'FAIL';

  const summaryVerdict =
    complianceStatus === 'PASS'
      ? `Kịch bản đạt chuẩn xuất sắc (${finalScore}/100). Đã kiểm tra không vi phạm từ cấm, tôn trọng định vị ${brand.brandName} và sẵn sàng bấm máy quay demo.`
      : complianceStatus === 'WARNING'
      ? `Kịch bản đạt mức khá (${finalScore}/100) nhưng có ${issues.length} cảnh báo cần chỉnh sửa trước khi gửi duyệt Brand.`
      : `Kịch bản KHÔNG ĐẠT (${finalScore}/100) do vi phạm quy chuẩn nghiêm ngặt hoặc thiếu tuyên bố pháp lý bắt buộc. Yêu cầu sửa đổi tức thì.`;

  // Dimensions
  const dimensions: AiAnalysisDimension[] = [
    {
      name: 'Rủi Ro Pháp Lý & Từ Cấm Blacklist',
      score: Math.max(0, 30 - blacklistDeductions),
      maxScore: 30,
      status: blacklistDeductions === 0 ? 'EXCELLENT' : blacklistDeductions <= 15 ? 'WARNING' : 'CRITICAL',
      feedback: blacklistDeductions === 0 ? 'Không phát hiện từ cấm nào thuộc danh mục Blacklist nhãn hàng.' : `Phát hiện ${issues.filter(i => i.type === 'BLACKLIST_WORD').length} từ cấm hoặc dìm hàng đối thủ.`
    },
    {
      name: 'Tuyên Bố Pháp Lý Bắt Buộc (Disclaimers)',
      score: disclaimerScore,
      maxScore: 20,
      status: hasMandatoryDisclaimer ? 'EXCELLENT' : 'CRITICAL',
      feedback: hasMandatoryDisclaimer ? 'Đã có hoặc nhãn hàng không yêu cầu câu cảnh báo đặc thù.' : 'Thiếu câu cảnh báo bắt buộc theo quy định Bộ Y Tế.'
    },
    {
      name: 'Độ Chuẩn Xác Hero SKU & USPs',
      score: uspScore,
      maxScore: 25,
      status: uspScore >= 20 ? 'EXCELLENT' : uspScore >= 12 ? 'GOOD' : 'WARNING',
      feedback: `Đã làm nổi bật ${matchedUspsCount}/${totalUspsCount} đặc tính độc quyền của ${activeSku ? activeSku.name : 'sản phẩm'}.`
    },
    {
      name: 'Phù Hợp Giọng Điệu (Tone of Voice)',
      score: Math.round(toneAlignmentScore * 0.15),
      maxScore: 15,
      status: toneAlignmentScore >= 85 ? 'EXCELLENT' : 'GOOD',
      feedback: `Khớp ${toneAlignmentScore}% với phong cách "${brand.toneTag.replace(/_/g, ' ')}" của ${brand.brandName}.`
    },
    {
      name: 'Cấu Trúc 4 Phần & Chuyển Đổi TikTok',
      score: Math.min(10, Math.round(structureScore * 0.35)),
      maxScore: 10,
      status: structureScore >= 25 ? 'EXCELLENT' : structureScore >= 18 ? 'GOOD' : 'WARNING',
      feedback: `${hasHook ? 'Hook tốt' : 'Hook yếu'} • ${hasPain ? 'Có nỗi đau' : 'Thiếu nỗi đau'} • ${hasCta ? 'CTA giỏ hàng rõ ràng' : 'Thiếu CTA'}`
    }
  ];

  // ---------------------------------------------------------
  // AI Script Rewriter (Tự Động Sửa Lại Kịch Bản Chuẩn 100%)
  // ---------------------------------------------------------
  let rewrittenText = cleanScript;

  // Auto-replace blacklisted words
  for (const bw of brand.blacklistKeywords) {
    if (bw.alternativeSuggestion) {
      const reg = new RegExp(bw.keyword, 'gi');
      rewrittenText = rewrittenText.replace(reg, bw.alternativeSuggestion);
    }
  }

  // Append disclaimer if missing
  if (!hasMandatoryDisclaimer && mandatoryCerts[0]?.mandatoryDisclaimerText) {
    rewrittenText += `\n\n*(Lưu ý: ${mandatoryCerts[0].mandatoryDisclaimerText})*`;
  }

  // Synthesize structured parts
  const hookText = hasHook
    ? cleanScript.split('\n')[0] || `Sự thật bất ngờ về ${activeSku?.name || brand.brandName} mà KOC chưa dám kể...`
    : `Test camera UV 8 tiếng kiểm tra xem ${activeSku?.name || brand.brandName} có làm sạch sâu như lời đồn không?`;

  const painText = hasPain
    ? 'Mùa này ngồi điều hòa cả ngày da vừa đổ dầu loang lổ vừa khô căng khó chịu.'
    : 'Nhiều bạn cứ nghĩ rửa mặt qua loa là sạch, nhưng bụi mịn PM2.5 tích tụ lâu ngày làm bít tắc sinh mụn ẩn li ti.';

  const uspText = activeSku
    ? `${activeSku.name} ứng dụng ${activeSku.scientificMechanism.slice(0, 100)}... Giúp ${activeSku.uniqueSellingPoints[0] || 'làm sạch sâu dịu nhẹ'}.`
    : `${brand.brandName} với công nghệ chuẩn kiểm nghiệm quốc tế giúp bảo vệ làn da tối ưu.`;

  const ctaText = 'Bấm ngay vào link giỏ hàng góc trái video để săn voucher trợ giá độc quyền phiên Mega Sale này nhé!';

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
