// Lệnh Zalo cho CTV Self-channel: bot nhận diện CTV qua Zalo ID trên hồ sơ danh bạ,
// CTV nộp kịch bản / video nháp / link đăng thẳng vào việc của mình.
import { ctvNextStep, findContributor, findCtvJobs, readCtvDirectory, respondCtvJob, submitCtvWork, type CtvSubmissionKind } from './selfChannelCtvWork';

const URL_RE = /https?:\/\/\S+/i;
const JOB_CODE_RE = /\b([A-Z]{1,6}-[A-Z0-9][\w-]*)\b/i;

const HELP = [
  'Lệnh cho CTV:',
  '• /viec — xem việc đang giao và bước tiếp theo',
  '• /nhan <mã việc> — nhận việc được giao',
  '• /tuchoi <mã việc> <lý do> — từ chối việc',
  '• /kichban <mã việc> <link> — nộp kịch bản',
  '• /nhap <mã việc> <link> — nộp video nháp',
  '• /dang <mã việc> <link> — gửi link đã đăng trên kênh Brand',
  'Hoặc gửi "<mã việc> <link>", bot tự hiểu theo bước của việc.',
].join('\n');

/**
 * Trả lời cho CTV, hoặc null khi người gửi không phải CTV / tin không phải lệnh CTV
 * (để bot xử lý tiếp như nhóm KOC).
 */
export async function handleCtvZaloMessage(params: { senderId: string; senderName: string; text: string }): Promise<string | null> {
  if (!params.senderId) return null;
  const directory = await readCtvDirectory();
  const ctv = findContributor(directory, { zaloUserId: params.senderId });
  if (!ctv) return null;

  const text = params.text.trim();
  const lower = text.toLowerCase();
  const command = lower.split(/\s+/)[0];

  if (command === '/viec' || command === '/việc' || command === '/ctv') {
    const rows = await findCtvJobs(ctv.id);
    if (rows.length === 0) return `Chào ${ctv.name}, hiện chưa có việc nào được giao cho bạn.\n\n${HELP}`;
    const lines = rows.slice(0, 15).map(({ plan, job }) => {
      const step = ctvNextStep(job);
      return `${step.waitingOnCtv ? '👉' : '•'} ${job.code} · ${plan.storeName || plan.title}${job.deadline ? ` · hạn ${job.deadline}` : ''}\n   ${step.label}`;
    });
    return [`Việc của ${ctv.name} (${rows.length}):`, ...lines, rows.length > 15 ? `… và ${rows.length - 15} việc khác (xem trên Cổng CTV).` : '', '', HELP]
      .filter(Boolean)
      .join('\n');
  }

  const decision = ['/nhan', '/nhận'].includes(command) ? 'CONFIRM' : ['/tuchoi', '/từchối', '/tuchối'].includes(command) ? 'DECLINE' : null;
  if (decision) {
    const jobCode = text.match(JOB_CODE_RE)?.[1];
    if (!jobCode) return `Cú pháp: ${decision === 'CONFIRM' ? '/nhan <mã việc>' : '/tuchoi <mã việc> <lý do>'}. Gõ /viec để xem mã việc.`;
    const reason = text.replace(command, ' ').replace(jobCode, ' ').trim();
    const answer = await respondCtvJob({ contributor: ctv, jobCode, decision, reason });
    return `${answer.ok ? '✅' : '⚠️'} ${answer.message}`;
  }

  const url = text.match(URL_RE)?.[0];
  const explicit: Record<string, CtvSubmissionKind> = { '/kichban': 'SCRIPT', '/kịchbản': 'SCRIPT', '/nhap': 'DRAFT', '/nháp': 'DRAFT', '/nopnhap': 'DRAFT', '/dang': 'AIR', '/đăng': 'AIR' };
  const explicitKind = explicit[command];
  const code = text.replace(URL_RE, ' ').match(JOB_CODE_RE)?.[1];

  if (!explicitKind && !(code && url)) {
    // Tin thường của CTV (không phải lệnh): chỉ nhắc khi có link mà thiếu mã việc
    return url ? `Bạn gửi kèm mã việc nhé, ví dụ: "SC-01 ${url}". Gõ /viec để xem mã việc.` : null;
  }
  if (!code || !url) return `Cú pháp: ${command || '/dang'} <mã việc> <link>. Gõ /viec để xem mã việc.`;

  let kind: CtvSubmissionKind | undefined = explicitKind;
  if (!kind) {
    const row = (await findCtvJobs(ctv.id)).find(r => r.job.code.toUpperCase() === code.toUpperCase());
    const nextKind = row ? ctvNextStep(row.job).kind : undefined;
    kind = nextKind && nextKind !== 'CONFIRM' ? nextKind : undefined;
    if (!kind) return `Việc ${code.toUpperCase()} hiện không chờ bạn nộp gì. Gõ /viec để xem bước tiếp theo.`;
  }
  const result = await submitCtvWork({ contributor: ctv, jobCode: code, kind, link: url, actorName: `${ctv.name} (Zalo)` });
  return `${result.ok ? '✅' : '⚠️'} ${result.message}`;
}
