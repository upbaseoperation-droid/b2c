import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import type { UserProfile } from '@/lib/types';
import { PlanStoreError } from '@/lib/server/monthlyPlanStore';

/** Lấy người dùng nội bộ từ cookie phiên. Tài khoản đối tác (Brand/KOC/CTV) không được truy cập kế hoạch. */
export async function getPlanActor(request: NextRequest): Promise<UserProfile | null> {
  const user = await requestActor(request);
  if (!user || user.partnerType) return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ hoặc không có quyền.' }, { status: 401 });
}

export function handlePlanError(err: unknown) {
  if (err instanceof PlanStoreError) {
    const status = {
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      LOCKED: 423,
      EXISTS: 409,
      INVALID: 400
    }[err.code];
    return NextResponse.json({ error: err.message, code: err.code, current: err.current ?? null }, { status });
  }
  console.error('[monthly-plans]', err);
  return NextResponse.json({ error: 'Không lưu được dữ liệu kế hoạch. Vui lòng thử lại.' }, { status: 500 });
}
