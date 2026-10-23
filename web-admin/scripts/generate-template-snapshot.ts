import { loadTemplate } from '../src/lib/contracts/templates';
import fs from 'node:fs';
import path from 'node:path';

async function generate() {
  const ids = ['IND-HD', 'IND-BBNT', 'HKD-HD', 'HKD-BBNT', 'COM-HD', 'COM-BBNT', 'CTV-HD', 'CTV-BBNT', 'IND-LIVE-HD', 'IND-LIVE-BBNT', 'HKD-LIVE-HD', 'HKD-LIVE-BBNT', 'COM-LIVE-HD', 'COM-LIVE-BBNT', 'IND-HDNT', 'IND-SOW', 'IND-VID-BBNT', 'HKD-HDNT', 'HKD-SOW', 'HKD-VID-BBNT', 'COM-HDNT', 'COM-SOW', 'COM-VID-BBNT', 'CTV-HDNT', 'CTV-VID-BBNT'];
  const map: Record<string, unknown> = {};
  for (const id of ids) {
    const { template } = await loadTemplate(id);
    map[id] = {
      ...template,
      fieldCount: template.fields.length,
      requiredFieldCount: template.fields.filter(f => f.required).length,
    };
    console.log('Processed', id, ':', template.name, 'fields:', template.fields.length, 'blocks:', template.blocks?.length);
  }
  const outPath = path.resolve('src/lib/contracts/builtInTemplatesSnapshot.ts');
  const content = [
    '/* Auto-generated snapshot of official Ver052026 legal templates from Quản lý hợp đồng */',
    "import type { LegalTemplate } from './types';",
    '',
    `export const OFFICIAL_TEMPLATES_SNAPSHOT: Record<string, LegalTemplate> = ${JSON.stringify(map, null, 2)};`,
    '',
  ].join('\n');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Saved snapshot to', outPath, 'size:', Math.round(content.length / 1024), 'KB');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
