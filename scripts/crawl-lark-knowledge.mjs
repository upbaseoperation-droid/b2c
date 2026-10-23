#!/usr/bin/env node
/**
 * Công cụ cào dữ liệu trực tiếp từ Lark Cloud (Wiki, Docx, Sheets, Bitable, Drive Folder)
 * để xây dựng bộ Knowledge chuẩn hóa về UpBase (Markdown).
 *
 * Hỗ trợ xác thực qua:
 * 1. LARK_USER_ACCESS_TOKEN (u-...) — Đọc toàn bộ Wiki/Docs/Sheet/Base mà tài khoản cá nhân có quyền xem
 * 2. LARK_APP_ID + LARK_APP_SECRET (tenant_access_token) — Đọc toàn bộ tài liệu đã bật Scope và cấp quyền cho App
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge');

const DEFAULT_APP_ID = process.env.LARK_APP_ID || 'cli_aa45bfd4edf85f05';
const DEFAULT_APP_SECRET = process.env.LARK_APP_SECRET || '2bhaH5gXjytZtQi9DsLSMSUTMn7YYdDT';
const LARK_DOMAIN = process.env.LARK_DOMAIN || 'open.larksuite.com';
// Folder Token của Workspace riêng (nơi App được phép tạo mới tài liệu Docx)
const LARK_WORKSPACE_FOLDER_TOKEN = process.env.LARK_WORKSPACE_FOLDER_TOKEN || '';

// Danh sách các link Lark UpBase đã phát hiện trong kho tài liệu nội bộ
export const SEED_LARK_URLS = [
  // Drive Folders
  'https://upbasevn.sg.larksuite.com/drive/folder/G4fUfZs69ljWhHdFlz9lH1nTgyd',
  // Wiki Nodes & Spaces
  'https://upbasevn.sg.larksuite.com/wiki/B0M4wXywNiUEkckZNSFlDqFqgRg',
  'https://upbasevn.sg.larksuite.com/wiki/F9oWwAwQdifE0Ak59oclhjjWgKc',
  'https://upbasevn.sg.larksuite.com/wiki/HoE1w7nvciiXFzkClP5lh8ysgvc',
  'https://upbasevn.sg.larksuite.com/wiki/K8olwuIBCiur2bkNFmzlGqjTgdb',
  'https://upbasevn.sg.larksuite.com/wiki/MWDawxMC6icJ6qkxpS5llQ5lgP8',
  'https://upbasevn.sg.larksuite.com/wiki/ReccwFGwIiPZdikVRJnlo2SXgbh',
  'https://upbasevn.sg.larksuite.com/wiki/VcsNwnovaiRWNYk6Sjrl102VgOf',
  'https://upbasevn.sg.larksuite.com/wiki/VYLPwxMNti41qEkm04olgcqugse',
  // Docx
  'https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd',
  'https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d',
  'https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc',
  // Sheets
  'https://upbasevn.sg.larksuite.com/sheets/E4cIsxFeBhjO07to8rQlb9xjgrb',
  'https://upbasevn.sg.larksuite.com/sheets/FTlVsMO31hx35UtcmDMlHuLog3f',
  'https://upbasevn.sg.larksuite.com/sheets/Gsr1sxmpDh8J2jtzSg9lSW4ugZc',
  'https://upbasevn.sg.larksuite.com/sheets/ISlzsdhTHhkaTutPrGSlqtHgg7g',
  'https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb',
  'https://upbasevn.sg.larksuite.com/sheets/LDyZsfF4kh5Go7tlhtMlQ2oDgag',
  'https://upbasevn.sg.larksuite.com/sheets/Qr7msoNoDhL5hktJcV2l7htrgfd',
  'https://upbasevn.sg.larksuite.com/sheets/SMHusSgEbh6NQxtbyxllm7G3gjg',
  'https://upbasevn.sg.larksuite.com/sheets/Vasys8Ll7hdH5Xt7gvqlll6ZgTs',
  'https://upbasevn.sg.larksuite.com/sheets/Vj8TsyJWyhkanptLioclAMa0g0f',
  'https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK',
];

function slugify(str) {
  return String(str || 'untitled')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'untitled';
}

async function getAccessToken() {
  if (process.env.LARK_USER_ACCESS_TOKEN) {
    console.log('[Auth] Sử dụng LARK_USER_ACCESS_TOKEN từ biến môi trường.');
    return process.env.LARK_USER_ACCESS_TOKEN.trim();
  }
  const res = await fetch(`https://${LARK_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: DEFAULT_APP_ID,
      app_secret: DEFAULT_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Không lấy được tenant_access_token [${data.code}]: ${data.msg}`);
  }
  return data.tenant_access_token;
}

async function larkGet(token, endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `https://${LARK_DOMAIN}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

/**
 * Chuyển đổi danh sách Blocks của Lark Docx v1 sang Markdown
 */
