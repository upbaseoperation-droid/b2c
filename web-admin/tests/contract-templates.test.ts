import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { loadTemplate, renderTemplate, templateCatalog, archiveTemplate } from '../src/lib/contracts/templates';
import { mkdtemp, writeFile, mkdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
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
test('Giữ bản mẫu của hồ sơ khi pháp chế thay đổi file hiện hành', async () => {
  const original = await loadTemplate('IND-HD');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'b2c-template-'));
  const templateDirectory = path.join(directory, 'templates'); await mkdir(templateDirectory);
  const file = path.join(templateDirectory, original.template.filename);
  const previous = { data: process.env.CONTRACT_DATA_DIR, templates: process.env.CONTRACT_TEMPLATE_DIR };
  try {
    await writeFile(file, await original.zip.generateAsync({ type: 'nodebuffer' }));
    process.env.CONTRACT_DATA_DIR = directory; process.env.CONTRACT_TEMPLATE_DIR = templateDirectory;
    const initial = await loadTemplate('IND-HD'); await archiveTemplate(initial.template.id, initial.template.hash);
    await writeFile(file, Buffer.from('File mẫu hiện hành đã thay đổi'));
    const archived = await loadTemplate('IND-HD', initial.template.hash);
    assert.equal(archived.template.hash, initial.template.hash);
    assert.deepEqual(archived.template.fields, initial.template.fields);
    const output = await renderTemplate('IND-HD', initial.template.hash, { 'token:[ID KOC]': 'KOC-ARCHIVED' });
    assert.ok(output.paragraphs.some(p => p.includes('KOC-ARCHIVED')));
    await unlink(path.join(directory, 'sources', `${initial.template.hash}.docx`)); await rmdir(path.join(directory, 'sources'));
  } finally {
    if (previous.data === undefined) delete process.env.CONTRACT_DATA_DIR; else process.env.CONTRACT_DATA_DIR = previous.data;
    if (previous.templates === undefined) delete process.env.CONTRACT_TEMPLATE_DIR; else process.env.CONTRACT_TEMPLATE_DIR = previous.templates;
    await unlink(file); await rmdir(templateDirectory); await rmdir(directory);
  }
});
test('Mẫu công ty / hộ kinh doanh: ô chữ giữ chỗ (tên, MST, địa chỉ) được nhận ra và điền thay đúng chỗ', async () => {
  for (const id of ['COM-HD', 'HKD-HD']) {
    const { template } = await loadTemplate(id);
    const name = template.fields.find(f => f.source === 'partyName'); const tax = template.fields.find(f => f.source === 'taxCode');
    assert.ok(name && tax, `${id} thiếu ô tên hoặc MST`);
    const output = await renderTemplate(template.id, template.hash, { [name.key]: 'CÔNG TY KIỂM THỬ', [tax.key]: '0101234567' });
    assert.ok(output.paragraphs.includes('CÔNG TY KIỂM THỬ'));
    assert.ok(output.paragraphs.includes('0101234567'));
    assert.ok(!output.paragraphs.some(p => /^(Tên Công ty|Tên Hộ kinh doanh|MST công ty|MST hộ kinh doanh)$/.test(p.trim())), 'còn chữ giữ chỗ sau khi điền');
  }
});
test('Ô bảng có nhãn theo dòng · cột, không còn nhãn trùng nhau', async () => {
  const { template } = await loadTemplate('IND-HD');
  const fields = [...new Map(template.fields.map(f => [f.key, f])).values()];
  assert.ok(fields.some(f => f.title === 'Sản xuất và đăng tải Video review · Đơn giá' && f.source === 'unitPrice'));
  const titles = fields.map(f => f.title); assert.equal(new Set(titles).size, titles.length);
  assert.ok(!fields.some(f => /Sau đây gọi tắt/.test(f.label)), 'dòng “Sau đây gọi tắt là Bên B” không phải ô điền');
});
test('Dựng cấu trúc trang A4 (blocks) giữ đủ bảng Bên A/B, bảng hạng mục, chữ ký và tọa độ trường', async () => {
  const { template } = await loadTemplate('IND-HD');
  assert.ok(template.blocks && template.blocks.length > 20);
  const coords = new Set<string>();
  const walk = (blocks: NonNullable<typeof template.blocks>) => {
    for (const b of blocks) {
      if (b.kind === 'p') coords.add(`${b.part}:${b.paragraph}`);
      else for (const row of b.rows) for (const cell of row) walk(cell.blocks);
    }
  };
  walk(template.blocks);
  for (const f of template.fields) {
    assert.ok(coords.has(`${f.part}:${f.paragraph}`), `Trường ${f.key} (${f.part}:${f.paragraph}) phải nằm trong cấu trúc trang A4`);
  }
});
