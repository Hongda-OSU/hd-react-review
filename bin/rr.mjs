#!/usr/bin/env node
// rr: review from a terminal. Runs the lint layer, then the Claude layer through `claude -p`,
// and prints one Chinese report.
//
//   rr [--changed] [--no-personal] [--lint-only] [--limit N] [path ...]
//
// Without a path, rr reviews uncommitted changes in the current directory.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  LAYER_LABEL,
  RR,
  SEVERITIES,
  SEVERITY_LABEL,
  applyPrefs,
  list,
  readPrefs,
  readRules,
} from '../lib/rules.mjs';

const LINT = path.join(RR, 'bin/lint.mjs');
// The Claude layer only reads files; it never edits or runs anything.
const CLAUDE_TOOLS = 'Read,Glob,Grep';
const PERSONAL = 'personal';

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const PAINT = { must: paint('31'), should: paint('33'), suggest: paint('90') };
const bold = paint('1');
const dim = paint('2');

const fail = (message) => {
  console.error(`rr: ${message}`);
  process.exit(2);
};

const USAGE = `用法：rr [--changed] [--no-personal] [--lint-only] [--limit N] [path ...]

  不带路径        审当前 git 仓库里未提交的改动
  --changed       只审给定路径里未提交的改动
  --no-personal   不看个人偏好层（R01、R02、R07、R30）
  --lint-only     只跑 lint 层，几秒出结果，不调用 Claude
  --limit N       单次最多审几个文件，默认 20
  -h, --help      显示这段说明`;

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    line: { type: 'integer' },
    ruleId: { type: 'string', pattern: '^R\\d{2}$' },
    source: { enum: ['lint', 'claude'] },
    problem: { type: 'string' },
    why: { type: 'string' },
    suggestion: { type: 'string' },
    confidence: { enum: ['high', 'needs-check'] },
  },
  required: ['file', 'line', 'ruleId', 'source', 'problem', 'why', 'suggestion', 'confidence'],
  additionalProperties: false,
};
const DROPPED_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    line: { type: 'integer' },
    ruleId: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['file', 'line', 'ruleId', 'reason'],
  additionalProperties: false,
};
const SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: FINDING_SCHEMA },
    dropped: { type: 'array', items: DROPPED_SCHEMA },
    reviewed: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'dropped', 'reviewed'],
  additionalProperties: false,
};

const NOTES = [
  // Each pattern matches the whole note, so replace() leaves no English behind.
  [/^R02 off.*$/, 'R02 没有检查：项目有自己的 Prettier 配置'],
  [
    /^tsc: the project has none; used rr's TypeScript (.+)$/,
    'tsc：项目没装 TypeScript，用的是 rr 自带的 $1',
  ],
  [/^R25 skipped.*$/, 'R25 没有检查：项目没有 tsconfig.json'],
];

const key = (finding) => `${finding.file}:${finding.line}:${finding.ruleId}`;

// prefs.md scopes rows by package name; a root without package.json only gets global rows.
const projectNameOf = (root) => {
  try {
    return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name;
  } catch {
    return undefined;
  }
};

// CJK characters take two terminal columns.
const width = (text) =>
  [...text].reduce((sum, ch) => sum + (ch.codePointAt(0) > 0x2e80 ? 2 : 1), 0);
const pad = (text, size) => text + ' '.repeat(Math.max(0, size - width(text)));

const runLint = (values, positionals, changed) => {
  const args = [LINT];
  if (changed) args.push('--changed');
  if (values.limit) args.push('--limit', values.limit);
  const result = spawnSync(process.execPath, [...args, ...positionals], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status === 2) {
    if (!positionals.length && result.stderr.includes('needs a git repository')) {
      fail('不带路径时只审未提交的改动，但当前目录不在 git 仓库里。请指定要审的路径，例如 rr src');
    }
    process.stderr.write(result.stderr);
    process.exit(2);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return fail(`lint 层失败：${result.stderr.trim() || '没有输出 JSON'}`);
  }
};

