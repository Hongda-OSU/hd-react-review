#!/usr/bin/env node
// rr's deterministic layer: run ESLint, stylelint and tsc on a reviewed project and print
// the findings as JSON, each mapped to a rule id. Read-only towards the reviewed project.
//
//   node bin/lint.mjs [--changed] [--limit N] [path ...]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import ts from 'typescript';

const RR = path.resolve(import.meta.dirname, '..');
const ESLINT_CONFIG = path.join(RR, 'lint/eslint.config.mjs');
const STYLELINT_CONFIG = path.join(RR, 'lint/stylelint.config.mjs');

const SCRIPT_FILE = /\.(jsx?|mjs|cjs|tsx?)$/;
const STYLE_FILE = /\.css$/;
const REVIEW_FILE = /\.(jsx?|mjs|cjs|tsx?|css|html)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.next', '.git']);
const PRETTIER_CONFIGS = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.json5',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.prettierrc.toml',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.ts',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'prettier.config.ts',
];

// tsc has no config file to carry a `// Rxx` comment, so its id lives here.
export const TSC_RULE = 'R25';
// Findings that a change elsewhere can cause on an unchanged line; --changed keeps them.
const CROSS_FILE_RULES = new Set(['R05']);

const fail = (message) => {
  console.error(`rr lint: ${message}`);
  process.exit(2);
};

// The `// Rxx` comments in a lint config are the mapping from tool rule to rule id.
export const ruleIdsFrom = (configFile) => {
  const ids = {};
  let current = null;
  for (const line of readFileSync(configFile, 'utf8').split('\n')) {
    const id = line.match(/^\s*\/\/ (R\d{2})\b/);
    if (id) current = id[1];
    const rule = line.match(/^\s*'([^']+)':/);
    if (rule && current) ids[rule[1]] = current;
  }
  return ids;
};

const isInside = (dir, target) => {
  const rel = path.relative(dir, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

const findRoot = (start) => {
  let dir = statSync(start).isDirectory() ? start : path.dirname(start);
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) return statSync(start).isDirectory() ? start : path.dirname(start);
    dir = parent;
  }
  return dir;
};

const walk = (target) => {
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return [];
    return walk(path.join(target, entry.name));
  });
};

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const detectProject = (root) => {
  const pkg = readJson(path.join(root, 'package.json')) ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const sourceDir = existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  return {
    typescript: existsSync(path.join(root, 'tsconfig.json')),
    stylex: '@stylexjs/stylex' in deps,
    'css-modules': walk(sourceDir).some((file) => file.endsWith('.module.css')),
    'react-compiler': 'babel-plugin-react-compiler' in deps,
    'atomic-design': existsSync(path.join(root, 'src/components/atoms')),
    'prettier-config':
      'prettier' in pkg || PRETTIER_CONFIGS.some((name) => existsSync(path.join(root, name))),
  };
};

