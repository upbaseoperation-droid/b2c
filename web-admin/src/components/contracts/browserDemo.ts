import JSZip from 'jszip';
import { assertCanSign, canRead, createContract, decideContract, editContract, event, requireCondition, submitContract } from '../../lib/contracts/domain';
import type { ContractActor, ContractField, ContractRecord, LegalTemplate, ReviewStep } from '../../lib/contracts/types';
import type { ContractBootstrap } from './api';

// Kho thử riêng trên trình duyệt; không chứa hoặc gọi dữ liệu hợp đồng trên máy chủ.
const KEY = 'b2c-contract-browser-demo-v1';
const actors: ContractActor[] = [
  { id: 'demo-owner', name: 'Người tạo (kiểm thử)', roles: ['CREATOR'], brands: [], allBrands: true },
  { id: 'demo-legal', name: 'Pháp chế (kiểm thử)', roles: ['LEGAL'], brands: [], allBrands: true },
  { id: 'demo-finance', name: 'Kế toán (kiểm thử)', roles: ['FINANCE'], brands: [], allBrands: true },
  { id: 'demo-sign', name: 'Điều phối ký (kiểm thử)', roles: ['SIGN_COORDINATOR'], brands: [], allBrands: true },
];
const fields: ContractField[] = [
  { key: 'number', label: 'Số hồ sơ', title: 'Số hồ sơ', group: 'NUMBER', source: 'docDate', required: true, kind: 'text', context: 'Số hồ sơ thử', part: '', paragraph: 0 },
  { key: 'party', label: 'Bên B', title: 'Tên đối tác', group: 'PARTY', source: 'partyName', required: true, kind: 'text', context: 'Chỉ dùng tên đối tác giả lập', part: '', paragraph: 1 },
  { key: 'date', label: 'Ngày lập', title: 'Ngày lập', group: 'DATE', source: 'docDate', required: true, kind: 'date', context: 'Ngày lập hồ sơ thử', part: '', paragraph: 2 },
  { key: 'scope', label: 'Nội dung dịch vụ', title: 'Nội dung dịch vụ', group: 'SCOPE', source: 'product', required: true, kind: 'long', context: 'Mô tả công việc giả lập', part: '', paragraph: 3 },
  { key: 'money', label: 'Giá trị', title: 'Giá trị', group: 'MONEY', source: 'netTotal', required: true, kind: 'money', context: 'Số tiền giả lập', part: '', paragraph: 4 },
];
const templates: LegalTemplate[] = ['IND', 'HKD', 'COM', 'CTV'].flatMap((subject, i) => ['HD', 'BBNT'].map(kind => ({
  id: `${subject}-${kind}`, name: `${kind === 'HD' ? 'Hợp đồng' : 'Nghiệm thu'} · ${['Cá nhân', 'Hộ kinh doanh', 'Công ty', 'CTV tháng'][i]} (mẫu thử)`,
  filename: `mau-thu-${subject}-${kind}.docx`, subject: ['Cá nhân', 'Hộ kinh doanh', 'Công ty', 'CTV tháng'][i], kind: kind === 'HD' ? 'CONTRACT' as const : 'ACCEPTANCE' as const,
  version: 'Giả lập', hash: `demo-${subject}-${kind}`, fields, paragraphs: ['MẪU GIẢ LẬP — KHÔNG DÙNG ĐỂ KÝ', 'Mẫu rút gọn dùng thử quy trình. Bộ mẫu pháp chế gốc sẽ dùng khi kết nối môi trường thật.'],
})));
interface DemoState { actorId: string; records: ContractRecord[] }
let memory: DemoState = { actorId: actors[0].id, records: [] };
let enabled = false;
export const browserDemoEnabled = () => enabled;
export function enableBrowserDemo() { enabled = true; }
export function disableBrowserDemo() { enabled = false; }
function read(): DemoState {
  try { const raw = localStorage.getItem(KEY); if (raw) { const value = JSON.parse(raw); if (actors.some(a => a.id === value.actorId) && Array.isArray(value.records)) memory = value; } } catch { /* Chế độ riêng tư dùng bộ nhớ của tab. */ }
  return structuredClone(memory);
}
function write(state: DemoState) { memory = structuredClone(state); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Không gửi dữ liệu thử ra máy chủ khi lưu trình duyệt không khả dụng. */ } }
const paragraphs = (record: ContractRecord) => [templates.find(t => t.id === record.templateId)!.paragraphs[0], record.title, `${record.brand} · ${record.partner}`, ...fields.map(f => `${f.label}: ${record.values[f.key] || '[Chưa điền]'}`)];
export function browserDemoRequest<T>(url: string, body?: Record<string, unknown>): T {
  const state = read(); const actor = actors.find(a => a.id === state.actorId)!;
  const path = new URL(url, 'https://demo.invalid');
  if (path.pathname === '/api/contracts/demo') {
    requireCondition(actors.some(a => a.id === body?.id), 'Vai trò thử không hợp lệ.'); state.actorId = body!.id as string; write(state); return { success: true } as T;
  }
  if (!body && path.pathname === '/api/contracts') return { actor, reviewers: actors.filter(a => a.roles.some(r => ['LEGAL', 'FINANCE'].includes(r))), demoActors: actors, templates, records: state.records.filter(r => canRead(r, actor)), config: { ai: false, wesign: false, storage: 'BROWSER_DEMO' } } satisfies ContractBootstrap as T;
  if (path.pathname.startsWith('/api/contracts/templates/')) {
    const template = templates.find(t => t.id === path.pathname.split('/').at(-1)); requireCondition(template, 'Không tìm thấy mẫu thử.'); return { template } as T;
  }
  if (path.pathname.endsWith('/document')) {
    const record = state.records.find(r => r.id === path.pathname.split('/')[3]); requireCondition(record && canRead(record, actor), 'Không có quyền đọc hồ sơ thử.', 403);
    requireCondition(path.searchParams.get('signed') !== '1', 'Giả lập không tạo tài liệu có chữ ký.');
    const version = Number(path.searchParams.get('version') || record.version); const snapshot = version === record.version ? record : record.versions.find(v => v.version === version);
    requireCondition(snapshot, 'Không tìm thấy phiên bản.'); return { paragraphs: paragraphs({ ...record, values: snapshot.values }), version } as T;
  }
  requireCondition(body && path.pathname === '/api/contracts', 'Thao tác thử không được hỗ trợ.');
  const template = templates.find(t => t.id === body.templateId);
  const parse = () => {
    requireCondition(template && typeof body.title === 'string' && body.title.trim() && typeof body.brand === 'string' && body.brand.trim() && typeof body.partner === 'string' && body.partner.trim(), 'Cần chọn mẫu và nhập tên hồ sơ, nhãn hàng, đối tác.');
    requireCondition(body.values && typeof body.values === 'object' && !Array.isArray(body.values), 'Dữ liệu điền không hợp lệ.');
    const values = body.values as Record<string, string>; requireCondition(Object.entries(values).every(([key, value]) => fields.some(f => f.key === key) && typeof value === 'string' && value.length <= 4000), 'Trường điền không hợp lệ.');
    return { title: body.title, brand: body.brand, partner: body.partner, templateId: template.id, templateHash: template.hash, values, parentId: body.parentId as string | undefined, dealId: body.dealId as string | undefined, dealCode: body.dealCode as string | undefined, kocId: body.kocId as string | undefined };
  };
  if (body.action === 'CREATE') { const record = createContract(parse(), actor); state.records.push(record); write(state); return { record } as T; }
  const record = state.records.find(r => r.id === body.id); requireCondition(record && canRead(record, actor), 'Không có quyền đọc hồ sơ thử.', 403);
  requireCondition(body.revision === record.revision, 'Hồ sơ thử đã thay đổi. Tải lại để tiếp tục.', 409);
  let next = structuredClone(record);
  if (body.action === 'EDIT') next = editContract(record, actor, parse());
  else if (body.action === 'SUBMIT') {
    requireCondition(fields.every(f => record.values[f.key]?.trim()), 'Còn ô bắt buộc chưa điền.');
    requireCondition(Array.isArray(body.reviewers), 'Cần chọn người duyệt.'); next = submitContract(record, actor, actors.filter(a => (body.reviewers as string[]).includes(a.id)));
  } else if (body.action === 'DECIDE') next = decideContract(record, actor, body.decision as ReviewStep['status'], String(body.note || ''));
  else if (body.action === 'WITHDRAW') {
    requireCondition(record.ownerId === actor.id && ['IN_REVIEW', 'APPROVED'].includes(record.approval) && !record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)) && String(body.note || '').trim(), 'Không thể thu hồi hoặc thiếu lý do.');
    next.approval = 'DRAFT'; next.steps = []; event(next, actor, 'WITHDRAW', String(body.note));
  } else if (body.action === 'CHECK') {
    requireCondition(record.approval !== 'APPROVED' && !record.signing.length && (record.ownerId === actor.id || record.steps.some(s => s.reviewerId === actor.id)), 'Không có quyền kiểm tra hồ sơ.');
    next.checks.push({ version: record.version, at: new Date().toISOString(), provider: 'RULES', findings: fields.filter(f => !record.values[f.key]?.trim()).map(f => ({ severity: 'ERROR', message: `Chưa điền: ${f.label}`, evidence: f.context, fieldKey: f.key })) }); event(next, actor, 'RULE_CHECK');
  } else if (['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_REJECT'].includes(String(body.action))) {
    assertCanSign(record, actor); const attempt = next.signing.at(-1); const at = new Date().toISOString();
    if (body.action === 'DEMO_SIGN_START') {
      requireCondition(!attempt || ['REJECTED', 'CANCELLED'].includes(attempt.status), 'Đã có lượt ký hoạt động hoặc hoàn tất.');
      next.signing.push({ documentId: crypto.randomUUID(), version: record.version, linkedBy: actor.id, linkedAt: at, syncedAt: at, provider: 'DEMO', status: 'WAITING', sourceStatus: -1, evidenceConfirmedBy: actor.id, evidenceHash: '', people: [{ name: 'Upbase (giả lập)', email: 'upbase@example.invalid', action: 1, status: 'Chờ ký' }, { name: `${record.partner} (giả lập)`, email: 'partner@example.invalid', action: 0, status: 'Chưa đến lượt' }] });
    } else {
      requireCondition(attempt?.provider === 'DEMO' && ['WAITING', 'PARTIAL'].includes(attempt.status), 'Không có lượt ký thử đang hoạt động.'); const person = attempt.people.find(p => p.action === 1)!;
      if (body.action === 'DEMO_SIGN_REJECT') { person.action = 3; person.status = 'Từ chối'; attempt.status = 'REJECTED'; attempt.sourceStatus = -4; }
      else { person.action = 2; person.status = 'Đã ký'; const following = attempt.people.find(p => p.action === 0); if (following) { following.action = 1; following.status = 'Chờ ký'; attempt.status = 'PARTIAL'; attempt.sourceStatus = -2; } else { attempt.status = 'COMPLETED'; attempt.sourceStatus = -3; } }
      attempt.syncedAt = at;
    }
    event(next, actor, String(body.action), 'Giả lập trên trình duyệt; không gửi MISA, không tạo chữ ký pháp lý.');
  } else requireCondition(false, 'Bản giả lập không kết nối AI/MISA hoặc ghi hồ sơ thật.');
  next.revision++; state.records[state.records.findIndex(r => r.id === next.id)] = next; write(state); return { record: next } as T;
}
export async function downloadBrowserDemo(url: string) {
  const path = new URL(url, 'https://demo.invalid'); let text: string[]; let filename: string;
  if (path.pathname.startsWith('/api/contracts/templates/')) { const { template } = browserDemoRequest<{ template: LegalTemplate }>(url); text = [...template.paragraphs, ...fields.map(f => `${f.label}: [Chưa điền]`)]; filename = template.filename; }
  else { text = browserDemoRequest<{ paragraphs: string[] }>(url).paragraphs; filename = 'hop-dong-gia-lap.docx'; }
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text.map(p => `<w:p><w:r><w:t xml:space="preserve">${escape(p)}</w:t></w:r></w:p>`).join('')}<w:sectPr/></w:body></w:document>`);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); const href = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = href; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
}
