'use client';

/**
 * Màn hình Quản lý Bộ hồ sơ liên kết (1. HĐNT Khung ↔ 2. Phụ lục SOW ↔ 3. Biên bản nghiệm thu BBNT)
 * và Đối soát các chỉ số phụ thuộc:
 * - Phụ thuộc TRONG 1 FILE (Công thức cộng 4 nhóm hạng mục = Net, Net + Thuế = Gross, Tổng nghiệm thu - Tạm ứng = Còn trả, Phương thức thanh toán 1 lần / 2 lần).
 * - Phụ thuộc GIỮA CÁC FILE (Số hiệu & Ngày HĐNT gốc -> SOW -> BBNT, Pháp nhân & Ngân hàng Bên B, Định mức SOW -> Nghiệm thu BBNT, Tạm ứng Lần 1 trên SOW -> Đã tạm ứng trên BBNT).
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FilePlus2,
  FileText,
  GitCompare,
  Layers,
  RefreshCw,
} from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, LegalTemplate } from '../../lib/contracts/types';
import { formatNumber } from '../../lib/format';
import { Button, DataTable, EmptyState, FilterBar, Panel, Segmented, Stat, StatRow, Status } from '../ui';
import type { Column } from '../ui';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import { documentOfTemplate } from '../../lib/planDealLink';
import {
  buildJobAcceptanceBreakdown,
  contractStatus,
  PAYMENT_SCHEDULE_META_KEY,
  prefill,
  resolveActiveLegalProfile,
  resolvePaymentScheduleOption,
  SOW_JOBS_META_KEY,
  parseSavedSowJobs,
  syncValuesFromJobAcceptanceBreakdown,
  uniqueFields,
  type ContractDocStage,
} from './contractUi';
import type { ContractBootstrap } from './api';
import type { ContractFormInit } from './ContractForm';

export interface LinkedContractSet {
  setKey: string;
  kocId?: string;
  kocName: string;
  kocChannel: string;
  brandName: string;
  dealId?: string;
  dealCode: string;
  subjectLabel: string;
  hdnt?: ContractRecord;
  sow?: ContractRecord;
  bbnt?: ContractRecord;
  deal?: BookingDealItem;
  koc?: KocItem;
  crossChecks: CrossFileDependencyRow[];
  intraChecks: IntraFileDependencyRow[];
  hasMismatch: boolean;
  mismatchCount: number;
  stageCount: number;
}

export interface CrossFileDependencyRow {
  id: string;
  category: 'IDENTITY' | 'PARTY_BANK' | 'SCOPE_TASKS' | 'FINANCIAL_TAX';
  metricName: string;
  ruleDescription: string;
  hdntValue: string;
  sowValue: string;
  bbntValue: string;
  status: 'MATCHED' | 'MISMATCH' | 'PARTIAL';
  note?: string;
}

export interface IntraFileDependencyRow {
  id: string;
  docStage: 'HDNT' | 'SOW' | 'BBNT';
  docTitle: string;
  formulaName: string;
  lhsLabel: string;
  lhsValue: string;
  rhsLabel: string;
  rhsValue: string;
  status: 'VALID' | 'INVALID';
  detailNote: string;
}

const parseMoneyNum = (raw?: string): number => {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d-]/g, '');
  return Number(cleaned) || 0;
};

const getFieldsForTemplate = (templateId: string, templates: LegalTemplate[]): ContractField[] => {
  const tpl = templates.find(t => t.id === templateId) || OFFICIAL_TEMPLATES_SNAPSHOT[templateId];
  return tpl ? uniqueFields(tpl) : [];
};

const findValueByPredicate = (
  record: ContractRecord | undefined,
  templates: LegalTemplate[],
  pred: (f: ContractField) => boolean,
): string => {
  if (!record) return '';
  const fields = getFieldsForTemplate(record.templateId, templates);
  const matched = fields.find(pred);
  if (!matched) return '';
  return (record.values?.[matched.key] || '').trim();
};

const sumFieldsByPredicate = (
  record: ContractRecord | undefined,
  templates: LegalTemplate[],
  pred: (f: ContractField) => boolean,
): number => {
  if (!record) return 0;
  const fields = getFieldsForTemplate(record.templateId, templates);
  return fields
    .filter(pred)
    .reduce((sum, f) => sum + parseMoneyNum(record.values?.[f.key]), 0);
};

export function ContractSetReconciliationView({
  data,
  deals = [],
  kocs = [],
  busy = false,
  onOpenRecord,
  onQuickViewRecord,
  onCreateStageDoc,
  onSyncRecordValues,
}: {
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  busy?: boolean;
  onOpenRecord: (id: string) => void;
  onQuickViewRecord: (record: ContractRecord) => void;
  onCreateStageDoc: (init: ContractFormInit) => void;
  onSyncRecordValues: (record: ContractRecord, nextValues: Record<string, string>) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MISMATCH' | 'INCOMPLETE' | 'COMPLETE'>('ALL');
  const [selectedSetKey, setSelectedSetKey] = useState<string>('');
  const [activeCheckTab, setActiveCheckTab] = useState<'CROSS_FILE' | 'INTRA_FILE'>('CROSS_FILE');

  const contractSets = useMemo<LinkedContractSet[]>(() => {
    const records = data.records || [];
    const templates = data.templates || [];
    const hdntList = records.filter(r => documentOfTemplate(r.templateId) === 'HDNT');
    const sowList = records.filter(r => documentOfTemplate(r.templateId) === 'SOW');
    const bbntList = records.filter(r => documentOfTemplate(r.templateId) === 'BBNT');

    const usedRecordIds = new Set<string>();
    const rawGroups: Array<{
      setKey: string;
      deal?: BookingDealItem;
      koc?: KocItem;
      hdnt?: ContractRecord;
      sow?: ContractRecord;
      bbnt?: ContractRecord;
    }> = [];

    // 1. Gom theo SOW (mỗi Phụ lục SOW ứng với 1 Deal/chiến dịch, nối ngược về HĐNT gốc và nối xuôi sang BBNT)
    for (const sow of sowList) {
      usedRecordIds.add(sow.id);
      const matchedDeal = deals.find(
        d => (sow.dealId && d.id === sow.dealId) || (sow.dealCode && d.dealCode === sow.dealCode),
      );
      const matchedKoc = kocs.find(
        k =>
          (sow.kocId && k.id === sow.kocId) ||
          (matchedDeal?.kocId && k.id === matchedDeal.kocId) ||
          k.stageName.toLowerCase() === sow.partner.toLowerCase(),
      );
      const hdnt =
        hdntList.find(h => h.id === sow.parentId) ||
        hdntList.find(
          h =>
            (sow.kocId && h.kocId === sow.kocId) ||
            (matchedKoc?.id && h.kocId === matchedKoc.id) ||
            h.partner.toLowerCase() === sow.partner.toLowerCase(),
        );
      if (hdnt) usedRecordIds.add(hdnt.id);

      const bbnt =
        bbntList.find(b => b.parentId === sow.id) ||
        bbntList.find(
          b =>
            (sow.dealId && b.dealId === sow.dealId) ||
            (sow.dealCode && b.dealCode === sow.dealCode),
        );
      if (bbnt) usedRecordIds.add(bbnt.id);

      rawGroups.push({
        setKey: `set-sow-${sow.id}`,
        deal: matchedDeal,
        koc: matchedKoc,
        hdnt,
        sow,
        bbnt,
      });
    }

    // 2. Các BBNT chưa gắn SOW nhưng có gắn HĐNT hoặc đứng riêng theo Deal
    for (const bbnt of bbntList) {
      if (usedRecordIds.has(bbnt.id)) continue;
      usedRecordIds.add(bbnt.id);
      const matchedDeal = deals.find(
        d => (bbnt.dealId && d.id === bbnt.dealId) || (bbnt.dealCode && d.dealCode === bbnt.dealCode),
      );
      const matchedKoc = kocs.find(
        k =>
          (bbnt.kocId && k.id === bbnt.kocId) ||
          (matchedDeal?.kocId && k.id === matchedDeal.kocId) ||
          k.stageName.toLowerCase() === bbnt.partner.toLowerCase(),
      );
      const hdnt =
        hdntList.find(h => h.id === bbnt.parentId) ||
        hdntList.find(
          h =>
            (bbnt.kocId && h.kocId === bbnt.kocId) ||
            (matchedKoc?.id && h.kocId === matchedKoc.id) ||
            h.partner.toLowerCase() === bbnt.partner.toLowerCase(),
        );
      if (hdnt) usedRecordIds.add(hdnt.id);
      rawGroups.push({
        setKey: `set-bbnt-${bbnt.id}`,
        deal: matchedDeal,
        koc: matchedKoc,
        hdnt,
        sow: undefined,
        bbnt,
      });
    }

    // 3. Các HĐNT chưa có SOW / BBNT
    for (const hdnt of hdntList) {
      if (usedRecordIds.has(hdnt.id)) continue;
      usedRecordIds.add(hdnt.id);
      const matchedDeal = deals.find(
        d => (hdnt.dealId && d.id === hdnt.dealId) || (hdnt.dealCode && d.dealCode === hdnt.dealCode),
      );
      const matchedKoc = kocs.find(
        k =>
          (hdnt.kocId && k.id === hdnt.kocId) ||
          (matchedDeal?.kocId && k.id === matchedDeal.kocId) ||
          k.stageName.toLowerCase() === hdnt.partner.toLowerCase(),
      );
      rawGroups.push({
        setKey: `set-hdnt-${hdnt.id}`,
        deal: matchedDeal,
        koc: matchedKoc,
        hdnt,
        sow: undefined,
        bbnt: undefined,
      });
    }

    return rawGroups.map(grp => {
      const { hdnt, sow, bbnt, deal, koc } = grp;
      const anyRec = sow || bbnt || hdnt!;
      const tplId = anyRec.templateId;
      const subjectLabel = tplId.startsWith('COM-')
        ? 'Công ty (COM)'
        : tplId.startsWith('HKD-')
          ? 'Hộ kinh doanh (HKD)'
          : tplId.startsWith('CTV-')
            ? 'CTV Kênh'
            : 'Cá nhân (IND)';

      // --- Trích xuất các chỉ số từ 3 văn bản ---
      const hdntDocDate = hdnt?.values?.['token:[dd.mm.yy]'] || '';
      const sowRefHdntDate = sow?.values?.['token:[Ngày HĐNT]'] || '';
      const bbntRefHdntDate = bbnt?.values?.['token:[Ngày HĐNT]'] || '';

      const sowDocDate = sow?.values?.['token:[dd.mm.yy]'] || '';
      const bbntRefSowDate = bbnt?.values?.['token:[Ngày SOW]'] || '';

      const hdntKocToken = hdnt?.values?.['token:[ID KOC]'] || '';
      const sowKocToken = sow?.values?.['token:[ID KOC]'] || '';
      const bbntKocToken = bbnt?.values?.['token:[ID KOC]'] || '';

      const sowBrandToken = sow?.values?.['token:[BRAND]'] || '';
      const bbntBrandToken = bbnt?.values?.['token:[BRAND]'] || '';

      const partyOf = (r?: ContractRecord) =>
        findValueByPredicate(r, templates, f => f.source === 'partyName') || r?.partner || '';
      const hdntParty = partyOf(hdnt);
      const sowParty = partyOf(sow);
      const bbntParty = partyOf(bbnt);

      const taxOrIdOf = (r?: ContractRecord) =>
        findValueByPredicate(r, templates, f => f.source === 'taxCode' || f.source === 'cccd');
      const hdntTaxId = taxOrIdOf(hdnt);
      const sowTaxId = taxOrIdOf(sow);
      const bbntTaxId = taxOrIdOf(bbnt);

      const bankOf = (r?: ContractRecord) => {
        if (!r) return '';
        const acc =
          r.values?.['token:[Số tài khoản]'] ||
          findValueByPredicate(r, templates, f => f.source === 'bankAccountNumber');
        const bank =
          r.values?.['token:[Tại Ngân hàng]'] ||
          findValueByPredicate(r, templates, f => f.source === 'bankName');
        return [acc, bank].filter(Boolean).join(' · ');
      };
      const hdntBank = bankOf(hdnt);
      const sowBank = bankOf(sow);
      const bbntBank = bankOf(bbnt);

      // Các chỉ số tài chính trên SOW & BBNT
      const sowItemsSum = sumFieldsByPredicate(
        sow,
        templates,
        f =>
          f.group === 'SCOPE' &&
          f.kind === 'money' &&
          (f.source === 'lineTotal' ||
            /phí dịch vụ|thành tiền/i.test(f.title || f.label || '')),
      );
      const sowNet = parseMoneyNum(
        findValueByPredicate(
          sow,
          templates,
          f => f.source === 'netTotal' || /chưa bao gồm thuế/i.test(f.title || f.label || ''),
        ),
      );
      const sowTax = parseMoneyNum(
        findValueByPredicate(
          sow,
          templates,
          f =>
            f.source === 'pitAmount' ||
            f.source === 'vatAmount' ||
            /thuế tncn.*trích nộp|^thuế vat/i.test(f.title || f.label || ''),
        ),
      );
      const sowGross = parseMoneyNum(
        findValueByPredicate(
          sow,
          templates,
          f =>
            f.source === 'grossTotal' ||
            /đã bao gồm thuế/i.test(f.title || f.label || ''),
        ),
      );
      const sowPaymentOpt = sow
        ? resolvePaymentScheduleOption(sow.values || {}, sow.templateId, getFieldsForTemplate(sow.templateId, templates))
        : 'ONE_TIME';
      const sowAdvance =
        sowPaymentOpt === 'TWO_TIMES'
          ? parseMoneyNum(
              findValueByPredicate(
                sow,
                templates,
                f => f.source === 'advanceAmount' || /tạm ứng lần 1/i.test(f.title || f.label || ''),
              ),
            )
          : 0;

      const bbntItemsSum = sumFieldsByPredicate(
        bbnt,
        templates,
        f =>
          f.group === 'SCOPE' &&
          f.kind === 'money' &&
          (f.source === 'lineTotal' ||
            /thành tiền|phí dịch vụ/i.test(f.title || f.label || '')),
      );
      const bbntNet = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f =>
            f.source === 'netTotal' ||
            /nghiệm thu chưa bao gồm thuế|^tổng giá trị nghiệm thu$/i.test(f.title || f.label || ''),
        ),
      );
      const bbntTax = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f =>
            f.source === 'pitAmount' ||
            f.source === 'vatAmount' ||
            /thuế tncn.*trích nộp|^thuế vat/i.test(f.title || f.label || ''),
        ),
      );
      const bbntGross = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f =>
            f.source === 'grossTotal' ||
            /đã bao gồm thuế/i.test(f.title || f.label || ''),
        ),
      );
      const bbntAdvance = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f => f.source === 'advanceAmount' || /đã tạm ứng/i.test(f.title || f.label || ''),
        ),
      );
      const bbntAdjust = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f => f.source === 'adjustmentAmount' || /phát sinh tăng\/giảm/i.test(f.title || f.label || ''),
        ),
      );
      const bbntRemaining = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f => f.source === 'remainingAmount' || /còn phải thanh toán/i.test(f.title || f.label || ''),
        ),
      );
      const bbntSettlementBase = parseMoneyNum(
        findValueByPredicate(
          bbnt,
          templates,
          f => /^tổng giá trị nghiệm thu$/i.test((f.title || f.label || '').trim()),
        ),
      ) || (tplId.startsWith('COM-') ? bbntGross : bbntNet);

      const checkConsistency = (vals: Array<string | undefined>): 'MATCHED' | 'MISMATCH' | 'PARTIAL' => {
        const present = vals.map(v => (v || '').trim()).filter(Boolean);
        if (present.length === 0) return 'PARTIAL';
        const unique = new Set(present.map(v => v.toLowerCase()));
        if (unique.size > 1) return 'MISMATCH';
        return present.length >= 2 ? 'MATCHED' : 'PARTIAL';
      };

      const crossChecks: CrossFileDependencyRow[] = [
        {
          id: 'cross-hdnt-date',
          category: 'IDENTITY',
          metricName: 'Ngày/Mã số HĐNT gốc (dd.mm.yy)',
          ruleDescription: 'Số hiệu HĐNT gốc phải khớp với dòng "Kèm theo HĐNT số..." trên SOW và "Căn cứ HĐNT số..." trên BBNT',
          hdntValue: hdntDocDate ? `${hdntDocDate}/HĐNT/UPBASE-${hdntKocToken}` : 'Chưa có HĐNT',
          sowValue: sowRefHdntDate ? `${sowRefHdntDate}/HĐNT/UPBASE-${sowKocToken}` : sow ? 'Chưa điền' : 'Chưa lập SOW',
          bbntValue: bbntRefHdntDate ? `${bbntRefHdntDate}/HĐNT/UPBASE-${bbntKocToken}` : bbnt ? 'Chưa điền' : 'Chưa lập BBNT',
          status: checkConsistency([
            hdnt ? hdntDocDate : undefined,
            sow ? sowRefHdntDate : undefined,
            bbnt ? bbntRefHdntDate : undefined,
          ]),
        },
        {
          id: 'cross-sow-date',
          category: 'IDENTITY',
          metricName: 'Ngày/Mã số Phụ lục SOW (dd.mm.yy)',
          ruleDescription: 'Số hiệu Phụ lục SOW phải khớp với dòng "Căn cứ Phụ lục SOW số..." tại đầu Biên bản nghiệm thu (BBNT)',
          hdntValue: '— (Ký theo từng SOW)',
          sowValue: sowDocDate ? `${sowDocDate}/SOW/UPBASE-${sowBrandToken}-${sowKocToken}` : sow ? 'Chưa điền' : 'Chưa lập SOW',
          bbntValue: bbntRefSowDate ? `${bbntRefSowDate}/SOW/UPBASE-${bbntBrandToken}-${bbntKocToken}` : bbnt ? 'Chưa điền' : 'Chưa lập BBNT',
          status:
            sow && bbnt
              ? sowDocDate && bbntRefSowDate && sowDocDate === bbntRefSowDate && sowBrandToken === bbntBrandToken
                ? 'MATCHED'
                : 'MISMATCH'
              : 'PARTIAL',
        },
        {
          id: 'cross-party-name',
          category: 'PARTY_BANK',
          metricName: 'Pháp nhân Bên B & CCCD / Mã số thuế',
          ruleDescription: 'Tên pháp nhân Bên B và số CCCD / MST phải thống nhất xuyên suốt từ HĐNT sang SOW và BBNT',
          hdntValue: hdnt ? `${hdntParty} (${hdntTaxId || '—'})` : 'Chưa có HĐNT',
          sowValue: sow ? `${sowParty} (${sowTaxId || '—'})` : 'Chưa lập SOW',
          bbntValue: bbnt ? `${bbntParty} (${bbntTaxId || '—'})` : 'Chưa lập BBNT',
          status: checkConsistency([
            hdnt ? hdntParty : undefined,
            sow ? sowParty : undefined,
            bbnt ? bbntParty : undefined,
          ]),
        },
        {
          id: 'cross-bank',
          category: 'PARTY_BANK',
          metricName: 'Số tài khoản & Ngân hàng thụ hưởng',
          ruleDescription: 'Thông tin tài khoản nhận thanh toán trên HĐNT, Phụ lục SOW và BBNT phải đồng nhất để Kế toán giải ngân',
          hdntValue: hdnt ? hdntBank || 'Chưa điền' : 'Chưa có HĐNT',
          sowValue: sow ? sowBank || 'Chưa điền' : 'Chưa lập SOW',
          bbntValue: bbnt ? bbntBank || 'Chưa điền' : 'Chưa lập BBNT',
          status: checkConsistency([
            hdnt ? hdntBank : undefined,
            sow ? sowBank : undefined,
            bbnt ? bbntBank : undefined,
          ]),
        },
        {
          id: 'cross-net-fee',
          category: 'SCOPE_TASKS',
          metricName: 'Tổng phí dịch vụ Net (4 nhóm hạng mục)',
          ruleDescription: 'Tổng giá trị chưa thuế trên Phụ lục SOW đối chiếu với Tổng giá trị nghiệm thu chưa thuế trên BBNT',
          hdntValue: 'Theo từng Phụ lục SOW',
          sowValue: sow ? `${formatNumber(sowNet)} đ` : 'Chưa lập SOW',
          bbntValue: bbnt ? `${formatNumber(bbntNet)} đ` : 'Chưa lập BBNT',
          status:
            sow && bbnt
              ? sowNet === bbntNet
                ? 'MATCHED'
                : 'MISMATCH'
              : 'PARTIAL',
          note:
            sow && bbnt && sowNet !== bbntNet
              ? `Chênh lệch ${formatNumber(Math.abs(sowNet - bbntNet))} đ giữa cam kết SOW và thực tế nghiệm thu BBNT`
              : undefined,
        },
        {
          id: 'cross-advance',
          category: 'FINANCIAL_TAX',
          metricName: 'Số tiền tạm ứng Lần 1 (Mục 1.3 SOW ↔ Điều 2 BBNT)',
          ruleDescription: 'Số tiền tạm ứng Lần 1 trên Phụ lục SOW phải khớp với mục "Giá trị đã tạm ứng/thanh toán" trên BBNT',
          hdntValue: hdnt
            ? resolvePaymentScheduleOption(hdnt.values || {}, hdnt.templateId) === 'BY_SOW'
              ? 'Thanh toán theo SOW'
              : 'Theo cấu hình HĐNT'
            : 'Chưa có HĐNT',
          sowValue: sow
            ? `${formatNumber(sowAdvance)} đ (${sowPaymentOpt === 'TWO_TIMES' ? 'Thanh toán 2 lần' : 'Thanh toán 1 lần'})`
            : 'Chưa lập SOW',
          bbntValue: bbnt ? `${formatNumber(bbntAdvance)} đ` : 'Chưa lập BBNT',
          status:
            sow && bbnt
              ? sowAdvance === bbntAdvance
                ? 'MATCHED'
                : 'MISMATCH'
              : 'PARTIAL',
        },
      ];

      // --- Kiểm tra công thức phụ thuộc TRONG TỪNG FILE ---
      const intraChecks: IntraFileDependencyRow[] = [];

      if (sow) {
        const savedJobs = parseSavedSowJobs(sow.values?.[SOW_JOBS_META_KEY]);
        const multiJobsNet = savedJobs
          ? savedJobs.reduce((acc, j) => {
              const vNet = (Number(j.videoFeeNetVnd) || 0) * Math.max(1, Number(j.quantity) || 1);
              const aNet = (j.addonItems || [])
                .filter(a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED')
                .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
              return acc + vNet + aNet;
            }, 0)
          : sowItemsSum;
        const effectiveSowItemsSum = savedJobs && savedJobs.length > 1 ? multiJobsNet : sowItemsSum;

        intraChecks.push({
          id: `intra-sow-sum-${sow.id}`,
          docStage: 'SOW',
          docTitle: sow.title,
          formulaName: 'Tổng thành tiền 4 nhóm hạng mục (Video + Thương mại + Ads + Hình ảnh) = Tổng giá trị chưa thuế (Net)',
          lhsLabel: 'Cộng thành tiền các hạng mục SOW',
          lhsValue: `${formatNumber(effectiveSowItemsSum)} đ`,
          rhsLabel: 'Tổng giá trị chưa thuế (Net)',
          rhsValue: `${formatNumber(sowNet)} đ`,
          status: effectiveSowItemsSum === sowNet ? 'VALID' : 'INVALID',
          detailNote:
            effectiveSowItemsSum === sowNet
              ? 'Tổng các hạng mục trong Bảng công việc khớp 100% với dòng Tổng giá trị chưa thuế'
              : `Lệch ${formatNumber(Math.abs(effectiveSowItemsSum - sowNet))} đ giữa các dòng hạng mục và dòng Tổng Net`,
        });

        if (!sow.templateId.startsWith('HKD-')) {
          const expectedGross = sowNet + sowTax;
          intraChecks.push({
            id: `intra-sow-tax-${sow.id}`,
            docStage: 'SOW',
            docTitle: sow.title,
            formulaName: sow.templateId.startsWith('COM-')
              ? 'Tổng chưa thuế (Net) + Thuế VAT = Tổng giá trị đã bao gồm VAT (Gross)'
              : 'Giá trị NET thực nhận + Thuế TNCN (10% Gross) = Tổng giá trị đã bao gồm thuế TNCN',
            lhsLabel: 'Net + Thuế',
            lhsValue: `${formatNumber(sowNet)} + ${formatNumber(sowTax)} = ${formatNumber(expectedGross)} đ`,
            rhsLabel: 'Tổng đã bao gồm thuế (Gross)',
            rhsValue: `${formatNumber(sowGross)} đ`,
            status: Math.abs(expectedGross - sowGross) <= 2 ? 'VALID' : 'INVALID',
            detailNote:
              Math.abs(expectedGross - sowGross) <= 2
                ? 'Công thức tính thuế BR-09 trong Phụ lục SOW chính xác'
                : `Tổng Gross (${formatNumber(sowGross)} đ) không khớp với Net + Thuế (${formatNumber(expectedGross)} đ)`,
          });
        }

        const rawSowAdvField = parseMoneyNum(
          findValueByPredicate(
            sow,
            templates,
            f => f.source === 'advanceAmount' || /tạm ứng lần 1/i.test(f.title || f.label || ''),
          ),
        );
        const paymentConsistent =
          sowPaymentOpt === 'TWO_TIMES' ? rawSowAdvField > 0 && rawSowAdvField <= (sowGross || sowNet) : true;
        intraChecks.push({
          id: `intra-sow-pay-${sow.id}`,
          docStage: 'SOW',
          docTitle: sow.title,
          formulaName: 'Ràng buộc lựa chọn Mục 1.3 (Thanh toán 1 lần vs Thanh toán 2 lần)',
          lhsLabel: 'Phương án Mục 1.3 đang chọn',
          lhsValue: sowPaymentOpt === 'TWO_TIMES' ? 'Phương án 2: Thanh toán 2 lần' : 'Phương án 1: Thanh toán 1 lần',
          rhsLabel: 'Số tiền tạm ứng Lần 1',
          rhsValue: `${formatNumber(sowAdvance)} đ`,
          status: paymentConsistent ? 'VALID' : 'INVALID',
          detailNote:
            sowPaymentOpt === 'TWO_TIMES'
              ? rawSowAdvField > 0
                ? 'Đã khai báo hợp lệ số tiền tạm ứng Lần 1 và thời hạn thanh toán 2 đợt'
                : 'Đang chọn Thanh toán 2 lần nhưng số tiền tạm ứng Lần 1 đang bằng 0đ'
              : 'Đang chọn Thanh toán 1 lần (100% sau nghiệm thu) — tự động ẩn dòng Thanh toán 2 lần',
        });
      }

      if (bbnt) {
        intraChecks.push({
          id: `intra-bbnt-sum-${bbnt.id}`,
          docStage: 'BBNT',
          docTitle: bbnt.title,
          formulaName: 'Tổng thành tiền 4 nhóm hạng mục nghiệm thu (Điều 1) = Tổng giá trị nghiệm thu chưa thuế',
          lhsLabel: 'Cộng 4 nhóm hạng mục Điều 1',
          lhsValue: `${formatNumber(bbntItemsSum)} đ`,
          rhsLabel: 'Tổng nghiệm thu chưa thuế',
          rhsValue: `${formatNumber(bbntNet)} đ`,
          status: bbntItemsSum === bbntNet ? 'VALID' : 'INVALID',
          detailNote:
            bbntItemsSum === bbntNet
              ? 'Tổng thành tiền 4 nhóm hạng mục tại Điều 1 khớp 100% với dòng Tổng nghiệm thu chưa thuế'
              : `Lệch ${formatNumber(Math.abs(bbntItemsSum - bbntNet))} đ giữa bảng hạng mục Điều 1 và dòng Tổng nghiệm thu`,
        });

        if (!bbnt.templateId.startsWith('HKD-')) {
          const expectedBbntGross = bbntNet + bbntTax;
          intraChecks.push({
            id: `intra-bbnt-tax-${bbnt.id}`,
            docStage: 'BBNT',
            docTitle: bbnt.title,
            formulaName: bbnt.templateId.startsWith('COM-')
              ? 'Tổng nghiệm thu chưa thuế + Thuế VAT = Tổng giá trị nghiệm thu đã bao gồm VAT'
              : 'Tổng nghiệm thu chưa thuế + Thuế TNCN (10%) = Tổng giá trị nghiệm thu đã bao gồm thuế TNCN',
            lhsLabel: 'Nghiệm thu Net + Thuế',
            lhsValue: `${formatNumber(bbntNet)} + ${formatNumber(bbntTax)} = ${formatNumber(expectedBbntGross)} đ`,
            rhsLabel: 'Tổng nghiệm thu gồm thuế',
            rhsValue: `${formatNumber(bbntGross)} đ`,
            status: Math.abs(expectedBbntGross - bbntGross) <= 2 ? 'VALID' : 'INVALID',
            detailNote:
              Math.abs(expectedBbntGross - bbntGross) <= 2
                ? 'Công thức thuế trên Biên bản nghiệm thu chính xác'
                : `Tổng gồm thuế (${formatNumber(bbntGross)} đ) lệch so với Net + Thuế (${formatNumber(expectedBbntGross)} đ)`,
          });
        }

        const expectedRemaining = Math.max(0, bbntSettlementBase - bbntAdvance + bbntAdjust);
        intraChecks.push({
          id: `intra-bbnt-settle-${bbnt.id}`,
          docStage: 'BBNT',
          docTitle: bbnt.title,
          formulaName: 'Quyết toán Điều 2: Tổng nghiệm thu - Đã tạm ứng + Phát sinh tăng/giảm = Giá trị còn phải thanh toán',
          lhsLabel: 'Tổng nghiệm thu - Tạm ứng + Phát sinh',
          lhsValue: `${formatNumber(bbntSettlementBase)} - ${formatNumber(bbntAdvance)} + ${formatNumber(bbntAdjust)} = ${formatNumber(expectedRemaining)} đ`,
          rhsLabel: 'Giá trị Bên A còn phải thanh toán',
          rhsValue: `${formatNumber(bbntRemaining)} đ`,
          status: Math.abs(expectedRemaining - bbntRemaining) <= 2 ? 'VALID' : 'INVALID',
          detailNote:
            Math.abs(expectedRemaining - bbntRemaining) <= 2
              ? 'Bảng quyết toán Điều 2 trên BBNT cân đối chính xác'
              : `Số tiền còn phải thanh toán (${formatNumber(bbntRemaining)} đ) lệch so với công thức quyết toán (${formatNumber(expectedRemaining)} đ)`,
        });
      }

      const crossMismatches = crossChecks.filter(c => c.status === 'MISMATCH').length;
      const intraMismatches = intraChecks.filter(c => c.status === 'INVALID').length;
      const mismatchCount = crossMismatches + intraMismatches;
      const stageCount = [hdnt, sow, bbnt].filter(Boolean).length;

      return {
        setKey: grp.setKey,
        kocId: koc?.id || anyRec.kocId,
        kocName: koc?.stageName || anyRec.partner,
        kocChannel: koc?.channelId || deal?.kocChannelId || '',
        brandName: sow?.brand || bbnt?.brand || deal?.brandName || hdnt?.brand || 'UPBASE',
        dealId: deal?.id || sow?.dealId || bbnt?.dealId,
        dealCode: deal?.dealCode || sow?.dealCode || bbnt?.dealCode || 'HĐ khung',
        subjectLabel,
        hdnt,
        sow,
        bbnt,
        deal,
        koc,
        crossChecks,
        intraChecks,
        hasMismatch: mismatchCount > 0,
        mismatchCount,
        stageCount,
      };
    });
  }, [data.records, data.templates, deals, kocs]);

  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contractSets.filter(s => {
      if (q) {
        const hay = `${s.kocName} ${s.kocChannel} ${s.brandName} ${s.dealCode} ${s.hdnt?.title || ''} ${s.sow?.title || ''} ${s.bbnt?.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === 'MISMATCH') return s.hasMismatch;
      if (statusFilter === 'INCOMPLETE') return s.stageCount < 3;
      if (statusFilter === 'COMPLETE') return s.stageCount === 3 && !s.hasMismatch;
      return true;
    });
  }, [contractSets, search, statusFilter]);

  const activeSet = useMemo(
    () => filteredSets.find(s => s.setKey === selectedSetKey) || filteredSets[0] || contractSets[0],
    [filteredSets, selectedSetKey, contractSets],
  );

  const handleSyncEntireSet = async (targetSet: LinkedContractSet) => {
    const templates = data.templates || [];
    const { hdnt, sow, bbnt, deal, koc } = targetSet;
    const activeProfile = resolveActiveLegalProfile(koc, deal);

    // 1. Đồng bộ SOW từ HĐNT gốc + Deal/Job
    let updatedSowValues: Record<string, string> | undefined;
    if (sow) {
      const sowFields = getFieldsForTemplate(sow.templateId, templates);
      const hdntFields = hdnt ? getFieldsForTemplate(hdnt.templateId, templates) : [];
      const prefilledSow = prefill(sowFields, { ...sow.values }, {
        koc,
        deal,
        brand: sow.brand,
        existingRecords: data.records,
        parentRecord: hdnt,
        parentFields: hdntFields,
        legalProfileId: activeProfile?.id,
      });
      const bd = buildJobAcceptanceBreakdown(deal, koc, hdnt);
      const nextSowVals = syncValuesFromJobAcceptanceBreakdown(sowFields, prefilledSow.values, bd);
      if (hdnt?.values?.['token:[dd.mm.yy]']) {
        nextSowVals['token:[Ngày HĐNT]'] = hdnt.values['token:[dd.mm.yy]'];
      }
      if (hdnt?.values?.['token:[ID KOC]']) {
        nextSowVals['token:[ID KOC]'] = hdnt.values['token:[ID KOC]'];
      }
      updatedSowValues = nextSowVals;
      await onSyncRecordValues(sow, nextSowVals);
    }

    // 2. Đồng bộ BBNT từ SOW (hoặc HĐNT) + Deal/Job
    if (bbnt) {
      const bbntFields = getFieldsForTemplate(bbnt.templateId, templates);
      const effectiveSowRecord: ContractRecord | undefined = sow
        ? { ...sow, values: updatedSowValues || sow.values }
        : hdnt;
      const parentFields = effectiveSowRecord
        ? getFieldsForTemplate(effectiveSowRecord.templateId, templates)
        : [];
      const prefilledBbnt = prefill(bbntFields, { ...bbnt.values }, {
        koc,
        deal,
        brand: bbnt.brand,
        existingRecords: data.records,
        parentRecord: effectiveSowRecord,
        parentFields,
        legalProfileId: activeProfile?.id,
      });
      const sowAdvNum = sow
        ? parseMoneyNum(
            findValueByPredicate(
              { ...sow, values: updatedSowValues || sow.values },
              templates,
              f => f.source === 'advanceAmount' || /tạm ứng lần 1/i.test(f.title || f.label || ''),
            ),
          )
        : undefined;
      const sowOpt = sow
        ? resolvePaymentScheduleOption(
            updatedSowValues || sow.values || {},
            sow.templateId,
            getFieldsForTemplate(sow.templateId, templates),
          )
        : 'ONE_TIME';
      const effectiveAdv = sowOpt === 'TWO_TIMES' ? sowAdvNum : 0;
      const bd = buildJobAcceptanceBreakdown(deal, koc, effectiveSowRecord, undefined, undefined, effectiveAdv);
      const nextBbntVals = syncValuesFromJobAcceptanceBreakdown(bbntFields, prefilledBbnt.values, bd);
      const masterDate =
        hdnt?.values?.['token:[dd.mm.yy]'] ||
        updatedSowValues?.['token:[Ngày HĐNT]'] ||
        sow?.values?.['token:[Ngày HĐNT]'];
      if (masterDate) {
        nextBbntVals['token:[Ngày HĐNT]'] = masterDate;
      }
      const sowDate = updatedSowValues?.['token:[dd.mm.yy]'] || sow?.values?.['token:[dd.mm.yy]'];
      if (sowDate) {
        nextBbntVals['token:[Ngày SOW]'] = sowDate;
      }
      const sharedKocToken =
        updatedSowValues?.['token:[ID KOC]'] ||
        sow?.values?.['token:[ID KOC]'] ||
        hdnt?.values?.['token:[ID KOC]'];
      if (sharedKocToken) {
        nextBbntVals['token:[ID KOC]'] = sharedKocToken;
      }
      const sharedBrandToken =
        updatedSowValues?.['token:[BRAND]'] || sow?.values?.['token:[BRAND]'];
      if (sharedBrandToken) {
        nextBbntVals['token:[BRAND]'] = sharedBrandToken;
      }
      nextBbntVals[PAYMENT_SCHEDULE_META_KEY] = sowOpt;
      await onSyncRecordValues(bbnt, nextBbntVals);
    }
  };

  const setColumns: Column<LinkedContractSet>[] = [
    {
      key: 'koc',
      header: 'Đối tác KOC · Deal / Nhãn hàng',
      width: 210,
      render: s => (
        <div className="space-y-0.5 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-ink">{s.kocName}</span>
            <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2">
              {s.subjectLabel}
            </span>
          </div>
          <div className="text-2xs text-ink-3 font-code">
            {s.brandName} · {s.dealCode}
          </div>
        </div>
      ),
    },
    {
      key: 'hdnt',
      header: '1. Hợp đồng nguyên tắc (HĐNT)',
      width: 195,
      render: s => {
        if (!s.hdnt) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onCreateStageDoc({
                  dealId: s.dealId,
                  kocId: s.kocId,
                  legalProfileId: s.hdnt?.legalProfileId || s.sow?.legalProfileId || s.deal?.legalProfileId,
                  kind: 'CONTRACT',
                  docStage: 'HDNT',
                });
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line-strong text-2xs text-accent hover:bg-sunken"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              + Lập HĐNT gốc
            </button>
          );
        }
        const st = contractStatus(s.hdnt);
        const code = s.hdnt.values?.['token:[dd.mm.yy]']
          ? `${s.hdnt.values['token:[dd.mm.yy]']}/HĐNT/UPBASE-${s.hdnt.values['token:[ID KOC]'] || 'KOC'}`
          : s.hdnt.title;
        return (
          <div className="space-y-1 leading-tight">
            <div className="font-code text-2xs font-semibold text-ink truncate max-w-[185px]" title={code}>
              {code}
            </div>
            <div className="flex items-center gap-1.5">
              <Status tone={st.tone}>{st.label}</Status>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onQuickViewRecord(s.hdnt!);
                }}
                className="text-2xs text-accent hover:underline"
              >
                Xem A4
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'sow',
      header: '2. Phụ lục công việc (SOW)',
      width: 210,
      render: s => {
        if (!s.sow) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onCreateStageDoc({
                  dealId: s.dealId,
                  kocId: s.kocId,
                  legalProfileId: s.hdnt?.legalProfileId || s.deal?.legalProfileId,
                  kind: 'CONTRACT',
                  docStage: 'SOW',
                  parentId: s.hdnt?.id,
                  templateId: s.hdnt?.templateId ? s.hdnt.templateId.replace(/-HDNT$/, '-SOW') : undefined,
                });
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line-strong text-2xs text-accent hover:bg-sunken"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              + Lập Phụ lục SOW
            </button>
          );
        }
        const st = contractStatus(s.sow);
        const code = s.sow.values?.['token:[dd.mm.yy]']
          ? `${s.sow.values['token:[dd.mm.yy]']}/SOW/UPBASE-${s.sow.values['token:[BRAND]'] || s.brandName}-${s.sow.values['token:[ID KOC]'] || 'KOC'}`
          : s.sow.title;
        const payOpt = resolvePaymentScheduleOption(s.sow.values || {}, s.sow.templateId);
        return (
          <div className="space-y-1 leading-tight">
            <div className="font-code text-2xs font-semibold text-ink truncate max-w-[200px]" title={code}>
              {code}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Status tone={st.tone}>{st.label}</Status>
              <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2">
                {payOpt === 'TWO_TIMES' ? 'TT 2 lần' : 'TT 1 lần'}
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onQuickViewRecord(s.sow!);
                }}
                className="text-2xs text-accent hover:underline"
              >
                Xem A4
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'bbnt',
      header: '3. Biên bản nghiệm thu (BBNT)',
      width: 205,
      render: s => {
        if (!s.bbnt) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onCreateStageDoc({
                  dealId: s.dealId,
                  kocId: s.kocId,
                  legalProfileId: s.sow?.legalProfileId || s.hdnt?.legalProfileId || s.deal?.legalProfileId,
                  kind: 'ACCEPTANCE',
                  docStage: 'BBNT',
                  parentId: s.sow?.id || s.hdnt?.id,
                });
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line-strong text-2xs text-accent hover:bg-sunken"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              + Lập BBNT
            </button>
          );
        }
        const st = contractStatus(s.bbnt);
        const code = s.bbnt.values?.['token:[dd.mm.yy]']
          ? `${s.bbnt.values['token:[dd.mm.yy]']}/BBNT/UPBASE-${s.bbnt.values['token:[BRAND]'] || s.brandName}-${s.bbnt.values['token:[ID KOC]'] || 'KOC'}`
          : s.bbnt.title;
        return (
          <div className="space-y-1 leading-tight">
            <div className="font-code text-2xs font-semibold text-ink truncate max-w-[195px]" title={code}>
              {code}
            </div>
            <div className="flex items-center gap-1.5">
              <Status tone={st.tone}>{st.label}</Status>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onQuickViewRecord(s.bbnt!);
                }}
                className="text-2xs text-accent hover:underline"
              >
                Xem A4
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reconcile',
      header: 'Đối soát chỉ số phụ thuộc',
      width: 175,
      render: s => (
        <div className="space-y-1 leading-tight">
          {s.hasMismatch ? (
            <Status tone="critical">{s.mismatchCount} chỉ số lệch</Status>
          ) : (
            <Status tone="positive">Khớp 100% chỉ số</Status>
          )}
          <div className="text-2xs text-ink-3">
            Đã lập {s.stageCount}/3 văn bản ({s.crossChecks.length} liên kết · {s.intraChecks.length} công thức)
          </div>
        </div>
      ),
    },
  ];

  const totalSets = contractSets.length;
  const matchedSetsCount = contractSets.filter(s => !s.hasMismatch).length;
  const mismatchSetsCount = contractSets.filter(s => s.hasMismatch).length;
  const full3StageCount = contractSets.filter(s => s.stageCount === 3).length;

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat
          label="Tổng số Bộ hồ sơ (HĐNT ↔ SOW ↔ BBNT)"
          value={`${totalSets} bộ`}
          note={`${full3StageCount} bộ đã khép kín đủ 3 giai đoạn`}
        />
        <Stat
          label="Khớp 100% chỉ số phụ thuộc"
          value={`${matchedSetsCount}/${totalSets} bộ`}
          tone="positive"
          note="Đồng bộ số hiệu, pháp nhân, ngân hàng, thuế & quyết toán"
        />
        <Stat
          label="Cảnh báo lệch chỉ số cần đồng bộ"
          value={`${mismatchSetsCount} bộ`}
          tone={mismatchSetsCount > 0 ? 'critical' : 'positive'}
          note={
            mismatchSetsCount > 0
              ? 'Có chỉ số lệch giữa HĐNT/SOW/BBNT hoặc công thức trong file'
              : 'Không có sai lệch số liệu giữa các văn bản'
          }
        />
        <Stat
          label="Ràng buộc kiểm tra tự động"
          value="12 quy tắc"
          note="6 liên kết xuyên văn bản + 6 công thức nội tại trong từng file"
        />
      </StatRow>

      <Panel title="Bộ hồ sơ pháp lý liên kết">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Tìm theo tên KOC, mã Deal, nhãn hàng, số hiệu HĐNT / SOW / BBNT...',
              }}
            />
            <Segmented
              value={statusFilter}
              onChange={v => setStatusFilter(v as typeof statusFilter)}
              items={[
                { key: 'ALL', label: `Tất cả bộ (${contractSets.length})` },
                { key: 'MISMATCH', label: `Lệch chỉ số (${mismatchSetsCount})` },
                { key: 'INCOMPLETE', label: `Chưa đủ 3 file (${contractSets.filter(s => s.stageCount < 3).length})` },
                { key: 'COMPLETE', label: `Hoàn chỉnh (${contractSets.filter(s => s.stageCount === 3 && !s.hasMismatch).length})` },
              ]}
            />
          </div>

          <DataTable
            columns={setColumns}
            rows={filteredSets}
            rowKey={s => s.setKey}
            onRowClick={s => setSelectedSetKey(s.setKey)}
            empty={<EmptyState title="Chưa có bộ hồ sơ liên kết nào" />}
          />
        </div>
      </Panel>

      {activeSet && (
        <Panel
          title={`Ma trận đối soát chỉ số phụ thuộc: ${activeSet.kocName} · ${activeSet.brandName} (${activeSet.dealCode})`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={activeCheckTab}
                onChange={v => setActiveCheckTab(v as 'CROSS_FILE' | 'INTRA_FILE')}
                items={[
                  {
                    key: 'CROSS_FILE',
                    label: `Giữa các file HĐNT ↔ SOW ↔ BBNT (${activeSet.crossChecks.length})`,
                  },
                  {
                    key: 'INTRA_FILE',
                    label: `Trong từng file: Công thức & Ràng buộc (${activeSet.intraChecks.length})`,
                  },
                ]}
              />
              {(activeSet.sow || activeSet.bbnt) && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={RefreshCw}
                  disabled={busy}
                  onClick={() => {
                    void handleSyncEntireSet(activeSet);
                  }}
                >
                  Đồng bộ &amp; Chuẩn hóa chỉ số cả Bộ
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Thanh luồng 3 văn bản trong bộ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  stage: 'HDNT' as ContractDocStage,
                  stepLabel: 'Văn bản #1 · Hợp đồng khung',
                  name: 'Hợp đồng nguyên tắc (HĐNT)',
                  rec: activeSet.hdnt,
                  desc: 'Quy định pháp nhân Bên B, tài khoản ngân hàng & nguyên tắc hợp tác chung',
                },
                {
                  stage: 'SOW' as ContractDocStage,
                  stepLabel: 'Văn bản #2 · Phụ lục theo Deal',
                  name: 'Phụ lục công việc (SOW)',
                  rec: activeSet.sow,
                  desc: 'Kế thừa số HĐNT gốc; chốt 4 nhóm hạng mục, thuế, Mục 1.3 (TT 1 lần / 2 lần)',
                },
                {
                  stage: 'BBNT' as ContractDocStage,
                  stepLabel: 'Văn bản #3 · Nghiệm thu & Thanh toán',
                  name: 'Biên bản nghiệm thu (BBNT)',
                  rec: activeSet.bbnt,
                  desc: 'Kế thừa HĐNT + SOW; đối soát Link Air, trừ tạm ứng Lần 1 & chốt số còn trả',
                },
              ].map(card => (
                <div
                  key={card.stage}
                  className="p-3 rounded-xl border border-line bg-sunken/35 flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs font-semibold text-ink-3">{card.stepLabel}</span>
                      {card.rec ? (
                        <Status tone={contractStatus(card.rec).tone}>{contractStatus(card.rec).label}</Status>
                      ) : (
                        <Status tone="warning">Chưa tạo</Status>
                      )}
                    </div>
                    <div className="font-semibold text-ink">{card.name}</div>
                    <div className="text-2xs text-ink-2">{card.desc}</div>
                  </div>

                  {card.rec ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/70">
                      <span className="font-code text-2xs text-ink-2 truncate max-w-[180px]">
                        {card.rec.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" icon={Eye} onClick={() => onQuickViewRecord(card.rec!)}>
                          Xem A4
                        </Button>
                        <Button size="sm" variant="secondary" icon={FileText} onClick={() => onOpenRecord(card.rec!.id)}>
                          Chi tiết
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-line/70 flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={FilePlus2}
                        onClick={() =>
                          onCreateStageDoc({
                            dealId: activeSet.dealId,
                            kocId: activeSet.kocId,
                            legalProfileId:
                              activeSet.sow?.legalProfileId ||
                              activeSet.hdnt?.legalProfileId ||
                              activeSet.deal?.legalProfileId,
                            kind: card.stage === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT',
                            docStage: card.stage,
                            parentId:
                              card.stage === 'SOW'
                                ? activeSet.hdnt?.id
                                : card.stage === 'BBNT'
                                  ? activeSet.sow?.id || activeSet.hdnt?.id
                                  : undefined,
                            templateId:
                              card.stage === 'SOW' && activeSet.hdnt?.templateId
                                ? activeSet.hdnt.templateId.replace(/-HDNT$/, '-SOW')
                                : undefined,
                          })
                        }
                      >
                        Khởi tạo {card.stage}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeCheckTab === 'CROSS_FILE' ? (
              <DataTable<CrossFileDependencyRow>
                rowKey={r => r.id}
                rows={activeSet.crossChecks}
                columns={[
                  {
                    key: 'metricName',
                    header: 'Chỉ số phụ thuộc giữa các file',
                    width: 240,
                    render: row => (
                      <div className="space-y-0.5 leading-tight">
                        <div className="font-semibold text-ink">{row.metricName}</div>
                        <div className="text-2xs text-ink-3">{row.ruleDescription}</div>
                        {row.note && (
                          <div className="text-2xs text-critical font-medium mt-0.5">{row.note}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'hdntValue',
                    header: '1. Trên HĐNT Khung',
                    width: 190,
                    render: row => <span className="font-code text-xs text-ink">{row.hdntValue}</span>,
                  },
                  {
                    key: 'sowValue',
                    header: '2. Trên Phụ lục SOW',
                    width: 200,
                    render: row => <span className="font-code text-xs text-ink">{row.sowValue}</span>,
                  },
                  {
                    key: 'bbntValue',
                    header: '3. Trên Biên bản BBNT',
                    width: 200,
                    render: row => <span className="font-code text-xs text-ink">{row.bbntValue}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Trạng thái đối soát',
                    width: 150,
                    align: 'right',
                    render: row =>
                      row.status === 'MATCHED' ? (
                        <Status tone="positive">Khớp liên văn bản</Status>
                      ) : row.status === 'MISMATCH' ? (
                        <Status tone="critical">Lệch số liệu</Status>
                      ) : (
                        <Status tone="neutral">Chờ đủ văn bản</Status>
                      ),
                  },
                ]}
              />
            ) : (
              <DataTable<IntraFileDependencyRow>
                rowKey={r => r.id}
                rows={activeSet.intraChecks}
                columns={[
                  {
                    key: 'docStage',
                    header: 'Văn bản',
                    width: 135,
                    render: row => (
                      <div className="space-y-1 leading-tight">
                        <span className="px-2 py-0.5 rounded border border-line bg-sunken font-code text-2xs font-semibold text-ink">
                          {row.docStage}
                        </span>
                        <div className="text-2xs text-ink-3 truncate max-w-[130px]">{row.docTitle}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'formulaName',
                    header: 'Quy tắc / Công thức phụ thuộc trong file',
                    width: 270,
                    render: row => (
                      <div className="space-y-0.5 leading-tight">
                        <div className="font-semibold text-ink">{row.formulaName}</div>
                        <div className="text-2xs text-ink-3">{row.detailNote}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'lhs',
                    header: 'Vế trái (Thành phần)',
                    width: 210,
                    render: row => (
                      <div className="space-y-0.5 leading-tight">
                        <div className="text-2xs text-ink-3">{row.lhsLabel}</div>
                        <div className="font-code font-semibold text-ink">{row.lhsValue}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'rhs',
                    header: 'Vế phải (Chỉ số đích)',
                    width: 190,
                    render: row => (
                      <div className="space-y-0.5 leading-tight">
                        <div className="text-2xs text-ink-3">{row.rhsLabel}</div>
                        <div className="font-code font-semibold text-ink">{row.rhsValue}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Kết quả kiểm tra',
                    width: 145,
                    align: 'right',
                    render: row =>
                      row.status === 'VALID' ? (
                        <Status tone="positive">Đúng công thức</Status>
                      ) : (
                        <Status tone="critical">Lệch công thức</Status>
                      ),
                  },
                ]}
              />
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
