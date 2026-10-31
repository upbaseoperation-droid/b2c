import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { getContract } from '@/lib/contracts/store';
import { canRead, ContractError, requireCondition } from '@/lib/contracts/domain';
import { readArchivedDocxBuffer, renderTemplate } from '@/lib/contracts/templates';
import { signedFile } from '@/lib/contracts/wesign';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = actorFromRequest(req); const record = await getContract((await context.params).id); requireCondition(canRead(record, actor), 'Không có quyền tải tài liệu.', 403);
    if (req.nextUrl.searchParams.get('signed') === '1') {
      const attempt = record.signing.at(-1); requireCondition(attempt?.status === 'COMPLETED', 'Luồng ký chưa được xác nhận hoàn tất.');
      const remoteSignedUrl = attempt?.signedFileUrl || record.contractSystem?.signedFileUrl;
      if (remoteSignedUrl && /^https?:\/\//i.test(remoteSignedUrl)) {
        const res = await fetch(remoteSignedUrl, { cache: 'no-store' });
        if (res.ok && res.body) {
          return new NextResponse(res.body, {
            headers: {
              'Content-Type': res.headers.get('content-type') || 'application/pdf',
              'Content-Disposition': `attachment; filename="${record.id}-signed.pdf"`,
              'Cache-Control': 'private, no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }
      }
      requireCondition(attempt.provider !== 'DEMO', 'Luồng giả lập không tạo tài liệu đã ký.');
      const response = await signedFile(attempt.documentId);
      return new NextResponse(response.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${record.id}-signed.zip"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    const requested = Number(req.nextUrl.searchParams.get('version') || record.version);
    const snapshot = requested === record.version
      ? { values: record.values, customFile: record.customFile, acceptanceScreenshots: record.acceptanceScreenshots }
      : record.versions.find(v => v.version === requested);
    requireCondition(snapshot, 'Không tìm thấy phiên bản tài liệu.', 404);

    if (snapshot.customFile?.hash) {
      if (req.nextUrl.searchParams.get('preview') === '1') {
        return NextResponse.json(
          {
            paragraphs: snapshot.customFile.paragraphs || [],
            blocks: snapshot.customFile.blocks || [],
            fields: [],
            values: snapshot.values,
            version: requested,
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const customBuffer = await readArchivedDocxBuffer(snapshot.customFile.hash);
      if (customBuffer) {
        const downloadName = snapshot.customFile.filename || `${record.id}-v${requested}.docx`;
        return new NextResponse(new Uint8Array(customBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
            'Cache-Control': 'private, no-store',
          },
        });
      }
    }

    if (req.nextUrl.searchParams.get('preview') !== '1' && requested === record.version) {
      const remoteDocxUrl = record.contractSystem?.signingFileUrl || record.contractSystem?.exportedDocxUrl;
      if (remoteDocxUrl && /^https?:\/\//i.test(remoteDocxUrl)) {
        const res = await fetch(remoteDocxUrl, { cache: 'no-store' }).catch(() => null);
        if (res && res.ok && res.body) {
          return new NextResponse(res.body, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${record.id}-v${requested}.docx"`,
              'Cache-Control': 'private, no-store',
            },
          });
        }
      }
    }
    const output = await renderTemplate(record.templateId, record.templateHash, snapshot.values, snapshot.acceptanceScreenshots);
    if (req.nextUrl.searchParams.get('preview') === '1') {
      return NextResponse.json(
        {
          paragraphs: output.paragraphs,
          blocks: output.template.blocks,
          fields: output.template.fields,
          values: snapshot.values,
          version: requested,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return new NextResponse(new Uint8Array(output.buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${record.id}-v${requested}.docx"`, 'Cache-Control': 'private, no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof ContractError ? e.message : 'Không thể tải tài liệu.' }, { status: e instanceof ContractError ? e.status : 503 }); }
}