const git = (root, args) =>
  execFileSync('git', ['-C', root, '-c', 'core.quotePath=false', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

// Uncommitted changes (staged, unstaged and untracked) and their added line numbers.
// A null line set means the whole file is new.
const collectChanged = (root, targets) => {
  let top;
  try {
    top = git(root, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    fail('--changed needs a git repository');
  }

  const files = new Map();
  const entries = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split(
    '\0',
  );
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry) continue;
    const status = entry.slice(0, 2);
    if (status[0] === 'R' || status[0] === 'C') i += 1; // the next entry is the old path
    const file = path.join(top, entry.slice(3));
    if (!existsSync(file) || !REVIEW_FILE.test(file)) continue;
    if (!targets.some((target) => isInside(target, file))) continue;
    files.set(file, status === '??' ? null : new Set());
  }

  let hasHead = true;
  try {
    git(root, ['rev-parse', '--verify', '-q', 'HEAD']);
  } catch {
    hasHead = false;
  }

  if (!hasHead) {
    for (const file of files.keys()) files.set(file, null);
  } else {
    let current = null;
    for (const line of git(root, ['diff', 'HEAD', '-U0', '--no-color', '--no-ext-diff']).split(
      '\n',
    )) {
      const header = line.match(/^\+\+\+ b\/(.+)$/);
      if (header) current = files.get(path.join(top, header[1])) ?? null;
      const hunk = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
      if (hunk && current) {
        const start = Number(hunk[1]);
        const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
        for (let n = start; n < start + count; n += 1) current.add(n);
      }
    }
  }
  return files;
};

// A null line set (new file) becomes "all"; otherwise sorted [start, end] pairs.
const toRanges = (lines) => {
  if (lines === null) return 'all';
  const ranges = [];
  for (const n of [...lines].sort((a, b) => a - b)) {
    const last = ranges.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  }
  return ranges;
};

const runEslint = async (root, files, project, ruleIds, out) => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: ESLINT_CONFIG,
    overrideConfig: project['prettier-config']
      ? { rules: { 'prettier/prettier': 'off' } }
      : undefined,
    errorOnUnmatchedPattern: false,
    warnIgnored: false,
  });
  for (const result of await eslint.lintFiles(files)) {
    const file = path.relative(root, result.filePath);
    for (const message of result.messages) {
      if (message.fatal) {
        out.parseErrors.push({ file, line: message.line, message: message.message });
        continue;
      }
      out.raw.push({
        file,
        line: message.line,
        tool: 'eslint',
        rule: message.ruleId,
        ruleId: ruleIds[message.ruleId],
        message: message.message.split('\n')[0],
      });
    }
  }
};

const runStylelint = async (root, files, ruleIds, out) => {
  const { results } = await stylelint.lint({ files, cwd: root, configFile: STYLELINT_CONFIG });
  for (const result of results) {
    const file = path.relative(root, result.source);
    for (const warning of result.warnings) {
      if (warning.rule === 'CssSyntaxError') {
        out.parseErrors.push({ file, line: warning.line, message: warning.text });
        continue;
      }
      out.raw.push({
        file,
        line: warning.line,
        tool: 'stylelint',
        rule: warning.rule,
        ruleId: ruleIds[warning.rule],
        message: warning.text.replace(/ \([^)]+\)$/, ''),
      });
    }
  }
};

// A solution-style tsconfig ("files": [] plus references) checks nothing itself.
const tsconfigsToCheck = (root) => {
  const main = path.join(root, 'tsconfig.json');
  const { config } = ts.readConfigFile(main, ts.sys.readFile);
  const references = config?.references ?? [];
  if (!references.length || config.files?.length !== 0) return [main];
  return references.map((ref) => {
    const target = path.resolve(root, ref.path);
    return target.endsWith('.json') ? target : path.join(target, 'tsconfig.json');
  });
};

