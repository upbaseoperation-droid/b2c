import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, checkOrigin } from '@/lib/contracts/access';
import { ContractError, requireCondition } from '@/lib/contracts/domain';
import { BrandError } from '@/lib/brands/domain';
import {
  brandFileStorageMode,
  deleteLegalDocFile,
  ensureR2ConfigHydratedFromDb,
  readLegalDocFile,
  uploadLegalDocFile,
} from '@/lib/brands/r2';
import type { LegalDocAttachment, LegalDocCategory } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOC_TYPE_LABELS: Record<LegalDocCategory, string> = {
  CCCD_FRONT: 'CCCD mặt trước',
  CCCD_BACK: 'CCCD mặt sau',
  CCCD_SCAN: 'Bản scan CCCD 2 mặt',
  DKKD: 'Giấy phép ĐKKD / Hộ kinh doanh',
  AUTHORIZATION: 'Giấy ủy quyền ký hợp đồng',
  TAX_COMMITMENT: 'Cam kết thuế / Hồ sơ thuế',
};

const VALID_DOC_TYPES = new Set<LegalDocCategory>([
  'CCCD_FRONT',
  'CCCD_BACK',
  'CCCD_SCAN',
  'DKKD',
  'AUTHORIZATION',
  'TAX_COMMITMENT',
]);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderDemoLegalDocSvg(
  rawKey: string,
  params?: URLSearchParams,
): { svg: string; fileName: string } | null {
  if (!rawKey.startsWith('legal-docs/demo-')) return null;
  const demoIsDkkd = rawKey.includes('dkkd');
  const demoIsBack = rawKey.includes('mat-sau');
  const holder = escapeXml(
    (params?.get('holder') || '').trim() ||
      (demoIsDkkd
        ? 'CÔNG TY TNHH TRUYỀN THÔNG & QUẢNG CÁO CREATOR VIỆT'
        : 'NGUYỄN THU TRANG'),
  );
  const idNo = escapeXml(
    (params?.get('idNo') || '').trim() || (demoIsDkkd ? '0109876543' : '001201019876'),
  );
  const rep = escapeXml((params?.get('rep') || '').trim() || holder);
  const repTitle = escapeXml((params?.get('repTitle') || '').trim() || 'Người đại diện pháp luật');
  const address = escapeXml(
    (params?.get('address') || '').trim() ||
      'Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội',
  );
  const issueDate = escapeXml((params?.get('issueDate') || '').trim() || '15/05/2022');
  const issuePlace = escapeXml(
    (params?.get('issuePlace') || '').trim() || 'Cục Cảnh sát QLHC về TTXH',
  );
  const taxMode = escapeXml(
    (params?.get('taxMode') || '').trim() || 'Xuất hóa đơn GTGT / Hộ kinh doanh',
  );

  if (demoIsDkkd) {
    const dkkdSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520" viewBox="0 0 760 520">
      <rect width="760" height="520" rx="16" fill="#FAF8F4" stroke="#D8D2C5" stroke-width="2"/>
      <rect x="28" y="28" width="704" height="464" rx="10" fill="#FFFFFF" stroke="#E5E0D5"/>
      <text x="380" y="72" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#2B2B2B">SỞ KẾ HOẠCH VÀ ĐẦU TƯ — PHÒNG ĐĂNG KÝ KINH DOANH</text>
      <text x="380" y="106" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="800" fill="#24457A">GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP / HỘ KINH DOANH</text>
      <line x1="160" y1="122" x2="600" y2="122" stroke="#24457A" stroke-width="1.5"/>
      <text x="72" y="166" font-family="sans-serif" font-size="14" font-weight="700" fill="#2B2B2B">1. Tên đơn vị: ${holder}</text>
      <text x="72" y="200" font-family="sans-serif" font-size="14" fill="#4A4A4A">2. Mã số doanh nghiệp / Mã số thuế: <tspan font-weight="700" fill="#2B2B2B">${idNo}</tspan></text>
      <text x="72" y="234" font-family="sans-serif" font-size="14" fill="#4A4A4A">3. Địa chỉ trụ sở đăng ký: ${address}</text>
      <text x="72" y="268" font-family="sans-serif" font-size="14" fill="#4A4A4A">4. Người đại diện: <tspan font-weight="700" fill="#2B2B2B">${rep}</tspan> — Chức danh: ${repTitle}</text>
      <text x="72" y="302" font-family="sans-serif" font-size="14" fill="#4A4A4A">5. Ngày cấp / Xác thực: <tspan font-weight="700" fill="#2B2B2B">${issueDate}</tspan></text>
      <text x="72" y="336" font-family="sans-serif" font-size="14" fill="#4A4A4A">6. Chế độ thuế: ${taxMode}</text>
      <rect x="72" y="376" width="250" height="72" rx="8" fill="#F0F5FF" stroke="#B8CEFF"/>
      <text x="88" y="404" font-family="sans-serif" font-size="12" font-weight="700" fill="#24457A">LƯU TRỮ CLOUDFLARE R2</text>
      <text x="88" y="426" font-family="sans-serif" font-size="11" fill="#4A4A4A">Đã đối chiếu hợp lệ phục vụ ký HĐ</text>
      <circle cx="580" cy="410" r="46" fill="none" stroke="#C93B2B" stroke-width="2.5" stroke-dasharray="6,3"/>
      <text x="580" y="406" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#C93B2B">ĐÃ ĐỐI CHIẾU</text>
      <text x="580" y="422" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#C93B2B">BẢN SCAN ĐKKD</text>
    </svg>`;
    return { svg: dkkdSvg, fileName: 'giay-phep-dkkd.svg' };
  }
  const demoSideTitle = demoIsBack
    ? 'CĂN CƯỚC CÔNG DÂN GẮN CHIP — MẶT SAU (ĐẶC ĐIỂM NHẬN DẠNG &amp; NGÀY CẤP)'
    : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — CĂN CƯỚC CÔNG DÂN (MẶT TRƯỚC)';
  const dynamicSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">
    <rect width="720" height="440" rx="20" fill="#F4F7FB" stroke="#C5D2E3" stroke-width="2"/>
    <rect x="24" y="24" width="672" height="64" rx="10" fill="#24457A"/>
    <text x="360" y="62" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">${demoSideTitle}</text>
    <rect x="44" y="114" width="148" height="196" rx="10" fill="#E3EAF3" stroke="#B6C4D6"/>
    <text x="118" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#24457A">${demoIsBack ? 'CHIP ĐIỆN TỬ' : 'ẢNH CHÂN DUNG'}</text>
    <text x="118" y="232" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#5A6878">CCCD GẮN CHIP</text>
    <text x="220" y="142" font-family="sans-serif" font-size="13" fill="#5A6878">Số Căn cước công dân / Personal ID No:</text>
    <text x="220" y="170" font-family="monospace" font-size="22" font-weight="700" fill="#2B2B2B">${idNo}</text>
    <text x="220" y="208" font-family="sans-serif" font-size="14" fill="#4A4A4A">Họ và tên: <tspan font-weight="700" fill="#2B2B2B">${holder}</tspan></text>
    <text x="220" y="238" font-family="sans-serif" font-size="14" fill="#4A4A4A">Quốc tịch: <tspan font-weight="700" fill="#2B2B2B">Việt Nam</tspan> · Trạng thái: Đã đối chiếu bản gốc</text>
    <text x="220" y="268" font-family="sans-serif" font-size="14" fill="#4A4A4A">Nơi thường trú: ${address}</text>
    <text x="220" y="298" font-family="sans-serif" font-size="14" fill="#4A4A4A">Ngày cấp: <tspan font-weight="700" fill="#2B2B2B">${issueDate}</tspan> · Nơi cấp: ${issuePlace}</text>
    <rect x="44" y="338" width="632" height="64" rx="8" fill="#FFFFFF" stroke="#D5DFEC"/>
    <text x="64" y="366" font-family="monospace" font-size="13" fill="#2B2B2B">IDVNM${idNo}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="64" y="388" font-family="monospace" font-size="13" fill="#24457A">${holder}&lt;&lt;&lt;&lt;&lt;&lt;&lt;CLOUDFLARE&lt;R2</text>
  </svg>`;
  if (dynamicSvg) return { svg: dynamicSvg, fileName: demoIsBack ? 'cccd-mat-sau.svg' : 'cccd-mat-truoc.svg' };
  if (!rawKey.startsWith('legal-docs/demo-')) return null;
  const isDkkd = rawKey.includes('dkkd');
  const isBack = rawKey.includes('mat-sau');
  if (isDkkd) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520" viewBox="0 0 760 520">
      <rect width="760" height="520" rx="16" fill="#FAF8F4" stroke="#D8D2C5" stroke-width="2"/>
      <rect x="28" y="28" width="704" height="464" rx="10" fill="#FFFFFF" stroke="#E5E0D5"/>
      <text x="380" y="72" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#2B2B2B">SỞ KẾ HOẠCH VÀ ĐẦU TƯ TP. HÀ NỘI — PHÒNG ĐĂNG KÝ KINH DOANH</text>
      <text x="380" y="106" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="800" fill="#24457A">GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP / HỘ KINH DOANH</text>
      <line x1="160" y1="122" x2="600" y2="122" stroke="#24457A" stroke-width="1.5"/>
      <text x="72" y="166" font-family="sans-serif" font-size="14" font-weight="700" fill="#2B2B2B">1. Tên đơn vị: CÔNG TY TNHH TRUYỀN THÔNG &amp; QUẢNG CÁO CREATOR VIỆT</text>
      <text x="72" y="200" font-family="sans-serif" font-size="14" fill="#4A4A4A">2. Mã số doanh nghiệp / Mã số thuế: <tspan font-weight="700" fill="#2B2B2B">0109876543</tspan></text>
      <text x="72" y="234" font-family="sans-serif" font-size="14" fill="#4A4A4A">3. Địa chỉ trụ sở chính: Tầng 8, Tòa nhà Sáng Tạo, Quận Cầu Giấy, TP. Hà Nội</text>
      <text x="72" y="268" font-family="sans-serif" font-size="14" fill="#4A4A4A">4. Người đại diện theo pháp luật: <tspan font-weight="700" fill="#2B2B2B">LÊ QUANG HUY</tspan> — Chức danh: Giám đốc</text>
      <text x="72" y="302" font-family="sans-serif" font-size="14" fill="#4A4A4A">5. Số CCCD người đại diện: <tspan font-weight="700" fill="#2B2B2B">001092018899</tspan> · Cấp ngày 10/04/2022</text>
      <text x="72" y="336" font-family="sans-serif" font-size="14" fill="#4A4A4A">6. Chế độ hóa đơn: Xuất hóa đơn GTGT (VAT 8% / 10%)</text>
      <rect x="72" y="376" width="250" height="72" rx="8" fill="#F0F5FF" stroke="#B8CEFF"/>
      <text x="88" y="404" font-family="sans-serif" font-size="12" font-weight="700" fill="#24457A">LƯU TRỮ CLOUDFLARE R2</text>
      <text x="88" y="426" font-family="sans-serif" font-size="11" fill="#4A4A4A">Đã đối chiếu hợp lệ phục vụ ký HĐ</text>
      <circle cx="580" cy="410" r="46" fill="none" stroke="#C93B2B" stroke-width="2.5" stroke-dasharray="6,3"/>
      <text x="580" y="406" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#C93B2B">ĐÃ ĐỐI CHIẾU</text>
      <text x="580" y="422" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#C93B2B">BẢN SCAN ĐKKD</text>
    </svg>`;
    return { svg, fileName: 'giay-phep-dkkd.svg' };
  }
  const sideTitle = isBack
    ? 'CĂN CƯỚC CÔNG DÂN GẮN CHIP — MẶT SAU (ĐẶC ĐIỂM NHẬN DẠNG & NGÀY CẤP)'
    : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — CĂN CƯỚC CÔNG DÂN (MẶT TRƯỚC)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">
    <rect width="720" height="440" rx="20" fill="#F4F7FB" stroke="#C5D2E3" stroke-width="2"/>
    <rect x="24" y="24" width="672" height="64" rx="10" fill="#24457A"/>
    <text x="360" y="62" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">${sideTitle}</text>
    <rect x="44" y="114" width="148" height="196" rx="10" fill="#E3EAF3" stroke="#B6C4D6"/>
    <text x="118" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#24457A">${isBack ? 'CHIP ĐIỆN TỬ' : 'ẢNH CHÂN DUNG'}</text>
    <text x="118" y="232" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#5A6878">CCCD GẮN CHIP</text>
    <text x="220" y="142" font-family="sans-serif" font-size="13" fill="#5A6878">Số Căn cước công dân / Personal ID No:</text>
    <text x="220" y="170" font-family="monospace" font-size="22" font-weight="700" fill="#2B2B2B">001201019876</text>
    <text x="220" y="208" font-family="sans-serif" font-size="14" fill="#4A4A4A">Họ và tên: <tspan font-weight="700" fill="#2B2B2B">NGUYỄN THU TRANG</tspan></text>
    <text x="220" y="238" font-family="sans-serif" font-size="14" fill="#4A4A4A">Ngày sinh: <tspan font-weight="700" fill="#2B2B2B">18/09/2001</tspan> · Giới tính: Nữ · Quốc tịch: Việt Nam</text>
    <text x="220" y="268" font-family="sans-serif" font-size="14" fill="#4A4A4A">Nơi thường trú: Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội</text>
    <text x="220" y="298" font-family="sans-serif" font-size="14" fill="#4A4A4A">Ngày cấp: <tspan font-weight="700" fill="#2B2B2B">15/05/2022</tspan> · Nơi cấp: Cục Cảnh sát QLHC về TTXH</text>
    <rect x="44" y="338" width="632" height="64" rx="8" fill="#FFFFFF" stroke="#D5DFEC"/>
    <text x="64" y="366" font-family="monospace" font-size="13" fill="#2B2B2B">IDVNM2010198761001201019876&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="64" y="388" font-family="monospace" font-size="13" fill="#24457A">NGUYEN&lt;&lt;THU&lt;TRANG&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;CLOUDFLARE&lt;R2</text>
  </svg>`;
  return { svg, fileName: isBack ? 'cccd-mat-sau.svg' : 'cccd-mat-truoc.svg' };
}

export async function GET(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    requireCondition(Boolean(actor?.id), 'Chưa xác thực phiên làm việc.', 401);

    const key = (req.nextUrl.searchParams.get('key') || '').trim();
    const download = req.nextUrl.searchParams.get('download') === '1';
    requireCondition(key.length > 0, 'Thiếu khóa tệp hồ sơ pháp lý (key).', 400);

    const demoDoc = renderDemoLegalDocSvg(key, req.nextUrl.searchParams);
    if (demoDoc) {
      const buf = Buffer.from(demoDoc.svg, 'utf8');
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Length': String(buf.byteLength),
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${demoDoc.fileName}"`,
          'Cache-Control': 'private, max-age=300',
        },
      });
    }

    const { buffer, contentType, fileName } = await readLegalDocFile(key);
    const disposition = download ? 'attachment' : 'inline';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BrandError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Không thể tải tệp CCCD / ĐKKD từ Cloudflare R2.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const actor = actorFromRequest(req);
    requireCondition(Boolean(actor?.id), 'Chưa xác thực người tải tệp.', 401);

    await ensureR2ConfigHydratedFromDb();

    const form = await req.formData();
    const file = form.get('file');
    const rawDocType = String(form.get('docType') || 'CCCD_FRONT').trim().toUpperCase() as LegalDocCategory;
    const entitySlug = String(form.get('entitySlug') || form.get('kocId') || 'koc-legal').trim();
    const customLabel = String(form.get('label') || '').trim();

    requireCondition(file instanceof File, 'Vui lòng chọn tệp CCCD hoặc Giấy phép ĐKKD để tải lên.', 400);
    const docType: LegalDocCategory = VALID_DOC_TYPES.has(rawDocType) ? rawDocType : 'CCCD_FRONT';

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const stored = await uploadLegalDocFile({
      entitySlug,
      originalName: (file as File).name,
      mimeType: (file as File).type,
      buffer,
    });

    const attachment: LegalDocAttachment = {
      id: `ldoc-${randomUUID().slice(0, 8)}`,
      docType,
      label: customLabel || DOC_TYPE_LABELS[docType],
      fileKey: stored.fileKey,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      storage: stored.storage,
      url: `/api/contracts/legal-docs?key=${encodeURIComponent(stored.fileKey)}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actor.name,
    };

    return NextResponse.json(
      {
        attachment,
        storageMode: brandFileStorageMode(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BrandError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Không thể tải tệp CCCD / ĐKKD lên Cloudflare R2. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req);
    const actor = actorFromRequest(req);
    requireCondition(Boolean(actor?.id), 'Chưa xác thực phiên làm việc.', 401);

    let key = (req.nextUrl.searchParams.get('key') || '').trim();
    if (!key) {
      const body = (await req.json().catch(() => ({}))) as { key?: string };
      key = (body.key || '').trim();
    }
    requireCondition(key.length > 0, 'Thiếu khóa tệp cần xóa.', 400);

    if (!key.startsWith('legal-docs/demo-')) {
      await deleteLegalDocFile(key);
    }

    return NextResponse.json({ ok: true, deletedKey: key }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BrandError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Không thể xóa tệp đính kèm trên Cloudflare R2.' },
      { status: 500 },
    );
  }
}
