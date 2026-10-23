#!/usr/bin/env node
/**
 * Cào trực tiếp toàn bộ Lark Wiki & Lark Docs của UpBase thông qua `lark-cli` đã xác thực.
 * Lưu trữ phân cấp theo từng Wiki Space tại `Knowledge - MD/upbase-knowledge/lark-wiki/`
 * và tổng hợp vào bộ Knowledge trung tâm.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const LARK_CLI_RUN_JS = 'C:\\Users\\Chienth\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
const WIKI_OUT_DIR = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge', 'lark-wiki');

// Các Wiki Space trọng tâm của UpBase
const TARGET_WIKI_SPACES = [
  { id: '7652122297116921573', slug: '01-upbase-central', name: 'UpBase Central (Trung tâm thông tin UpBase)' },
  { id: '7652122313827028702', slug: '02-services-hub', name: 'Services Hub (SVC-1 E2E, SVC-2 DX, SVC-3 UpS)' },
  { id: '7500156536228937760', slug: '03-upbase-ecom', name: 'UpBase Ecom (Ecommerce Backbone)' },
  { id: '7660816820865093342', slug: '04-lms-cds-workspace', name: 'LMS & Chuyển đổi số Workspace' },
  { id: '7423444599479222303', slug: '05-company-materials', name: 'Company Materials UpBase' },
  { id: '7472309034436001823', slug: '06-upbase-mkt-b2b', name: 'UpBase Marketing B2B & Brand House' },
  { id: '7426219236843946015', slug: '07-welcome-onboard', name: 'Welcome Onboard & Đào tạo nội bộ' },
  { id: '7420241073110302752', slug: '08-operation-team', name: 'Operation Team Knowledge' },
  { id: '7402090389470986272', slug: '09-tech-department', name: 'Tech Department' },
];

// Các node Wiki & Docx chuyên biệt của Marketing B2C / E2E
const EXTRA_DOC_OR_WIKI_TOKENS = [
  { type: 'wiki', token: 'MWDawxMC6icJ6qkxpS5llQ5lgP8', hint: 'Tiêu chuẩn xây dựng Brief Team Marketing B2C' },
  { type: 'wiki', token: 'K8olwuIBCiur2bkNFmzlGqjTgdb', hint: 'Quy trình hợp tác KOL KOC' },
  { type: 'wiki', token: 'ReccwFGwIiPZdikVRJnlo2SXgbh', hint: 'Quy trình làm Content kênh' },
  { type: 'wiki', token: 'VYLPwxMNti41qEkm04olgcqugse', hint: 'Tài liệu đào tạo Xây dựng Hook TikTok' },
  { type: 'wiki', token: 'B0M4wXywNiUEkckZNSFlDqFqgRg', hint: 'Outline Self Channel Service Catalog' },
  { type: 'wiki', token: 'HoE1w7nvciiXFzkClP5lh8ysgvc', hint: 'Tài liệu Wiki B2C HoE1w7' },
  { type: 'docx', token: 'LtgKdulUaoucvNx1XmNlThbVgvd', hint: 'Hướng dẫn điền ECOM Strategy Implementation Guidelines' },
  { type: 'docx', token: 'VXsjd3shdoSc4lxJSvYlbvOjg7d', hint: 'Hướng dẫn Joint Business Plan v1.0.0' },
  { type: 'docx', token: 'YmOSdFv7zoNHpYxwau5lDerFgcc', hint: 'Hướng dẫn Content Tactics Template v1.0.0' },
];

function slugify(str) {
  return (
    String(str || 'untitled')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 75) || 'untitled'
  );
}

async function runLarkCli(args) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [LARK_CLI_RUN_JS, ...args], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 45000,
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        // ignore
      }
    }
    return { ok: false, error: err.message };
  }
}

async function listNodesRecursive(spaceId, parentToken = '', depth = 0, maxDepth = 2) {
  const args = ['wiki', '+node-list', '--space-id', spaceId, '--page-all', '--page-limit', '3'];
  if (parentToken) {
    args.push('--parent-node-token', parentToken);
  }
  const res = await runLarkCli(args);
  const nodes = res?.data?.nodes || [];
  const all = [];
  for (const n of nodes) {
    all.push({ ...n, depth });
    if (n.has_child && depth < maxDepth) {
      const children = await listNodesRecursive(spaceId, n.node_token, depth + 1, maxDepth);
      all.push(...children);
    }
  }
  return all;
}

async function fetchDocxContent(docToken) {
  const res = await runLarkCli(['docs', '+fetch', '--doc', docToken, '--doc-format', 'markdown']);
  if (!res?.ok) return null;
  return res?.data?.document?.content || '';
}

async function main() {
  fs.mkdirSync(WIKI_OUT_DIR, { recursive: true });
  const fetchedObjTokens = new Set();
  const spaceSummaries = [];

  for (const space of TARGET_WIKI_SPACES) {
    console.log(`\n=== Đang quét Wiki Space: ${space.name} (${space.id}) ===`);
    const spaceDir = path.join(WIKI_OUT_DIR, space.slug);
    fs.mkdirSync(spaceDir, { recursive: true });

    const nodes = await listNodesRecursive(space.id, '', 0, 2);
    console.log(`  -> Tìm thấy ${nodes.length} node trong ${space.name}`);

    const savedDocs = [];
    const treeLines = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const indent = '  '.repeat(node.depth);
      const wikiUrl = `https://upbasevn.sg.larksuite.com/wiki/${node.node_token}`;
      treeLines.push(`${indent}- **[${node.title}](${wikiUrl})** (\`${node.obj_type}\`)`);

      if (node.obj_type === 'docx' && node.obj_token && !fetchedObjTokens.has(node.obj_token)) {
        fetchedObjTokens.add(node.obj_token);
        const content = await fetchDocxContent(node.obj_token);
        if (content && content.trim().length > 0) {
          const fileName = `${String(savedDocs.length + 1).padStart(2, '0')}-${slugify(node.title)}.md`;
          const fullMd = [
            `# ${node.title}`,
            ``,
            `- **Wiki Space:** ${space.name}`,
            `- **Wiki URL:** ${wikiUrl}`,
            `- **Node Token:** \`${node.node_token}\` | **Doc Token:** \`${node.obj_token}\``,
            ``,
            `---`,
            ``,
            content,
          ].join('\n');
          fs.writeFileSync(path.join(spaceDir, fileName), fullMd, 'utf8');
          savedDocs.push({
            title: node.title,
            fileName,
            relPath: `./lark-wiki/${space.slug}/${fileName}`,
            wikiUrl,
            chars: content.length,
            preview: content
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 350),
          });
          console.log(`    + [${savedDocs.length}] Đã tải: ${node.title} (${(content.length / 1024).toFixed(1)} KB)`);
        }
      }
    }

    spaceSummaries.push({
      space,
      nodeCount: nodes.length,
      treeLines,
      savedDocs,
    });
  }

  // Cào bổ sung các trang Wiki / Docx chuyên ngành Marketing B2C (nếu chưa nằm trong các node trên)
  console.log(`\n=== Đang tải các tài liệu Wiki/Docx chuyên ngành Marketing B2C ===`);
  const b2cDir = path.join(WIKI_OUT_DIR, '10-b2c-specialized-docs');
  fs.mkdirSync(b2cDir, { recursive: true });
  const b2cSavedDocs = [];

  for (const item of EXTRA_DOC_OR_WIKI_TOKENS) {
    let objToken = item.token;
    let title = item.hint;
    let url = `https://upbasevn.sg.larksuite.com/${item.type}/${item.token}`;

    if (item.type === 'wiki') {
      const nodeRes = await runLarkCli(['wiki', '+node-get', '--node-token', item.token]);
      const node = nodeRes?.data?.node || nodeRes?.data;
      if (node?.obj_token) {
        objToken = node.obj_token;
        title = node.title || title;
      }
      if (node?.obj_type && node.obj_type !== 'docx') {
        console.log(`  -> Bỏ qua ${title} vì loại là ${node.obj_type}`);
        continue;
      }
    }

    if (fetchedObjTokens.has(objToken)) continue;
    fetchedObjTokens.add(objToken);

    const content = await fetchDocxContent(objToken);
    if (content && content.trim().length > 0) {
      const fileName = `${String(b2cSavedDocs.length + 1).padStart(2, '0')}-${slugify(title)}.md`;
      const fullMd = [
        `# ${title}`,
        ``,
        `- **Nguồn Lark:** ${url}`,
        `- **Doc Token:** \`${objToken}\``,
        ``,
        `---`,
        ``,
        content,
      ].join('\n');
      fs.writeFileSync(path.join(b2cDir, fileName), fullMd, 'utf8');
      b2cSavedDocs.push({
        title,
        fileName,
        relPath: `./lark-wiki/10-b2c-specialized-docs/${fileName}`,
        wikiUrl: url,
        chars: content.length,
        preview: content
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 350),
      });
      console.log(`    + Đã tải B2C Doc: ${title} (${(content.length / 1024).toFixed(1)} KB)`);
    }
  }

  if (b2cSavedDocs.length > 0) {
    spaceSummaries.push({
      space: { id: 'b2c-special', slug: '10-b2c-specialized-docs', name: 'Tài liệu Chuyên sâu Marketing B2C & E2E' },
      nodeCount: b2cSavedDocs.length,
      treeLines: b2cSavedDocs.map((d) => `- **[${d.title}](${d.wikiUrl})**`),
      savedDocs: b2cSavedDocs,
    });
  }

  // Tạo tài liệu 09_TONG_HOP_TRI_THUC_LARK_WIKI_UPBASE.md
  const totalDocs = spaceSummaries.reduce((acc, s) => acc + s.savedDocs.length, 0);
  const totalNodes = spaceSummaries.reduce((acc, s) => acc + s.nodeCount, 0);

  const md09Lines = [
    `# 09. TỔNG HỢP TRI THỨC TRỰC TIẾP TỪ LARK WIKI TOÀN UPBASE`,
    ``,
    `> **Nguồn cào trực tiếp qua \`lark-cli\`:**`,
    `> - Đã quét **${spaceSummaries.length} Không gian Wiki (Wiki Spaces)** với **${totalNodes} mục (Nodes)**`,
    `> - Đã tải toàn văn **${totalDocs} tài liệu Lark Wiki / Docx** về thư mục [\`lark-wiki/\`](./lark-wiki/)`,
    `> - Thời điểm đồng bộ: ${new Date().toISOString()}`,
    ``,
    `## 1. Bảng Thống Kê Các Không Gian Tri Thức (Wiki Spaces) Của UpBase`,
    ``,
    `| STT | Tên Wiki Space | Space ID | Tổng số mục (Nodes) | Số tài liệu đã tải toàn văn | Thư mục lưu trữ |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...spaceSummaries.map(
      (s, idx) =>
        `| ${idx + 1} | **${s.space.name}** | \`${s.space.id}\` | ${s.nodeCount} | ${s.savedDocs.length} | [\`lark-wiki/${s.space.slug}/\`](./lark-wiki/${s.space.slug}/) |`
    ),
    ``,
  ];

  for (const s of spaceSummaries) {
    md09Lines.push(`\n---\n\n## Không gian: ${s.space.name}\n`);
    if (s.treeLines.length > 0) {
      md09Lines.push(`### Cấu trúc cây thư mục trên Lark Wiki (${s.nodeCount} mục)\n`);
      md09Lines.push(...s.treeLines.slice(0, 80));
      if (s.treeLines.length > 80) {
        md09Lines.push(`- *(... và ${s.treeLines.length - 80} mục con khác)*`);
      }
      md09Lines.push(``);
    }
    if (s.savedDocs.length > 0) {
      md09Lines.push(`### Danh sách tài liệu đã cào toàn văn (${s.savedDocs.length} bài)\n`);
      md09Lines.push(`| STT | Tiêu đề tài liệu | Dung lượng | File Markdown cục bộ | Tóm tắt mở đầu |`);
      md09Lines.push(`| --- | --- | --- | --- | --- |`);
      s.savedDocs.forEach((d, idx) => {
        md09Lines.push(
          `| ${idx + 1} | **[${d.title.replace(/\|/g, '\\|')}](${d.wikiUrl})** | ${(d.chars / 1024).toFixed(1)} KB | [${d.fileName}](${d.relPath}) | ${d.preview.replace(/\|/g, '\\|').slice(0, 180)}... |`
        );
      });
    }
  }

  const out09Path = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge', '09_TONG_HOP_TRI_THUC_LARK_WIKI_UPBASE.md');
  fs.writeFileSync(out09Path, md09Lines.join('\n'), 'utf8');
  console.log(`\n=== HOÀN TẤT! Đã tải ${totalDocs} tài liệu Lark Wiki và lưu tổng hợp tại ${out09Path} ===`);
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