const runClaude = (report, noPersonal) => {
  const prompt = [
    `This review was started by bin/rr.mjs. Follow ${path.join(RR, 'SKILL.md')},`,
    'section "7. JSON mode (bin/rr.mjs)".',
    '',
    `Project root: ${report.root}`,
    `Options: no-personal = ${noPersonal}`,
    'Lint layer output (already run; do not run it again):',
    JSON.stringify(report),
  ].join('\n');
  const args = ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(SCHEMA)];
  args.push('--allowedTools', CLAUDE_TOOLS, '--add-dir', RR);
  const result = spawnSync('claude', args, {
    cwd: report.root,
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error?.code === 'ENOENT') {
    fail('找不到 claude 命令。请安装 Claude Code 命令行版，或者用 --lint-only 只跑 lint 层。');
  }
  let envelope;
  try {
    envelope = JSON.parse(result.stdout);
  } catch {
    fail(`Claude 层失败：${(result.stderr || result.stdout).trim().slice(0, 500)}`);
  }
  if (envelope.is_error || !envelope.structured_output) {
    const denied = envelope.permission_denials?.length
      ? `；被拒绝的工具调用 ${envelope.permission_denials.length} 次`
      : '';
    fail(`Claude 层失败（${envelope.subtype}）：${String(envelope.result).slice(0, 500)}${denied}`);
  }
  return { ...envelope.structured_output, seconds: Math.round(envelope.duration_ms / 1000) };
};

// Lint findings Claude did not cover are kept with the tool's own message; Claude may only
// drop findings of rules that list exceptions.
const merge = (lintFindings, claude, rules) => {
  const lintByKey = new Map(lintFindings.map((finding) => [key(finding), finding]));
  const droppable = new Set(
    claude.dropped
      .filter((drop) => lintByKey.has(key(drop)) && rules.get(drop.ruleId)?.fields.exceptions)
      .map(key),
  );
  const merged = new Map();
  for (const finding of claude.findings) {
    if (!rules.has(finding.ruleId) || finding.ruleId === 'R02') continue;
    const lint = lintByKey.get(key(finding));
    if (lint && droppable.has(key(lint))) continue;
    merged.set(key(finding), { ...finding, source: lint ? 'lint' : 'claude' });
  }
  for (const finding of lintFindings) {
    if (!merged.has(key(finding)) && !droppable.has(key(finding)))
      merged.set(key(finding), finding);
  }
  const dropped = claude.dropped.filter((drop) => droppable.has(key(drop)));
  return { findings: [...merged.values()], dropped };
};

// One item per file for R02: Prettier differences are formatting, not separate problems.
const groupFormatting = (findings) => {
  const byFile = new Map();
  const rest = [];
  for (const finding of findings) {
    if (finding.ruleId !== 'R02') rest.push(finding);
    else byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding]);
  }
  for (const [file, items] of byFile) {
    const lines = items.map((item) => item.line).sort((a, b) => a - b);
    rest.push({
      ...items[0],
      file,
      line: lines[0],
      problem:
        lines.length > 1
          ? `格式和 rr 的 Prettier 配置不一致，另见第 ${lines.slice(1).join('、')} 行`
          : '格式和 rr 的 Prettier 配置不一致',
      why: '参数在超过 printWidth（100）之前保持一行，其余按 Prettier 默认格式',
      suggestion: `npx prettier --config ${path.join(RR, 'lint/prettier.json')} --write ${file}`,
    });
  }
  return rest;
};

// Lint findings Claude has not rewritten keep the tool's message on a single line.
const describe = (finding) =>
  finding.problem
    ? finding
    : { ...finding, problem: `${finding.message}（${finding.rules.join('、')}）` };

