// Run bin/lint.mjs on both fixtures and compare with their annotations:
// bad/ must match its expect-lint lines exactly, clean/ must have no findings at all.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const RR = path.resolve(import.meta.dirname, '..');
const LINT = path.join(RR, 'bin/lint.mjs');

const lint = (fixture) =>
  JSON.parse(
    execFileSync(process.execPath, [LINT, '--limit', '100', fixture], { encoding: 'utf8' }),
  );

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });

const isComment = (line) => /^\s*(\/\/|\{\/\*|\/\*|<!--)/.test(line);

// "file:line" -> rule ids, for each annotation kind. An annotation covers the next code line.
const annotations = (root) => {
  const found = { lint: new Map(), none: new Map() };
  for (const file of walk(root).filter((f) => /\.(jsx?|tsx?|css|html)$/.test(f))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      const hit = text.match(/expect-(lint|none):\s*([R\d, ]+)/);
      if (!hit) return;
      let target = i + 1;
      while (target < lines.length && isComment(lines[target])) target += 1;
      const ids = hit[2].split(',').map((id) => id.trim());
      found[hit[1]].set(`${path.relative(root, file)}:${target + 1}`, new Set(ids));
    });
  }
  return found;
};

const problems = [];

const bad = path.join(RR, 'fixtures/bad');
const badReport = lint(bad);
const expected = annotations(bad);
const actual = new Map();
for (const { file, line, ruleId } of badReport.findings) {
  const key = `${file}:${line}`;
  if (!actual.has(key)) actual.set(key, new Set());
  actual.get(key).add(ruleId);
}
for (const [key, ids] of expected.lint) {
  for (const id of ids) {
    if (!actual.get(key)?.has(id)) problems.push(`bad: missing ${id} at ${key}`);
  }
}
for (const [key, ids] of actual) {
  for (const id of ids) {
    if (!expected.lint.get(key)?.has(id) && !expected.none.get(key)?.has(id)) {
      problems.push(`bad: unexpected ${id} at ${key}`);
    }
  }
}

const cleanReport = lint(path.join(RR, 'fixtures/clean'));
for (const { file, line, ruleId } of cleanReport.findings) {
  problems.push(`clean: unexpected ${ruleId} at ${file}:${line}`);
}

// The skill reaches rr through ~/.claude/skills/react-review, a symlink. lint.mjs once
// exited 0 with no output there, so run it through a symlink too.
const linkDir = mkdtempSync(path.join(tmpdir(), 'rr-link-'));
try {
  const link = path.join(linkDir, 'react-review');
  symlinkSync(RR, link);
  const args = [path.join(link, 'bin/lint.mjs'), 'fixtures/clean'];
  const output = execFileSync(process.execPath, args, { cwd: RR, encoding: 'utf8' });
  if (!output.trim().startsWith('{')) {
    problems.push('lint.mjs printed no JSON when run through a symlink');
  }
} finally {
  rmSync(linkDir, { recursive: true, force: true });
}

for (const [name, report] of [
  ['bad', badReport],
  ['clean', cleanReport],
]) {
  for (const { file, line, message } of report.parseErrors) {
    problems.push(`${name}: parse error at ${file}:${line}: ${message}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`fixtures ok: bad has ${badReport.findings.length} expected findings, clean has none`);