const runTsc = (root, files, out) => {
  const own = path.join(root, 'node_modules/.bin/tsc');
  const tsc = existsSync(own) ? own : path.join(RR, 'node_modules/.bin/tsc');
  if (tsc !== own) out.notes.push(`tsc: the project has none; used rr's TypeScript ${ts.version}`);

  const wanted = new Set(files);
  for (const config of tsconfigsToCheck(root)) {
    // Without both flags tsc writes a .tsbuildinfo into the project. A composite config
    // rejects --incremental false alone with TS6379, and still writes the file.
    const noBuildInfo = ['--incremental', 'false', '--composite', 'false'];
    const args = ['-p', config, '--noEmit', '--pretty', 'false', ...noBuildInfo];
    let output;
    try {
      output = execFileSync(tsc, args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    for (const line of output.split('\n')) {
      const hit = line.match(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/);
      if (hit) {
        const file = path.relative(root, path.resolve(root, hit[1]));
        if (!wanted.has(file)) {
          // An error in a tsconfig means the check itself is broken; never drop that silently.
          if (!SCRIPT_FILE.test(file)) out.notes.push(`tsc: ${line}`);
          continue;
        }
        out.raw.push({
          file,
          line: Number(hit[2]),
          tool: 'tsc',
          rule: hit[3],
          ruleId: TSC_RULE,
          message: hit[4],
        });
      } else if (/^error TS\d+/.test(line)) {
        out.notes.push(`tsc (${path.relative(root, config)}): ${line}`);
      }
    }
  }
};

const main = async () => {
  const { values, positionals } = parseArgs({
    options: {
      changed: { type: 'boolean', default: false },
      limit: { type: 'string', default: '20' },
    },
    allowPositionals: true,
  });
  const limit = Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1)
    fail(`--limit must be a positive integer, got "${values.limit}"`);

  const targets = (positionals.length ? positionals : ['.']).map((p) => path.resolve(p));
  for (const target of targets) if (!existsSync(target)) fail(`no such path: ${target}`);
  const root = findRoot(targets[0]);
  for (const target of targets) {
    if (!isInside(root, target)) fail(`${target} is outside the project at ${root}`);
  }
  // Plugins such as the TypeScript import resolver look things up from process.cwd().
  process.chdir(root);

  const changed = values.changed ? collectChanged(root, targets) : null;
  const absolute = changed
    ? [...changed.keys()]
    : targets.flatMap(walk).filter((f) => REVIEW_FILE.test(f));
  const files = [...new Set(absolute.map((f) => path.relative(root, f)))].sort();
  if (files.length > limit) {
    fail(
      `${files.length} files exceed the limit of ${limit}; review a narrower path or pass --limit`,
    );
  }

  const project = detectProject(root);
  const out = { raw: [], parseErrors: [], notes: [] };
  if (project['prettier-config'])
    out.notes.push('R02 off: the project has its own Prettier config');

  const scripts = files.filter((f) => SCRIPT_FILE.test(f));
  const styles = files.filter((f) => STYLE_FILE.test(f));
  if (scripts.length) await runEslint(root, scripts, project, ruleIdsFrom(ESLINT_CONFIG), out);
  if (styles.length) await runStylelint(root, styles, ruleIdsFrom(STYLELINT_CONFIG), out);
  if (project.typescript && scripts.length) runTsc(root, scripts, out);
  else if (!project.typescript) out.notes.push('R25 skipped: no tsconfig.json');

  const findings = new Map();
  const dropped = {};
  for (const finding of out.raw) {
    if (!finding.ruleId) {
      dropped[finding.rule ?? '(none)'] = (dropped[finding.rule ?? '(none)'] ?? 0) + 1;
      continue;
    }
    const lines = changed?.get(path.join(root, finding.file));
    if (lines && !lines.has(finding.line) && !CROSS_FILE_RULES.has(finding.ruleId)) continue;
    const key = `${finding.file}:${finding.line}:${finding.ruleId}`;
    if (findings.has(key)) findings.get(key).rules.push(finding.rule);
    else findings.set(key, { ...finding, source: 'lint', rules: [finding.rule] });
  }

  const sorted = [...findings.values()]
    .map(({ rule, ...finding }) => finding)
    .sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.ruleId.localeCompare(b.ruleId),
    );

  const scope = { mode: changed ? 'changed' : 'path', files };
  // The Claude layer follows the same changed-lines rule as the filter above.
  if (changed)
    scope.changedLines = Object.fromEntries(
      files.map((f) => [f, toRanges(changed.get(path.join(root, f)))]),
    );

  const report = {
    root,
    scope,
    project,
    findings: sorted,
    parseErrors: out.parseErrors,
    dropped,
    notes: out.notes,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

// Imported by scripts/check-rules.mjs for ruleIdsFrom; only run as a CLI. Compare real paths:
// the skill is reached through a symlink, but import.meta.url is already resolved.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