function renderDocxBlocksToMarkdown(blocks) {
  const lines = [];
  const extractTextElements = (elements = []) =>
    elements
      .map((el) => {
        if (el.text_run) {
          let content = el.text_run.content || '';
          const style = el.text_run.text_element_style || {};
          if (style.link?.url) {
            content = `[${content}](${decodeURIComponent(style.link.url)})`;
          }
          if (style.inline_code) content = `\`${content}\``;
          if (style.bold) content = `**${content}**`;
          if (style.italic) content = `*${content}*`;
          return content;
        }
        if (el.mention_doc) {
          return `[${el.mention_doc.title || 'Doc'}](${el.mention_doc.url || '#'})`;
        }
        return '';
      })
      .join('');

  for (const b of blocks) {
    const type = b.block_type;
    if (type === 1 && b.page) {
      const title = extractTextElements(b.page.elements);
      if (title) lines.push(`# ${title}\n`);
    } else if (type >= 3 && type <= 11) {
      const level = type - 2;
      const key = `heading${level}`;
      const text = extractTextElements(b[key]?.elements);
      if (text) lines.push(`\n${'#'.repeat(Math.min(level, 6))} ${text}\n`);
    } else if (type === 2 && b.text) {
      const text = extractTextElements(b.text.elements);
      if (text.trim()) lines.push(`${text}\n`);
    } else if (type === 12 && b.bullet) {
      const text = extractTextElements(b.bullet.elements);
      lines.push(`- ${text}`);
    } else if (type === 13 && b.ordered) {
      const text = extractTextElements(b.ordered.elements);
      lines.push(`1. ${text}`);
    } else if (type === 14 && b.code) {
      const text = extractTextElements(b.code.elements);
      lines.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
    } else if (type === 15 && b.quote) {
      const text = extractTextElements(b.quote.elements);
      lines.push(`> ${text}`);
    } else if (type === 22) {
      lines.push(`\n---\n`);
    }
  }
  return lines.join('\n');
}

async function crawlDocx(token, documentId, fallbackTitle = '') {
  const metaRes = await larkGet(token, `/open-apis/docx/v1/documents/${documentId}`);
  if (metaRes.code !== 0) {
    return { ok: false, code: metaRes.code, msg: metaRes.msg };
  }
  const title = metaRes.data?.document?.title || fallbackTitle || documentId;

  // Lấy toàn bộ blocks để giữ định dạng Markdown (headings, bullets, links)
  let pageToken = '';
  const allBlocks = [];
  do {
    const q = pageToken ? `?page_size=500&page_token=${pageToken}` : '?page_size=500';
    const blocksRes = await larkGet(token, `/open-apis/docx/v1/documents/${documentId}/blocks${q}`);
    if (blocksRes.code !== 0) break;
    if (blocksRes.data?.items) allBlocks.push(...blocksRes.data.items);
    pageToken = blocksRes.data?.has_more ? blocksRes.data?.page_token : '';
  } while (pageToken);

  let markdown = '';
  if (allBlocks.length > 0) {
    markdown = renderDocxBlocksToMarkdown(allBlocks);
  } else {
    const rawRes = await larkGet(token, `/open-apis/docx/v1/documents/${documentId}/raw_content`);
    markdown = `# ${title}\n\n${rawRes.data?.content || ''}`;
  }

  return { ok: true, title, markdown };
}

