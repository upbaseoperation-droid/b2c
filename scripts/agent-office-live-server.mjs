#!/usr/bin/env node
/**
 * Máy chủ Đồng bộ Thời gian thực cho Văn Phòng 3D Agent (Live Telemetry Bridge)
 * - Đọc trực tiếp transcript.jsonl của phiên làm việc hiện tại và các Subagent
 * - Phân tích số lượng Token thực tế (Input, Cache Read, Output) & từng lệnh gọi công cụ
 * - Cung cấp API thời gian thực tại http://localhost:4321/api/live (CORS enabled)
 * - Phục vụ giao diện 3D trực tiếp tại http://localhost:4321
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const BRAIN_DIR = 'C:/Users/Chienth/.gemini/antigravity/brain';
const CURRENT_CONV_ID = '7cd78f28-7a26-4d88-b4ae-4721dc1c41f7';
const TRANSCRIPT_PATH = path.join(BRAIN_DIR, CURRENT_CONV_ID, '.system_generated', 'logs', 'transcript.jsonl');
const HTML_ARTIFACT_PATH = path.join(BRAIN_DIR, CURRENT_CONV_ID, 'agent_office_3d.html');
const PORT = 4321;

function mapToolToAgent(toolName, args = {}) {
  const rawPath = String(args.Path || args.CommandLine || args.TypeName || '').replace(/"/g, '');
  if (toolName === 'invoke_subagent') {
    const type = String(args.TypeName || '').toLowerCase();
    if (type.includes('architect') || type.includes('planner')) return { from: 'ag_lead', to: 'architect', agent: 'architect' };
    if (type.includes('build')) return { from: 'ag_lead', to: 'qa_gate1', agent: 'qa_gate1' };
    if (type.includes('security') || type.includes('silent')) return { from: 'ag_lead', to: 'qa_gate3', agent: 'qa_gate3' };
    if (type.includes('e2e')) return { from: 'ag_lead', to: 'qa_gate4', agent: 'qa_gate4' };
    if (type.includes('reviewer')) return { from: 'ag_lead', to: 'qa_gate2', agent: 'qa_gate2' };
    if (type.includes('doc') || type.includes('research')) return { from: 'ag_lead', to: 'doc_updater', agent: 'doc_updater' };
    return { from: 'ag_lead', to: 'fe_coder', agent: 'fe_coder' };
  }
  if (toolName === 'run_command') {
    if (rawPath.includes('qa-5gates')) return { from: 'fe_coder', to: 'qa_gate1', agent: 'qa_gate1' };
    if (rawPath.includes('tsc') || rawPath.includes('build')) return { from: 'fe_coder', to: 'qa_gate1', agent: 'qa_gate1' };
    return { from: 'ag_lead', to: 'be_coder', agent: 'be_coder' };
  }
  if (toolName === 'write_file' || toolName === 'edit_file') {
    if (rawPath.endsWith('.md')) return { from: 'ag_lead', to: 'doc_updater', agent: 'doc_updater' };
    if (rawPath.endsWith('.html') || rawPath.endsWith('.tsx') || rawPath.endsWith('.css')) {
      return { from: 'ag_lead', to: 'fe_coder', agent: 'fe_coder' };
    }
    return { from: 'ag_lead', to: 'be_coder', agent: 'be_coder' };
  }
  if (toolName === 'read_file') {
    if (rawPath.includes('blueprint') || rawPath.includes('SKILL.md')) {
      return { from: 'ag_lead', to: 'architect', agent: 'architect' };
    }
    if (rawPath.includes('transcript.jsonl')) {
      return { from: 'qa_gate4', to: 'qa_gate5', agent: 'qa_gate5' };
    }
    return { from: 'ag_lead', to: 'qa_gate2', agent: 'qa_gate2' };
  }
  return { from: 'ag_lead', to: 'architect', agent: 'ag_lead' };
}

function parseLiveTranscript() {
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    return { stepCount: 0, totalInputTokens: 0, totalCacheTokens: 0, totalOutputTokens: 0, events: [], activeAgent: 'ag_lead' };
  }
  const raw = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
  const lines = raw.split('\n').filter(Boolean);

  let totalInputTokens = 0;
  let totalCacheTokens = 0;
  let totalOutputTokens = 0;
  let toolCallCount = 0;
  const events = [];
  let activeAgent = 'ag_lead';

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (typeof obj.input_tokens === 'number') totalInputTokens += obj.input_tokens;
      if (typeof obj.cache_read_tokens === 'number') totalCacheTokens += obj.cache_read_tokens;
      if (typeof obj.output_tokens === 'number') totalOutputTokens += obj.output_tokens;

      const time = obj.created_at ? new Date(obj.created_at).toLocaleTimeString('vi-VN', { hour12: false }) : '';

      if (obj.type === 'USER_INPUT' && obj.content) {
        const match = obj.content.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
        const promptText = match ? match[1].trim() : 'Yêu cầu từ người dùng';
        events.push({
          step: obj.step_index,
          time,
          agent: 'ag_lead',
          from: 'ag_lead',
          to: 'architect',
          tool: 'USER_REQUEST',
          target: promptText.slice(0, 70),
          msg: `Nhận lệnh: "${promptText.slice(0, 65)}"`
        });
      }

      if (Array.isArray(obj.tool_calls)) {
        for (const tc of obj.tool_calls) {
          toolCallCount++;
          const route = mapToolToAgent(tc.name, tc.args || {});
          activeAgent = route.agent;
          const rawTarget = String(tc.args?.Path || tc.args?.CommandLine || tc.args?.TypeName || '')
            .replace(/"/g, '')
            .split(/[\\/]/)
            .pop();

          events.push({
            step: obj.step_index,
            time,
            agent: route.agent,
            from: route.from,
            to: route.to,
            tool: tc.name,
            target: rawTarget || tc.name,
            msg: `${tc.name} → ${rawTarget || 'thực thi'}`
          });
        }
      }
    } catch {
      // Ignore partial line while file is being written
    }
  }

  const cacheHitRatio = (totalInputTokens + totalCacheTokens) > 0
    ? Math.round((totalCacheTokens / (totalInputTokens + totalCacheTokens)) * 100)
    : 0;

  return {
    convId: CURRENT_CONV_ID,
    updatedAt: new Date().toISOString(),
    stepCount: lines.length,
    toolCallCount,
    totalInputTokens,
    totalCacheTokens,
    totalOutputTokens,
    cacheHitRatio,
    activeAgent,
    events: events.slice(-25).reverse()
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url?.startsWith('/api/live')) {
    const data = parseLiveTranscript();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
    return;
  }

  if (fs.existsSync(HTML_ARTIFACT_PATH)) {
    const html = fs.readFileSync(HTML_ARTIFACT_PATH, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`[3D Agent Office Live Server] Đang phát dữ liệu thời gian thực tại http://localhost:${PORT}`);
});
