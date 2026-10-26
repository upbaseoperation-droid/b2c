import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/contracts/route';
import { POST as demoRolePOST } from '../src/app/api/contracts/demo/route';
import { GET as documentGET } from '../src/app/api/contracts/[id]/document/route';
import { POST as ocrExtractPOST } from '../src/app/api/ocr/extract-legal-doc/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { loadTemplate, resolveTemplateDir } from '../src/lib/contracts/templates';
import { prefill, templateFor, uniqueFields } from '../src/components/contracts/contractUi';
import { evaluateContractRules } from '../src/lib/contracts/contractRules';
import { browserDemoRequest, disableBrowserDemo } from '../src/components/contracts/browserDemo';
import type { ContractRecord, LegalTemplate } from '../src/lib/contracts/types';
import type { BookingDealItem, KocItem } from '../src/lib/types';

const origin = 'http://localhost:3000';

function makeRequest(actorId: string, body?: unknown, pathname = '/api/contracts') {
  const headers: Record<string, string> = { origin };
  if (actorId) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken({
      id: actorId,
      name: actorId,
      email: `${actorId}@upbase.vn`,
      avatar: 'KT',
      role: 'BOOKING_MEMBER',
      roleTitle: 'Kiểm thử E2E',
      loginProvider: 'SANDBOX',
    })}`;
  }
  return new NextRequest(origin + pathname, {
    headers,
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
}

test('E2E UI/UX Flow 1: Prefill từ Deal/KOC + OCR giấy tờ + Miễn duyệt Pháp chế + Ký số + Kế thừa lập BBNT', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'contract-e2e-flow1-'));
  const oldDirectory = process.env.CONTRACT_DATA_DIR;
  process.env.CONTRACT_DATA_DIR = directory;

  try {
    // 1. Kiểm tra OCR trích xuất giấy tờ pháp lý (CCCD, HKD, Công ty)
    const ocrReq = makeRequest(
      'contract-demo-owner',
      { presetKey: 'CCCD_INDIVIDUAL' },
      '/api/ocr/extract-legal-doc',
    );
    const ocrRes = await ocrExtractPOST(ocrReq);
    assert.equal(ocrRes.status, 200);
    const ocrJson = await ocrRes.json();
    assert.equal(ocrJson.success, true);
    assert.equal(ocrJson.data.fields.fullName, 'NGUYỄN THU TRANG');
    assert.equal(ocrJson.data.fields.idNumber, '001201019876');

    // 2. Chọn mẫu tự động & Prefill từ KOC + Deal
    const sampleKoc: KocItem = {
      id: 'koc-e2e-01',
      channelId: '@thutrang.beauty',
      stageName: 'Thu Trang Beauty',
      realName: ocrJson.data.fields.fullName,
      cccd: ocrJson.data.fields.idNumber,
      issueDate: ocrJson.data.fields.issueDate,
      issuePlace: ocrJson.data.fields.issuePlace,
      permanentAddress: ocrJson.data.fields.permanentAddress,
      phone: '0987654321',
      email: 'thutrang@creator.vn',
      category: 'Skincare',
      followerCount: 150000,
      engagementRate: 4.5,
    };
    const sampleDeal: BookingDealItem = {
      id: 'deal-e2e-01',
      dealCode: 'BO260999',
      kocId: sampleKoc.id,
      kocStageName: sampleKoc.stageName,
      kocChannelId: sampleKoc.channelId,
      brandName: 'Kutieskin',
      productName: 'Kem mẩn ngứa Kutieskin 30g',
      bookingFormat: 'Video TikTok',
      committedOutputsCount: 2,
      totalValue: 18_000_000,
      advanceAmount: 9_000_000,
      salaryGrade: 'S1',
      status: 'ĐÃ_CHỐT_GIÁ',
      pic: 'Lê Phương Thảo',
    };

    const chosenTplId = templateFor(sampleKoc, 'CONTRACT', sampleDeal);
    assert.equal(chosenTplId, 'IND-HD');

    const { template: indHd } = await loadTemplate('IND-HD');
    const hdFields = uniqueFields(indHd);
    const prefilledHd = prefill(hdFields, {}, { koc: sampleKoc, deal: sampleDeal });
    // Đảm bảo điền đủ các trường bắt buộc từ hồ sơ KOC + Deal
    for (const f of hdFields.filter(x => x.required)) {
      if (!prefilledHd.values[f.key]?.trim()) {
        prefilledHd.values[f.key] = 'Giá trị bổ sung';
      }
    }

    // 3. Tạo hợp đồng trên máy chủ
    const createRes = await POST(
      makeRequest('contract-demo-owner', {
        action: 'CREATE',
        title: 'Hợp đồng video · Thu Trang Beauty · Kutieskin',
        brand: 'Kutieskin',
        partner: sampleKoc.realName,
        templateId: 'IND-HD',
        values: prefilledHd.values,
        dealId: sampleDeal.id,
        dealCode: sampleDeal.dealCode,
        kocId: sampleKoc.id,
        hasCustomTerms: false,
      }),
    );
    assert.equal(createRes.status, 200);
    let contract: ContractRecord = (await createRes.json()).record;
    assert.equal(contract.approval, 'DRAFT');

    // 4. Gửi duyệt theo Luồng 1 (Mẫu chuẩn không sửa điều khoản -> Miễn duyệt Pháp chế, chỉ cần Kế toán)
    const submitRes = await POST(
      makeRequest('contract-demo-owner', {
        id: contract.id,
        revision: contract.revision,
        action: 'SUBMIT',
        reviewers: ['contract-demo-finance'],
        requireLegal: false,
      }),
    );
    assert.equal(submitRes.status, 200);
    contract = (await submitRes.json()).record;
    assert.equal(contract.approval, 'IN_REVIEW');
    assert.equal(contract.steps.length, 1);
    assert.equal(contract.steps[0].role, 'FINANCE');

    // 5. Thêm ghi chú đàm phán (ADD_NOTE)
    const noteRes = await POST(
      makeRequest('contract-demo-owner', {
        id: contract.id,
        revision: contract.revision,
        action: 'ADD_NOTE',
        note: 'KOC xác nhận giữ giỏ hàng vàng 30 ngày và cấp mã Spark Ads 60 ngày.',
      }),
    );
    assert.equal(noteRes.status, 200);
    contract = (await noteRes.json()).record;
    assert.ok(contract.history.some(h => h.action === 'NOTE' && h.note.includes('Spark Ads 60 ngày')));

    // 6. Kế toán duyệt -> Hợp đồng chuyển thẳng sang APPROVED
    const approveRes = await POST(
      makeRequest('contract-demo-finance', {
        id: contract.id,
        revision: contract.revision,
        action: 'DECIDE',
        decision: 'APPROVED',
        note: 'Đã đối soát khớp hạn mức Net và khấu trừ 10% thuế TNCN.',
      }),
    );
    assert.equal(approveRes.status, 200);
    contract = (await approveRes.json()).record;
    assert.equal(contract.approval, 'APPROVED');

    // 7. Điều phối ký bắt đầu ký số & hoàn tất 2 bên ký
    for (const signAction of ['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_NEXT']) {
      const signRes = await POST(
        makeRequest('contract-demo-sign', {
          id: contract.id,
          revision: contract.revision,
          action: signAction,
        }),
      );
      assert.equal(signRes.status, 200);
      contract = (await signRes.json()).record;
    }
    assert.equal(contract.signing.at(-1)?.status, 'COMPLETED');

    // 8. Lập Biên bản nghiệm thu (IND-BBNT) kế thừa trực tiếp từ Hợp đồng gốc (kể cả khi không truyền deal/koc)
    const ruleEvalBbnt = evaluateContractRules({
      koc: sampleKoc,
      deal: sampleDeal,
      kind: 'ACCEPTANCE',
      totalValue: sampleDeal.totalValue,
    });
    assert.equal(ruleEvalBbnt.recommendedTemplateId, 'IND-BBNT');
    assert.ok(ruleEvalBbnt.recommendedTemplateName.includes('Nghiệm thu'));

    const { template: indBbnt } = await loadTemplate('IND-BBNT');
    const bbntFields = uniqueFields(indBbnt);
    const inheritedBbnt = prefill(bbntFields, {}, {
      parentRecord: contract,
      parentFields: hdFields,
    });

    // Kiểm tra các trường Bên B trên BBNT đã tự động kế thừa từ Hợp đồng gốc
    const partyFieldOnBbnt = bbntFields.find(f => f.source === 'partyName');
    assert.ok(partyFieldOnBbnt);
    assert.equal(inheritedBbnt.values[partyFieldOnBbnt.key], 'NGUYỄN THU TRANG');
    assert.equal(inheritedBbnt.values['token:[ID KOC]'], contract.values['token:[ID KOC]']);

    for (const f of bbntFields.filter(x => x.required)) {
      if (!inheritedBbnt.values[f.key]?.trim()) {
        inheritedBbnt.values[f.key] = 'Đã nghiệm thu đạt';
      }
    }

    const createBbntRes = await POST(
      makeRequest('contract-demo-owner', {
        action: 'CREATE',
        title: 'Nghiệm thu video · Thu Trang Beauty · Kutieskin',
        brand: contract.brand,
        partner: contract.partner,
        templateId: 'IND-BBNT',
        parentId: contract.id,
        values: inheritedBbnt.values,
        dealId: sampleDeal.id,
        dealCode: sampleDeal.dealCode,
        kocId: sampleKoc.id,
      }),
    );
    assert.equal(createBbntRes.status, 200);
    const bbntRecord: ContractRecord = (await createBbntRes.json()).record;
    assert.equal(bbntRecord.parentId, contract.id);
    assert.equal(bbntRecord.templateId, 'IND-BBNT');
  } finally {
    if (oldDirectory === undefined) delete process.env.CONTRACT_DATA_DIR;
    else process.env.CONTRACT_DATA_DIR = oldDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});

test('E2E UI/UX Flow 2: Tải hợp đồng riêng của KOC (.docx) -> Pháp chế duyệt & Lưu thành Mẫu riêng KOC_CUSTOM', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'contract-e2e-flow2-'));
  const oldDirectory = process.env.CONTRACT_DATA_DIR;
  process.env.CONTRACT_DATA_DIR = directory;

  try {
    let sampleDocxBuffer: Buffer;
    try {
      sampleDocxBuffer = await readFile(
        path.join(resolveTemplateDir(), '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx'),
      );
    } catch {
      const { zip } = await loadTemplate('IND-HD');
      sampleDocxBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    }
    const base64Docx = sampleDocxBuffer.toString('base64');

    // 1. Tạo hợp đồng bằng file .docx riêng của KOC (isKocOwnForm: true)
    const createRes = await POST(
      makeRequest('contract-demo-owner', {
        action: 'CREATE',
        title: 'Hợp đồng KOC riêng · Võ Hà Linh · ClubClio',
        brand: 'ClubClio',
        partner: 'Võ Hà Linh Official',
        templateId: 'IND-HD',
        kocId: 'koc-halinh-vip',
        dealCode: 'BO260888',
        isKocOwnForm: true,
        customFilename: 'HD-VoHaLinh-Agency-2026.docx',
        customFileBase64: base64Docx,
        customTermsSummary: 'Thanh toán 100% trong 7 ngày sau khi đăng video; giữ link 30 ngày.',
        values: {
          'token:[Tổng tiền trước thuế/sau thuế]': '65.000.000',
        },
      }),
    );
    assert.equal(createRes.status, 200);
    let record: ContractRecord = (await createRes.json()).record;
    assert.equal(record.isKocOwnForm, true);
    assert.equal(record.hasCustomTerms, true);
    assert.equal(record.customFile?.filename, 'HD-VoHaLinh-Agency-2026.docx');

    // 2. Gửi duyệt hồ sơ KOC riêng: nếu thiếu Pháp chế phải bị chặn 400
    const submitNoLegal = await POST(
      makeRequest('contract-demo-owner', {
        id: record.id,
        revision: record.revision,
        action: 'SUBMIT',
        reviewers: ['contract-demo-finance'],
      }),
    );
    assert.equal(submitNoLegal.status, 400);

    // Gửi duyệt đúng luồng Pháp chế + Kế toán
    const submitOk = await POST(
      makeRequest('contract-demo-owner', {
        id: record.id,
        revision: record.revision,
        action: 'SUBMIT',
        reviewers: ['contract-demo-legal', 'contract-demo-finance'],
      }),
    );
    assert.equal(submitOk.status, 200);
    record = (await submitOk.json()).record;
    assert.equal(record.steps.length, 2);

    // 3. Pháp chế duyệt và tích chọn "Lưu làm Mẫu hợp đồng đã duyệt cho KOC" (saveAsKocTemplate: true)
    const legalApprove = await POST(
      makeRequest('contract-demo-legal', {
        id: record.id,
        revision: record.revision,
        action: 'DECIDE',
        decision: 'APPROVED',
        note: 'Đồng ý biểu mẫu riêng của Võ Hà Linh (Tổng HĐ >= 50M theo BR-01).',
        saveAsKocTemplate: true,
        kocLegalNotes: 'Chú ý: Thanh toán trong 7 ngày làm việc, không phạt chậm quá 8%/năm.',
      }),
    );
    assert.equal(legalApprove.status, 200);
    record = (await legalApprove.json()).record;

    // 4. Kiểm tra danh mục biểu mẫu đã có mẫu KOC_CUSTOM cho koc-halinh-vip
    const bootRes = await GET(makeRequest('contract-demo-owner'));
    assert.equal(bootRes.status, 200);
    const bootData = await bootRes.json();
    const savedCustomTpl = (bootData.templates as LegalTemplate[]).find(
      t => t.scope === 'KOC_CUSTOM' && t.kocId === 'koc-halinh-vip',
    );
    assert.ok(savedCustomTpl, 'Mẫu KOC_CUSTOM phải được tự động lưu vào danh mục sau khi Pháp chế duyệt');
    assert.equal(savedCustomTpl.exemptLegalReview, true);
    assert.ok(savedCustomTpl.legalNotes?.includes('Thanh toán trong 7 ngày'));

    // Lần booking tiếp theo của KOC này tự động chọn mẫu đã duyệt riêng
    const nextTplId = templateFor(
      {
        id: 'koc-halinh-vip',
        channelId: '@halinh',
        stageName: 'Võ Hà Linh',
        category: 'Beauty',
        followerCount: 2000000,
        engagementRate: 8,
      },
      'CONTRACT',
      undefined,
      bootData.templates,
    );
    assert.equal(nextTplId, savedCustomTpl.id);

    // 5. Xem preview và tải file .docx gốc của KOC
    const previewRes = await documentGET(
      makeRequest('contract-demo-owner', undefined, `/api/contracts/${record.id}/document?preview=1`),
      { params: Promise.resolve({ id: record.id }) },
    );
    assert.equal(previewRes.status, 200);
    const previewJson = await previewRes.json();
    assert.ok(previewJson.paragraphs.length > 5);
    assert.equal(previewJson.values['token:[Tổng tiền trước thuế/sau thuế]'], '65.000.000');
  } finally {
    if (oldDirectory === undefined) delete process.env.CONTRACT_DATA_DIR;
    else process.env.CONTRACT_DATA_DIR = oldDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});

test('E2E UI/UX Flow 3: Chuyển đổi vai trò kiểm thử (/api/contracts/demo) & Đồng bộ Browser Demo', async () => {
  // 1. Chuyển sang vai trò Pháp chế qua endpoint /api/contracts/demo
  const switchReq = new NextRequest(origin + '/api/contracts/demo', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'contract-demo-legal' }),
  });
  const switchRes = await demoRolePOST(switchReq);
  assert.equal(switchRes.status, 200);
  const setCookieHeader = switchRes.headers.get('set-cookie') || '';
  assert.ok(setCookieHeader.includes(SESSION_COOKIE_NAME));

  // 2. Kiểm tra Browser Demo hỗ trợ đầy đủ ADD_NOTE, saveAsKocTemplate và renderParagraphs
  disableBrowserDemo();
  try {
    browserDemoRequest('/api/contracts/demo', { id: 'demo-owner' });
    const created = browserDemoRequest<{ record: ContractRecord }>('/api/contracts', {
      action: 'CREATE',
      templateId: 'IND-HD',
      title: 'Hợp đồng kiểm thử Browser Demo',
      brand: 'Kutieskin',
      partner: 'Nguyễn Văn KOC',
      kocId: 'koc-demo-99',
      hasCustomTerms: true,
      customTermsSummary: 'Sửa điều khoản thanh toán đợt 1',
      values: {
        'token:[dd.mm.yy]': '20.10.26',
        'token:[ID KOC]': 'kocdemo99',
        'word/document.xml:p36:cell': 'Nguyễn Văn KOC',
      },
    }).record;

    // ADD_NOTE trong Browser Demo
    const withNote = browserDemoRequest<{ record: ContractRecord }>('/api/contracts', {
      id: created.id,
      revision: created.revision,
      action: 'ADD_NOTE',
      note: 'Ghi chú đàm phán trong chế độ giả lập trình duyệt',
    }).record;
    assert.ok(withNote.history.some(h => h.action === 'NOTE' && h.note.includes('chế độ giả lập')));

    // Kiểm tra preview paragraphs có chứa tên đối tác đã điền
    const docPreview = browserDemoRequest<{ paragraphs: string[] }>(
      `/api/contracts/${created.id}/document?preview=1`,
    );
    assert.ok(
      docPreview.paragraphs.some(p => p.includes('Nguyễn Văn KOC') || p.includes('kocdemo99')),
      'renderParagraphs trong Browser Demo phải điền giá trị thực tế vào đoạn văn bản',
    );
  } finally {
    disableBrowserDemo();
  }
});
