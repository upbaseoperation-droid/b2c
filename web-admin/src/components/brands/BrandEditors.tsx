'use client';

/**
 * Hộp thoại sửa từng mục hồ sơ thương hiệu. Mỗi hộp thoại gửi cả mục lên máy chủ khi lưu.
 * Danh sách (sản phẩm, câu hỏi khó, pháp lý, tài liệu) dùng chung `ItemDialog` theo mô tả trường.
 */

import React, { useRef, useState } from 'react';
import { FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import type {
  BrandContentRules,
  BrandEntity,
  BrandOperatingModel,
  BrandPositioning,
  BrandProjectTier,
  BrandRatecardRow,
  BrandWorkflowRules,
  KocApprovalMode,
  SampleReturnRule,
  SampleSenderType,
  StrategyOwnerTeam,
  ToneTag,
} from '../../lib/brands/types';
import { formatNumber } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import {
  KOC_APPROVAL_MODE_LABEL,
  OPERATING_MODEL_LABEL,
  PROJECT_TIER_LABEL,
  SAMPLE_RETURN_LABEL,
  SAMPLE_SENDER_LABEL,
  STRATEGY_OWNER_LABEL,
  TONE_LABEL,
  formatFileSize,
  uploadBrandFileClient,
  type UploadedBrandFileResult,
} from './brandUi';

const GRADES = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];
const moneyInput = (raw: string) => { const d = raw.replace(/\D/g, ''); return d ? formatNumber(Number(d)) : ''; };
const toNumber = (s: string) => (s.replace(/\D/g, '') ? Number(s.replace(/\D/g, '')) : undefined);
const toLines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);

function Footer({ busy, onClose, onSave, label = 'Lưu' }: { busy: boolean; onClose: () => void; onSave: () => void; label?: string }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>Hủy</Button>
      <Button variant="primary" disabled={busy} onClick={onSave}>{label}</Button>
    </>
  );
}

/* --------------------------------------------------------- Định vị & Chiến lược nội dung */

