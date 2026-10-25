import {
  BrandKnowledgeBase,
  DetailedHeroSku,
  AiScriptAnalysisResult,
  AiAnalysisDimension,
  AiDetectedIssue,
} from './types';

export interface ScriptAnalyzeOptions {
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  pillar?: string;
}

export function analyzeScriptWithAi(
  scriptText: string,
  brand: BrandKnowledgeBase,
  targetSku?: DetailedHeroSku,
  options?: ScriptAnalyzeOptions
): AiScriptAnalysisResult {
  const cleanScript = (scriptText || '').trim();
  const lowerScript = cleanScript.toLowerCase();
  const lines = cleanScript.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = (lines[0] || cleanScript.slice(0, 120)).toLowerCase();
  const bodyLines = lines.slice(1, Math.max(2, lines.length - 1)).join(' ').toLowerCase() || lowerScript;
  const funnelStage = options?.funnelStage || 'CONSIDERATION';

  const issues: AiDetectedIssue[] = [];

  // 1. Kiểm tra từ ngữ bị cấm & nhạy cảm (Chặng 6)
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
        replacementSuggestion: bw.alternativeSuggestion,
      });
    }
  }

  // 2. Kiểm tra câu khuyến cáo pháp lý bắt buộc (Chặng 6)
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
        replacementSuggestion: cert.mandatoryDisclaimerText,
      });
    }
  }

  // 3. Kiểm tra thông tin sản phẩm & Chuyển hóa Tính năng -> Lợi ích (Chặng 3)
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
        replacementSuggestion: activeSku.uniqueSellingPoints.slice(0, 2).join('; '),
      });
    }
  }

  const uspScore = Math.min(25, Math.round((matchedUspsCount / (totalUspsCount || 1)) * 25));

  // Kiểm tra lỗi dùng từ khen chung chung mơ hồ ("xịn lắm", "đỉnh lắm") nhưng thiếu USP
  const vaguePhrases = ['xịn lắm', 'đỉnh lắm', 'siêu đỉnh', 'tốt cực kỳ', 'mua đi mọi người'];
  const detectedVague = vaguePhrases.find(p => lowerScript.includes(p));
  if (detectedVague && matchedUspsCount <= 1) {
    issues.push({
      id: 'iss-vague-claim',
      type: 'VAGUE_CLAIM',
      title: `Dùng từ khen chung chung ("${detectedVague}") thiếu dẫn chứng cụ thể`,
      detectedText: detectedVague,
      severity: 'SUGGESTION',
      rationale: 'Theo quy tắc duyệt Thân bài B2C: Không dùng tính từ khen mơ hồ nếu chưa chuyển hóa thành lợi ích và tình huống sử dụng thực tế.',
      replacementSuggestion: 'Mô tả cụ thể cảm nhận chất sản phẩm trên da/cơ thể và thời gian sử dụng thực tế.',
    });
  }

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
        replacementSuggestion: 'Bổ sung thông tin thành phần chính và hướng dẫn sử dụng cụ thể.',
      });
    }
  } else if (brand.toneTag === 'MẸ_BỈM_CHÂN_THỰC') {
    const momKeywords = ['bé', 'mẹ', 'con', 'dịu nhẹ', 'an toàn', 'lành tính', 'hữu cơ', 'tắm', 'ngứa'];
    const matchedCount = momKeywords.filter(k => lowerScript.includes(k)).length;
    if (matchedCount >= 2) toneAlignmentScore = 95;
  }

  // 5. Phân tích Hook 3-5 giây theo mô hình STAR-T & 7 Dạng Hook B2C (Chặng 2)
  const greetingPatterns = ['xin chào mọi người', 'hello mọi người', 'chào các bạn', 'hôm nay mình sẽ giới thiệu'];
  const hasLongGreetingIssue = greetingPatterns.some(p => firstLine.includes(p));
  const saleFirstPatterns = ['giảm giá', 'sale sập sàn', 'mua 1 tặng', 'voucher', 'chốt đơn ngay', 'deal hời'];
  const hasPrematureSaleIssue =
    (funnelStage === 'AWARENESS' || funnelStage === 'CONSIDERATION') &&
    saleFirstPatterns.some(p => firstLine.includes(p));

  if (hasLongGreetingIssue) {
    issues.push({
      id: 'iss-hook-greeting',
      type: 'WEAK_HOOK',
      title: 'Mở đầu 3 giây đầu chào hỏi dài dòng, chưa vào thẳng vấn đề',
      severity: 'WARNING',
      rationale: 'Theo cẩm nang Hook B2C: Loại bỏ phần chào hỏi/giới thiệu bản thân không giữ chân người xem; đưa nỗi đau, sự tò mò hoặc tình huống quen thuộc lên câu đầu tiên.',
      replacementSuggestion: `Mở trực tiếp bằng tình huống hoặc câu hỏi đánh trúng nhu cầu dùng ${activeSku?.name || 'sản phẩm'}.`,
    });
  }

  if (hasPrematureSaleIssue) {
    issues.push({
      id: 'iss-funnel-sale-first',
      type: 'FUNNEL_MISMATCH',
      title: `Lệch vai trò Funnel (${funnelStage}): Mở đầu bằng thông tin giảm giá/sale`,
      severity: 'WARNING',
      rationale: 'Ở giai đoạn Awareness/Consideration, người xem chưa có đủ lý do tin tưởng; mở đầu bằng bán hàng/deal ngay câu đầu làm giảm tỷ lệ giữ chân.',
      replacementSuggestion: 'Mở bằng vấn đề/nhận thức hoặc trải nghiệm kiểm chứng trước, chỉ đưa ưu đãi về cuối video.',
    });
  }

  const starTDrivers: NonNullable<AiScriptAnalysisResult['hookStarTAnalysis']>['starTDrivers'] = [
    {
      driver: 'S_DREAM',
      label: 'S — Ước mơ / Kết quả mong muốn',
      matched: /căng bóng|mềm mịn|trắng sáng|tự tin|dứt|khỏe|thon gọn|hết sạch|mịn màng/.test(firstLine),
      evidence: 'Nêu trạng thái kết quả người xem khao khát đạt được ngay ở câu mở đầu.',
    },
    {
      driver: 'T_CURIOSITY',
      label: 'T — Tò mò / Khoảng trống thông tin',
      matched: /\?|tại sao|vì sao|sự thật|sai lầm|đừng vội|bí quyết|ít ai biết|hóa ra/.test(firstLine),
      evidence: 'Đặt câu hỏi hoặc giữ lại một phần nguyên nhân để kéo người xem vào thân bài.',
    },
    {
      driver: 'A_FAMILIAR',
      label: 'A — Thân quen / Tình huống đời sống',
      matched: /thức khuya|deadline|sáng dậy|mùa đông|hanh khô|mẹ bỉm|sau sinh|đi làm|mỗi lần|ai đang/.test(firstLine),
      evidence: 'Gọi đúng bối cảnh sinh hoạt hoặc thói quen quen thuộc của tệp khách hàng.',
    },
    {
      driver: 'R_COMFORT',
      label: 'R — Thoải mái / Thị giác & Cảm giác',
      matched: /cận cảnh|texture|chất kem|thư giãn|dịu nhẹ|mát lạnh|thấm nhanh|routine/.test(lowerScript),
      evidence: 'Tạo cảm giác dễ chịu qua mô tả kết cấu sản phẩm và nhịp điệu trải nghiệm.',
    },
    {
      driver: 'T_CONTRAST',
      label: 'T — Trái ngang / Phản trực giác',
      matched: /từng nghĩ|cứ tưởng|nhưng sự thật|càng bôi càng|sai cách|đắt chưa chắc|tưởng tốt/.test(firstLine),
      evidence: 'Đưa nhận định ngược với suy nghĩ số đông để tạo xung đột nhận thức.',
    },
  ];

  let detectedHookType = 'Nỗi đau / Tình huống thực tế';
  if (/ai đang|bà nào|mẹ nào|dành cho những ai|da dầu|da nhạy cảm/.test(firstLine)) {
    detectedHookType = '1. Xác định tệp khách hàng ([Tệp] + [Vấn đề])';
  } else if (/\?|tại sao|vì sao|bạn có để ý/.test(firstLine)) {
    detectedHookType = '2. Câu hỏi thay đổi nhận thức';
  } else if (/từng nghĩ|cứ tưởng|trước đây mình/.test(firstLine)) {
    detectedHookType = '3. Phủ nhận bản thân (Niềm tin cũ → Phát hiện mới)';
  } else if (/thử qua|chi tiền|mất cả năm|hết bao nhiêu lọ|chai thứ/.test(firstLine)) {
    detectedHookType = '4. Giá trị lớn (Trải nghiệm tích lũy → Bài học)';
  } else if (/đừng mua|cảnh báo|sai lầm|dừng ngay/.test(firstLine)) {
    detectedHookType = '7. Cảnh báo / Phản trực giác';
  } else if (/viral|ai cũng dùng|hot rần rần|cháy hàng/.test(firstLine)) {
    detectedHookType = '6. FOMO kiểm chứng thực tế';
  } else if (/so với|khác gì|đặt lên bàn cân/.test(firstLine)) {
    detectedHookType = '5. Tương phản / So sánh tiêu chí';
  }

  // 6. Kiểm tra bố cục kịch bản 4 phần & Độ khớp Hook -> Body
  let structureScore = 0;
  const hasHook = cleanScript.length >= 25 && !hasLongGreetingIssue;
  if (hasHook) {
    structureScore += 8;
  } else if (cleanScript.length < 25) {
    issues.push({
      id: `iss-weak-hook`,
      type: 'WEAK_HOOK',
      title: 'Đoạn mở đầu quá ngắn',
      severity: 'WARNING',
      rationale: 'Đoạn mở đầu cần nêu rõ tình huống sử dụng hoặc vấn đề của người dùng trong 3–5 giây đầu.',
      replacementSuggestion: `Nêu trực tiếp vấn đề thường gặp khi dùng ${activeSku?.name || 'sản phẩm'} để dẫn vào nội dung.`,
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
    lowerScript.includes('rát') ||
    lowerScript.includes('xỉn') ||
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
    lowerScript.includes('bấm') ||
    lowerScript.includes('tham khảo');
  if (hasCta) structureScore += 7;

  // Kiểm tra công kích đối thủ (Chặng 4)
  const attackCompetitorPatterns = ['hãng khác toàn hàng dỏm', 'kem trộn', 'rẻ tiền hơn hẳn', 'đừng bao giờ mua hãng'];
  const detectedAttack = attackCompetitorPatterns.find(p => lowerScript.includes(p));
  if (detectedAttack) {
    issues.push({
      id: 'iss-comp-attack',
      type: 'COMPETITOR_ATTACK',
      title: 'Ngôn từ so sánh mang tính hạ thấp đối thủ',
      detectedText: detectedAttack,
      severity: 'WARNING',
      rationale: 'Theo quy tắc duyệt Concept So sánh: Chỉ so sánh trên tiêu chí khách quan (kết cấu, độ thấm, thành phần), tuyệt đối không công kích trực diện đối thủ.',
      replacementSuggestion: 'Đặt hai phương án trên tiêu chí trải nghiệm khách quan phù hợp với nhu cầu cá nhân.',
    });
  }

  // Xây dựng kết quả 7 Chặng Kiểm định Kịch bản B2C (110 Quy tắc)
  const matchedStarTCount = starTDrivers.filter(d => d.matched).length;
  const sevenStageAudit: NonNullable<AiScriptAnalysisResult['sevenStageAudit']> = [
    {
      stageNumber: 1,
      stageName: `1. Mục tiêu & Vai trò Funnel (${funnelStage})`,
      status: hasPrematureSaleIssue ? 'WARNING' : 'PASS',
      ruleApplied:
        funnelStage === 'AWARENESS'
          ? 'Awareness: Mở vấn đề/nhận thức, giảm tỷ trọng đọc deal trực diện'
          : funnelStage === 'CONSIDERATION'
            ? 'Consideration: Cung cấp bằng chứng kiểm chứng, giải quyết rào cản mua hàng'
            : funnelStage === 'CONVERSION'
              ? 'Conversion: Làm rõ lý do hành động ngay (Deal/Bằng chứng mua lại + CTA)'
              : 'Loyalty: Chia sẻ trải nghiệm thực tế sau một thời gian sử dụng',
      finding: hasPrematureSaleIssue
        ? 'Mở đầu đang tập trung vào giảm giá/sale quá sớm so với vai trò phễu.'
        : `Nội dung bám sát vai trò ${funnelStage} của chiến dịch.`,
      actionableFix: hasPrematureSaleIssue
        ? 'Đẩy thông tin deal xuống phần cuối video sau khi đã giải quyết nỗi đau/rào cản.'
        : undefined,
    },
    {
      stageNumber: 2,
      stageName: '2. Duyệt Hook 3–5 giây (Mô hình STAR-T)',
      status: !hasHook || hasLongGreetingIssue ? 'WARNING' : 'PASS',
      ruleApplied: `Dạng Hook: ${detectedHookType} · Khớp ${matchedStarTCount}/5 động lực STAR-T`,
      finding: hasLongGreetingIssue
        ? 'Câu mở đầu còn chào hỏi dài dòng, giảm tỷ lệ giữ chân 3 giây đầu.'
        : matchedStarTCount > 0
          ? `Đã kích hoạt ${matchedStarTCount} động lực giữ chân (${starTDrivers.filter(d => d.matched).map(d => d.label.split('—')[1]?.trim() || d.label).join(', ')}).`
          : 'Hook đã vào vấn đề nhưng có thể tăng thêm tính tò mò hoặc chi tiết thân quen của tệp khách.',
      actionableFix: hasLongGreetingIssue
        ? 'Cắt bỏ câu chào đầu video, vào thẳng tình huống hoặc câu hỏi gây tò mò.'
        : undefined,
    },
    {
      stageNumber: 3,
      stageName: '3. Duyệt Thân bài & Chuyển hóa Tính năng → Lợi ích',
      status: matchedUspsCount === 0 || Boolean(detectedVague) ? 'WARNING' : 'PASS',
      ruleApplied: 'Mạch chuẩn: Bối cảnh thật → Nỗi đau → Cơ chế sản phẩm → Lợi ích thực tế',
      finding:
        matchedUspsCount > 0
          ? `Đã lồng ghép ${matchedUspsCount}/${totalUspsCount} điểm nổi bật (USP) của ${activeSku?.name || 'sản phẩm'}.`
          : 'Chưa nêu rõ công dụng/USP cụ thể từ hồ sơ sản phẩm.',
      actionableFix:
        matchedUspsCount === 0
          ? `Bổ sung ít nhất 1–2 USP cốt lõi: ${activeSku?.uniqueSellingPoints.slice(0, 2).join('; ') || ''}`
          : undefined,
    },
    {
      stageNumber: 4,
      stageName: '4. Duyệt Concept & Tính khách quan',
      status: detectedAttack ? 'WARNING' : 'PASS',
      ruleApplied: 'Không công kích đối thủ; không tự bịa số liệu kiểm nghiệm ngoài hồ sơ',
      finding: detectedAttack
        ? 'Phát hiện cách diễn đạt so sánh tiêu cực với sản phẩm khác.'
        : 'Cách triển khai góc nội dung khách quan, phù hợp tiêu chuẩn cộng đồng.',
      actionableFix: detectedAttack ? 'Chuyển sang so sánh tiêu chí sử dụng thực tế.' : undefined,
    },
    {
      stageNumber: 5,
      stageName: '5. Duyệt Công thức Nội dung & Chuyển đoạn (Transition)',
      status: hasHook && hasPain && hasSolution ? 'PASS' : 'WARNING',
      ruleApplied: 'Cầu nối tự nhiên từ Vấn đề/Trải nghiệm sang Giải pháp sản phẩm',
      finding:
        hasHook && hasPain && hasSolution
          ? 'Mạch kịch bản đủ 4 phần: Mở vấn đề → Tình huống → Giải pháp → Điều hướng.'
          : 'Mạch chuyển từ tình huống sang giới thiệu sản phẩm còn ngắn, cần thêm trải nghiệm thực tế.',
    },
    {
      stageNumber: 6,
      stageName: '6. Duyệt Quy chuẩn Pháp lý & Từ khóa cấm',
      status: blacklistDeductions > 0 || !hasMandatoryDisclaimer ? 'FAIL' : 'PASS',
      ruleApplied: 'Barem kiểm duyệt từ khóa vi phạm chính sách sàn & Khuyến cáo công bố',
      finding:
        blacklistDeductions === 0 && hasMandatoryDisclaimer
          ? 'Không chứa từ khóa cấm; đầy đủ câu khuyến cáo pháp lý.'
          : `Phát hiện ${issues.filter(i => i.type === 'BLACKLIST_WORD' || i.type === 'MISSING_DISCLAIMER').length} lỗi từ cấm / thiếu khuyến cáo bắt buộc.`,
      actionableFix:
        blacklistDeductions > 0 || !hasMandatoryDisclaimer
          ? 'Thay thế ngay các từ khóa bị đánh dấu đỏ và chèn câu khuyến cáo bắt buộc.'
          : undefined,
    },
    {
      stageNumber: 7,
      stageName: '7. Duyệt Lời kêu gọi hành động (CTA)',
      status: hasCta ? 'PASS' : 'WARNING',
      ruleApplied: 'CTA gắn trực tiếp với lợi ích/ưu đãi vừa nêu ở thân bài',
      finding: hasCta
        ? 'Đã có câu điều hướng người xem kiểm tra giỏ hàng / nhận ưu đãi.'
        : 'Chưa có câu điều hướng hành động (CTA) rõ ràng ở cuối kịch bản.',
      actionableFix: !hasCta ? 'Bổ sung câu điều hướng bấm vào giỏ hàng góc trái màn hình.' : undefined,
    },
  ];

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
      ? `Đạt yêu cầu (${finalScore}/100). Vượt qua 7 chặng kiểm định kịch bản B2C của ${brand.brandName}.`
      : complianceStatus === 'WARNING'
        ? `Cần chỉnh sửa (${finalScore}/100): Có ${issues.length} mục cần rà soát lại theo chuẩn 7 chặng trước khi gửi nhãn hàng duyệt.`
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
          : `Có ${issues.filter(i => i.type === 'BLACKLIST_WORD').length} cụm từ vi phạm quy định nhãn hàng.`,
    },
    {
      name: 'Câu khuyến cáo pháp lý',
      score: disclaimerScore,
      maxScore: 20,
      status: hasMandatoryDisclaimer ? 'EXCELLENT' : 'CRITICAL',
      feedback: hasMandatoryDisclaimer
        ? 'Đầy đủ câu khuyến cáo theo hồ sơ công bố.'
        : 'Thiếu câu khuyến cáo pháp lý bắt buộc.',
    },
    {
      name: 'Thông tin & công dụng sản phẩm',
      score: uspScore,
      maxScore: 25,
      status: uspScore >= 20 ? 'EXCELLENT' : uspScore >= 12 ? 'GOOD' : 'WARNING',
      feedback: `Đã nêu ${matchedUspsCount}/${totalUspsCount} ý chính của ${activeSku ? activeSku.name : 'sản phẩm'}.`,
    },
    {
      name: 'Giọng văn & Vai trò Funnel',
      score: Math.round(toneAlignmentScore * 0.15),
      maxScore: 15,
      status: toneAlignmentScore >= 85 && !hasPrematureSaleIssue ? 'EXCELLENT' : 'GOOD',
      feedback:
        toneAlignmentScore >= 85
          ? `Phù hợp định hướng ${brand.brandName} (${funnelStage}).`
          : `Cần bổ sung thêm chi tiết thực tế theo yêu cầu của ${brand.brandName}.`,
    },
    {
      name: 'Hook STAR-T & Bố cục 4 phần',
      score: Math.min(10, Math.round(structureScore * 0.35)),
      maxScore: 10,
      status: structureScore >= 25 ? 'EXCELLENT' : structureScore >= 18 ? 'GOOD' : 'WARNING',
      feedback: `${hasHook ? `Hook: ${detectedHookType}` : 'Mở đầu ngắn'} • ${hasSolution ? 'Có tên sản phẩm' : 'Thiếu tên sản phẩm'} • ${hasCta ? 'Có CTA' : 'Thiếu CTA'}`,
    },
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

  const rewrittenLines = rewrittenText.split('\n').filter(Boolean);
  const hookText = rewrittenLines[0] || '';
  const painText = rewrittenLines[1] || '';
  const uspText = rewrittenLines[2] || '';
  const ctaText = rewrittenLines[3] || '';

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
    funnelStage,
    sevenStageAudit,
    hookStarTAnalysis: {
      detectedHookType,
      starTDrivers,
      hasLongGreetingIssue,
      hasPrematureSaleIssue,
    },
    rewrittenScript: {
      hook: hookText,
      painPoint: painText,
      solutionAndUsp: uspText,
      callToAction: ctaText,
      fullText: rewrittenText,
    },
  };
}