const render = ({ findings, dropped, report, skipped, unread, seconds }) => {
  const out = [];
  const byFile = new Map();
  for (const finding of findings)
    byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding]);
  const files = [...byFile.keys()].sort();

  if (!files.length) out.push('没有发现问题。', '');

  if (files.length > 1) {
    const column = Math.max(...files.map(width), 4) + 2;
    out.push(bold(`${pad('汇总', column)}必改  应改  建议`));
    for (const file of files) {
      const counts = SEVERITIES.map((s) => byFile.get(file).filter((f) => f.severity === s).length);
      out.push(`${pad(file, column)}${counts.map((n) => String(n).padStart(4)).join('  ')}`);
    }
    out.push('');
  }

  for (const file of files) {
    out.push(bold(file));
    const items = byFile
      .get(file)
      .sort(
        (a, b) =>
          SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.line - b.line,
      );
    for (const item of items) {
      const tags = [SEVERITY_LABEL[item.severity], LAYER_LABEL[item.layer], item.ruleId];
      if (item.confidence === 'needs-check') tags.push('待确认');
      out.push(
        `  ${PAINT[item.severity](`[${tags.join(' · ')}]`)} 第 ${item.line} 行：${item.problem}`,
      );
      if (item.why) out.push(`      原因：${item.why}`);
      if (item.suggestion) out.push(`      建议：${item.suggestion}`);
    }
    out.push('');
  }

  if (report.parseErrors.length) {
    out.push(bold('解析失败'));
    for (const error of report.parseErrors)
      out.push(`  ${error.file}:${error.line}：${error.message}`);
    out.push('');
  }

  const notes = report.notes.map((note) => {
    const known = NOTES.find(([pattern]) => pattern.test(note));
    return known ? note.replace(known[0], known[1]) : note;
  });
  if (unread.length) notes.push(`Claude 层没有读这些文件，只有 lint 结果：${unread.join('、')}`);
  if (skipped.length) notes.push(`项目没有用到，跳过了：${skipped.join('、')}`);
  for (const drop of dropped)
    notes.push(`按例外剔除了 ${drop.file}:${drop.line} ${drop.ruleId}：${drop.reason}`);
  if (seconds === undefined)
    notes.push('只跑了 lint 层：没有核对 R01、R20 的例外，也没有 Claude 层的规则');
  else notes.push(`Claude 层用时 ${seconds} 秒`);
  if (notes.length) {
    out.push(bold('说明'));
    for (const note of notes) out.push(dim(`  - ${note}`));
  }
  process.stdout.write(`${out.join('\n')}\n`);
};

const parseCli = () => {
  try {
    return parseArgs({
      options: {
        changed: { type: 'boolean', default: false },
        'no-personal': { type: 'boolean', default: false },
        'lint-only': { type: 'boolean', default: false },
        limit: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    });
  } catch (error) {
    // parseArgs throws a TypeError whose stack trace says nothing useful to a user;
    // its message quotes the offending option.
    const option = error.message.match(/'([^']+)'/)?.[1];
    return fail(`${option ? `参数有误：${option}` : error.message}\n\n${USAGE}`);
  }
};

const main = () => {
  const { values, positionals } = parseCli();
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const noPersonal = values['no-personal'];

  const rules = new Map(readRules().map((rule) => [rule.id, rule]));
  const changed = values.changed || positionals.length === 0;
  const report = runLint(values, positionals, changed);
  if (!report.scope.files.length) {
    console.log(changed ? '没有未提交的改动需要审。' : '没有可以审的文件。');
    return;
  }

  const withRule = (finding) => {
    const { layer, severity } = rules.get(finding.ruleId).fields;
    return { ...finding, layer, severity };
  };
  const keep = (finding) => !(noPersonal && finding.layer === PERSONAL);
  const lintFindings = report.findings.map(withRule).filter(keep);

  const skipped = [...rules.values()]
    .filter((rule) => list(rule.fields.requires).some((flag) => report.project[flag] === false))
    .map((rule) => rule.id);

  const counts = SEVERITIES.map(
    (s) => `${SEVERITY_LABEL[s]} ${lintFindings.filter((f) => f.severity === s).length}`,
  );
  console.error(dim(`lint 层：${lintFindings.length} 条（${counts.join(' / ')}）`));

  let findings = lintFindings;
  let dropped = [];
  let seconds;
  let unread = [];
  if (!values['lint-only']) {
    console.error(dim(`Claude 正在审 ${report.scope.files.length} 个文件，通常要 1–3 分钟…`));
    const claude = runClaude({ ...report, findings: lintFindings }, noPersonal);
    ({ findings, dropped } = merge(lintFindings, claude, rules));
    findings = findings
      .map((finding) => (finding.layer ? finding : withRule(finding)))
      .filter(keep);
    seconds = claude.seconds;
    // A file Claude never opened gets no judged findings; say so instead of looking clean.
    const reviewed = new Set(claude.reviewed);
    unread = report.scope.files.filter((file) => !reviewed.has(file));
  }

  findings = applyPrefs(findings, readPrefs(), projectNameOf(report.root));
  findings = groupFormatting(findings.map(describe));
  render({ findings, dropped, report, skipped, unread, seconds });
};

main();
