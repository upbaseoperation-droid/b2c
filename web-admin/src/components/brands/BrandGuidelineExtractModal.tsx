'use client';

import React, { useState, useMemo } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { Check, Plus, Trash2 } from 'lucide-react';
import type {
  BrandProfile,
  BrandPositioning,
  BrandContentRules,
  BannedPhrase,
} from '../../lib/brands/types';
import { executeOperationalReport } from '../../lib/operationalReportService';

export interface BrandGuidelineExtractModalProps {
  open: boolean;
  onClose: () => void;
  brandProfile: BrandProfile;
  canEditPositioning?: boolean;
  canEditContentRules?: boolean;
  canEditLegal?: boolean;
  onApplyToProfile: (patch: {
    positioning?: BrandPositioning;
    contentRules?: BrandContentRules;
    legalDisclaimer?: string;
  }) => Promise<void>;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface ExtractedGuidelineData {
  slogan: string;
  toneOfVoice: string;
  targetAudience: string;
  bigIdea: string;
  keyMessage: string;
  painPoints: string[];
  rtbs: string[];
  banned: Array<{ phrase: string; reason: string; replacement: string }>;
  visualDo: string[];
  visualDont: string[];
  mandatoryHashtags: string[];
  defaultCta: string;
  legalDisclaimer: string;
}

function parseExtractResult(
  llmOutput: string,
  rawInput: string,
  profile: BrandProfile
): ExtractedGuidelineData {
  const result: ExtractedGuidelineData = {
    slogan: '',
    toneOfVoice: '',
    targetAudience: '',
    bigIdea: '',
    keyMessage: '',
    painPoints: [],
    rtbs: [],
    banned: [],
    visualDo: [],
    visualDont: [],
    mandatoryHashtags: [],
    defaultCta: '',
    legalDisclaimer: '',
  };

  // 1. Thử giải mã khối mã JSON từ kết quả trả về
  let parsedJson: Record<string, unknown> | null = null;
  const jsonBlockMatch =
    llmOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || llmOutput.match(/(\{[\s\S]*\})/);

  if (jsonBlockMatch) {
    try {
      parsedJson = JSON.parse(jsonBlockMatch[1]);
    } catch {
      parsedJson = null;
    }
  }

  if (parsedJson && typeof parsedJson === 'object') {
    if (typeof parsedJson.slogan === 'string') result.slogan = parsedJson.slogan.trim();
    if (typeof parsedJson.toneOfVoice === 'string')
      result.toneOfVoice = parsedJson.toneOfVoice.trim();
    if (typeof parsedJson.targetAudience === 'string')
      result.targetAudience = parsedJson.targetAudience.trim();
    if (typeof parsedJson.bigIdea === 'string') result.bigIdea = parsedJson.bigIdea.trim();
    if (typeof parsedJson.keyMessage === 'string') result.keyMessage = parsedJson.keyMessage.trim();

    if (Array.isArray(parsedJson.painPoints)) {
      result.painPoints = parsedJson.painPoints
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(parsedJson.rtbs)) {
      result.rtbs = parsedJson.rtbs
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(parsedJson.banned)) {
      result.banned = parsedJson.banned
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
          phrase: String(item.phrase || '').trim(),
          reason: String(item.reason || 'Quy định nhãn hàng').trim(),
          replacement: String(item.replacement || '').trim(),
        }))
        .filter((item) => Boolean(item.phrase));
    }
    if (Array.isArray(parsedJson.visualDo)) {
      result.visualDo = parsedJson.visualDo
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(parsedJson.visualDont)) {
      result.visualDont = parsedJson.visualDont
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(parsedJson.mandatoryHashtags)) {
      result.mandatoryHashtags = parsedJson.mandatoryHashtags
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof parsedJson.defaultCta === 'string') result.defaultCta = parsedJson.defaultCta.trim();
    if (typeof parsedJson.legalDisclaimer === 'string')
      result.legalDisclaimer = parsedJson.legalDisclaimer.trim();
  }

  // 2. Bộ tách dự phòng theo từ khóa nếu chưa bóc tách đủ
  const combinedText = `${llmOutput}\n${rawInput}`;

  if (!result.slogan) {
    const m = combinedText.match(/(?:slogan|khẩu hiệu)[:\s*-]+([^\n]+)/i);
    if (m) result.slogan = m[1].replace(/["'*]/g, '').trim();
  }
  if (!result.toneOfVoice) {
    const m = combinedText.match(/(?:giọng điệu|tone|tone of voice)[:\s*-]+([^\n]+)/i);
    if (m) result.toneOfVoice = m[1].replace(/["'*]/g, '').trim();
  }
  if (!result.targetAudience) {
    const m = combinedText.match(/(?:khách hàng mục tiêu|đối tượng)[:\s*-]+([^\n]+)/i);
    if (m) result.targetAudience = m[1].replace(/["'*]/g, '').trim();
  }
  if (!result.bigIdea) {
    const m = combinedText.match(/(?:ý tưởng lớn|big idea)[:\s*-]+([^\n]+)/i);
    if (m) result.bigIdea = m[1].replace(/["'*]/g, '').trim();
  }
  if (!result.keyMessage) {
    const m = combinedText.match(/(?:thông điệp chính|key message)[:\s*-]+([^\n]+)/i);
    if (m) result.keyMessage = m[1].replace(/["'*]/g, '').trim();
  }
  if (result.painPoints.length === 0) {
    const lines = combinedText
      .split('\n')
      .filter((l) => /(?:nỗi đau|pain point|vấn đề da|lo lắng)/i.test(l));
    result.painPoints = lines
      .slice(0, 3)
      .map((l) => l.replace(/^[-•*0-9.]+\s*/, '').trim())
      .filter(Boolean);
  }
  if (result.rtbs.length === 0) {
    const lines = combinedText
      .split('\n')
      .filter((l) => /(?:chứng minh|kiểm nghiệm|nguyên liệu|lý do tin|rtb)/i.test(l));
    result.rtbs = lines
      .slice(0, 3)
      .map((l) => l.replace(/^[-•*0-9.]+\s*/, '').trim())
      .filter(Boolean);
  }
  if (result.banned.length === 0) {
    const bannedMatches = combinedText.match(/(?:cấm dùng|từ cấm|không được nói)[:\s*-]+([^\n]+)/gi);
    if (bannedMatches) {
      bannedMatches.forEach((matchLine) => {
        const words = matchLine
          .replace(/(?:cấm dùng|từ cấm|không được nói)[:\s*-]+/gi, '')
          .split(/[,;\n]/)
          .map((w) => w.replace(/["'*]/g, '').trim())
          .filter(Boolean);
        words.forEach((w) => {
          if (!result.banned.some((b) => b.phrase.toLowerCase() === w.toLowerCase())) {
            result.banned.push({
              phrase: w,
              reason: 'Quy định nhãn hàng',
              replacement: '',
            });
          }
        });
      });
    }
  }
  if (result.visualDo.length === 0) {
    const lines = combinedText
      .split('\n')
      .filter((l) => /(?:nên quay|bắt buộc có cảnh|visual do)/i.test(l));
    result.visualDo = lines
      .slice(0, 3)
      .map((l) => l.replace(/^[-•*0-9.]+\s*/, '').trim())
      .filter(Boolean);
  }
  if (result.visualDont.length === 0) {
    const lines = combinedText
      .split('\n')
      .filter((l) => /(?:cấm quay|không quay|visual don't|visual dont)/i.test(l));
    result.visualDont = lines
      .slice(0, 3)
      .map((l) => l.replace(/^[-•*0-9.]+\s*/, '').trim())
      .filter(Boolean);
  }
  if (result.mandatoryHashtags.length === 0) {
    const foundTags = combinedText.match(/#[A-Za-z0-9_]+/g);
    if (foundTags) {
      result.mandatoryHashtags = Array.from(new Set(foundTags)).slice(0, 5);
    }
  }
  if (!result.defaultCta) {
    const m = combinedText.match(/(?:cta|kêu gọi hành động)[:\s*-]+([^\n]+)/i);
    if (m) result.defaultCta = m[1].replace(/["'*]/g, '').trim();
  }
  if (!result.legalDisclaimer) {
    const m = combinedText.match(/(?:cảnh báo|miễn trừ|pháp lý|disclaimer)[:\s*-]+([^\n]+)/i);
    if (m) {
      result.legalDisclaimer = m[1].replace(/["'*]/g, '').trim();
    } else if (profile.legal?.[0]?.disclaimer) {
      result.legalDisclaimer = profile.legal[0].disclaimer;
    }
  }

  return result;
}

export function BrandGuidelineExtractModal({
  open,
  onClose,
  brandProfile,
  canEditPositioning = true,
  canEditContentRules = true,
  canEditLegal = true,
  onApplyToProfile,
  onNotify,
}: BrandGuidelineExtractModalProps) {
  // Trạng thái tài liệu đầu vào
  const [selectedDocId, setSelectedDocId] = useState<string>('MANUAL');
  const [inputText, setInputText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Tùy chọn áp dụng từng phần
  const [applyPositioning, setApplyPositioning] = useState<boolean>(canEditPositioning);
  const [applyContentRules, setApplyContentRules] = useState<boolean>(canEditContentRules);
  const [applyLegal, setApplyLegal] = useState<boolean>(canEditLegal);

  // Dữ liệu bóc tách có thể chỉnh sửa
  const [extractedData, setExtractedData] = useState<ExtractedGuidelineData>({
    slogan: '',
    toneOfVoice: '',
    targetAudience: '',
    bigIdea: '',
    keyMessage: '',
    painPoints: [],
    rtbs: [],
    banned: [],
    visualDo: [],
    visualDont: [],
    mandatoryHashtags: [],
    defaultCta: '',
    legalDisclaimer: '',
  });

  // Đồng bộ lại khi mở modal
  const syncKey = `${open}|${brandProfile.key}|${brandProfile.revision}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setSelectedDocId('MANUAL');
      setInputText('');
      setExtractedData({
        slogan: brandProfile.positioning?.slogan || '',
        toneOfVoice: brandProfile.positioning?.toneOfVoice || '',
        targetAudience: brandProfile.positioning?.targetAudience || '',
        bigIdea: brandProfile.positioning?.bigIdea || '',
        keyMessage: brandProfile.positioning?.keyMessage || '',
        painPoints: brandProfile.positioning?.painPoints || [],
        rtbs: brandProfile.positioning?.rtbs || [],
        banned: (brandProfile.contentRules?.banned || []).map((b) => ({
          phrase: b.phrase,
          reason: b.reason,
          replacement: b.replacement,
        })),
        visualDo: brandProfile.contentRules?.visualDo || [],
        visualDont: brandProfile.contentRules?.visualDont || [],
        mandatoryHashtags: brandProfile.contentRules?.mandatoryHashtags || [],
        defaultCta: brandProfile.contentRules?.defaultCta || '',
        legalDisclaimer: brandProfile.legal?.[0]?.disclaimer || '',
      });
      setApplyPositioning(canEditPositioning);
      setApplyContentRules(canEditContentRules);
      setApplyLegal(canEditLegal);
    }
  }

  // Danh sách tài liệu có sẵn trong hồ sơ nhãn hàng
  const docOptions = useMemo(() => {
    const list = [{ value: 'MANUAL', label: 'Dán trực tiếp văn bản tài liệu' }];
    (brandProfile.documents || []).forEach((doc) => {
      list.push({
        value: doc.id,
        label: `${doc.title || doc.fileName || 'Tài liệu không tên'} (${doc.category})`,
      });
    });
    return list;
  }, [brandProfile.documents]);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    if (docId === 'MANUAL') return;
    const doc = (brandProfile.documents || []).find((d) => d.id === docId);
    if (doc) {
      const textToLoad = doc.extractedContent || doc.note || doc.title || '';
      setInputText(textToLoad);
    }
  };

  const handleFillSampleFromProfile = () => {
    const parts: string[] = [];
    parts.push(`HỒ SƠ QUY CHUẨN THƯƠNG HIỆU: ${brandProfile.brandName}`);
    if (brandProfile.positioning?.slogan) {
      parts.push(`Slogan: ${brandProfile.positioning.slogan}`);
    }
    if (brandProfile.positioning?.toneOfVoice) {
      parts.push(`Giọng điệu: ${brandProfile.positioning.toneOfVoice}`);
    }
    if (brandProfile.positioning?.targetAudience) {
      parts.push(`Khách hàng mục tiêu: ${brandProfile.positioning.targetAudience}`);
    }
    if (brandProfile.positioning?.bigIdea) {
      parts.push(`Ý tưởng lớn: ${brandProfile.positioning.bigIdea}`);
    }
    if (brandProfile.positioning?.keyMessage) {
      parts.push(`Thông điệp chính: ${brandProfile.positioning.keyMessage}`);
    }
    if (brandProfile.positioning?.painPoints?.length) {
      parts.push(`Nỗi đau khách hàng: ${brandProfile.positioning.painPoints.join(' · ')}`);
    }
    if (brandProfile.positioning?.rtbs?.length) {
      parts.push(`Lý do tin tưởng: ${brandProfile.positioning.rtbs.join(' · ')}`);
    }
    if (brandProfile.contentRules?.banned?.length) {
      parts.push(
        `Từ cấm: ${brandProfile.contentRules.banned.map((b) => `${b.phrase} (thay bằng ${b.replacement || 'từ trung tính'})`).join(', ')}`
      );
    }
    if (brandProfile.contentRules?.visualDo?.length) {
      parts.push(`Cảnh nên quay: ${brandProfile.contentRules.visualDo.join(' · ')}`);
    }
    if (brandProfile.contentRules?.visualDont?.length) {
      parts.push(`Cảnh cấm quay: ${brandProfile.contentRules.visualDont.join(' · ')}`);
    }
    if (brandProfile.contentRules?.mandatoryHashtags?.length) {
      parts.push(`Hashtag bắt buộc: ${brandProfile.contentRules.mandatoryHashtags.join(' ')}`);
    }
    if (brandProfile.contentRules?.defaultCta) {
      parts.push(`Kêu gọi hành động: ${brandProfile.contentRules.defaultCta}`);
    }
    if (brandProfile.legal?.[0]?.disclaimer) {
      parts.push(`Cảnh báo pháp lý: ${brandProfile.legal[0].disclaimer}`);
    }

    const sample = parts.join('\n\n');
    setInputText(sample);
  };

  const handleExtract = async () => {
    if (!inputText.trim()) {
      onNotify?.('Vui lòng chọn hoặc dán nội dung tài liệu trước khi bóc tách', 'warning');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await executeOperationalReport({
        purposeId: 'BRAND_GUIDELINE_EXTRACT' as never,
        moduleTitle: 'Bóc tách quy chuẩn nhãn hàng',
        sourceTag: 'MARKET_RESEARCH',
        inputContextText: `Phân tích và bóc tách tài liệu quy chuẩn thương hiệu sau đây thành cấu trúc dữ liệu JSON:\n\n${inputText}\n\nYêu cầu trả về DUY NHẤT một khối mã JSON có định dạng:\n{\n  "slogan": "...",\n  "toneOfVoice": "...",\n  "targetAudience": "...",\n  "bigIdea": "...",\n  "keyMessage": "...",\n  "painPoints": ["..."],\n  "rtbs": ["..."],\n  "banned": [{"phrase": "...", "reason": "...", "replacement": "..."}],\n  "visualDo": ["..."],\n  "visualDont": ["..."],\n  "mandatoryHashtags": ["..."],\n  "defaultCta": "...",\n  "legalDisclaimer": "..."\n}`,
      });

      const parsed = parseExtractResult(res.outputText || '', inputText, brandProfile);
      setExtractedData(parsed);
      onNotify?.('Đã tách thông tin quy chuẩn thành công', 'success');
    } catch {
      // Bộ tách dự phòng phía client khi mạng gián đoạn
      const fallback = parseExtractResult('', inputText, brandProfile);
      setExtractedData(fallback);
      onNotify?.('Đã tách thông tin quy chuẩn từ văn bản', 'info');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddBannedPhrase = () => {
    setExtractedData((prev) => ({
      ...prev,
      banned: [
        ...prev.banned,
        {
          phrase: '',
          reason: 'Quy định nhãn hàng',
          replacement: '',
        },
      ],
    }));
  };

  const handleRemoveBannedPhrase = (idx: number) => {
    setExtractedData((prev) => ({
      ...prev,
      banned: prev.banned.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateBannedPhrase = (
    idx: number,
    field: 'phrase' | 'reason' | 'replacement',
    val: string
  ) => {
    setExtractedData((prev) => {
      const nextBanned = [...prev.banned];
      nextBanned[idx] = { ...nextBanned[idx], [field]: val };
      return { ...prev, banned: nextBanned };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const patch: {
        positioning?: BrandPositioning;
        contentRules?: BrandContentRules;
        legalDisclaimer?: string;
      } = {};

      if (applyPositioning && canEditPositioning) {
        patch.positioning = {
          ...(brandProfile.positioning || {
            slogan: '',
            story: '',
            toneOfVoice: '',
            targetAudience: '',
          }),
          slogan: extractedData.slogan.trim(),
          toneOfVoice: extractedData.toneOfVoice.trim(),
          targetAudience: extractedData.targetAudience.trim(),
          bigIdea: extractedData.bigIdea.trim() || brandProfile.positioning?.bigIdea,
          keyMessage: extractedData.keyMessage.trim() || brandProfile.positioning?.keyMessage,
          painPoints: extractedData.painPoints.filter(Boolean),
          rtbs: extractedData.rtbs.filter(Boolean),
        };
      }

      if (applyContentRules && canEditContentRules) {
        const existingBanned = brandProfile.contentRules?.banned || [];
        const bannedMap = new Map<string, BannedPhrase>();
        existingBanned.forEach((b) => bannedMap.set(b.phrase.toLowerCase().trim(), b));

        extractedData.banned.forEach((b, idx) => {
          const phraseTrimmed = b.phrase.trim();
          const key = phraseTrimmed.toLowerCase();
          if (!key) return;

          if (bannedMap.has(key)) {
            const current = bannedMap.get(key)!;
            bannedMap.set(key, {
              ...current,
              reason: b.reason.trim() || current.reason,
              replacement: b.replacement.trim() || current.replacement,
            });
          } else {
            bannedMap.set(key, {
              id: `ban-${Date.now()}-${idx + 1}`,
              phrase: phraseTrimmed,
              reason: b.reason.trim() || 'Quy định nhãn hàng',
              replacement: b.replacement.trim(),
            });
          }
        });

        patch.contentRules = {
          ...(brandProfile.contentRules || {
            banned: [],
            preferred: [],
            visualDo: [],
            visualDont: [],
          }),
          banned: Array.from(bannedMap.values()),
          visualDo: extractedData.visualDo.filter(Boolean),
          visualDont: extractedData.visualDont.filter(Boolean),
          mandatoryHashtags: extractedData.mandatoryHashtags.filter(Boolean),
          defaultCta: extractedData.defaultCta.trim() || brandProfile.contentRules?.defaultCta,
        };
      }

      if (applyLegal && canEditLegal) {
        patch.legalDisclaimer = extractedData.legalDisclaimer.trim();
      }

      await onApplyToProfile(patch);
      onNotify?.('Đã lưu thông tin quy chuẩn vào hồ sơ nhãn hàng', 'success');
      onClose();
    } catch {
      onNotify?.('Không thể lưu thông tin quy chuẩn, vui lòng thử lại', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đọc tài liệu quy chuẩn nhãn hàng"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Đóng
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isExtracting}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu vào hồ sơ nhãn hàng'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Nguồn tài liệu & Nhập văn bản */}
        <div className="rounded-lg border border-line bg-surface p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1 min-w-0">
              <Field label="Nguồn tài liệu nhãn hàng">
                <Select
                  value={selectedDocId}
                  onChange={(e) => handleSelectDoc(e.target.value)}
                >
                  {docOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFillSampleFromProfile}
              className="shrink-0"
            >
              Điền văn bản mẫu từ hồ sơ hiện tại
            </Button>
          </div>

          <Field label="Nội dung văn bản quy chuẩn">
            <Textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán nội dung Brand Guideline, tài liệu sản phẩm hoặc văn bản quy định duyệt bài..."
            />
          </Field>

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              onClick={handleExtract}
              disabled={isExtracting || !inputText.trim()}
            >
              {isExtracting ? 'Đang bóc tách thông tin...' : 'Tách thông tin quy chuẩn'}
            </Button>
          </div>
        </div>

        {/* Khối 1: Định vị & Khách hàng */}
        <div className="rounded-lg border border-line bg-surface p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <input
              type="checkbox"
              id="chk-pos"
              checked={applyPositioning}
              disabled={!canEditPositioning}
              onChange={(e) => setApplyPositioning(e.target.checked)}
              className="rounded border-line-strong text-primary focus:ring-focus"
            />
            <label htmlFor="chk-pos" className="text-sm font-semibold text-ink cursor-pointer">
              Định vị & Khách hàng
            </label>
          </div>

          {applyPositioning && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <Field label="Slogan">
                <Input
                  value={extractedData.slogan}
                  onChange={(e) =>
                    setExtractedData((prev) => ({ ...prev, slogan: e.target.value }))
                  }
                  placeholder="Khẩu hiệu thương hiệu"
                />
              </Field>

              <Field label="Giọng điệu">
                <Input
                  value={extractedData.toneOfVoice}
                  onChange={(e) =>
                    setExtractedData((prev) => ({ ...prev, toneOfVoice: e.target.value }))
                  }
                  placeholder="Ví dụ: Chân thành, khoa học, gần gũi"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Khách hàng mục tiêu">
                  <Input
                    value={extractedData.targetAudience}
                    onChange={(e) =>
                      setExtractedData((prev) => ({ ...prev, targetAudience: e.target.value }))
                    }
                    placeholder="Đặc điểm nhân khẩu học, mối quan tâm chính"
                  />
                </Field>
              </div>

              <Field label="Ý tưởng lớn">
                <Input
                  value={extractedData.bigIdea}
                  onChange={(e) =>
                    setExtractedData((prev) => ({ ...prev, bigIdea: e.target.value }))
                  }
                  placeholder="Master Big Idea"
                />
              </Field>

              <Field label="Thông điệp chính">
                <Input
                  value={extractedData.keyMessage}
                  onChange={(e) =>
                    setExtractedData((prev) => ({ ...prev, keyMessage: e.target.value }))
                  }
                  placeholder="Key Message"
                />
              </Field>

              <Field label="Nỗi đau khách hàng (mỗi dòng 1 ý)">
                <Textarea
                  rows={3}
                  value={extractedData.painPoints.join('\n')}
                  onChange={(e) =>
                    setExtractedData((prev) => ({
                      ...prev,
                      painPoints: e.target.value.split('\n'),
                    }))
                  }
                  placeholder="Liệt kê các nỗi đau, mỗi dòng một ý"
                />
              </Field>

              <Field label="Lý do tin tưởng (mỗi dòng 1 ý)">
                <Textarea
                  rows={3}
                  value={extractedData.rtbs.join('\n')}
                  onChange={(e) =>
                    setExtractedData((prev) => ({
                      ...prev,
                      rtbs: e.target.value.split('\n'),
                    }))
                  }
                  placeholder="Chứng nhận y tế, kiểm nghiệm, nguồn gốc"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Khối 2: Từ cấm & Quy định quay */}
        <div className="rounded-lg border border-line bg-surface p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <input
              type="checkbox"
              id="chk-rules"
              checked={applyContentRules}
              disabled={!canEditContentRules}
              onChange={(e) => setApplyContentRules(e.target.checked)}
              className="rounded border-line-strong text-primary focus:ring-focus"
            />
            <label htmlFor="chk-rules" className="text-sm font-semibold text-ink cursor-pointer">
              Từ cấm & Quy định quay
            </label>
          </div>

          {applyContentRules && (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink">Danh sách từ cấm</span>
                  <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddBannedPhrase}>
                    Thêm từ cấm
                  </Button>
                </div>

                {extractedData.banned.length === 0 ? (
                  <div className="rounded border border-dashed border-line p-3 text-center text-xs text-ink-3">
                    Chưa có từ cấm trong danh sách
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {extractedData.banned.map((b, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center bg-canvas p-2 rounded border border-line text-xs"
                      >
                        <Input
                          value={b.phrase}
                          onChange={(e) =>
                            handleUpdateBannedPhrase(idx, 'phrase', e.target.value)
                          }
                          placeholder="Từ cấm nói"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={b.reason}
                          onChange={(e) =>
                            handleUpdateBannedPhrase(idx, 'reason', e.target.value)
                          }
                          placeholder="Lý do cấm"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={b.replacement}
                          onChange={(e) =>
                            handleUpdateBannedPhrase(idx, 'replacement', e.target.value)
                          }
                          placeholder="Từ thay thế"
                          className="h-8 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBannedPhrase(idx)}
                          className="p-1.5 text-ink-3 hover:text-critical rounded hover:bg-sunken"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Cảnh nên quay (mỗi dòng 1 ý)">
                  <Textarea
                    rows={3}
                    value={extractedData.visualDo.join('\n')}
                    onChange={(e) =>
                      setExtractedData((prev) => ({
                        ...prev,
                        visualDo: e.target.value.split('\n'),
                      }))
                    }
                    placeholder="Bối cảnh khuyên dùng, thao tác chuẩn"
                  />
                </Field>

                <Field label="Cảnh cấm quay (mỗi dòng 1 ý)">
                  <Textarea
                    rows={3}
                    value={extractedData.visualDont.join('\n')}
                    onChange={(e) =>
                      setExtractedData((prev) => ({
                        ...prev,
                        visualDont: e.target.value.split('\n'),
                      }))
                    }
                    placeholder="Cảnh nhạy cảm, so sánh trực diện sai cách"
                  />
                </Field>

                <Field label="Hashtag bắt buộc (cách nhau bởi dấu phẩy hoặc khoảng trắng)">
                  <Input
                    value={extractedData.mandatoryHashtags.join(' ')}
                    onChange={(e) =>
                      setExtractedData((prev) => ({
                        ...prev,
                        mandatoryHashtags: e.target.value.split(/[\s,]+/).filter(Boolean),
                      }))
                    }
                    placeholder="#ThuongHieu #SanPham"
                  />
                </Field>

                <Field label="Kêu gọi hành động chuẩn">
                  <Input
                    value={extractedData.defaultCta}
                    onChange={(e) =>
                      setExtractedData((prev) => ({ ...prev, defaultCta: e.target.value }))
                    }
                    placeholder="Nhấn vào giỏ hàng bên dưới để nhận ưu đãi"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Khối 3: Câu cảnh báo pháp lý bắt buộc */}
        <div className="rounded-lg border border-line bg-surface p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <input
              type="checkbox"
              id="chk-legal"
              checked={applyLegal}
              disabled={!canEditLegal}
              onChange={(e) => setApplyLegal(e.target.checked)}
              className="rounded border-line-strong text-primary focus:ring-focus"
            />
            <label htmlFor="chk-legal" className="text-sm font-semibold text-ink cursor-pointer">
              Câu cảnh báo pháp lý bắt buộc
            </label>
          </div>

          {applyLegal && (
            <div className="pt-1">
              <Field label="Nội dung câu cảnh báo pháp lý">
                <Textarea
                  rows={2}
                  value={extractedData.legalDisclaimer}
                  onChange={(e) =>
                    setExtractedData((prev) => ({
                      ...prev,
                      legalDisclaimer: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Sản phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh."
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
