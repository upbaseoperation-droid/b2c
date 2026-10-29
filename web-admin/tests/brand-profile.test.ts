import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { UserProfile } from '../src/lib/types';
import { applySection, parseSection, permissionsFor, viewRightsFor } from '../src/lib/brands/domain';
import { brandKey, emptyProfile } from '../src/lib/brands/types';

const user = (role: UserProfile['role'], name = 'Người dùng'): UserProfile => ({ id: name, name, email: '', role, roleTitle: '', avatar: '' });

test('Phân quyền theo mục: nội bộ sửa nội dung; Pháp lý và Trần thù lao chỉ lãnh đạo và PIC gian hàng sửa', () => {
  const lead = permissionsFor(user('MANAGER'));
  assert.ok(Object.values(lead).every(Boolean));

  // Nhân sự nội bộ không phải PIC gian của nhãn: sửa nội dung, không sửa Pháp lý / Trần thù lao
  const internalOther = permissionsFor(user('BOOKING_MEMBER', 'Lê Phương Thảo'), 'Phương Thảo', 'Senka');
  assert.equal(internalOther.POSITIONING, true); assert.equal(internalOther.PRODUCTS, true); assert.equal(internalOther.DOCUMENTS, true);
  assert.equal(internalOther.LEGAL, false); assert.equal(internalOther.RATECARD, false);
  // Vẫn xem được để làm việc
  assert.deepEqual(viewRightsFor(user('BOOKING_MEMBER', 'Lê Phương Thảo'), 'Senka'), { LEGAL: true, RATECARD: true });

  // PIC gian hàng của nhãn: sửa được cả Pháp lý và Trần thù lao
  const storePic = permissionsFor(user('BOOKING_MEMBER', 'Phương Thảo'), 'phương thảo', 'Senka', true);
  assert.ok(Object.values(storePic).every(Boolean));

  const partnerOwn: UserProfile = { ...user('BRAND_PARTNER', 'Đại diện Senka'), partnerType: 'BRAND', assignedBrands: ['Senka'] };
  const partnerOwnPerms = permissionsFor(partnerOwn, 'Phương Thảo', 'Senka');
  assert.equal(partnerOwnPerms.POSITIONING, true);
  assert.equal(partnerOwnPerms.LEGAL, true);
  assert.equal(partnerOwnPerms.RATECARD, false);
  assert.equal(viewRightsFor(partnerOwn, 'Senka').RATECARD, false);
  const partnerOtherPerms = permissionsFor(partnerOwn, 'Phương Thảo', 'ClubClio');
  assert.ok(Object.values(partnerOtherPerms).every(v => v === false));
  assert.ok(Object.values(permissionsFor(null)).every(v => v === false));
});

test('PIC gian hàng của nhãn nhận theo vị trí trên gian (Booking chính, cùng làm, Trưởng nhóm) trong Dữ liệu gốc', async () => {
  const { isStorePicOfBrand } = await import('../src/lib/storePositions');
  const stores = [
    { brandName: 'Senka', storeName: 'Senka_TikTok', primaryPic: 'Lê Phương Thảo', b2cOwners: ['Lê Phương Thảo', 'Trần Vy'], bookingLeader: 'Nguyễn Hà', hasBookingLeader: true },
    { brandName: 'ClubClio', storeName: 'ClubClio_Shopee', primaryPic: 'Đào An' },
  ] as unknown as Parameters<typeof isStorePicOfBrand>[2];
  const person = (name: string) => ({ id: name, name });
  assert.equal(isStorePicOfBrand(person('Lê Phương Thảo'), 'Senka', stores), true);
  assert.equal(isStorePicOfBrand(person('Trần Vy'), 'Senka', stores), true);
  assert.equal(isStorePicOfBrand(person('Nguyễn Hà'), 'Senka', stores), true);
  assert.equal(isStorePicOfBrand(person('Đào An'), 'Senka', stores), false);
  assert.equal(isStorePicOfBrand(person('Đào An'), 'ClubClio', stores), true);
});

