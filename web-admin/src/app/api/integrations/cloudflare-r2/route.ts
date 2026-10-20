import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { BrandError, requireReader } from '@/lib/brands/domain';
import {
  assertValidBrandFileKey,
  brandFileStorageMode,
  buildR2EnvSnippet,
  clearRuntimeR2Config,
  deleteBrandFile,
  getR2ConfigWithSource,
  inspectLocalBrandFiles,
  listStoredObjects,
  migrateLocalFilesToR2,
  normalizeR2ConnectionInput,
  saveRuntimeR2Config,
  testR2Connection,
} from '@/lib/brands/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function maskKey(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}

async function buildStatusPayload() {
  const { config, source, updatedAt, updatedBy, lastTest } = getR2ConfigWithSource();
  const localFiles = await inspectLocalBrandFiles();

  return {
    configured: config !== null,
    storageMode: brandFileStorageMode(),
    source,
    accountId: config?.accountId || '',
    bucket: config?.bucket || 'upbase-b2c-brands',
    endpoint: config?.endpoint || '',
    publicUrl: config?.publicUrl || '',
    accessKeyId: config?.accessKeyId || '',
    maskedAccessKeyId: config ? maskKey(config.accessKeyId) : '',
    hasSecretAccessKey: Boolean(config?.secretAccessKey),
    maskedSecretAccessKey: config ? maskKey(config.secretAccessKey) : '',
    updatedAt: updatedAt || null,
    updatedBy: updatedBy || null,
    lastTest: lastTest || null,
    localFiles: {
      count: localFiles.count,
      totalBytes: localFiles.totalBytes,
    },
    envSnippet: buildR2EnvSnippet({
      accountId: config?.accountId || '',
      accessKeyId: config?.accessKeyId || '',
      secretAccessKey: config ? '<ĐÃ_LƯU_TRÊN_MÁY_CHỦ>' : '',
      bucket: config?.bucket || 'upbase-b2c-brands',
      endpoint: config?.endpoint || '',
      publicUrl: config?.publicUrl || '',
    }),
  };
}

