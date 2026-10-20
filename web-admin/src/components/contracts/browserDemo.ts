import JSZip from 'jszip';
import { assertCanSign, canRead, createContract, decideContract, editContract, event, requireCondition, submitContract } from '../../lib/contracts/domain';
import type { ContractActor, ContractField, ContractRecord, DocBlock, LegalTemplate, ReviewStep } from '../../lib/contracts/types';
import type { ContractBootstrap } from './api';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import { numberToVietnameseWords } from '../../lib/contracts/contractRules';

// Kho thử riêng trên trình duyệt; đồng bộ 100% bộ 8 biểu mẫu chuẩn Ver052026 từ Quản lý hợp đồng
const KEY = 'b2c-contract-browser-demo-v1';
const actors: ContractActor[] = [
  { id: 'demo-owner', name: 'Người tạo (kiểm thử)', roles: ['CREATOR'], brands: ['Kutieskin', 'Royal Ausnz', 'Bye Bye Blemish'], allBrands: true },
  { id: 'demo-legal', name: 'Pháp chế (kiểm thử)', roles: ['LEGAL'], brands: [], allBrands: true },
  { id: 'demo-finance', name: 'Kế toán (kiểm thử)', roles: ['FINANCE'], brands: [], allBrands: true },
  { id: 'demo-lead', name: 'Trưởng nhóm (kiểm thử)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'demo-sign', name: 'Điều phối ký (kiểm thử)', roles: ['SIGN_COORDINATOR'], brands: [], allBrands: true },
];

// Nạp toàn bộ 8 biểu mẫu chính thức từ bản chụp snapshot của Quản lý hợp đồng
const templates: LegalTemplate[] = Object.values(OFFICIAL_TEMPLATES_SNAPSHOT);

interface DemoState { actorId: string; records: ContractRecord[] }

function createInitialDemoRecords(): ContractRecord[] {
  const indTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-HD'];
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
      steps: [
        { role: 'FINANCE', reviewerId: 'demo-finance', reviewerName: 'Kế toán B2C', version: 1, status: 'PENDING', note: 'Chờ kế toán soát xét ngân sách Net' },
      ],
      values: sampleValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'CREATE', note: 'Soạn thảo hợp đồng từ booking BO260757625', version: 1 },
        { at: now, actorId: 'demo-owner', actorName: 'Chuyên viên B2C', action: 'SUBMIT', note: 'Gửi duyệt Kế toán', version: 1 },
      ],
    },
  ];
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
    if (savedId === 'contract-demo-legal') return actors.find(a => a.id === 'demo-legal');
    if (savedId === 'contract-demo-finance') return actors.find(a => a.id === 'demo-finance');
    if (savedId === 'contract-demo-sign') return actors.find(a => a.id === 'demo-sign');
    if (
      savedId === 'user-ngoc-tam' ||
      savedId === 'user-yen-nhi' ||
      savedId === 'user-admin-giang' ||
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
  return tpl.paragraphs.map(p => {
    let res = p;
    for (const f of tpl.fields) {
      const val = record.values[f.key];
      if (val && f.start !== undefined && f.end !== undefined) {
        // Token replacement
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
    requireCondition(actors.some(a => a.id === body?.id), 'Vai trò thử không hợp lệ.');
    state.actorId = body!.id as string;
    write(state);
    return { success: true } as T;
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
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawValues)) {
      if (!tplFields.has(key) && !key.startsWith('token:')) continue;
      if (typeof value === 'string' && value.length <= 4000) values[key] = value;
    }
    const isKocOwnForm = Boolean(body.isKocOwnForm);
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
    return {
      title: body.title,
      brand: body.brand,
      partner: body.partner,
      templateId: template.id,
      templateHash: template.hash,
      values,
      parentId: body.parentId as string | undefined,
      dealId: body.dealId as string | undefined,
      dealCode: body.dealCode as string | undefined,
      kocId: body.kocId as string | undefined,
      hasCustomTerms: isKocOwnForm ? true : Boolean(body.hasCustomTerms),
      customTermsSummary: typeof body.customTermsSummary === 'string' ? body.customTermsSummary.trim() : undefined,
      internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes.trim() : undefined,
      isKocOwnForm,
      customFile: isKocOwnForm ? customFile : undefined,
    };
  };

  if (body.action === 'CREATE') {
    const record = createContract(parse(), actor);
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
  } else if (body.action === 'SUBMIT') {
    if (!record.isKocOwnForm) {
      const requiredFields = template?.fields.filter(f => f.required) || [];
      requireCondition(
        requiredFields.every(f => record.values[f.key]?.trim()),
        'Còn ô bắt buộc chưa điền.',
      );
    }
    requireCondition(Array.isArray(body.reviewers), 'Cần chọn người duyệt.');
    next = submitContract(
      record,
      actor,
      actors.filter(a => (body.reviewers as string[]).includes(a.id)),
      { requireLegal: record.isKocOwnForm ? true : (typeof body.requireLegal === 'boolean' ? body.requireLegal : undefined) },
    );
  } else if (body.action === 'DECIDE') {
    next = decideContract(record, actor, body.decision as ReviewStep['status'], String(body.note || ''));
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
        (record.ownerId === actor.id || record.steps.some(s => s.reviewerId === actor.id)),
      'Không có quyền kiểm tra hồ sơ.',
    );
    const requiredFields = template?.fields.filter(f => f.required) || [];
    next.checks.push({
      version: record.version,
      at: new Date().toISOString(),
      provider: 'RULES',
      findings: requiredFields
        .filter(f => !record.values[f.key]?.trim())
        .map(f => ({ severity: 'ERROR', message: `Chưa điền: ${f.title || f.label}`, evidence: f.context, fieldKey: f.key })),
    });
    event(next, actor, 'RULE_CHECK');
  } else if (['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_REJECT'].includes(String(body.action))) {
    assertCanSign(record, actor);
    const attempt = next.signing.at(-1);
    const at = new Date().toISOString();
    if (body.action === 'DEMO_SIGN_START') {
      requireCondition(!attempt || ['REJECTED', 'CANCELLED'].includes(attempt.status), 'Đã có lượt ký hoạt động hoặc hoàn tất.');
      next.signing.push({
        documentId: crypto.randomUUID(),
        version: record.version,
        linkedBy: actor.id,
        linkedAt: at,
        syncedAt: at,
        provider: 'DEMO',
        status: 'WAITING',
        sourceStatus: -1,
        evidenceConfirmedBy: actor.id,
        evidenceHash: '',
        people: [
          { name: 'Upbase (Công ty CP Công nghệ UpBase)', email: 'hddt@upbase.asia', action: 1, status: 'Chờ ký' },
          { name: record.partner, email: record.values['word/document.xml:p48:cell'] || 'partner@booking.upbase.vn', action: 0, status: 'Chưa đến lượt' },
        ],
      });
    } else {
      requireCondition(attempt?.provider === 'DEMO' && ['WAITING', 'PARTIAL'].includes(attempt.status), 'Không có lượt ký thử đang hoạt động.');
      const person = attempt.people.find(p => p.action === 1)!;
      if (body.action === 'DEMO_SIGN_REJECT') {
        person.action = 3;
        person.status = 'Từ chối';
        attempt.status = 'REJECTED';
        attempt.sourceStatus = -4;
      } else {
        person.action = 2;
        person.status = 'Đã ký';
        const following = attempt.people.find(p => p.action === 0);
        if (following) {
          following.action = 1;
          following.status = 'Chờ ký';
          attempt.status = 'PARTIAL';
          attempt.sourceStatus = -2;
        } else {
          attempt.status = 'COMPLETED';
          attempt.sourceStatus = -3;
        }
      }
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