test('Làm sạch dữ liệu gửi lên: bỏ dòng trống, kiểm tra MST, chỉ nhận link http(s), giữ đủ 7 khung lương', () => {
  const p = emptyProfile('Senka');
  const products = parseSection('PRODUCTS', { products: [{ name: 'Perfect Whip', priceVnd: '115.000', pdpUrl: 'javascript:alert(1)', usps: 'Bọt mịn\n\nLàm sạch sâu' }, { name: '' }] }, 'A', p).products!;
  assert.equal(products.length, 1);
  assert.equal(products[0].priceVnd, 115000);
  assert.equal(products[0].pdpUrl, '');
  assert.deepEqual(products[0].usps, ['Bọt mịn', 'Làm sạch sâu']);
  assert.throws(() => parseSection('ENTITY', { taxCode: '12ab' }, 'A', p));
  assert.equal(parseSection('ENTITY', { taxCode: '0101234567-001' }, 'A', p).entity!.taxCode, '0101234567-001');
  const ratecard = parseSection('RATECARD', { ratecard: [{ grade: 'KL3', maxBudget: 3500000 }, { grade: 'KL9', maxBudget: 1 }] }, 'A', p).ratecard!;
  assert.equal(ratecard.length, 7);
  assert.equal(ratecard.find(r => r.grade === 'KL3')!.maxBudget, 3500000);
  assert.equal(ratecard.find(r => r.grade === 'KL1')!.maxBudget, undefined);
});

test('Lưu ghi lịch sử và từ chối ghi đè khi revision cũ', async () => {
  process.env.BRAND_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'brand-'));
  const { saveProfile, listProfiles } = await import('../src/lib/brands/store');
  const base = emptyProfile('Nhãn Kiểm Thử');
  const first = await saveProfile(applySection(base, 'POSITIONING', parseSection('POSITIONING', { slogan: 'Sạch sâu' }, 'Thảo', base), 'Thảo'), 0);
  assert.equal(first.revision, 1);
  assert.equal(first.history[0].actorName, 'Thảo');
  await assert.rejects(saveProfile(applySection(base, 'POSITIONING', {}, 'Vy'), 0));
  // Bản bị từ chối không được lọt vào cache đọc
  const afterReject = (await listProfiles()).find(x => x.key === brandKey('Nhãn Kiểm Thử'))!;
  assert.equal(afterReject.revision, 1);
  assert.equal(afterReject.history[0].actorName, 'Thảo');
  const second = await saveProfile(applySection(first, 'FAQS', parseSection('FAQS', { faqs: [{ question: 'Có kích ứng không?', answer: 'Đã kiểm nghiệm da liễu' }] }, 'Vy', first), 'Vy'), 1);
  assert.equal(second.revision, 2);
  const stored = (await listProfiles()).find(x => x.key === brandKey('Nhãn Kiểm Thử'))!;
  assert.equal(stored.faqs.length, 1);
  assert.equal(stored.positioning!.slogan, 'Sạch sâu');
});