async function crawlSpreadsheet(token, spreadsheetToken, fallbackTitle = '') {
  const metaRes = await larkGet(token, `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}`);
  if (metaRes.code !== 0) {
    return { ok: false, code: metaRes.code, msg: metaRes.msg };
  }
  const title = metaRes.data?.spreadsheet?.title || fallbackTitle || spreadsheetToken;
  const sheetsRes = await larkGet(token, `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets/query`);
  const sheets = sheetsRes.data?.sheets || [];

  const mdParts = [`# [Lark Sheet] ${title}\n`, `- **Spreadsheet Token:** \`${spreadsheetToken}\`\n`];

  for (const sh of sheets) {
    const sheetId = sh.sheet_id;
    const sheetTitle = sh.title || sheetId;
    mdParts.push(`\n## Sheet: ${sheetTitle}\n`);

    const valRes = await larkGet(
      token,
      `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values/${sheetId}!A1:Z150?valueRenderOption=FormattedValue`
    );
    const values = valRes.data?.valueRange?.values || [];
    const nonEmptyRows = values.filter((row) => Array.isArray(row) && row.some((c) => c !== null && String(c).trim() !== ''));
    if (nonEmptyRows.length === 0) {
      mdParts.push(`*(Sheet trống hoặc không có dữ liệu trong vùng A1:Z150)*\n`);
      continue;
    }
    const maxCols = Math.min(
      15,
      Math.max(...nonEmptyRows.slice(0, 30).map((r) => r.length), 1)
    );
    const formatCell = (cell) => {
      if (cell === null || cell === undefined) return '';
      if (typeof cell === 'object') {
        if (Array.isArray(cell)) return cell.map((x) => x?.text || x || '').join(' ');
        return cell.text || JSON.stringify(cell);
      }
      return String(cell).replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim();
    };

    const headerRow = Array.from({ length: maxCols }, (_, i) => formatCell(nonEmptyRows[0][i]) || `Col ${i + 1}`);
    mdParts.push(`| ${headerRow.join(' | ')} |`);
    mdParts.push(`| ${headerRow.map(() => '---').join(' | ')} |`);

    for (const row of nonEmptyRows.slice(1, 100)) {
      const cells = Array.from({ length: maxCols }, (_, i) => formatCell(row[i]));
      mdParts.push(`| ${cells.join(' | ')} |`);
    }
  }

  return { ok: true, title, markdown: mdParts.join('\n') };
}

