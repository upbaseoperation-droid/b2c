import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';
import { ContractError, requireCondition } from './domain';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from './builtInTemplatesSnapshot';
import type { ContractRecord } from './types';

const local = () => !!process.env.CONTRACT_DATA_DIR || (process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres');
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.CONTRACT_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.contract-data'));

function defaultSeedRecords(): ContractRecord[] {
  const indTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-HD'];
  const sowTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-SOW'] || indTpl;
  const bbntTpl = OFFICIAL_TEMPLATES_SNAPSHOT['IND-VID-BBNT'] || indTpl;
  if (!indTpl) return [];

  const now = new Date().toISOString();
  const baseValues: Record<string, string> = {
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
    ...baseValues,
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
      ownerId: 'contract-demo-owner',
      ownerName: 'Chuyên viên Booking B2C',
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
          uploadedBy: 'Chuyên viên Booking B2C',
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
          uploadedBy: 'Chuyên viên Booking B2C',
        },
      ],
      steps: [
        { role: 'FINANCE', reviewerId: 'contract-demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Chờ kế toán soát xét ngân sách Net & khấu trừ thuế TNCN 10%' },
      ],
      values: baseValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'CREATE', note: 'Soạn thảo hợp đồng từ booking BO260757625', version: 1 },
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'SUBMIT', note: 'Mẫu chuẩn: Miễn duyệt Pháp chế', version: 1 },
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
      ownerId: 'contract-demo-owner',
      ownerName: 'Chuyên viên Booking B2C',
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
          uploadedBy: 'Chuyên viên Booking B2C',
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
          uploadedBy: 'Chuyên viên Booking B2C',
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
        { role: 'LEGAL', reviewerId: 'contract-demo-legal', reviewerName: 'Nguyễn Thị Liên (Pháp chế)', version: 1, status: 'PENDING', note: 'Thẩm định điều khoản bản quyền 45 ngày & độc quyền' },
        { role: 'FINANCE', reviewerId: 'contract-demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Chốt điều khoản tạm ứng 70% & thuế TNCN 10%' },
      ],
      values: gdocsValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'CREATE', note: 'Tạo Phụ lục SOW đàm phán qua Google Docs cho booking BO260889102', version: 1 },
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'SUBMIT', note: 'Gửi Pháp chế và Kế toán thẩm định điều khoản sửa đổi', version: 1 },
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
      ownerId: 'contract-demo-owner',
      ownerName: 'Chuyên viên Booking B2C',
      version: 1,
      revision: 1,
      approval: 'IN_REVIEW',
      steps: [
        { role: 'FINANCE', reviewerId: 'contract-demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'PENDING', note: 'Đối soát link video nghiệm thu và duyệt chi tất toán 50% còn lại' },
      ],
      values: baseValues,
      versions: [],
      signing: [],
      checks: [],
      createdAt: now,
      updatedAt: now,
      history: [
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'CREATE', note: 'Lập Biên bản nghiệm thu hoàn tất 01 video TikTok', version: 1 },
        { at: now, actorId: 'contract-demo-owner', actorName: 'Chuyên viên Booking B2C', action: 'SUBMIT', note: 'Trình Kế toán duyệt quyết toán', version: 1 },
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
      ownerId: 'contract-demo-owner',
      ownerName: 'Chuyên viên Booking B2C',
      version: 1,
      revision: 2,
      approval: 'APPROVED',
      steps: [
        { role: 'FINANCE', reviewerId: 'contract-demo-finance', reviewerName: 'Lê Thị Thu Hà (Kế toán B2C)', version: 1, status: 'APPROVED', decidedAt: now, note: 'Đã kiểm tra CCCD gốc, MST và tài khoản Techcombank hợp lệ.' },
      ],
      values: baseValues,
      versions: [],
      signing: [
        {
          documentId: 'ws-demo-000-completed',
          version: 1,
          provider: 'DEMO',
          status: 'COMPLETED',
          sourceStatus: 2,
          linkedBy: 'contract-demo-owner',
          linkedAt: now,
          syncedAt: now,
          evidenceConfirmedBy: 'contract-demo-finance',
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
        { at: now, actorId: 'contract-demo-finance', actorName: 'Lê Thị Thu Hà (Kế toán B2C)', action: 'APPROVE', note: 'Đã thẩm định Hồ sơ pháp lý & duyệt FINAL', version: 1 },
      ],
    },
  ];
}