test('Tải lên, đọc, xóa tệp thương hiệu và ký xác thực Cloudflare R2 (AWS Signature V4)', async () => {
  process.env.BRAND_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'brand-files-'));
  const {
    validateAndSanitizeFile,
    buildBrandFileKey,
    assertValidBrandFileKey,
    signR2Request,
    uploadBrandFile,
    readBrandFile,
    deleteBrandFile,
  } = await import('../src/lib/brands/r2');

  // Kiểm tra lọc định dạng tệp và làm sạch tên
  const valid = validateAndSanitizeFile('Bộ Quy Chuẩn Thương Hiệu Đợt 1.pdf', 1024);
  assert.equal(valid.safeName, 'Bo-Quy-Chuan-Thuong-Hieu-Dot-1.pdf');
  assert.equal(valid.contentType, 'application/pdf');
  assert.throws(() => validateAndSanitizeFile('malware.exe', 512));

  // Kiểm tra tạo và xác thực khóa tệp
  const key = buildBrandFileKey('Club Clio', valid.safeName, new Date('2026-10-14T00:00:00Z'));
  assert.match(key, /^brands\/club-clio\/2026-10\/[0-9a-f]{8}-Bo-Quy-Chuan-Thuong-Hieu-Dot-1\.pdf$/);
  assert.equal(assertValidBrandFileKey(key), key);
  assert.throws(() => assertValidBrandFileKey('brands/club-clio/../../etc/passwd'));

  // Kiểm tra ký yêu cầu Cloudflare R2 theo chuẩn AWS Signature V4
  const signed = signR2Request({
    method: 'PUT',
    config: {
      accountId: 'acc123',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      bucket: 'upbase-b2c-brands',
      endpoint: 'https://acc123.r2.cloudflarestorage.com',
    },
    key,
    body: Buffer.from('hello r2'),
    contentType: 'application/pdf',
    now: new Date('2026-10-14T01:40:00Z'),
  });
  assert.ok(signed.url.startsWith('https://acc123.r2.cloudflarestorage.com/upbase-b2c-brands/brands/club-clio/2026-10/'));
  assert.match(signed.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20261014\/auto\/s3\/aws4_request/);

  // Kiểm tra lưu trữ, đọc và xóa tệp và lưu vào mục DOCUMENTS / LEGAL của hồ sơ thương hiệu
  const payload = Buffer.from('%PDF-1.4 brand guideline content');
  const uploaded = await uploadBrandFile({
    brandName: 'Senka',
    originalName: 'Guideline Senka 2026.pdf',
    mimeType: 'application/pdf',
    buffer: payload,
  });
  assert.equal(uploaded.storage, 'LOCAL');
  assert.ok(uploaded.url.startsWith('/api/brands/files?key='));

  const readBack = await readBrandFile(uploaded.fileKey);
  assert.deepEqual(readBack.buffer, payload);
  assert.equal(readBack.contentType, 'application/pdf');

  const p = emptyProfile('Senka');
  const docs = parseSection('DOCUMENTS', {
    documents: [{
      title: 'Guideline Senka 2026',
      category: 'GUIDELINE',
      url: uploaded.url,
      note: 'Bản chính thức Q4',
      fileKey: uploaded.fileKey,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
      storage: uploaded.storage,
    }],
  }, 'Phương Thảo', p).documents!;
  assert.equal(docs.length, 1);
  assert.equal(docs[0].fileKey, uploaded.fileKey);
  assert.equal(docs[0].fileSize, payload.byteLength);
  assert.equal(docs[0].url, uploaded.url);

  await deleteBrandFile(uploaded.fileKey);
  await assert.rejects(readBrandFile(uploaded.fileKey));
});

test('Hồ sơ khởi tạo cho 42 thương hiệu chỉ gồm dữ liệu có nguồn thật, không có văn mẫu tự sinh', async () => {
  const { getFallbackProfiles } = await import('../src/lib/brands/store');
  const { buildRows } = await import('../src/components/brands/brandUi');
  const { REAL_B2C_42_BRANDS } = await import('../src/lib/realB2cBrandsData');
  const profiles = getFallbackProfiles();
  assert.ok(profiles.length >= 42, `Cần ít nhất 42 hồ sơ thương hiệu B2C, thực tế: ${profiles.length}`);
  const rows = buildRows(REAL_B2C_42_BRANDS, profiles).filter(r => REAL_B2C_42_BRANDS.some(b => b.name === r.name));
  assert.equal(rows.length, 42);
  for (const row of rows) {
    const p = row.profile;
    assert.equal(p.positioning, undefined, `${row.name} còn định vị tự sinh`);
    assert.equal(p.entity?.taxCode || '', '', `${row.name} còn mã số thuế tự sinh`);
    assert.equal(p.products.length, 0, `${row.name} còn SKU tự sinh`);
    assert.equal(p.contentRules, undefined, `${row.name} còn từ cấm tự sinh`);
    assert.equal(p.faqs.length + p.legal.length + p.ratecard.length, 0, `${row.name} còn FAQ / pháp lý / ratecard tự sinh`);
    assert.ok(p.documents.every(d => /^doc-(canva|sheet|ops|handover)-/.test(d.id)), `${row.name} còn tài liệu tự sinh`);
    assert.equal(p.history.length, 0, `${row.name} còn lịch sử giả`);
    assert.equal(p.updatedBy, '');
    assert.ok(p.workflowRules, `${row.name} thiếu quy tắc vận hành mặc định`);
    assert.ok(row.done < 8, `${row.name} không được tính đủ 8/8 khi chưa ai nhập`);
  }
});

