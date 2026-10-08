const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/lib/selfChannelData.ts');
let content = fs.readFileSync(file, 'utf-8');

const startMarker = 'export const INITIAL_MASTER_PILLARS: MasterContentPillar[] = [';
const endMarker = '];\n\n// ==========================================\n// 2. TRỤ CỘT NỘI DUNG MẪU ÁP DỤNG TRONG KẾ HOẠCH';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + 2);
  const newImport = "import { UPBASE_MASTER_PILLARS } from './importedMasterData';\n";
  const newDecl = "export const INITIAL_MASTER_PILLARS: MasterContentPillar[] = UPBASE_MASTER_PILLARS;\n";
  
  content = newImport + before + newDecl + after;
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Successfully updated selfChannelData.ts to use UPBASE_MASTER_PILLARS');
} else {
  console.log('Markers not found: startIndex=' + startIndex + ', endIndex=' + endIndex);
}