async function crawlBitable(token, appToken, fallbackTitle = '') {
  const metaRes = await larkGet(token, `/open-apis/bitable/v1/apps/${appToken}`);
  if (metaRes.code !== 0) {
    return { ok: false, code: metaRes.code, msg: metaRes.msg };
  }
  const title = metaRes.data?.app?.name || fallbackTitle || appToken;
  const tablesRes = await larkGet(token, `/open-apis/bitable/v1/apps/${appToken}/tables?page_size=100`);
  const tables = tablesRes.data?.items || [];

  const mdParts = [`# [Lark Base] ${title}\n`, `- **App Token:** \`${appToken}\`\n`];

  for (const tbl of tables) {
    mdParts.push(`\n## Bảng: ${tbl.name} (\`${tbl.table_id}\`)\n`);
    const fieldsRes = await larkGet(
      token,
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tbl.table_id}/fields?page_size=100`
    );
    const fields = fieldsRes.data?.items || [];
    if (fields.length > 0) {
      mdParts.push(`### Cấu trúc trường dữ liệu (${fields.length} cột)\n`);
      mdParts.push(`| Tên cột | Field ID | Loại (Type) |`);
      mdParts.push(`| --- | --- | --- |`);
      for (const f of fields) {
        mdParts.push(`| ${f.field_name} | \`${f.field_id}\` | ${f.type} |`);
      }
    }

    const recRes = await larkGet(
      token,
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tbl.table_id}/records?page_size=50`
    );
    const records = recRes.data?.items || [];
    mdParts.push(`\n- **Tổng số bản ghi:** ${recRes.data?.total ?? records.length}\n`);
    if (records.length > 0) {
      const sampleKeys = Object.keys(records[0].fields || {}).slice(0, 10);
      if (sampleKeys.length > 0) {
        mdParts.push(`| ${sampleKeys.join(' | ')} |`);
        mdParts.push(`| ${sampleKeys.map(() => '---').join(' | ')} |`);
        for (const r of records.slice(0, 30)) {
          const vals = sampleKeys.map((k) => {
            const v = r.fields?.[k];
            if (v === null || v === undefined) return '';
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').slice(0, 120);
          });
          mdParts.push(`| ${vals.join(' | ')} |`);
        }
      }
    }
  }

  return { ok: true, title, markdown: mdParts.join('\n') };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const token = await getAccessToken();
  const summary = { crawled: [], failed: [] };

  // 1. Cào toàn bộ Wiki Spaces nếu có quyền
  const spacesRes = await larkGet(token, '/open-apis/wiki/v2/spaces?page_size=50');
  if (spacesRes.code === 0 && spacesRes.data?.items?.length) {
    console.log(`[Wiki] Tìm thấy ${spacesRes.data.items.length} Wiki Spaces.`);
    for (const sp of spacesRes.data.items) {
      console.log(`  -> Space: ${sp.name} (${sp.space_id})`);
      const nodesRes = await larkGet(token, `/open-apis/wiki/v2/spaces/${sp.space_id}/nodes?page_size=50`);
      for (const node of nodesRes.data?.items || []) {
        if (node.obj_type === 'docx') {
          const res = await crawlDocx(token, node.obj_token, node.title);
          if (res.ok) {
            const fileName = `wiki-${slugify(res.title)}-${node.node_token.slice(0, 6)}.md`;
            fs.writeFileSync(path.join(OUTPUT_DIR, fileName), res.markdown, 'utf8');
            summary.crawled.push({ type: 'wiki-docx', title: res.title, file: fileName });
          }
        }
      }
    }
  } else {
    console.log(`[Wiki Spaces] Trạng thái: [${spacesRes.code}] ${spacesRes.msg}`);
  }

  // 2. Cào danh sách SEED_LARK_URLS
  for (const url of SEED_LARK_URLS) {
    const wikiMatch = url.match(/\/wiki\/([a-zA-Z0-9]+)/);
    const docxMatch = url.match(/\/docx\/([a-zA-Z0-9]+)/);
    const sheetMatch = url.match(/\/sheets\/([a-zA-Z0-9]+)/);
    const folderMatch = url.match(/\/drive\/folder\/([a-zA-Z0-9]+)/);

    if (wikiMatch) {
      const nodeToken = wikiMatch[1];
      const nodeRes = await larkGet(token, `/open-apis/wiki/v2/spaces/get_node?token=${nodeToken}`);
      if (nodeRes.code !== 0) {
        summary.failed.push({ url, code: nodeRes.code, msg: nodeRes.msg });
        continue;
      }
      const node = nodeRes.data?.node;
      if (!node) continue;
      let result = null;
      if (node.obj_type === 'docx') {
        result = await crawlDocx(token, node.obj_token, node.title);
      } else if (node.obj_type === 'sheet') {
        result = await crawlSpreadsheet(token, node.obj_token, node.title);
      } else if (node.obj_type === 'bitable') {
        result = await crawlBitable(token, node.obj_token, node.title);
      }
      if (result?.ok) {
        const fileName = `wiki-${node.obj_type}-${slugify(result.title)}-${nodeToken.slice(0, 6)}.md`;
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), result.markdown, 'utf8');
        summary.crawled.push({ url, type: `wiki:${node.obj_type}`, title: result.title, file: fileName });
      } else if (result) {
        summary.failed.push({ url, code: result.code, msg: result.msg });
      }
    } else if (docxMatch) {
      const docToken = docxMatch[1];
      const result = await crawlDocx(token, docToken);
      if (result.ok) {
        const fileName = `docx-${slugify(result.title)}-${docToken.slice(0, 6)}.md`;
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), result.markdown, 'utf8');
        summary.crawled.push({ url, type: 'docx', title: result.title, file: fileName });
      } else {
        summary.failed.push({ url, code: result.code, msg: result.msg });
      }
    } else if (sheetMatch) {
      const sheetToken = sheetMatch[1];
      const result = await crawlSpreadsheet(token, sheetToken);
      if (result.ok) {
        const fileName = `sheet-${slugify(result.title)}-${sheetToken.slice(0, 6)}.md`;
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), result.markdown, 'utf8');
        summary.crawled.push({ url, type: 'sheet', title: result.title, file: fileName });
      } else {
        summary.failed.push({ url, code: result.code, msg: result.msg });
      }
    } else if (folderMatch) {
      const folderToken = folderMatch[1];
      const filesRes = await larkGet(token, `/open-apis/drive/v1/files?folder_token=${folderToken}&page_size=50`);
      if (filesRes.code === 0) {
        for (const f of filesRes.data?.files || []) {
          if (f.type === 'docx') {
            const r = await crawlDocx(token, f.token, f.name);
            if (r.ok) {
              const fileName = `drive-docx-${slugify(r.title)}-${f.token.slice(0, 6)}.md`;
              fs.writeFileSync(path.join(OUTPUT_DIR, fileName), r.markdown, 'utf8');
              summary.crawled.push({ url: f.url, type: 'drive:docx', title: r.title, file: fileName });
            }
          } else if (f.type === 'sheet') {
            const r = await crawlSpreadsheet(token, f.token, f.name);
            if (r.ok) {
              const fileName = `drive-sheet-${slugify(r.title)}-${f.token.slice(0, 6)}.md`;
              fs.writeFileSync(path.join(OUTPUT_DIR, fileName), r.markdown, 'utf8');
              summary.crawled.push({ url: f.url, type: 'drive:sheet', title: r.title, file: fileName });
            }
          } else if (f.type === 'bitable') {
            const r = await crawlBitable(token, f.token, f.name);
            if (r.ok) {
              const fileName = `drive-bitable-${slugify(r.title)}-${f.token.slice(0, 6)}.md`;
              fs.writeFileSync(path.join(OUTPUT_DIR, fileName), r.markdown, 'utf8');
              summary.crawled.push({ url: f.url, type: 'drive:bitable', title: r.title, file: fileName });
            }
          }
        }
      } else {
        summary.failed.push({ url, code: filesRes.code, msg: filesRes.msg });
      }
    }
  }

  console.log(`\n=== KẾT QUẢ CÀO LARK CLOUD ===`);
  console.log(`- Thành công: ${summary.crawled.length} tài liệu`);
  console.log(`- Chưa có quyền / lỗi: ${summary.failed.length} tài liệu`);
  if (summary.failed.length > 0) {
    console.log(`  Mẫu lỗi đầu tiên: [${summary.failed[0].code}] ${summary.failed[0].msg}`);
  }

  // 3. Nếu cấu hình LARK_WORKSPACE_FOLDER_TOKEN: Chỉ tạo tài liệu mới bên trong Workspace riêng của bạn
  if (LARK_WORKSPACE_FOLDER_TOKEN) {
    console.log(`\n[Workspace] Đang khởi tạo tài liệu Knowledge vào Folder riêng (${LARK_WORKSPACE_FOLDER_TOKEN})...`);
    const mdFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.md')).sort();
    for (const file of mdFiles) {
      const title = `[UpBase Knowledge] ${file.replace(/\.md$/i, '')}`;
      const createRes = await fetch(`https://${LARK_DOMAIN}/open-apis/docx/v1/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_token: LARK_WORKSPACE_FOLDER_TOKEN,
          title,
        }),
      }).then((r) => r.json());

      if (createRes.code === 0) {
        const docId = createRes.data?.document?.document_id;
        console.log(`  + Đã tạo Docx trong Workspace: ${title} (${docId})`);
      } else {
        console.log(`  ! Không thể tạo Docx ${title}: [${createRes.code}] ${createRes.msg}`);
        break;
      }
    }
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
