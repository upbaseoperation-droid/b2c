import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { readRecordsBatch, RecordError } from '@/lib/server/sharedRecords';
import { activeMonths, ctvNextStep, findContributor, findCtvJobs, readCtvDirectory, submitCtvWork, type CtvSubmissionKind } from '@/lib/server/selfChannelCtvWork';
import { EMPTY_SETTLEMENT_MONTH, type SelfSettlementMonthData } from '@/lib/selfChannelSettlement';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

/** Tài khoản CTV đăng nhập → hồ sơ CTV trong danh bạ (theo linkedEntityId). */
async function resolveCtv(request: NextRequest) {
  const user = await requestActor(request).catch(() => null);
  if (!user) return { error: fail('Phiên đăng nhập không hợp lệ.', 401) };
  if (user.role !== 'CTV_PARTNER' || !user.linkedEntityId) return { error: fail('Chỉ tài khoản CTV dùng Cổng CTV.', 403) };
  const ctv = findContributor(await readCtvDirectory(), { linkedEntityId: user.linkedEntityId });
  if (!ctv) return { error: fail('Tài khoản chưa được gắn với hồ sơ CTV trong danh bạ. Liên hệ Partnership.', 404) };
  return { user, ctv };
}

// GET /api/self-channel-portal — việc được giao (tháng này và tháng trước) và các đợt thanh toán của chính CTV
export async function GET(request: NextRequest) {
  const r = await resolveCtv(request);
  if ('error' in r) return r.error;
  try {
    const rows = await findCtvJobs(r.ctv.id);
    const jobs = rows.map(({ plan, job }) => {
      const step = ctvNextStep(job);
      // Chỉ trả các trường CTV cần để làm việc (không lộ dữ liệu nội bộ của gian)
      return {
        planId: plan.id,
        month: plan.month,
        storeName: plan.storeName || plan.title,
        brandName: plan.brandName,
        code: job.code,
        formatKey: job.formatKey,
        productName: job.productName,
        angle: job.angle,
        hook: job.hook,
        usp: job.usp,
        cta: job.cta,
        forbiddenClaims: job.forbiddenClaims,
        briefUrl: job.briefUrl,
        deadline: job.deadline,
        publishPlatform: job.publishPlatform,
        scriptUrl: job.scriptUrl,
        draftVideoUrl: job.draftVideoUrl,
        airLink: job.airLink,
        airCheck: job.airCheck ? { verdict: job.airCheck.verdict, issues: job.airCheck.issues, checkedLink: job.airCheck.checkedLink } : undefined,
        feeGross: job.feeGross,
        paymentStatus: job.paymentStatus,
        nextStep: step.label,
        waitingOnCtv: step.waitingOnCtv,
        submitKind: step.kind,
      };
    });
    const months = activeMonths();
    const recs = await readRecordsBatch<SelfSettlementMonthData>(
      months.map(m => `self-channel-settlement-${m.replace(/\D/g, '')}`),
      EMPTY_SETTLEMENT_MONTH,
      { clone: false }
    );
    const settlements = Array.from(recs.values())
      .flatMap(rec => rec.data?.settlements || [])
      .filter(s => s.contributorId === r.ctv.id && s.status !== 'CANCELLED')
      .map(s => ({ slipCode: s.slipCode, month: s.month, bbntCode: s.bbntCode, videos: s.jobs.length, grossTotal: s.grossTotal, pitTax: s.pitTax, netTotal: s.netTotal, status: s.status, paidAt: s.paidAt }));
    return NextResponse.json({ contributor: { name: r.ctv.name, code: r.ctv.code }, jobs, settlements }, { headers });
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    throw err;
  }
}

// POST /api/self-channel-portal — CTV nộp kịch bản / video nháp / link đăng cho việc của mình
export async function POST(request: NextRequest) {
  const r = await resolveCtv(request);
  if ('error' in r) return r.error;
  try {
    const body = (await request.json().catch(() => null)) as { planId?: string; jobCode?: string; kind?: CtvSubmissionKind; link?: string } | null;
    if (!body?.jobCode || !body.link || !['SCRIPT', 'DRAFT', 'AIR'].includes(body.kind || '')) return fail('Dữ liệu gửi lên không hợp lệ.', 400);
    const result = await submitCtvWork({
      contributor: r.ctv,
      jobCode: body.jobCode,
      planId: body.planId,
      kind: body.kind as CtvSubmissionKind,
      link: body.link,
      actorName: `${r.ctv.name} (Cổng CTV)`,
    });
    return NextResponse.json({ ok: result.ok, message: result.message }, { status: result.ok ? 200 : 400, headers });
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    throw err;
  }
}
