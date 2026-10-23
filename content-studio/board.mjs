#!/usr/bin/env node
// Content Studio event board.
// Every agent logs what it is doing as one JSON line in events.jsonl; the 3D office replays that log.
//
// Usage:
//   node content-studio/board.mjs job      --job J01 --title "Ra mắt serum C" --brief "..."
//   node content-studio/board.mjs task     --job J01 --task T1 --title "Kịch bản TikTok 30s" --agent script-writer
//   node content-studio/board.mjs assign   --job J01 --task T1 --from director --to script-writer
//   node content-studio/board.mjs status   --job J01 --task T1 --agent script-writer --status working --progress 40 --note "Viết hook"
//   node content-studio/board.mjs handoff  --job J01 --task T1 --from script-writer --to content-editor --note "Nhờ duyệt"
//   node content-studio/board.mjs output   --job J01 --task T1 --agent script-writer --file outputs/J01/T1-kich-ban.md
//   node content-studio/board.mjs jobdone  --job J01
//   node content-studio/board.mjs reset              (xoá log, bắt đầu lại)
//   node content-studio/board.mjs show               (in trạng thái hiện tại)

import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const LOG = join(ROOT, "events.jsonl");

const TYPES = new Set(["job", "task", "assign", "status", "handoff", "output", "jobdone"]);
const STATUSES = new Set(["todo", "thinking", "working", "review", "revise", "done", "blocked"]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    out[key.slice(2)] = next === undefined || next.startsWith("--") ? true : (i++, next);
  }
  return out;
}

function readEvents() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function show() {
  const tasks = new Map();
  const jobs = new Map();
  for (const e of readEvents()) {
    if (e.type === "job") jobs.set(e.job, { title: e.title, done: false });
    if (e.type === "jobdone" && jobs.has(e.job)) jobs.get(e.job).done = true;
    if (e.type === "task") tasks.set(`${e.job}/${e.task}`, { ...e, status: "todo", progress: 0 });
    const t = tasks.get(`${e.job}/${e.task}`);
    if (!t) continue;
    if (e.type === "assign") t.agent = e.to;
    if (e.type === "status") Object.assign(t, { status: e.status, progress: e.progress ?? t.progress, note: e.note ?? t.note });
    if (e.type === "output") t.file = e.file;
  }
  for (const [id, j] of jobs) console.log(`${j.done ? "✔" : "…"} ${id} ${j.title}`);
  for (const [id, t] of tasks) console.log(`  ${id.padEnd(10)} ${t.status.padEnd(8)} ${String(t.progress).padStart(3)}%  ${t.agent ?? "-"}  ${t.title}`);
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "reset") {
  writeFileSync(LOG, "");
  console.log("events.jsonl đã được làm trống");
} else if (cmd === "show") {
  show();
} else if (TYPES.has(cmd)) {
  const args = parseArgs(rest);
  if (cmd === "status" && args.status && !STATUSES.has(args.status)) {
    console.error(`status không hợp lệ: ${args.status}. Dùng: ${[...STATUSES].join(", ")}`);
    process.exit(1);
  }
  if (args.progress !== undefined) args.progress = Math.max(0, Math.min(100, Number(args.progress) || 0));
  if (cmd === "job" || cmd === "output") mkdirSync(join(ROOT, "outputs", String(args.job ?? "misc")), { recursive: true });
  const event = { t: Date.now(), type: cmd, ...args };
  appendFileSync(LOG, JSON.stringify(event) + "\n");
  console.log("ok", JSON.stringify(event));
} else {
  console.error("Lệnh: job | task | assign | status | handoff | output | jobdone | reset | show");
  process.exit(1);
}