async function localRecords(): Promise<ContractRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(path.join(directory(), 'records.json'), 'utf8'));
    if (Array.isArray(parsed) && parsed.length === 0 && !process.env.CONTRACT_DATA_DIR) {
      return defaultSeedRecords();
    }
    return parsed;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return process.env.CONTRACT_DATA_DIR ? [] : defaultSeedRecords();
    }
    throw e;
  }
}

export async function listContracts(): Promise<ContractRecord[]> {
  if (local()) return localRecords();
  try {
    const rows = await prisma.$queryRaw<Array<{ data: ContractRecord }>>`SELECT data FROM "ContractHubRecord" ORDER BY "updatedAt" DESC`;
    return rows.map(r => r.data);
  } catch {
    return localRecords().catch(() => []);
  }
}

export async function getContract(id: string) {
  const record = (await listContracts()).find(r => r.id === id);
  requireCondition(record, 'Không tìm thấy hồ sơ.', 404);
  return record;
}

export async function saveContract(record: ContractRecord, expected?: number) {
  const next = structuredClone(record);
  next.revision = expected === undefined ? 1 : expected + 1;
  if (!local()) {
    await prisma.$transaction(async tx => {
      for (const attempt of next.signing) {
        const binding = await tx.$queryRaw<Array<{ contractId: string }>>`SELECT "contractId" FROM "ContractWeSignBinding" WHERE "documentId"=${attempt.documentId}`;
        requireCondition(!binding.length || binding[0].contractId === next.id, 'Luồng weSign đã liên kết hồ sơ khác.', 409);
        if (!binding.length) await tx.$executeRaw`INSERT INTO "ContractWeSignBinding" ("documentId", "contractId") VALUES (${attempt.documentId}, ${next.id})`;
      }
      if (expected === undefined) await tx.$executeRaw`INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt") VALUES (${next.id}, 1, ${JSON.stringify(next)}::jsonb, NOW())`;
      else {
        const count = await tx.$executeRaw`UPDATE "ContractHubRecord" SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE id=${next.id} AND revision=${expected}`;
        requireCondition(count === 1, 'Hồ sơ đã được người khác cập nhật. Vui lòng tải lại.', 409);
      }
    });
    return next;
  }
  await mkdir(directory(), { recursive: true });
  let lock;
  try {
    lock = await open(path.join(directory(), 'records.lock'), 'wx');
  } catch {
    throw new ContractError('Hồ sơ đang được cập nhật. Vui lòng thử lại.', 409);
  }
  const temp = path.join(directory(), `${randomUUID()}.tmp`);
  try {
    const records = await localRecords();
    const index = records.findIndex(r => r.id === next.id);
    requireCondition(!records.some(r => r.id !== next.id && r.signing.some(s => next.signing.some(n => n.documentId === s.documentId))), 'Luồng weSign đã liên kết hồ sơ khác.', 409);
    requireCondition(expected === undefined ? index < 0 : index >= 0 && records[index].revision === expected, 'Hồ sơ đã được người khác cập nhật. Vui lòng tải lại.', 409);
    if (index < 0) records.push(next);
    else records[index] = next;
    await writeFile(temp, JSON.stringify(records), { mode: 0o600 });
    await rename(temp, path.join(directory(), 'records.json'));
    return next;
  } finally {
    await lock.close();
    await unlink(path.join(directory(), 'records.lock'));
    await unlink(temp).catch(() => undefined);
  }
}

export const storageMode = () => (local() ? 'LOCAL_DEVELOPMENT' : 'POSTGRES');