test('Gỡ văn mẫu khỏi hồ sơ đã lưu: chưa ai sửa thì về bản thật; đã sửa thì giữ phần người nhập', async () => {
  const { stripGeneratedContent } = await import('../src/lib/brands/store');
  const real = { ...emptyProfile('Senka'), revision: 1, documents: [{ id: 'doc-canva-senka', title: 'Canva', category: 'BRIEF' as const, url: 'https://canva.com/x', note: '', addedBy: '', addedAt: '' }] };
  const legacy = {
    ...real,
    updatedBy: 'Nguyễn Đức Mạnh',
    updatedAt: '2026-10-04T09:00:00.000Z',
    positioning: { slogan: 'Sản phẩm chính hãng từ Senka', story: 'Mẫu', toneOfVoice: 'Mẫu', targetAudience: 'Mẫu', bigIdea: 'Mẫu big idea', painPoints: ['Nỗi đau mẫu 1', 'Nỗi đau mẫu 2'] },
    entity: { companyName: 'Công ty mẫu', taxCode: '0100007919', contactPerson: 'A', originCountry: 'Nhật Bản' },
    ratecard: [{ grade: 'KL1', maxBudget: 800000 }],
    documents: [...real.documents, { id: 'doc-guide-senka', title: 'Guideline giả', category: 'GUIDELINE' as const, url: 'https://cdn.upbase.vn/x.pdf', note: '', addedBy: '', addedAt: '' }],
    history: [{ at: '2026-10-04T09:00:00.000Z', actorName: 'Nguyễn Đức Mạnh', section: 'POSITIONING' as const, summary: 'Khởi tạo hồ sơ thương hiệu Senka từ Dữ liệu gốc phòng B2C' }],
  };

  // Bản ghi lấy lại từ Postgres: khóa bị sắp lại thứ tự vẫn phải nhận ra là seed
  const reorder = (v: unknown): unknown => Array.isArray(v) ? v.map(reorder) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reorder(x)])) : v;
  const fromDb = reorder(legacy) as typeof legacy;
  const untouched = stripGeneratedContent({ ...fromDb, revision: 1 }, legacy, real);
  assert.equal(untouched.positioning, undefined);
  assert.equal(untouched.updatedBy, '');
  assert.deepEqual(untouched.documents.map(d => d.id), ['doc-canva-senka']);

  const edited = {
    ...legacy,
    revision: 3,
    positioning: { ...legacy.positioning, slogan: 'Bọt mịn, sạch sâu', painPoints: ['Nỗi đau mẫu 1', 'Da dầu bí tắc'] },
    history: [{ at: '2026-10-20T09:00:00.000Z', actorName: 'Thảo', section: 'POSITIONING' as const, summary: 'Sửa slogan' }, ...legacy.history],
  };
  const cleaned = stripGeneratedContent(edited, legacy, real);
  assert.equal(cleaned.revision, 3);
  assert.equal(cleaned.positioning!.slogan, 'Bọt mịn, sạch sâu');
  assert.equal(cleaned.positioning!.bigIdea, undefined);
  assert.equal(cleaned.positioning!.story, undefined);
  assert.deepEqual(cleaned.positioning!.painPoints, ['Da dầu bí tắc']);
  assert.equal(cleaned.entity!.taxCode, undefined);
  assert.deepEqual(cleaned.ratecard, []);
  assert.deepEqual(cleaned.documents.map(d => d.id), ['doc-canva-senka']);
  assert.deepEqual(cleaned.history.map(h => h.actorName), ['Thảo']);
});

