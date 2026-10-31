import JSZip from 'jszip';
import { assertCanSign, canRead, createContract, decideContract, editContract, event, requireCondition, submitContract } from '../../lib/contracts/domain';
import type { AcceptanceScreenshotItem, ContractActor, ContractRecord, DocBlock, LegalTemplate, ReviewStep } from '../../lib/contracts/types';
import type { ContractBootstrap } from './api';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import {
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  enrichTemplateWithSignFlow,
} from '../../lib/contracts/contractSystemRules';
import { isTwoTimePaymentField, resolvePaymentScheduleOption } from '../../lib/contracts/contractRules';

// Kho thử riêng trên trình duyệt; đồng bộ 100% bộ biểu mẫu chuẩn từ Quản lý hợp đồng
const KEY = 'b2c-contract-browser-demo-v1';
const actors: ContractActor[] = [
  { id: 'demo-owner', name: 'Người tạo (kiểm thử)', roles: ['CREATOR'], brands: ['Kutieskin', 'Royal Ausnz', 'Bye Bye Blemish', 'ClubClio', 'Cathy Doll', 'Rejuran'], allBrands: true },
  { id: 'demo-legal', name: 'Nguyễn Thị Liên (Pháp chế)', roles: ['LEGAL'], brands: [], allBrands: true },
  { id: 'demo-finance', name: 'Lê Thị Thu Hà (Kế toán B2C)', roles: ['FINANCE'], brands: [], allBrands: true },
  { id: 'demo-lead', name: 'Đặng Thị Yến Nhi (Giám đốc Marketing B2C)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'demo-sign', name: 'Điều phối ký (kiểm thử)', roles: ['SIGN_COORDINATOR'], brands: [], allBrands: true },
];

const ACTOR_ALIASES: Record<string, string> = {
  'contract-demo-owner': 'demo-owner',
  'contract-demo-legal': 'demo-legal',
  'contract-demo-finance': 'demo-finance',
  'contract-demo-sign': 'demo-sign',
  'user-ngoc-tam': 'demo-lead',
  'user-yen-nhi': 'demo-lead',
  'user-admin-giang': 'demo-lead',
};

function normalizeActorId(rawId?: unknown): string | undefined {
  if (typeof rawId !== 'string' || !rawId.trim()) return undefined;
  const trimmed = rawId.trim();
  return ACTOR_ALIASES[trimmed] || trimmed;
}

// Nạp toàn bộ biểu mẫu chính thức từ bản chụp snapshot của Quản lý hợp đồng
const templates: LegalTemplate[] = Object.values(OFFICIAL_TEMPLATES_SNAPSHOT).map(enrichTemplateWithSignFlow);

interface DemoState { actorId: string; records: ContractRecord[] }

function createInitialDemoRecords(): ContractRecord[] {
  const indTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-HD'];
  const sowTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-SOW'] || indTpl;
  const bbntTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-VID-BBNT'] || indTpl;
  if (!indTpl) return [];

  const now = new Date().toISOString();
  const sampleValues: Record<string, string> = {
    'token:[dd.mm.yy]': '20.05.26',
    'token:[ID KOC]': 'chanhbeauty',
    'word/document.xml:p16:14': '20',
    'word/document.xml:p16:22': '05',
    'word/document.xml:p16:31': '6',
    'word/document.xml:p36:cell': 'Đặng Mai Phương (Chanh Beauty)',
    'word/document.xml:p39:cell': '001198012345 cấp ngày 15/04/2021 tại Cục CSQLHC về TTXH',
    'word/document.xml:p42:cell': 'Số 12 ngõ 45 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
    'word/document.xml:p45:cell': '0988123456',
    'word/document.xml:p48:cell': 'chanhbeauty.booking@gmail.com',
    'word/document.xml:p158:109': 'Kem dưỡng ẩm Kutieskin Organic',
    'word/document.xml:p162:30': 'Kem dưỡng ẩm Kutieskin Organic',
    'word/document.xml:p163:35': '30',
    'word/document.xml:p166:cell': '10.000.000',
    'word/document.xml:p167:cell': '1',
    'word/document.xml:p168:cell': '10.000.000',
    'word/document.xml:p186:cell': '9.000.000',
    'word/document.xml:p188:cell': '1.000.000',
    'word/document.xml:p190:cell': '10.000.000',
    'word/document.xml:p208:14': '5.000.000',
    'word/document.xml:p208:27': '05',
    'word/document.xml:p209:44': '05',
    'src:bankAccount': '19036789123456',
    'src:bankName': 'Techcombank - CN Cầu Giấy',
    'src:taxCode': '8451239876',
    'src:cccd': '001198012345',
    'src:phone': '0988123456',
    'src:netAmount': '9000000',
    'src:grossAmount': '10000000',
    'src:pitTax': '1000000',
  };

  const gdocsValues: Record<string, string> = {
    ...sampleValues,
    'token:[ID KOC]': 'halinhofficial',
    'word/document.xml:p36:cell': 'Võ Hà Linh (Hà Linh Official)',
    'word/document.xml:p48:cell': 'halinh.booking@upbase.vn',
    'word/document.xml:p166:cell': '55.000.000',
    'word/document.xml:p168:cell': '55.000.000',
    'word/document.xml:p186:cell': '49.500.000',
    'word/document.xml:p188:cell': '5.500.000',
    'word/document.xml:p190:cell': '55.000.000',
    'src:bankAccount': '00710099887766',
    'src:bankName': 'Vietcombank - CN TP.HCM',
    'src:taxCode': '8765432109',
    'src:cccd': '040190005678',
    'src:phone': '0912345678',
    'src:netAmount': '49500000',
    'src:grossAmount': '55000000',
    'src:pitTax': '5500000',
  };

  return [
    {
      id: 'CTR-DEMO-2026-001',
      title: 'Hợp đồng video · Chanh Beauty · Kutieskin',
      brand: 'Kutieskin',
      partner: 'Đặng Mai Phương (Chanh Beauty)',
      templateId: 'IND-HD',
      templateHash: indTpl.hash,
      dealCode: 'BO260757625',
      kocId: 'koc-1',
      ownerId: 'demo-owner',
      ownerName: 'Người tạo (kiểm thử)',
      version: 1,
      revision: 1,
      approval: 'IN_REVIEW',
      legalAttachments: [
        {
          id: 'ldoc-demo-1a',
          docType: 'CCCD_FRONT',
          label: 'CCCD mặt trước',
          fileKey: 'legal-docs/demo-chanh-beauty/2026-10/00000001-cccd-mat-truoc.svg',
          fileName: 'cccd-mat-truoc-dang-mai-phuong.svg',
          fileSize: 184320,
          mimeType: 'image/svg+xml',
          storage: 'R2',
          url: '/api/contracts/legal-docs?key=legal-docs%2Fdemo-chanh-beauty%2F2026-10%2F00000001-cccd-mat-truoc.svg',
          uploadedAt: now,
          uploadedBy: 'Chuyên viên B2C',
        },
        {
          id: 'ldoc-demo-1b',
          docType: 'CCCD_BACK',
          label: 'CCCD mặt sau',
          fileKey: 'legal-docs/demo-chanh-beauty/2026-10/00000002-cccd-mat-sau.svg',
          fileName: 'cccd-mat-sau-dang-mai-phuong.svg',
          fileSize: 176120,
          mimeType: 'image/svg+xml',
          storage: 'R2',
          url: '/api/contracts/legal-docs?key=legal-docs%2Fdemo-chanh-beauty%2F2026-10%2F00000002-cccd-mat-sau.svg',
          uploadedAt: now,
          uploadedBy: 'Chuyên viên B2C',
        },
      ],
      steps: [
        { role: 'FINANCE', reviewerId: 'demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Chờ kế toán soát xét ngân sách Net & khấu trừ thuế TNCN 10%' },
      ],
      values: sampleValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'CREATE', note: 'Soạn thảo hợp đồng từ booking BO260757625', version: 1 },
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'SUBMIT', note: 'Mẫu chuẩn: Miễn duyệt Pháp chế', version: 1 },
      ],
    },
    {
      id: 'CTR-DEMO-2026-002',
      title: 'Phụ lục SOW sửa đổi điều khoản · Võ Hà Linh · ClubClio',
      brand: 'ClubClio',
      partner: 'Võ Hà Linh (Hà Linh Official)',
      templateId: sowTpl.id,
      templateHash: sowTpl.hash,
      dealCode: 'BO260889102',
      kocId: 'koc-2',
      ownerId: 'demo-owner',
      ownerName: 'Người tạo (kiểm thử)',
      version: 1,
      revision: 1,
      approval: 'IN_REVIEW',
      hasCustomTerms: true,
      customTermsSummary: 'Điều 2: Tạm ứng 70% ngay sau khi ký SOW; Điều 3: Giới hạn quyền chạy Spark Ads trong 45 ngày.',
      googleDocsUrl: 'https://docs.google.com/document/d/1UpbaseClubClioHaLinhSow2026/edit',
      googleDocsId: '1UpbaseClubClioHaLinhSow2026',
      googleDocsSource: 'TEMPLATE_AMENDED',
      legalAttachments: [
        {
          id: 'ldoc-demo-2a',
          docType: 'DKKD',
          label: 'Giấy phép ĐKKD / Hộ kinh doanh',
          fileKey: 'legal-docs/demo-ha-linh/2026-10/00000003-giay-phep-dkkd.svg',
          fileName: 'giay-phep-dkkd-ha-linh-official.svg',
          fileSize: 245760,
          mimeType: 'image/svg+xml',
          storage: 'R2',
          url: '/api/contracts/legal-docs?key=legal-docs%2Fdemo-ha-linh%2F2026-10%2F00000003-giay-phep-dkkd.svg',
          uploadedAt: now,
          uploadedBy: 'Chuyên viên B2C',
        },
        {
          id: 'ldoc-demo-2b',
          docType: 'CCCD_FRONT',
          label: 'CCCD mặt trước',
          fileKey: 'legal-docs/demo-ha-linh/2026-10/00000001-cccd-mat-truoc.svg',
          fileName: 'cccd-mat-truoc-vo-ha-linh.svg',
          fileSize: 184320,
          mimeType: 'image/svg+xml',
          storage: 'R2',
          url: '/api/contracts/legal-docs?key=legal-docs%2Fdemo-ha-linh%2F2026-10%2F00000001-cccd-mat-truoc.svg',
          uploadedAt: now,
          uploadedBy: 'Chuyên viên B2C',
        },
      ],
      googleDocsReviewRouting: {
        requiresLegal: true,
        requiresFinance: true,
        legalClauses: ['Điều 3', 'Điều 5'],
        financeClauses: ['Điều 2'],
        summary: 'Phát hiện 3 điều khoản có sửa đổi/bổ sung (1 điều khoản liên quan Kế toán, 2 điều khoản liên quan Pháp chế).',
        analyzedAt: now,
        clauseDiffs: [
          {
            clauseNumber: 'Điều 2',
            title: 'Giá trị Phụ lục và Tiến độ thanh toán',
            changeType: 'MODIFIED',
            targetRole: 'FINANCE',
            originalText: 'Bên A tạm ứng 50% sau khi ký hợp đồng và thanh toán 50% còn lại trong vòng 07 ngày làm việc sau nghiệm thu.',
            modifiedText: 'Bên A tạm ứng 70% ngay sau khi ký Phụ lục SOW và thanh toán 30% còn lại trong vòng 03 ngày làm việc sau khi nghiệm thu.',
            explanation: 'Thay đổi tỷ lệ tạm ứng từ 50% lên 70% và rút ngắn hạn thanh toán còn 03 ngày. Phân luồng thẩm định: Kế toán (TCKT).',
          },
          {
            clauseNumber: 'Điều 3',
            title: 'Quyền sử dụng hình ảnh & Quảng cáo Spark Ads',
            changeType: 'MODIFIED',
            targetRole: 'LEGAL',
            originalText: 'Bên A được quyền sử dụng hình ảnh và video của Bên B để chạy quảng cáo trong vòng 90 ngày kể từ ngày đăng tải.',
            modifiedText: 'Bên A chỉ được phép chạy Spark Ads trong thời hạn tối đa 45 ngày; quá hạn phải gỡ mã quảng cáo hoặc ký phụ lục gia hạn.',
            explanation: 'Giới hạn thời hạn sử dụng hình ảnh KOC xuống 45 ngày. Phân luồng thẩm định: Pháp chế.',
          },
          {
            clauseNumber: 'Điều 5',
            title: 'Điều khoản miễn trừ trách nhiệm độc quyền ngành hàng',
            changeType: 'ADDED',
            targetRole: 'LEGAL',
            modifiedText: 'KOC chỉ cam kết không nhận booking nhãn hàng đối thủ trực tiếp trong vòng 07 ngày trước và sau khi lên video.',
            explanation: 'Điều khoản mới được bổ sung trên Google Docs, cần Pháp chế thẩm định.',
          },
        ],
      },
      googleDocsComments: [
        {
          id: 'c-demo-1',
          author: 'Nguyễn Thị Liên (Pháp chế)',
          content: 'Điều 3 rút xuống 45 ngày có thể chấp nhận nếu KOC cam kết giữ link giỏ hàng vàng đủ 60 ngày.',
          quotedText: 'chạy Spark Ads trong thời hạn tối đa 45 ngày',
          createdAt: now,
          resolved: false,
        },
        {
          id: 'c-demo-2',
          author: 'Lê Thị Thu Hà (Kế toán B2C)',
          content: 'Điều 2 tạm ứng 70% vượt chuẩn 50%, cần Lead Marketing xác nhận hạn mức chiến dịch ClubClio.',
          quotedText: 'tạm ứng 70% ngay sau khi ký Phụ lục SOW',
          createdAt: now,
          resolved: false,
        },
      ],
      steps: [
        { role: 'LEGAL', reviewerId: 'demo-legal', reviewerName: 'Nguyễn Thị Liên (Pháp chế)', version: 1, status: 'PENDING', note: 'Thẩm định điều khoản bản quyền 45 ngày & độc quyền' },
        { role: 'FINANCE', reviewerId: 'demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Chốt điều khoản tạm ứng 70% & thuế TNCN 10%' },
      ],
      values: gdocsValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'CREATE', note: 'Tạo Phụ lục SOW đàm phán qua Google Docs cho booking BO260889102', version: 1 },
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'SUBMIT', note: 'Gửi Pháp chế và Kế toán thẩm định điều khoản sửa đổi', version: 1 },
      ],
    },
    {
      id: 'CTR-DEMO-2026-003',
      title: 'Biên bản nghiệm thu Video · Chanh Beauty · Kutieskin',
      brand: 'Kutieskin',
      partner: 'Đặng Mai Phương (Chanh Beauty)',
      templateId: bbntTpl.id,
      templateHash: bbntTpl.hash,
      dealCode: 'BO260757625',
      kocId: 'koc-1',
      ownerId: 'demo-owner',
      ownerName: 'Người tạo (kiểm thử)',
      version: 1,
      revision: 1,
      approval: 'IN_REVIEW',
      steps: [
        { role: 'FINANCE', reviewerId: 'demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Đối soát link video nghiệm thu và duyệt chi tất toán 50% còn lại' },
      ],
      values: sampleValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'CREATE', note: 'Lập Biên bản nghiệm thu hoàn tất 01 video TikTok', version: 1 },
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'SUBMIT', note: 'Trình Kế toán duyệt quyết toán', version: 1 },
      ],
    },
    {
      id: 'CTR-DEMO-2026-000',
      title: 'Hợp đồng nguyên tắc KOC · Chanh Beauty · Kutieskin',
      brand: 'Kutieskin',
      partner: 'Đặng Mai Phương (Chanh Beauty)',
      templateId: 'IND-HDNT',
      templateHash: indTpl.hash,
      dealCode: 'BO260511200',
      kocId: 'koc-1',
      ownerId: 'demo-owner',
      ownerName: 'Người tạo (kiểm thử)',
      version: 1,
      revision: 2,
      approval: 'APPROVED',
      steps: [
        { role: 'FINANCE', reviewerId: 'demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'APPROVED', decidedAt: now, note: 'Đã kiểm tra CCCD gốc, MST và tài khoản Techcombank hợp lệ.' },
      ],
      values: sampleValues,
      versions: [],
      signing: [
        {
          documentId: 'ws-demo-000-completed',
          version: 1,
          provider: 'DEMO',
          status: 'COMPLETED',
          sourceStatus: 2,
          linkedBy: 'demo-owner',
          linkedAt: now,
          syncedAt: now,
          evidenceConfirmedBy: 'demo-finance',
          evidenceHash: 'sha256:demo000',
          people: [
            { name: 'Đặng Thị Yến Nhi', email: 'marketing-lead@upbase.vn', role: 1, level: 1, action: 2, status: 'SIGNED', at: now },
            { name: 'Đặng Mai Phương (Chanh Beauty)', email: 'chanhbeauty.booking@gmail.com', role: 1, level: 2, action: 2, status: 'SIGNED', at: now },
          ],
        },
      ],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'demo-finance', actorName: 'Lê Thị Thu Hà (Kế toán B2C)', action: 'APPROVE', note: 'Đã thẩm định Hồ sơ pháp lý & duyệt FINAL', version: 1 },
      ],
    },
  ];
}


