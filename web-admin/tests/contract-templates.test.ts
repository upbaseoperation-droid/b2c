import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { loadTemplate, renderTemplate, templateCatalog } from '../src/lib/contracts/templates';
test('Đọc đủ 8 mẫu gốc và phát hiện trường trong bảng/đoạn văn', async () => {
  const catalog = await templateCatalog(); assert.equal(catalog.length, 8);
  for (const item of catalog) { const { template } = await loadTemplate(item.id); assert.ok(template.fields.length > 5); assert.ok(template.paragraphs.length > 30); }
});
test('Điền mẫu giữ nguyên điều khoản, bảng, styles và nội dung tiếng Việt', async () => {
  const { template, zip } = await loadTemplate('IND-HD');
  const name = template.fields.find(f => f.label === 'BÊN B'); assert.ok(name);
  const values = { [name.key]: 'ĐỐI TÁC KIỂM THỬ & <VIỆT NAM>', 'token:[ID KOC]': 'KOC-TEST' };
  const output = await renderTemplate(template.id, template.hash, values);
  assert.ok(output.paragraphs.includes('ĐỐI TÁC KIỂM THỬ & <VIỆT NAM>'));
  assert.ok(output.paragraphs.some(p => p.includes('KOC-TEST')));
  assert.ok(output.paragraphs.includes('ĐIỀU 1: ĐỊNH NGHĨA'));
  const generated = await JSZip.loadAsync(output.buffer);
  assert.equal(await generated.file('word/styles.xml')!.async('string'), await zip.file('word/styles.xml')!.async('string'));
  assert.equal((await generated.file('word/document.xml')!.async('string')).match(/<w:tbl>/g)?.length, (await zip.file('word/document.xml')!.async('string')).match(/<w:tbl>/g)?.length);
});
test('Không xuất hồ sơ bằng phiên bản nguồn đã thay đổi', async () => {
  await assert.rejects(renderTemplate('IND-HD', 'wrong-hash', {}));
  await assert.rejects(loadTemplate('../../secret'));
});