function handleError(error: unknown) {
  console.error('[API /api/integrations/cloudflare-r2 error]:', error);
  const isKnown = error instanceof BrandError;
  const message = isKnown
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Không xử lý được yêu cầu cấu hình Cloudflare R2.';
  return NextResponse.json({ ok: false, error: message }, { status: isKnown ? error.status : 500, headers: noStore });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    requireReader(user);
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      throw new BrandError('Tài khoản đối tác không có quyền truy cập cấu hình lưu trữ Cloudflare R2.', 403);
    }
    const status = await buildStatusPayload();
    const includeObjects = req.nextUrl.searchParams.get('includeObjects') === '1';
    if (includeObjects) {
      const prefix = req.nextUrl.searchParams.get('prefix') || 'brands/';
      const storedObjects = await listStoredObjects(prefix);
      return NextResponse.json({ ok: true, ...status, storedObjects }, { headers: noStore });
    }
    return NextResponse.json({ ok: true, ...status }, { headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requestActor(req);
    requireReader(user);
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      throw new BrandError('Tài khoản đối tác không có quyền truy cập cấu hình lưu trữ Cloudflare R2.', 403);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || 'TEST_CONNECTION').trim().toUpperCase();

    const highPrivilegeActions = ['SAVE_CONFIG', 'CLEAR_CONFIG', 'DELETE_OBJECT', 'MIGRATE_LOCAL_FILES'];
    if (highPrivilegeActions.includes(action)) {
      if (!['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new BrandError('Chỉ Quản trị viên (Admin) hoặc Giám đốc mới có quyền thay đổi cấu hình hoặc xóa tệp lưu trữ Cloudflare R2.', 403);
      }
    }

    if (action === 'LIST_OBJECTS') {
      const prefix = typeof body.prefix === 'string' && body.prefix.trim() ? body.prefix.trim() : 'brands/';
      const storedObjects = await listStoredObjects(prefix);
      const status = await buildStatusPayload();
      return NextResponse.json({ ok: true, ...status, storedObjects }, { headers: noStore });
    }

    if (action === 'DELETE_OBJECT') {
      const rawKey = typeof body.key === 'string' ? body.key.trim() : '';
      const validKey = assertValidBrandFileKey(rawKey);
      await deleteBrandFile(validKey);
      const storedObjects = await listStoredObjects('brands/');
      const status = await buildStatusPayload();
      return NextResponse.json(
        {
          ok: true,
          deletedKey: validKey,
          message: `Đã xóa tệp "${validKey}" khỏi kho lưu trữ.`,
          ...status,
          storedObjects,
        },
        { headers: noStore },
      );
    }

    if (action === 'CLEAR_CONFIG') {
      await clearRuntimeR2Config();
      const status = await buildStatusPayload();
      return NextResponse.json(
        {
          ok: true,
          message: 'Đã xóa cấu hình R2 lưu trên giao diện và chuyển về chế độ mặc định.',
          ...status,
        },
        { headers: noStore },
      );
    }

    if (action === 'MIGRATE_LOCAL_FILES') {
      const result = await migrateLocalFilesToR2();
      const status = await buildStatusPayload();
      return NextResponse.json(
        {
          ok: result.failedCount === 0,
          migration: result,
          message:
            result.migratedCount > 0
              ? `Đã đồng bộ thành công ${result.migratedCount} tệp cục bộ lên Cloudflare R2.`
              : 'Không có tệp cục bộ nào cần đồng bộ.',
          ...status,
        },
        { headers: noStore },
      );
    }

    const current = getR2ConfigWithSource().config;
    const rawSecret = typeof body.secretAccessKey === 'string' ? body.secretAccessKey.trim() : '';
    const effectiveSecret = rawSecret || current?.secretAccessKey || '';

    const candidateInput = {
      accountId: typeof body.accountId === 'string' ? body.accountId : current?.accountId || '',
      accessKeyId: typeof body.accessKeyId === 'string' ? body.accessKeyId : current?.accessKeyId || '',
      secretAccessKey: effectiveSecret,
      bucket: typeof body.bucket === 'string' && body.bucket.trim() ? body.bucket : current?.bucket || 'upbase-b2c-brands',
      endpoint: typeof body.endpoint === 'string' ? body.endpoint : current?.endpoint || '',
      publicUrl: typeof body.publicUrl === 'string' ? body.publicUrl : current?.publicUrl || '',
    };

    if (action === 'TEST_CONNECTION') {
      const normalized = normalizeR2ConnectionInput(candidateInput);
      if (!normalized) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Vui lòng nhập đầy đủ Account ID (hoặc S3 Endpoint), Tên Bucket, Access Key ID và Secret Access Key để kiểm tra.',
          },
          { status: 400, headers: noStore },
        );
      }

      const testResult = await testR2Connection(normalized);

      // Nếu thông tin kiểm tra trùng khớp với cấu hình đã lưu, cập nhật lại trạng thái kiểm tra gần nhất
      if (
        current &&
        current.accessKeyId === normalized.accessKeyId &&
        current.bucket === normalized.bucket &&
        current.endpoint === normalized.endpoint
      ) {
        await saveRuntimeR2Config({
          ...normalized,
          updatedBy: user.name,
          lastTest: testResult,
        }).catch(() => undefined);
      }

      const status = await buildStatusPayload();
      return NextResponse.json(
        {
          ok: testResult.ok,
          testResult,
          error: testResult.ok ? undefined : testResult.message,
          ...status,
        },
        { headers: noStore },
      );
    }

    if (action === 'SAVE_CONFIG') {
      const saved = await saveRuntimeR2Config({
        ...candidateInput,
        updatedBy: user.name,
      });

      const shouldTest = body.testAfterSave !== false;
      let testResult = saved.lastTest;
      if (shouldTest) {
        testResult = await testR2Connection(saved);
        await saveRuntimeR2Config({
          ...saved,
          updatedBy: user.name,
          lastTest: testResult,
        });
      }

      const status = await buildStatusPayload();
      return NextResponse.json(
        {
          ...status,
          ok: true,
          testResult,
          envSnippet: buildR2EnvSnippet(saved),
          message: testResult?.ok
            ? `Đã lưu cấu hình và kết nối thành công tới bucket "${saved.bucket}" (${testResult.latencyMs}ms).`
            : `Đã lưu cấu hình Cloudflare R2 cho bucket "${saved.bucket}".`,
        },
        { headers: noStore },
      );
    }

    return NextResponse.json({ ok: false, error: `Hành động "${action}" không hợp lệ.` }, { status: 400, headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}