/** Bản giả lập: trình draft hồ sơ Google Doc. */
function markDemoGoogleDocsDraft(record: ContractRecord, actor: { name: string; id: string; roles: string[] }) {
  const now = new Date().toISOString();
  record.googleDocsStage = 'DRAFT';
  record.googleDocsAuditTrail = {
    ...record.googleDocsAuditTrail,
    syncedAt: record.googleDocsAuditTrail?.syncedAt || now,
    commentsCount: record.googleDocsAuditTrail?.commentsCount || 0,
    simulated: true,
    draftSubmittedAt: now,
    draftSubmittedBy: actor.name,
  };
}

/** Bản giả lập: chốt Google Doc lúc trình final (không gọi Google). */
function demoGoogleDocsFinal(record: ContractRecord, actorName: string) {
  const now = new Date().toISOString();
  const isKoc = record.googleDocsSource === 'KOC_CUSTOM_DOC';
  const comments = record.googleDocsComments?.length
    ? record.googleDocsComments
    : [{ id: `demo-c-${Date.now()}`, author: 'Pháp chế (giả lập)', content: 'Điều 3: bổ sung thời hạn sử dụng hình ảnh KOC.', createdAt: now, resolved: true }];
  const diffs = isKoc
    ? []
    : [{
        clauseNumber: 'Điều 3',
        title: 'Phí dịch vụ và thanh toán',
        changeType: 'MODIFIED' as const,
        targetRole: 'FINANCE' as const,
        originalText: 'Thanh toán trong 07–10 ngày làm việc.',
        modifiedText: 'Thanh toán trong 03 ngày làm việc (giả lập).',
        explanation: 'Có thay đổi câu chữ so với mẫu chuẩn. Phân luồng thẩm định: Kế toán (TCKT).',
      }];
  record.googleDocsStage = 'FINAL';
  record.googleDocsComments = comments;
  record.googleDocsReviewRouting = {
    requiresLegal: true,
    requiresFinance: true,
    legalClauses: [],
    financeClauses: diffs.map(d => d.clauseNumber),
    clauseDiffs: diffs,
    summary: isKoc ? 'Mẫu riêng của KOC: không so với mẫu Upbase.' : `Phát hiện ${diffs.length} điều khoản có sửa đổi (giả lập).`,
    analyzedAt: now,
  };
  record.googleDocsAuditTrail = {
    ...record.googleDocsAuditTrail,
    syncedAt: now,
    commentsCount: comments.length,
    simulated: true,
    finalSnapshot: { at: now, by: actorName, title: record.title, hash: `demo-${Date.now()}`, paragraphs: [], commentsCount: comments.length, revisionCount: 0, simulated: true },
  };
}