test('Hồ sơ tháng: deal tính theo tháng plan, tháng không có dữ liệu để trống, không suy diễn', async () => {
  const { buildStoreMonthlyPlanReport, buildBrandMonthlyPlanReport, dealPlanMonth } = await import('../src/lib/monthlyProfileMetrics');
  const { INITIAL_DEALS } = await import('../src/lib/mockData');
  assert.equal(dealPlanMonth({ campaignCode: 'PLAN-202611' }), '2026/11');
  assert.equal(dealPlanMonth({ campaignCode: 'CAMP-SENKA-W2' }), undefined);

  const store = { id: 'st-test', storeName: 'NhanThu_TikTok', brandName: 'Nhãn Thử', platform: 'TikTok', budgetNet: 0 } as never;
  const deal = (id: string, month: string, cost: number) => ({
    ...INITIAL_DEALS[0], id, dealCode: id, campaignCode: `PLAN-${month.replace('/', '')}`, storeName: 'NhanThu_TikTok', storeId: 'st-test',
    brandName: 'Nhãn Thử', status: 'BOOKED', kocFee: cost, totalValue: cost,
  }) as never;
  const deals = [deal('D10', '2026/10', 1_000_000), deal('D11', '2026/11', 2_000_000), { ...(deal('M1', '2026/10', 5_000_000) as object), campaignCode: 'CAMP-MOCK' } as never];

  const oct = buildStoreMonthlyPlanReport(store, '2026/10', { deals, plans: [] as never });
  const nov = buildStoreMonthlyPlanReport(store, '2026/11', { deals, plans: [] as never });
  assert.deepEqual(oct.bookings.map(b => b.dealCode), ['D10']);
  assert.deepEqual(nov.bookings.map(b => b.dealCode), ['D11']);
  assert.ok(oct.reportSpentNet > 0 && nov.reportSpentNet > 0);
  assert.equal(oct.isUnbudgetedSpend, true);
  assert.equal(oct.isOverbudget, false);

  const aug = buildBrandMonthlyPlanReport('Nhãn Thử', [store], '2026/08', { deals, plans: [] as never });
  assert.equal(aug.hasData, false);
  assert.equal(aug.reportSpentNet, 0);
  assert.equal(aug.reportBookedCount, 0);
  assert.equal(aug.planBudgetNet, 0);
  assert.equal(aug.overbudgetStoresCount, 0);
});

test('Kiểm tra parseSection cho quy tắc vận hành', () => {
  // Kiểm tra parseSection cho WORKFLOW_RULES
  const base = emptyProfile('Kutieskin');
  const wf = parseSection(
    'WORKFLOW_RULES',
    {
      projectTier: 'TIER_A_STRATEGIC',
      operatingModel: 'SPLIT_RESOURCE',
      strategyOwnerTeam: 'BRAND_TEAM',
      kocApprovalMode: 'KL4_PLUS_ONLY',
      autoAirAfterHours: 72,
      maxFreeRevisions: 2,
      sampleSender: 'UPBASE_WAREHOUSE',
      samplePrepSlaHours: 48,
      defaultSamplePolicy: 'GIFT',
      requiresAdsCode: true,
      adsCodeDurationDays: 365,
      repostAllowedChannels: 'TikTok\nShopee Video',
    },
    'Đặng Thị Yến Nhi',
    base,
  ).workflowRules!;
  assert.equal(wf.kocApprovalMode, 'KL4_PLUS_ONLY');
  assert.equal(wf.autoAirAfterHours, 72);
  assert.deepEqual(wf.repostAllowedChannels, ['TikTok', 'Shopee Video']);
});



test('Cấu hình động Cloudflare R2 từ giao diện và chuẩn hóa S3 Endpoint', async () => {
  process.env.BRAND_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'brand-r2-cfg-'));
  const {
    normalizeR2ConnectionInput,
    saveRuntimeR2Config,
    getR2ConfigWithSource,
    clearRuntimeR2Config,
    buildR2EnvSnippet,
  } = await import('../src/lib/brands/r2');

  const normalized = normalizeR2ConnectionInput({
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    endpoint: 'https://8f9a2b3c4d5e.r2.cloudflarestorage.com/upbase-b2c-brands/',
  });
  assert.ok(normalized);
  assert.equal(normalized.accountId, '8f9a2b3c4d5e');
  assert.equal(normalized.bucket, 'upbase-b2c-brands');
  assert.equal(normalized.endpoint, 'https://8f9a2b3c4d5e.r2.cloudflarestorage.com');

  const savedCfg = await saveRuntimeR2Config({
    accountId: 'acc123',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    bucket: 'upbase-b2c-brands',
    updatedBy: 'Đặng Thị Yến Nhi',
  });
  assert.equal(savedCfg.endpoint, 'https://acc123.r2.cloudflarestorage.com');
  const activeSource = getR2ConfigWithSource();
  assert.equal(activeSource.source, 'UI_CONFIG');
  assert.equal(activeSource.config?.bucket, 'upbase-b2c-brands');
  assert.match(buildR2EnvSnippet(savedCfg), /R2_BUCKET_NAME="upbase-b2c-brands"/);

  await clearRuntimeR2Config();
  assert.equal(getR2ConfigWithSource().source, 'NONE');
});
