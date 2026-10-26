import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { UserProfile } from '../src/lib/types';
import { applySection, parseSection, permissionsFor } from '../src/lib/brands/domain';
import { brandKey, emptyProfile } from '../src/lib/brands/types';

const user = (role: UserProfile['role'], name = 'Người dùng'): UserProfile => ({ id: name, name, email: '', role, roleTitle: '', avatar: '' });

test('Phân quyền theo mục: nhân sự nội bộ B2C sửa đầy đủ hồ sơ trong phạm vi, đối tác Brand sửa trừ trần thù lao', () => {
  const lead = permissionsFor(user('MANAGER'));
  assert.ok(Object.values(lead).every(Boolean));
  const pic = permissionsFor(user('BOOKING_MEMBER', 'Phương Thảo'), 'phương thảo', 'Senka');
  assert.equal(pic.POSITIONING, true); assert.equal(pic.PRODUCTS, true); assert.equal(pic.DOCUMENTS, true);
  assert.equal(pic.LEGAL, true); assert.equal(pic.RATECARD, true);
  const internalOther = permissionsFor(user('BOOKING_MEMBER', 'Lê Phương Thảo'), 'Phương Thảo', 'Senka');
  assert.ok(Object.values(internalOther).every(Boolean));
  const partnerOwn: UserProfile = { ...user('BRAND_PARTNER', 'Đại diện Senka'), partnerType: 'BRAND', assignedBrands: ['Senka'] };
  const partnerOwnPerms = permissionsFor(partnerOwn, 'Phương Thảo', 'Senka');
  assert.equal(partnerOwnPerms.POSITIONING, true);
  assert.equal(partnerOwnPerms.LEGAL, true);
  assert.equal(partnerOwnPerms.RATECARD, false);
  const partnerOtherPerms = permissionsFor(partnerOwn, 'Phương Thảo', 'ClubClio');
  assert.ok(Object.values(partnerOtherPerms).every(v => v === false));
  assert.ok(Object.values(permissionsFor(null)).every(v => v === false));
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

test('Khởi tạo đầy đủ hồ sơ cho toàn bộ 42 thương hiệu B2C thực tế (8/8 mục kèm Quy tắc vận hành)', async () => {
  const { getFallbackProfiles } = await import('../src/lib/brands/store');
  const { buildRows } = await import('../src/components/brands/brandUi');
  const { REAL_B2C_42_BRANDS } = await import('../src/lib/realB2cBrandsData');
  const profiles = getFallbackProfiles();
  assert.ok(profiles.length >= 42, `Cần ít nhất 42 hồ sơ thương hiệu B2C, thực tế: ${profiles.length}`);
  const rows = buildRows(REAL_B2C_42_BRANDS, profiles).filter(r => REAL_B2C_42_BRANDS.some(b => b.name === r.name));
  assert.equal(rows.length, 42);
  for (const row of rows) {
    assert.equal(row.done, 8, `Thương hiệu ${row.name} chưa đủ 8/8 mục (${row.done}/${row.total})`);
    assert.ok(row.profile.products.length > 0, `Thương hiệu ${row.name} thiếu SKU chủ lực`);
    assert.ok((row.profile.contentRules?.banned.length || 0) > 0, `Thương hiệu ${row.name} thiếu từ cấm`);
    assert.ok(row.profile.ratecard.some(r => (r.maxBudget || 0) > 0), `Thương hiệu ${row.name} thiếu khung thù lao`);
    assert.ok(row.profile.documents.length > 0, `Thương hiệu ${row.name} thiếu tài liệu`);
    assert.ok(row.profile.workflowRules, `Thương hiệu ${row.name} thiếu quy tắc vận hành (workflowRules)`);
    assert.ok((row.profile.positioning?.painPoints?.length || 0) > 0, `Thương hiệu ${row.name} thiếu nỗi đau khách hàng`);
  }

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