let memory: DemoState = { actorId: actors[0].id, records: createInitialDemoRecords() };
let enabled = false;

export function browserDemoEnabled(): boolean {
  if (enabled) return true;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      enabled = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function enableBrowserDemo() {
  enabled = true;
  try {
    if (typeof window !== 'undefined') {
      const current = read();
      localStorage.setItem(KEY, JSON.stringify(current));
    }
  } catch {
    /* ignore */
  }
}

export function disableBrowserDemo() {
  enabled = false;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
}

function resolveLoginActor(): ContractActor | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    const savedId = localStorage.getItem('upbase_selected_user_id');
    if (!savedId) return undefined;
    const mapped = normalizeActorId(savedId);
    if (mapped && actors.some(a => a.id === mapped)) {
      return actors.find(a => a.id === mapped);
    }
    if (
      savedId === 'user-growth-manager-quyen' ||
      savedId === 'user-media-manager-quang'
    ) {
      return actors.find(a => a.id === 'demo-lead');
    }
    return actors[0];
  } catch {
    return undefined;
  }
}

function read(): DemoState {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if (Array.isArray(value.records)) {
          memory = value;
          return structuredClone(memory);
        }
      }
    }
  } catch {
    /* Bộ nhớ tab */
  }
  if (!memory.records || memory.records.length === 0) {
    memory.records = createInitialDemoRecords();
  }
  return structuredClone(memory);
}