export function PositioningDialog({ open, value, busy, onClose, onSave }: { open: boolean; value?: BrandPositioning; busy: boolean; onClose: () => void; onSave: (v: BrandPositioning) => void }) {
  const [v, setV] = useState<BrandPositioning>(value || { slogan: '', story: '', toneOfVoice: '', targetAudience: '' });
  const [achievementsText, setAchievementsText] = useState((value?.achievements || []).join('\n'));
  const [painPointsText, setPainPointsText] = useState((value?.painPoints || []).join('\n'));
  const [barriersText, setBarriersText] = useState((value?.barriersToTrial || []).join('\n'));
  const [rtbsText, setRtbsText] = useState((value?.rtbs || []).join('\n'));
  const [pillarsText, setPillarsText] = useState((value?.contentPillars || []).join('\n'));
  const [competitorsText, setCompetitorsText] = useState((value?.competitors || []).join('\n'));
  const [tierAText, setTierAText] = useState((value?.competitorTiers?.tierA || []).join('\n'));
  const [tierBText, setTierBText] = useState((value?.competitorTiers?.tierB || []).join('\n'));
  const [tierCText, setTierCText] = useState((value?.competitorTiers?.tierC || []).join('\n'));

  const set = <K extends keyof BrandPositioning>(k: K, x: BrandPositioning[K]) => setV(p => ({ ...p, [k]: x }));
  const handleSave = () => {
    onSave({
      ...v,
      achievements: toLines(achievementsText),
      painPoints: toLines(painPointsText),
      barriersToTrial: toLines(barriersText),
      rtbs: toLines(rtbsText),
      contentPillars: toLines(pillarsText),
      competitors: toLines(competitorsText),
      competitorTiers: {
        tierA: toLines(tierAText),
        tierB: toLines(tierBText),
        tierC: toLines(tierCText),
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Sửa định vị & chiến lược nội dung" size="xl" footer={<Footer busy={busy} onClose={onClose} onSave={handleSave} />}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Khẩu hiệu chủ đạo (Slogan)" htmlFor="bp-slogan"><Input id="bp-slogan" maxLength={200} value={v.slogan} onChange={e => set('slogan', e.target.value)} /></Field>
          <Field label="Ý tưởng lớn xuyên suốt (Master Big Idea)" htmlFor="bp-bigidea"><Input id="bp-bigidea" maxLength={300} value={v.bigIdea || ''} onChange={e => set('bigIdea', e.target.value)} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Thông điệp trọng tâm (Key Message)" htmlFor="bp-keymsg"><Input id="bp-keymsg" maxLength={300} value={v.keyMessage || ''} onChange={e => set('keyMessage', e.target.value)} /></Field>
          <Field label="Định hướng hình ảnh chủ đạo (Key Visual Direction)" htmlFor="bp-kv"><Input id="bp-kv" maxLength={500} value={v.keyVisualDirection || ''} onChange={e => set('keyVisualDirection', e.target.value)} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Brand Says (Định vị theo Brand Guideline)" htmlFor="bp-brandsays">
            <Textarea id="bp-brandsays" rows={2} value={v.brandSays || ''} onChange={e => set('brandSays', e.target.value)} />
          </Field>
          <Field label="Consumer Says (Nhận thức thực tế trên sàn)" htmlFor="bp-consumersays">
            <Textarea id="bp-consumersays" rows={2} value={v.consumerSays || ''} onChange={e => set('consumerSays', e.target.value)} />
          </Field>
          <Field label="Communication Objective (Dịch chuyển nhận thức)" htmlFor="bp-commgap">
            <Textarea id="bp-commgap" rows={2} value={v.communicationGap || ''} onChange={e => set('communicationGap', e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <Field label="Phong cách" htmlFor="bp-tone">
            <Select id="bp-tone" value={v.toneTag || ''} onChange={e => set('toneTag', (e.target.value || undefined) as ToneTag | undefined)}>
              <option value="">Chưa chọn</option>
              {(Object.keys(TONE_LABEL) as ToneTag[]).map(t => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Giọng văn (Tone & Voice)" htmlFor="bp-voice">
            <Textarea id="bp-voice" rows={2} maxLength={1000} value={v.toneOfVoice} onChange={e => set('toneOfVoice', e.target.value)} />
          </Field>
        </div>
        <Field label="Khách hàng mục tiêu (Target Audience)" htmlFor="bp-aud"><Textarea id="bp-aud" rows={2} maxLength={1500} value={v.targetAudience} onChange={e => set('targetAudience', e.target.value)} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nỗi đau khách hàng (Pain Points)" htmlFor="bp-pains">
            <Textarea id="bp-pains" rows={3} value={painPointsText} onChange={e => setPainPointsText(e.target.value)} />
          </Field>
          <Field label="Rào cản mua hàng (Barriers to Trial)" htmlFor="bp-barriers">
            <Textarea id="bp-barriers" rows={3} value={barriersText} onChange={e => setBarriersText(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bằng chứng tin cậy (RTB — Reason to Believe)" htmlFor="bp-rtbs">
            <Textarea id="bp-rtbs" rows={3} value={rtbsText} onChange={e => setRtbsText(e.target.value)} />
          </Field>
          <Field label="Tuyến nội dung chủ đạo theo Phễu (Content Pillars)" htmlFor="bp-pillars">
            <Textarea id="bp-pillars" rows={3} value={pillarsText} onChange={e => setPillarsText(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Đối thủ Tier A (Trực tiếp — cần thắng)" htmlFor="bp-tiera">
            <Textarea id="bp-tiera" rows={2} value={tierAText} onChange={e => setTierAText(e.target.value)} />
          </Field>
          <Field label="Đối thủ Tier B (Giao thoa — cần theo dõi)" htmlFor="bp-tierb">
            <Textarea id="bp-tierb" rows={2} value={tierBText} onChange={e => setTierBText(e.target.value)} />
          </Field>
          <Field label="Đối thủ Tier C (Hình mẫu học hỏi — Benchmark)" htmlFor="bp-tierc">
            <Textarea id="bp-tierc" rows={2} value={tierCText} onChange={e => setTierCText(e.target.value)} />
          </Field>
        </div>
        <Field label="Đối thủ cạnh tranh không được nhắc tên trong video KOC" htmlFor="bp-comp">
          <Textarea id="bp-comp" rows={2} value={competitorsText} onChange={e => setCompetitorsText(e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Câu chuyện thương hiệu (200–300 từ cho Slide 3 Brief)" htmlFor="bp-story"><Textarea id="bp-story" rows={3} maxLength={3000} value={v.story} onChange={e => set('story', e.target.value)} /></Field>
          <Field label="Giải thưởng, thành tựu & báo chí/KOL tiêu biểu (Mỗi dòng 1 ý)" htmlFor="bp-ach"><Textarea id="bp-ach" rows={3} value={achievementsText} onChange={e => setAchievementsText(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Pháp nhân */

export function EntityDialog({ open, value, fallbackCompany, busy, onClose, onSave }: { open: boolean; value?: BrandEntity; fallbackCompany: string; busy: boolean; onClose: () => void; onSave: (v: BrandEntity) => void }) {
  const [v, setV] = useState<BrandEntity>(value || { companyName: fallbackCompany, taxCode: '', contactPerson: '', originCountry: '' });
  const set = (k: keyof BrandEntity, x: string) => setV(p => ({ ...p, [k]: x }));
  return (
    <Modal open={open} onClose={onClose} title="Sửa pháp nhân"  footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(v)} />}>
      <Field label="Tên công ty" htmlFor="be-co"><Input id="be-co" maxLength={200} value={v.companyName} onChange={e => set('companyName', e.target.value)} /></Field>
      <Field label="Mã số thuế" htmlFor="be-tax"><Input id="be-tax" inputMode="numeric" maxLength={14} value={v.taxCode} onChange={e => set('taxCode', e.target.value)} className="font-code" /></Field>
      <Field label="Người liên hệ phía nhãn" htmlFor="be-ct"><Input id="be-ct" maxLength={200} value={v.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></Field>
      <Field label="Xuất xứ" htmlFor="be-org"><Input id="be-org" maxLength={100} value={v.originCountry} onChange={e => set('originCountry', e.target.value)} placeholder="Nhật Bản, Việt Nam…" /></Field>
    </Modal>
  );
}

/* --------------------------------------------------------- Quy tắc vận hành & Phê duyệt */

const DEFAULT_WORKFLOW: BrandWorkflowRules = {
  projectTier: 'TIER_B_GROWTH',
  operatingModel: 'FULLSTACK_CONTENT_BOOKING',
  strategyOwnerTeam: 'CONTENT_TEAM',
  brandApproverName: 'Đặng Thị Yến Nhi',
  kocApprovalMode: 'ALL',
  requireScriptApproval: true,
  requireDemoApproval: true,
  autoAirAfterHours: 72,
  maxFreeRevisions: 2,
  sampleSender: 'UPBASE_WAREHOUSE',
  samplePrepSlaHours: 48,
  defaultSamplePolicy: 'GIFT',
  requiresAdsCode: true,
  adsCodeDurationDays: 60,
  requireRawVideoHandover: true,
  repostAllowedChannels: ['TikTok Official của nhãn', 'Shopee Video & Trang sản phẩm (PDP)'],
  minVideoRetentionDays: 90,
  exclusivityDays: 0,
  allowExtraFeeForAdsOrCrosspost: false,
  preferredKocNiches: ['Beauty Reviewer', 'Dược sĩ / Bác sĩ'],
  kocSelectionCriteria: '',
};

export function WorkflowRulesDialog({
  open,
  value,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  value?: BrandWorkflowRules;
  busy: boolean;
  onClose: () => void;
  onSave: (v: BrandWorkflowRules) => void;
}) {
  const [v, setV] = useState<BrandWorkflowRules>(value || DEFAULT_WORKFLOW);
  const [repostText, setRepostText] = useState((value?.repostAllowedChannels || DEFAULT_WORKFLOW.repostAllowedChannels).join('\n'));
  const [nichesText, setNichesText] = useState((value?.preferredKocNiches || DEFAULT_WORKFLOW.preferredKocNiches).join('\n'));
  const [blacklistText, setBlacklistText] = useState((value?.blacklistedKocs || []).join('\n'));

  const set = <K extends keyof BrandWorkflowRules>(k: K, x: BrandWorkflowRules[K]) => setV(p => ({ ...p, [k]: x }));

  const handleSave = () => {
    onSave({
      ...v,
      repostAllowedChannels: toLines(repostText),
      preferredKocNiches: toLines(nichesText),
      blacklistedKocs: toLines(blacklistText),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thiết lập quy tắc vận hành & phê duyệt"
      size="xl"
      footer={<Footer busy={busy} onClose={onClose} onSave={handleSave} label="Lưu cấu hình vận hành" />}
    >
      <div className="space-y-5">
        {/* Nhóm 1: Phân tầng dự án & Mô hình nguồn lực */}
        <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-ink">1. Phân tầng dự án &amp; Mô hình nguồn lực B2C</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Phân hạng dự án (Tier)" htmlFor="wf-tier">
              <Select id="wf-tier" value={v.projectTier} onChange={e => set('projectTier', e.target.value as BrandProjectTier)}>
                {(Object.keys(PROJECT_TIER_LABEL) as BrandProjectTier[]).map(k => (
                  <option key={k} value={k}>{PROJECT_TIER_LABEL[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Mô hình phối hợp nguồn lực" htmlFor="wf-model">
              <Select id="wf-model" value={v.operatingModel} onChange={e => set('operatingModel', e.target.value as BrandOperatingModel)}>
                {(Object.keys(OPERATING_MODEL_LABEL) as BrandOperatingModel[]).map(k => (
                  <option key={k} value={k}>{OPERATING_MODEL_LABEL[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Đơn vị giữ quyền Strategy Owner" htmlFor="wf-owner">
              <Select id="wf-owner" value={v.strategyOwnerTeam} onChange={e => set('strategyOwnerTeam', e.target.value as StrategyOwnerTeam)}>
                {(Object.keys(STRATEGY_OWNER_LABEL) as StrategyOwnerTeam[]).map(k => (
                  <option key={k} value={k}>{STRATEGY_OWNER_LABEL[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Đầu mối duyệt phía Nhãn hàng / Account" htmlFor="wf-approver">
              <Input id="wf-approver" value={v.brandApproverName} onChange={e => set('brandApproverName', e.target.value)} placeholder="Tên đại diện nhãn hoặc Account PIC" />
            </Field>
          </div>
        </div>

        {/* Nhóm 2: Quy trình duyệt của Nhãn & SLA */}
        <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-ink">2. Cổng phê duyệt của Nhãn hàng &amp; SLA (Tác động Pipeline Booking &amp; Duyệt kịch bản)</h4>
          <Field label="Quy tắc duyệt danh sách KOC (Shortlist)" htmlFor="wf-koc-mode">
            <Select id="wf-koc-mode" value={v.kocApprovalMode} onChange={e => set('kocApprovalMode', e.target.value as KocApprovalMode)}>
              {(Object.keys(KOC_APPROVAL_MODE_LABEL) as KocApprovalMode[]).map(k => (
                <option key={k} value={k}>{KOC_APPROVAL_MODE_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={v.requireScriptApproval}
                onChange={e => set('requireScriptApproval', e.target.checked)}
                className="rounded border-line-strong"
              />
              <span>Bắt buộc duyệt Kịch bản chữ (Script/Outline) trước khi quay</span>
            </label>
            <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={v.requireDemoApproval}
                onChange={e => set('requireDemoApproval', e.target.checked)}
                className="rounded border-line-strong"
              />
              <span>Bắt buộc duyệt Video Demo trước khi đăng bài (On-air)</span>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="SLA tự động cho phép đăng nếu Nhãn không phản hồi (Giờ)" htmlFor="wf-auto-air">
              <Input
                id="wf-auto-air"
                type="number"
                min={0}
                max={720}
                value={String(v.autoAirAfterHours)}
                onChange={e => set('autoAirAfterHours', Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Số vòng yêu cầu chỉnh sửa miễn phí tối đa (Vòng)" htmlFor="wf-revisions">
              <Input
                id="wf-revisions"
                type="number"
                min={0}
                max={10}
                value={String(v.maxFreeRevisions)}
                onChange={e => set('maxFreeRevisions', Number(e.target.value) || 0)}
              />
            </Field>
          </div>
        </div>

        {/* Nhóm 3: Chính sách Hàng mẫu & Kho vận */}
        <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-ink">3. Chính sách Hàng mẫu &amp; Kho vận (Tác động bước Gửi hàng &amp; Nghiệm thu)</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Đơn vị xuất hàng mẫu" htmlFor="wf-sender" className="md:col-span-2">
              <Select id="wf-sender" value={v.sampleSender} onChange={e => set('sampleSender', e.target.value as SampleSenderType)}>
                {(Object.keys(SAMPLE_SENDER_LABEL) as SampleSenderType[]).map(k => (
                  <option key={k} value={k}>{SAMPLE_SENDER_LABEL[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="SLA chuẩn bị hàng (Giờ)" htmlFor="wf-sample-sla" noWrap>
              <Input
                id="wf-sample-sla"
                type="number"
                min={4}
                max={240}
                value={String(v.samplePrepSlaHours)}
                onChange={e => set('samplePrepSlaHours', Number(e.target.value) || 48)}
              />
            </Field>
          </div>
          <Field label="Quy định sở hữu hàng mẫu mặc định" htmlFor="wf-sample-policy">
            <Select id="wf-sample-policy" value={v.defaultSamplePolicy} onChange={e => set('defaultSamplePolicy', e.target.value as SampleReturnRule)}>
              {(Object.keys(SAMPLE_RETURN_LABEL) as SampleReturnRule[]).map(k => (
                <option key={k} value={k}>{SAMPLE_RETURN_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Nhóm 4: Quyền sử dụng hình ảnh, Mã quảng cáo & Hợp đồng */}
        <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-ink">4. Bản quyền hình ảnh, Mã quảng cáo (Spark Ads) &amp; Hợp đồng</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={v.requiresAdsCode}
                onChange={e => set('requiresAdsCode', e.target.checked)}
                className="rounded border-line-strong"
              />
              <span>Bắt buộc KOC cấp mã quảng cáo (Spark Ads / Partnership Ads)</span>
            </label>
            <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={v.requireRawVideoHandover}
                onChange={e => set('requireRawVideoHandover', e.target.checked)}
                className="rounded border-line-strong"
              />
              <span>Bắt buộc bàn giao file video gốc không logo (MP4/Raw)</span>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Thời hạn mã Ads (Ngày)" htmlFor="wf-ads-days" noWrap>
              <Input
                id="wf-ads-days"
                type="number"
                min={0}
                max={3650}
                value={String(v.adsCodeDurationDays)}
                onChange={e => set('adsCodeDurationDays', Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Thời gian giữ video công khai (Ngày)" htmlFor="wf-retain-days" noWrap>
              <Input
                id="wf-retain-days"
                type="number"
                min={7}
                max={3650}
                value={String(v.minVideoRetentionDays)}
                onChange={e => set('minVideoRetentionDays', Number(e.target.value) || 90)}
              />
            </Field>
            <Field label="Độc quyền ngành hàng (Ngày)" htmlFor="wf-excl-days" noWrap>
              <Input
                id="wf-excl-days"
                type="number"
                min={0}
                max={365}
                value={String(v.exclusivityDays)}
                onChange={e => set('exclusivityDays', Number(e.target.value) || 0)}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={v.allowExtraFeeForAdsOrCrosspost}
              onChange={e => set('allowExtraFeeForAdsOrCrosspost', e.target.checked)}
              className="rounded border-line-strong"
            />
            <span>Cho phép tính phụ phí riêng khi mua thêm Mã Ads / Đăng chéo đa nền tảng (Bỏ chọn = Bắt buộc đàm phán trọn gói All-in trong giá cast)</span>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Các kênh Nhãn được phép đăng lại (Repost)" htmlFor="wf-repost">
              <Textarea id="wf-repost" rows={2} value={repostText} onChange={e => setRepostText(e.target.value)} />
            </Field>
            <Field label="Tệp KOC ưu tiên của nhãn" htmlFor="wf-niches">
              <Textarea id="wf-niches" rows={2} value={nichesText} onChange={e => setNichesText(e.target.value)} />
            </Field>
          </div>
          <Field label="Tiêu chí chọn & loại trừ KOC" htmlFor="wf-criteria">
            <Textarea id="wf-criteria" rows={2} value={v.kocSelectionCriteria} onChange={e => set('kocSelectionCriteria', e.target.value)} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Yêu cầu nhân khẩu học khán giả kênh KOC (% Nữ, Độ tuổi, Khu vực)" htmlFor="wf-demo">
              <Input
                id="wf-demo"
                value={v.targetAudienceDemographics || ''}
                onChange={e => set('targetAudienceDemographics', e.target.value)}
                placeholder="VD: Khán giả Nữ ≥ 70%, độ tuổi 18–34 tại Việt Nam"
              />
            </Field>
            <Field label="Yêu cầu ngoại hình, làn da & bối cảnh quay của KOC" htmlFor="wf-persona">
              <Input
                id="wf-persona"
                value={v.kocPersonaAndVisualCriteria || ''}
                onChange={e => set('kocPersonaAndVisualCriteria', e.target.value)}
                placeholder="VD: Da thật khỏe, phòng sáng gọn, giọng đọc rõ ràng"
              />
            </Field>
          </div>
          <Field label="Danh sách KOC / kênh bị nhãn từ chối hợp tác lại (Blacklist riêng của nhãn, mỗi dòng 1 kênh)" htmlFor="wf-blacklist">
            <Textarea
              id="wf-blacklist"
              rows={2}
              value={blacklistText}
              onChange={e => setBlacklistText(e.target.value)}
              placeholder="@id_kenh — Lý do nhãn từ chối"
            />
          </Field>
        </div>

        {/* Nhóm 5: Thông tin bàn giao & Bộ file gốc (Bảng 3.5 Danh sách file brand) */}
        <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-ink">5. Thông tin bàn giao &amp; Link Google Sheet</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Người bàn giao" htmlFor="wf-h-from">
              <Input id="wf-h-from" value={v.handoverFrom || ''} onChange={e => set('handoverFrom', e.target.value)} />
            </Field>
            <Field label="Người nhận bàn giao" htmlFor="wf-h-to">
              <Input id="wf-h-to" value={v.handoverTo || ''} onChange={e => set('handoverTo', e.target.value)} />
            </Field>
            <Field label="Link Google Sheet" htmlFor="wf-sheet-url">
              <Input id="wf-sheet-url" type="url" value={v.bookingSheetUrl || ''} onChange={e => set('bookingSheetUrl', e.target.value)} placeholder="https://docs.google.com/spreadsheets/..." />
            </Field>
            <Field label="Link Canva Brief sản phẩm" htmlFor="wf-canva-url">
              <Input id="wf-canva-url" type="url" value={v.canvaBriefUrl || ''} onChange={e => set('canvaBriefUrl', e.target.value)} placeholder="https://www.canva.com/design/..." />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Trần thù lao */

export function RatecardDialog({ open, value, busy, onClose, onSave }: { open: boolean; value: BrandRatecardRow[]; busy: boolean; onClose: () => void; onSave: (v: BrandRatecardRow[]) => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(GRADES.map(g => [g, value.find(r => r.grade === g)?.maxBudget ? formatNumber(value.find(r => r.grade === g)!.maxBudget!) : ''])));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa trần thù lao KOC"
      footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(GRADES.map(grade => ({ grade, maxBudget: toNumber(v[grade]) })))} />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GRADES.map(g => (
          <Field key={g} label={g} htmlFor={`rc-${g}`}>
            <Input id={`rc-${g}`} inputMode="numeric" className="tabular-nums" placeholder="Số tiền (đ)" value={v[g]} onChange={e => setV(p => ({ ...p, [g]: moneyInput(e.target.value) }))} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Quy chuẩn nội dung */

/** Chỉnh sửa quy chuẩn nội dung dạng danh sách dòng trực quan (Thêm / Sửa / Xóa từng mục). */
export function ContentRulesDialog({ open, value, busy, onClose, onSave }: { open: boolean; value?: BrandContentRules; busy: boolean; onClose: () => void; onSave: (v: BrandContentRules) => void }) {
  const v = value || { banned: [], preferred: [], visualDo: [], visualDont: [] };
  const [bannedRows, setBannedRows] = useState<Array<{ id: string; phrase: string; replacement: string; reason: string }>>(
    v.banned.length > 0
      ? v.banned.map(b => ({ id: b.id, phrase: b.phrase, replacement: b.replacement || '', reason: b.reason || '' }))
      : [{ id: '', phrase: '', replacement: '', reason: '' }],
  );
  const [preferredRows, setPreferredRows] = useState<Array<{ id: string; phrase: string; note: string }>>(
    v.preferred.length > 0
      ? v.preferred.map(p => ({ id: p.id, phrase: p.phrase, note: p.note || '' }))
      : [{ id: '', phrase: '', note: '' }],
  );
  const [doRows, setDoRows] = useState<string[]>(v.visualDo.length > 0 ? [...v.visualDo] : ['']);
  const [dontRows, setDontRows] = useState<string[]>(v.visualDont.length > 0 ? [...v.visualDont] : ['']);
  const [hashtags, setHashtags] = useState((v.mandatoryHashtags || []).join(' '));
  const [mentions, setMentions] = useState((v.mandatoryMentions || []).join(' '));
  const [defaultCta, setDefaultCta] = useState(v.defaultCta || '');
  const [durationRule, setDurationRule] = useState(v.videoDurationRule || '');
  const [minPriceRule, setMinPriceRule] = useState(v.minAdvertisedPriceRule || '');
  const [promoMechanic, setPromoMechanic] = useState(v.keyPromotionMechanic || '');

  const splitTokens = (s: string) => s.split(/[\s,\n]+/).map(x => x.trim()).filter(Boolean);

  const save = () => onSave({
    banned: bannedRows
      .filter(b => b.phrase.trim())
      .map((b, idx) => ({
        id: b.id || `ban-${idx}-${Date.now()}`,
        phrase: b.phrase.trim(),
        replacement: b.replacement.trim(),
        reason: b.reason,
      })),
    preferred: preferredRows
      .filter(p => p.phrase.trim())
      .map((p, idx) => ({
        id: p.id || `pref-${idx}-${Date.now()}`,
        phrase: p.phrase.trim(),
        note: p.note,
      })),
    visualDo: doRows.map(x => x.trim()).filter(Boolean),
    visualDont: dontRows.map(x => x.trim()).filter(Boolean),
    mandatoryHashtags: splitTokens(hashtags),
    mandatoryMentions: splitTokens(mentions),
    defaultCta: defaultCta.trim(),
    videoDurationRule: durationRule.trim(),
    minAdvertisedPriceRule: minPriceRule.trim(),
    keyPromotionMechanic: promoMechanic.trim(),
  });

  return (
    <Modal open={open} onClose={onClose} title="Sửa quy chuẩn nội dung & yêu cầu bài đăng" size="lg" footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <div className="space-y-4">
        {/* Từ khóa cấm */}
        <div className="rounded-lg border border-line bg-canvas p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-critical">Từ khóa cấm ({bannedRows.filter(b => b.phrase.trim()).length})</span>
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() => setBannedRows(prev => [...prev, { id: '', phrase: '', replacement: '', reason: '' }])}
            >
              Thêm từ cấm
            </Button>
          </div>
          <div className="space-y-1.5">
            {bannedRows.map((row, idx) => (
              <div key={row.id || `b-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Input
                  value={row.phrase}
                  onChange={e => setBannedRows(prev => prev.map((it, i) => (i === idx ? { ...it, phrase: e.target.value } : it)))}
                  placeholder="Từ khóa cấm (VD: Trị dứt điểm)"
                />
                <Input
                  value={row.replacement}
                  onChange={e => setBannedRows(prev => prev.map((it, i) => (i === idx ? { ...it, replacement: e.target.value } : it)))}
                  placeholder="Cụm từ thay thế (VD: Hỗ trợ làm dịu)"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setBannedRows(prev => prev.filter((_, i) => i !== idx))}
                >
                  Xóa
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Cụm từ nên dùng */}
        <div className="rounded-lg border border-line bg-canvas p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-positive">Cụm từ nên dùng ({preferredRows.filter(p => p.phrase.trim()).length})</span>
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() => setPreferredRows(prev => [...prev, { id: '', phrase: '', note: '' }])}
            >
              Thêm cụm từ
            </Button>
          </div>
          <div className="space-y-1.5">
            {preferredRows.map((row, idx) => (
              <div key={row.id || `p-${idx}`} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input
                  value={row.phrase}
                  onChange={e => setPreferredRows(prev => prev.map((it, i) => (i === idx ? { ...it, phrase: e.target.value } : it)))}
                  placeholder="Cụm từ khuyến khích (VD: Thấm nhanh không nhờn rít)"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setPreferredRows(prev => prev.filter((_, i) => i !== idx))}
                >
                  Xóa
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Quy tắc hình ảnh */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-canvas p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">Hình ảnh không được dùng ({dontRows.filter(x => x.trim()).length})</span>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setDontRows(prev => [...prev, ''])}>
                Thêm
              </Button>
            </div>
            <div className="space-y-1.5">
              {dontRows.map((val, idx) => (
                <div key={`dont-${idx}`} className="grid grid-cols-[1fr_auto] gap-1.5 items-center">
                  <Input
                    value={val}
                    onChange={e => setDontRows(prev => prev.map((it, i) => (i === idx ? e.target.value : it)))}
                    placeholder="Hình ảnh cần tránh"
                  />
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDontRows(prev => prev.filter((_, i) => i !== idx))}>
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">Hình ảnh khuyến khích ({doRows.filter(x => x.trim()).length})</span>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setDoRows(prev => [...prev, ''])}>
                Thêm
              </Button>
            </div>
            <div className="space-y-1.5">
              {doRows.map((val, idx) => (
                <div key={`do-${idx}`} className="grid grid-cols-[1fr_auto] gap-1.5 items-center">
                  <Input
                    value={val}
                    onChange={e => setDoRows(prev => prev.map((it, i) => (i === idx ? e.target.value : it)))}
                    placeholder="Hình ảnh nên có trong video"
                  />
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDoRows(prev => prev.filter((_, i) => i !== idx))}>
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Hashtag bắt buộc trên bài đăng" htmlFor="cr-tags">
            <Input id="cr-tags" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#Beauty #Skincare" />
          </Field>
          <Field label="Tài khoản bắt buộc Tag / Mention" htmlFor="cr-mentions">
            <Input id="cr-mentions" value={mentions} onChange={e => setMentions(e.target.value)} placeholder="@official_store" />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Thời lượng & cấu trúc clip" htmlFor="cr-dur">
            <Input id="cr-dur" value={durationRule} onChange={e => setDurationRule(e.target.value)} placeholder="45–90 giây, sản phẩm xuất hiện 3s đầu" />
          </Field>
          <Field label="Câu điều hướng mua hàng (CTA)" htmlFor="cr-cta">
            <Input id="cr-cta" value={defaultCta} onChange={e => setDefaultCta(e.target.value)} placeholder="Bấm giỏ hàng góc trái nhận ưu đãi" />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Quy định giá sàn truyền thông & từ cấm về giá" htmlFor="cr-map">
            <Input id="cr-map" value={minPriceRule} onChange={e => setMinPriceRule(e.target.value)} placeholder="VD: Không báo giá dưới 195k, không nói từ xả kho/thanh lý" />
          </Field>
          <Field label="Cơ chế khuyến mãi, voucher & quà tặng chủ đạo" htmlFor="cr-promo">
            <Input id="cr-promo" value={promoMechanic} onChange={e => setPromoMechanic(e.target.value)} placeholder="VD: Mua 1 tặng 1 mini size + Voucher 15% ngày đôi" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- Danh sách theo mô tả trường */

export interface ItemField {
  key: string;
  label: string;
  kind?: 'text' | 'long' | 'lines' | 'money' | 'number' | 'url' | 'select' | 'file';
  required?: boolean;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  wide?: boolean;
}

type Item = Record<string, unknown>;

const toForm = (fields: ItemField[], item?: Item) =>
  Object.fromEntries(fields.map(f => {
    const v = item?.[f.key];
    return [
      f.key,
      Array.isArray(v)
        ? v.join('\n')
        : f.kind === 'money' && typeof v === 'number'
          ? formatNumber(v)
          : f.kind === 'number' && typeof v === 'number'
            ? String(v)
            : typeof v === 'string'
              ? v
              : f.kind === 'select' && f.options?.[0]
                ? f.options[0].value
                : '',
    ];
  })) as Record<string, string>;

const fromForm = (fields: ItemField[], form: Record<string, string>, base?: Item, uploaded?: UploadedBrandFileResult | null): Item => {
  const result: Item = {
    ...(base || {}),
    ...Object.fromEntries(fields.map(f => [
      f.key,
      f.kind === 'lines'
        ? form[f.key].split('\n').map(s => s.trim()).filter(Boolean)
        : f.kind === 'money'
          ? toNumber(form[f.key])
          : f.kind === 'number'
            ? (form[f.key].trim() ? Number(form[f.key]) : undefined)
            : form[f.key].trim(),
    ])),
  };
  if (uploaded) {
    result.url = uploaded.url;
    result.fileKey = uploaded.fileKey;
    result.fileName = uploaded.fileName;
    result.fileSize = uploaded.fileSize;
    result.mimeType = uploaded.mimeType;
    result.storage = uploaded.storage;
  } else if (uploaded === null) {
    delete result.fileKey;
    delete result.fileName;
    delete result.fileSize;
    delete result.mimeType;
    result.storage = 'LINK';
  }
  return result;
};

const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,.txt';

/** Thêm hoặc sửa một mục của danh sách. `item` rỗng là thêm mới. */
export function ItemDialog({
  open,
  title,
  fields,
  item,
  busy,
  uploadContext,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: ItemField[];
  item?: Item;
  busy: boolean;
  uploadContext?: { brandName: string; section: 'DOCUMENTS' | 'LEGAL' };
  onClose: () => void;
  onSave: (item: Item) => void;
}) {
  const [form, setForm] = useState(() => toForm(fields, item));
  const [uploadedFile, setUploadedFile] = useState<UploadedBrandFileResult | undefined | null>(() => {
    if (item && typeof item.fileKey === 'string' && item.fileKey) {
      return {
        fileKey: item.fileKey,
        fileName: typeof item.fileName === 'string' ? item.fileName : item.fileKey.split('/').pop() || 'Tệp đính kèm',
        fileSize: typeof item.fileSize === 'number' ? item.fileSize : 0,
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : '',
        storage: item.storage === 'LOCAL' ? 'LOCAL' : 'R2',
        url: typeof item.url === 'string' ? item.url : `/api/brands/files?key=${encodeURIComponent(item.fileKey)}`,
      };
    }
    return undefined;
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = async (file: File | undefined, fieldKey: string) => {
    if (!file || !uploadContext) return;
    setUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadBrandFileClient({
        file,
        brandName: uploadContext.brandName,
        section: uploadContext.section,
      });
      setUploadedFile(stored);
      setForm(p => {
        const next = { ...p, [fieldKey]: stored.url };
        if ('title' in next && !next.title?.trim()) {
          next.title = file.name.replace(/\.[^.]+$/, '');
        }
        return next;
      });
    } catch (e) {
      setUploadError((e as Error).message || 'Không tải được tệp lên.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const missing = fields.filter(f => f.required && !form[f.key]?.trim());
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" footer={<Footer busy={busy || uploading || missing.length > 0} onClose={onClose} onSave={() => onSave(fromForm(fields, form, item, uploadedFile))} />}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(f => {
          const id = `it-${f.key}`;
          const set = (x: string) => setForm(p => ({ ...p, [f.key]: f.kind === 'money' ? moneyInput(x) : x }));
          return (
            <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} htmlFor={id} className={f.wide || f.kind === 'long' || f.kind === 'lines' || f.kind === 'file' ? 'md:col-span-2' : undefined}>
              {f.kind === 'file' ? (
                <div className="grid gap-2.5">
                  {uploadContext && (
                    <div
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) void handleSelectFile(dropped, f.key);
                      }}
                      className="rounded-lg border border-dashed border-line-strong bg-canvas/60 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT}
                        className="hidden"
                        onChange={e => void handleSelectFile(e.target.files?.[0], f.key)}
                      />
                      {uploadedFile ? (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-accent shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-ink truncate">{uploadedFile.fileName}</p>
                            <p className="text-2xs text-ink-3">
                              {[
                                formatFileSize(uploadedFile.fileSize),
                                'Đã tải lên hệ thống',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">Tải tệp tài liệu lên hệ thống</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={uploading ? Loader2 : Upload}
                          disabled={uploading || busy}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? 'Đang tải…' : uploadedFile ? 'Đổi tệp' : 'Chọn tệp'}
                        </Button>
                        {uploadedFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            disabled={uploading || busy}
                            onClick={() => {
                              setUploadedFile(null);
                              set('');
                            }}
                          >
                            Gỡ tệp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadError && <p className="text-2xs text-critical">{uploadError}</p>}
                  {!uploadedFile && (
                    <Input
                      id={id}
                      value={form[f.key]}
                      onChange={e => {
                        setUploadedFile(null);
                        set(e.target.value);
                      }}
                      type="url"
                      placeholder="Hoặc dán link tài liệu (Lark, Google Drive: https://…)"
                    />
                  )}
                </div>
              ) : f.kind === 'long' || f.kind === 'lines' ? (
                <Textarea id={id} rows={f.kind === 'lines' ? 3 : 3} value={form[f.key]} onChange={e => set(e.target.value)} />
              ) : f.kind === 'select' ? (
                <Select id={id} value={form[f.key]} onChange={e => set(e.target.value)}>
                  {f.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  id={id}
                  value={form[f.key]}
                  onChange={e => set(e.target.value)}
                  inputMode={f.kind === 'money' || f.kind === 'number' ? 'numeric' : undefined}
                  type={f.kind === 'url' ? 'url' : f.kind === 'number' ? 'number' : 'text'}
                  placeholder={f.kind === 'url' ? 'https://…' : f.kind === 'money' ? 'Số tiền (đ)' : undefined}
                  className={f.kind === 'money' || f.kind === 'number' ? 'tabular-nums' : undefined}
                />
              )}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
}