function write(state: DemoState) {
  memory = structuredClone(state);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    /* ignore */
  }
}

const renderParagraphs = (record: ContractRecord): string[] => {
  const tpl = templates.find(t => t.id === record.templateId);
  if (!tpl) return [record.title, `${record.brand} · ${record.partner}`];
  return tpl.paragraphs.map((p, idx) => {
    let res = p;
    const pFields = tpl.fields
      .filter(f => f.paragraph === idx || f.key.startsWith('token:'))
      .sort((a, b) => (b.start ?? 0) - (a.start ?? 0));
    for (const f of pFields) {
      const val = record.values[f.key]?.trim();
      if (!val) continue;
      if (f.paragraph === idx && f.start !== undefined && f.end !== undefined) {
        const sep = f.start === f.end && res.slice(0, f.start).endsWith(':') ? ' ' : '';
        res = res.slice(0, f.start) + sep + val + res.slice(f.end);
      } else if (f.key.startsWith('token:')) {
        const tokenStr = f.key.slice('token:'.length);
        res = res.split(tokenStr).join(val);
      } else if (f.paragraph === idx && f.start === undefined) {
        res = res ? `${res} ${val}` : val;
      }
    }
    return res;
  });
};

export function browserDemoRequest<T>(url: string, body?: Record<string, unknown>): T {
  const state = read();
  const actor = resolveLoginActor() || actors.find(a => a.id === state.actorId)!;
  const path = new URL(url, 'https://demo.invalid');

  if (path.pathname === '/api/contracts/demo') {
    const normalizedId = normalizeActorId(body?.id);
    requireCondition(normalizedId && actors.some(a => a.id === normalizedId), 'Vai trò thử không hợp lệ.');
    state.actorId = normalizedId;
    write(state);
    return { success: true } as T;
  }

  if (path.pathname === '/api/contracts/google-docs/inspect') {
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    requireCondition(rawUrl, 'Vui lòng cung cấp liên kết Google Docs.');
    const docId = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 'demo-gdoc-id-2026';
    const now = new Date().toISOString();
    const diffs = [
      {
        clauseNumber: 'Điều 2',
        title: 'Giá trị hợp đồng và Tiến độ thanh toán',
        changeType: 'MODIFIED' as const,
        targetRole: 'FINANCE' as const,
        originalText: 'Bên A tạm ứng 50% sau khi ký hợp đồng và thanh toán 50% còn lại trong vòng 07 ngày làm việc.',
        modifiedText: 'Bên A tạm ứng 70% sau khi ký hợp đồng và thanh toán 30% còn lại trong vòng 03 ngày làm việc.',
        explanation: 'Thay đổi tỷ lệ tạm ứng và rút ngắn thời hạn thanh toán. Phân luồng thẩm định: Kế toán (TCKT).',
      },
      {
        clauseNumber: 'Điều 3',
        title: 'Quyền sở hữu trí tuệ và Sử dụng hình ảnh',
        changeType: 'MODIFIED' as const,
        targetRole: 'LEGAL' as const,
        originalText: 'Bên A được quyền sử dụng hình ảnh KOC chạy quảng cáo trong 90 ngày.',
        modifiedText: 'Bên A được quyền sử dụng hình ảnh KOC chạy Spark Ads tối đa 45 ngày.',
        explanation: 'Điều chỉnh thời hạn bản quyền hình ảnh xuống 45 ngày. Phân luồng thẩm định: Pháp chế.',
      },
    ];
    return {
      success: true,
      actor: { id: actor.id, name: actor.name },
      docId,
      docUrl: `https://docs.google.com/document/d/${docId}/edit`,
      title: `Hợp đồng Google Docs (${docId.slice(0, 8)})`,
      paragraphs: [
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        'HỢP ĐỒNG HỢP TÁC QUẢNG BÁ SẢN PHẨM',
        'Điều 1. Phạm vi công việc',
        'Điều 2. Giá trị hợp đồng và Tiến độ thanh toán',
        'Điều 3. Quyền sở hữu trí tuệ và Sử dụng hình ảnh',
      ],
      comments: [
        {
          id: `c-1-${docId.slice(0, 6)}`,
          author: 'Lê Thị Thu Hà (Kế toán B2C)',
          content: 'Đã kiểm tra hạn mức chiến dịch và thuế TNCN 10%.',
          quotedText: 'thanh toán 30% còn lại trong vòng 03 ngày làm việc',
          createdAt: now,
          resolved: false,
        },
      ],
      diffs,
      reviewRouting: {
        requiresLegal: true,
        requiresFinance: true,
        legalClauses: ['Điều 3'],
        financeClauses: ['Điều 2'],
        clauseDiffs: diffs,
        summary: 'Phát hiện 2 điều khoản có sửa đổi/bổ sung (1 điều khoản liên quan Kế toán, 1 điều khoản liên quan Pháp chế).',
        analyzedAt: now,
      },
    } as T;
  }

  if (path.pathname === '/api/contracts/google-docs/sync-comments') {
    const contractId = typeof body?.contractId === 'string' ? body.contractId.trim() : '';
    const record = state.records.find(r => r.id === contractId);
    requireCondition(record && canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    const next = structuredClone(record);
    const now = new Date().toISOString();
    const comments = next.googleDocsComments?.length
      ? next.googleDocsComments
      : [
          {
            id: `c-sync-${Date.now()}`,
            author: 'Lê Thị Thu Hà (Kế toán B2C)',
            content: 'Đã xác nhận tài khoản thụ hưởng và khấu trừ thuế TNCN 10%.',
            createdAt: now,
            resolved: true,
          },
        ];
    next.googleDocsComments = comments;
    next.googleDocsAuditTrail = {
      ...next.googleDocsAuditTrail,
      syncedAt: now,
      commentsCount: comments.length,
    };
    event(next, actor, 'SYNC_GOOGLE_DOCS_COMMENTS', `Đã đồng bộ ${comments.length} bình luận & phản hồi từ Google Docs`);
    next.revision++;
    state.records[state.records.findIndex(r => r.id === next.id)] = next;
    write(state);
    return { success: true, comments, record: next } as T;
  }

  if (path.pathname === '/api/contracts/google-docs/approve-and-push-wesign') {
    const contractId = typeof body?.contractId === 'string' ? body.contractId.trim() : '';
    const record = state.records.find(r => r.id === contractId);
    requireCondition(record && canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    requireCondition(
      actor.roles.includes('FINANCE') || actor.roles.includes('LEAD'),
      'Chỉ Kế toán (FINANCE) hoặc Trưởng bộ phận (LEAD) mới có thẩm quyền phê duyệt hồ sơ và đẩy sang WeSign.',
      403,
    );
    requireCondition(
      record.approval === 'IN_REVIEW' && record.googleDocsStage === 'FINAL',
      'Hồ sơ chưa được trình final. B2C cần trình final trước khi Kế toán duyệt.',
    );
    requireCondition(
      !record.steps.some(s => s.role === 'LEGAL' && s.version === record.version && s.status !== 'APPROVED'),
      'Pháp chế chưa duyệt hồ sơ này.',
    );
    const now = new Date().toISOString();
    const approvalNote =
      typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : 'Kế toán duyệt bản Google Doc đã trình final và đẩy WeSign.';
    const next = decideContract(record, actor, 'APPROVED', approvalNote);
    const commentsCount = next.googleDocsComments?.length || 0;
    next.googleDocsAuditTrail = {
      ...next.googleDocsAuditTrail,
      syncedAt: now,
      commentsCount,
      simulated: true,
      approvedByFinance: actor.name,
      approvedAtFinance: now,
      approvedSnapshot: next.googleDocsAuditTrail?.finalSnapshot,
    };
    const template = templates.find(t => t.id === next.templateId) || templates[0];
    const meta = next.contractSystem || createStandaloneContractSystemMeta(next, template);
    next.contractSystem = meta;
    const attempt = createStandaloneRequestSignAttempt(next, actor.id, `demo-gdocs-v${next.version}`, {
      partyAEmail: typeof body?.partyAEmail === 'string' ? body.partyAEmail : 'marketing-lead@upbase.vn',
      partyBEmail: typeof body?.partyBEmail === 'string' ? body.partyBEmail : 'koc-partner@upbase.vn',
    });
    next.signing.push(attempt);
    event(next, actor, 'FINANCE_APPROVE_AND_EXPORT', `Kế toán duyệt bản Google Doc (giả lập: chưa xuất được DOCX/PDF vì chưa kết nối Google).`);
    event(next, actor, 'WESIGN_SUBMITTED', `Đã tạo luồng ký số e-Contract trên WeSign (${meta.contractCode}).`);
    next.revision++;
    state.records[state.records.findIndex(r => r.id === next.id)] = next;
    write(state);
    return { success: true, record: next, attempt, commentsCount } as T;
  }

  if (!body && path.pathname === '/api/contracts') {
    return {
      actor,
      reviewers: actors.filter(a => a.roles.some(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(r))),
      demoActors: actors,
      templates,
      records: state.records.filter(r => canRead(r, actor)),
      config: { ai: false, wesign: false, storage: 'BROWSER_DEMO' },
    } satisfies ContractBootstrap as T;
  }

  if (path.pathname.startsWith('/api/contracts/templates/')) {
    const id = path.pathname.split('/').at(-1) || '';
    const template = templates.find(t => t.id === id);
    if (body && (body.action === 'SAVE_META' || body.action === 'UPLOAD_DOCX')) {
      const targetId = typeof body.newId === 'string' && body.newId.trim() ? body.newId.trim().toUpperCase() : id;
      let target = templates.find(t => t.id === targetId) || template;
      if (!target && body.action === 'UPLOAD_DOCX') {
        const fallbackBase = templates.find(t => t.kind === (body.kind || 'CONTRACT')) || templates[0];
        target = {
          ...structuredClone(fallbackBase),
          id: targetId,
          name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `Mẫu ${targetId}`,
          filename: typeof body.filename === 'string' && body.filename.trim() ? body.filename.trim() : `${targetId}.docx`,
          subject: typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : 'Cá nhân',
          kind: body.kind === 'ACCEPTANCE' ? 'ACCEPTANCE' : 'CONTRACT',
          category: (body.category as LegalTemplate['category']) || 'BOOKING_VIDEO',
          version: typeof body.version === 'string' && body.version.trim() ? body.version.trim() : 'Ver102026',
          description: typeof body.description === 'string' ? body.description.trim() : '',
          active: true,
          scope: body.scope === 'KOC_CUSTOM' ? 'KOC_CUSTOM' : 'GLOBAL',
          kocId: typeof body.kocId === 'string' ? body.kocId.trim() : undefined,
          kocName: typeof body.kocName === 'string' ? body.kocName.trim() : undefined,
          customType: body.customType === 'KOC_FORM' || body.customType === 'UPBASE_AMENDED' ? body.customType : undefined,
          legalNotes: typeof body.legalNotes === 'string' ? body.legalNotes.trim() : undefined,
          exemptLegalReview: typeof body.exemptLegalReview === 'boolean' ? body.exemptLegalReview : true,
          updatedAt: new Date().toISOString(),
          updatedBy: actor.name,
        };
        templates.push(target);
        return { template: target } as T;
      }
      if (target) {
        if (typeof body.name === 'string' && body.name.trim()) target.name = body.name.trim();
        if (typeof body.subject === 'string' && body.subject.trim()) target.subject = body.subject.trim();
        if (typeof body.version === 'string' && body.version.trim()) target.version = body.version.trim();
        if (typeof body.description === 'string') target.description = body.description.trim();
        if (typeof body.active === 'boolean') target.active = body.active;
        if (body.scope === 'KOC_CUSTOM' || body.scope === 'GLOBAL') target.scope = body.scope;
        if (typeof body.kocId === 'string') target.kocId = body.kocId.trim() || undefined;
        if (typeof body.kocName === 'string') target.kocName = body.kocName.trim() || undefined;
        if (body.customType === 'KOC_FORM' || body.customType === 'UPBASE_AMENDED') target.customType = body.customType;
        if (typeof body.legalNotes === 'string') target.legalNotes = body.legalNotes.trim() || undefined;
        if (typeof body.exemptLegalReview === 'boolean') target.exemptLegalReview = body.exemptLegalReview;
        target.updatedAt = new Date().toISOString();
        target.updatedBy = actor.name;
        return { template: target } as T;
      }
    }
    requireCondition(template, 'Không tìm thấy biểu mẫu.');
    return { template } as T;
  }

  if (path.pathname.endsWith('/document')) {
    const record = state.records.find(r => r.id === path.pathname.split('/')[3]);
    requireCondition(record && canRead(record, actor), 'Không có quyền đọc hồ sơ.', 403);
    requireCondition(path.searchParams.get('signed') !== '1', 'Giả lập không tạo tài liệu có chữ ký.');
    const version = Number(path.searchParams.get('version') || record.version);
    const snapshot = version === record.version ? record : record.versions.find(v => v.version === version);
    requireCondition(snapshot, 'Không tìm thấy phiên bản.');
    if (snapshot.customFile) {
      return {
        paragraphs: snapshot.customFile.paragraphs || [],
        blocks: snapshot.customFile.blocks || [],
        fields: [],
        values: snapshot.values,
        version,
      } as T;
    }
    const tpl = templates.find(t => t.id === record.templateId);
    return {
      paragraphs: renderParagraphs({ ...record, values: snapshot.values }),
      blocks: tpl?.blocks || [],
      fields: tpl?.fields || [],
      values: snapshot.values,
      version,
    } as T;
  }

  requireCondition(body && path.pathname === '/api/contracts', 'Thao tác không được hỗ trợ.');
  const template = templates.find(t => t.id === body.templateId);

  const parse = (existing?: ContractRecord) => {
    requireCondition(
      template &&
        typeof body.title === 'string' &&
        body.title.trim() &&
        typeof body.brand === 'string' &&
        body.brand.trim() &&
        typeof body.partner === 'string' &&
        body.partner.trim(),
      'Cần chọn mẫu và nhập tên hồ sơ, nhãn hàng, đối tác.',
    );
    requireCondition(body.values && typeof body.values === 'object' && !Array.isArray(body.values), 'Dữ liệu điền không hợp lệ.');
    const rawValues = body.values as Record<string, string>;
    const tplFields = new Set(template.fields.map(f => f.key));
    const allowedSpecialKeys = new Set(['sowAdvanceAmount', 'KOC_ID', 'LEGAL_PROFILE_ID', 'CHANNEL_ID', 'partnerEmail']);
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawValues)) {
      const isMeta = key.startsWith('meta:') || key.startsWith('__meta:');
      if (!tplFields.has(key) && !key.startsWith('token:') && !key.startsWith('src:') && !isMeta && !allowedSpecialKeys.has(key)) continue;
      const maxLen = isMeta ? 32000 : 4000;
      if (typeof value === 'string' && value.length <= maxLen) values[key] = value;
    }
    const isKocOwnForm = typeof body.isKocOwnForm === 'boolean' ? body.isKocOwnForm : Boolean(existing?.isKocOwnForm);
    let customFile = existing?.customFile;
    if (typeof body.customFilename === 'string' && body.customFilename.trim()) {
      const blocks = Array.isArray(body.customFileBlocks) ? (body.customFileBlocks as DocBlock[]) : customFile?.blocks || [];
      const paragraphs = Array.isArray(body.customFileParagraphs) ? (body.customFileParagraphs as string[]) : customFile?.paragraphs || [];
      customFile = {
        filename: body.customFilename.trim(),
        hash: typeof body.customFileHash === 'string' && body.customFileHash ? body.customFileHash : `demo-hash-${Date.now()}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: actor.name,
        blocks,
        paragraphs,
      };
    }
    if (isKocOwnForm) {
      requireCondition(Boolean(customFile), 'Vui lòng tải lên file hợp đồng (.docx) của KOC.');
    }
    let acceptanceScreenshots: AcceptanceScreenshotItem[] | undefined = existing?.acceptanceScreenshots;
    if (Array.isArray(body.acceptanceScreenshots)) {
      acceptanceScreenshots = (body.acceptanceScreenshots as AcceptanceScreenshotItem[])
        .filter((item) => item && typeof item.imageDataUrl === 'string' && item.imageDataUrl.trim().length > 0)
        .slice(0, 12);
    }
    return {
      title: body.title,
      brand: body.brand,
      partner: body.partner,
      templateId: template.id,
      templateHash: template.hash,
      values,
      parentId: (body.parentId as string | undefined) || existing?.parentId,
      dealId: body.dealId !== undefined ? (body.dealId as string | undefined) : existing?.dealId,
      dealCode: body.dealCode !== undefined ? (body.dealCode as string | undefined) : existing?.dealCode,
      kocId: body.kocId !== undefined ? (body.kocId as string | undefined) : existing?.kocId,
      hasCustomTerms: isKocOwnForm ? true : (typeof body.hasCustomTerms === 'boolean' ? body.hasCustomTerms : Boolean(existing?.hasCustomTerms)),
      customTermsSummary: typeof body.customTermsSummary === 'string' ? body.customTermsSummary.trim() : existing?.customTermsSummary,
      internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes.trim() : existing?.internalNotes,
      isKocOwnForm,
      customFile: isKocOwnForm ? customFile : undefined,
      acceptanceScreenshots,
      legalProfileId: typeof body.legalProfileId === 'string' && body.legalProfileId ? body.legalProfileId : existing?.legalProfileId,
      legalAttachments: Array.isArray(body.legalAttachments)
        ? (body.legalAttachments as ContractRecord['legalAttachments'])
        : existing?.legalAttachments,
      googleDocsUrl: typeof body.googleDocsUrl === 'string' && body.googleDocsUrl.trim() ? body.googleDocsUrl.trim() : existing?.googleDocsUrl,
      googleDocsId: typeof body.googleDocsId === 'string' && body.googleDocsId.trim() ? body.googleDocsId.trim() : existing?.googleDocsId,
      googleDocsSource: body.googleDocsSource === 'KOC_CUSTOM_DOC' ? ('KOC_CUSTOM_DOC' as const) : (body.googleDocsUrl ? ('TEMPLATE_AMENDED' as const) : existing?.googleDocsSource),
      googleDocsReviewRouting: (typeof body.googleDocsReviewRouting === 'object' && body.googleDocsReviewRouting !== null ? body.googleDocsReviewRouting : existing?.googleDocsReviewRouting) as ContractRecord['googleDocsReviewRouting'],
      googleDocsComments: (Array.isArray(body.googleDocsComments) ? body.googleDocsComments : existing?.googleDocsComments) as ContractRecord['googleDocsComments'],
      googleDocsAuditTrail: (typeof body.googleDocsAuditTrail === 'object' && body.googleDocsAuditTrail !== null ? body.googleDocsAuditTrail : existing?.googleDocsAuditTrail) as ContractRecord['googleDocsAuditTrail'],
    };
  };

  if (body.action === 'CREATE') {
    const record = createContract(parse(), actor);
    record.contractSystem = createStandaloneContractSystemMeta(record, template);
    if (record.googleDocsUrl && body.submitGoogleDocsDraft === true) {
      markDemoGoogleDocsDraft(record, actor);
      event(record, actor, 'GOOGLE_DOCS_DRAFT', 'Đã trình draft: Pháp chế và Kế toán góp ý, sửa trực tiếp trên Google Doc.');
    }
    state.records.push(record);
    write(state);
    return { record } as T;
  }

  const record = state.records.find(r => r.id === body.id);
  requireCondition(record && canRead(record, actor), 'Không có quyền đọc hồ sơ.', 403);
  requireCondition(body.revision === record.revision, 'Hồ sơ đã thay đổi. Tải lại để tiếp tục.', 409);

  let next = structuredClone(record);
  if (body.action === 'EDIT') {
    next = editContract(record, actor, parse(record));
    next.contractSystem = createStandaloneContractSystemMeta(next, template);
  } else if (body.action === 'GENERATE_CONTRACT_SYSTEM') {
    next.contractSystem = createStandaloneContractSystemMeta(next, template);
    event(next, actor, 'GENERATE_CONTRACT_SYSTEM', `Đã tạo bản .docx và đồng bộ Google Docs (${next.contractSystem.contractCode})`);
  } else if (body.action === 'SYNC_GOOGLE_DOCS') {
    const baseMeta = next.contractSystem || createStandaloneContractSystemMeta(next, template);
    const now = new Date().toISOString();
    next.contractSystem = {
      ...baseMeta,
      googleDocsSyncedAt: now,
      lastSyncedAt: now,
    };
    event(next, actor, 'SYNC_GOOGLE_DOCS', typeof body.note === 'string' && body.note.trim() ? body.note.trim() : 'Đã xuất lại bản .docx mới nhất từ Google Docs');
  } else if (body.action === 'REQUEST_SIGN') {
    assertCanSign(record, actor);
    const meta = next.contractSystem || createStandaloneContractSystemMeta(next, template);
    next.contractSystem = meta;
    const existingActive = next.signing.find(
      s =>
        (s.contractCode === meta.contractCode || s.version === next.version) &&
        !['CANCELLED', 'REJECTED'].includes(s.status),
    );
    if (!existingActive) {
      const attempt = createStandaloneRequestSignAttempt(next, actor.id, `demo-evidence-v${next.version}`, {
        partyAEmail: typeof body.partyAEmail === 'string' ? body.partyAEmail : undefined,
        partyBEmail: typeof body.partyBEmail === 'string' ? body.partyBEmail : undefined,
      });
      next.signing.push(attempt);
      event(next, actor, 'REQUEST_SIGN', `Đã xuất .docx từ Google Docs và gửi ký sang WeSign qua contract-system (Mã: ${meta.contractCode})`);
    }
  } else if (body.action === 'SUBMIT_GOOGLE_DOCS_DRAFT') {
    requireCondition(Boolean(record.googleDocsUrl), 'Hồ sơ không theo luồng Google Doc.');
    markDemoGoogleDocsDraft(next, actor);
    event(next, actor, 'GOOGLE_DOCS_DRAFT', 'Đã trình draft: Pháp chế và Kế toán góp ý, sửa trực tiếp trên Google Doc.');
  } else if (body.action === 'SUBMIT') {
    if (!record.isKocOwnForm && record.googleDocsSource !== 'KOC_CUSTOM_DOC') {
      const payOption = resolvePaymentScheduleOption(record.values, record.templateId, template?.fields);
      const requiredFields = (template?.fields || []).filter(
        f => f.required && (payOption === 'TWO_TIMES' || !isTwoTimePaymentField(f)),
      );
      requireCondition(
        requiredFields.every(f => record.values[f.key]?.trim()),
        'Còn ô bắt buộc chưa điền.',
      );
    }
    requireCondition(Array.isArray(body.reviewers), 'Cần chọn người duyệt.');
    const normalizedReviewerIds = (body.reviewers as string[]).map(id => normalizeActorId(id) || id);
    const mandatoryLegal = Boolean(record.isKocOwnForm || record.hasCustomTerms || record.googleDocsUrl || template?.exemptLegalReview === false);
    next = submitContract(
      record,
      actor,
      actors.filter(a => normalizedReviewerIds.includes(a.id)),
      { requireLegal: mandatoryLegal ? true : (typeof body.requireLegal === 'boolean' ? body.requireLegal : undefined) },
    );
    if (record.googleDocsUrl) {
      demoGoogleDocsFinal(next, actor.name);
      event(next, actor, 'GOOGLE_DOCS_FINAL', 'Đã trình final và chốt bản Google Doc (giả lập).');
    }
  } else if (body.action === 'ADD_NOTE') {
    requireCondition(typeof body.note === 'string' && body.note.trim() && body.note.length <= 4000, 'Nội dung ghi chú không hợp lệ.');
    event(next, actor, 'NOTE', body.note.trim());
  } else if (body.action === 'ATTACH_LEGAL_DOCS') {
    requireCondition(Array.isArray(body.legalAttachments), 'Danh sách tệp đính kèm không hợp lệ.');
    next.legalAttachments = body.legalAttachments as ContractRecord['legalAttachments'];
    event(next, actor, 'NOTE', `Cập nhật tệp đính kèm CCCD / ĐKKD trên Cloudflare R2 (${next.legalAttachments?.length || 0} tệp)`);
  } else if (body.action === 'DECIDE') {
    next = decideContract(record, actor, body.decision as ReviewStep['status'], String(body.note || ''));
    const isLegal = actor.roles.includes('LEGAL') || record.steps.find(s => s.reviewerId === actor.id)?.role === 'LEGAL';
    if (isLegal && body.decision === 'APPROVED' && body.saveAsKocTemplate === true && record.kocId) {
      const customTplId = `KOC-${record.kocId.toUpperCase().replace(/[^A-Z0-9_-]/g, '')}`;
      const baseTpl = templates.find(t => t.id === record.templateId) || templates[0];
      const kocLegalNotes = typeof body.kocLegalNotes === 'string' ? body.kocLegalNotes.trim() : String(body.note || '');
      const existingIdx = templates.findIndex(t => t.id === customTplId);
      const customTpl: LegalTemplate = {
        ...structuredClone(baseTpl),
        id: customTplId,
        name: `Mẫu duyệt riêng · ${record.partner || record.kocId}`,
        version: `${baseTpl.version}-KOC`,
        scope: 'KOC_CUSTOM',
        kocId: record.kocId,
        kocName: record.partner,
        exemptLegalReview: true,
        legalNotes: kocLegalNotes,
        approvedByLegal: actor.name,
        approvedAt: new Date().toISOString(),
        originalContractId: record.id,
        customType: record.isKocOwnForm ? 'KOC_FORM' : 'UPBASE_AMENDED',
      };
      if (existingIdx >= 0) templates[existingIdx] = customTpl;
      else templates.push(customTpl);
      event(next, actor, 'NOTE', `Pháp chế đã lưu mẫu này thành Mẫu đã duyệt cho KOC ${record.partner || record.kocId}.`);
    }
  } else if (body.action === 'UPDATE_LEGAL_NOTES') {
    requireCondition(actor.roles.some(r => ['LEGAL', 'LEAD'].includes(r)), 'Chỉ Pháp chế hoặc Trưởng bộ phận mới có quyền cập nhật lưu ý pháp lý.', 403);
    const notes = typeof body.legalNotes === 'string' ? body.legalNotes.trim() : '';
    next.internalNotes = notes;
    event(next, actor, 'NOTE', `Cập nhật lưu ý Pháp chế: ${notes}`);
  } else if (body.action === 'UPDATE_ACCEPTANCE_SCREENSHOTS') {
    requireCondition(Array.isArray(body.acceptanceScreenshots), 'Danh sách ảnh chụp không hợp lệ.');
    next.acceptanceScreenshots = (body.acceptanceScreenshots as AcceptanceScreenshotItem[])
      .filter((item) => item && typeof item.imageDataUrl === 'string' && item.imageDataUrl.trim().length > 0)
      .slice(0, 12);
    event(next, actor, 'NOTE', `Đã cập nhật ${next.acceptanceScreenshots.length} ảnh chụp màn hình sản phẩm đính kèm Biên bản nghiệm thu`);
  } else if (body.action === 'WITHDRAW') {
    requireCondition(
      record.ownerId === actor.id &&
        ['IN_REVIEW', 'APPROVED'].includes(record.approval) &&
        !record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)) &&
        String(body.note || '').trim(),
      'Không thể thu hồi hoặc thiếu lý do.',
    );
    next.approval = 'DRAFT';
    next.steps = [];
    event(next, actor, 'WITHDRAW', String(body.note));
  } else if (body.action === 'CHECK') {
    requireCondition(
      record.approval !== 'APPROVED' &&
        !record.signing.length &&
        (record.ownerId === actor.id || record.steps.some(s => s.reviewerId === actor.id) || actor.roles.some(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(r))),
      'Không có quyền kiểm tra hồ sơ.',
    );
    const payOption = resolvePaymentScheduleOption(record.values, record.templateId, template?.fields);
    const requiredFields = (template?.fields || []).filter(
      f => f.required && (payOption === 'TWO_TIMES' || !isTwoTimePaymentField(f)),
    );
    next.checks.push({
      version: record.version,
      at: new Date().toISOString(),
      provider: 'RULES',
      findings: requiredFields
        .filter(f => !record.values[f.key]?.trim())
        .map(f => ({ severity: 'ERROR', message: `Chưa điền: ${f.title || f.label}`, evidence: f.context, fieldKey: f.key })),
    });
    event(next, actor, 'RULE_CHECK');
  } else if (body.action === 'DEMO_FAST_SIGN') {
    const at = new Date().toISOString();
    for (const s of next.steps) {
      if (s.status !== 'APPROVED') {
        s.status = 'APPROVED';
        s.decidedAt = at;
        s.note = s.note || 'Đã duyệt kiểm tra hạn mức & điều khoản';
      }
    }
    if (next.steps.length === 0) {
      next.steps.push({
        role: 'FINANCE',
        reviewerId: 'demo-finance',
        reviewerName: 'Lê Thị Thu Hà',
        status: 'APPROVED',
        note: 'Đã duyệt hạn mức Booking & thuế',
        version: next.version,
        decidedAt: at,
      });
    }
    next.approval = 'APPROVED';
    const partyBEmail =
      next.values['src:email'] ||
      next.values['token:[ĐIỀN EMAIL]'] ||
      next.values['token:[EMAIL]'] ||
      next.values['partnerEmail'] ||
      next.values['word/document.xml:p48:cell'] ||
      '';
    next.signing.push({
      documentId: crypto.randomUUID(),
      name: next.title,
      version: next.version,
      linkedBy: actor.id,
      linkedAt: at,
      syncedAt: at,
      provider: 'DEMO',
      status: 'COMPLETED',
      sourceStatus: -3,
      completedCount: 2,
      totalCount: 2,
      progressPercent: 100,
      evidenceConfirmedBy: actor.id,
      evidenceHash: '',
      people: [
        { name: 'Upbase (Công ty CP Công nghệ UpBase)', email: 'hddt@upbase.asia', role: 0, roleLabel: 'Đại diện Bên A', level: 1, action: 2, status: 'Đã ký', at: at },
        { name: next.partner, email: partyBEmail, role: 0, roleLabel: 'Đại diện Bên B (KOC)', level: 2, action: 2, status: 'Đã ký', at: at },
      ],
    });
    event(next, actor, 'DEMO_FAST_SIGN', 'Đã hoàn tất ký số đủ 2 bên (UpBase & KOC) và khóa cấu hình Deal');
  } else if (['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_REJECT'].includes(String(body.action))) {
    assertCanSign(record, actor);
    const attempt = next.signing.at(-1);
    const at = new Date().toISOString();
    if (body.action === 'DEMO_SIGN_START') {
      requireCondition(!attempt || ['REJECTED', 'CANCELLED'].includes(attempt.status), 'Đã có lượt ký hoạt động hoặc hoàn tất.');
      const partyBEmail =
        record.values['src:email'] ||
        record.values['token:[ĐIỀN EMAIL]'] ||
        record.values['token:[EMAIL]'] ||
        record.values['partnerEmail'] ||
        record.values['word/document.xml:p48:cell'] ||
        '';
      next.signing.push({
        documentId: crypto.randomUUID(),
        name: record.title,
        version: record.version,
        linkedBy: actor.id,
        linkedAt: at,
        syncedAt: at,
        provider: 'DEMO',
        status: 'WAITING',
        sourceStatus: -1,
        completedCount: 0,
        totalCount: 2,
        progressPercent: 0,
        currentSignerName: 'Upbase (Công ty CP Công nghệ UpBase)',
        currentSignerEmail: 'hddt@upbase.asia',
        evidenceConfirmedBy: actor.id,
        evidenceHash: '',
        people: [
          { name: 'Upbase (Công ty CP Công nghệ UpBase)', email: 'hddt@upbase.asia', role: 0, roleLabel: 'Người ký', level: 1, action: 1, status: 'Chờ ký' },
          { name: record.partner, email: partyBEmail, role: 0, roleLabel: 'Người ký', level: 2, action: 0, status: 'Chưa đến lượt' },
        ],
      });
    } else {
      requireCondition(
        attempt && ['DEMO', 'CONTRACT_SYSTEM'].includes(attempt.provider || '') && ['WAITING', 'PARTIAL'].includes(attempt.status),
        'Không có lượt ký thử đang hoạt động.',
      );
      const person = attempt.people.find(p => p.action === 1)!;
      if (body.action === 'DEMO_SIGN_REJECT') {
        person.action = 3;
        person.status = 'Từ chối';
        person.at = at;
        attempt.status = 'REJECTED';
        attempt.sourceStatus = -4;
      } else {
        person.action = 2;
        person.status = 'Đã ký';
        person.at = at;
        const following = attempt.people.find(p => p.action === 0);
        if (following) {
          following.action = 1;
          following.status = 'Chờ ký';
          attempt.status = 'PARTIAL';
          attempt.sourceStatus = -2;
        } else {
          attempt.status = 'COMPLETED';
          attempt.sourceStatus = -3;
          attempt.signedFileStatus = 'DOWNLOADED';
          attempt.signedFileUrl = `/api/contracts/${next.id}/document`;
          if (next.contractSystem) {
            next.contractSystem.signedFileStatus = 'DOWNLOADED';
            next.contractSystem.signedFileUrl = `/api/contracts/${next.id}/document`;
            next.contractSystem.lastSyncedAt = at;
          }
        }
      }
      const completedCount = attempt.people.filter(p => p.action === 2).length;
      const totalCount = attempt.people.length;
      const currentWaiting = attempt.people.find(p => p.action === 1);
      attempt.completedCount = completedCount;
      attempt.totalCount = totalCount;
      attempt.progressPercent = attempt.status === 'COMPLETED' ? 100 : totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      attempt.currentSignerName = currentWaiting?.name;
      attempt.currentSignerEmail = currentWaiting?.email;
      attempt.syncedAt = at;
    }
    event(next, actor, String(body.action), 'Ký số mô phỏng (giả lập WeSign)');
  } else {
    requireCondition(false, 'Thao tác không được hỗ trợ trong bản kiểm thử.');
  }

  next.revision++;
  state.records[state.records.findIndex(r => r.id === next.id)] = next;
  write(state);
  return { record: next } as T;
}

export async function downloadBrowserDemo(url: string) {
  const path = new URL(url, 'https://demo.invalid');
  let text: string[];
  let filename: string;

  if (path.pathname.startsWith('/api/contracts/templates/')) {
    const { template } = browserDemoRequest<{ template: LegalTemplate }>(url);
    text = template.paragraphs;
    filename = template.filename;
  } else {
    text = browserDemoRequest<{ paragraphs: string[] }>(url).paragraphs;
    filename = 'hop-dong-booking-upbase.docx';
  }

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text
      .map(p => `<w:p><w:r><w:t xml:space="preserve">${escape(p)}</w:t></w:r></w:p>`)
      .join('')}<w:sectPr/></w:body></w:document>`,
  );
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
